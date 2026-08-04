import { useId } from "react";
import { cn } from "@/lib/utils";

/** Faint star-and-polygon Islamic linework, used as a watermark texture. */
function GeoPatternDefs({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="80" height="80" patternUnits="userSpaceOnUse">
        {/* 8-point star outline */}
        <path
          d="M40 4 L48 22 L66 14 L58 32 L76 40 L58 48 L66 66 L48 58 L40 76 L32 58 L14 66 L22 48 L4 40 L22 32 L14 14 L32 22 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        {/* interlacing polygons */}
        <path d="M40 22 L58 40 L40 58 L22 40 Z" fill="none" stroke="currentColor" strokeWidth="0.9" />
        <path d="M0 0 L14 14 M80 0 L66 14 M0 80 L14 66 M80 80 L66 66" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="40" cy="40" r="6" fill="none" stroke="currentColor" strokeWidth="0.8" />
      </pattern>
    </defs>
  );
}

/** Full-bleed background texture for the hero (kept extremely subtle). */
export function HeroPattern({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={cn("absolute inset-0 h-full w-full", className)}
      aria-hidden
      preserveAspectRatio="none"
    >
      <GeoPatternDefs id={`${id}-geo`} />
      <rect width="100%" height="100%" fill={`url(#${id}-geo)`} />
    </svg>
  );
}

/**
 * Mihrab / pointed-arch silhouette that spans the full height of the hero on the
 * right-hand side, embossed with soft geometric linework and a gold tip accent.
 */
export function HeroIllustration({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");

  // Ogee-style pointed arch: springs from the baseline, curves in, peaks at top center.
  const arch =
    "M190 820 L190 470 C190 300 258 225 340 150 C376 118 398 105 410 84 C422 105 444 118 480 150 C562 225 630 300 630 470 L630 820 Z";

  return (
    <svg
      viewBox="0 0 720 820"
      preserveAspectRatio="xMidYMax slice"
      className={cn("h-full w-full", className)}
      aria-hidden
    >
      <GeoPatternDefs id={`${id}-geo`} />
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={arch} />
        </clipPath>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="35%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </linearGradient>
        <mask id={`${id}-mask`}>
          <rect width="720" height="820" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>

      <g mask={`url(#${id}-mask)`}>
        {/* Surrounding wall texture */}
        <g className="text-secondary" opacity="0.16">
          <rect width="720" height="820" fill={`url(#${id}-geo)`} />
        </g>

        {/* Arch panel: slightly lighter cream inset with its own denser texture */}
        <g clipPath={`url(#${id}-clip)`}>
          <path d={arch} fill="var(--background)" opacity="0.75" />
          <g className="text-secondary" opacity="0.22">
            <rect width="720" height="820" fill={`url(#${id}-geo)`} />
          </g>
        </g>

        {/* Arch outline / embossed edge */}
        <path d={arch} fill="none" stroke="var(--secondary)" strokeWidth="3" opacity="0.28" />
        <path
          d="M226 820 L226 474 C226 316 288 246 362 176 C390 150 402 138 410 122 C418 138 430 150 458 176 C532 246 594 316 594 474 L594 820"
          fill="none"
          stroke="var(--secondary)"
          strokeWidth="1.4"
          opacity="0.2"
        />

        {/* Gold accent at the very tip of the arch */}
        <path d="M410 66 L417 88 L410 108 L403 88 Z" fill="var(--secondary)" opacity="0.85" />
        <circle cx="410" cy="124" r="3.5" fill="var(--secondary)" opacity="0.6" />
      </g>
    </svg>
  );
}
