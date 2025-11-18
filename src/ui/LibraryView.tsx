import type { LibraryGame } from "../lib/backend";

type SortBy = "name" | "playtime" | "installed";
type Locale = "uk" | "en";

type Props = {
  games: LibraryGame[];
  total: number;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  search: string;
  setSearch: (v: string) => void;
  locale: Locale;
};

export default function LibraryView({
  games,
  total,
  sortBy,
  setSortBy,
  search,
  setSearch,
  locale,
}: Props) {
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
      noResults: "Немає результатів. Запусти сканування або зміни фільтр/пошук.",
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
      noResults: "No results. Run scan or change filter/search.",
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
          onChange={(e) => setSortBy(e.target.value as SortBy)}
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
        <span style={{ color: steam.textMuted, fontSize: 12 }}>
          {t("shown")}: {games.length} / {total}
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
        }}
      >
        {games.map((g) => (
          <div
            key={g.appid}
            style={{
              borderRadius: 12,
              padding: 12,
              background: steam.panelSoft,
              border: `1px solid ${g.installed ? "#1c4f2b" : steam.border}`,
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
                  background: g.installed ? "rgba(89,191,64,.15)" : steam.chipBg,
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
                ? `${Math.round((g.playtime_minutes ?? 0) / 60)} ${t("hoursShort")}`
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
