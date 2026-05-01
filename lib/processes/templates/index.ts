import type { ProcessType } from "@/lib/db/schema";
import type { Template } from "../types";
import { starterBuildTemplate } from "./starter-build";
import { bakeDayTemplate } from "./bake-day";
import { weeklyMaintenanceTemplate } from "./weekly-maintenance";
import { discardPurgeTemplate } from "./discard-purge";
import { revivalTemplate } from "./revival";

export const TEMPLATES: Record<ProcessType, Template> = {
  starter_build: starterBuildTemplate,
  bake_day: bakeDayTemplate,
  weekly_maintenance: weeklyMaintenanceTemplate,
  discard_purge: discardPurgeTemplate,
  revival: revivalTemplate,
};

export const PROCESS_META: Record<ProcessType, {
  label: string;
  tagline: string;
  durationLabel: string;
  color: string;
}> = {
  starter_build: {
    label: "Build a starter",
    tagline: "14 days of patient feeding to wake a wild culture from flour and water.",
    durationLabel: "14 days",
    color: "crust",
  },
  bake_day: {
    label: "Bake a loaf",
    tagline: "From levain to mahogany crust. About 24 hours, mostly patient.",
    durationLabel: "~24 hours",
    color: "butter",
  },
  weekly_maintenance: {
    label: "Weekly care",
    tagline: "Five-minute fridge feed to keep your mature starter happy.",
    durationLabel: "5 min weekly",
    color: "levain",
  },
  discard_purge: {
    label: "Discard purge",
    tagline: "Crackers, pancakes, pizza — clear the jar before it gets aggressive.",
    durationLabel: "30–60 min",
    color: "hooch",
  },
  revival: {
    label: "Revive for a bake",
    tagline: "Two days of wake-up feeds to bring a fridge starter back to peak.",
    durationLabel: "2 days",
    color: "butter",
  },
};
