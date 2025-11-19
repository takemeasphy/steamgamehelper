import type { LibraryGame } from "../../lib/backend";
import LibraryView from "../scan/LibraryView";

type Props = {
  locale: "uk" | "en";
  sortedGames: LibraryGame[];
  total: number;
  sortBy: "name" | "playtime" | "installed";
  setSortBy: (v: "name" | "playtime" | "installed") => void;
  search: string;
  setSearch: (v: string) => void;
};

export default function SettingsLibraryTab(props: Props) {
  const { locale, sortedGames, total, sortBy, setSortBy, search, setSearch } = props;

  return (
    <LibraryView
      games={sortedGames}
      total={total}
      sortBy={sortBy}
      setSortBy={setSortBy}
      search={search}
      setSearch={setSearch}
      locale={locale}
    />
  );
}
