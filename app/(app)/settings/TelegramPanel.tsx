"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Link2Off, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { generatePairingCodeAction, unlinkTelegramAction } from "./actions";

export function TelegramPanel({
  linked,
  pairingCode,
  pairingExpiresAt,
}: {
  linked: boolean;
  pairingCode: string | null;
  pairingExpiresAt: string | null;
}) {
  const [pending, start] = useTransition();
  const [code, setCode] = useState<string | null>(pairingCode);
  const [expiresAt, setExpiresAt] = useState<string | null>(pairingExpiresAt);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number>(() =>
    expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : 0,
  );

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemaining(left);
      if (left === 0) setCode(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (linked) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-levain)]/30 bg-[var(--color-levain)]/8 px-4 py-3">
          <Check size={16} className="text-[var(--color-levain)]" />
          <div className="text-sm">
            <div className="text-[var(--color-ink)]">Paired and listening.</div>
            <div className="text-xs text-[var(--color-ink-muted)] mt-0.5">
              Crustopher will message at the right moments.
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm("Unlink Telegram? You'll stop receiving messages.")) return;
            start(() => unlinkTelegramAction());
          }}
        >
          <Link2Off size={14} /> {pending ? "Unlinking…" : "Unlink Telegram"}
        </Button>
      </div>
    );
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const timeLeft = `${minutes}:${String(seconds).padStart(2, "0")}`;
  const startCommand = code ? `/start ${code}` : null;

  const generate = () =>
    start(async () => {
      const next = await generatePairingCodeAction();
      setCode(next);
      setExpiresAt(new Date(Date.now() + 15 * 60 * 1000).toISOString());
      setCopied(false);
    });

  const copy = async () => {
    if (!startCommand) return;
    try {
      await navigator.clipboard.writeText(startCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait" initial={false}>
        {code && remaining > 0 ? (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0.16, 1] }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-crumb)]/40 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] mb-3">
                Your pairing code
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <div className="font-display numerals-tabular text-5xl tracking-[0.12em] text-[var(--color-ink)]">
                  {code}
                </div>
                <div className="text-xs font-mono numerals-tabular text-[var(--color-ink-muted)]">
                  {timeLeft}
                </div>
              </div>
            </div>

            <ol className="space-y-3 text-sm text-[var(--color-ink-muted)]">
              <li className="flex gap-3">
                <span className="font-mono text-[var(--color-crust)] shrink-0">01</span>
                <span>
                  Open your bot in Telegram (the one whose token is in your env).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[var(--color-crust)] shrink-0">02</span>
                <span className="flex flex-wrap items-center gap-2">
                  Send
                  <code className="font-mono text-[var(--color-ink)] bg-[var(--color-flour)] border border-[var(--color-line)] rounded-md px-2 py-0.5">
                    {startCommand}
                  </code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-[var(--color-crust)] shrink-0">03</span>
                <span>This page will refresh once the handshake completes.</span>
              </li>
            </ol>

            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={copy} type="button">
                {copied ? (
                  <>
                    <Check size={14} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy command
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={generate}
              >
                {pending ? "Generating…" : "Regenerate"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0.16, 1] }}
            className="space-y-4"
          >
            <p className="text-sm text-[var(--color-ink-muted)]">
              Generate a one-time code, send it to your bot, and Crustopher will
              know where to find you. Codes expire after 15 minutes.
            </p>
            <Button size="md" disabled={pending} onClick={generate}>
              <Sparkles size={14} />
              {pending ? "Generating…" : "Generate pairing code"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
