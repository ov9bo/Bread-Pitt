import type { Template, StepDraft, ReminderDraft } from "../types";
import { addHours, addMinutes } from "date-fns";

/**
 * Bake day timeline derived from sourdough_complete_guide.md (Phase 2 + 3).
 * options.feedStartedAt = the moment the morning starter feed happened (T0).
 *
 * If not provided, the process is anchored such that the levain is built
 * `startedAt` and everything cascades from there.
 */

export const bakeDayTemplate: Template = {
  type: "bake_day",
  recipeVersion: "v1",
  defaultNickname: (o) => `Loaf — ${o.startedAt.toLocaleDateString()}`,
  build: ({ startedAt, options = {} }) => {
    const steps: StepDraft[] = [];
    const reminders: ReminderDraft[] = [];

    // T0 = levain build time. The starter peak is right now.
    const T0 = startedAt;
    let ordinal = 0;

    const step = (offset: { h?: number; m?: number }, key: string, title: string, description: string, meta: Record<string, unknown> = {}) => {
      ordinal++;
      const h = offset.h ?? 0;
      const m = offset.m ?? 0;
      const at = addMinutes(addHours(T0, h), m);
      steps.push({ stepKey: key, title, description, ordinal, scheduledFor: at, metadata: meta });
      return at;
    };

    const remind = (at: Date, title: string, body: string, key: string, leadMin = 0) => {
      reminders.push({ fireAt: leadMin ? addMinutes(at, -leadMin) : at, title, body, stepKey: key });
    };

    // 1. Build the levain
    const t1 = step({ h: 0 }, "levain-build", "Build the levain",
      "38 g lukewarm water + 19 g bread + 19 g whole wheat + 19 g active starter. Whisk smooth, loose lid, warm spot.");
    remind(t1, "Build the levain", "38g water + 19g bread + 19g WW + 19g starter. Whisk smooth.", "levain-build");

    // 2. Autolyse (1h before levain peaks → ~2h after T0)
    const t2 = step({ h: 2 }, "autolyse", "Begin autolyse",
      "387 g bread + 83 g WW + 320 g lukewarm water (hold back 20 g). Mix until no dry flour. Cover, rest 1 hour.");
    remind(t2, "Autolyse time", "387 bread + 83 WW + 320 water (hold back 20g). Mix shaggy, cover, 1h rest.", "autolyse", 5);

    // 3. Combine + salt (3h after T0 — levain peak)
    const t3 = step({ h: 3 }, "mix-combine", "Combine levain + autolyse + salt",
      "All of the levain onto the autolyse, sprinkle 9 g kosher salt evenly, add the reserved 20 g water. Mix with hands until homogeneous and tacky.");
    remind(t3, "Levain peaked — mix the dough", "Combine all the levain into the autolyse, add 9g salt + 20g reserved water. Squeeze and fold by hand.", "mix-combine", 10);

    // 4-6. Three folds, 30 min apart starting 30 min after mix
    const t4 = step({ h: 3, m: 30 }, "fold-1", "Fold 1 of 3", "4 stretch-and-folds around the bowl. Wet hand, lift-wiggle-fold-rotate. Cover.");
    remind(t4, "Fold 1", "Stretch-and-fold round 1. 4 sides.", "fold-1");

    const t5 = step({ h: 4 }, "fold-2", "Fold 2 of 3", "Round 2 of stretch-and-folds.");
    remind(t5, "Fold 2", "Stretch-and-fold round 2.", "fold-2");

    const t6 = step({ h: 4, m: 30 }, "fold-3", "Fold 3 of 3", "Round 3 — final folds. Cover, rest 30 min.");
    remind(t6, "Fold 3", "Stretch-and-fold round 3.", "fold-3");

    // 7. Pre-shape
    const t7 = step({ h: 5 }, "preshape", "Pre-shape", "Tip dough onto lightly floured counter. Bench-scraper drag into a rough boule. Rest 30 min uncovered.");
    remind(t7, "Pre-shape", "Tip out, rough boule with bench scraper, rest uncovered 30 min.", "preshape");

    // 8. Final shape
    const t8 = step({ h: 5, m: 30 }, "final-shape", "Final shape (package fold)", "Flour top, flip, fold bottom→middle, right→middle, left→middle, top→down. Flip seam-down, drag-tighten.");
    remind(t8, "Final shape", "Package fold: bottom, right, left, top — then flip, drag-tighten.", "final-shape");

    // 9. Banneton + room rest 20 min
    const t9 = step({ h: 5, m: 50 }, "banneton-room", "Banneton + room rest",
      "Dust banneton GENEROUSLY with white rice flour. Boule seam-side UP into banneton. Bag it, rest 20 min on counter.");
    remind(t9, "Into the banneton", "Generous rice flour, seam UP, bag, 20 min counter rest.", "banneton-room");

    // 10. Cold proof — 16h
    const t10 = step({ h: 6, m: 10 }, "cold-proof", "Cold proof in fridge",
      "Banneton (bagged) into the fridge for 12–18 hours. 16h is the target.", { hours: 16 });
    remind(t10, "Into the fridge", "Bagged banneton → fridge. ~16h cold proof.", "cold-proof");

    // 11. Preheat dutch oven 1h before bake
    const t11 = step({ h: 21 }, "preheat", "Preheat Dutch oven",
      "Dutch oven (lid on) into oven at 500°F (260°C). Full hour preheat — cast iron must be saturated.");
    remind(t11, "Preheat the Dutch oven", "Dutch oven (lid on) → 500°F for a full hour.", "preheat");

    // 12. Score + bake covered (T0 + 22h)
    const t12 = step({ h: 22 }, "score-bake-covered", "Flip, score, bake covered",
      "Cold from fridge → onto parchment X → score one ~6\" cut just off-center, ¼\" deep → into the screaming-hot Dutch oven, lid on, 18–20 min at 500°F.");
    remind(t12, "Score and bake covered", "Flip onto parchment, score off-center ¼\" deep, into the Dutch oven covered. 18–20 min at 500°F.", "score-bake-covered", 10);

    // 13. Uncover + finish bake (T0 + 22h 20min)
    const t13 = step({ h: 22, m: 20 }, "bake-uncovered", "Uncover and finish",
      "Lid off (tilt away — steam!). Optionally drop to 450°F. Bake 20–30 min more until deep mahogany; internal temp 208°F.");
    remind(t13, "Uncover the loaf", "Lid off (tilt away). Bake 20–30 min more. Internal temp 208°F.", "bake-uncovered");

    // Cool — final checkpoint
    const tCool = step({ h: 23 }, "cool", "Cool 2–3 hours", "Wire rack. Resist slicing for at least 2 hours — you'll get a gummy crumb otherwise.");
    remind(tCool, "Cool the loaf", "On the wire rack. 2–3 hours minimum before slicing.", "cool");

    return { steps, reminders };
  },
};
