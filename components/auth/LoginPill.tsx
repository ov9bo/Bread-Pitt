"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2",
};

const iconSize: Record<Size, number> = { sm: 12, md: 14, lg: 16 };

export function LoginPill({
  label = "Log in to use",
  size = "sm",
  className,
}: {
  label?: string;
  size?: Size;
  className?: string;
}) {
  return (
    <Link
      href="/login"
      className={cn(
        "inline-flex items-center justify-center rounded-full font-sans font-medium",
        "border border-[var(--color-line)] bg-[var(--color-flour)]/40",
        "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-crust)]/40",
        "transition-colors",
        sizes[size],
        className,
      )}
      aria-label={label}
    >
      <Lock size={iconSize[size]} />
      <span>{label}</span>
    </Link>
  );
}
