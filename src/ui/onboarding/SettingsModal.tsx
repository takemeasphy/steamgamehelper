import type { AccountHint, LibraryGame } from "../../lib/backend";
import SettingsGeneralTab from "./SettingsGeneralTab";
import SettingsScanTab from "./SettingsScanTab";
import SettingsLibraryTab from "./SettingsLibraryTab";

export type SettingsTab = "params" | "scan" | "library";

type Props = {
  open: boolean;
  onClose: () => void;

  locale: "uk" | "en";
  setLocale: (locale: "uk" | "en") => void;

  apiKey: string;
  setApiKey: (v: string) => void;
  steamId: string;
  setSteamId: (v: string) => void;
  familyIds: string;
  setFamilyIds: (v: string) => void;

  accounts: AccountHint[];

  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;

  savedHint: "" | "saved" | "saving";
  onSaveNow: () => void;

  busy: boolean;
  error?: string;
  onScan: () => void;
  onClearCache: () => void;

  games: LibraryGame[];
  installedCount: number;
  sortedGames: LibraryGame[];
  sortBy: "name" | "playtime" | "installed";
  setSortBy: (v: "name" | "playtime" | "installed") => void;
  search: string;
  setSearch: (v: string) => void;

  onRefreshAccounts: () => void;
  onPasteFamilyFromClipboard: () => void;
  onInstallBrowserHelper: () => void;
};

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

export default function SettingsModal(props: Props) {
  if (!props.open) return null;

  const {
    onClose,
    locale,
    setLocale,
    apiKey,
    setApiKey,
    steamId,
    setSteamId,
    familyIds,
    setFamilyIds,
    accounts,
    settingsTab,
    setSettingsTab,
    savedHint,
    onSaveNow,
    busy,
    error,
    onScan,
    onClearCache,
    games,
    installedCount,
    sortedGames,
    sortBy,
    setSortBy,
    search,
    setSearch,
    onRefreshAccounts,
    onPasteFamilyFromClipboard,
    onInstallBrowserHelper,
  } = props;

  return (
    <div
      onClick={onClose}
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
                  settingsTab === "params" ? steam.accent : steam.border
                }`,
                background: settingsTab === "params" ? "#11273a" : steam.panelSoft,
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
                  settingsTab === "scan" ? steam.accent : steam.border
                }`,
                background: settingsTab === "scan" ? "#11273a" : steam.panelSoft,
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
                  settingsTab === "library" ? steam.accent : steam.border
                }`,
                background: settingsTab === "library" ? "#11273a" : steam.panelSoft,
                color: steam.text,
                cursor: "pointer",
              }}
            >
              {locale === "en" ? "Library" : "Бібліотека"}
            </button>
            <button
              onClick={onClose}
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
            <SettingsGeneralTab
              locale={locale}
              setLocale={setLocale}
              apiKey={apiKey}
              setApiKey={setApiKey}
              steamId={steamId}
              setSteamId={setSteamId}
              familyIds={familyIds}
              setFamilyIds={setFamilyIds}
              accounts={accounts}
              savedHint={savedHint}
              onSaveNow={onSaveNow}
              onRefreshAccounts={onRefreshAccounts}
              onPasteFamilyFromClipboard={onPasteFamilyFromClipboard}
              onInstallBrowserHelper={onInstallBrowserHelper}
            />
          )}

          {settingsTab === "scan" && (
            <SettingsScanTab
              locale={locale}
              busy={busy}
              error={error}
              onScan={onScan}
              onClearCache={onClearCache}
              games={games}
              installedCount={installedCount}
            />
          )}

          {settingsTab === "library" && (
            <SettingsLibraryTab
              locale={locale}
              sortedGames={sortedGames}
              total={games.length}
              sortBy={sortBy}
              setSortBy={setSortBy}
              search={search}
              setSearch={setSearch}
            />
          )}
        </div>
      </div>
    </div>
  );
}
