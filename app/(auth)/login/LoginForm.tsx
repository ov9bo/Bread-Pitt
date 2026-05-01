"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { Wordmark } from "@/components/brand/Wordmark";

const initial: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
    >
      <div className="mb-8 flex flex-col items-center text-center">
        <Wordmark size="lg" />
        <p className="mt-5 font-display italic text-[var(--color-ink-muted)]">
          A hand-bound journal for living, breathing bread.
        </p>
      </div>

      <form
        action={action}
        className="rounded-[var(--radius-loaf)] border border-[var(--color-line)] bg-[var(--color-flour)]/85 backdrop-blur-md p-7 shadow-[var(--shadow-flour)] space-y-5"
      >
        <input type="hidden" name="next" value={next} />

        <FieldGroup>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <KeyRound
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]"
            />
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-10"
            />
          </div>
        </FieldGroup>

        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[var(--color-crust)]/30 bg-[var(--color-crust)]/10 px-4 py-2.5 text-sm text-[var(--color-ink)]"
          >
            {state.error}
          </motion.div>
        )}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Kneading…" : "Open the journal"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--color-ink-faint)] font-mono uppercase tracking-[0.18em]">
        Single baker. One key. No accounts.
      </p>
    </motion.div>
  );
}
