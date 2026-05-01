"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup } from "@/components/ui/Input";
import { addDiscardAction, useDiscardAction, closeJarAction } from "./actions";

export function AddDiscardForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [grams, setGrams] = useState(50);

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
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => setOpen(true)}
            >
              <Plus size={14} /> Add discard to jar
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
              start(() => addDiscardAction(fd).then(() => setOpen(false)));
            }}
          >
            <FieldGroup>
              <Label htmlFor="grams">Grams added</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="grams"
                  name="grams"
                  type="number"
                  min={1}
                  max={2000}
                  value={grams}
                  onChange={(e) => setGrams(Number(e.target.value))}
                  required
                  className="numerals-tabular"
                />
                <div className="flex gap-1">
                  {[25, 50, 75, 100].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setGrams(v)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-mono numerals-tabular transition-colors ${
                        grams === v
                          ? "border-[var(--color-crust)] bg-[var(--color-crust)]/15 text-[var(--color-ink)]"
                          : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </FieldGroup>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Add"}
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

export function RecipeUseButton({
  recipeKey,
  recipeName,
  grams,
  available,
}: {
  recipeKey: string;
  recipeName: string;
  grams: number;
  available: number;
}) {
  const [pending, start] = useTransition();
  const enough = available >= grams;

  return (
    <form
      action={(fd) => {
        if (!enough && !confirm("Not enough in the jar — log it anyway?")) return;
        start(() => useDiscardAction(fd));
      }}
    >
      <input type="hidden" name="recipeKey" value={recipeKey} />
      <input type="hidden" name="grams" value={grams} />
      <Button
        type="submit"
        size="sm"
        variant={enough ? "primary" : "secondary"}
        disabled={pending}
        className="w-full"
        aria-label={`Use ${grams}g for ${recipeName}`}
      >
        <ChefHat size={14} /> {pending ? "Logging…" : `Use ${grams}g`}
      </Button>
    </form>
  );
}

export function CloseJarButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="w-full"
      disabled={pending}
      onClick={() => {
        if (!confirm("Close this jar? It'll move to archive and a new jar starts on next add.")) return;
        start(() => closeJarAction());
      }}
    >
      Close & archive jar
    </Button>
  );
}
