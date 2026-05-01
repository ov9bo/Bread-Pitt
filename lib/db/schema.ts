import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";

const id = () => text("id").primaryKey().$defaultFn(() => nanoid(16));
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date());

export const users = sqliteTable("users", {
  id: id(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull().default("Baker"),
  telegramChatId: text("telegram_chat_id"),
  telegramPairingCode: text("telegram_pairing_code"),
  telegramPairingExpiresAt: integer("telegram_pairing_expires_at", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

export const sessions = sqliteTable("sessions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAt(),
});

export const preferences = sqliteTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme", { enum: ["dark", "light", "system"] }).notNull().default("dark"),
  kitchenTempF: real("kitchen_temp_f").notNull().default(72),
  notificationsEnabled: integer("notifications_enabled", { mode: "boolean" }).notNull().default(true),
  quietHoursStart: integer("quiet_hours_start").notNull().default(22), // 0-23
  quietHoursEnd: integer("quiet_hours_end").notNull().default(7),
  starterNickname: text("starter_nickname").notNull().default("The starter"),
  googleCalendarSyncEnabled: integer("google_calendar_sync_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
});

// ─── Setup tokens for first-run ───────────────────────────────────────────
export const setupTokens = sqliteTable("setup_tokens", {
  token: text("token").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  consumed: integer("consumed", { mode: "boolean" }).notNull().default(false),
});

// ─── Process orchestration ────────────────────────────────────────────────
export const processTypes = [
  "starter_build",
  "bake_day",
  "weekly_maintenance",
  "discard_purge",
  "revival",
] as const;
export type ProcessType = (typeof processTypes)[number];

export const processStatuses = ["active", "paused", "completed", "abandoned"] as const;
export type ProcessStatus = (typeof processStatuses)[number];

export const processes = sqliteTable(
  "processes",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: processTypes }).notNull(),
    status: text("status", { enum: processStatuses }).notNull().default("active"),
    nickname: text("nickname"),
    recipeVersion: text("recipe_version").notNull().default("v1"),
    kitchenTempAtStart: real("kitchen_temp_at_start"),
    optionsJson: text("options_json").notNull().default("{}"),
    notes: text("notes"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    pausedAt: integer("paused_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    restartedFromId: text("restarted_from_id"),
    extensionDays: integer("extension_days").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => ({
    statusIdx: index("processes_status_idx").on(t.status),
    typeIdx: index("processes_type_idx").on(t.type),
  })
);

export const processSteps = sqliteTable(
  "process_steps",
  {
    id: id(),
    processId: text("process_id")
      .notNull()
      .references(() => processes.id, { onDelete: "cascade" }),
    stepKey: text("step_key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    ordinal: integer("ordinal").notNull(),
    dayIndex: integer("day_index"), // for starter_build days; null otherwise
    scheduledFor: integer("scheduled_for", { mode: "timestamp_ms" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    skipped: integer("skipped", { mode: "boolean" }).notNull().default(false),
    skippedReason: text("skipped_reason"),
    metadataJson: text("metadata_json").notNull().default("{}"),
  },
  (t) => ({
    processIdx: index("process_steps_process_idx").on(t.processId, t.ordinal),
    scheduledIdx: index("process_steps_scheduled_idx").on(t.scheduledFor),
  })
);

export const observations = sqliteTable(
  "observations",
  {
    id: id(),
    processId: text("process_id")
      .notNull()
      .references(() => processes.id, { onDelete: "cascade" }),
    stepId: text("step_id").references(() => processSteps.id, { onDelete: "set null" }),
    kind: text("kind", {
      enum: ["smell", "rise", "bubble", "photo", "temperature", "free"],
    }).notNull(),
    valueJson: text("value_json").notNull().default("{}"),
    body: text("body"),
    photoPath: text("photo_path"),
    recordedAt: integer("recorded_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    processIdx: index("observations_process_idx").on(t.processId, t.recordedAt),
  })
);

// ─── Reminders pipeline ───────────────────────────────────────────────────
export const reminderStatuses = ["pending", "sent", "failed", "cancelled"] as const;
export type ReminderStatus = (typeof reminderStatuses)[number];

export const reminders = sqliteTable(
  "reminders",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    processId: text("process_id").references(() => processes.id, { onDelete: "cascade" }),
    stepId: text("step_id").references(() => processSteps.id, { onDelete: "cascade" }),
    channel: text("channel", { enum: ["telegram"] }).notNull().default("telegram"),
    fireAt: integer("fire_at", { mode: "timestamp_ms" }).notNull(),
    status: text("status", { enum: reminderStatuses }).notNull().default("pending"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    deepLink: text("deep_link"),
    attempts: integer("attempts").notNull().default(0),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
    createdAt: createdAt(),
  },
  (t) => ({
    pendingIdx: index("reminders_pending_idx").on(t.status, t.fireAt),
  })
);

// ─── Google Calendar integration ──────────────────────────────────────────
export const googleAccounts = sqliteTable("google_accounts", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  scope: text("scope").notNull().default(""),
  calendarId: text("calendar_id"),
  connectedAt: integer("connected_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const googleEvents = sqliteTable(
  "google_events",
  {
    id: id(),
    stepId: text("step_id")
      .notNull()
      .unique()
      .references(() => processSteps.id, { onDelete: "cascade" }),
    processId: text("process_id")
      .notNull()
      .references(() => processes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: text("event_id").notNull(),
    calendarId: text("calendar_id").notNull(),
    status: text("status", { enum: ["active", "cancelled"] }).notNull().default("active"),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    processIdx: index("google_events_process_idx").on(t.processId),
    userIdx: index("google_events_user_idx").on(t.userId),
  })
);

// ─── Discard tracking ─────────────────────────────────────────────────────
export const discardJars = sqliteTable("discard_jars", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  openedAt: integer("opened_at", { mode: "timestamp_ms" }).notNull(),
  closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  currentGrams: real("current_grams").notNull().default(0),
  notes: text("notes"),
});

export const discardUses = sqliteTable("discard_uses", {
  id: id(),
  jarId: text("jar_id")
    .notNull()
    .references(() => discardJars.id, { onDelete: "cascade" }),
  recipeKey: text("recipe_key").notNull(),
  recipeName: text("recipe_name").notNull(),
  gramsUsed: real("grams_used").notNull(),
  rating: integer("rating"),
  notes: text("notes"),
  usedAt: integer("used_at", { mode: "timestamp_ms" }).notNull(),
});

// ─── Knowledge base ───────────────────────────────────────────────────────
export const guideSections = sqliteTable(
  "guide_sections",
  {
    slug: text("slug").primaryKey(),
    parentSlug: text("parent_slug"),
    sourceFile: text("source_file").notNull(),
    title: text("title").notNull(),
    ordinal: integer("ordinal").notNull(),
    depth: integer("depth").notNull(),
    contentMd: text("content_md").notNull(),
    contentHtml: text("content_html").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    contentHash: text("content_hash").notNull(),
    updatedAt: createdAt(),
  },
  (t) => ({
    parentIdx: index("guide_sections_parent_idx").on(t.parentSlug, t.ordinal),
  })
);

export const troubleshootRows = sqliteTable("troubleshoot_rows", {
  id: id(),
  sourceFile: text("source_file").notNull(),
  symptom: text("symptom").notNull(),
  diagnosis: text("diagnosis").notNull(),
  fix: text("fix").notNull(),
  ordinal: integer("ordinal").notNull(),
});
