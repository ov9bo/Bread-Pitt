"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import { Check } from "lucide-react";
import { EQUIPMENT_CHECKLIST_ITEMS } from "@/lib/library/equipment-checklist-data";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

const STORAGE_PREFIX = "bread-pitt:equipment-checklist:v1:";

function storageKey(sectionSlug: string): string {
  return `${STORAGE_PREFIX}${sectionSlug}`;
}

function parseStored(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

type Props = { sectionSlug: string };

export function EquipmentChecklist({ sectionSlug }: Props) {
  const reduceMotion = useReducedMotion();
  const key = useMemo(() => storageKey(sectionSlug), [sectionSlug]);
  const skipNextPersist = useRef(true);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    skipNextPersist.current = true;
    setCheckedIds(parseStored(localStorage.getItem(key)));
  }, [key]);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    const arr = Array.from(checkedIds);
    arr.sort();
    localStorage.setItem(key, JSON.stringify(arr));
  }, [checkedIds, key]);

  const total = EQUIPMENT_CHECKLIST_ITEMS.length;
  const packed = checkedIds.size;
  const rowTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.45, ease: [0.32, 0.72, 0.16, 1] };

  const listVariants: Variants = {
    hidden: {},
    visible: {
      transition: reduceMotion ? { staggerChildren: 0 } : { staggerChildren: 0.035, delayChildren: 0.06 },
    },
  };

  const rowVariants: Variants = {
    hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    visible: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 },
  };

  function toggle(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    skipNextPersist.current = false;
    setCheckedIds(new Set());
  }

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={rowTransition}
      className="not-prose mt-10 prose-column mx-auto max-w-[68ch]"
      aria-labelledby="equipment-checklist-heading"
    >
      <Card tone="crust" className="p-6 md:p-7 rounded-[var(--radius-loaf)]">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--color-line-soft)] pb-4 mb-5">
          <div>
            <div
              id="equipment-checklist-heading"
              className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-crust-soft)] mb-2"
            >
              Your bake bench
            </div>
            <p className="text-sm text-[var(--color-ink-muted)] text-pretty max-w-[34ch]">
              Tick what&apos;s gathered—your list is saved on this device.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
              Packed{" "}
              <span className="text-[var(--color-crust)] tabular-nums">
                {packed}/{total}
              </span>
            </span>
            <div className="h-1 w-28 rounded-full bg-[var(--color-line)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-crust)] to-[var(--color-butter)] origin-left"
                initial={false}
                animate={{ scaleX: total ? packed / total : 0 }}
                transition={rowTransition}
              />
            </div>
          </div>
        </div>

        <motion.ul
          className="space-y-0 list-none pl-0 m-0"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          {EQUIPMENT_CHECKLIST_ITEMS.map((item) => {
            const checked = checkedIds.has(item.id);
            return (
              <motion.li key={item.id} variants={rowVariants} transition={rowTransition}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "group w-full flex items-start gap-3 text-left rounded-2xl -mx-1 px-2 py-2.5 md:py-3",
                    "border border-transparent",
                    "hover:bg-[color-mix(in_oklab,var(--color-crust)_6%,transparent)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-crust)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-crumb)]",
                    "transition-[background-color,border-color] duration-300 ease-[var(--ease-bread)]",
                  )}
                >
                  <span
                    className={cn(
                      "relative mt-0.5 shrink-0 grid place-items-center h-9 w-9 rounded-[var(--radius-jar)] border-2",
                      checked
                        ? "border-[var(--color-crust)] bg-[color-mix(in_oklab,var(--color-crust)_22%,transparent)] text-[var(--color-crust-soft)] shadow-[var(--shadow-flour)]"
                        : "border-[var(--color-line)] bg-[var(--color-flour-soft)] text-transparent",
                    )}
                  >
                    <motion.span
                      initial={false}
                      animate={{
                        scale: checked ? (reduceMotion ? 1 : 1) : reduceMotion ? 1 : 0.65,
                        opacity: checked ? 1 : reduceMotion ? 1 : 0,
                      }}
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 32 }}
                      className="absolute inset-0 grid place-items-center"
                    >
                      <Check strokeWidth={2.75} size={18} aria-hidden />
                    </motion.span>
                  </span>
                  <span className="min-w-0 flex-1 pt-1">
                    <motion.span
                      className={cn(
                        "block leading-snug text-pretty [-webkit-box-decoration-break:clone] [box-decoration-break:clone]",
                        "transition-[color,font-style,text-decoration-color] duration-300 ease-[var(--ease-bread)]",
                        checked
                          ? "text-[var(--color-ink-muted)] italic line-through decoration-2 decoration-[color-mix(in_oklab,var(--color-crust)_75%,transparent)]"
                          : "text-[var(--color-ink)] font-medium no-underline",
                      )}
                    >
                      {item.label}
                    </motion.span>
                  </span>
                </button>
              </motion.li>
            );
          })}
        </motion.ul>

        <div className="mt-6 pt-4 border-t border-[var(--color-line-soft)] flex justify-end">
          <button
            type="button"
            className={cn(
              "text-[10px] font-mono uppercase tracking-[0.2em]",
              "text-[var(--color-ink-faint)] hover:text-[var(--color-crust)]",
              "underline-offset-4 hover:underline",
              "transition-colors duration-200 ease-[var(--ease-bread)]",
            )}
            onClick={reset}
          >
            Reset packing list
          </button>
        </div>
      </Card>
    </motion.section>
  );
}
