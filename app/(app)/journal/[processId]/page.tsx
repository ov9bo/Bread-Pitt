import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Clock, X } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import {
  getProcess,
  getProcessSteps,
  getProcessObservations,
} from "@/lib/processes/engine";
import { PROCESS_META } from "@/lib/processes/templates";
import { Card, CardEyebrow } from "@/components/ui/Card";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import {
  CompleteStepButton,
  SkipStepButton,
  PauseButton,
  ResumeButton,
  RestartButton,
  AbandonButton,
  ObservationForm,
} from "@/app/(app)/QuickActions";
import { format, formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ processId: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const { processId } = await params;
  const process = await getProcess(processId);
  if (!process || process.userId !== user.id) notFound();

  const meta = PROCESS_META[process.type];
  const [steps, observations] = await Promise.all([
    getProcessSteps(processId),
    getProcessObservations(processId),
  ]);

  // Group by dayIndex for starter_build, otherwise by ordinal
  const grouped = groupSteps(steps);

  return (
    <>
      <Link
        href="/journal"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-crust)] transition-colors mb-6"
      >
        <ArrowLeft size={14} /> All chapters
      </Link>

      <ScrollReveal>
        <header className="border-b border-[var(--color-line-soft)] pb-8 mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.32em] text-[var(--color-crust)]">
              {meta.label}
            </span>
            <span
              className={`text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border ${
                process.status === "active"
                  ? "border-[var(--color-levain)]/40 text-[var(--color-levain)] bg-[var(--color-levain)]/10"
                  : process.status === "paused"
                    ? "border-[var(--color-butter)]/40 text-[var(--color-butter)] bg-[var(--color-butter)]/10"
                    : "border-[var(--color-line)] text-[var(--color-ink-faint)]"
              }`}
            >
              {process.status}
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-balance leading-[0.96] tracking-tight">
            {process.nickname ?? meta.label}
          </h1>
          <p className="mt-4 text-sm text-[var(--color-ink-muted)] font-mono uppercase tracking-[0.18em]">
            Started {format(process.startedAt, "EEE, MMM d · HH:mm")} ·{" "}
            {formatDistanceToNow(process.startedAt, { addSuffix: true })}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {process.status === "active" && <PauseButton processId={process.id} />}
            {process.status === "paused" && <ResumeButton processId={process.id} />}
            <RestartButton processId={process.id} />
            {process.status === "active" && <AbandonButton processId={process.id} />}
          </div>
        </header>
      </ScrollReveal>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px] items-start">
        {/* Steps timeline */}
        <section>
          <h2 className="font-display text-2xl mb-6">Steps</h2>
          <ol className="space-y-3">
            {grouped.map((group, gi) => (
              <ScrollReveal key={group.label} delay={gi * 0.03}>
                {group.label && (
                  <div className="font-display text-lg italic text-[var(--color-ink-muted)] mt-6 mb-2 first:mt-0">
                    {group.label}
                  </div>
                )}
                {group.steps.map((s) => {
                  const done = !!s.completedAt;
                  const skipped = s.skipped;
                  const due = !done && !skipped && s.scheduledFor.getTime() <= Date.now();
                  return (
                    <li
                      key={s.id}
                      id={s.id}
                      className={`group relative rounded-2xl border px-5 py-4 transition-colors ${
                        due
                          ? "border-[var(--color-crust)]/40 bg-[var(--color-crust)]/8"
                          : done
                            ? "border-[var(--color-line-soft)] bg-[var(--color-flour)]/30"
                            : "border-[var(--color-line)] bg-[var(--color-flour)]/50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                            done
                              ? "border-[var(--color-levain)] bg-[var(--color-levain)] text-[var(--color-char)]"
                              : skipped
                                ? "border-[var(--color-line)] text-[var(--color-ink-faint)]"
                                : due
                                  ? "border-[var(--color-crust)] bg-[var(--color-crust)] text-[var(--color-char)]"
                                  : "border-[var(--color-line)]"
                          }`}
                        >
                          {done ? <Check size={11} /> : skipped ? <X size={11} /> : <Clock size={11} className="opacity-60" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-3">
                            <h3
                              className={`text-base ${
                                done || skipped ? "text-[var(--color-ink-muted)] line-through decoration-[var(--color-line)]" : "text-[var(--color-ink)]"
                              }`}
                            >
                              {s.title}
                            </h3>
                            <span className="font-mono numerals-tabular text-xs text-[var(--color-ink-faint)]">
                              {format(s.scheduledFor, "MMM d · HH:mm")}
                            </span>
                          </div>
                          {s.description && !done && !skipped && (
                            <p className="text-sm text-[var(--color-ink-muted)] mt-1.5 leading-relaxed text-pretty">
                              {s.description}
                            </p>
                          )}
                          {!done && !skipped && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <CompleteStepButton stepId={s.id} />
                              <SkipStepButton stepId={s.id} />
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ScrollReveal>
            ))}
          </ol>
        </section>

        {/* Observations rail */}
        <aside className="space-y-4 lg:sticky lg:top-32">
          <Card tone="flour" className="p-6">
            <CardEyebrow>Observations</CardEyebrow>
            <ObservationForm processId={process.id} />
          </Card>

          <Card tone="ghost" className="p-6">
            <CardEyebrow>History</CardEyebrow>
            {observations.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)] mt-3 italic">
                No observations yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {observations.slice(0, 12).map((o) => (
                  <li key={o.id} className="border-l-2 border-[var(--color-crust)]/30 pl-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-ink-faint)]">
                      {format(o.recordedAt, "MMM d HH:mm")} · {o.kind}
                    </div>
                    {o.body && <p className="text-sm text-[var(--color-ink)] mt-0.5">{o.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

type StepRow = Awaited<ReturnType<typeof getProcessSteps>>[number];

function groupSteps(steps: StepRow[]): Array<{ label: string | null; steps: StepRow[] }> {
  const groups: Array<{ label: string | null; steps: StepRow[] }> = [];
  let currentLabel: string | null | undefined = undefined;

  for (const s of steps) {
    const label = s.dayIndex !== null ? `Day ${s.dayIndex}` : null;
    if (label !== currentLabel) {
      groups.push({ label, steps: [] });
      currentLabel = label;
    }
    groups[groups.length - 1].steps.push(s);
  }
  return groups;
}
