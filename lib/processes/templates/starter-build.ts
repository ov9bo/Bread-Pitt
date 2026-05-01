import type { Template, StepDraft, ReminderDraft } from "../types";
import { addDays, addHours, addMinutes, setHours, setMinutes, startOfDay } from "date-fns";

/**
 * 14-day starter build, derived from sourdough_complete_guide.md (Phase 1).
 *
 * Schedule rules:
 * - Day 1: birth feed at startedAt.
 * - Days 2–3: one feed each, anchored to the same wall-clock time as Day 1.
 * - Days 4–6: TWO feeds per day, ~12h apart (08:00 + 20:00 by default, but
 *   we just split the day into morning/evening relative to the user's
 *   chosen anchor time).
 * - Day 7: ratio shift. One feed.
 * - Days 8–13: once daily.
 * - Day 14: maturity check (no feed step — a checkpoint with the float test).
 */
const recipeVersion = "v1";

function feedAt(date: Date, anchorHour: number, anchorMinute: number): Date {
  return setMinutes(setHours(startOfDay(date), anchorHour), anchorMinute);
}

/**
 * The wall-clock anchor used for starter-build feeds. Day N falls on
 * `addDays(startedAt, N - 1)` at this hour:minute. Exported so the engine
 * can compute extension days (Day 15+) consistently.
 */
export function starterAnchorTime(startedAt: Date, dayIndex: number): Date {
  const dayDate = addDays(startedAt, dayIndex - 1);
  // Days 1-3 + Day 7 + Days 8-14 use the original wall-clock minute-of-day.
  return new Date(
    dayDate.getFullYear(),
    dayDate.getMonth(),
    dayDate.getDate(),
    startedAt.getHours(),
    startedAt.getMinutes(),
    0,
    0
  );
}

