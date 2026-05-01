"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/auth/rate-limit";

const Schema = z.object({
  password: z.string().min(1).max(256),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

async function getIp(): Promise<string> {
  // Behind Caddy, the real IP is in X-Forwarded-For.
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await getIp();
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    return {
      error: `Too many attempts. Try again in ${Math.ceil(rateLimit.retryAfterSec / 60)} minute(s).`,
    };
  }

  const parsed = Schema.safeParse({
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: "Please enter your password." };

  const { password, next } = parsed.data;

  // Single-user app: there is exactly one row in `users`.
  const all = await db.select().from(users);
  const user = all[0];
  if (!user) {
    return { error: "No baker is set up yet. Run `pnpm seed:admin <password>` to begin." };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "That password didn't rise — try again." };

  resetLoginRateLimit(ip);
  await createSession(user.id);
  redirect(next && next.startsWith("/") ? next : "/");
}
