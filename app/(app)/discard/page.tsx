import { redirect } from "next/navigation";
import { Archive } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import {
  getCurrentJar,
  getArchivedJars,
  getJarUses,
} from "@/lib/discard/jars";
import { DISCARD_RECIPES, EFFORT_META, type DiscardEffort } from "@/lib/discard/recipes";
import { Card, CardEyebrow } from "@/components/ui/Card";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { DiscardJar } from "@/components/brand/DiscardJar";
import { AddDiscardForm, RecipeUseButton, CloseJarButton } from "./DiscardActions";
import { format, formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DiscardPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const current = await getCurrentJar(user.id);
  const archived = await getArchivedJars(user.id, 6);
  const uses = current ? await getJarUses(current.id) : [];

  const totalUsed = uses.reduce((acc, u) => acc + u.gramsUsed, 0);
  const inJar = current?.currentGrams ?? 0;

  // group recipes by effort
  const byEffort: Record<DiscardEffort, typeof DISCARD_RECIPES> = {
    survive: [],
    weekend: [],
    project: [],
  };
  for (const r of DISCARD_RECIPES) byEffort[r.effort].push(r);

  return (
    <>
      <ScrollReveal>
        <header className="border-b border-[var(--color-line-soft)] pb-8 mb-12">
          <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-[var(--color-crust)] mb-3">
            Don't waste a gram
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-balance leading-[0.96] tracking-tight">
            The discard shelf
          </h1>
          <p className="mt-5 max-w-prose font-display italic text-lg text-[var(--color-ink-muted)] text-pretty">
            Each jar tracks how much is left and what it became. Pancakes, crackers, pizza — pick what fits the day.
          </p>
        </header>
      </ScrollReveal>

      <section className="grid gap-10 lg:grid-cols-[minmax(280px,360px)_1fr] items-start mb-16">
        {/* Live current jar */}
        <ScrollReveal>
          <Card tone="flour" className="p-7">
            <CardEyebrow>Current jar</CardEyebrow>
            <h2 className="font-display text-3xl mt-2 leading-tight">
              {inJar > 0 ? `${Math.round(inJar)}g on the shelf` : "Empty jar"}
            </h2>
            <p className="text-sm text-[var(--color-ink-muted)] mt-2">
              {current
                ? `Opened ${formatDistanceToNow(current.openedAt, { addSuffix: true })}`
                : "Add discard from your next feed to start tracking."}
            </p>

            <div className="mt-6">
              <DiscardJar
                grams={inJar}
                cap={1000}
                label={current ? `Opened ${format(current.openedAt, "MMM d")}` : "No jar yet"}
              />
            </div>

            <AddDiscardForm />

            {current && totalUsed > 0 && (
              <div className="mt-5 rounded-2xl border border-[var(--color-line-soft)] bg-[var(--color-crumb)]/40 p-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-1.5">
                  Used so far
                </div>
                <div className="font-display numerals-tabular text-2xl text-[var(--color-crust)]">
                  {Math.round(totalUsed)}g
                </div>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                  Across {uses.length} {uses.length === 1 ? "session" : "sessions"}
                </p>
              </div>
            )}

            {current && (
              <div className="mt-4">
                <CloseJarButton />
              </div>
            )}
          </Card>
        </ScrollReveal>

        {/* Recent uses */}
        <ScrollReveal delay={0.1}>
          <Card tone="ghost" className="p-7 h-full">
            <CardEyebrow>What it's been</CardEyebrow>
            <h3 className="font-display text-2xl mt-2 mb-5">
              {uses.length === 0 ? "No bakes yet from this jar" : "Last few bakes"}
            </h3>
            {uses.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)] italic">
                Pick a recipe below and the jar will keep score.
              </p>
            ) : (
              <ul className="space-y-3">
                {uses.slice(0, 8).map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-4 border-l-2 border-[var(--color-crust)]/40 pl-4 py-1"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-[var(--color-ink)] truncate">{u.recipeName}</div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-faint)] mt-0.5">
                        {format(u.usedAt, "MMM d · HH:mm")}
                      </div>
                    </div>
                    <span className="font-mono numerals-tabular text-sm text-[var(--color-crust)] shrink-0">
                      −{Math.round(u.gramsUsed)}g
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </ScrollReveal>
      </section>

      {/* Recipes */}
      <section>
        <ScrollReveal>
          <h2 className="font-display text-3xl mb-1">Recipes</h2>
          <p className="text-sm text-[var(--color-ink-muted)] mb-8 italic font-display">
            Graded by effort. The jar will decrement when you cook.
          </p>
        </ScrollReveal>

        <div className="space-y-12">
          {(Object.keys(byEffort) as DiscardEffort[]).map((effort, gi) => {
            const meta = EFFORT_META[effort];
            return (
              <ScrollReveal key={effort} delay={gi * 0.05}>
                <div className="flex items-baseline gap-4 mb-5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: meta.tone }}
                    aria-hidden
                  />
                  <h3 className="font-display text-2xl">{meta.label}</h3>
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
                    {meta.sub}
                  </span>
                </div>
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {byEffort[effort].map((r) => (
                    <li key={r.key}>
                      <Card
                        tone="flour"
                        className="h-full p-5 transition-transform duration-500 ease-[var(--ease-bread)] hover:-translate-y-0.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-3xl leading-none mt-0.5" aria-hidden>
                            {r.emoji}
                          </span>
                          <span
                            className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border"
                            style={{
                              borderColor: `color-mix(in oklab, ${meta.tone} 40%, transparent)`,
                              color: meta.tone,
                            }}
                          >
                            {r.grams}g
                          </span>
                        </div>
                        <h4 className="font-display text-xl mt-3 leading-tight text-balance">
                          {r.name}
                        </h4>
                        <p className="text-xs text-[var(--color-ink-muted)] mt-2 leading-relaxed text-pretty">
                          {r.blurb}
                        </p>
                        <div className="mt-4">
                          <RecipeUseButton
                            recipeKey={r.key}
                            recipeName={r.name}
                            grams={r.grams}
                            available={inJar}
                          />
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* Archived shelf */}
      {archived.length > 0 && (
        <ScrollReveal className="mt-20">
          <div className="flex items-baseline gap-3 mb-6">
            <Archive size={16} className="text-[var(--color-ink-faint)]" />
            <h2 className="font-display text-2xl">Archived jars</h2>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {archived.map((j) => (
              <li key={j.id}>
                <Card tone="ghost" className="p-5">
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
                    Closed {j.closedAt ? format(j.closedAt, "MMM d") : "—"}
                  </div>
                  <div className="font-display text-xl mt-1.5">
                    {Math.round(j.currentGrams)}g remaining
                  </div>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-2">
                    Opened {format(j.openedAt, "MMM d, yyyy")}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      )}
    </>
  );
}
