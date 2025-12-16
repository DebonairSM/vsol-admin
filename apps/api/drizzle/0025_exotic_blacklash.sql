CREATE TABLE `client_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`client_id` integer NOT NULL,
	`invoice_date` integer NOT NULL,
	`due_date` integer NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`amount_due` real DEFAULT 0 NOT NULL,
	`notes` text,
	`payment_terms` text,
	`sent_date` integer,
	`approved_date` integer,
	`paid_date` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `payroll_cycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`legal_name` text,
	`contact_name` text,
	`contact_phone` text,
	`contact_email` text,
	`address` text,
	`city` text,
	`state` text,
	`zip` text,
	`country` text,
	`tax_id` text,
	`payment_terms` text,
	`payment_notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`legal_name` text,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`zip` text NOT NULL,
	`country` text NOT NULL,
	`phone` text,
	`website` text,
	`email` text,
	`florida_tax_id` text,
	`federal_tax_id` text,
	`logo_path` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoice_line_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`service_name` text NOT NULL,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`rate` real NOT NULL,
	`amount` real NOT NULL,
	`consultant_ids` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `client_invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoice_number_sequence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`next_number` integer DEFAULT 199 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE consultants ADD `role` text;--> statement-breakpoint
ALTER TABLE consultants ADD `service_description` text;--> statement-breakpoint
CREATE UNIQUE INDEX `client_invoices_invoice_number_unique` ON `client_invoices` (`invoice_number`);