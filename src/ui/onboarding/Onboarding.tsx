import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./onboarding.css";

/** Палітра, як у Steam */
const colors = {
  bg: "#0b141e",
  panel: "#0f1b2b",
  panelSoft: "#0d1726",
  border: "#1b2838",
  accent: "#66c0f4",
  text: "#c7d5e0",
  textMuted: "#8aa2b5",
  chipBg: "#203448",
  inputBg: "#0c1624",
  inputBorder: "#24364a",
  ok: "#59bf40",
};

type AccountHint = { steamid64: string; persona: string };

type Props = {
  // Steam
  initialApiKey?: string;
  initialSteamId?: string;
  initialFamilyIds?: string;

  // завершення
  onDone: () => void;
  onStartScan?: () => void;
};

type Lang = "uk" | "en";

export default function Onboarding({
  initialApiKey = "",
  initialSteamId = "",
  initialFamilyIds = "",
  onDone,
  onStartScan,
}: Props) {
  const [step, setStep] = useState(0);

  // Мова інтерфейсу
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const v = localStorage.getItem("sghelper:lang") as Lang | null;
      return v === "en" ? "en" : "uk";
    } catch {
      return "uk";
    }
  });

  // Steam
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [steamId, setSteamId] = useState(initialSteamId);
  const [familyIds, setFamilyIds] = useState(initialFamilyIds);
  const [accounts, setAccounts] = useState<AccountHint[]>([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();

  // Локалізовані тексти (мінімально необхідне)
  const t = useMemo(() => {
    if (lang === "en") {
      return {
        title: "Guide",
        welcomeTitle: "Welcome!",
        welcomeP1:
          "SteamGameHelper helps you pick a game for your mood: we read your Steam library and chat about what you want to play right now. A few quick steps ahead.",
        tips: [
          "Nothing extra is sent — requests go directly to api.steampowered.com.",
          "You can reopen this guide anytime in Settings.",
        ],
        langStepTitle: "Step 1 — Choose language",
        langLabel: "Interface language:",
        step2Title: "Step 2 — Steam Web API Key",
        step2P: "Paste your Steam API key. If you don’t know where to get it — tap the button.",
        whereKey: "Where to get a key?",
        storedLocally: "The key is stored locally in prefs.json.",
        step3Title: "Step 3 — Main SteamID64",
        step3P: "Pick a detected account or enter your SteamID64 manually.",
        found: "Found",
        step4Title: "Step 4 — Family accounts (optional)",
        step4P:
          "Add family members’ SteamID64 (separated by commas/spaces) to see shared games. You can open the Family page or paste from clipboard.",
        openFamily: "Open Family",
        paste: "Paste from clipboard",
        optional: "You can skip this — add it later in Settings.",
        doneTitle: "All set!",
        doneP:
          "We’ll save settings and go to the main screen. Optionally, start scanning the library right away — it improves recommendations.",
        saveAndScan: "Save & Scan",
        saveOnly: "Save only",
        restartHint: "You can replay this guide later in Settings → “Getting started”.",
        next: "Next",
        back: "Back",
        finish: "Finish",
        skip: "Skip",
        accountsDetected: "accounts detected",
        steamIdPlaceholder: "7656119XXXXXXXXXX",
        familyPlaceholder: "7656119..., 7656119...",
        apiKeyPlaceholder: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        langUk: "Ukrainian",
        langEn: "English",
      };
    }
    // uk
    return {
      title: "Гайд",
      welcomeTitle: "Ласкаво просимо!",
      welcomeP1:
        "SteamGameHelper допоможе підібрати гру під настрій: зчитаємо вашу бібліотеку Steam і поговоримо про те, що хочеться прямо зараз. Далі — кілька простих кроків.",
      tips: [
        "Нічого зайвого не відправляємо — запити йдуть напряму до api.steampowered.com.",
        "У будь-який момент гайд можна відкрити знову у Налаштуваннях.",
      ],
      langStepTitle: "Крок 1 — Оберіть мову",
      langLabel: "Мова інтерфейсу:",
      step2Title: "Крок 2 — Steam Web API Key",
      step2P: "Вставте ваш Steam API Key. Якщо не знаєте де взяти — натисніть кнопку.",
      whereKey: "Де взяти ключ?",
      storedLocally: "Ключ зберігається локально у prefs.json.",
      step3Title: "Крок 3 — Основний SteamID64",
      step3P: "Оберіть знайдений акаунт або введіть SteamID64 вручну.",
      found: "Знайдено",
      step4Title: "Крок 4 — Family облікові (необовʼязково)",
      step4P:
        "Додайте SteamID64 членів сімʼї (через розділювачі), щоб бачити спільні ігри. Можна відкрити сторінку сімʼї або вставити скопійоване.",
      openFamily: "Відкрити сімʼю",
      paste: "Вставити з буфера",
      optional: "Це можна пропустити — додасте пізніше у Налаштуваннях.",
      doneTitle: "Готово!",
      doneP:
        "Збережемо параметри та перейдемо до головного екрана. За бажанням одразу запустіть сканування бібліотеки — це покращить рекомендації.",
      saveAndScan: "Зберегти й Сканувати",
      saveOnly: "Лише зберегти",
      restartHint: "Онбординг можна повторити у Налаштуваннях → «Початковий гайд».",
      next: "Далі",
      back: "Назад",
      finish: "Завершити",
      skip: "Пропустити",
      accountsDetected: "Знайдено",
      steamIdPlaceholder: "7656119XXXXXXXXXX",
      familyPlaceholder: "7656119..., 7656119...",
      apiKeyPlaceholder: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      langUk: "Українська",
      langEn: "Англійська",
    };
  }, [lang]);

  useEffect(() => {
    // підказки акаунтів
    invoke<AccountHint[]>("detect_accounts")
      .then((h) => setAccounts(h || []))
      .catch(() => {});
  }, []);

  const canNext = useMemo(() => {
    if (step === 1) return !!apiKey.trim();
    if (step === 2) return !!steamId.trim();
    return true;
  }, [step, apiKey, steamId]);

  async function openApiKeyHelp() {
    try { await invoke("open_apikey_page"); } catch {}
  }
  async function openFamilyPage() {
    try { await invoke("open_family_page"); } catch {}
  }
  async function pasteFamilyFromClipboard() {
    try {
      const txt = await navigator.clipboard.readText();
      if (txt) setFamilyIds(txt.trim());
    } catch {}
  }

  async function saveSettings() {
    setBusy(true);
    setErr(undefined);
    try {
      const fam = familyIds
        .split(/[_,;\s\n\r\t]+/g)
        .map((s) => s.trim())
        .filter(Boolean);

      // Зберегти мову локально
      try { localStorage.setItem("sghelper:lang", lang); } catch {}

      // Зберегти Steam-параметри у prefs.json через бекенд
      await invoke("save_settings", {
        s: {
          api_key: apiKey.trim(),
          main_steam_id64: steamId.trim(),
          family_ids: fam,
        },
      });
    } catch (e: any) {
      setErr(e?.toString?.() ?? "Помилка");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (!canNext) return;
    setStep((s) => Math.min(s + 1, screens.length - 1));
  }
  function prev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish() {
    await saveSettings();
    try { localStorage.setItem("sghelper:onboarding_done", "1"); } catch {}
    onDone?.();
  }

  const screens = [
    // 0 — Welcome + Lang
    <Screen key="s0" title={t.welcomeTitle}>
      <p className="ob-text">{t.welcomeP1}</p>
      <Tips items={t.tips}/>
      <div className="ob-row" style={{ marginTop: 12 }}>
        <label className="ob-label">{t.langLabel}</label>
        <select
          className="ob-input"
          value={lang}
          onChange={(e) => setLang((e.target.value as Lang) || "uk")}
          style={{ maxWidth: 260 }}
        >
          <option value="uk">{t.langUk}</option>
          <option value="en">{t.langEn}</option>
        </select>
      </div>
    </Screen>,

    // 1 — Steam API Key
    <Screen key="s1" title={t.step2Title}>
      <p className="ob-text">{t.step2P}</p>
      <div className="ob-row">
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t.apiKeyPlaceholder}
          className="ob-input"
        />
        <button className="ob-btn" onClick={openApiKeyHelp}>{t.whereKey}</button>
      </div>
      <Small muted={!apiKey.trim()}>{t.storedLocally}</Small>
    </Screen>,

    // 2 — Main SteamID64
    <Screen key="s2" title={t.step3Title}>
      <p className="ob-text">{t.step3P}</p>
      {accounts.length > 0 && (
        <div className="ob-row">
          <select
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            className="ob-input"
          >
            {accounts.map((a) => (
              <option key={a.steamid64} value={a.steamid64}>
                {a.persona || a.steamid64} ({a.steamid64})
              </option>
            ))}
          </select>
          <span className="ob-hint">
            {t.found} {accounts.length}
          </span>
        </div>
      )}
      <div className="ob-row">
        <input
          value={steamId}
          onChange={(e) => setSteamId(e.target.value)}
          placeholder={t.steamIdPlaceholder}
          className="ob-input"
        />
      </div>
    </Screen>,

    // 3 — Family
    <Screen key="s3" title={t.step4Title}>
      <p className="ob-text">{t.step4P}</p>
      <div className="ob-row">
        <input
          value={familyIds}
          onChange={(e) => setFamilyIds(e.target.value)}
          placeholder={t.familyPlaceholder}
          className="ob-input"
        />
      </div>
      <div className="ob-row">
        <button className="ob-btn" onClick={openFamilyPage}>{t.openFamily}</button>
        <button className="ob-btn" onClick={pasteFamilyFromClipboard}>{t.paste}</button>
      </div>
      <Small>{t.optional}</Small>
    </Screen>,

    // 4 — Finish
    <Screen key="s4" title={t.doneTitle}>
      <p className="ob-text">{t.doneP}</p>
      {err && <div className="ob-error">{err}</div>}
      <div className="ob-row">
        <button
          className="ob-btn ob-btnAccent"
          disabled={busy}
          onClick={async () => { await saveSettings(); onStartScan?.(); finish(); }}
        >
          {busy ? (lang === "en" ? "Saving…" : "Зберігаю…") : t.saveAndScan}
        </button>
        <button className="ob-btn" disabled={busy} onClick={finish}>{t.saveOnly}</button>
      </div>
      <Small muted>{t.restartHint}</Small>
    </Screen>,
  ];

  return (
    <div className="ob-wrap" role="dialog" aria-modal="true">
      <div className="ob-card" style={{ borderColor: colors.border, background: colors.panel }}>
        <div className="ob-header">
          <div className="ob-title">{t.title}</div>
          <button className="ob-close" onClick={finish} title={t.skip}>✕</button>
        </div>

        <div className="ob-body">{screens[step]}</div>

        <div className="ob-footer">
          <div className="ob-dots">
            {screens.map((_, i) => (
              <span key={i} className={`ob-dot ${i === step ? "is-active" : ""}`} />
            ))}
          </div>
          <div className="ob-actions">
            <button className="ob-btn" onClick={prev} disabled={step === 0}>{t.back}</button>
            {step < screens.length - 1 ? (
              <button className="ob-btn ob-btnAccent" disabled={!canNext} onClick={next}>
                {t.next}
              </button>
            ) : (
              <button className="ob-btn ob-btnAccent" onClick={finish}>{t.finish}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== дрібні підкомпоненти ===== */

function Screen({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <div className="ob-screenTitle">{title}</div>
      <div className="ob-content">{children}</div>
    </div>
  );
}

function Tips({ items }: { items: string[] }) {
  return (
    <ul className="ob-tips">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}

function Small({ children, muted }: { children: any; muted?: boolean }) {
  return <div className="ob-small" style={{ opacity: muted ? .7 : 1 }}>{children}</div>;
}
