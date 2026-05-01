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
} from "@/lib/processes/engine";
import { requireUser } from "@/lib/auth/session";

const StartSchema = z.object({
  type: z.enum(processTypes),
  nickname: z.string().trim().max(60).optional(),
  kitchenTempF: z.coerce.number().min(50).max(110).optional(),
  startedAt: z.string().optional(),
});

export async function startProcessAction(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const parsed = StartSchema.safeParse({
    type: formData.get("type"),
    nickname: formData.get("nickname") || undefined,
    kitchenTempF: formData.get("kitchenTempF") || undefined,
    startedAt: formData.get("startedAt") || undefined,
  });
  if (!parsed.success) throw new Error("Invalid form data");

  const startedAt = parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date();
  const proc = await startProcess({
    userId: user.id,
    type: parsed.data.type,
    nickname: parsed.data.nickname,
    kitchenTempF: parsed.data.kitchenTempF,
    startedAt,
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
