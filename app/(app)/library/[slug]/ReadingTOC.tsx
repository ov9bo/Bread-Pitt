"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type Heading = { id: string; text: string; level: number };

export function ReadingTOC({ contentHtml }: { contentHtml: string }) {
  const headings = useMemo(() => extractHeadings(contentHtml), [contentHtml]);
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || headings.length === 0) return;
    observerRef.current?.disconnect();

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // pick topmost visible
          const top = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
          );
          setActiveId(top.target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 1] },
    );

    elements.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page">
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-3">
        On this page
      </div>
      <ol className="relative border-l border-[var(--color-line-soft)] pl-4 space-y-1.5">
        {headings.map((h) => {
          const active = h.id === activeId;
          return (
            <li key={h.id} className="relative">
              {active && (
                <motion.span
                  layoutId="toc-marker"
                  className="absolute -left-[17px] top-1.5 h-4 w-0.5 rounded-full bg-[var(--color-crust)]"
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                />
              )}
              <a
                href={`#${h.id}`}
                className={cn(
                  "block text-xs leading-snug py-1 transition-colors",
                  h.level >= 4 && "pl-3",
                  active
                    ? "text-[var(--color-crust)]"
                    : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
                )}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function extractHeadings(html: string): Heading[] {
  if (typeof window === "undefined") {
    return parseHeadingsRegex(html);
  }
  const dom = new DOMParser().parseFromString(html, "text/html");
  const nodes = dom.querySelectorAll("h2, h3, h4");
  return Array.from(nodes).map((n) => ({
    id: n.getAttribute("id") ?? "",
    text: n.textContent?.trim() ?? "",
    level: parseInt(n.tagName.substring(1), 10),
  })).filter((h) => h.id && h.text);
}

function parseHeadingsRegex(html: string): Heading[] {
  const out: Heading[] = [];
  const re = /<h([234])[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[3].replace(/<[^>]+>/g, "").trim();
    out.push({ level: parseInt(m[1], 10), id: m[2], text });
  }
  return out;
}
