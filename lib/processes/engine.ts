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
import { starterAnchorTime } from "./templates/starter-build";
import {
  syncProcessOnStart,
  syncProcessOnPause,
  syncProcessOnResume,
  syncStepCompleted,
  syncStepCancelled,
  syncProcessCancelled,
  syncStepUpserted,
} from "@/lib/google/sync";

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
  const starterNickname = pref?.starterNickname ?? "The starter";

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

  await syncProcessOnStart(opts.userId, proc.id).catch((e) =>
    console.error("[engine] gcal sync on start failed", e)
  );

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

  await syncProcessOnPause(processId).catch((e) =>
    console.error("[engine] gcal sync on pause failed", e)
  );
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

  await syncProcessOnResume(processId).catch((e) =>
    console.error("[engine] gcal sync on resume failed", e)
  );
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

  await syncProcessCancelled(processId).catch((e) =>
    console.error("[engine] gcal sync on abandon failed", e)
  );
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

  await syncStepCompleted(stepId).catch((e) =>
    console.error("[engine] gcal sync on completeStep failed", e)
  );

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

  await syncStepCancelled(stepId).catch((e) =>
    console.error("[engine] gcal sync on skipStep failed", e)
  );
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

// ─── Starter maturity extension ───────────────────────────────────────────

/**
 * Append one extra "Day N" feed step + reminder when the starter wasn't
 * mature at the previous checkpoint. Repeatable: each call extends by
 * one more day. Returns the new step + reminder, or null if not applicable.
 */
export async function extendStarterMaturity(processId: string, userId: string) {
  const [proc] = await db.select().from(processes).where(eq(processes.id, processId));
  if (!proc) throw new Error("Process not found");
  if (proc.userId !== userId) throw new Error("Forbidden");
  if (proc.type !== "starter_build") throw new Error("Not a starter build");
  if (proc.status !== "active") throw new Error("Process is not active");

  const [pref] = await db.select().from(preferences).where(eq(preferences.userId, userId));
  const starterNickname = pref?.starterNickname ?? "The starter";

  const nextDayIndex = 14 + proc.extensionDays + 1;
  const anchor = starterAnchorTime(proc.startedAt, nextDayIndex);

  // Mark prior maturity step as deferred (if still incomplete)
  const [priorStep] = await db
    .select()
    .from(processSteps)
    .where(and(eq(processSteps.processId, processId), eq(processSteps.dayIndex, nextDayIndex - 1)))
    .orderBy(desc(processSteps.ordinal))
    .limit(1);
  if (priorStep && !priorStep.completedAt) {
    await db
      .update(processSteps)
      .set({
        completedAt: new Date(),
        skipped: false,
        skippedReason: "deferred — needs another day",
      })
      .where(eq(processSteps.id, priorStep.id));
    await db
      .update(reminders)
      .set({ status: "cancelled" })
      .where(and(eq(reminders.stepId, priorStep.id), eq(reminders.status, "pending")));
  }

  const [maxOrdinalRow] = await db
    .select({ m: sql<number>`max(${processSteps.ordinal})` })
    .from(processSteps)
    .where(eq(processSteps.processId, processId));
  const nextOrdinal = (maxOrdinalRow?.m ?? 0) + 1;

  const stepKey = `day-${nextDayIndex}-extension`;
  const title = `Day ${nextDayIndex} — Extra feed`;
  const description = `${starterNickname} needs another day. One feed: discard to 75g, then 40g bread + 20g WW + 60g water. Re-check the float test in 4–6h.`;

  const [newStep] = await db
    .insert(processSteps)
    .values({
      processId,
      stepKey,
      title,
      description,
      ordinal: nextOrdinal,
      dayIndex: nextDayIndex,
      scheduledFor: anchor,
      metadataJson: JSON.stringify({ check: "triple-and-float", extension: true }),
    })
    .returning();

  await db.insert(reminders).values({
    userId,
    processId,
    stepId: newStep.id,
    fireAt: anchor,
    title: `${starterNickname} — Day ${nextDayIndex} extra feed`,
    body: "Float test didn't pass yesterday. Feed once today (75g + 40/20/60), re-check in 4–6h.",
    deepLink: `/journal/${processId}#${newStep.id}`,
  });

  await db
    .update(processes)
    .set({ extensionDays: proc.extensionDays + 1 })
    .where(eq(processes.id, processId));

  await syncStepUpserted(newStep.id).catch((e) =>
    console.error("[engine] gcal sync on extendStarterMaturity failed", e)
  );

  return newStep;
}

/**
 * Confirm the starter passed the float test. Marks the most recent maturity
 * step complete and the process as completed.
 */
export async function confirmStarterMature(processId: string, userId: string, note?: string) {
  const [proc] = await db.select().from(processes).where(eq(processes.id, processId));
  if (!proc) throw new Error("Process not found");
  if (proc.userId !== userId) throw new Error("Forbidden");
  if (proc.type !== "starter_build") throw new Error("Not a starter build");

  const checkpointDay = 14 + proc.extensionDays;
  const [step] = await db
    .select()
    .from(processSteps)
    .where(and(eq(processSteps.processId, processId), eq(processSteps.dayIndex, checkpointDay)))
    .orderBy(desc(processSteps.ordinal))
    .limit(1);

  if (step && !step.completedAt) {
    await completeStep(step.id, note ?? "Float test passed — starter mature");
  }

  await db
    .update(processes)
    .set({ status: "completed", completedAt: new Date(), notes: note ?? null })
    .where(eq(processes.id, processId));

  await db
    .update(reminders)
    .set({ status: "cancelled" })
    .where(and(eq(reminders.processId, processId), eq(reminders.status, "pending")));

  await syncProcessCancelled(processId).catch((e) =>
    console.error("[engine] gcal sync on confirmStarterMature failed", e)
  );

  return step ?? null;
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
  const cap = 14 + active.extensionDays;
  const dayIndex = Math.min(cap, Math.floor((Date.now() - active.startedAt.getTime()) / dayMs) + 1);

  // Surface a pending maturity-check step so the UI can show extend/confirm buttons.
  const [maturityStep] = await db
    .select()
    .from(processSteps)
    .where(
      and(
        eq(processSteps.processId, active.id),
        isNull(processSteps.completedAt),
        eq(processSteps.skipped, false)
      )
    )
    .orderBy(desc(processSteps.ordinal))
    .limit(1);

  let pendingMaturityStep: typeof maturityStep | null = null;
  if (maturityStep) {
    try {
      const meta = JSON.parse(maturityStep.metadataJson || "{}");
      if (meta.check === "triple-and-float") pendingMaturityStep = maturityStep;
    } catch {
      // ignore
    }
  }

  return {
    process: active,
    dayIndex,
    extensionDays: active.extensionDays,
    pendingMaturityStep,
  };
}
