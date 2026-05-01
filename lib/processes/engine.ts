import "server-only";
import { db } from "@/lib/db/client";
import {
  processes,
  processSteps,
  reminders,
  observations,
  preferences,
  users,
  type ProcessType,
} from "@/lib/db/schema";
import { TEMPLATES } from "./templates";
import { and, eq, asc, desc, gt, isNull, lt, ne, or, sql } from "drizzle-orm";

type StartOptions = {
  userId: string;
  type: ProcessType;
  startedAt?: Date;
  nickname?: string;
  kitchenTempF?: number;
  options?: Record<string, unknown>;
};

export async function startProcess(opts: StartOptions) {
  const startedAt = opts.startedAt ?? new Date();
  const [user] = await db.select().from(users).where(eq(users.id, opts.userId));
  if (!user) throw new Error("User not found");

  const [pref] = await db.select().from(preferences).where(eq(preferences.userId, opts.userId));
  const tempF = opts.kitchenTempF ?? pref?.kitchenTempF ?? 72;
  const starterNickname = pref?.starterNickname ?? "Crustopher";

  const template = TEMPLATES[opts.type];
  if (!template) throw new Error(`Unknown process type: ${opts.type}`);

  const built = template.build({
    startedAt,
    kitchenTempF: tempF,
    starterNickname,
    options: opts.options,
  });

  const nickname = opts.nickname ?? template.defaultNickname({
    startedAt,
    kitchenTempF: tempF,
    starterNickname,
    options: opts.options,
  });

  const [proc] = await db
    .insert(processes)
    .values({
      userId: opts.userId,
      type: opts.type,
      status: "active",
      nickname,
      recipeVersion: template.recipeVersion,
      kitchenTempAtStart: tempF,
      optionsJson: JSON.stringify(opts.options ?? {}),
      startedAt,
    })
    .returning();

  // Insert steps
  const stepRows = await db
    .insert(processSteps)
    .values(
      built.steps.map((s) => ({
        processId: proc.id,
        stepKey: s.stepKey,
        title: s.title,
        description: s.description ?? null,
        ordinal: s.ordinal,
        dayIndex: s.dayIndex ?? null,
        scheduledFor: s.scheduledFor,
        metadataJson: JSON.stringify(s.metadata ?? {}),
      }))
    )
    .returning();

  const stepByKey = new Map(stepRows.map((r) => [r.stepKey, r]));

  // Insert reminders linked to steps when stepKey matches
  if (built.reminders.length) {
    await db.insert(reminders).values(
      built.reminders.map((r) => ({
        userId: opts.userId,
        processId: proc.id,
        stepId: stepByKey.get(r.stepKey)?.id ?? null,
        fireAt: r.fireAt,
        title: r.title,
        body: r.body,
        deepLink: `/journal/${proc.id}#${stepByKey.get(r.stepKey)?.id ?? ""}`,
      }))
    );
  }

  return proc;
}

export async function pauseProcess(processId: string) {
  await db
    .update(processes)
    .set({ status: "paused", pausedAt: new Date() })
    .where(eq(processes.id, processId));

  await db
    .update(reminders)
    .set({ status: "cancelled" })
    .where(and(eq(reminders.processId, processId), eq(reminders.status, "pending")));
}

export async function resumeProcess(processId: string) {
  const [proc] = await db.select().from(processes).where(eq(processes.id, processId));
  if (!proc || proc.status !== "paused" || !proc.pausedAt) return;

  const elapsedMs = Date.now() - proc.pausedAt.getTime();
  await db
    .update(processes)
    .set({ status: "active", pausedAt: null })
    .where(eq(processes.id, processId));

  // Shift remaining incomplete steps + their reminders by elapsedMs.
  const remaining = await db
    .select()
    .from(processSteps)
    .where(and(eq(processSteps.processId, processId), isNull(processSteps.completedAt)));
  for (const s of remaining) {
    const newWhen = new Date(s.scheduledFor.getTime() + elapsedMs);
    await db.update(processSteps).set({ scheduledFor: newWhen }).where(eq(processSteps.id, s.id));
  }

  // Re-emit reminders for those steps that were cancelled during pause
  const cancelled = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.processId, processId), eq(reminders.status, "cancelled")));
  for (const r of cancelled) {
    await db
      .update(reminders)
      .set({ status: "pending", fireAt: new Date(r.fireAt.getTime() + elapsedMs) })
      .where(eq(reminders.id, r.id));
  }
}

export async function restartProcess(processId: string) {
  const [proc] = await db.select().from(processes).where(eq(processes.id, processId));
  if (!proc) throw new Error("Process not found");

  // Archive old run
  await db
    .update(processes)
    .set({ status: "abandoned", completedAt: new Date() })
    .where(eq(processes.id, processId));
  await db
    .update(reminders)
    .set({ status: "cancelled" })
    .where(and(eq(reminders.processId, processId), eq(reminders.status, "pending")));

  const fresh = await startProcess({
    userId: proc.userId,
    type: proc.type,
    nickname: proc.nickname ?? undefined,
    options: JSON.parse(proc.optionsJson || "{}"),
  });

  await db
    .update(processes)
    .set({ restartedFromId: processId })
    .where(eq(processes.id, fresh.id));

  return fresh;
}

