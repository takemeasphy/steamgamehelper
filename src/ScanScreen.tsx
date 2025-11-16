import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import AnimatedLogo from "./ui/AnimatedLogo";
import AssistantTab from "./assistant/AskAssistant";
import Onboarding from "./ui/Onboarding";
import "./ui/ScanScreen.css";
import { call } from "./lib/backend";
import type { LibraryGame, AccountHint, PartialSettings } from "./lib/backend";

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
        if (s.family_ids && s.family_ids.length) setFamilyIds(s.family_ids.join(", "));
        const cached = await call<LibraryGame[]>("load_library_cache").catch(() => []);
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
          (a, b) =>
            (b.playtime_minutes ?? 0) - (a.playtime_minutes ?? 0),
        );
        break;
      case "installed":
        arr.sort(
          (a, b) => Number(b.installed) - Number(a.installed),
        );
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

        <div
          style={{
            borderRadius: 18,
            padding: 14,
            background:
              "linear-gradient(180deg, #0f1b2b 0%, #0d1726 100%)",
            border: `1px solid ${steam.border}`,
            boxShadow: "0 26px 80px rgba(0,0,0,.38)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px 12px",
              borderBottom: `1px solid ${steam.border}`,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {locale === "en"
                ? "Ask the assistant"
                : "Порадитись з ІІ"}
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 8,
                alignItems: "center",
                color: steam.textMuted,
                fontSize: 12,
              }}
              title={
                locale === "en"
                  ? "Library status (for prompts context)"
                  : "Статус бібліотеки (для контексту підказок)"
              }
            >
              <span
                style={{
                  background: steam.chipBg,
                  borderRadius: 999,
                  padding: "4px 8px",
                }}
              >
                {locale === "en" ? "Cached" : "У кеші"}:{" "}
                <b style={{ color: steam.text }}>{games.length}</b>
              </span>
              <span
                style={{
                  background: steam.chipBg,
                  borderRadius: 999,
                  padding: "4px 8px",
                }}
              >
                {locale === "en" ? "Installed" : "Встановлено"}:{" "}
                <b style={{ color: steam.text }}>{totalInstalled}</b>
              </span>
            </div>
          </div>

          <div
            className="sg-chatPanel"
            style={{
              marginTop: 10,
              background: steam.panelSoft,
              border: `1px solid ${steam.border}`,
              borderRadius: 12,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <AssistantTab />
          </div>

          <div
            style={{
              fontSize: 12,
              color: steam.textMuted,
              marginTop: 10,
              paddingLeft: 2,
            }}
          >
            {locale === "en"
              ? "Tip: open Settings → Scan to refresh the library for better recommendations."
              : "Порада: відкрий «Налаштування» → «Сканування», щоб оновити бібліотеку для точніших рекомендацій."}
            {error ? (
              <span style={{ color: "#ffd2d2", marginLeft: 8 }}>
                • {error}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {showSettings && (
        <div
          onClick={() => setShowSettings(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1020px, 96vw)",
              maxHeight: "88vh",
              overflow: "hidden",
              borderRadius: 14,
              background: steam.panel,
              border: `1px solid ${steam.border}`,
              boxShadow: "0 18px 48px rgba(0,0,0,.45)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderBottom: `1px solid ${steam.border}`,
              }}
            >
              <div style={{ fontWeight: 700, color: steam.text }}>
                {locale === "en" ? "Settings" : "Налаштування"}
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  gap: 6,
                }}
              >
                <button
                  onClick={() => setSettingsTab("params")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${
                      settingsTab === "params"
                        ? steam.accent
                        : steam.border
                    }`,
                    background:
                      settingsTab === "params"
                        ? "#11273a"
                        : steam.panelSoft,
                    color: steam.text,
                    cursor: "pointer",
                  }}
                >
                  {locale === "en" ? "General" : "Параметри"}
                </button>
                <button
                  onClick={() => setSettingsTab("scan")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${
                      settingsTab === "scan"
                        ? steam.accent
                        : steam.border
                    }`,
                    background:
                      settingsTab === "scan"
                        ? "#11273a"
                        : steam.panelSoft,
                    color: steam.text,
                    cursor: "pointer",
                  }}
                >
                  {locale === "en" ? "Scan" : "Сканування"}
                </button>
                <button
                  onClick={() => setSettingsTab("library")}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${
                      settingsTab === "library"
                        ? steam.accent
                        : steam.border
                    }`,
                    background:
                      settingsTab === "library"
                        ? "#11273a"
                        : steam.panelSoft,
                    color: steam.text,
                    cursor: "pointer",
                  }}
                >
                  {locale === "en" ? "Library" : "Бібліотека"}
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${steam.border}`,
                    background: steam.panelSoft,
                    color: steam.text,
                    cursor: "pointer",
                  }}
                >
                  {locale === "en" ? "Close" : "Закрити"}
                </button>
              </div>
            </div>

            <div style={{ padding: 16, overflow: "auto" }}>
              {settingsTab === "params" && (
                <div
                  style={{
                    display: "grid",
                    rowGap: 12,
                  }}
                >
                  <div
                    style={{
                      border: `1px solid ${steam.border}`,
                      background: steam.panelSoft,
                      borderRadius: 10,
                      padding: 12,
                      color: steam.text,
                    }}
                  >
                    <div
                      style={{ fontWeight: 700, marginBottom: 6 }}
                    >
                      {locale === "en" ? "AI" : "ШІ"}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: steam.textMuted,
                        lineHeight: 1.5,
                      }}
                    >
                      {locale === "en"
                        ? "The app uses a local, on-device AI runtime (no cloud keys or servers). Nothing to set up here."
                        : "Застосунок використовує локальний, вбудований ШІ (без хмарних ключів і серверів). Тут нічого налаштовувати не потрібно."}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "200px 1fr",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <label style={{ color: steam.textMuted }}>
                      {locale === "en"
                        ? "Interface language:"
                        : "Мова інтерфейсу:"}
                    </label>
                    <select
                      value={locale}
                      onChange={(e) =>
                        setLocale(
                          (e.target.value as "uk" | "en") || "uk",
                        )
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${steam.inputBorder}`,
                        background: steam.inputBg,
                        color: steam.text,
                      }}
                    >
                      <option value="uk">Українська</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "200px 1fr auto",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <label style={{ color: steam.textMuted }}>
                      Steam API key:
                    </label>
                    <input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${steam.inputBorder}`,
                        background: steam.inputBg,
                        color: steam.text,
                      }}
                    />
                    <button
                      onClick={openHowToKey}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: steam.panelSoft,
                        color: steam.text,
                        border: `1px solid ${steam.border}`,
                        cursor: "pointer",
                      }}
                    >
                      {locale === "en"
                        ? "Where to get?"
                        : "Де взяти ключ?"}
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "200px 1fr auto",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <label style={{ color: steam.textMuted }}>
                      SteamID64:
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                      }}
                    >
                      <input
                        value={steamId}
                        onChange={(e) =>
                          setSteamId(e.target.value)
                        }
                        placeholder="7656119XXXXXXXXXX"
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1px solid ${steam.inputBorder}`,
                          background: steam.inputBg,
                          color: steam.text,
                        }}
                      />
                      <button
                        onClick={refreshAccounts}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: steam.panelSoft,
                          color: steam.text,
                          border: `1px solid ${steam.border}`,
                          cursor: "pointer",
                        }}
                      >
                        {locale === "en"
                          ? "Refresh accounts"
                          : "Оновити акаунти"}
                      </button>
                    </div>
                  </div>

                  {accounts.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "200px 1fr",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <label
                        style={{ color: steam.textMuted }}
                      >
                        {locale === "en"
                          ? "Detected accounts:"
                          : "Знайдені акаунти:"}
                      </label>
                      <select
                        value={steamId}
                        onChange={(e) =>
                          setSteamId(e.target.value)
                        }
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1px solid ${steam.inputBorder}`,
                          background: steam.inputBg,
                          color: steam.text,
                        }}
                      >
                        {accounts.map((a) => (
                          <option
                            key={a.steamid64}
                            value={a.steamid64}
                          >
                            {a.persona || a.steamid64} (
                            {a.steamid64})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "200px 1fr auto auto auto",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <label style={{ color: steam.textMuted }}>
                      Family SteamID64:
                    </label>
                    <input
                      value={familyIds}
                      onChange={(e) =>
                        setFamilyIds(e.target.value)
                      }
                      placeholder="7656119..., 7656119..."
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${steam.inputBorder}`,
                        background: steam.inputBg,
                        color: steam.text,
                      }}
                    />
                    <a
                      href="https://store.steampowered.com/account/familymanagement"
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      <button
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: steam.panelSoft,
                          color: steam.text,
                          border: `1px solid ${steam.border}`,
                          cursor: "pointer",
                        }}
                      >
                        {locale === "en"
                          ? "Open Family"
                          : "Відкрити сімʼю"}
                      </button>
                    </a>
                    <button
                      onClick={pasteFamilyFromClipboard}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: steam.panelSoft,
                        color: steam.text,
                        border: `1px solid ${steam.border}`,
                        cursor: "pointer",
                      }}
                    >
                      {locale === "en"
                        ? "Paste"
                        : "Вставити"}
                    </button>
                    <button
                      onClick={installBrowserHelper}
                      title={
                        locale === "en"
                          ? "Helper extension to copy SteamIDs"
                          : "Помічник для копіювання SteamID"
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: steam.panelSoft,
                        color: steam.text,
                        border: `1px solid ${steam.border}`,
                        cursor: "pointer",
                      }}
                    >
                      {locale === "en"
                        ? "Helper"
                        : "Помічник"}
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 4,
                      minHeight: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: steam.textMuted,
                      }}
                    >
                      {savedHint === "saving"
                        ? locale === "en"
                          ? "Saving…"
                          : "Збереження…"
                        : savedHint === "saved"
                        ? locale === "en"
                          ? "Saved ✓"
                          : "Збережено ✓"
                        : ""}
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                      <button
                        onClick={saveNow}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 10,
                          background: steam.accent,
                          color: "#0b1016",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          boxShadow:
                            "0 4px 12px rgba(102,192,244,.25)",
                        }}
                      >
                        {locale === "en"
                          ? "Save"
                          : "Зберегти"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === "scan" && (
                <div
                  style={{
                    display: "grid",
                    rowGap: 12,
                  }}
                >
                  <div style={{ color: steam.textMuted }}>
                    {locale === "en"
                      ? "Scanning uses Steam Web API. API key and SteamID must be set on the General tab."
                      : "Сканування використовує Steam Web API. Ключ і SteamID має бути вказано на вкладці «Параметри»."}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={scanUnified}
                      disabled={busy}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 10,
                        background: steam.accent,
                        color: "#0b1016",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 700,
                        boxShadow:
                          "0 6px 18px rgba(102,192,244,.25)",
                        opacity: busy ? 0.7 : 1,
                      }}
                    >
                      {busy
                        ? locale === "en"
                          ? "Scanning…"
                          : "Сканую…"
                        : locale === "en"
                        ? "Scan library"
                        : "Сканувати бібліотеку"}
                    </button>
                    <button
                      onClick={clearCache}
                      disabled={busy}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: steam.panelSoft,
                        color: "#ffd2d2",
                        border: `1px solid ${steam.border}`,
                        cursor: "pointer",
                        opacity: busy ? 0.7 : 1,
                      }}
                    >
                      {locale === "en"
                        ? "Clear cache"
                        : "Очистити кеш"}
                    </button>
                    <div
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          background: steam.chipBg,
                          borderRadius: 999,
                          padding: "6px 10px",
                          fontSize: 13,
                        }}
                      >
                        {locale === "en"
                          ? "Cached"
                          : "У кеші"}
                        : <b>{games.length}</b>
                      </div>
                      <div
                        style={{
                          background: steam.chipBg,
                          borderRadius: 999,
                          padding: "6px 10px",
                          fontSize: 13,
                        }}
                      >
                        {locale === "en"
                          ? "Installed"
                          : "Встановлено"}
                        :{" "}
                        <b>
                          {
                            games.filter(
                              (g) => g.installed,
                            ).length
                          }
                        </b>
                      </div>
                    </div>
                  </div>
                  {error && (
                    <div
                      style={{
                        color: "#ffd2d2",
                        background: "#3a0f16",
                        border: "1px solid #5e1a25",
                        padding: "10px 12px",
                        borderRadius: 10,
                        marginTop: 8,
                      }}
                    >
                      {error}
                    </div>
                  )}
                </div>
              )}

              {settingsTab === "library" && (
                <LibraryView
                  games={sorted}
                  total={games.length}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  search={search}
                  setSearch={setSearch}
                  locale={locale}
                />
              )}
            </div>
          </div>
        </div>
      )}

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
              localStorage.setItem(
                "sghelper:onboarding_done",
                "1",
              );
            } catch {}
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}

function LibraryView({
  games,
  total,
  sortBy,
  setSortBy,
  search,
  setSearch,
  locale,
}: {
  games: LibraryGame[];
  total: number;
  sortBy: "name" | "playtime" | "installed";
  setSortBy: (v: "name" | "playtime" | "installed") => void;
  search: string;
  setSearch: (v: string) => void;
  locale: "uk" | "en";
}) {
  const steam = {
    panelSoft: "#0d1726",
    inputBg: "#0c1624",
    inputBorder: "#24364a",
    border: "#1b2838",
    text: "#c7d5e0",
    textMuted: "#8aa2b5",
    chipBg: "#203448",
  };

  const t = (k: string) => {
    const uk: Record<string, string> = {
      search: "Пошук у бібліотеці…",
      sortName: "За назвою",
      sortPlaytime: "За часом у грі",
      sortInstalled: "Встановлені ↑",
      shown: "Показано",
      installed: "Встановлено",
      notInstalled: "Не встановлено",
      time: "Час у грі",
      hoursShort: "год",
      familyFrom: "Family від",
      noResults:
        "Немає результатів. Запусти сканування або зміни фільтр/пошук.",
    };
    const en: Record<string, string> = {
      search: "Search your library…",
      sortName: "By name",
      sortPlaytime: "By playtime",
      sortInstalled: "Installed ↑",
      shown: "Shown",
      installed: "Installed",
      notInstalled: "Not installed",
      time: "Playtime",
      hoursShort: "h",
      familyFrom: "Family from",
      noResults:
        "No results. Run scan or change filter/search.",
    };
    return (locale === "en" ? en : uk)[k] ?? k;
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search")}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${steam.inputBorder}`,
            background: steam.inputBg,
            color: steam.text,
          }}
        />
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as "name" | "playtime" | "installed")
          }
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${steam.inputBorder}`,
            background: steam.inputBg,
            color: steam.text,
          }}
        >
          <option value="name">{t("sortName")}</option>
          <option value="playtime">{t("sortPlaytime")}</option>
          <option value="installed">{t("sortInstalled")}</option>
        </select>
        <span
          style={{
            color: steam.textMuted,
            fontSize: 12,
          }}
        >
          {t("shown")}: {games.length} / {total}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns:
            "repeat(auto-fill,minmax(260px,1fr))",
        }}
      >
        {games.map((g) => (
          <div
            key={g.appid}
            style={{
              borderRadius: 12,
              padding: 12,
              background: steam.panelSoft,
              border: `1px solid ${
                g.installed ? "#1c4f2b" : steam.border
              }`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={g.name || `App ${g.appid}`}
              >
                {g.name || `App ${g.appid}`}
              </div>
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: g.installed
                    ? "rgba(89,191,64,.15)"
                    : steam.chipBg,
                  color: g.installed ? "#59bf40" : "#8aa2b5",
                  whiteSpace: "nowrap",
                }}
              >
                {g.installed ? t("installed") : t("notInstalled")}
              </span>
            </div>
            <div
              style={{
                opacity: 0.7,
                fontSize: 12,
                marginTop: 4,
                color: "#8aa2b5",
              }}
            >
              appid: {g.appid}
            </div>
            <div
              style={{
                opacity: 0.9,
                fontSize: 12,
                marginTop: 6,
              }}
            >
              {t("time")}:{" "}
              {g.playtime_minutes != null
                ? `${Math.round(
                    (g.playtime_minutes ?? 0) / 60,
                  )} ${t("hoursShort")}`
                : "—"}
            </div>
            {g.shared_from && (
              <div
                style={{
                  opacity: 0.75,
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                {t("familyFrom")}: <code>{g.shared_from}</code>
              </div>
            )}
          </div>
        ))}
      </div>
      {games.length === 0 && (
        <div
          style={{
            opacity: 0.7,
            marginTop: 12,
            color: "#8aa2b5",
          }}
        >
          {t("noResults")}
        </div>
      )}
    </div>
  );
}
