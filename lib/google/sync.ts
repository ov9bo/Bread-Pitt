import "server-only";
/**
 * Thin facade over the Google Calendar integration. Each function here is
 * a no-op when the user hasn't connected a Google account or has disabled
 * sync in preferences. The engine wraps every call in try/catch so a
 * Calendar outage never blocks the core process flow.
 */
import { db } from "@/lib/db/client";
import {
  googleAccounts,
  googleEvents,
  preferences,
  processSteps,
  processes,
  users,
} from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  ensureBreadPittCalendar,
  patchCalendarEvent,
} from "./calendar";

async function userIsSyncing(userId: string): Promise<{
  account: typeof googleAccounts.$inferSelect;
  user: typeof users.$inferSelect;
} | null> {
  const [pref] = await db.select().from(preferences).where(eq(preferences.userId, userId));
  if (pref && pref.googleCalendarSyncEnabled === false) return null;
  const [account] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, userId));
  if (!account) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  return { account, user };
}

function describeStep(
  step: typeof processSteps.$inferSelect,
  proc: typeof processes.$inferSelect
): string {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "";
  const link = `${baseUrl}/journal/${proc.id}#${step.id}`;
  const lines: string[] = [];
  if (step.description) lines.push(step.description);
  lines.push("");
  lines.push(`Bread Pitt · ${proc.nickname ?? proc.type}`);
  if (baseUrl) lines.push(`Open in app: ${link}`);
  return lines.join("\n");
}

function eventTitle(step: typeof processSteps.$inferSelect): string {
  return `🍞 ${step.title}`;
}

const DEFAULT_DURATION_MIN = 30;

export async function syncProcessOnStart(userId: string, processId: string): Promise<void> {
  const ctx = await userIsSyncing(userId);
  if (!ctx) return;

  const calendarId = await ensureBreadPittCalendar(userId);
  if (!calendarId) return;

  const [proc] = await db.select().from(processes).where(eq(processes.id, processId));
  if (!proc) return;
  const steps = await db
    .select()
    .from(processSteps)
    .where(eq(processSteps.processId, processId));

  for (const step of steps) {
    if (step.completedAt) continue;
    try {
      const eventId = await createCalendarEvent(userId, calendarId, {
        summary: eventTitle(step),
        description: describeStep(step, proc),
        start: step.scheduledFor,
        durationMinutes: DEFAULT_DURATION_MIN,
      });
      if (!eventId) continue;
      await db.insert(googleEvents).values({
        stepId: step.id,
        processId: proc.id,
        userId,
        eventId,
        calendarId,
        status: "active",
        lastSyncedAt: new Date(),
      });
    } catch (e) {
      console.error("[gcal] failed to push step", step.id, e);
    }
  }
}

export async function syncProcessOnPause(processId: string): Promise<void> {
  const events = await db
    .select()
    .from(googleEvents)
    .where(and(eq(googleEvents.processId, processId), eq(googleEvents.status, "active")));
  for (const ev of events) {
    const [step] = await db.select().from(processSteps).where(eq(processSteps.id, ev.stepId));
    if (!step || step.completedAt) continue;
    try {
      await deleteCalendarEvent(ev.userId, ev.calendarId, ev.eventId);
      await db
        .update(googleEvents)
        .set({ status: "cancelled", lastSyncedAt: new Date() })
        .where(eq(googleEvents.id, ev.id));
    } catch (e) {
      console.error("[gcal] failed to cancel on pause", ev.id, e);
    }
  }
}

