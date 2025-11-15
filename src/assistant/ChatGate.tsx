import React from "react";

/**
 * ChatGate — накладає напівпрозорий шар, блокує кліки (pointer-events: none)
 * та блюрить вміст, залишаючи ваш код неушкодженим під капотом.
 */
export default function ChatGate({
  locked,
  message,
  children,
}: {
  locked: boolean;
  message?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          filter: locked ? "blur(2px)" : "none",
          pointerEvents: locked ? "none" : "auto",
          userSelect: locked ? "none" : "auto",
          transition: "filter 160ms ease",
        }}
        aria-hidden={locked ? true : undefined}
      >
        {children}
      </div>

      {locked && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(180deg, rgba(9,14,20,0.45) 0%, rgba(9,14,20,0.7) 100%)",
            borderRadius: 10,
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 12,
              border: "1px dashed rgba(255,255,255,0.25)",
              background: "rgba(0,0,0,0.25)",
              backdropFilter: "blur(4px)",
              color: "#e6eef5",
              fontSize: 16,
              fontWeight: 700,
              textAlign: "center",
              maxWidth: 520,
              lineHeight: 1.35,
              boxShadow: "0 10px 26px rgba(0,0,0,.35)",
            }}
          >
            {message ?? "AI chat is under development. Coming soon ✨"}
          </div>
        </div>
      )}
    </div>
  );
}
