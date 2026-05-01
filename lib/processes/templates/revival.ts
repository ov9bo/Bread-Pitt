import type { Template } from "../types";
import { addHours, addDays } from "date-fns";

/** Wake a fridge-stored mature starter for an upcoming bake — 2-day revival. */
export const revivalTemplate: Template = {
  type: "revival",
  recipeVersion: "v1",
  defaultNickname: (o) => `${o.starterNickname} — revival`,
  build: ({ startedAt, starterNickname }) => {
    const t0 = startedAt;
    return {
      steps: [
        { stepKey: "rev-feed-1", title: "Pull + first feed", description: "Pull from fridge. Discard to 25g, feed 25g flour + 25g water. Counter, lid loose.", ordinal: 1, scheduledFor: t0 },
        { stepKey: "rev-feed-2", title: "12h later — second feed", description: "Discard to 25g, feed again. Should be doubling within 6–8h.", ordinal: 2, scheduledFor: addHours(t0, 12) },
        { stepKey: "rev-bakeready", title: "Bake-ready check", description: "Should be tripling within 4–6h. Float test optional. Build levain whenever ready.", ordinal: 3, scheduledFor: addDays(t0, 1) },
      ],
      reminders: [
        { fireAt: t0, title: `${starterNickname} — wake-up feed 1`, body: "Pull from fridge. 25g + 25g + 25g.", stepKey: "rev-feed-1" },
        { fireAt: addHours(t0, 12), title: `${starterNickname} — wake-up feed 2`, body: "Second feed. Should be doubling now.", stepKey: "rev-feed-2" },
        { fireAt: addDays(t0, 1), title: `${starterNickname} — bake-ready`, body: "Should be tripling. Time to build the levain when you're ready.", stepKey: "rev-bakeready" },
      ],
    };
  },
};
