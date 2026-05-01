import type { Template } from "../types";

export const discardPurgeTemplate: Template = {
  type: "discard_purge",
  recipeVersion: "v1",
  defaultNickname: () => "Discard purge",
  build: ({ startedAt }) => ({
    steps: [
      {
        stepKey: "purge",
        title: "Use the discard jar",
        description: "Pancakes, crackers, flatbread — pick something from the discard library and clear the jar.",
        ordinal: 1,
        scheduledFor: startedAt,
      },
    ],
    reminders: [
      {
        fireAt: startedAt,
        title: "Discard purge time",
        body: "Your discard jar's been in the fridge a while. Crackers in 30 min, or pancakes for breakfast tomorrow?",
        stepKey: "purge",
      },
    ],
  }),
};
