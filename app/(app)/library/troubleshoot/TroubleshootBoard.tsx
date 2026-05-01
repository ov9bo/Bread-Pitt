"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type Row = {
  id: string;
  symptom: string;
  diagnosis: string;
  fix: string;
  sourceFile: string;
};

type Hit = { slug: string; title: string; snippet: string; sourceFile: string };

export function TroubleshootBoard({
  initialQuery,
  rows,
  hits,
}: {
  initialQuery: string;
  rows: Row[];
  hits: Hit[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  // Local filter for the table — instant feedback as the user types
  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.symptom.toLowerCase().includes(needle) ||
        r.diagnosis.toLowerCase().includes(needle) ||
        r.fix.toLowerCase().includes(needle),
    );
  }, [q, rows]);

  function commitSearch(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("q", next);
    else params.delete("q");
    startTransition(() => {
      router.replace(`/library/troubleshoot${params.toString() ? `?${params}` : ""}`, {
        scroll: false,
      });
    });
  }

  function onChange(value: string) {
    setQ(value);
    commitSearch(value);
  }

  return (
    <>
      <div className="relative mb-10">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
        />
        <Input
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="hooch, mold, no rise, sour…"
          className="pl-11 pr-11 h-12 text-base"
          autoFocus
        />
        {q && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:bg-[var(--color-flour)]"
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search hits across whole guides */}
      <AnimatePresence initial={false}>
        {q && hits.length > 0 && (
          <motion.section
            key="hits"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mb-12"
          >
            <h2 className="font-display text-2xl mb-5">From the guides</h2>
            <ul className="space-y-3">
              {hits.map((h) => (
                <li key={h.slug}>
                  <Link href={`/library/${h.slug}`}>
                    <Card
                      tone="ghost"
                      className="p-5 transition-all hover:bg-[var(--color-flour)]/30 hover:-translate-y-0.5"
                    >
                      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-1.5">
                        {h.sourceFile.replace(/_/g, " ").replace(/\.md$/, "")}
                      </div>
                      <h3 className="font-display text-xl text-[var(--color-ink)] mb-2 leading-tight">
                        {h.title}
                      </h3>
                      <p
                        className="text-sm text-[var(--color-ink-muted)] leading-relaxed [&_mark]:bg-[color-mix(in_oklab,var(--color-butter)_35%,transparent)] [&_mark]:text-[var(--color-ink)] [&_mark]:px-0.5 [&_mark]:rounded-sm"
                        dangerouslySetInnerHTML={{ __html: h.snippet }}
                      />
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </AnimatePresence>

      {/* The merged symptom table */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-2xl">Symptom table</h2>
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
            {filteredRows.length} {filteredRows.length === 1 ? "row" : "rows"}
            {pending && " · searching…"}
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <Card tone="ghost" className="px-6 py-12 text-center">
            <p className="font-display italic text-[var(--color-ink-muted)]">
              Nothing matches. Try a different word, or take a deep breath — the dough probably knows what it's doing.
            </p>
          </Card>
        ) : (
          <Card tone="ghost" className="overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-px bg-[var(--color-line-soft)]">
              <Cell head>Symptom</Cell>
              <Cell head>Likely cause</Cell>
              <Cell head>What to do</Cell>
              {filteredRows.map((r) => (
                <RowGroup key={r.id} row={r} />
              ))}
            </div>
          </Card>
        )}
      </section>
    </>
  );
}

function RowGroup({ row }: { row: Row }) {
  return (
    <>
      <Cell>
        <span className="text-[var(--color-ink)]">{row.symptom}</span>
      </Cell>
      <Cell>
        <span className="text-[var(--color-ink-muted)]">{row.diagnosis}</span>
      </Cell>
      <Cell>
        <span className="text-[var(--color-ink)]">{row.fix}</span>
      </Cell>
    </>
  );
}

function Cell({ children, head }: { children: React.ReactNode; head?: boolean }) {
  return (
    <div
      className={
        head
          ? "bg-[var(--color-flour)]/60 px-5 py-3 text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)]"
          : "bg-[var(--color-crumb)]/40 px-5 py-4 text-sm leading-relaxed"
      }
    >
      {children}
    </div>
  );
}
