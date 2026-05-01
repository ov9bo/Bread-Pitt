"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { processTypes } from "@/lib/db/schema";
import {
  startProcess,
  pauseProcess,
  resumeProcess,
  restartProcess,
  abandonProcess,
  completeStep,
  skipStep,
  recordObservation,
  extendStarterMaturity,
  confirmStarterMature,
} from "@/lib/processes/engine";
import { requireUser } from "@/lib/auth/session";
const cToF = (c: number) => (c * 9) / 5 + 32;

const StartSchema = z.object({
  type: z.enum(processTypes),
  nickname: z.string().trim().max(60).optional(),
  kitchenTempC: z.coerce.number().min(10).max(43).optional(),
  startedAt: z.string().optional(),
  // Bake-day "anchor by ready time" knobs
  anchorMode: z.enum(["start", "ready"]).optional(),
  targetReadyAt: z.string().optional(),
  readyMeans: z.enum(["out_of_oven", "fully_cooled"]).optional(),
});

export async function startProcessAction(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const parsed = StartSchema.safeParse({
    type: formData.get("type"),
    nickname: formData.get("nickname") || undefined,
    kitchenTempC: formData.get("kitchenTempC") || undefined,
    startedAt: formData.get("startedAt") || undefined,
    anchorMode: formData.get("anchorMode") || undefined,
    targetReadyAt: formData.get("targetReadyAt") || undefined,
    readyMeans: formData.get("readyMeans") || undefined,
  });
  if (!parsed.success) throw new Error("Invalid form data");

  const options: Record<string, unknown> = {};
  let startedAt = parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date();
  if (parsed.data.type === "bake_day") {
    if (parsed.data.anchorMode === "ready" && parsed.data.targetReadyAt) {
      const target = new Date(parsed.data.targetReadyAt);
      const offsetMin = parsed.data.readyMeans === "fully_cooled" ? 25 * 60 + 30 : 22 * 60 + 50;
      // Set the process's startedAt to the computed T0 so all consumers agree.
      startedAt = new Date(target.getTime() - offsetMin * 60_000);
      options.anchorMode = "ready";
      options.targetReadyAt = target.toISOString();
      options.readyMeans = parsed.data.readyMeans ?? "out_of_oven";
    } else {
      options.anchorMode = "start";
    }
  }

  const proc = await startProcess({
    userId: user.id,
    type: parsed.data.type,
    nickname: parsed.data.nickname,
    kitchenTempF:
      parsed.data.kitchenTempC === undefined ? undefined : cToF(parsed.data.kitchenTempC),
    startedAt,
    options,
  });

  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath("/processes");
  redirect(`/journal/${proc.id}`);
}

export async function pauseProcessAction(processId: string) {
  const user = await requireUser();
  if (!user) redirect("/login");
  await pauseProcess(processId);
  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath(`/journal/${processId}`);
}

export async function resumeProcessAction(processId: string) {
  const user = await requireUser();
  if (!user) redirect("/login");
  await resumeProcess(processId);
  revalidatePath("/");
  revalidatePath(`/journal/${processId}`);
}

export async function restartProcessAction(processId: string) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const fresh = await restartProcess(processId);
  revalidatePath("/");
  revalidatePath("/journal");
  redirect(`/journal/${fresh.id}`);
}

export async function abandonProcessAction(processId: string) {
  const user = await requireUser();
  if (!user) redirect("/login");
  await abandonProcess(processId);
  revalidatePath("/");
  revalidatePath("/journal");
}

export async function completeStepAction(stepId: string, note?: string) {
  const user = await requireUser();
  if (!user) redirect("/login");
  await completeStep(stepId, note);
  revalidatePath("/");
  revalidatePath("/journal");
}

export async function skipStepAction(stepId: string, reason?: string) {
  const user = await requireUser();
  if (!user) redirect("/login");
  await skipStep(stepId, reason);
  revalidatePath("/");
  revalidatePath("/journal");
}

const ObservationSchema = z.object({
  processId: z.string().min(1),
  stepId: z.string().optional(),
  kind: z.enum(["smell", "rise", "bubble", "photo", "temperature", "free"]),
  body: z.string().trim().max(2000).optional(),
});

export async function recordObservationAction(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const parsed = ObservationSchema.safeParse({
    processId: formData.get("processId"),
    stepId: formData.get("stepId") || undefined,
    kind: formData.get("kind"),
    body: formData.get("body") || undefined,
  });
  if (!parsed.success) throw new Error("Invalid observation");

  await recordObservation({
    processId: parsed.data.processId,
    stepId: parsed.data.stepId,
    kind: parsed.data.kind,
    body: parsed.data.body,
  });

  revalidatePath("/");
  revalidatePath(`/journal/${parsed.data.processId}`);
}

export async function extendStarterMaturityAction(processId: string) {
  const user = await requireUser();
  if (!user) redirect("/login");
  await extendStarterMaturity(processId, user.id);
  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath(`/journal/${processId}`);
}

export async function confirmStarterMatureAction(processId: string, note?: string) {
  const user = await requireUser();
  if (!user) redirect("/login");
  await confirmStarterMature(processId, user.id, note);
  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath(`/journal/${processId}`);
}
