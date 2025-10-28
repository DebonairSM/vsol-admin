ALTER TABLE consultants ADD `time_doctor_payee_id` text;--> statement-breakpoint
ALTER TABLE consultants ADD `hourly_limit` integer;--> statement-breakpoint
ALTER TABLE consultants ADD `rate_type` text DEFAULT 'Per Hour' NOT NULL;--> statement-breakpoint
ALTER TABLE consultants ADD `currency` text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE consultants ADD `time_doctor_sync_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE consultants ADD `last_time_doctor_sync` integer;