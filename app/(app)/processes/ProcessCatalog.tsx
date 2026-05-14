"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wheat, Flame, Refrigerator, Recycle, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import type { ProcessType } from "@/lib/db/schema";
import { startProcessAction } from "./actions";
import { LoginPill } from "@/components/auth/LoginPill";
import { useReadOnly } from "@/components/auth/ReadOnlyProvider";

const ICONS: Record<ProcessType, React.ComponentType<{ size?: number; className?: string }>> = {
  starter_build: Wheat,
  bake_day: Flame,
  weekly_maintenance: Refrigerator,
  discard_purge: Recycle,
  revival: Sparkles,
};

type Tile = {
  type: ProcessType;
  meta: { label: string; tagline: string; durationLabel: string; color: string };
  activeCount: number;
};

export function ProcessCatalog({ tiles }: { tiles: Tile[]; hasAny: boolean }) {
  const [openType, setOpenType] = useState<ProcessType | null>(null);
  const openTile = tiles.find((t) => t.type === openType) ?? null;

  return (
    <>
      <ScrollReveal>
        <header className="border-b border-[var(--color-line-soft)] pb-8 mb-12">
          <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-[var(--color-crust)] mb-3">
            Catalog
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-balance leading-[0.96] tracking-tight">
            Begin a process
          </h1>
          <p className="mt-5 max-w-prose font-display italic text-lg text-[var(--color-ink-muted)] text-pretty">
            Five rituals, each a chapter. Every one is restartable, pausable, and remembered in the journal.
          </p>
        </header>
      </ScrollReveal>

      <ul className="grid gap-6 md:grid-cols-2">
        {tiles.map((tile, i) => {
          const Icon = ICONS[tile.type];
          return (
            <motion.li
              key={tile.type}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => setOpenType(tile.type)}
                className="group block w-full text-left"
              >
                <Card
                  tone="flour"
                  className="relative h-full p-7 transition-transform duration-500 ease-[var(--ease-bread)] group-hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-4">
                    <motion.div
                      whileHover={{ rotate: -6, scale: 1.06 }}
                      transition={{ duration: 0.3, ease: [0.32, 0.72, 0.16, 1] }}
                      className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-crust)]/15 text-[var(--color-crust)] border border-[var(--color-crust)]/30"
                    >
                      <Icon size={20} />
                    </motion.div>
                    {tile.activeCount > 0 && (
                      <span className="rounded-full bg-[var(--color-levain)]/20 border border-[var(--color-levain)]/40 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-levain)]">
                        {tile.activeCount} active
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="font-display text-3xl leading-[1.05] text-balance text-[var(--color-ink)]">
                      {tile.meta.label}
                    </h3>
                    <p className="mt-2.5 text-sm text-[var(--color-ink-muted)] text-pretty leading-relaxed">
                      {tile.meta.tagline}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[var(--color-line-soft)] pt-4">
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
                      {tile.meta.durationLabel}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-[var(--color-crust)] font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                      Begin <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </div>

                  {/* Subtle wash on hover */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-0 rounded-[var(--radius-loaf)] bg-gradient-to-br from-[var(--color-crust)]/0 via-[var(--color-crust)]/5 to-[var(--color-butter)]/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                </Card>
              </button>
            </motion.li>
          );
        })}
      </ul>

      <Sheet
        open={!!openTile}
        onClose={() => setOpenType(null)}
        eyebrow="Begin"
        title={openTile?.meta.label}
      >
        {openTile && <StartForm tile={openTile} />}
      </Sheet>
    </>
  );
}

const OUT_OF_OVEN_OFFSET_MIN = 22 * 60 + 50;
const FULLY_COOLED_OFFSET_MIN = 25 * 60 + 30;

