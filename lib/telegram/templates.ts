import { format } from "date-fns";
import type { processes, processSteps } from "@/lib/db/schema";

type Row = { step: typeof processSteps.$inferSelect; process: typeof processes.$inferSelect };

export function renderTodaySummary(rows: Row[]): string {
  if (rows.length === 0) {
    return "Nothing on the calendar in the next 24 hours. The starter is doing its quiet work.";
  }
  const lines = rows.map((r) => {
    const when = format(r.step.scheduledFor, "EEE HH:mm");
    return `• <b>${when}</b> — ${escape(r.step.title)}`;
  });
  return `<b>Next 24 hours</b>\n${lines.join("\n")}`;
}

export function renderStatus(active: (typeof processes.$inferSelect)[]): string {
  if (active.length === 0) return "No active processes right now.";
  return active
    .map((p) => {
      const days = Math.floor((Date.now() - p.startedAt.getTime()) / (24 * 60 * 60 * 1000));
      return `• <b>${escape(p.nickname ?? p.type)}</b> (${escape(p.type)}) — running ${days}d`;
    })
    .join("\n");
}

export function renderReminder(title: string, body: string, deepLink?: string, baseUrl?: string): string {
  const link = deepLink && baseUrl ? `\n\n<a href="${baseUrl}${deepLink}">Open in app →</a>` : "";
  return `<b>${escape(title)}</b>\n${escape(body)}${link}`;
}

function escape(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
}
