CREATE TABLE `discard_jars` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`opened_at` integer NOT NULL,
	`closed_at` integer,
	`current_grams` real DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `discard_uses` (
	`id` text PRIMARY KEY NOT NULL,
	`jar_id` text NOT NULL,
	`recipe_key` text NOT NULL,
	`recipe_name` text NOT NULL,
	`grams_used` real NOT NULL,
	`rating` integer,
	`notes` text,
	`used_at` integer NOT NULL,
	FOREIGN KEY (`jar_id`) REFERENCES `discard_jars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guide_sections` (
	`slug` text PRIMARY KEY NOT NULL,
	`parent_slug` text,
	`source_file` text NOT NULL,
	`title` text NOT NULL,
	`ordinal` integer NOT NULL,
	`depth` integer NOT NULL,
	`content_md` text NOT NULL,
	`content_html` text NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `guide_sections_parent_idx` ON `guide_sections` (`parent_slug`,`ordinal`);--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`process_id` text NOT NULL,
	`step_id` text,
	`kind` text NOT NULL,
	`value_json` text DEFAULT '{}' NOT NULL,
	`body` text,
	`photo_path` text,
	`recorded_at` integer NOT NULL,
	FOREIGN KEY (`process_id`) REFERENCES `processes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`step_id`) REFERENCES `process_steps`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `observations_process_idx` ON `observations` (`process_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL,
	`kitchen_temp_f` real DEFAULT 72 NOT NULL,
	`notifications_enabled` integer DEFAULT true NOT NULL,
	`quiet_hours_start` integer DEFAULT 22 NOT NULL,
	`quiet_hours_end` integer DEFAULT 7 NOT NULL,
	`starter_nickname` text DEFAULT 'The starter' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `process_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`process_id` text NOT NULL,
	`step_key` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`ordinal` integer NOT NULL,
	`day_index` integer,
	`scheduled_for` integer NOT NULL,
	`completed_at` integer,
	`skipped` integer DEFAULT false NOT NULL,
	`skipped_reason` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`process_id`) REFERENCES `processes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `process_steps_process_idx` ON `process_steps` (`process_id`,`ordinal`);--> statement-breakpoint
CREATE INDEX `process_steps_scheduled_idx` ON `process_steps` (`scheduled_for`);--> statement-breakpoint
CREATE TABLE `processes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`nickname` text,
	`recipe_version` text DEFAULT 'v1' NOT NULL,
	`kitchen_temp_at_start` real,
	`options_json` text DEFAULT '{}' NOT NULL,
	`notes` text,
	`started_at` integer NOT NULL,
	`paused_at` integer,
	`completed_at` integer,
	`restarted_from_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `processes_status_idx` ON `processes` (`status`);--> statement-breakpoint
CREATE INDEX `processes_type_idx` ON `processes` (`type`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`process_id` text,
	`step_id` text,
	`channel` text DEFAULT 'telegram' NOT NULL,
	`fire_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`deep_link` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`sent_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`process_id`) REFERENCES `processes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`step_id`) REFERENCES `process_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminders_pending_idx` ON `reminders` (`status`,`fire_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `setup_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `troubleshoot_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`source_file` text NOT NULL,
	`symptom` text NOT NULL,
	`diagnosis` text NOT NULL,
	`fix` text NOT NULL,
	`ordinal` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text DEFAULT 'Baker' NOT NULL,
	`telegram_chat_id` text,
	`telegram_pairing_code` text,
	`telegram_pairing_expires_at` integer,
	`created_at` integer NOT NULL
);