export async function syncProcessOnResume(processId: string): Promise<void> {
  const [proc] = await db.select().from(processes).where(eq(processes.id, processId));
  if (!proc) return;
  const ctx = await userIsSyncing(proc.userId);
  if (!ctx) return;
  const calendarId =
    ctx.account.calendarId ?? (await ensureBreadPittCalendar(proc.userId));
  if (!calendarId) return;

  const remainingSteps = await db
    .select()
    .from(processSteps)
    .where(and(eq(processSteps.processId, processId), isNull(processSteps.completedAt)));

  for (const step of remainingSteps) {
    const [existing] = await db
      .select()
      .from(googleEvents)
      .where(eq(googleEvents.stepId, step.id));

    if (existing && existing.status === "active") {
      try {
        await patchCalendarEvent(proc.userId, existing.calendarId, existing.eventId, {
          start: step.scheduledFor,
          durationMinutes: DEFAULT_DURATION_MIN,
        });
        await db
          .update(googleEvents)
          .set({ lastSyncedAt: new Date() })
          .where(eq(googleEvents.id, existing.id));
      } catch (e) {
        console.error("[gcal] failed to patch on resume", existing.id, e);
      }
      continue;
    }

    try {
      const eventId = await createCalendarEvent(proc.userId, calendarId, {
        summary: eventTitle(step),
        description: describeStep(step, proc),
        start: step.scheduledFor,
        durationMinutes: DEFAULT_DURATION_MIN,
      });
      if (!eventId) continue;
      if (existing) {
        await db
          .update(googleEvents)
          .set({
            eventId,
            calendarId,
            status: "active",
            lastSyncedAt: new Date(),
          })
          .where(eq(googleEvents.id, existing.id));
      } else {
        await db.insert(googleEvents).values({
          stepId: step.id,
          processId,
          userId: proc.userId,
          eventId,
          calendarId,
          status: "active",
          lastSyncedAt: new Date(),
        });
      }
    } catch (e) {
      console.error("[gcal] failed to recreate on resume", step.id, e);
    }
  }
}

export async function syncStepCompleted(stepId: string): Promise<void> {
  const [ev] = await db.select().from(googleEvents).where(eq(googleEvents.stepId, stepId));
  if (!ev) return;
  if (ev.status !== "active") return;
  try {
    // Mark complete by prefixing the title with ✓; no need to remove.
    const [step] = await db.select().from(processSteps).where(eq(processSteps.id, stepId));
    if (!step) return;
    await patchCalendarEvent(ev.userId, ev.calendarId, ev.eventId, {
      summary: `✓ ${step.title}`,
    });
    await db
      .update(googleEvents)
      .set({ lastSyncedAt: new Date() })
      .where(eq(googleEvents.id, ev.id));
  } catch (e) {
    console.error("[gcal] failed to mark step complete", stepId, e);
  }
}

export async function syncStepCancelled(stepId: string): Promise<void> {
  const [ev] = await db.select().from(googleEvents).where(eq(googleEvents.stepId, stepId));
  if (!ev || ev.status !== "active") return;
  try {
    await deleteCalendarEvent(ev.userId, ev.calendarId, ev.eventId);
    await db
      .update(googleEvents)
      .set({ status: "cancelled", lastSyncedAt: new Date() })
      .where(eq(googleEvents.id, ev.id));
  } catch (e) {
    console.error("[gcal] failed to cancel step event", stepId, e);
  }
}

export async function syncProcessCancelled(processId: string): Promise<void> {
  const events = await db
    .select()
    .from(googleEvents)
    .where(and(eq(googleEvents.processId, processId), eq(googleEvents.status, "active")));
  for (const ev of events) {
    const [step] = await db.select().from(processSteps).where(eq(processSteps.id, ev.stepId));
    if (step?.completedAt) continue;
    try {
      await deleteCalendarEvent(ev.userId, ev.calendarId, ev.eventId);
      await db
        .update(googleEvents)
        .set({ status: "cancelled", lastSyncedAt: new Date() })
        .where(eq(googleEvents.id, ev.id));
    } catch (e) {
      console.error("[gcal] failed to cancel process event", ev.id, e);
    }
  }
}

