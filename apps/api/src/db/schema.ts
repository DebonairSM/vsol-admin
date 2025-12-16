import { sqliteTable, integer, text, real, blob, unique } from 'drizzle-orm/sqlite-core';
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
  // Termination Process
  finalPaymentAmount: real('final_payment_amount'),
  equipmentReturnDeadline: integer('equipment_return_deadline', { mode: 'timestamp' }),
  contractSignedDate: integer('contract_signed_date', { mode: 'timestamp' }),
  terminationReason: text('termination_reason', { enum: ['FIRED', 'LAID_OFF', 'QUIT', 'MUTUAL_AGREEMENT'] }),
  // Time Doctor Integration
  timeDoctorPayeeId: text('time_doctor_payee_id'),
  hourlyLimit: integer('hourly_limit'),
  rateType: text('rate_type').notNull().default('Per Hour'),
  currency: text('currency').notNull().default('USD'),
  timeDoctorSyncEnabled: integer('time_doctor_sync_enabled', { mode: 'boolean' }).notNull().default(true),
  lastTimeDoctorSync: integer('last_time_doctor_sync', { mode: 'timestamp' }),
  // Bonus
  yearlyBonus: real('yearly_bonus'),
  bonusMonth: integer('bonus_month'), // 1-12, month when consultant receives yearly bonus
  // Number field for custom assignment
  number: real('number'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Payroll cycles table
export const payrollCycles = sqliteTable('payroll_cycles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monthLabel: text('month_label').notNull(),
  // Header dates
  payoneerAccountFundedDate: integer('payoneer_account_funded_date', { mode: 'timestamp' }),
  payoneerFundingDate: integer('payoneer_funding_date', { mode: 'timestamp' }),
  calculatedPaymentDate: integer('calculated_payment_date', { mode: 'timestamp' }),
  paymentArrivalExpectedDate: integer('payment_arrival_expected_date', { mode: 'timestamp' }),
  paymentArrivalDate: integer('payment_arrival_date', { mode: 'timestamp' }),
  sendReceiptDate: integer('send_receipt_date', { mode: 'timestamp' }),
  sendInvoiceDate: integer('send_invoice_date', { mode: 'timestamp' }),
  clientInvoicePaymentDate: integer('client_invoice_payment_date', { mode: 'timestamp' }),
  clientPaymentScheduledDate: integer('client_payment_scheduled_date', { mode: 'timestamp' }),
  invoiceApprovalDate: integer('invoice_approval_date', { mode: 'timestamp' }),
  hoursLimitChangedOn: integer('hours_limit_changed_on', { mode: 'timestamp' }),
  additionalPaidOn: integer('additional_paid_on', { mode: 'timestamp' }), // Deprecated but kept for backward compatibility
  consultantsPaidDate: integer('consultants_paid_date', { mode: 'timestamp' }),
  timeDoctorMarkedPaidDate: integer('time_doctor_marked_paid_date', { mode: 'timestamp' }),
  // Footer values
  globalWorkHours: integer('global_work_hours'),
  omnigoBonus: real('omnigo_bonus'),
  pagamentoPIX: real('pagamento_pix'),
  pagamentoInter: real('pagamento_inter'),
  equipmentsUSD: real('equipments_usd'),
  payoneerBalanceCarryover: real('payoneer_balance_carryover'),
  payoneerBalanceApplied: real('payoneer_balance_applied'),
  receiptAmount: real('receipt_amount'),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
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
  informedDate: integer('informed_date', { mode: 'timestamp' }),
  bonusPaydate: integer('bonus_paydate', { mode: 'timestamp' }),
  ratePerHour: real('rate_per_hour').notNull(), // Snapshot of consultant rate
  bonusAdvance: real('bonus_advance'),
  advanceDate: integer('advance_date', { mode: 'timestamp' }),
  workHours: integer('work_hours'), // Override for cycle.globalWorkHours
  additionalPaidAmount: real('additional_paid_amount'),
  additionalPaidDate: integer('additional_paid_date', { mode: 'timestamp' }),
  additionalPaidMethod: text('additional_paid_method', { enum: ['PIX', 'INTER', 'OTHER'] }),
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

// Consultant equipment table
export const consultantEquipment = sqliteTable('consultant_equipment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  consultantId: integer('consultant_id').notNull().references(() => consultants.id),
  deviceName: text('device_name').notNull(),
  model: text('model'),
  purchaseDate: integer('purchase_date', { mode: 'timestamp' }),
  serialNumber: text('serial_number'),
  returnRequired: integer('return_required', { mode: 'boolean' }).notNull().default(true),
  returnedDate: integer('returned_date', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Monthly work hours reference table
export const monthlyWorkHours = sqliteTable('monthly_work_hours', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: integer('year').notNull(),
  month: text('month').notNull(), // 'January', 'February', etc.
  monthNumber: integer('month_number').notNull(), // 1-12
  weekdays: integer('weekdays').notNull(), // Working days in the month
  workHours: integer('work_hours').notNull(), // Total billable hours
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  // Unique constraint on year + month
  uniqueYearMonth: unique().on(table.year, table.monthNumber)
}));

// Bonus workflows table
export const bonusWorkflows = sqliteTable('bonus_workflows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cycleId: integer('cycle_id').notNull().references(() => payrollCycles.id),
  bonusRecipientConsultantId: integer('bonus_recipient_consultant_id').references(() => consultants.id),
  bonusAnnouncementDate: integer('bonus_announcement_date', { mode: 'timestamp' }),
  emailGenerated: integer('email_generated', { mode: 'boolean' }).notNull().default(false),
  emailContent: text('email_content'),
  paidWithPayroll: integer('paid_with_payroll', { mode: 'boolean' }).notNull().default(false),
  bonusPaymentDate: integer('bonus_payment_date', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// System settings table (singleton pattern - single row)
export const systemSettings = sqliteTable('system_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  defaultOmnigoBonus: real('default_omnigo_bonus').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

// Settings table for encrypted key-value pairs (e.g., API credentials)
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(), // Encrypted value
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedBy: integer('updated_by').references(() => users.id)
});

// Refresh tokens table for JWT rotation
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(), // Hashed token
  tokenFamily: text('token_family').notNull(), // UUID identifying related tokens
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
  replacedBy: text('replaced_by'), // Token ID that replaced this one
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  // Security metadata
  ipAddress: text('ip_address'),
  userAgent: text('user_agent')
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
  refreshTokens: many(refreshTokens),
  settingsUpdates: many(settings)
}));

export const consultantsRelations = relations(consultants, ({ many }) => ({
  lineItems: many(cycleLineItems),
  invoices: many(invoices),
  payments: many(payments),
  equipment: many(consultantEquipment)
}));

export const payrollCyclesRelations = relations(payrollCycles, ({ many, one }) => ({
  lines: many(cycleLineItems),
  invoices: many(invoices),
  payments: many(payments),
  auditLogs: many(auditLogs),
  bonusWorkflow: one(bonusWorkflows)
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

export const consultantEquipmentRelations = relations(consultantEquipment, ({ one }) => ({
  consultant: one(consultants, {
    fields: [consultantEquipment.consultantId],
    references: [consultants.id]
  })
}));

export const monthlyWorkHoursRelations = relations(monthlyWorkHours, ({}) => ({}));

export const bonusWorkflowsRelations = relations(bonusWorkflows, ({ one }) => ({
  cycle: one(payrollCycles, {
    fields: [bonusWorkflows.cycleId],
    references: [payrollCycles.id]
  }),
  consultant: one(consultants, {
    fields: [bonusWorkflows.bonusRecipientConsultantId],
    references: [consultants.id]
  })
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id]
  })
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [settings.updatedBy],
    references: [users.id]
  })
}));
