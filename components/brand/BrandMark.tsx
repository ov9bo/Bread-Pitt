"use client";

import { motion } from "framer-motion";

type Props = {
  size?: number;
  className?: string;
  /** Disable the looping steam wisps. Useful for very small contexts. */
  quiet?: boolean;
};

/**
 * The brand mark — a tiny sourdough boule with a single diagonal score
 * (the baker's "ear") and one rising steam wisp. The score draws itself
 * once on mount; the steam loops at low opacity. Hover lifts the loaf
 * by a hair. Pure inline SVG, palette-token driven.
 */
export function BrandMark({ size = 28, className, quiet = false }: Props) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
    >
      <defs>
        <linearGradient id="bm-crust" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-crust)" />
          <stop offset="100%" stopColor="var(--color-crust-soft)" />
        </linearGradient>
        <radialGradient id="bm-shine" cx="0.32" cy="0.28" r="0.55">
          <stop offset="0%" stopColor="white" stopOpacity="0.28" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Steam wisp — rises and fades on a slow loop */}
      {!quiet && (
        <motion.path
          d="M16 6 C 14.5 4.5, 17.5 3.5, 16 2"
          stroke="var(--color-ink-muted)"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: [0, 0.55, 0], y: [2, -4, -6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Loaf body — half-dome boule */}
      <path
        d="M5 22 C 5 13, 11 8, 16 8 C 21 8, 27 13, 27 22 L 27 24 C 27 25.1, 26.1 26, 25 26 L 7 26 C 5.9 26, 5 25.1, 5 24 Z"
        fill="url(#bm-crust)"
        stroke="var(--color-line)"
        strokeWidth="0.75"
      />

      {/* Surface shine */}
      <path
        d="M5 22 C 5 13, 11 8, 16 8 C 21 8, 27 13, 27 22 L 27 24 C 27 25.1, 26.1 26, 25 26 L 7 26 C 5.9 26, 5 25.1, 5 24 Z"
        fill="url(#bm-shine)"
      />

      {/* Score — the baker's ear, draws on mount */}
      <motion.path
        d="M10 18 C 14 14, 19 14, 23 17"
        stroke="var(--color-butter)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: [0.32, 0.72, 0.16, 1], delay: 0.15 }}
      />

      {/* Base shadow */}
      <ellipse cx="16" cy="27" rx="10" ry="0.9" fill="var(--color-char)" opacity="0.35" />
    </motion.svg>
  );
}