/** Insert or update a single step's calendar event. Used after extending. */
export async function syncStepUpserted(stepId: string): Promise<void> {
  const [step] = await db.select().from(processSteps).where(eq(processSteps.id, stepId));
  if (!step) return;
  const [proc] = await db.select().from(processes).where(eq(processes.id, step.processId));
  if (!proc) return;
  const ctx = await userIsSyncing(proc.userId);
  if (!ctx) return;
  const calendarId =
    ctx.account.calendarId ?? (await ensureBreadPittCalendar(proc.userId));
  if (!calendarId) return;

  const [existing] = await db
    .select()
    .from(googleEvents)
    .where(eq(googleEvents.stepId, stepId));

  if (existing && existing.status === "active") {
    try {
      await patchCalendarEvent(proc.userId, existing.calendarId, existing.eventId, {
        summary: eventTitle(step),
        description: describeStep(step, proc),
        start: step.scheduledFor,
        durationMinutes: DEFAULT_DURATION_MIN,
      });
      await db
        .update(googleEvents)
        .set({ lastSyncedAt: new Date() })
        .where(eq(googleEvents.id, existing.id));
    } catch (e) {
      console.error("[gcal] failed to patch upserted step", stepId, e);
    }
    return;
  }

  try {
    const eventId = await createCalendarEvent(proc.userId, calendarId, {
      summary: eventTitle(step),
      description: describeStep(step, proc),
      start: step.scheduledFor,
      durationMinutes: DEFAULT_DURATION_MIN,
    });
    if (!eventId) return;
    if (existing) {
      await db
        .update(googleEvents)
        .set({
          eventId,
          calendarId,
          status: "active",
          lastSyncedAt: new Date(),
        })
        .where(eq(googleEvents.id, existing.id));
    } else {
      await db.insert(googleEvents).values({
        stepId,
        processId: proc.id,
        userId: proc.userId,
        eventId,
        calendarId,
        status: "active",
        lastSyncedAt: new Date(),
      });
    }
  } catch (e) {
    console.error("[gcal] failed to insert upserted step", stepId, e);
  }
}

/**
 * Backfill events for every incomplete step of every active process for the
 * given user. Called from the OAuth callback after the account is connected.
 */
export async function backfillUserCalendar(userId: string): Promise<{ created: number }> {
  const ctx = await userIsSyncing(userId);
  if (!ctx) return { created: 0 };
  const calendarId = await ensureBreadPittCalendar(userId);
  if (!calendarId) return { created: 0 };

  const active = await db
    .select()
    .from(processes)
    .where(and(eq(processes.userId, userId), eq(processes.status, "active")));
  if (active.length === 0) return { created: 0 };

  const procIds = active.map((p) => p.id);
  const steps = await db
    .select()
    .from(processSteps)
    .where(
      and(
        inArray(processSteps.processId, procIds),
        isNull(processSteps.completedAt),
        eq(processSteps.skipped, false)
      )
    );

  const procById = new Map(active.map((p) => [p.id, p]));
  let created = 0;

  for (const step of steps) {
    const [existing] = await db
      .select()
      .from(googleEvents)
      .where(eq(googleEvents.stepId, step.id));
    if (existing && existing.status === "active") continue;

    const proc = procById.get(step.processId);
    if (!proc) continue;
    try {
      const eventId = await createCalendarEvent(userId, calendarId, {
        summary: eventTitle(step),
        description: describeStep(step, proc),
        start: step.scheduledFor,
        durationMinutes: DEFAULT_DURATION_MIN,
      });
      if (!eventId) continue;
      if (existing) {
        await db
          .update(googleEvents)
          .set({
            eventId,
            calendarId,
            status: "active",
            lastSyncedAt: new Date(),
          })
          .where(eq(googleEvents.id, existing.id));
      } else {
        await db.insert(googleEvents).values({
          stepId: step.id,
          processId: step.processId,
          userId,
          eventId,
          calendarId,
          status: "active",
          lastSyncedAt: new Date(),
        });
      }
      created += 1;
    } catch (e) {
      console.error("[gcal] backfill failed for step", step.id, e);
    }
  }
  return { created };
}
