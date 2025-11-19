import type { LibraryGame } from "../../lib/backend";

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
  busy: boolean;
  error?: string;
  onScan: () => void;
  onClearCache: () => void;
  games: LibraryGame[];
  installedCount: number;
};

export default function SettingsScanTab(props: Props) {
  const { locale, busy, error, onScan, onClearCache, games, installedCount } = props;

  return (
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
          onClick={onScan}
          disabled={busy}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: steam.accent,
            color: "#0b1016",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            boxShadow: "0 6px 18px rgba(102,192,244,.25)",
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
          onClick={onClearCache}
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
          {locale === "en" ? "Clear cache" : "Очистити кеш"}
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
            {locale === "en" ? "Cached" : "У кеші"}: <b>{games.length}</b>
          </div>
          <div
            style={{
              background: steam.chipBg,
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 13,
            }}
          >
            {locale === "en" ? "Installed" : "Встановлено"}:{" "}
            <b>{installedCount}</b>
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
  );
}
