"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { setTheme } from "@/lib/theme/cookie";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ initial }: { initial: "light" | "dark" }) {
  const [theme, setLocal] = useState<"light" | "dark">(initial);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setLocal(next);
    document.documentElement.dataset.theme = next;
    startTransition(() => {
      void setTheme(next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "relative grid h-9 w-9 place-items-center rounded-full",
        "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
        "border border-[var(--color-line)] bg-[var(--color-flour)]/40",
        "transition-colors"
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -60, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 60, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0.16, 1] }}
          className="grid place-items-center"
        >
          {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