export async function abandonProcess(processId: string) {
  await db
    .update(processes)
    .set({ status: "abandoned", completedAt: new Date() })
    .where(eq(processes.id, processId));
  await db
    .update(reminders)
    .set({ status: "cancelled" })
    .where(and(eq(reminders.processId, processId), eq(reminders.status, "pending")));
}

export async function completeStep(stepId: string, note?: string) {
  const [step] = await db
    .update(processSteps)
    .set({ completedAt: new Date(), ...(note ? { metadataJson: JSON.stringify({ note }) } : {}) })
    .where(eq(processSteps.id, stepId))
    .returning();
  if (!step) return null;

  if (note) {
    await db.insert(observations).values({
      processId: step.processId,
      stepId: step.id,
      kind: "free",
      body: note,
      recordedAt: new Date(),
    });
  }

  // Cancel any pending reminder for this step
  await db
    .update(reminders)
    .set({ status: "cancelled" })
    .where(and(eq(reminders.stepId, stepId), eq(reminders.status, "pending")));

  // If all steps complete, mark process complete
  const remaining = await db
    .select({ c: sql<number>`count(*)` })
    .from(processSteps)
    .where(
      and(
        eq(processSteps.processId, step.processId),
        isNull(processSteps.completedAt),
        eq(processSteps.skipped, false)
      )
    );
  if ((remaining[0]?.c ?? 0) === 0) {
    await db
      .update(processes)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(processes.id, step.processId));
  }

  return step;
}

export async function skipStep(stepId: string, reason?: string) {
  const [step] = await db
    .update(processSteps)
    .set({ skipped: true, completedAt: new Date(), skippedReason: reason ?? null })
    .where(eq(processSteps.id, stepId))
    .returning();
  await db
    .update(reminders)
    .set({ status: "cancelled" })
    .where(and(eq(reminders.stepId, stepId), eq(reminders.status, "pending")));
  return step ?? null;
}

export async function snoozeNextReminder(userId: string, minutes: number) {
  const [next] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.status, "pending")))
    .orderBy(asc(reminders.fireAt))
    .limit(1);
  if (!next) return null;
  const newFireAt = new Date(Date.now() + minutes * 60_000);
  await db.update(reminders).set({ fireAt: newFireAt }).where(eq(reminders.id, next.id));
  return { ...next, fireAt: newFireAt };
}

// ─── Read helpers ─────────────────────────────────────────────────────────

export async function getActiveProcesses(userId: string) {
  return db
    .select()
    .from(processes)
    .where(and(eq(processes.userId, userId), eq(processes.status, "active")))
    .orderBy(desc(processes.startedAt));
}

export async function getAllProcesses(userId: string) {
  return db
    .select()
    .from(processes)
    .where(eq(processes.userId, userId))
    .orderBy(desc(processes.startedAt));
}

export async function getProcess(processId: string) {
  const [p] = await db.select().from(processes).where(eq(processes.id, processId));
  return p ?? null;
}

export async function getProcessSteps(processId: string) {
  return db
    .select()
    .from(processSteps)
    .where(eq(processSteps.processId, processId))
    .orderBy(asc(processSteps.ordinal));
}

export async function getProcessObservations(processId: string) {
  return db
    .select()
    .from(observations)
    .where(eq(observations.processId, processId))
    .orderBy(desc(observations.recordedAt));
}

export async function getNextActions(userId: string, withinHours = 24) {
  const horizon = new Date(Date.now() + withinHours * 60 * 60 * 1000);
  return db
    .select({
      step: processSteps,
      process: processes,
    })
    .from(processSteps)
    .innerJoin(processes, eq(processSteps.processId, processes.id))
    .where(
      and(
        eq(processes.userId, userId),
        eq(processes.status, "active"),
        isNull(processSteps.completedAt),
        eq(processSteps.skipped, false),
        lt(processSteps.scheduledFor, horizon)
      )
    )
    .orderBy(asc(processSteps.scheduledFor));
}

export async function getMostRecentDueStep(userId: string) {
  const [row] = await db
    .select({
      step: processSteps,
      process: processes,
    })
    .from(processSteps)
    .innerJoin(processes, eq(processSteps.processId, processes.id))
    .where(
      and(
        eq(processes.userId, userId),
        eq(processes.status, "active"),
        isNull(processSteps.completedAt),
        eq(processSteps.skipped, false)
      )
    )
    .orderBy(asc(processSteps.scheduledFor))
    .limit(1);
  return row ?? null;
}

export async function recordObservation(input: {
  processId: string;
  stepId?: string;
  kind: "smell" | "rise" | "bubble" | "photo" | "temperature" | "free";
  body?: string;
  photoPath?: string;
  value?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(observations)
    .values({
      processId: input.processId,
      stepId: input.stepId ?? null,
      kind: input.kind,
      body: input.body ?? null,
      photoPath: input.photoPath ?? null,
      valueJson: JSON.stringify(input.value ?? {}),
      recordedAt: new Date(),
    })
    .returning();
  return row;
}

export async function getStarterDayInfo(userId: string) {
  const [active] = await db
    .select()
    .from(processes)
    .where(
      and(
        eq(processes.userId, userId),
        eq(processes.type, "starter_build"),
        eq(processes.status, "active")
      )
    )
    .orderBy(desc(processes.startedAt))
    .limit(1);
  if (!active) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const dayIndex = Math.min(14, Math.floor((Date.now() - active.startedAt.getTime()) / dayMs) + 1);
  return { process: active, dayIndex };
}
