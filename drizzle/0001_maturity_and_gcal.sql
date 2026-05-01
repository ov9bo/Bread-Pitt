ALTER TABLE `processes` ADD `extension_days` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `preferences` ADD `google_calendar_sync_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE TABLE `google_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`scope` text DEFAULT '' NOT NULL,
	`calendar_id` text,
	`connected_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `google_accounts_user_id_unique` ON `google_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `google_events` (
	`id` text PRIMARY KEY NOT NULL,
	`step_id` text NOT NULL,
	`process_id` text NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`calendar_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_synced_at` integer NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `process_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`process_id`) REFERENCES `processes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `google_events_step_id_unique` ON `google_events` (`step_id`);--> statement-breakpoint
CREATE INDEX `google_events_process_idx` ON `google_events` (`process_id`);--> statement-breakpoint
CREATE INDEX `google_events_user_idx` ON `google_events` (`user_id`);
