import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { getViewer } from "@/lib/auth/session";
import { getSection, getDocChildren } from "@/lib/knowledge/parse";
import { getStarterDayInfo } from "@/lib/processes/engine";
import { Card } from "@/components/ui/Card";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { ReadingTOC } from "./ReadingTOC";
import { EquipmentChecklist } from "@/components/library/EquipmentChecklist";
import {
  isEquipmentChecklistSlug,
  stripEquipmentChecklistStaticList,
} from "@/lib/library/equipment-checklist-data";
import { JsonLd } from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const section = await getSection(decodeURIComponent(slug));
  if (!section) return { title: "Not found" };
  const description =
    section.excerpt?.trim() ||
    `${section.title} — a chapter in the Bread Pitt sourdough library.`;
  const canonical = `/library/${section.slug}`;
  return {
    title: section.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: section.title,
      description,
      url: canonical,
      modifiedTime: section.updatedAt?.toISOString(),
    },
    twitter: { card: "summary_large_image", title: section.title, description },
  };
}

export default async function LibraryReader({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { user } = viewer;

  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const section = await getSection(decoded);
  if (!section) notFound();

  const isDoc = section.depth === 0;
  const children = isDoc ? await getDocChildren(section.slug) : [];
  const docSlug = section.parentSlug ?? section.slug;
  const docSection = isDoc ? section : await getSection(docSlug);

  // "You are here" — only for the starter guide, when section title contains "Day N"
  const starter = await getStarterDayInfo(user.id);
  const youAreHereDay = starter?.dayIndex ?? null;
  const sectionDay = matchDayInTitle(section.title);
  const isHere =
    !!youAreHereDay && !!sectionDay && youAreHereDay === sectionDay && docSlug.includes("complete_guide");

  // Prev/next within the doc
  const docChildren = isDoc ? children : await getDocChildren(docSlug);
  const ordIdx = docChildren.findIndex((c) => c.slug === section.slug);
  const prev = ordIdx > 0 ? docChildren[ordIdx - 1] : null;
  const next = ordIdx >= 0 && ordIdx < docChildren.length - 1 ? docChildren[ordIdx + 1] : null;

  const chapterHtml =
    !isDoc && isEquipmentChecklistSlug(section.slug)
      ? stripEquipmentChecklistStaticList(section.contentHtml)
      : section.contentHtml;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: section.title,
    description: section.excerpt || section.title,
    dateModified: section.updatedAt?.toISOString(),
    inLanguage: "en",
    isPartOf: { "@type": "Book", name: docSection?.title ?? "Bread Pitt library" },
    author: { "@type": "Organization", name: "Bread Pitt" },
    publisher: { "@type": "Organization", name: "Bread Pitt" },
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_240px] items-start">
      <JsonLd data={articleJsonLd} />
      <article>
        <Link
          href={isDoc ? "/library" : `/library/${docSlug}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-crust)] transition-colors mb-6"
        >
          <ArrowLeft size={14} /> {isDoc ? "All volumes" : docSection?.title ?? "Volume"}
        </Link>

        {isHere && (
          <ScrollReveal>
            <Card tone="crust" className="mb-8 p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-crust)] text-[var(--color-char)]">
                  <MapPin size={14} />
                </span>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-crust)]">
                    You are here
                  </div>
                  <p className="text-sm text-[var(--color-ink)] mt-0.5">
                    Day {sectionDay} is your starter's current chapter — read it slowly.
                  </p>
                </div>
              </div>
            </Card>
          </ScrollReveal>
        )}

        <ScrollReveal>
          <div className="mb-10">
            <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-[var(--color-ink-faint)] mb-3">
              {isDoc ? `${children.length} chapters` : `Chapter ${section.ordinal}`}
            </div>
            {!isDoc && (
              <h1 className="font-display text-5xl md:text-6xl text-balance leading-[0.96] tracking-tight">
                {section.title}
              </h1>
            )}
          </div>
        </ScrollReveal>

        {isDoc ? (
          <div
            className="prose-bread prose-column"
            dangerouslySetInnerHTML={{ __html: section.contentHtml }}
          />
        ) : (
          <>
            <div
              className="prose-bread prose-column"
              dangerouslySetInnerHTML={{ __html: chapterHtml }}
            />
            {isEquipmentChecklistSlug(section.slug) && (
              <EquipmentChecklist sectionSlug={section.slug} />
            )}
          </>
        )}

        {isDoc && children.length > 0 && (
          <ScrollReveal>
            <section className="mt-16 pt-10 border-t border-[var(--color-line-soft)]">
              <h2 className="font-display text-3xl mb-6">Chapters</h2>
              <ol className="space-y-2">
                {children.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/library/${c.slug}`}
                      className="group flex items-baseline gap-4 rounded-2xl px-4 py-3 -mx-4 hover:bg-[var(--color-flour)]/40 transition-colors"
                    >
                      <span className="font-mono numerals-tabular text-xs text-[var(--color-ink-faint)] w-7 shrink-0">
                        {String(c.ordinal).padStart(2, "0")}
                      </span>
                      <span className="flex-1 text-base text-[var(--color-ink)] group-hover:text-[var(--color-crust)] transition-colors">
                        {c.title}
                      </span>
                      <ArrowRight
                        size={14}
                        className="text-[var(--color-ink-faint)] group-hover:text-[var(--color-crust)] group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          </ScrollReveal>
        )}

        {!isDoc && (prev || next) && (
          <nav className="mt-16 grid gap-3 sm:grid-cols-2 pt-10 border-t border-[var(--color-line-soft)]">
            {prev ? (
              <Link
                href={`/library/${prev.slug}`}
                className="group rounded-2xl border border-[var(--color-line)] p-5 hover:border-[var(--color-crust)]/40 hover:-translate-y-0.5 transition-all"
              >
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-1">
                  ← Previous
                </div>
                <div className="font-display text-lg text-[var(--color-ink)] group-hover:text-[var(--color-crust)]">
                  {prev.title}
                </div>
              </Link>
            ) : (
              <div />
            )}
            {next && (
              <Link
                href={`/library/${next.slug}`}
                className="group rounded-2xl border border-[var(--color-line)] p-5 text-right hover:border-[var(--color-crust)]/40 hover:-translate-y-0.5 transition-all"
              >
                <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-1">
                  Next →
                </div>
                <div className="font-display text-lg text-[var(--color-ink)] group-hover:text-[var(--color-crust)]">
                  {next.title}
                </div>
              </Link>
            )}
          </nav>
        )}
      </article>

      {/* Sticky mini-TOC */}
      {!isDoc && (
        <aside className="hidden lg:block sticky top-32 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2">
          <ReadingTOC contentHtml={chapterHtml} />
        </aside>
      )}
      {isDoc && children.length > 0 && (
        <aside className="hidden lg:block sticky top-32 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-3">
            In this volume
          </div>
          <ol className="space-y-1.5 border-l border-[var(--color-line-soft)] pl-4">
            {children.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/library/${c.slug}`}
                  className="block text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-crust)] transition-colors leading-snug py-1"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}

function matchDayInTitle(title: string): number | null {
  const m = title.match(/Day\s+(\d{1,2})/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}