function StartForm({ tile }: { tile: Tile }) {
  const readOnly = useReadOnly();
  const isBake = tile.type === "bake_day";
  const [anchorMode, setAnchorMode] = useState<"start" | "ready">("start");
  const [targetReadyAt, setTargetReadyAt] = useState<string>("");
  const [readyMeans, setReadyMeans] = useState<"out_of_oven" | "fully_cooled">("out_of_oven");

  const preview = useMemo(() => {
    if (!isBake || anchorMode !== "ready" || !targetReadyAt) return null;
    const ready = new Date(targetReadyAt);
    if (Number.isNaN(ready.getTime())) return null;
    const offsetMin =
      readyMeans === "fully_cooled" ? FULLY_COOLED_OFFSET_MIN : OUT_OF_OVEN_OFFSET_MIN;
    const T0 = new Date(ready.getTime() - offsetMin * 60_000);
    const oven = new Date(ready.getTime() - (readyMeans === "fully_cooled" ? FULLY_COOLED_OFFSET_MIN - OUT_OF_OVEN_OFFSET_MIN : 0) * 60_000);
    const fmt = (d: Date) =>
      d.toLocaleString([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    return {
      levain: fmt(T0),
      oven: fmt(oven),
      ready: fmt(ready),
    };
  }, [isBake, anchorMode, targetReadyAt, readyMeans]);

  return (
    <form action={startProcessAction} className="space-y-6">
      <input type="hidden" name="type" value={tile.type} />

      <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed text-pretty">
        {tile.meta.tagline}
      </p>

      <FieldGroup>
        <Label htmlFor="nickname" hint="What you'll call this run in the journal">
          Nickname
        </Label>
        <Input
          id="nickname"
          name="nickname"
          maxLength={60}
          placeholder={
            tile.type === "starter_build"
              ? "Bread Pitt"
              : tile.type === "bake_day"
                ? "Loaf #1"
                : "Optional"
          }
        />
      </FieldGroup>

      <FieldGroup>
        <Label htmlFor="kitchenTempC" hint="Used to time how aggressively your starter rises">
          Kitchen temperature (°C)
        </Label>
        <Input
          id="kitchenTempC"
          name="kitchenTempC"
          type="number"
          min={10}
          max={43}
          step={0.1}
          defaultValue={25}
        />
      </FieldGroup>

      {isBake && (
        <FieldGroup>
          <Label htmlFor="anchorMode" hint="Pick what you want to control">
            Anchor by
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {(["start", "ready"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAnchorMode(mode)}
                className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                  anchorMode === mode
                    ? "border-[var(--color-crust)] bg-[var(--color-crust)]/10 text-[var(--color-ink)]"
                    : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {mode === "start" ? "Start time" : "Ready time"}
              </button>
            ))}
          </div>
          <input type="hidden" name="anchorMode" value={anchorMode} />
        </FieldGroup>
      )}

      {(!isBake || anchorMode === "start") && (
        <FieldGroup>
          <Label htmlFor="startedAt" hint="Leave blank to start now">
            Start time
          </Label>
          <Input id="startedAt" name="startedAt" type="datetime-local" />
        </FieldGroup>
      )}

      {isBake && anchorMode === "ready" && (
        <>
          <FieldGroup>
            <Label htmlFor="targetReadyAt" hint="Bread Pitt schedules everything backwards from here">
              Bread ready by
            </Label>
            <Input
              id="targetReadyAt"
              name="targetReadyAt"
              type="datetime-local"
              required
              value={targetReadyAt}
              onChange={(e) => setTargetReadyAt(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="readyMeans" hint="Cooled loaves slice better but take ~2.5h longer">
              Ready means
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: "out_of_oven", label: "Out of the oven" },
                  { v: "fully_cooled", label: "Cooled & sliceable" },
                ] as const
              ).map((m) => (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setReadyMeans(m.v)}
                  className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                    readyMeans === m.v
                      ? "border-[var(--color-crust)] bg-[var(--color-crust)]/10 text-[var(--color-ink)]"
                      : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="readyMeans" value={readyMeans} />
          </FieldGroup>

          {preview && (
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-crumb)]/40 p-4 text-sm space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-1">
                Working backwards
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--color-ink-muted)]">Build the levain</span>
                <span className="font-mono numerals-tabular text-[var(--color-ink)]">{preview.levain}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--color-ink-muted)]">Out of the oven</span>
                <span className="font-mono numerals-tabular text-[var(--color-ink)]">{preview.oven}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--color-ink-muted)]">Ready</span>
                <span className="font-mono numerals-tabular text-[var(--color-crust)]">{preview.ready}</span>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--color-line-soft)]">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
          {tile.meta.durationLabel}
        </span>
        {readOnly ? (
          <LoginPill label="Log in to begin" size="lg" />
        ) : (
          <Button type="submit" size="lg">
            Begin <ArrowRight size={14} />
          </Button>
        )}
      </div>
    </form>
  );
}
