ALTER TABLE payroll_cycles ADD `client_invoice_payment_date` integer;--> statement-breakpoint
UPDATE payroll_cycles SET client_invoice_payment_date = consultant_invoices_verified_date WHERE consultant_invoices_verified_date IS NOT NULL;--> statement-breakpoint
ALTER TABLE `payroll_cycles` DROP COLUMN `consultant_invoices_verified_date`;