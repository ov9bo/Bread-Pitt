import type { Template } from "../types";
import { addDays, addHours } from "date-fns";

/** Mode B fridge-starter weekly maintenance — derived from discard guide PART 2. */
export const weeklyMaintenanceTemplate: Template = {
  type: "weekly_maintenance",
  recipeVersion: "v1",
  defaultNickname: (o) => `${o.starterNickname} — weekly care`,
  build: ({ startedAt, starterNickname }) => {
    const t0 = startedAt;
    return {
      steps: [
        {
          stepKey: "pull-from-fridge",
          title: "Pull from fridge",
          description: "Take the jar out. Note any hooch (dark liquid). Pour off or stir in — both fine.",
          ordinal: 1,
          scheduledFor: t0,
        },
        {
          stepKey: "feed",
          title: "Discard to 25 g, feed 25/25",
          description: "25 g starter + 25 g flour + 25 g water. Stir well.",
          ordinal: 2,
          scheduledFor: t0,
        },
        {
          stepKey: "wake-on-counter",
          title: "Counter wake — 1–2h",
          description: "Sit on counter for 1–2 hours. No need to wait for full peak.",
          ordinal: 3,
          scheduledFor: addHours(t0, 1),
        },
        {
          stepKey: "back-to-fridge",
          title: "Back to fridge",
          description: "Lid on, into the fridge. Done for the week.",
          ordinal: 4,
          scheduledFor: addHours(t0, 2),
        },
        {
          stepKey: "next-week",
          title: "Next week — same time",
          description: "Recurring weekly nudge.",
          ordinal: 5,
          scheduledFor: addDays(t0, 7),
        },
      ],
      reminders: [
        { fireAt: t0, title: `${starterNickname} — weekly care`, body: "Pull from fridge. Discard to 25g + 25g flour + 25g water. 1–2h counter, then back in.", stepKey: "pull-from-fridge" },
        { fireAt: addHours(t0, 2), title: "Back to fridge", body: "Counter time done. Lid on, into the fridge.", stepKey: "back-to-fridge" },
        { fireAt: addDays(t0, 7), title: `${starterNickname} — weekly care`, body: "Time for the weekly feed.", stepKey: "next-week" },
      ],
    };
  },
};
