import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import AnimatedLogo from "./ui/brand/AnimatedLogo";
import AssistantPanel from "./ui/scan/AssistantPanel";
import Onboarding from "./ui/onboarding/Onboarding";
import "./ui/scan/ScanScreen.css";

import { call } from "./lib/backend";
import type { LibraryGame, AccountHint, PartialSettings } from "./lib/backend";
import SettingsModal from "./ui/onboarding/SettingsModal";

const steam = {
  bg: "#0b141e",
  panel: "#0f1b2b",
  panelSoft: "#0d1726",
  border: "#1b2838",
  accent: "#66c0f4",
  accentHover: "#8fd1fa",
  text: "#c7d5e0",
  textMuted: "#8aa2b5",
  chipBg: "#203448",
  inputBg: "#0c1624",
  inputBorder: "#24364a",
};

export default function ScanScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [games, setGames] = useState<LibraryGame[]>([]);

  const [apiKey, setApiKey] = useState("");
  const [steamId, setSteamId] = useState("");
  const [familyIds, setFamilyIds] = useState("");
  const [accounts, setAccounts] = useState<AccountHint[]>([]);

  const [sortBy, setSortBy] = useState<"name" | "playtime" | "installed">("name");
  const [savedHint, setSavedHint] = useState<"" | "saved" | "saving">("");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"params" | "scan" | "library">("params");
  const [search, setSearch] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [locale, setLocale] = useState<"uk" | "en">(() => {
    try {
      return localStorage.getItem("sghelper:locale") === "en" ? "en" : "uk";
    } catch {
      return "uk";
    }
  });

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    setError(undefined);
    try {
      return await fn();
    } catch (e: any) {
      setError(e?.toString?.() ?? "Помилка");
      return undefined as any;
    } finally {
      setBusy(false);
    }
  }

  async function refreshAccounts() {
    try {
      const hints = await call<AccountHint[]>("detect_accounts");
      setAccounts(hints || []);
      if ((!steamId || steamId.trim() === "") && hints && hints.length >= 1) {
        setSteamId(hints[0].steamid64);
      }
    } catch {}
  }

  useEffect(() => {
    (async () => {
      try {
        const s = (await call<PartialSettings>("get_settings")) || {};
        if (s.api_key) setApiKey(s.api_key);
        if (s.main_steam_id64) setSteamId(s.main_steam_id64);
        if (s.family_ids && s.family_ids.length) {
          setFamilyIds(s.family_ids.join(", "));
        }
        const cached = await call<LibraryGame[]>("load_library_cache").catch(
          () => [],
        );
        if (cached && cached.length) setGames(cached);
      } catch {}
      refreshAccounts();

      let done = false;
      try {
        done = localStorage.getItem("sghelper:onboarding_done") === "1";
      } catch {}
      if (!done || !(steamId?.trim())) setShowOnboarding(true);
    })();

    const unlistenPromise = listen<string>("family_ids_ingested", (ev) => {
      const ids = (ev.payload || "").trim();
      if (ids) setFamilyIds(ids);
    });
    return () => {
      unlistenPromise.then((u) => u());
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const fam = familyIds
        .split(/[, \n\r\t]+/g)
        .map((s) => s.trim())
        .filter(Boolean);
      setSavedHint("saving");
      call("save_settings", {
        s: {
          api_key: apiKey.trim(),
          main_steam_id64: steamId.trim(),
          family_ids: fam,
        },
      })
        .then(() => setSavedHint("saved"))
        .catch(() => setSavedHint(""));
    }, 400);
    return () => clearTimeout(t);
  }, [apiKey, steamId, familyIds]);

  useEffect(() => {
    try {
      localStorage.setItem("sghelper:locale", locale);
    } catch {}
  }, [locale]);

  async function saveNow() {
    setSavedHint("saving");
    const fam = familyIds
      .split(/[, \n\r\t]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await call("save_settings", {
        s: {
          api_key: apiKey.trim(),
          main_steam_id64: steamId.trim(),
          family_ids: fam,
        },
      });
      setSavedHint("saved");
    } catch {
      setSavedHint("");
    }
  }

  async function openHowToKey() {
    await run(async () => {
      await call("open_apikey_page");
    });
  }

  async function installBrowserHelper() {
    const dir = await call<string>("ensure_browser_helper").catch(() => "");
    await call("open_extensions_manager").catch(() => {});
    if (dir) {
      alert(
        `Файли помічника збережено:\n${dir}\n\nУ браузері увімкни «Режим розробника» та додай цю папку як розширення.`,
      );
    }
  }

  async function pasteFamilyFromClipboard() {
    try {
      const txt = await navigator.clipboard.readText();
      setFamilyIds(txt.trim());
    } catch {}
  }

  async function clearCache() {
    setGames([]);
    await call("save_library_cache", { games: [] }).catch(() => {});
  }

  async function scanUnified() {
    if (!apiKey.trim()) {
      return setError(
        locale === "en"
          ? "Specify Steam API key in Settings."
          : "Вкажіть Steam API key у Налаштуваннях.",
      );
    }
    if (!steamId.trim()) {
      return setError(
        locale === "en"
          ? "Select or enter SteamID64 in Settings."
          : "Оберіть або введіть SteamID64 у Налаштуваннях.",
      );
    }
    const fam = familyIds
      .split(/[, \n\r\t]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    const data = await run(async () => {
      return await call<LibraryGame[]>("scan_library_unified", {
        api_key: apiKey,
        main_steam_id64: steamId,
        family_ids: fam.length ? fam : null,
      });
    });
    if (data) {
      setGames(data);
      call("save_settings", {
        s: {
          api_key: apiKey.trim(),
          main_steam_id64: steamId.trim(),
          family_ids: fam,
        },
      }).catch(() => {});
      call("save_library_cache", { games: data }).catch(() => {});
      setSettingsTab("library");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? games.filter(
          (g) =>
            (g.name || "").toLowerCase().includes(q) ||
            String(g.appid).includes(q),
        )
      : games;
  }, [games, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "name":
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "playtime":
        arr.sort(
          (a, b) => (b.playtime_minutes ?? 0) - (a.playtime_minutes ?? 0),
        );
        break;
      case "installed":
        arr.sort((a, b) => Number(b.installed) - Number(a.installed));
        break;
    }
    return arr;
  }, [filtered, sortBy]);

  const totalInstalled = useMemo(
    () => games.filter((g) => g.installed).length,
    [games],
  );

  return (
    <div className="sg-page" style={{ background: steam.bg, color: steam.text }}>
      <div className="sg-container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <AnimatedLogo size={52} />
          <h1 style={{ fontSize: 28, margin: 0, color: steam.text }}>
            SteamGameHelper
          </h1>
          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={() => {
                setShowSettings(true);
                setSettingsTab("params");
              }}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: steam.accent,
                color: "#0b1016",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 6px 18px rgba(102,192,244,.25)",
              }}
            >
              {locale === "en" ? "Settings" : "Налаштування"}
            </button>
          </div>
        </div>

        <AssistantPanel
          gamesCount={games.length}
          installedCount={totalInstalled}
          locale={locale}
          error={error}
        />
      </div>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        locale={locale}
        setLocale={setLocale}
        apiKey={apiKey}
        setApiKey={setApiKey}
        steamId={steamId}
        setSteamId={setSteamId}
        familyIds={familyIds}
        setFamilyIds={setFamilyIds}
        accounts={accounts}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        savedHint={savedHint}
        onSaveNow={saveNow}
        busy={busy}
        error={error}
        onScan={scanUnified}
        onClearCache={clearCache}
        games={games}
        installedCount={totalInstalled}
        sortedGames={sorted}
        sortBy={sortBy}
        setSortBy={setSortBy}
        search={search}
        setSearch={setSearch}
        onRefreshAccounts={refreshAccounts}
        onPasteFamilyFromClipboard={pasteFamilyFromClipboard}
        onInstallBrowserHelper={openHowToKey}
      />

      {showOnboarding && (
        <Onboarding
          initialApiKey={apiKey}
          initialSteamId={steamId}
          initialFamilyIds={familyIds}
          onStartScan={() => {
            setShowSettings(true);
            setSettingsTab("scan");
            setTimeout(() => scanUnified(), 200);
          }}
          onDone={() => {
            try {
              localStorage.setItem("sghelper:onboarding_done", "1");
            } catch {}
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
