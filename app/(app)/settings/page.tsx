import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Bell, Calendar, KeyRound, LogOut, MessageCircle, ThermometerSun } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { googleAccounts, preferences } from "@/lib/db/schema";
import { Card, CardEyebrow } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { savePreferencesAction, logoutAction } from "./actions";
import { TelegramPanel } from "./TelegramPanel";
import { PasswordPanel } from "./PasswordPanel";
import { GoogleCalendarPanel } from "./GoogleCalendarPanel";
import { googleConfigured } from "@/lib/google/oauth";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";
const fToC = (f: number) => ((f - 32) * 5) / 9;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const [pref] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, user.id));

  const linked = !!user.telegramChatId;
  const pairingActive =
    !!user.telegramPairingCode &&
    !!user.telegramPairingExpiresAt &&
    user.telegramPairingExpiresAt.getTime() > Date.now();

  const [googleAccount] = await db
    .select()
    .from(googleAccounts)
    .where(eq(googleAccounts.userId, user.id));
  const params = await searchParams;
  const googleParam = typeof params.google === "string" ? params.google : null;
  const backfilledParam = typeof params.backfilled === "string" ? params.backfilled : null;
  const reasonParam = typeof params.reason === "string" ? params.reason : null;

  return (
    <>
      <ScrollReveal>
        <header className="border-b border-[var(--color-line-soft)] pb-8 mb-12">
          <div className="text-[10px] font-mono uppercase tracking-[0.32em] text-[var(--color-crust)] mb-3">
            Quiet adjustments
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-balance leading-[0.96] tracking-tight">
            Settings
          </h1>
          <p className="mt-5 max-w-prose font-display italic text-lg text-[var(--color-ink-muted)] text-pretty">
            Telegram pairing, kitchen temperature, quiet hours, password. Calm controls for a calm tool.
          </p>
        </header>
      </ScrollReveal>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* Preferences */}
        <ScrollReveal>
          <Card tone="flour" className="p-7">
            <div className="flex items-center gap-2.5 mb-1">
              <ThermometerSun size={14} className="text-[var(--color-crust)]" />
              <CardEyebrow>The kitchen</CardEyebrow>
            </div>
            <h2 className="font-display text-2xl mt-1 mb-6">How your space behaves</h2>

            <form action={savePreferencesAction} className="space-y-5">
              <FieldGroup>
                <Label htmlFor="displayName">Your name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={user.displayName}
                  required
                  maxLength={40}
                />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="starterNickname" hint="What do you call your starter?">
                  Starter nickname
                </Label>
                <Input
                  id="starterNickname"
                  name="starterNickname"
                  defaultValue={pref?.starterNickname ?? "The starter"}
                  required
                  maxLength={40}
                />
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="kitchenTempC" hint="Used to time fermentation.">
                  Kitchen temperature (°C)
                </Label>
                <Input
                  id="kitchenTempC"
                  name="kitchenTempC"
                  type="number"
                  min={10}
                  max={43}
                  step="0.1"
                  defaultValue={pref?.kitchenTempF ? Number(fToC(pref.kitchenTempF).toFixed(1)) : 25}
                  className="numerals-tabular"
                  required
                />
              </FieldGroup>

              <div className="grid grid-cols-2 gap-4">
                <FieldGroup>
                  <Label htmlFor="quietHoursStart">Quiet from (hour)</Label>
                  <Input
                    id="quietHoursStart"
                    name="quietHoursStart"
                    type="number"
                    min={0}
                    max={23}
                    defaultValue={pref?.quietHoursStart ?? 22}
                    className="numerals-tabular"
                    required
                  />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="quietHoursEnd">Quiet until (hour)</Label>
                  <Input
                    id="quietHoursEnd"
                    name="quietHoursEnd"
                    type="number"
                    min={0}
                    max={23}
                    defaultValue={pref?.quietHoursEnd ?? 7}
                    className="numerals-tabular"
                    required
                  />
                </FieldGroup>
              </div>

              <FieldGroup>
                <Label htmlFor="notificationsEnabled" hint="Master switch for Telegram nudges.">
                  Notifications
                </Label>
                <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-crumb)]/40 px-4 py-3 cursor-pointer hover:border-[var(--color-crust)]/40 transition-colors">
                  <input
                    id="notificationsEnabled"
                    name="notificationsEnabled"
                    type="checkbox"
                    defaultChecked={pref?.notificationsEnabled ?? true}
                    className="h-4 w-4 accent-[var(--color-crust)]"
                  />
                  <Bell size={14} className="text-[var(--color-ink-muted)]" />
                  <span className="text-sm">Send Telegram messages for due steps</span>
                </label>
              </FieldGroup>

              <Button type="submit" size="md">
                Save changes
              </Button>
            </form>
          </Card>
        </ScrollReveal>

        {/* Telegram + password column */}
        <div className="space-y-8">
          <ScrollReveal delay={0.05}>
            <Card tone="flour" className="p-7">
              <div className="flex items-center gap-2.5 mb-1">
                <MessageCircle size={14} className="text-[var(--color-crust)]" />
                <CardEyebrow>The bot</CardEyebrow>
              </div>
              <h2 className="font-display text-2xl mt-1 mb-2">Telegram pairing</h2>
              <p className="text-sm text-[var(--color-ink-muted)] mb-6 text-pretty">
                Bread Pitt will message you when something needs you — a feed, a fold, a check-in.
                Pair once and it's done.
              </p>

              <TelegramPanel
                linked={linked}
                pairingCode={pairingActive ? user.telegramPairingCode : null}
                pairingExpiresAt={
                  pairingActive ? user.telegramPairingExpiresAt?.toISOString() ?? null : null
                }
              />
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <Card tone="flour" className="p-7">
              <div className="flex items-center gap-2.5 mb-1">
                <Calendar size={14} className="text-[var(--color-crust)]" />
                <CardEyebrow>The calendar</CardEyebrow>
              </div>
              <h2 className="font-display text-2xl mt-1 mb-2">Google Calendar</h2>
              <p className="text-sm text-[var(--color-ink-muted)] mb-6 text-pretty">
                Optional — push every step of every active process to a
                dedicated <em>Bread Pitt</em> calendar in your Google account.
              </p>
              <GoogleCalendarPanel
                configured={googleConfigured()}
                connected={!!googleAccount}
                email={googleAccount?.email ?? null}
                syncEnabled={pref?.googleCalendarSyncEnabled ?? true}
                backfilled={
                  googleParam === "connected" && backfilledParam
                    ? Number(backfilledParam) || 0
                    : null
                }
                errorReason={
                  googleParam === "error" || googleParam === "bad_state" || googleParam === "missing_params"
                    ? reasonParam ?? googleParam
                    : null
                }
              />
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <Card tone="flour" className="p-7">
              <div className="flex items-center gap-2.5 mb-1">
                <KeyRound size={14} className="text-[var(--color-crust)]" />
                <CardEyebrow>Password</CardEyebrow>
              </div>
              <h2 className="font-display text-2xl mt-1 mb-6">Change password</h2>
              <PasswordPanel />
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <Card tone="ghost" className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardEyebrow>Session</CardEyebrow>
                  <p className="text-sm text-[var(--color-ink-muted)] mt-1">
                    Sign out of this device.
                  </p>
                </div>
                <form action={logoutAction}>
                  <Button type="submit" size="sm" variant="ghost">
                    <LogOut size={14} /> Sign out
                  </Button>
                </form>
              </div>
            </Card>
          </ScrollReveal>
        </div>
      </div>
    </>
  );
}
