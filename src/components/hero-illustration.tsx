import { useId } from "react";
import { cn } from "@/lib/utils";

export function HeroPattern({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={cn("absolute inset-0 h-full w-full", className)}
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id={`${id}-geo`} width="64" height="64" patternUnits="userSpaceOnUse">
          <path
            d="M32 0L35.5 24.5L60 32L35.5 39.5L32 64L28.5 39.5L4 32L28.5 24.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            opacity="0.5"
          />
          <circle cx="32" cy="32" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
          <path
            d="M0 32H64M32 0V64"
            stroke="currentColor"
            strokeWidth="0.4"
            opacity="0.25"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id}-geo)`} />
    </svg>
  );
}

export function HeroIllustration({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");

  // 8-point Rub el Hizb star (alternating long r=72, short r=32)
  const starPoints = [
    [0, -72],
    [12.24, -29.58],
    [50.91, -50.91],
    [29.58, -12.24],
    [72, 0],
    [29.58, 12.24],
    [50.91, 50.91],
    [12.24, 29.58],
    [0, 72],
    [-12.24, 29.58],
    [-50.91, 50.91],
    [-29.58, 12.24],
    [-72, 0],
    [-29.58, -12.24],
    [-50.91, -50.91],
    [-12.24, -29.58],
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox="0 0 440 520"
      className={cn("w-full max-w-lg", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-archFill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Soft glow behind the arch */}
      <circle cx="220" cy="260" r="170" fill="var(--secondary)" opacity="0.10" />

      {/* Outer arch frame */}
      <path
        d="M60 520 L60 200 C60 100 140 40 220 40 C300 40 380 100 380 200 L380 520"
        fill="none"
        stroke="var(--secondary)"
        strokeWidth="2.5"
        opacity="0.65"
      />

      {/* Inner arch fill */}
      <path
        d="M95 520 L95 220 C95 135 150 85 220 85 C290 85 345 135 345 220 L345 520"
        fill={`url(#${id}-archFill)`}
        stroke="var(--secondary)"
        strokeWidth="1.5"
        opacity="0.9"
      />

      {/* Central Rub el Hizb star */}
      <g transform="translate(220, 220)" opacity="0.9">
        <polygon points={starPoints} fill="var(--secondary)" />
        <circle r="12" fill="var(--primary)" opacity="0.35" />
      </g>

      {/* Decorative horizontal lines inside the arch */}
      <line x1="150" y1="355" x2="290" y2="355" stroke="var(--secondary)" strokeWidth="1.5" opacity="0.45" />
      <line x1="170" y1="385" x2="270" y2="385" stroke="var(--secondary)" strokeWidth="1.5" opacity="0.45" />
      <line x1="190" y1="415" x2="250" y2="415" stroke="var(--secondary)" strokeWidth="1.5" opacity="0.45" />

      {/* Corner ornaments */}
      <circle cx="60" cy="200" r="5" fill="var(--secondary)" opacity="0.7" />
      <circle cx="380" cy="200" r="5" fill="var(--secondary)" opacity="0.7" />
    </svg>
  );
}
