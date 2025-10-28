CREATE TABLE `bonus_workflows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` integer NOT NULL,
	`bonus_announcement_date` integer,
	`email_generated` integer DEFAULT false NOT NULL,
	`email_content` text,
	`paid_with_payroll` integer DEFAULT false NOT NULL,
	`bonus_payment_date` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `payroll_cycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE cycle_line_items ADD `additional_paid_amount` real;--> statement-breakpoint
ALTER TABLE cycle_line_items ADD `additional_paid_date` integer;--> statement-breakpoint
ALTER TABLE payroll_cycles ADD `consultants_paid_date` integer;