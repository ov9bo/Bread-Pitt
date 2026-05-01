"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, BookOpen, FlaskConical, Wheat, Recycle, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/", label: "Today", icon: Home },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/processes", label: "Processes", icon: FlaskConical },
  { href: "/library", label: "Library", icon: Wheat },
  { href: "/discard", label: "Discard", icon: Recycle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav({ theme }: { theme: "light" | "dark" }) {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 md:px-8 md:pt-6">
      <nav
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between gap-4",
          "rounded-full border border-[var(--color-line)] bg-[var(--color-flour)]/75 backdrop-blur-md",
          "px-3 py-2 shadow-[var(--shadow-flour)]",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 pl-2 pr-4 group">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-crust)] text-[var(--color-char)] font-display font-bold text-sm shadow-inner">
            C
          </span>
          <span className="font-display text-lg italic tracking-tight text-[var(--color-ink)] group-hover:text-[var(--color-crust)] transition-colors">
            Crustopher
          </span>
        </Link>

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
      </ul>
    </header>
  );
}
