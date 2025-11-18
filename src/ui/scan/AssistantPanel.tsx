import AssistantTab from "../../assistant/AskAssistant";

type Props = {
  gamesCount: number;
  installedCount: number;
  locale: "uk" | "en";
  error?: string;
};

const steam = {
  panel: "#0f1b2b",
  panelSoft: "#0d1726",
  border: "#1b2838",
  accent: "#66c0f4",
  text: "#c7d5e0",
  textMuted: "#8aa2b5",
  chipBg: "#203448",
};

export default function AssistantPanel({
  gamesCount,
  installedCount,
  locale,
  error,
}: Props) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        background: "linear-gradient(180deg, #0f1b2b 0%, #0d1726 100%)",
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
          {locale === "en" ? "Ask the assistant" : "Порадитись з ІІ"}
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
            <b style={{ color: steam.text }}>{gamesCount}</b>
          </span>
          <span
            style={{
              background: steam.chipBg,
              borderRadius: 999,
              padding: "4px 8px",
            }}
          >
            {locale === "en" ? "Installed" : "Встановлено"}:{" "}
            <b style={{ color: steam.text }}>{installedCount}</b>
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
          <span style={{ color: "#ffd2d2", marginLeft: 8 }}>• {error}</span>
        ) : null}
      </div>
    </div>
  );
}
