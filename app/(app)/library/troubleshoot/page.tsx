import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listTroubleshootRows, searchKnowledge } from "@/lib/knowledge/parse";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { TroubleshootBoard } from "./TroubleshootBoard";

export const dynamic = "force-dynamic";

export default async function TroubleshootPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [rows, hits] = await Promise.all([
    listTroubleshootRows(),
    query ? searchKnowledge(query, 12) : Promise.resolve([]),
  ]);

  return (
    <>
      <Link
        href="/library"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-crust)] transition-colors mb-6"
      >
        <ArrowLeft size={14} /> The library
      </Link>

      <ScrollReveal>
        <header className="border-b border-[var(--color-line-soft)] pb-8 mb-10">
          <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-[var(--color-crust)] mb-3">
            When something's off
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-balance leading-[0.96] tracking-tight">
            Troubleshoot
          </h1>
          <p className="mt-5 max-w-prose font-display italic text-lg text-[var(--color-ink-muted)] text-pretty">
            Search both guides at once, or scan the merged symptom table below.
          </p>
        </header>
      </ScrollReveal>

      <TroubleshootBoard
        initialQuery={query}
        rows={rows.map((r) => ({
          id: r.id,
          symptom: r.symptom,
          diagnosis: r.diagnosis,
          fix: r.fix,
          sourceFile: r.sourceFile,
        }))}
        hits={hits}
      />
    </>
  );
}
