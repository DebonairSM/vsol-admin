CREATE TABLE `vacation_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`consultant_id` integer NOT NULL,
	`vacation_date` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`created_by` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`consultant_id`) REFERENCES `consultants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
