"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, BookOpen, FlaskConical, Wheat, Recycle, Settings, LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils/cn";

const allItems = [
  { href: "/", label: "Today", icon: Home, ownerOnly: false },
  { href: "/journal", label: "Journal", icon: BookOpen, ownerOnly: false },
  { href: "/processes", label: "Processes", icon: FlaskConical, ownerOnly: false },
  { href: "/library", label: "Library", icon: Wheat, ownerOnly: false },
  { href: "/discard", label: "Discard", icon: Recycle, ownerOnly: false },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

export function Nav({ theme, isOwner }: { theme: "light" | "dark"; isOwner: boolean }) {
  const path = usePathname();
  const items = allItems.filter((item) => !item.ownerOnly || isOwner);

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 md:px-8 md:pt-6">
      <nav
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between gap-4",
          "rounded-full border border-[var(--color-line)] bg-[var(--color-flour)]/75 backdrop-blur-md",
          "px-3 py-2 shadow-[var(--shadow-flour)]",
        )}
      >
        <Wordmark href="/" size="sm" />

        <ul className="hidden md:flex items-center gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <li key={href} className="relative">
                <Link
                  href={href}
                  className={cn(
                    "relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-colors",
                    active
                      ? "text-[var(--color-ink)]"
                      : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-[var(--color-crust)]/15 border border-[var(--color-crust)]/30"
                      transition={{ type: "spring", damping: 22, stiffness: 280 }}
                    />
                  )}
                  <Icon size={14} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1.5 pr-1">
          {!isOwner && (
            <Link
              href="/login"
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-flour)]/40 px-3 py-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-crust)]/40 transition-colors"
            >
              <LogIn size={12} />
              <span>Log in</span>
            </Link>
          )}
          <ThemeToggle initial={theme} />
        </div>
      </nav>

      {/* mobile rail */}
      <ul className="md:hidden mx-auto mt-3 flex max-w-6xl items-center justify-between gap-1 overflow-x-auto rounded-full border border-[var(--color-line)] bg-[var(--color-flour)]/75 backdrop-blur-md px-2 py-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px]",
                  active
                    ? "bg-[var(--color-crust)]/15 text-[var(--color-ink)]"
                    : "text-[var(--color-ink-muted)]",
                )}
              >
                <Icon size={14} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
        {!isOwner && (
          <li>
            <Link
              href="/login"
              className="flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] text-[var(--color-ink-muted)]"
            >
              <LogIn size={14} />
              <span>Log in</span>
            </Link>
          </li>
        )}
      </ul>
    </header>
  );
}
