"use client";

import { motion } from "framer-motion";

export function DiscardJar({
  grams,
  cap = 1000,
  label,
}: {
  grams: number;
  cap?: number;
  label?: string;
}) {
  const t = Math.max(0, Math.min(1, grams / cap));
  // Visual fill: leave headspace at the top so the jar doesn't look full at cap.
  const fillHeight = t * 0.78;

  return (
    <div className="flex flex-col items-center select-none">
      <svg
        viewBox="0 0 200 240"
        className="w-full max-w-[200px] h-auto"
        aria-label={`Discard jar at ${Math.round(grams)} grams`}
      >
        <defs>
          <linearGradient id="jar-glass" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--color-line)" stopOpacity="0.4" />
            <stop offset="50%" stopColor="var(--color-flour)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-line)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="jar-discard" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-butter)" stopOpacity="0.85" />
            <stop offset="60%" stopColor="var(--color-crust)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--color-crust-soft)" stopOpacity="0.95" />
          </linearGradient>
          <clipPath id="jar-interior">
            <rect x="38" y="68" width="124" height="138" rx="10" />
          </clipPath>
        </defs>

        {/* Lid */}
        <rect
          x="48"
          y="36"
          width="104"
          height="20"
          rx="3"
          fill="var(--color-flour-soft)"
          stroke="var(--color-line)"
          strokeWidth="1"
        />
        {/* Lid threads */}
        <line x1="50" y1="44" x2="150" y2="44" stroke="var(--color-line)" strokeWidth="0.6" opacity="0.6" />

        {/* Jar body */}
        <rect
          x="36"
          y="58"
          width="128"
          height="160"
          rx="14"
          fill="url(#jar-glass)"
          stroke="var(--color-line)"
          strokeWidth="1.5"
        />

        {/* Discard fill — animated */}
        <g clipPath="url(#jar-interior)">
          <motion.rect
            x="38"
            width="124"
            fill="url(#jar-discard)"
            initial={false}
            animate={{
              y: 206 - fillHeight * 138,
              height: fillHeight * 138,
            }}
            transition={{ type: "spring", damping: 20, stiffness: 110 }}
          />
          {/* Surface meniscus highlight */}
          <motion.line
            x1="38"
            x2="162"
            stroke="var(--color-butter)"
            strokeWidth="1.2"
            strokeOpacity="0.45"
            initial={false}
            animate={{
              y1: 206 - fillHeight * 138 + 1,
              y2: 206 - fillHeight * 138 + 1,
            }}
            transition={{ type: "spring", damping: 20, stiffness: 110 }}
          />
        </g>

        {/* Glass reflections */}
        <line
          x1="46"
          y1="72"
          x2="46"
          y2="200"
          stroke="var(--color-ink)"
          strokeWidth="1.5"
          strokeOpacity="0.06"
        />
        <line
          x1="154"
          y1="80"
          x2="154"
          y2="180"
          stroke="var(--color-ink)"
          strokeWidth="0.8"
          strokeOpacity="0.04"
        />

        {/* Tick marks */}
        {[0.25, 0.5, 0.75].map((p) => {
          const y = 206 - p * 138;
          return (
            <g key={p}>
              <line
                x1="36"
                y1={y}
                x2="42"
                y2={y}
                stroke="var(--color-ink-faint)"
                strokeWidth="0.6"
                opacity="0.5"
              />
              <text
                x="32"
                y={y + 3}
                fontSize="7"
                textAnchor="end"
                fill="var(--color-ink-faint)"
                fontFamily="var(--font-mono)"
                opacity="0.7"
              >
                {Math.round(p * cap)}
              </text>
            </g>
          );
        })}
      </svg>
      {label && (
        <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
          {label}
        </div>
      )}
    </div>
  );
}
