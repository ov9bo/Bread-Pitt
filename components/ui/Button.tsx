"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = Omit<HTMLMotionProps<"button">, "size"> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans font-medium " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-[var(--color-crust)] focus-visible:ring-offset-[var(--color-crumb)] " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-crust)] text-[var(--color-char)] hover:bg-[var(--color-butter)] " +
    "shadow-[var(--shadow-flour)]",
  secondary:
    "bg-[var(--color-flour)] text-[var(--color-ink)] hover:bg-[var(--color-flour-soft)] " +
    "border border-[var(--color-line)]",
  ghost:
    "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-flour)]/50",
  danger:
    "bg-[var(--color-char)] text-[var(--color-ink)] hover:bg-[var(--color-flour-soft)] " +
    "border border-[var(--color-line)]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", children, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0.16, 1] }}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
