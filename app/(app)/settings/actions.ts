"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth/session";
import { destroySession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { preferences, users } from "@/lib/db/schema";
import { generatePairingCode, unlinkTelegram } from "@/lib/telegram/pairing";

const prefsSchema = z.object({
  starterNickname: z.string().min(1).max(40),
  displayName: z.string().min(1).max(40),
  kitchenTempF: z.coerce.number().min(50).max(110),
  notificationsEnabled: z
    .union([z.literal("on"), z.literal("off"), z.string()])
    .transform((v) => v === "on"),
  quietHoursStart: z.coerce.number().int().min(0).max(23),
  quietHoursEnd: z.coerce.number().int().min(0).max(23),
});

export async function savePreferencesAction(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const parsed = prefsSchema.parse({
    starterNickname: formData.get("starterNickname"),
    displayName: formData.get("displayName"),
    kitchenTempF: formData.get("kitchenTempF"),
    notificationsEnabled: formData.get("notificationsEnabled") ?? "off",
    quietHoursStart: formData.get("quietHoursStart"),
    quietHoursEnd: formData.get("quietHoursEnd"),
  });

  await db
    .update(users)
    .set({ displayName: parsed.displayName })
    .where(eq(users.id, user.id));

  // Upsert preferences
  const [existing] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, user.id));

  if (existing) {
    await db
      .update(preferences)
      .set({
        starterNickname: parsed.starterNickname,
        kitchenTempF: parsed.kitchenTempF,
        notificationsEnabled: parsed.notificationsEnabled,
        quietHoursStart: parsed.quietHoursStart,
        quietHoursEnd: parsed.quietHoursEnd,
      })
      .where(eq(preferences.userId, user.id));
  } else {
    await db.insert(preferences).values({
      userId: user.id,
      starterNickname: parsed.starterNickname,
      kitchenTempF: parsed.kitchenTempF,
      notificationsEnabled: parsed.notificationsEnabled,
      quietHoursStart: parsed.quietHoursStart,
      quietHoursEnd: parsed.quietHoursEnd,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/");
}

const passwordSchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(8, "At least 8 characters."),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    message: "New passwords don't match.",
    path: ["confirm"],
  });

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const parsed = passwordSchema.parse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });

  const ok = await bcrypt.compare(parsed.current, user.passwordHash);
  if (!ok) throw new Error("Current password is incorrect.");

  const newHash = await bcrypt.hash(parsed.next, 12);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
  revalidatePath("/settings");
}

export async function generatePairingCodeAction(): Promise<string> {
  const user = await requireUser();
  if (!user) redirect("/login");
  const code = await generatePairingCode(user.id);
  revalidatePath("/settings");
  return code;
}

export async function unlinkTelegramAction() {
  const user = await requireUser();
  if (!user) redirect("/login");
  await unlinkTelegram(user.id);
  revalidatePath("/settings");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
