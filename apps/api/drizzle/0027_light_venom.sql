/*
 SQLite does not support "Set default to column" out of the box; no defaults are being changed in this migration.
*/
ALTER TABLE consultants ADD `client_invoice_service_name` text;--> statement-breakpoint
ALTER TABLE consultants ADD `client_invoice_unit_price` real;--> statement-breakpoint
ALTER TABLE consultants ADD `client_invoice_service_description` text;