import { useEffect, useMemo, useState } from "react";
import { colors } from "../ui/palette";
import { call } from "../lib/backend";
import type { LibraryGame, PartialSettings } from "../lib/backend";

function guessGenres(name: string): string[] {
  const n = name.toLowerCase();
  const table: Array<[string[], string]> = [
    [["rpg", "souls", "witcher", "elder scrolls", "divinity"], "rpg"],
    [["shoot", "doom", "counter-strike", "cs ", "call of duty", "l4d", "left 4 dead"], "shooter"],
    [["puzzle", "portal", "witness", "talos"], "puzzle"],
    [["strategy", "civilization", "total war", "stellaris"], "strategy"],
    [["action", "devil may cry", "bayonetta"], "action"],
    [["platform", "ori", "hollow knight", "celeste"], "platformer"],
    [["racing", "forza", "dirt", "need for speed"], "racing"],
    [["survival", "raft", "forest", "don’t starve", "7 days"], "survival"],
    [["horror", "resident evil", "amnesia", "outlast"], "horror"],
    [["co-op", " coop", "overcooked", "it takes two", "payday", "borderlands"], "co-op"],
  ];
  for (const [keys, tag] of table) {
    if (keys.some((k) => n.includes(k))) return [tag];
  }
  return ["misc"];
}

function sum<T>(arr: T[], f: (t: T) => number): number {
  return arr.reduce((acc, x) => acc + f(x), 0);
}

function maxBy<T>(arr: T[], f: (t: T) => number): T | undefined {
  let best: T | undefined;
  let bestV = -Infinity;
  for (const it of arr) {
    const v = f(it);
    if (v > bestV) {
      bestV = v;
      best = it;
    }
  }
  return best;
}

function minutesToHHmm(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}

export default function RawHeuristicsTab() {
  const [library, setLibrary] = useState<LibraryGame[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [persona, setPersona] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const lib = await call<LibraryGame[]>("load_library_cache");
        setLibrary(lib ?? []);
      } catch {
        setLibrary([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await call<PartialSettings>("get_settings");
        const apiKey = s.api_key?.trim();
        const sid = s.main_steam_id64?.trim();
        if (!apiKey || !sid) return;

        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(
          apiKey,
        )}&steamids=${encodeURIComponent(sid)}`;

        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        const player = json?.response?.players?.[0];
        if (player?.avatarfull) setAvatar(player.avatarfull as string);
        if (player?.personaname) setPersona(player.personaname as string);
      } catch {
      }
    })();
  }, []);

  const {
    installedCount,
    unplayedCount,
    totalMinutes,
    avgMinutes,
    topGenre,
    longestGame,
    picks,
  } = useMemo(() => {
    const list = library;

    const installedCount = list.filter((g) => g.installed).length;
    const unplayedCount = list.filter((g) => (g.playtime_minutes ?? 0) === 0).length;

    const withPlay = list.filter((g) => (g.playtime_minutes ?? 0) > 0);
    const totalMinutes = sum(withPlay, (g) => g.playtime_minutes ?? 0);
    const avgMinutes = withPlay.length ? Math.round(totalMinutes / withPlay.length) : 0;

    const minutesByGenre = new Map<string, number>();
    for (const g of list) {
      const m = g.playtime_minutes ?? 0;
      const gs = guessGenres(g.name);
      for (const tag of gs) {
        minutesByGenre.set(tag, (minutesByGenre.get(tag) || 0) + m);
      }
    }
    let topGenre = "—";
    let topV = 0;
    for (const [k, v] of minutesByGenre) {
      if (v > topV) {
        topV = v;
        topGenre = k;
      }
    }

    const longestGame = maxBy(list, (g) => g.playtime_minutes ?? 0);

    const scored = list.map((g) => {
      const m = g.playtime_minutes ?? 0;
      const installed = g.installed ? 1 : 0;
      const unplayed = m === 0 ? 1 : 0;
      const barely = m > 0 && m < 10 ? 1 : 0;
      const score = installed * 2 + unplayed * 1.5 + barely * 1 - Math.log(1 + m) / 10;
      const labels: string[] = [];
      if (g.installed) labels.push("installed");
      if (m === 0) labels.push("unplayed");
      else if (m < 10) labels.push("barely tried");
      return { ...g, score, labels };
    });
    scored.sort((a, b) => b.score - a.score);
    const picks = scored.slice(0, 12);

    return {
      installedCount,
      unplayedCount,
      totalMinutes,
      avgMinutes,
      topGenre,
      longestGame,
      picks,
    };
  }, [library]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "relative",
          paddingTop: 16,
          paddingBottom: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            border: `2px solid ${colors.border}`,
            background: colors.panel,
            overflow: "hidden",
            boxShadow: "0 10px 28px rgba(0,0,0,.35)",
          }}
        >
          {avatar ? (
            <img
              src={avatar}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.textMuted,
                fontWeight: 700,
                fontSize: 18,
              }}
              title="No avatar"
            >
              🙂
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: -6,
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            padding: "4px 10px",
            borderRadius: 999,
            fontWeight: 700,
            boxShadow: "0 6px 14px rgba(0,0,0,.25)",
          }}
        >
          {persona ?? "Player"}
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          padding: "0 10px",
        }}
      >
        <StatCard label="Top genre" value={topGenre} />
        <StatCard
          label="Longest session"
          value={
            longestGame
              ? `${longestGame.name} — ${minutesToHHmm(longestGame.playtime_minutes ?? 0)}`
              : "—"
          }
        />
        <StatCard label="Installed" value={`${installedCount}`} />
        <StatCard label="Unplayed" value={`${unplayedCount}`} />
        <StatCard label="Total time" value={minutesToHHmm(totalMinutes)} />
        <StatCard label="Avg session" value={minutesToHHmm(avgMinutes)} />
      </div>

      <div style={{ padding: 10 }}>
        <div
          style={{
            marginTop: 16,
            marginBottom: 8,
            color: colors.textMuted,
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          Suggestions (local heuristics)
        </div>

        {picks.length === 0 && (
          <div style={{ color: colors.textMuted }}>No candidates yet.</div>
        )}

        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {picks.map((p) => (
            <div
              key={p.appid}
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.panel,
                borderRadius: 14,
                padding: "10px 12px",
                boxShadow: "0 10px 24px rgba(0,0,0,.20)",
              }}
              title={p.name}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </div>
                <div style={{ color: colors.textMuted, fontSize: 12 }}>#{p.appid}</div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 8,
                  alignItems: "center",
                }}
              >
                {p.labels.map((lb) => (
                  <span
                    key={lb}
                    style={{
                      border: `1px solid ${colors.border}`,
                      background: "#11231e",
                      color: colors.textMuted,
                      padding: "3px 8px",
                      fontSize: 12,
                      borderRadius: 999,
                    }}
                  >
                    {lb}
                  </span>
                ))}
                <span
                  style={{
                    border: `1px dashed ${colors.border}`,
                    color: colors.textMuted,
                    padding: "3px 8px",
                    fontSize: 12,
                    borderRadius: 999,
                  }}
                  title="internal score"
                >
                  score: {p.score.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        background: colors.panel,
        borderRadius: 14,
        padding: "12px 14px",
        minHeight: 72,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxShadow: "0 10px 24px rgba(0,0,0,.18)",
      }}
    >
      <div style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 0.2 }}>
        {value}
      </div>
    </div>
  );
}
