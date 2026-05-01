import "server-only";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString as mdToString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import type { Root, Heading, Table } from "mdast";

import { db, rawDb } from "@/lib/db/client";
import { guideSections, troubleshootRows } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type GuideSection = {
  slug: string;
  parentSlug: string | null;
  sourceFile: string;
  title: string;
  ordinal: number;
  depth: number;
  contentMd: string;
  contentHtml: string;
  excerpt: string;
};

const KNOWLEDGE_DIR = resolve(process.cwd());
const KNOWLEDGE_FILES = ["sourdough_complete_guide.md", "sourdough_discard_and_starter_care.md"];

export function listKnowledgeFiles(): string[] {
  return KNOWLEDGE_FILES.filter((f) =>
    readdirSync(KNOWLEDGE_DIR).includes(f)
  );
}

const mdToHtml = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, { behavior: "wrap" })
  .use(rehypeStringify);

function renderHtml(md: string): string {
  return String(mdToHtml.processSync(md));
}

function makeExcerpt(md: string, max = 240): string {
  const tree = unified().use(remarkParse).parse(md) as Root;
  let text = "";
  visit(tree, "paragraph", (node) => {
    if (text) return;
    text = mdToString(node);
  });
  if (text.length > max) text = text.slice(0, max - 1).trimEnd() + "…";
  return text;
}

/**
 * Split a markdown document by `##` headings. The H1 becomes the document hero,
 * and each H2-or-deeper-prefaced block becomes a section.
 */
export function parseGuide(sourceFile: string, raw: string): GuideSection[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(raw) as Root;

  const sections: GuideSection[] = [];
  const slugger = new GithubSlugger();
  let h1Title = sourceFile;

  // First, capture H1 as the doc title
  for (const node of tree.children) {
    if (node.type === "heading" && node.depth === 1) {
      h1Title = mdToString(node);
      break;
    }
  }

  const docSlug = slugger.slug(sourceFile.replace(/\.md$/, ""));
  // Build the "intro" — content above the first H2 — as the doc root section
  const lines = raw.split("\n");
  const headingPositions: { line: number; depth: number; title: string; node: Heading }[] = [];
  visit(tree, "heading", (node: Heading) => {
    if (node.position) {
      headingPositions.push({
        line: node.position.start.line - 1,
        depth: node.depth,
        title: mdToString(node),
        node,
      });
    }
  });

  // Push the doc-root section
  const firstSectionStart = headingPositions.find((h) => h.depth === 2)?.line ?? lines.length;
  const introMd = lines.slice(0, firstSectionStart).join("\n").trim();
  sections.push({
    slug: docSlug,
    parentSlug: null,
    sourceFile,
    title: h1Title,
    ordinal: 0,
    depth: 0,
    contentMd: introMd,
    contentHtml: renderHtml(introMd || `# ${h1Title}`),
    excerpt: makeExcerpt(introMd),
  });

  // Now sections — split by every `##`
  const h2s = headingPositions
    .map((h, i) => ({ ...h, idx: i }))
    .filter((h) => h.depth === 2);

  h2s.forEach((h, i) => {
    const next = h2s[i + 1];
    const start = h.line;
    const end = next ? next.line : lines.length;
    const md = lines.slice(start, end).join("\n").trim();
    const slug = `${docSlug}--${slugger.slug(h.title)}`;
    sections.push({
      slug,
      parentSlug: docSlug,
      sourceFile,
      title: h.title,
      ordinal: i + 1,
      depth: 2,
      contentMd: md,
      contentHtml: renderHtml(md),
      excerpt: makeExcerpt(md),
    });
  });

  return sections;
}

/**
 * Find tables under a "Troubleshooting" section and yield structured rows.
 */
export function parseTroubleshootRows(
  sourceFile: string,
  raw: string
): { symptom: string; diagnosis: string; fix: string }[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(raw) as Root;
  const out: { symptom: string; diagnosis: string; fix: string }[] = [];

  let inTroubleshoot = false;
  for (const node of tree.children) {
    if (node.type === "heading") {
      const txt = mdToString(node).toLowerCase();
      inTroubleshoot = txt.includes("troubleshoot");
      continue;
    }
    if (inTroubleshoot && node.type === "table") {
      const tbl = node as Table;
      // Skip header row (rows[0])
      tbl.children.slice(1).forEach((row) => {
        const cells = row.children.map((c) => mdToString(c).trim());
        if (cells.length >= 3) {
          out.push({
            symptom: cells[0],
            diagnosis: cells[1] || cells[0],
            fix: cells[2] || cells[1],
          });
        }
      });
    }
  }
  return out;
}

