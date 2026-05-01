import { z } from "zod";

// Google OAuth callback query params. `code` and `state` are required on success;
// `error` is set when the user denies consent.
export const googleOAuthCallbackSchema = z
  .object({
    code: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    error: z.string().min(1).max(200).optional(),
  })
  .refine((d) => d.error || (d.code && d.state), {
    message: "Missing code/state or error",
  });

export type GoogleOAuthCallback = z.infer<typeof googleOAuthCallbackSchema>;

// Telegram webhook envelope. grammY parses the body itself, but we sanity-check
// the outer shape so an obviously bogus POST 400s before reaching the bot.
export const telegramUpdateSchema = z
  .object({
    update_id: z.number(),
  })
  .passthrough();

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
