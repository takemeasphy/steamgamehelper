import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { colors } from "../ui/palette";

/** ---------- types ---------- */
type Msg = { role: "assistant" | "user"; text: string; ts: number };
type Locale = "uk" | "en";
type Mode = "chat" | "raw";
type LibraryGame = {
  appid: number;
  name: string;
  installed: boolean;
  playtime_minutes?: number | null;
  shared_from?: string | null;
};

/** універсальний хелпер для викликів команд плагіна "app" */
const call = <T,>(cmd: string, args?: Record<string, any>) =>
  invoke<T>(`plugin:app|${cmd}`, args);

/** ---------- i18n ---------- */
function readLocale(): Locale {
  try {
    return localStorage.getItem("sghelper:locale") === "en" ? "en" : "uk";
  } catch {
    return "uk";
  }
}

function tFactory(locale: Locale) {
  const uk: Record<string, string> = {
    intro: "Почнемо! Напиши, який настрій/жанр/тривалість сесії — підкажу гру.",
    placeholder: "Опиши настрій або що хочеш спробувати…",
    send: "Надіслати",
    reset: "Очистити",
    ready: "Готово. Почнемо заново ✨",
    errPrefix: "Помилка",
    thinking: "Думаю…",
    llmUnavailable:
      "LLM недоступний (модель не знайдено або помилка інференсу).",
    tabChat: "Чат",
    tabRaw: "Raw",
    tip: "Порада: відкрий «Settings → Scan», щоб оновити бібліотеку для точніших рекомендацій.",
    chatOverlay: "AI chat is under development. Coming soon ✨",
  };
  const en: Record<string, string> = {
    intro:
      "Let’s start! Tell me your mood/genre/session length — I’ll suggest a game.",
    placeholder: "Describe your mood or what you want to try…",
    send: "Send",
    reset: "Clear",
    ready: "All set. Let’s start over ✨",
    errPrefix: "Error",
    thinking: "Thinking…",
    llmUnavailable:
      "LLM is unavailable (model not found or inference error).",
    tabChat: "Chat",
    tabRaw: "Raw",
    tip: "Tip: open Settings → Scan to refresh the library for better recommendations.",
    chatOverlay: "AI chat is under development. Coming soon ✨",
  };
  return (k: string) => (locale === "en" ? en : uk)[k] ?? k;
}

