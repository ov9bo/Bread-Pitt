import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { PROCESS_META } from "@/lib/processes/templates";
import { getActiveProcesses } from "@/lib/processes/engine";
import { processTypes, type ProcessType } from "@/lib/db/schema";
import { ProcessCatalog } from "./ProcessCatalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Begin a sourdough process — starter, bake day, maintenance",
  description:
    "Five sourdough rituals, each a chapter: build a starter from scratch, schedule a bake day backwards from when bread should be ready, weekly fridge maintenance, discard purge, or revive a sluggish starter.",
  alternates: { canonical: "/processes" },
};

export default async function ProcessesPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { user } = viewer;

  const active = await getActiveProcesses(user.id);
  const activeByType = new Set(active.map((p) => p.type));

  const tiles = (processTypes as readonly ProcessType[]).map((type) => ({
    type,
    meta: PROCESS_META[type],
    activeCount: active.filter((p) => p.type === type).length,
  }));

  return (
    <ProcessCatalog tiles={tiles} hasAny={activeByType.size > 0} />
  );
}
