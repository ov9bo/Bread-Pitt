import "server-only";
import { addMinutes } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { googleAccounts } from "@/lib/db/schema";
import { getAuthorizedAccessToken } from "./oauth";
import { fetchWithTimeout } from "@/lib/utils/fetch";

const API_BASE = "https://www.googleapis.com/calendar/v3";
const CALENDAR_NAME = "Bread Pitt";

type EventInput = {
  summary?: string;
  description?: string;
  start?: Date;
  durationMinutes?: number;
};

async function getToken(userId: string): Promise<string | null> {
  try {
    return await getAuthorizedAccessToken(userId);
  } catch (e) {
    console.error("[gcal] auth failed for", userId, e);
    return null;
  }
}

async function gfetch(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetchWithTimeout(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Make sure the user has a dedicated "Bread Pitt" calendar and store its id.
 * Returns the calendar id, or null if the request fails.
 */
export async function ensureBreadPittCalendar(userId: string): Promise<string | null> {
  const [account] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, userId));
  if (!account) return null;
  if (account.calendarId) return account.calendarId;

  const token = await getToken(userId);
  if (!token) return null;

  // Look for existing calendar by summary first
  try {
    const list = await gfetch(token, "/users/me/calendarList?minAccessRole=owner");
    if (list.ok) {
      const data = (await list.json()) as { items?: Array<{ id: string; summary: string }> };
      const found = data.items?.find((c) => c.summary === CALENDAR_NAME);
      if (found) {
        await db
          .update(googleAccounts)
          .set({ calendarId: found.id })
          .where(eq(googleAccounts.id, account.id));
        return found.id;
      }
    }
  } catch (e) {
    console.error("[gcal] calendarList failed", e);
  }

  try {
    const res = await gfetch(token, "/calendars", {
      method: "POST",
      body: JSON.stringify({
        summary: CALENDAR_NAME,
        description: "Sourdough timeline managed by Bread Pitt.",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    if (!res.ok) {
      console.error("[gcal] create calendar failed", res.status, await res.text());
      return null;
    }
    const created = (await res.json()) as { id: string };
    await db
      .update(googleAccounts)
      .set({ calendarId: created.id })
      .where(eq(googleAccounts.id, account.id));
    return created.id;
  } catch (e) {
    console.error("[gcal] create calendar threw", e);
    return null;
  }
}

export async function createCalendarEvent(
  userId: string,
  calendarId: string,
  input: Required<Pick<EventInput, "summary" | "start" | "durationMinutes">> &
    Pick<EventInput, "description">
): Promise<string | null> {
  const token = await getToken(userId);
  if (!token) return null;
  const end = addMinutes(input.start, input.durationMinutes);
  try {
    const res = await gfetch(
      token,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        body: JSON.stringify({
          summary: input.summary,
          description: input.description ?? "",
          start: { dateTime: input.start.toISOString() },
          end: { dateTime: end.toISOString() },
          reminders: { useDefault: true },
        }),
      }
    );
    if (!res.ok) {
      console.error("[gcal] insert event failed", res.status, await res.text());
      return null;
    }
    const body = (await res.json()) as { id: string };
    return body.id;
  } catch (e) {
    console.error("[gcal] insert event threw", e);
    return null;
  }
}

export async function patchCalendarEvent(
  userId: string,
  calendarId: string,
  eventId: string,
  input: EventInput
): Promise<boolean> {
  const token = await getToken(userId);
  if (!token) return false;
  const body: Record<string, unknown> = {};
  if (input.summary !== undefined) body.summary = input.summary;
  if (input.description !== undefined) body.description = input.description;
  if (input.start !== undefined) {
    const dur = input.durationMinutes ?? 30;
    body.start = { dateTime: input.start.toISOString() };
    body.end = { dateTime: addMinutes(input.start, dur).toISOString() };
  }
  try {
    const res = await gfetch(
      token,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      console.error("[gcal] patch event failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[gcal] patch event threw", e);
    return false;
  }
}

export async function deleteCalendarEvent(
  userId: string,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  const token = await getToken(userId);
  if (!token) return false;
  try {
    const res = await gfetch(
      token,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" }
    );
    // 410 Gone is fine — already deleted
    if (!res.ok && res.status !== 410 && res.status !== 404) {
      console.error("[gcal] delete event failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[gcal] delete event threw", e);
    return false;
  }
}
