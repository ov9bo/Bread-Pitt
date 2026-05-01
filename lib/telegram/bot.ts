import "server-only";
import { Bot, webhookCallback } from "grammy";
import { db } from "@/lib/db/client";
import { users, preferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  completeStep,
  getMostRecentDueStep,
  getActiveProcesses,
  getNextActions,
  recordObservation,
  snoozeNextReminder,
  extendStarterMaturity,
  confirmStarterMature,
} from "@/lib/processes/engine";
import { renderTodaySummary, renderStatus } from "./templates";

export type ReplyMarkup = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

let _bot: Bot | null = null;

export function getBot(): Bot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (_bot) return _bot;
  const bot = new Bot(token);
  registerCommands(bot);
  _bot = bot;
  return bot;
}

function registerCommands(bot: Bot) {
  bot.command("start", async (ctx) => {
    const code = (ctx.match || "").trim();
    if (!code) {
      await ctx.reply(
        "Welcome — I'm your sourdough companion bot. Open the app's Settings page to generate a 6-digit pairing code, then send /start <code> to link this chat."
      );
      return;
    }
    // Find user with matching pairing code
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramPairingCode, code));
    if (
      !user ||
      !user.telegramPairingExpiresAt ||
      user.telegramPairingExpiresAt.getTime() < Date.now()
    ) {
      await ctx.reply("That code didn't match (or expired). Generate a new one in Settings.");
      return;
    }
    await db
      .update(users)
      .set({
        telegramChatId: String(ctx.chat.id),
        telegramPairingCode: null,
        telegramPairingExpiresAt: null,
      })
      .where(eq(users.id, user.id));
    await ctx.reply(
      `Linked. I'll keep an eye on ${user.displayName ?? "your kitchen"}.\n\nCommands you can use:\n/today  — what's next\n/done   — mark the most recent due step complete\n/snooze 30m — push the next reminder\n/status — health of active processes\n/photo  — attach a photo to log it`
    );
  });

  bot.command("today", async (ctx) => {
    const userId = await userIdFromCtx(ctx);
    if (!userId) return;
    const list = await getNextActions(userId, 24);
    await ctx.reply(renderTodaySummary(list), { parse_mode: "HTML" });
  });

  bot.command("status", async (ctx) => {
    const userId = await userIdFromCtx(ctx);
    if (!userId) return;
    const active = await getActiveProcesses(userId);
    await ctx.reply(renderStatus(active), { parse_mode: "HTML" });
  });

  bot.command("done", async (ctx) => {
    const userId = await userIdFromCtx(ctx);
    if (!userId) return;
    const next = await getMostRecentDueStep(userId);
    if (!next) {
      await ctx.reply("Nothing due right now. Take a breath.");
      return;
    }
    await completeStep(next.step.id);
    await ctx.reply(`Marked done: <i>${escape(next.step.title)}</i>`, { parse_mode: "HTML" });
  });

  bot.command("snooze", async (ctx) => {
    const userId = await userIdFromCtx(ctx);
    if (!userId) return;
    const arg = (ctx.match || "30m").trim();
    const m = parseDuration(arg) ?? 30;
    const r = await snoozeNextReminder(userId, m);
    if (!r) {
      await ctx.reply("No pending reminders to snooze.");
      return;
    }
    await ctx.reply(`Snoozed by ${m} min. Next ping at ${r.fireAt.toLocaleTimeString()}.`);
  });

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data ?? "";
    const userId = await userIdFromCtx(ctx);
    if (!userId) {
      await ctx.answerCallbackQuery({ text: "Pair this chat first.", show_alert: true });
      return;
    }
    const [action, processId] = data.split(":");
    try {
      if (action === "confirm" && processId) {
        await confirmStarterMature(processId, userId);
        await ctx.answerCallbackQuery({ text: "Float passed — starter is mature." });
        await ctx.editMessageText(
          `<b>Starter mature</b>\nMarked complete. Time to bake.`,
          { parse_mode: "HTML" }
        );
      } else if (action === "extend" && processId) {
        const step = await extendStarterMaturity(processId, userId);
        await ctx.answerCallbackQuery({ text: "Added another day." });
        const when = step?.scheduledFor.toLocaleString() ?? "tomorrow";
        await ctx.editMessageText(
          `<b>Another day added</b>\nNext check: ${escape(when)}`,
          { parse_mode: "HTML" }
        );
      } else {
        await ctx.answerCallbackQuery({ text: "Unknown action." });
      }
    } catch (e) {
      console.error("[telegram] callback failed", e);
      await ctx.answerCallbackQuery({
        text: "Something went sideways. Try the in-app buttons.",
        show_alert: true,
      });
    }
  });

  bot.on("message:photo", async (ctx) => {
    const userId = await userIdFromCtx(ctx);
    if (!userId) return;
    const next = await getMostRecentDueStep(userId);
    if (!next) {
      await ctx.reply("Logged photo, but no active step to attach it to.");
      return;
    }
    // Download the largest photo
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const fname = `tg-${Date.now()}-${photo.file_unique_id}.jpg`;
    const dest = path.resolve(process.cwd(), "data", "uploads", fname);
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buf);
    await recordObservation({
      processId: next.process.id,
      stepId: next.step.id,
      kind: "photo",
      photoPath: `/uploads/${fname}`,
      body: ctx.message.caption,
    });
    await ctx.reply(`Photo logged to <i>${escape(next.step.title)}</i>.`, { parse_mode: "HTML" });
  });
}

function parseDuration(s: string): number | null {
  const m = /^(\d+)\s*(m|min|h|hr|hours?|minutes?)?$/i.exec(s.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = (m[2] || "m").toLowerCase();
  if (unit.startsWith("h")) return n * 60;
  return n;
}

async function userIdFromCtx(ctx: import("grammy").Context): Promise<string | null> {
  const chatId = String(ctx.chat?.id ?? "");
  if (!chatId) return null;
  const [u] = await db.select().from(users).where(eq(users.telegramChatId, chatId));
  if (!u) {
    await ctx.reply("This chat isn't paired yet. Visit Settings in the app for a code, then send /start <code>.");
    return null;
  }
  return u.id;
}

function escape(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
}

export function makeWebhookHandler() {
  const bot = getBot();
  if (!bot) return null;
  return webhookCallback(bot, "std/http", {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
  });
}

export async function sendMessage(
  chatId: string,
  text: string,
  opts?: { parseMode?: "HTML" | "MarkdownV2"; replyMarkup?: ReplyMarkup }
) {
  const bot = getBot();
  if (!bot) throw new Error("Bot not configured");
  await bot.api.sendMessage(chatId, text, {
    parse_mode: opts?.parseMode ?? "HTML",
    link_preview_options: { is_disabled: true },
    ...(opts?.replyMarkup ? { reply_markup: opts.replyMarkup } : {}),
  });
}

export function maturityKeyboard(processId: string): ReplyMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Float passed", callback_data: `confirm:${processId}` },
        { text: "Needs another day", callback_data: `extend:${processId}` },
      ],
    ],
  };
}
