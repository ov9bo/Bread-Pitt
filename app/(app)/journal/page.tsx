import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAllProcesses } from "@/lib/processes/engine";
import { PROCESS_META } from "@/lib/processes/templates";
import { Card, CardEyebrow } from "@/components/ui/Card";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { ArrowRight, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const all = await getAllProcesses(user.id);

  return (
    <>
      <ScrollReveal>
        <header className="border-b border-[var(--color-line-soft)] pb-8 mb-10">
          <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-[var(--color-crust)] mb-3">
            Chapter index
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-balance leading-[0.96] tracking-tight">
            The journal
          </h1>
          <p className="mt-5 max-w-prose font-display italic text-lg text-[var(--color-ink-muted)] text-pretty">
            Every fold, every feed, every loaf — chapter by chapter, in the order they happened.
          </p>
        </header>
      </ScrollReveal>

      {all.length === 0 ? (
        <Card tone="ghost" className="px-6 py-16 text-center">
          <p className="font-display italic text-[var(--color-ink-muted)] text-lg">
            No chapters yet.
          </p>
          <Link
            href="/processes"
            className="inline-flex items-center gap-2 mt-4 text-sm text-[var(--color-crust)]"
          >
            Begin a process <ArrowRight size={14} />
          </Link>
        </Card>
      ) : (
        <ol className="relative space-y-8 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[var(--color-line)] pl-8">
          {all.map((p, i) => {
            const meta = PROCESS_META[p.type];
            const archived = p.status === "abandoned" || p.status === "completed";
            return (
              <ScrollReveal key={p.id} delay={i * 0.05}>
                <li className="relative">
                  <span
                    aria-hidden
                    className={`absolute -left-[31px] top-7 grid h-4 w-4 place-items-center rounded-full border ${
                      p.status === "active"
                        ? "border-[var(--color-crust)] bg-[var(--color-crust)] shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-crust)_25%,transparent)]"
                        : p.status === "paused"
                          ? "border-[var(--color-butter)] bg-[var(--color-butter)]"
                          : "border-[var(--color-line)] bg-[var(--color-flour)]"
                    }`}
                  />
                  <Link href={`/journal/${p.id}`}>
                    <Card
                      tone={p.status === "active" ? "crust" : "flour"}
                      className="p-7 transition-transform duration-500 ease-[var(--ease-bread)] hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <CardEyebrow>{meta.label}</CardEyebrow>
                            <span
                              className={`text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border ${
                                p.status === "active"
                                  ? "border-[var(--color-levain)]/40 text-[var(--color-levain)] bg-[var(--color-levain)]/10"
                                  : p.status === "paused"
                                    ? "border-[var(--color-butter)]/40 text-[var(--color-butter)] bg-[var(--color-butter)]/10"
                                    : "border-[var(--color-line)] text-[var(--color-ink-faint)]"
                              }`}
                            >
                              {p.status}
                            </span>
                            {p.restartedFromId && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                                <RotateCcw size={10} /> restarted
                              </span>
                            )}
                          </div>
                          <h3 className="font-display text-3xl mt-2 leading-tight text-balance">
                            {p.nickname ?? meta.label}
                          </h3>
                          <p className="text-sm text-[var(--color-ink-muted)] mt-2">
                            {archived ? "Closed" : "Started"}{" "}
                            {formatDistanceToNow(p.startedAt, { addSuffix: true })}
                          </p>
                        </div>
                        <ArrowRight size={16} className="text-[var(--color-ink-muted)] shrink-0 mt-2" />
                      </div>
                    </Card>
                  </Link>
                </li>
              </ScrollReveal>
            );
          })}
        </ol>
      )}
    </>
  );
}
