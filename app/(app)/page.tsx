import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Bell, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardEyebrow } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StarterJar } from "@/components/brand/StarterJar";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { Countdown } from "@/components/motion/SpringCounter";
import { requireUser } from "@/lib/auth/session";
import {
  getActiveProcesses,
  getNextActions,
  getStarterDayInfo,
  getMostRecentDueStep,
} from "@/lib/processes/engine";
import { db } from "@/lib/db/client";
import { observations, preferences, processes as processesTbl } from "@/lib/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import { PROCESS_META } from "@/lib/processes/templates";
import { CompleteStepButton, SnoozeButton, ObservationForm, MaturityActions } from "./QuickActions";
import { startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default async function TodayPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const [pref] = await db.select().from(preferences).where(eq(preferences.userId, user.id));
  const starterNickname = pref?.starterNickname ?? "The starter";

  const [starterInfo, active, next24, dueNow] = await Promise.all([
    getStarterDayInfo(user.id),
    getActiveProcesses(user.id),
    getNextActions(user.id, 24),
    getMostRecentDueStep(user.id),
  ]);

  // Today's observations across all active processes
  const todayObs = active.length
    ? await db
        .select()
        .from(observations)
        .where(
          and(
            eq(observations.processId, active[0].id),
            gte(observations.recordedAt, startOfDay(new Date())),
          ),
        )
        .orderBy(desc(observations.recordedAt))
        .limit(8)
    : [];

  const dayIndex = starterInfo?.dayIndex ?? null;
  const dayCap = starterInfo ? 14 + starterInfo.extensionDays : 14;
  const maturityStep = starterInfo?.pendingMaturityStep ?? null;
  const maturityDue = !!maturityStep && maturityStep.scheduledFor.getTime() <= Date.now();
  const empty = active.length === 0;

  return (
    <>
      {empty && <EmptyState nickname={starterNickname} />}

      {!empty && (
        <>
          {/* Hero — three columns at desktop */}
          <section className="grid gap-8 lg:grid-cols-[1fr_minmax(280px,360px)_1fr] items-start">
            <NextActionCard step={dueNow?.step} processId={dueNow?.process.id} />

            <div className="relative">
              <div className="font-display numerals-tabular text-center text-[var(--color-ink-faint)] text-sm tracking-[0.32em] mb-3">
                {dayIndex !== null
                  ? `DAY ${String(dayIndex).padStart(2, "0")} / ${String(dayCap).padStart(2, "0")}`
                  : "AT REST"}
              </div>
              <StarterJar
                dayIndex={dayIndex}
                nickname={starterNickname}
                caption={
                  dayIndex !== null
                    ? "Starter build in progress"
                    : "No active build"
                }
              />
              {maturityDue && starterInfo && (
                <div className="mt-6 rounded-2xl border border-[var(--color-levain)]/40 bg-[var(--color-levain)]/8 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-levain)] mb-1.5">
                    Float test
                  </div>
                  <p className="text-sm text-[var(--color-ink)] mb-3 text-pretty">
                    Did the float test pass? If not, {starterNickname} can take another day.
                  </p>
                  <MaturityActions processId={starterInfo.process.id} />
                </div>
              )}
            </div>

            <TodayJournalCard
              entries={todayObs.map((o) => ({
                id: o.id,
                kind: o.kind,
                body: o.body ?? "",
                at: o.recordedAt,
              }))}
              processId={active[0]?.id}
            />
          </section>

          {/* 24-hour timeline */}
          <ScrollReveal className="mt-16">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="font-display text-2xl">Next 24 hours</h3>
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
                Across {active.length} active process{active.length === 1 ? "" : "es"}
              </span>
            </div>

            {next24.length === 0 ? (
              <Card tone="ghost" className="px-6 py-10 text-center">
                <p className="font-display italic text-[var(--color-ink-muted)]">
                  Quiet day ahead. Bread Pitt will be in touch.
                </p>
              </Card>
            ) : (
              <Card tone="ghost" className="divide-y divide-[var(--color-line-soft)]">
                {next24.map(({ step, process }) => (
                  <Link
                    key={step.id}
                    href={`/journal/${process.id}#${step.id}`}
                    className="flex items-center gap-5 px-6 py-4 hover:bg-[var(--color-flour)]/40 transition-colors group"
                  >
                    <span className="font-mono numerals-tabular text-sm text-[var(--color-crust)] w-14">
                      {formatTime(step.scheduledFor)}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm text-[var(--color-ink)]">{step.title}</div>
                      {step.description && (
                        <div className="text-xs text-[var(--color-ink-muted)] mt-0.5 line-clamp-1">
                          {step.description}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-faint)]">
                      {PROCESS_META[process.type].label}
                    </span>
                    <ArrowRight
                      size={14}
                      className="text-[var(--color-ink-faint)] group-hover:text-[var(--color-crust)] transition-colors"
                    />
                  </Link>
                ))}
              </Card>
            )}
          </ScrollReveal>

          {/* Active processes strip */}
          {active.length > 1 && (
            <ScrollReveal className="mt-16">
              <h3 className="font-display text-2xl mb-6">Other active</h3>
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {active.slice(1).map((p) => (
                  <li key={p.id}>
                    <Link href={`/journal/${p.id}`}>
                      <Card tone="flour" className="p-6 hover:-translate-y-0.5 transition-transform">
                        <CardEyebrow>{PROCESS_META[p.type].label}</CardEyebrow>
                        <h4 className="font-display text-xl mt-1.5">{p.nickname ?? PROCESS_META[p.type].label}</h4>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-2">
                          Started {p.startedAt.toLocaleDateString()}
                        </p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          )}
        </>
      )}
    </>
  );
}

function NextActionCard({
  step,
  processId,
}: {
  step?: { id: string; title: string; description: string | null; scheduledFor: Date };
  processId?: string;
}) {
  if (!step || !processId) {
    return (
      <Card tone="flour" className="p-7">
        <CardEyebrow>Next action</CardEyebrow>
        <h2 className="font-display text-3xl text-balance mt-2 leading-[1.05]">
          Nothing on the schedule
        </h2>
        <p className="text-sm text-[var(--color-ink-muted)] mt-3 max-w-[28ch]">
          Begin a starter build, schedule a bake, or revive a fridge starter.
        </p>
        <Link href="/processes" className="mt-5 inline-block">
          <Button size="sm">
            <ArrowRight size={14} /> Browse processes
          </Button>
        </Link>
      </Card>
    );
  }

  const due = step.scheduledFor.getTime() <= Date.now();

  return (
    <Card tone="flour" className="p-7">
      <CardEyebrow>{due ? "Due now" : "Next action"}</CardEyebrow>
      <h2 className="font-display text-3xl text-balance mt-2 leading-[1.05]">
        {step.title}
      </h2>
      {step.description && (
        <p className="text-sm text-[var(--color-ink-muted)] mt-2 max-w-[34ch] text-pretty">
          {step.description}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-crumb)]/40 p-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-1.5">
          {due ? "Was due" : "In"}
        </div>
        <Countdown
          to={step.scheduledFor}
          className="font-display numerals-tabular text-5xl text-[var(--color-crust)] tracking-tight"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <CompleteStepButton stepId={step.id} />
        <SnoozeButton minutes={30} />
      </div>
    </Card>
  );
}

function TodayJournalCard({
  entries,
  processId,
}: {
  entries: Array<{ id: string; kind: string; body: string; at: Date }>;
  processId?: string;
}) {
  return (
    <Card tone="flour" className="p-7">
      <CardEyebrow>Today's journal</CardEyebrow>
      <h2 className="font-display text-3xl text-balance mt-2 leading-[1.05]">
        {entries.length === 0
          ? "A blank page"
          : `${entries.length} note${entries.length === 1 ? "" : "s"} so far`}
      </h2>

      {entries.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)] mt-3 max-w-[28ch]">
          A whiff, a height, a hunch — write it down before you forget.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {entries.slice(0, 4).map((e) => (
            <li
              key={e.id}
              className="border-l-2 border-[var(--color-crust)]/40 pl-3"
            >
              <div className="text-[11px] font-mono text-[var(--color-ink-faint)] uppercase tracking-wider">
                {formatTime(e.at)} — {e.kind}
              </div>
              <p className="text-sm text-[var(--color-ink)] mt-0.5">{e.body}</p>
            </li>
          ))}
        </ul>
      )}

      {processId && <ObservationForm processId={processId} />}
    </Card>
  );
}

function EmptyState({ nickname }: { nickname: string }) {
  return (
    <ScrollReveal>
      <section className="grid gap-10 md:grid-cols-2 items-center min-h-[60vh]">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-[var(--color-crust)] mb-3">
            A blank journal
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-balance leading-[0.96] tracking-tight">
            {nickname} is asleep.
          </h1>
          <p className="mt-5 max-w-prose font-display italic text-lg text-[var(--color-ink-muted)] text-pretty">
            Wake them up with flour and water. Fourteen patient days from now, you'll have a wild culture and a habit.
          </p>
          <Link href="/processes" className="mt-7 inline-block">
            <Button size="lg">
              <Sparkles size={16} /> Begin a starter
            </Button>
          </Link>
        </div>
        <div>
          <StarterJar dayIndex={null} nickname={nickname} caption="Awaiting first feed" />
        </div>
      </section>
    </ScrollReveal>
  );
}
