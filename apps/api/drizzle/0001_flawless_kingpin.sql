CREATE TABLE `consultant_equipment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`consultant_id` integer NOT NULL,
	`device_name` text NOT NULL,
	`model` text,
	`purchase_date` integer,
	`serial_number` text,
	`return_required` integer DEFAULT true NOT NULL,
	`returned_date` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`consultant_id`) REFERENCES `consultants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE consultants ADD `final_payment_amount` real;--> statement-breakpoint
ALTER TABLE consultants ADD `equipment_return_deadline` integer;--> statement-breakpoint
ALTER TABLE consultants ADD `contract_signed_date` integer;--> statement-breakpoint
ALTER TABLE consultants ADD `termination_reason` text;