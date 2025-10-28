CREATE TABLE `monthly_work_hours` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`month` text NOT NULL,
	`month_number` integer NOT NULL,
	`weekdays` integer NOT NULL,
	`work_hours` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monthly_work_hours_year_month_number_unique` ON `monthly_work_hours` (`year`,`month_number`);