/** ---------- Raw heuristics tab (без внутрішнього tip, щоб не дублювався) ---------- */
function RawHeuristicsTab() {
  const [list, setList] = useState<LibraryGame[]>([]);
  const [picks, setPicks] = useState<
    { appid: number; name: string; installed: boolean; labels: string[]; score: number }[]
  >([]);

  useEffect(() => {
    (async () => {
      try {
        const lib = await call<LibraryGame[]>("load_library_cache");
        setList(lib ?? []);
      } catch {
        setList([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!list.length) {
      setPicks([]);
      return;
    }
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

      return {
        appid: g.appid,
        name: g.name || `app ${g.appid}`,
        installed: !!g.installed,
        labels,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    setPicks(scored.slice(0, 20));
  }, [list]);

  return (
    <div style={{ padding: 10 }}>
      {picks.length === 0 && (
        <div style={{ color: colors.textMuted }}>No candidates yet.</div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {picks.map((p) => (
          <div
            key={p.appid}
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.panel,
              borderRadius: 12,
              padding: "10px 12px",
            }}
            title={p.name}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
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

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
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
  );
}

/** ---------- main UI (tabs + chat) ---------- */
export default function AskAssistant() {
  const [locale, setLocale] = useState<Locale>(readLocale);
  const t = tFactory(locale);

  const [mode, setMode] = useState<Mode>("chat");

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: t("intro"), ts: Date.now() },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const sendingRef = useRef(false);

  /** автоскрол */
  useEffect(() => {
    const div = listRef.current;
    if (!div) return;
    div.scrollTo({ top: div.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  /** автооновлення локалі */
  useEffect(() => {
    const id = setInterval(() => {
      const cur = readLocale();
      setLocale((prev) => (prev === cur ? prev : cur));
    }, 500);
    return () => clearInterval(id);
  }, []);

  /** коли змінився locale — перезаписати перше привітання */
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [{ role: "assistant", text: t("intro"), ts: Date.now() }];
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function send(msg: string) {
    if (mode !== "chat") return; // відправлення лише у чат-режимі (але він заблокований оверлеєм)

    const trimmed = msg.trim();
    if (!trimmed || busy || sendingRef.current) return;

    sendingRef.current = true;
    setMessages((m) => [...m, { role: "user", text: trimmed, ts: Date.now() }]);
    setText("");

    const thinking = t("thinking");
    setMessages((m) => [...m, { role: "assistant", text: thinking, ts: Date.now() }]);
    setBusy(true);

    try {
      const answer = await call<string>("llm_chat", { user: { text: trimmed } });
      setMessages((m) => {
        const next = m.slice();
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === "assistant" && next[i].text === thinking) {
            next[i] = { role: "assistant", text: answer || "", ts: Date.now() };
            return next;
          }
        }
        return [...next, { role: "assistant", text: answer || "", ts: Date.now() }];
      });
    } catch (e: any) {
      const msg = `[${t("errPrefix")}]: ${t("llmUnavailable")} ${e?.toString?.() ?? ""}`.trim();
      setMessages((m) => {
        const next = m.slice();
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === "assistant" && next[i].text === t("thinking")) {
            next[i] = { role: "assistant", text: msg, ts: Date.now() };
            return next;
          }
        }
        return [...next, { role: "assistant", text: msg, ts: Date.now() }];
      });
    } finally {
      setBusy(false);
      sendingRef.current = false;
    }
  }

  function reset() {
    setMessages([{ role: "assistant", text: t("ready"), ts: Date.now() }]);
    setText("");
    setBusy(false);
    sendingRef.current = false;
  }

  /** формат часу (на ховер) */
  function fmt(ts: number) {
    const d = new Date(ts);
    return d.toLocaleString();
  }

  const TabButton = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: active ? colors.accent : colors.panel,
        color: active ? "#0b1016" : colors.text,
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );

  /** оверлей для чату (повне покриття контейнера) */
  function ChatOverlay() {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
          zIndex: 10,
        }}
      >
        {/* напівпрозорий фон для повного покриття */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(8,14,20,0.45)",
            backdropFilter: "blur(3px)",
          }}
        />
        {/* бейдж повідомлення */}
        <div
          style={{
            position: "relative",
            zIndex: 11,
            background: colors.panel,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            borderRadius: 12,
            padding: "10px 14px",
            boxShadow: "0 8px 24px rgba(0,0,0,.35)",
            fontWeight: 700,
          }}
        >
          {t("chatOverlay")}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: colors.panelSoft,
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 10,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <TabButton label={t("tabChat")} active={mode === "chat"} onClick={() => setMode("chat")} />
        <TabButton label={t("tabRaw")} active={mode === "raw"} onClick={() => setMode("raw")} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {mode === "chat" ? (
          // Обгортка всього чат-інтерфейсу, щоб оверлей накривав і список, і інпут
          <div style={{ position: "absolute", inset: 0 }}>
            {/* Контент чату (під оверлеєм): розділив на scroll-list та input */}
            <div
              style={{
                position: "absolute",
                inset: "0 0 56px 0", // лишаємо місце під input-бар (56px)
                overflowY: "auto",
                padding: 12,
                filter: "blur(0.5px)",
                opacity: 0.55,
                pointerEvents: "none", // блокуємо взаємодію під оверлеєм
              }}
              ref={listRef}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    marginBottom: 10,
                    justifyContent: m.role === "assistant" ? "flex-start" : "flex-end",
                    position: "relative",
                  }}
                >
                  {/* time (appears on hover) – залишили, але воно все одно заблоковано overlay */}
                  <div
                    style={{
                      position: "absolute",
                      top: -16,
                      [m.role === "assistant" ? "left" : "right"]: 0,
                      color: colors.textMuted,
                      fontSize: 11,
                      opacity: 0,
                      transition: "opacity 120ms ease, transform 120ms ease",
                      transform: "translateY(4px)",
                    }}
                    className="msg-time"
                  >
                    {fmt(m.ts)}
                  </div>

                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                      background: m.role === "assistant" ? colors.panel : "#0f1e2d",
                      color: colors.text,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* input-bar (також під оверлеєм) */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 56,
                padding: 10,
                display: "flex",
                gap: 8,
                alignItems: "center",
                background: colors.panelSoft,
                borderTop: `1px solid ${colors.border}`,
                filter: "blur(0.5px)",
                opacity: 0.55,
                pointerEvents: "none",
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder=""
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${colors.inputBorder}`,
                  background: colors.inputBg,
                  color: colors.text,
                  outline: "none",
                }}
                disabled
              />
              <button
                type="button"
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#1a3148",
                  color: "#0b1016",
                  border: "none",
                  fontWeight: 700,
                  opacity: 0.75,
                }}
                disabled
              >
                {t("send")}
              </button>
              <button
                type="button"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: colors.panel,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  opacity: 0.75,
                }}
                disabled
              >
                {t("reset")}
              </button>
            </div>

            {/* блокуючий оверлей поверх усього чат-контейнера */}
            <ChatOverlay />
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, overflow: "auto" }}>
            <RawHeuristicsTab />
          </div>
        )}
      </div>
    </div>
  );
}
