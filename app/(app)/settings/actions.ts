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
import { revokeAndDelete } from "@/lib/google/oauth";
import { syncProcessCancelled } from "@/lib/google/sync";
import { processes as processesTable } from "@/lib/db/schema";
const cToF = (c: number) => (c * 9) / 5 + 32;

const prefsSchema = z.object({
  starterNickname: z.string().min(1).max(40),
  displayName: z.string().min(1).max(40),
  kitchenTempC: z.coerce.number().min(10).max(43),
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
    kitchenTempC: formData.get("kitchenTempC"),
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
        kitchenTempF: cToF(parsed.kitchenTempC),
        notificationsEnabled: parsed.notificationsEnabled,
        quietHoursStart: parsed.quietHoursStart,
        quietHoursEnd: parsed.quietHoursEnd,
      })
      .where(eq(preferences.userId, user.id));
  } else {
    await db.insert(preferences).values({
      userId: user.id,
      starterNickname: parsed.starterNickname,
      kitchenTempF: cToF(parsed.kitchenTempC),
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

export async function disconnectGoogleAction() {
  const user = await requireUser();
  if (!user) redirect("/login");

  // Cancel all active calendar events for this user's active processes first.
  const active = await db
    .select()
    .from(processesTable)
    .where(eq(processesTable.userId, user.id));
  for (const p of active) {
    try {
      await syncProcessCancelled(p.id);
    } catch (e) {
      console.error("[google] failed to cancel events for", p.id, e);
    }
  }

  await revokeAndDelete(user.id);
  revalidatePath("/settings");
}

export async function setGoogleSyncEnabledAction(enabled: boolean) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const [existing] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, user.id));
  if (existing) {
    await db
      .update(preferences)
      .set({ googleCalendarSyncEnabled: enabled })
      .where(eq(preferences.userId, user.id));
  } else {
    await db.insert(preferences).values({
      userId: user.id,
      googleCalendarSyncEnabled: enabled,
    });
  }
  revalidatePath("/settings");
}