function hash(s: string): string {
  return createHash("sha1").update(s).digest("hex");
}

/** Sync MD files into the DB. Idempotent — reuses unchanged sections. */
export async function syncKnowledge(): Promise<{ sections: number; troubleshoot: number }> {
  const files = listKnowledgeFiles();
  let totalSections = 0;
  let totalTrouble = 0;

  // Wipe + repopulate is fine here; tables are tiny.
  await db.delete(guideSections);
  await db.delete(troubleshootRows);
  rawDb.exec("DELETE FROM guide_search;");

  for (const file of files) {
    const raw = readFileSync(resolve(KNOWLEDGE_DIR, file), "utf-8");
    const sections = parseGuide(file, raw);
    for (const s of sections) {
      const ch = hash(s.contentMd);
      await db.insert(guideSections).values({
        slug: s.slug,
        parentSlug: s.parentSlug,
        sourceFile: s.sourceFile,
        title: s.title,
        ordinal: s.ordinal,
        depth: s.depth,
        contentMd: s.contentMd,
        contentHtml: s.contentHtml,
        excerpt: s.excerpt,
        contentHash: ch,
      });
      // FTS5 index
      rawDb
        .prepare("INSERT INTO guide_search (slug, title, body) VALUES (?, ?, ?)")
        .run(s.slug, s.title, s.contentMd);
      totalSections++;
    }
    const rows = parseTroubleshootRows(file, raw);
    rows.forEach((r, i) => {
      db.insert(troubleshootRows)
        .values({
          sourceFile: file,
          symptom: r.symptom,
          diagnosis: r.diagnosis,
          fix: r.fix,
          ordinal: i,
        })
        .run();
      totalTrouble++;
    });
  }

  return { sections: totalSections, troubleshoot: totalTrouble };
}

/** Look up a section by slug. */
export async function getSection(slug: string) {
  const [row] = await db.select().from(guideSections).where(eq(guideSections.slug, slug));
  return row ?? null;
}

export async function getDocSection(docSlug: string) {
  return getSection(docSlug);
}

export async function getDocChildren(parentSlug: string) {
  return db
    .select()
    .from(guideSections)
    .where(eq(guideSections.parentSlug, parentSlug))
    .orderBy(guideSections.ordinal);
}

export async function listDocs() {
  return db
    .select()
    .from(guideSections)
    .where(eq(guideSections.depth, 0))
    .orderBy(guideSections.sourceFile);
}

export type SearchHit = { slug: string; title: string; snippet: string; sourceFile: string };

export async function searchKnowledge(query: string, limit = 12): Promise<SearchHit[]> {
  if (!query.trim()) return [];
  const q = query.trim().split(/\s+/).map((w) => `${w}*`).join(" ");
  const rows = rawDb
    .prepare(
      `SELECT s.slug as slug,
              s.title as title,
              snippet(guide_search, 2, '<mark>', '</mark>', '…', 12) as snippet
       FROM guide_search
       JOIN guide_sections s ON s.slug = guide_search.slug
       WHERE guide_search MATCH ?
       ORDER BY rank
       LIMIT ?`
    )
    .all(q, limit) as { slug: string; title: string; snippet: string }[];

  // attach sourceFile
  const slugs = rows.map((r) => r.slug);
  if (slugs.length === 0) return [];
  const placeholders = slugs.map(() => "?").join(",");
  const meta = rawDb
    .prepare(`SELECT slug, source_file FROM guide_sections WHERE slug IN (${placeholders})`)
    .all(...slugs) as { slug: string; source_file: string }[];
  const fileBySlug = new Map(meta.map((m) => [m.slug, m.source_file]));

  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    snippet: r.snippet,
    sourceFile: fileBySlug.get(r.slug) ?? "",
  }));
}

export async function listTroubleshootRows() {
  return db.select().from(troubleshootRows).orderBy(troubleshootRows.sourceFile, troubleshootRows.ordinal);
}
