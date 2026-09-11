CREATE TABLE `checkins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`email` text NOT NULL,
	`checked_in_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_checkins_event_email` ON `checkins` (`event_id`,`email`);
