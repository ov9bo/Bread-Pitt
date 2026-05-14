import type { MetadataRoute } from "next";
import { db } from "@/lib/db/client";
import { guideSections, processes } from "@/lib/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.PUBLIC_BASE_URL ?? "https://breadpitt.app";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/journal`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/library`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/library/troubleshoot`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/discard`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/processes`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const sections = await db
    .select({ slug: guideSections.slug, updatedAt: guideSections.updatedAt, depth: guideSections.depth })
    .from(guideSections);

  const libraryRoutes: MetadataRoute.Sitemap = sections.map((s) => ({
    url: `${base}/library/${s.slug}`,
    lastModified: s.updatedAt ?? now,
    changeFrequency: "monthly",
    priority: s.depth === 0 ? 0.9 : 0.7,
  }));

  const processRows = await db
    .select({ id: processes.id, createdAt: processes.createdAt })
    .from(processes);

  const journalRoutes: MetadataRoute.Sitemap = processRows.map((p) => ({
    url: `${base}/journal/${p.id}`,
    lastModified: p.createdAt ?? now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...libraryRoutes, ...journalRoutes];
}
