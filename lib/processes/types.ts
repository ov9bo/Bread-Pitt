import type { ProcessType } from "@/lib/db/schema";

export type StepDraft = {
  stepKey: string;
  title: string;
  description?: string;
  ordinal: number;
  dayIndex?: number | null;
  scheduledFor: Date;
  metadata?: Record<string, unknown>;
};

export type ReminderDraft = {
  fireAt: Date;
  title: string;
  body: string;
  stepKey: string;
};

export type TemplateOutput = {
  steps: StepDraft[];
  reminders: ReminderDraft[];
};

export type TemplateOptions = {
  startedAt: Date;
  kitchenTempF: number;
  starterNickname: string;
  options?: Record<string, unknown>;
};

export type Template = {
  type: ProcessType;
  recipeVersion: string;
  defaultNickname: (opts: TemplateOptions) => string;
  build: (opts: TemplateOptions) => TemplateOutput;
};
