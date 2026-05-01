"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  side?: "right" | "bottom";
  children: React.ReactNode;
};

export function Sheet({ open, onClose, title, eyebrow, side = "right", children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[var(--color-char)]/65 backdrop-blur-sm"
          />
          <motion.aside
            initial={
              side === "right"
                ? { x: "100%", opacity: 0.6 }
                : { y: "100%", opacity: 0.6 }
            }
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={
              side === "right"
                ? { x: "100%", opacity: 0 }
                : { y: "100%", opacity: 0 }
            }
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className={cn(
              "fixed z-50 bg-[var(--color-flour)] border-[var(--color-line)] shadow-[var(--shadow-oven)]",
              side === "right"
                ? "top-0 right-0 h-full w-full max-w-md border-l rounded-l-[var(--radius-loaf)]"
                : "bottom-0 left-0 right-0 max-h-[85vh] border-t rounded-t-[var(--radius-loaf)]",
            )}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <header className="flex items-start justify-between gap-4 px-7 pt-7 pb-4">
              <div>
                {eyebrow && (
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-1.5">
                    {eyebrow}
                  </div>
                )}
                {title && (
                  <h2 className="font-display text-2xl text-[var(--color-ink)]">{title}</h2>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-ink-muted)] hover:bg-[var(--color-flour-soft)] hover:text-[var(--color-ink)] transition-colors"
              >
                <X size={16} />
              </button>
            </header>
            <div className="px-7 pb-7 overflow-y-auto h-[calc(100%-5rem)]">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
