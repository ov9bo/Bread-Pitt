"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { BrandMark } from "./BrandMark";
import { cn } from "@/lib/utils/cn";

type Size = "sm" | "md" | "lg";

type Props = {
  size?: Size;
  withMark?: boolean;
  /** If provided, renders as a Next <Link>. Otherwise, a <span>. */
  href?: string;
  className?: string;
};

const sizeMap: Record<
  Size,
  { text: string; mark: number; gap: string; tracking: string; underlineY: number }
> = {
  sm: { text: "text-lg", mark: 26, gap: "gap-2.5", tracking: "tracking-tight", underlineY: 2 },
  md: { text: "text-2xl", mark: 32, gap: "gap-3", tracking: "tracking-tight", underlineY: 3 },
  lg: { text: "text-5xl", mark: 56, gap: "gap-4", tracking: "tracking-tighter", underlineY: 5 },
};

/**
 * The wordmark lockup: optional BrandMark + "Bread" (upright Fraunces)
 * + italic, expressively-axis'd "Pitt", with a hand-drawn score-line
 * underline that draws on mount and re-draws on hover.
 */
export function Wordmark({ size = "sm", withMark = true, href, className }: Props) {
  const cfg = sizeMap[size];
  const [hoverKey, setHoverKey] = useState(0);

  const inner = (
    <span
      className={cn(
        "relative inline-flex items-center group",
        cfg.gap,
        size === "lg" && "py-1",
      )}
      onMouseEnter={() => setHoverKey((k) => k + 1)}
    >
      {withMark && <BrandMark size={cfg.mark} />}

      <span className="relative inline-block leading-none">
        <span
          className={cn(
            "font-display font-medium text-[var(--color-ink)]",
            cfg.text,
            cfg.tracking,
            size === "lg" && "[text-shadow:0_1px_24px_color-mix(in_oklab,var(--color-crust)_28%,transparent)]",
          )}
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 0' }}
        >
          Bread
        </span>
        <span
          className={cn(
            "font-display italic text-[var(--color-crust)] ml-[0.18em] transition-colors",
            cfg.text,
            cfg.tracking,
            "group-hover:text-[var(--color-butter)]",
          )}
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}
        >
          Pitt
        </span>

        {/* Score-line underline — sits below the wordmark, draws on mount + hover */}
        <motion.svg
          key={hoverKey}
          viewBox="0 0 200 8"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute left-0 right-0 -bottom-[0.18em] h-[0.32em] w-full overflow-visible pointer-events-none"
        >
          <motion.path
            d="M2 5 C 40 1, 90 7, 140 3 S 196 5, 198 4"
            stroke="var(--color-crust)"
            strokeOpacity="0.7"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.32, 0.72, 0.16, 1], delay: 0.2 }}
          />
        </motion.svg>
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={cn("inline-flex items-center pl-2 pr-3", className)}>
        {inner}
      </Link>
    );
  }
  return <span className={cn("inline-flex items-center", className)}>{inner}</span>;
}
