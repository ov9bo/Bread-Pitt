"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Bell, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, FieldGroup } from "@/components/ui/Input";
import {
  completeStepAction,
  recordObservationAction,
  pauseProcessAction,
  resumeProcessAction,
  restartProcessAction,
  abandonProcessAction,
  skipStepAction,
} from "./processes/actions";
import { snoozeNextReminderAction } from "./snooze-action";

export function CompleteStepButton({ stepId }: { stepId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => start(() => completeStepAction(stepId))}
    >
      <Check size={14} /> {pending ? "Marking…" : "Mark done"}
    </Button>
  );
}

export function SkipStepButton({ stepId }: { stepId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => start(() => skipStepAction(stepId))}
    >
      <X size={14} /> Skip
    </Button>
  );
}

export function SnoozeButton({ minutes = 30 }: { minutes?: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => start(() => snoozeNextReminderAction(minutes))}
    >
      <Bell size={14} /> Snooze {minutes}m
    </Button>
  );
}

export function PauseButton({ processId }: { processId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => start(() => pauseProcessAction(processId))}
    >
      Pause
    </Button>
  );
}

export function ResumeButton({ processId }: { processId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => start(() => resumeProcessAction(processId))}
    >
      Resume
    </Button>
  );
}

export function RestartButton({ processId }: { processId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        if (!confirm("Restart from day one? Your current run will be archived in the journal.")) return;
        start(() => restartProcessAction(processId));
      }}
    >
      Restart
    </Button>
  );
}

export function AbandonButton({ processId }: { processId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!confirm("Abandon this process? It will stay in the journal as archived.")) return;
        start(() => abandonProcessAction(processId));
      }}
    >
      Abandon
    </Button>
  );
}

const KINDS = [
  { value: "smell", label: "Smell" },
  { value: "rise", label: "Rise" },
  { value: "bubble", label: "Bubbles" },
  { value: "temperature", label: "Temperature" },
  { value: "free", label: "Free note" },
] as const;

export function ObservationForm({ processId, stepId }: { processId: string; stepId?: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("free");
  const [pending, start] = useTransition();

  return (
    <div className="mt-5">
      <AnimatePresence initial={false}>
        {!open ? (
          <motion.div
            key="closed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
              <Plus size={14} /> Add observation
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="open"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0.16, 1] }}
            className="space-y-3 overflow-hidden"
            action={(fd) => {
              start(() => recordObservationAction(fd).then(() => setOpen(false)));
            }}
          >
            <input type="hidden" name="processId" value={processId} />
            {stepId && <input type="hidden" name="stepId" value={stepId} />}

            <FieldGroup>
              <Label htmlFor="kind">Kind</Label>
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      kind === k.value
                        ? "border-[var(--color-crust)] bg-[var(--color-crust)]/15 text-[var(--color-ink)]"
                        : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="kind" value={kind} />
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="body">Note</Label>
              <Textarea
                id="body"
                name="body"
                required
                placeholder="What did you notice?"
                autoFocus
              />
            </FieldGroup>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
