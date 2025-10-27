CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`cycle_id` integer,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`changes` text NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cycle_id`) REFERENCES `payroll_cycles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `consultants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`hourly_rate` real NOT NULL,
	`start_date` integer NOT NULL,
	`termination_date` integer,
	`evaluation_notes` text,
	`email` text,
	`address` text,
	`neighborhood` text,
	`city` text,
	`state` text,
	`cep` text,
	`phone` text,
	`birth_date` integer,
	`shirt_size` text,
	`company_legal_name` text,
	`company_trade_name` text,
	`cnpj` text,
	`payoneer_id` text,
	`emergency_contact_name` text,
	`emergency_contact_relation` text,
	`emergency_contact_phone` text,
	`cpf` text,
	`cnh_photo_path` text,
	`address_proof_photo_path` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cycle_line_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` integer NOT NULL,
	`consultant_id` integer NOT NULL,
	`invoice_sent` integer,
	`adjustment_value` real,
	`bonus_date` integer,
	`informed_date` integer,
	`bonus_paydate` integer,
	`rate_per_hour` real NOT NULL,
	`bonus_advance` real,
	`advance_date` integer,
	`work_hours` integer,
	`comments` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `payroll_cycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultant_id`) REFERENCES `consultants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` integer NOT NULL,
	`consultant_id` integer NOT NULL,
	`hours` real,
	`rate` real,
	`amount` real,
	`sent` integer,
	`approved` integer,
	`sent_date` integer,
	`approved_date` integer,
	FOREIGN KEY (`cycle_id`) REFERENCES `payroll_cycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultant_id`) REFERENCES `consultants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cycle_id` integer NOT NULL,
	`consultant_id` integer,
	`kind` text NOT NULL,
	`amount` real NOT NULL,
	`date` integer NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `payroll_cycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consultant_id`) REFERENCES `consultants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payroll_cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`month_label` text NOT NULL,
	`calculated_payment_date` integer,
	`payment_arrival_date` integer,
	`send_receipt_date` integer,
	`send_invoice_date` integer,
	`invoice_approval_date` integer,
	`hours_limit_changed_on` integer,
	`additional_paid_on` integer,
	`global_work_hours` integer,
	`omnigo_bonus` real,
	`pagamento_pix` real,
	`pagamento_inter` real,
	`equipments_usd` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consultants_name_unique` ON `consultants` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_cycles_month_label_unique` ON `payroll_cycles` (`month_label`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);