CREATE TABLE `archive_images` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`collection` text NOT NULL,
	`chapter` text NOT NULL,
	`date` text NOT NULL,
	`position` integer NOT NULL,
	`original_key` text NOT NULL,
	`display_key` text NOT NULL,
	`thumbnail_key` text NOT NULL,
	`original_name` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `archive_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
