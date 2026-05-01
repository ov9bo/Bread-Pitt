"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { snoozeNextReminder } from "@/lib/processes/engine";
import { requireUser } from "@/lib/auth/session";

export async function snoozeNextReminderAction(minutes: number) {
  const user = await requireUser();
  if (!user) redirect("/login");
  await snoozeNextReminder(user.id, minutes);
  revalidatePath("/");
}
