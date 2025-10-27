import { sqliteTable, integer, text, real, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Consultants table
export const consultants = sqliteTable('consultants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  hourlyRate: real('hourly_rate').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  terminationDate: integer('termination_date', { mode: 'timestamp' }),
  evaluationNotes: text('evaluation_notes'),
  // Personal Data
  email: text('email'),
  address: text('address'),
  neighborhood: text('neighborhood'),
  city: text('city'),
  state: text('state'),
  cep: text('cep'),
  phone: text('phone'),
  birthDate: integer('birth_date', { mode: 'timestamp' }),
  shirtSize: text('shirt_size', { enum: ['P', 'M', 'G', 'GG', 'GGG'] }),
  // Company Data
  companyLegalName: text('company_legal_name'),
  companyTradeName: text('company_trade_name'),
  cnpj: text('cnpj'),
  payoneerID: text('payoneer_id'),
  // Emergency Contact
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactRelation: text('emergency_contact_relation'),
  emergencyContactPhone: text('emergency_contact_phone'),
  // Documents
  cpf: text('cpf'),
  cnhPhotoPath: text('cnh_photo_path'),
  addressProofPhotoPath: text('address_proof_photo_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Payroll cycles table
export const payrollCycles = sqliteTable('payroll_cycles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monthLabel: text('month_label').notNull().unique(),
  // Header dates
  calculatedPaymentDate: integer('calculated_payment_date', { mode: 'timestamp' }),
  paymentArrivalDate: integer('payment_arrival_date', { mode: 'timestamp' }),
  sendReceiptDate: integer('send_receipt_date', { mode: 'timestamp' }),
  sendInvoiceDate: integer('send_invoice_date', { mode: 'timestamp' }),
  invoiceApprovalDate: integer('invoice_approval_date', { mode: 'timestamp' }),
  hoursLimitChangedOn: integer('hours_limit_changed_on', { mode: 'timestamp' }),
  additionalPaidOn: integer('additional_paid_on', { mode: 'timestamp' }),
  // Footer values
  globalWorkHours: integer('global_work_hours'),
  omnigoBonus: real('omnigo_bonus'),
  pagamentoPIX: real('pagamento_pix'),
  pagamentoInter: real('pagamento_inter'),
  equipmentsUSD: real('equipments_usd'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Cycle line items table
export const cycleLineItems = sqliteTable('cycle_line_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cycleId: integer('cycle_id').notNull().references(() => payrollCycles.id),
  consultantId: integer('consultant_id').notNull().references(() => consultants.id),
  invoiceSent: integer('invoice_sent', { mode: 'boolean' }),
  adjustmentValue: real('adjustment_value'),
  bonusDate: integer('bonus_date', { mode: 'timestamp' }),
  informedDate: integer('informed_date', { mode: 'timestamp' }),
  bonusPaydate: integer('bonus_paydate', { mode: 'timestamp' }),
  ratePerHour: real('rate_per_hour').notNull(), // Snapshot of consultant rate
  bonusAdvance: real('bonus_advance'),
  advanceDate: integer('advance_date', { mode: 'timestamp' }),
  workHours: integer('work_hours'), // Override for cycle.globalWorkHours
  comments: text('comments'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Invoices table
export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cycleId: integer('cycle_id').notNull().references(() => payrollCycles.id),
  consultantId: integer('consultant_id').notNull().references(() => consultants.id),
  hours: real('hours'),
  rate: real('rate'),
  amount: real('amount'),
  sent: integer('sent', { mode: 'boolean' }),
  approved: integer('approved', { mode: 'boolean' }),
  sentDate: integer('sent_date', { mode: 'timestamp' }),
  approvedDate: integer('approved_date', { mode: 'timestamp' })
});

// Payments table
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cycleId: integer('cycle_id').notNull().references(() => payrollCycles.id),
  consultantId: integer('consultant_id').references(() => consultants.id),
  kind: text('kind', { enum: ['REGULAR', 'BONUS', 'ADVANCE', 'ADJUSTMENT'] }).notNull(),
  amount: real('amount').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull()
});

// Audit log table
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  cycleId: integer('cycle_id').references(() => payrollCycles.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  changes: text('changes').notNull(), // JSON string
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs)
}));

export const consultantsRelations = relations(consultants, ({ many }) => ({
  lineItems: many(cycleLineItems),
  invoices: many(invoices),
  payments: many(payments)
}));

export const payrollCyclesRelations = relations(payrollCycles, ({ many }) => ({
  lines: many(cycleLineItems),
  invoices: many(invoices),
  payments: many(payments),
  auditLogs: many(auditLogs)
}));

export const cycleLineItemsRelations = relations(cycleLineItems, ({ one }) => ({
  cycle: one(payrollCycles, {
    fields: [cycleLineItems.cycleId],
    references: [payrollCycles.id]
  }),
  consultant: one(consultants, {
    fields: [cycleLineItems.consultantId],
    references: [consultants.id]
  })
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  cycle: one(payrollCycles, {
    fields: [invoices.cycleId],
    references: [payrollCycles.id]
  }),
  consultant: one(consultants, {
    fields: [invoices.consultantId],
    references: [consultants.id]
  })
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  cycle: one(payrollCycles, {
    fields: [payments.cycleId],
    references: [payrollCycles.id]
  }),
  consultant: one(consultants, {
    fields: [payments.consultantId],
    references: [consultants.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  }),
  cycle: one(payrollCycles, {
    fields: [auditLogs.cycleId],
    references: [payrollCycles.id]
  })
}));
