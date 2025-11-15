// apps/desktop/src/ui/palette.ts
export const colors = {
  /* твої базові */
  bg: "#0b141e",
  bgDeep: "#171a21",
  panel: "#0e1a2e",
  accent: "#2a475e",
  blue: "#66c0f4",
  green: "#4ad087",
  text: "#e5eef5",
  textDim: "#9fb3c8",
  glow: "rgba(102,192,244,0.6)",

  /* додані ключі, які очікують нові компоненти */
  panelSoft: "#0d1726",      // м'якша панель
  border: "#1b2838",         // рамки/розділювачі
  accentHover: "#8fd1fa",    // hover-акцент
  textMuted: "#8aa2b5",      // приглушений текст
  chipBg: "#203448",         // бейджі/чіпи
  inputBg: "#0c1624",        // інпути
  inputBorder: "#24364a",    // рамка інпутів

  /* утиліти */
  ok: "#59bf40",
  danger: "#ef4444",
} as const;
