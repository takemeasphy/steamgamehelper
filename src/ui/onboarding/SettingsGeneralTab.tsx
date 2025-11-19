import type { AccountHint } from "../../lib/backend";

const steam = {
  panel: "#0f1b2b",
  panelSoft: "#0d1726",
  border: "#1b2838",
  accent: "#66c0f4",
  text: "#c7d5e0",
  textMuted: "#8aa2b5",
  chipBg: "#203448",
  inputBg: "#0c1624",
  inputBorder: "#24364a",
};

type Props = {
  locale: "uk" | "en";
  setLocale: (locale: "uk" | "en") => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  steamId: string;
  setSteamId: (v: string) => void;
  familyIds: string;
  setFamilyIds: (v: string) => void;
  accounts: AccountHint[];
  savedHint: "" | "saved" | "saving";
  onSaveNow: () => void;
  onRefreshAccounts: () => void;
  onPasteFamilyFromClipboard: () => void;
  onInstallBrowserHelper: () => void;
};

export default function SettingsGeneralTab(props: Props) {
  const {
    locale,
    setLocale,
    apiKey,
    setApiKey,
    steamId,
    setSteamId,
    familyIds,
    setFamilyIds,
    accounts,
    savedHint,
    onSaveNow,
    onRefreshAccounts,
    onPasteFamilyFromClipboard,
    onInstallBrowserHelper,
  } = props;

  return (
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
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
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
          {locale === "en" ? "Interface language:" : "Мова інтерфейсу:"}
        </label>
        <select
          value={locale}
          onChange={(e) => setLocale((e.target.value as "uk" | "en") || "uk")}
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
        <label style={{ color: steam.textMuted }}>Steam API key:</label>
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
          onClick={onInstallBrowserHelper}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: steam.panelSoft,
            color: steam.text,
            border: `1px solid ${steam.border}`,
            cursor: "pointer",
          }}
        >
          {locale === "en" ? "Where to get key?" : "Де взяти ключ?"}
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
        <label style={{ color: steam.textMuted }}>SteamID64:</label>
        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <input
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
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
            onClick={onRefreshAccounts}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: steam.panelSoft,
              color: steam.text,
              border: `1px solid ${steam.border}`,
              cursor: "pointer",
            }}
          >
            {locale === "en" ? "Refresh accounts" : "Оновити акаунти"}
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
          <label style={{ color: steam.textMuted }}>
            {locale === "en" ? "Detected accounts:" : "Знайдені акаунти:"}
          </label>
          <select
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: `1px solid ${steam.inputBorder}`,
              background: steam.inputBg,
              color: steam.text,
            }}
          >
            {accounts.map((a) => (
              <option key={a.steamid64} value={a.steamid64}>
                {a.persona || a.steamid64} ({a.steamid64})
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr auto auto auto",
          gap: 10,
          alignItems: "center",
        }}
      >
        <label style={{ color: steam.textMuted }}>Family SteamID64:</label>
        <input
          value={familyIds}
          onChange={(e) => setFamilyIds(e.target.value)}
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
            {locale === "en" ? "Open Family" : "Відкрити сімʼю"}
          </button>
        </a>
        <button
          onClick={onPasteFamilyFromClipboard}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: steam.panelSoft,
            color: steam.text,
            border: `1px solid ${steam.border}`,
            cursor: "pointer",
          }}
        >
          {locale === "en" ? "Paste" : "Вставити"}
        </button>
        <button
          onClick={onInstallBrowserHelper}
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
          {locale === "en" ? "Helper" : "Помічник"}
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
            onClick={onSaveNow}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              background: steam.accent,
              color: "#0b1016",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 4px 12px rgba(102,192,244,.25)",
            }}
          >
            {locale === "en" ? "Save" : "Зберегти"}
          </button>
        </div>
      </div>
    </div>
  );
}
