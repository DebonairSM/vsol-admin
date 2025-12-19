ALTER TABLE invoices ADD `file_path` text;--> statement-breakpoint
ALTER TABLE invoices ADD `file_name` text;--> statement-breakpoint
ALTER TABLE invoices ADD `uploaded_by` integer REFERENCES users(id);--> statement-breakpoint
ALTER TABLE invoices ADD `uploaded_at` integer;--> statement-breakpoint
ALTER TABLE users ADD `must_change_password` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE users ADD `consultant_id` integer REFERENCES consultants(id);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/