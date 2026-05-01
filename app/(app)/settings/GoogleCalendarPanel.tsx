"use client";

import { useTransition } from "react";
import { Check, Calendar, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { disconnectGoogleAction, setGoogleSyncEnabledAction } from "./actions";

type Props = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  syncEnabled: boolean;
  backfilled: number | null;
  errorReason: string | null;
};

export function GoogleCalendarPanel({
  configured,
  connected,
  email,
  syncEnabled,
  backfilled,
  errorReason,
}: Props) {
  const [pending, start] = useTransition();

  if (!configured) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--color-ink-muted)]">
          Google Calendar sync isn&apos;t configured on this server. An admin
          needs to set <code className="font-mono text-[var(--color-ink)]">GOOGLE_CLIENT_ID</code>,
          <code className="font-mono text-[var(--color-ink)]"> GOOGLE_CLIENT_SECRET</code>, and
          <code className="font-mono text-[var(--color-ink)]"> GOOGLE_OAUTH_REDIRECT_URL</code> in
          the env, then enable the Calendar API in Google Cloud.
        </p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-ink-muted)]">
          Connect your Google account and Bread Pitt will mirror every step
          of your active processes onto a dedicated <em>Bread Pitt</em>{" "}
          calendar — feeds, folds, bakes, the lot. One-way push, opt-out per
          preference.
        </p>
        {errorReason && (
          <div className="rounded-2xl border border-[var(--color-hooch)]/40 bg-[var(--color-hooch)]/10 px-4 py-3 text-sm">
            Couldn&apos;t complete the handshake: <span className="font-mono">{errorReason}</span>
          </div>
        )}
        <a
          href="/api/google/oauth/start"
          className="inline-flex items-center gap-2 h-10 px-5 text-sm rounded-full bg-[var(--color-crust)] text-[var(--color-char)] font-medium hover:bg-[var(--color-butter)] transition-colors"
        >
          <Calendar size={14} /> Connect Google Calendar
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-levain)]/30 bg-[var(--color-levain)]/8 px-4 py-3">
        <Check size={16} className="text-[var(--color-levain)]" />
        <div className="text-sm">
          <div className="text-[var(--color-ink)]">Connected as {email ?? "your Google account"}.</div>
          <div className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            Events live on a calendar called &ldquo;Bread Pitt&rdquo;.
            {backfilled !== null && backfilled > 0 && ` ${backfilled} step${backfilled === 1 ? "" : "s"} just synced.`}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-crumb)]/40 px-4 py-3 cursor-pointer hover:border-[var(--color-crust)]/40 transition-colors">
        <input
          type="checkbox"
          defaultChecked={syncEnabled}
          disabled={pending}
          onChange={(e) => start(() => setGoogleSyncEnabledAction(e.target.checked))}
          className="h-4 w-4 accent-[var(--color-crust)]"
        />
        <span className="text-sm">Push new processes to Google Calendar</span>
      </label>

      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!confirm("Disconnect Google Calendar? Bread Pitt will remove future events for active processes.")) return;
          start(() => disconnectGoogleAction());
        }}
      >
        <Link2Off size={14} /> {pending ? "Working…" : "Disconnect"}
      </Button>
    </div>
  );
}
