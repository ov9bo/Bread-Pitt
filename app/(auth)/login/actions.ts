"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";

const Schema = z.object({
  password: z.string().min(1).max(256),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
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

  await createSession(user.id);
  redirect(next && next.startsWith("/") ? next : "/");
}
