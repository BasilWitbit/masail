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
  return (
    <svg
      viewBox="0 0 440 520"
      className={cn("w-full max-w-md", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-archFill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Soft glow behind the arch */}
      <circle cx="220" cy="260" r="170" fill="var(--secondary)" opacity="0.08" />

      {/* Outer arch frame */}
      <path
        d="M60 520 L60 200 C60 100 140 40 220 40 C300 40 380 100 380 200 L380 520"
        fill="none"
        stroke="var(--secondary)"
        strokeWidth="2"
        opacity="0.45"
      />

      {/* Inner arch fill */}
      <path
        d="M95 520 L95 220 C95 135 150 85 220 85 C290 85 345 135 345 220 L345 520"
        fill={`url(#${id}-archFill)`}
        stroke="var(--secondary)"
        strokeWidth="1.5"
        opacity="0.8"
      />

      {/* Central Rub el Hizb star */}
      <g transform="translate(220, 220)" fill="var(--secondary)" opacity="0.85">
        <path d="M0 -72 L14 -22 L66 -10 L26 26 L42 78 L0 48 L-42 78 L-26 26 L-66 -10 L-14 -22 Z" />
        <circle r="10" opacity="0.4" />
      </g>

      {/* Decorative horizontal lines inside the arch */}
      <line x1="150" y1="360" x2="290" y2="360" stroke="var(--secondary)" strokeWidth="1" opacity="0.3" />
      <line x1="170" y1="390" x2="270" y2="390" stroke="var(--secondary)" strokeWidth="1" opacity="0.3" />
      <line x1="190" y1="420" x2="250" y2="420" stroke="var(--secondary)" strokeWidth="1" opacity="0.3" />

      {/* Corner ornaments */}
      <circle cx="60" cy="200" r="4" fill="var(--secondary)" opacity="0.5" />
      <circle cx="380" cy="200" r="4" fill="var(--secondary)" opacity="0.5" />
    </svg>
  );
}
