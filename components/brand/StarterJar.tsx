"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

type Props = {
  /** 1..14 during a build; null = no active starter (sleeping jar). */
  dayIndex: number | null;
  /** Optional name etched into the label. */
  nickname?: string;
  /** Optional subtitle line under the name. */
  caption?: string;
  className?: string;
};

/**
 * The signature illustration. Bubble density, rise level, and surface
 * activity all derive from `dayIndex`, so the jar literally reflects
 * the user's starter on this exact day. Pure inline SVG — no Lottie
 * payload to download, no FOUC, perfect for the dashboard hero.
 *
 * Day 1   → barely awake, almost-flat surface, one timid bubble
 * Day 7   → noticeably alive, gentle dome, regular bubbles
 * Day 14  → vigorous, doubled, foam-rich, climbing the wall
 */
export function StarterJar({ dayIndex, nickname, caption, className }: Props) {
  const day = dayIndex ?? 0;
  const t = Math.max(0, Math.min(1, day / 14));

  // Rise level — surface y-position. Jar interior runs y∈[60..210].
  const surfaceY = 210 - 90 * t;

  // Dome curvature — flat at start, plump at peak.
  const dome = 6 + 24 * t;

  // Bubble plan — count grows with t, sizes spread.
  const bubbles = useMemo(() => {
    const count = Math.round(2 + t * 16);
    return Array.from({ length: count }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const r = (seed / 233280) * 1;
      return {
        id: i,
        cx: 75 + r * 110,
        size: 2 + (((seed * 7) % 9) / 9) * (3 + 4 * t),
        delay: (i / count) * 4 + r * 1.5,
        duration: 3.5 + r * 2.5,
      };
    });
  }, [t]);

  const status =
    day === 0
      ? "Sleeping"
      : day < 4
        ? "Waking up"
        : day < 7
          ? "Stretching"
          : day < 11
            ? "Lively"
            : "Mature";

  return (
    <figure className={className}>
      <svg
        viewBox="0 0 250 320"
        className="block w-full"
        aria-label={`Starter jar visualization, day ${day} of 14`}
      >
        <defs>
          <linearGradient id="jarGlass" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--color-flour)" stopOpacity="0.85" />
            <stop offset="50%" stopColor="var(--color-flour-soft)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--color-flour)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="dough" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-butter)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--color-crust-soft)" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="shine" cx="0.3" cy="0.25" r="0.6">
            <stop offset="0%" stopColor="white" stopOpacity="0.18" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <clipPath id="jarInside">
            <rect x="55" y="58" width="140" height="200" rx="14" />
          </clipPath>
        </defs>

        {/* Lid */}
        <g>
          <rect x="60" y="20" width="130" height="22" rx="6" fill="var(--color-hooch)" />
          <rect x="65" y="22" width="120" height="6" rx="3" fill="var(--color-char)" opacity="0.35" />
          <rect x="55" y="40" width="140" height="22" rx="4" fill="var(--color-flour-soft)" />
          <rect x="55" y="40" width="140" height="3" fill="var(--color-char)" opacity="0.18" />
        </g>

        {/* Jar body */}
        <rect
          x="50"
          y="58"
          width="150"
          height="240"
          rx="18"
          fill="url(#jarGlass)"
          stroke="var(--color-line)"
          strokeWidth="1.5"
        />

        {/* Inside — clipped */}
        <g clipPath="url(#jarInside)">
          {/* Starter body */}
          <motion.path
            d={`M55 ${surfaceY + dome} Q125 ${surfaceY - dome} 195 ${surfaceY + dome} L195 260 L55 260 Z`}
            fill="url(#dough)"
            initial={false}
            animate={{
              d: [
                `M55 ${surfaceY + dome} Q125 ${surfaceY - dome} 195 ${surfaceY + dome} L195 260 L55 260 Z`,
                `M55 ${surfaceY + dome - 2} Q125 ${surfaceY - dome - 3} 195 ${surfaceY + dome - 2} L195 260 L55 260 Z`,
                `M55 ${surfaceY + dome} Q125 ${surfaceY - dome} 195 ${surfaceY + dome} L195 260 L55 260 Z`,
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: [0.32, 0.72, 0.16, 1] }}
          />

          {/* Bubbles */}
          {bubbles.map((b) => (
            <motion.circle
              key={b.id}
              cx={b.cx}
              cy={surfaceY + 30}
              r={b.size}
              fill="var(--color-flour)"
              opacity={0.55}
              animate={{
                cy: [surfaceY + 30, surfaceY - 4],
                opacity: [0, 0.65, 0],
                scale: [0.6, 1.05, 1.1],
              }}
              transition={{
                duration: b.duration,
                delay: b.delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Surface highlight */}
          <ellipse
            cx="125"
            cy={surfaceY + 4}
            rx="55"
            ry="3"
            fill="white"
            opacity="0.18"
          />
        </g>

        {/* Glass shine */}
        <rect x="50" y="58" width="150" height="240" rx="18" fill="url(#shine)" />

        {/* Label */}
        <g transform="translate(70, 178)">
          <rect width="110" height="56" rx="3" fill="var(--color-flour)" stroke="var(--color-line)" strokeWidth="0.75" />
          <text
            x="55"
            y="22"
            textAnchor="middle"
            fontFamily="var(--font-display)"
            fontSize="12"
            fontStyle="italic"
            fill="var(--color-ink)"
          >
            {nickname ?? "Crustopher"}
          </text>
          <line x1="14" y1="28" x2="96" y2="28" stroke="var(--color-line)" strokeWidth="0.5" />
          <text
            x="55"
            y="42"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="9"
            letterSpacing="2"
            fill="var(--color-ink-muted)"
          >
            DAY {String(day).padStart(2, "0")} / 14
          </text>
        </g>

        {/* Base shadow */}
        <ellipse cx="125" cy="304" rx="80" ry="6" fill="var(--color-char)" opacity="0.35" />
      </svg>

      {(status || caption) && (
        <figcaption className="mt-4 text-center">
          <div className="font-display text-lg italic text-[var(--color-ink-muted)]">
            {status}
          </div>
          {caption && (
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
              {caption}
            </div>
          )}
        </figcaption>
      )}
    </figure>
  );
}