export const starterBuildTemplate: Template = {
  type: "starter_build",
  recipeVersion,
  defaultNickname: (o) => o.starterNickname || "The starter",
  build: ({ startedAt, starterNickname }) => {
    const steps: StepDraft[] = [];
    const reminders: ReminderDraft[] = [];

    const anchorH = startedAt.getHours();
    const anchorM = startedAt.getMinutes();

    let ordinal = 0;
    const pushStep = (
      day: number,
      scheduledFor: Date,
      stepKey: string,
      title: string,
      description: string,
      meta: Record<string, unknown> = {}
    ) => {
      ordinal += 1;
      steps.push({
        stepKey,
        title,
        description,
        ordinal,
        dayIndex: day,
        scheduledFor,
        metadata: meta,
      });
    };

    const pushReminder = (
      fireAt: Date,
      title: string,
      body: string,
      stepKey: string,
      leadMinutes = 0
    ) => {
      reminders.push({
        fireAt: leadMinutes ? addMinutes(fireAt, -leadMinutes) : fireAt,
        title,
        body,
        stepKey,
      });
    };

    // ── DAY 1 ─────────────────────────────────────
    pushStep(
      1,
      startedAt,
      "day-1-birth",
      "Day 1 — Birth Day",
      "100 g whole wheat flour + 125 g warm water in your large jar. Whisk until no clumps, scrape sides, loose lid, warm spot. Walk away for 24 hours.",
      { flour: { wholeWheat: 100 }, water: 125 }
    );
    pushReminder(
      startedAt,
      `${starterNickname} is born`,
      "Mix 100 g whole wheat flour + 125 g warm water in the jar. Whisk smooth, scrape, loose lid, warm spot.",
      "day-1-birth"
    );

    // ── DAY 2 ─────────────────────────────────────
    const day2 = addDays(startedAt, 1);
    pushStep(
      2,
      day2,
      "day-2-feed",
      "Day 2 — First Feed",
      "Transfer 75 g of starter into a fresh jar. Add 50 g whole wheat + 50 g bread flour + 100 g warm water. Whisk, scrape, rubber-band marker, loose lid.",
      { keep: 75, flour: { wholeWheat: 50, bread: 50 }, water: 100 }
    );
    pushReminder(day2, `${starterNickname} — Day 2 feed`, "Discard down to 75g, then 50g WW + 50g bread + 100g water.", "day-2-feed");

    // ── DAY 3 ─────────────────────────────────────
    const day3 = addDays(startedAt, 2);
    pushStep(3, day3, "day-3-feed", "Day 3 — Same routine", "Repeat the Day 2 feed: 75g kept + 50g WW + 50g bread + 100g water.", {
      keep: 75,
      flour: { wholeWheat: 50, bread: 50 },
      water: 100,
    });
    pushReminder(day3, `${starterNickname} — Day 3 feed`, "Discard to 75g, feed 50/50/100.", "day-3-feed");

    // ── DAYS 4-6 ── TWICE DAILY ───────────────────
    for (let d = 4; d <= 6; d++) {
      const dayDate = addDays(startedAt, d - 1);
      const morning = feedAt(dayDate, Math.min(anchorH, 9), anchorM); // earlier of anchor or 9am
      const evening = addHours(morning, 12);
      pushStep(
        d,
        morning,
        `day-${d}-feed-am`,
        `Day ${d} — Morning feed`,
        "Twice-daily phase. Discard to 75g, then 50g WW + 50g bread + 100g water.",
        { feed: "am", keep: 75, flour: { wholeWheat: 50, bread: 50 }, water: 100 }
      );
      pushReminder(morning, `${starterNickname} — Day ${d} morning feed`, "Twice-daily window. 75g + 50/50/100.", `day-${d}-feed-am`);

      pushStep(
        d,
        evening,
        `day-${d}-feed-pm`,
        `Day ${d} — Evening feed`,
        "Second feed of the day, ~12 hours after the morning one.",
        { feed: "pm", keep: 75, flour: { wholeWheat: 50, bread: 50 }, water: 100 }
      );
      pushReminder(evening, `${starterNickname} — Day ${d} evening feed`, "Second feed. 75g + 50/50/100.", `day-${d}-feed-pm`);
    }

    // ── DAY 7 ── RECIPE SHIFTS ────────────────────
    const day7 = addDays(startedAt, 6);
    pushStep(
      7,
      day7,
      "day-7-shift",
      "Day 7 — Recipe shifts",
      "Once-daily from now on. Keep 75g, then 40g bread + 20g WW + 60g water. Less food, more bread-flour ratio.",
      { keep: 75, flour: { bread: 40, wholeWheat: 20 }, water: 60 }
    );
    pushReminder(day7, `${starterNickname} — Day 7 shift`, "New ratio: 40 bread + 20 WW + 60 water. Once daily from now.", "day-7-shift");

    // ── DAYS 8-13 ── DAILY ────────────────────────
    for (let d = 8; d <= 13; d++) {
      const dayDate = addDays(startedAt, d - 1);
      pushStep(
        d,
        dayDate,
        `day-${d}-feed`,
        `Day ${d} — Daily feed`,
        "Once daily. Watch for reliable rise (often doubling), pleasant tangy-yeasty smell.",
        { keep: 75, flour: { bread: 40, wholeWheat: 20 }, water: 60 }
      );
      pushReminder(dayDate, `${starterNickname} — Day ${d} feed`, "Once-daily feed. 40 bread + 20 WW + 60 water.", `day-${d}-feed`);
    }

    // ── DAY 14 ── MATURITY CHECK ──────────────────
    const day14 = addDays(startedAt, 13);
    pushStep(
      14,
      day14,
      "day-14-maturity",
      "Day 14 — Maturity check",
      "Should triple within 4–6h of feeding. Try the float test: spoonful in water, floats = ready to bake.",
      { check: "triple-and-float" }
    );
    pushReminder(
      day14,
      `${starterNickname} is grown up`,
      "Time for the maturity check. Should triple in 4–6h. Run the float test. If it floats, you're ready to bake.",
      "day-14-maturity"
    );

    return { steps, reminders };
  },
};
