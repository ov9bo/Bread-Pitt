import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Search, Wrench } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { listDocs, getDocChildren } from "@/lib/knowledge/parse";
import { Card, CardEyebrow } from "@/components/ui/Card";
import { ScrollReveal } from "@/components/motion/ScrollReveal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The library — sourdough guides & chapters",
  description:
    "Two beautifully bound sourdough guides: a complete starter walkthrough and a bake-day playbook. Open one to read; whatever day you're living right now pins itself to the top.",
  alternates: { canonical: "/library" },
  openGraph: {
    type: "website",
    title: "The Bread Pitt library — sourdough guides",
    description:
      "Two beautifully bound sourdough guides: starter walkthrough and bake-day playbook.",
    url: "/library",
  },
};

export default async function LibraryPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const docs = await listDocs();
  const enriched = await Promise.all(
    docs.map(async (d) => ({
      doc: d,
      children: await getDocChildren(d.slug),
    })),
  );

  return (
    <>
      <ScrollReveal>
        <header className="border-b border-[var(--color-line-soft)] pb-8 mb-12">
          <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-[var(--color-crust)] mb-3">
            The library
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-balance leading-[0.96] tracking-tight">
            Two guides, beautifully bound
          </h1>
          <p className="mt-5 max-w-prose font-display italic text-lg text-[var(--color-ink-muted)] text-pretty">
            Open one to read; whatever day you're living right now will pin itself to the top.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <Link
              href="/library/troubleshoot"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-flour)]/60 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-crust)]/40 transition-colors"
            >
              <Wrench size={12} /> Troubleshoot
            </Link>
            <Link
              href="/library/troubleshoot"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-flour)]/60 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-crust)]/40 transition-colors"
            >
              <Search size={12} /> Search every section
            </Link>
          </div>
        </header>
      </ScrollReveal>

      <section className="grid gap-8 md:grid-cols-2">
        {enriched.map(({ doc, children }, i) => (
          <ScrollReveal key={doc.slug} delay={i * 0.07}>
            <Link href={`/library/${doc.slug}`} className="group block">
              <Card
                tone="flour"
                className="relative h-full p-8 transition-transform duration-500 ease-[var(--ease-bread)] group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-oven)]"
              >
                {/* book spine — left edge accent */}
                <div
                  aria-hidden
                  className="absolute inset-y-6 left-0 w-1.5 rounded-r-full bg-gradient-to-b from-[var(--color-crust)] via-[var(--color-crust-soft)] to-[var(--color-hooch)]"
                />
                {/* foil stamp circle */}
                <div
                  aria-hidden
                  className="absolute right-7 top-7 grid h-10 w-10 place-items-center rounded-full border border-[var(--color-crust)]/40 bg-[var(--color-crust)]/10 text-[var(--color-crust)] font-display italic text-sm"
                >
                  {i + 1}
                </div>

                <CardEyebrow>Volume {romanize(i + 1)}</CardEyebrow>
                <h2 className="font-display text-3xl mt-2 leading-tight text-balance pr-12">
                  {doc.title}
                </h2>

                {doc.excerpt && (
                  <p className="mt-3 text-sm text-[var(--color-ink-muted)] leading-relaxed text-pretty line-clamp-3">
                    {doc.excerpt}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)]">
                  <span>{children.length} chapters</span>
                  <span className="inline-flex items-center gap-1.5 text-[var(--color-crust)] group-hover:gap-2.5 transition-all">
                    Open <ArrowRight size={12} />
                  </span>
                </div>

                {children.length > 0 && (
                  <ul className="mt-6 space-y-1.5 border-t border-[var(--color-line-soft)] pt-5">
                    {children.slice(0, 5).map((c) => (
                      <li
                        key={c.slug}
                        className="text-xs text-[var(--color-ink-muted)] truncate"
                      >
                        <span className="font-mono numerals-tabular text-[var(--color-ink-faint)] mr-2">
                          {String(c.ordinal).padStart(2, "0")}
                        </span>
                        {c.title}
                      </li>
                    ))}
                    {children.length > 5 && (
                      <li className="text-xs italic text-[var(--color-ink-faint)]">
                        + {children.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
              </Card>
            </Link>
          </ScrollReveal>
        ))}
      </section>
    </>
  );
}

function romanize(n: number): string {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n - 1] ?? String(n);
}
