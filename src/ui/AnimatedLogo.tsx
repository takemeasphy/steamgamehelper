import React from "react";

type Props = { size?: number };

export default function AnimatedLogo({ size = 86 }: Props) {
  const w = size;
  const h = size;
  const cx = w / 2;
  const cy = h / 2;

  // Пропорції
  const planetR = size * 0.30;
  const ringRx  = size * 0.34;
  const ringRy  = size * 0.13; // трохи пласкіше, щоб нахил читався
  const ringStroke = Math.max(2.5, Math.round(size * 0.06));
  const angle = 30; // ← менший нахил кільця (~30°)

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="SteamGameHelper logo"
      style={{ display: "block" }}
    >
      <defs>
        {/* Планета */}
        <radialGradient id="gPlanet" cx="35%" cy="35%" r="75%">
          <stop offset="0%"   stopColor="#2a69a6" />
          <stop offset="60%"  stopColor="#1b4e7e" />
          <stop offset="100%" stopColor="#143b61" />
        </radialGradient>

        {/* Текстура */}
        <pattern id="pNoise" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="4" r="1.6" fill="#2c5a89" opacity="0.45" />
          <circle cx="8" cy="7" r="1.2" fill="#2c5a89" opacity="0.38" />
          <circle cx="5" cy="9" r="0.9" fill="#2c5a89" opacity="0.36" />
        </pattern>

        {/* Glow */}
        <filter id="fGlow">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ВАЖЛИВО: повертаємо САМИЙ шлях еліпса */}
        <ellipse
          id="ringPath"
          cx={cx}
          cy={cy}
          rx={ringRx}
          ry={ringRy}
          pathLength={1}
          transform={`rotate(${angle} ${cx} ${cy})`}
        />

        <style>{`
          .ringPulse {
            transform-box: fill-box;
            transform-origin: ${cx}px ${cy}px;
            animation: ringPulse 2.8s ease-in-out infinite;
          }
          @keyframes ringPulse {
            0%,100% { transform: scale(1); opacity:.96; }
            50%     { transform: scale(1.02); opacity:1; }
          }

          .star {
            transform-origin: center;
            animation: twinkle 1.9s ease-in-out infinite;
          }
          .star:nth-child(2){ animation-delay:.35s; }
          .star:nth-child(3){ animation-delay:.9s; }
          @keyframes twinkle {
            0%,100% { transform: scale(.9); opacity:.75; }
            50%     { transform: scale(1.15); opacity:1; }
          }
        `}</style>
      </defs>

      {/* Підсвітка */}
      <g opacity={0.35}>
        <circle cx={cx} cy={cy} r={size * 0.46} fill="#0b2036" />
      </g>

      {/* === ЗАДНЯ половина кільця (під планетою) === */}
      <g className="ringPulse">
        {/* glow задньої півдуги */}
        <use
          href="#ringPath"
          stroke="rgba(120,198,255,.32)"
          strokeWidth={ringStroke + 2}
          fill="none"
          filter="url(#fGlow)"
          strokeLinecap="round"
          strokeDasharray="0.5 0.5"
          strokeDashoffset="0.5"
        />
        {/* основний штрих задньої півдуги */}
        <use
          href="#ringPath"
          stroke="rgba(122,197,255,.70)"
          strokeWidth={ringStroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="0.5 0.5"
          strokeDashoffset="0.5"
        />
      </g>

      {/* ПЛАНЕТА — природний «оклюдер» */}
      <g>
        <circle cx={cx} cy={cy} r={planetR} fill="url(#gPlanet)" />
        <circle cx={cx} cy={cy} r={planetR} fill="url(#pNoise)" opacity={0.35} />
      </g>

      {/* === ПЕРЕДНЯ половина кільця (над планетою) === */}
      <g className="ringPulse">
        {/* glow передньої півдуги */}
        <use
          href="#ringPath"
          stroke="rgba(160,220,255,.55)"
          strokeWidth={ringStroke + 2}
          fill="none"
          filter="url(#fGlow)"
          strokeLinecap="round"
          strokeDasharray="0.5 0.5"
          strokeDashoffset="0"
        />
        {/* основний штрих передньої півдуги */}
        <use
          href="#ringPath"
          stroke="rgba(170,230,255,.96)"
          strokeWidth={ringStroke - 1}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="0.5 0.5"
          strokeDashoffset="0"
        />
      </g>

      {/* Зірочки */}
      <g fill="#a6d7ff">
        <circle className="star" cx={w * 0.18} cy={h * 0.18} r={1.6} opacity={0.9} />
        <circle className="star" cx={w * 0.85} cy={h * 0.26} r={1.4} opacity={0.85} />
        <circle className="star" cx={w * 0.22} cy={h * 0.78} r={1.4} opacity={0.8} />
      </g>
    </svg>
  );
}
