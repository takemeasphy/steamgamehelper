import React, { useEffect, useRef, useState } from "react";
import AnimatedLogo from "../AnimatedLogo";

type Props = { onContinue?: () => void };

export default function Splash({ onContinue }: Props) {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onPointer = () => {
      if (fade || !visible) return;
      setFade(true);
      setTimeout(() => {
        setVisible(false);
        onContinue?.();
      }, 350);
    };
    el.addEventListener("pointerdown", onPointer, { passive: true });
    return () => el.removeEventListener("pointerdown", onPointer);
  }, [fade, visible, onContinue]);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(1100px 600px at 60% 10%, #0e1a2e 0%, #0a1524 45%, #091522 70%, #08121c 100%)",
        transition: "opacity .32s ease",
        opacity: fade ? 0 : 1,
        userSelect: "none",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          transform: fade ? "translateY(6px) scale(.995)" : "translateY(0) scale(1)",
          transition: "transform .32s ease",
        }}
      >
        <div
          style={{
            width: 86,
            height: 86,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 18px 60px rgba(22,142,255,.25)",
          }}
        >
          <AnimatedLogo size={86} />
        </div>

        <div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: ".3px",
              color: "#e6f2ff",
              textShadow:
                "0 0 18px rgba(120,200,255,.35), 0 2px 0 rgba(0,0,0,.25), 0 0 1px rgba(0,0,0,.8)",
            }}
          >
            SteamGameHelper
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 14,
              color: "#b7c6d9",
              textShadow: "0 1px 0 rgba(0,0,0,.35)",
              opacity: 0.95,
            }}
          >
            library tools • web api • family
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 22,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "#9fb0c4",
          fontSize: 12,
          letterSpacing: ".2px",
          opacity: 0.85,
          textShadow: "0 1px 0 rgba(0,0,0,.35)",
        }}
      >
        натисни будь-де, щоб продовжити
      </div>
    </div>
  );
}
