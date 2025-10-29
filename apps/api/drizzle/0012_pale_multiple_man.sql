CREATE TABLE `system_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`default_omnigo_bonus` real DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);

-- Insert initial row for singleton pattern
INSERT INTO `system_settings` (`default_omnigo_bonus`, `updated_at`) VALUES (0, unixepoch('now'));
