import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { PROCESS_META } from "@/lib/processes/templates";
import { getActiveProcesses } from "@/lib/processes/engine";
import { processTypes, type ProcessType } from "@/lib/db/schema";
import { ProcessCatalog } from "./ProcessCatalog";

export const dynamic = "force-dynamic";

export default async function ProcessesPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

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
