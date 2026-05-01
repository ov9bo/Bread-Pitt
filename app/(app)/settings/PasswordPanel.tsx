"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { changePasswordAction } from "./actions";

export function PasswordPanel() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  return (
    <form
      className="space-y-5"
      action={(fd) => {
        setError(null);
        setSuccess(false);
        start(async () => {
          try {
            await changePasswordAction(fd);
            setSuccess(true);
            (document.getElementById("password-form") as HTMLFormElement | null)?.reset();
            setTimeout(() => setSuccess(false), 2200);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
          }
        });
      }}
      id="password-form"
    >
      <FieldGroup>
        <Label htmlFor="current">Current password</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </FieldGroup>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldGroup>
          <Label htmlFor="next" hint="At least 8 characters.">
            New password
          </Label>
          <Input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="confirm" hint="At least 8 characters.">
            Confirm new
          </Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </FieldGroup>
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-xl border border-[var(--color-crust)]/40 bg-[var(--color-crust)]/8 px-4 py-2.5 text-sm text-[var(--color-ink)]"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-levain)]/30 bg-[var(--color-levain)]/8 px-4 py-2.5 text-sm text-[var(--color-ink)]"
          >
            <Check size={14} className="text-[var(--color-levain)]" />
            Password updated.
          </motion.div>
        )}
      </AnimatePresence>

      <Button type="submit" size="md" disabled={pending}>
        <ShieldCheck size={14} />
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
