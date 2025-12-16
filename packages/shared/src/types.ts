export interface User {
  id: number;
  username: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

export interface Consultant {
  id: number;
  name: string;
  hourlyRate: number;
  startDate: Date;
  terminationDate?: Date | null;
  evaluationNotes?: string | null;
  role?: string | null; // For invoice grouping
  serviceDescription?: string | null; // Optional custom description
  // Personal Data
  email?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  phone?: string | null;
  birthDate?: Date | null;
  shirtSize?: ShirtSize | null;
  // Company Data
  companyLegalName?: string | null;
  companyTradeName?: string | null;
  cnpj?: string | null;
  payoneerID?: string | null;
  // Emergency Contact
  emergencyContactName?: string | null;
  emergencyContactRelation?: string | null;
  emergencyContactPhone?: string | null;
  // Documents
  cpf?: string | null;
  cnhPhotoPath?: string | null;
  addressProofPhotoPath?: string | null;
  // Termination Process
  finalPaymentAmount?: number | null;
  equipmentReturnDeadline?: Date | null;
  contractSignedDate?: Date | null;
  terminationReason?: TerminationReason | null;
  // Time Doctor Integration
  timeDoctorPayeeId?: string | null;
  hourlyLimit?: number | null;
  rateType: string;
  currency: string;
  timeDoctorSyncEnabled: boolean;
  lastTimeDoctorSync?: Date | null;
  // Bonus
  yearlyBonus?: number | null;
  bonusMonth?: number | null; // 1-12, month when consultant receives yearly bonus
  // Number field for custom assignment
  number?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollCycle {
  id: number;
  monthLabel: string;
  // Header dates
  payoneerAccountFundedDate?: Date | null;
  payoneerFundingDate?: Date | null;
  calculatedPaymentDate?: Date | null;
  paymentArrivalExpectedDate?: Date | null;
  paymentArrivalDate?: Date | null;
  sendReceiptDate?: Date | null;
  sendInvoiceDate?: Date | null;
  clientInvoicePaymentDate?: Date | null;
  clientPaymentScheduledDate?: Date | null;
  invoiceApprovalDate?: Date | null;
  hoursLimitChangedOn?: Date | null;
  additionalPaidOn?: Date | null; // Deprecated but kept for backward compatibility
  consultantsPaidDate?: Date | null;
  timeDoctorMarkedPaidDate?: Date | null;
  // Footer values
  globalWorkHours?: number | null;
  omnigoBonus?: number | null;
  pagamentoPIX?: number | null;
  pagamentoInter?: number | null;
  equipmentsUSD?: number | null;
  payoneerBalanceCarryover?: number | null;
  payoneerBalanceApplied?: number | null;
  receiptAmount?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CycleLineItem {
  id: number;
  cycleId: number;
  consultantId: number;
  invoiceSent?: boolean | null;
  adjustmentValue?: number | null;
  informedDate?: Date | null;
  bonusPaydate?: Date | null;
  ratePerHour: number; // Snapshot of consultant rate
  bonusAdvance?: number | null;
  advanceDate?: Date | null;
  workHours?: number | null; // Override for cycle.globalWorkHours
  additionalPaidAmount?: number | null;
  additionalPaidDate?: Date | null;
  additionalPaidMethod?: 'PIX' | 'INTER' | 'OTHER' | null;
  comments?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: number;
  cycleId: number;
  consultantId: number;
  hours?: number | null;
  rate?: number | null;
  amount?: number | null;
  sent?: boolean | null;
  approved?: boolean | null;
  sentDate?: Date | null;
  approvedDate?: Date | null;
}

export enum PaymentKind {
  REGULAR = 'REGULAR',
  BONUS = 'BONUS',
  ADVANCE = 'ADVANCE',
  ADJUSTMENT = 'ADJUSTMENT'
}

export interface Payment {
  id: number;
  cycleId: number;
  consultantId?: number | null;
  kind: PaymentKind;
  amount: number;
  date: Date;
}

export interface AuditLog {
  id: number;
  userId: number;
  cycleId?: number | null;
  action: string;
  entityType: string;
  entityId: number;
  changes: Record<string, any>; // JSON diff
  timestamp: Date;
}

// Computed types (not stored in DB)
export interface CycleLineItemWithSubtotal extends CycleLineItem {
  subtotal: number;
  consultant: Consultant;
}

export interface PayrollCycleWithTotals extends PayrollCycle {
  totalHourlyValue: number;
  usdTotal: number;
  lines: CycleLineItemWithSubtotal[];
}

export interface CycleSummary {
  cycle: PayrollCycle;
  totalHourlyValue: number;
  usdTotal: number;
  lineCount: number;
  anomalies: string[];
  // Diagnostic: breakdown of consultants and rates included in totalHourlyValue
  hourlyValueBreakdown?: Array<{
    consultantId: number;
    consultantName: string;
    snapshottedRate: number;
    currentRate?: number; // For comparison
  }>;
}

// Brazilian-specific types
export type ShirtSize = 'P' | 'M' | 'G' | 'GG' | 'GGG';

// Termination types
export enum TerminationReason {
  FIRED = 'FIRED',
  LAID_OFF = 'LAID_OFF',
  QUIT = 'QUIT',
  MUTUAL_AGREEMENT = 'MUTUAL_AGREEMENT'
}

export interface BrazilianDocuments {
  cpf: string;
  cnpj?: string;
}

export interface FileUpload {
  filename: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ConsultantEquipment {
  id: number;
  consultantId: number;
  deviceName: string;
  model?: string | null;
  purchaseDate?: Date | null;
  serialNumber?: string | null;
  returnRequired: boolean;
  returnedDate?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Monthly work hours reference
export interface MonthlyWorkHours {
  id: number;
  year: number;
  month: string;
  monthNumber: number;
  weekdays: number;
  workHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportWorkHoursResult {
  imported: number;
  updated: number;
  errors?: string[];
}

// Payment calculation types
export interface ConsultantPaymentDetail {
  consultantId: number;
  consultantName: string;
  payoneerID?: string | null;
  ratePerHour: number;
  workHours: number;
  baseAmount: number; // ratePerHour * workHours
  adjustmentValue: number;
  bonusAdvance: number;
  subtotal: number; // baseAmount + adjustment - bonusAdvance
}

export interface PaymentCalculationResult {
  cycleId: number;
  monthLabel: string;
  calculatedAt: Date;
  // Individual consultant payments
  consultantPayments: ConsultantPaymentDetail[];
  // Total amounts for Wells Fargo transfer
  totalConsultantPayments: number; // Sum of all consultant subtotals
  omnigoBonus: number;
  equipmentsUSD: number;
  totalWellsFargoTransfer: number; // Amount to request from Wells Fargo
  // Cycle summary info
  totalHourlyValue: number;
  globalWorkHours: number;
  // Payment calculation uses next month's hours
  paymentMonthWorkHours: number; // Work hours from the month after cycle month
  paymentMonthLabel: string; // Label of the month whose hours were used (e.g., "December 2025")
  usdTotal: number; // Final cycle total after PIX/Inter deductions
  anomalies: string[];
}

export interface BonusWorkflow {
  id: number;
  cycleId: number;
  bonusRecipientConsultantId?: number | null;
  bonusAnnouncementDate?: Date | null;
  emailGenerated: boolean;
  emailContent?: string | null;
  paidWithPayroll: boolean;
  bonusPaymentDate?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BonusEmailTemplate {
  cycleId: number;
  monthLabel: string;
  consultantsWithBonuses: Array<{
    name: string;
    bonusAmount: number;
  }>;
  announcementDate: Date;
}

export interface SystemSettings {
  id: number;
  defaultOmnigoBonus: number;
  updatedAt: Date;
}

export interface Setting {
  id: number;
  key: string;
  value: string; // Encrypted value
  updatedAt: Date;
  updatedBy?: number | null;
}

export interface PayoneerConfig {
  apiKey: string;
  programId: string;
  apiUrl: string;
}

export interface PayoneerPayee {
  payeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  paymentMethod?: string;
}

// Time Doctor types
export interface TimeDoctorUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface TimeDoctorActivity {
  userId: string;
  userName: string;
  date: string;
  workHours: number;
  tasks: string;
  projects: string;
}

export interface TimeDoctorActivityParams {
  from: string;
  to: string;
  userId?: string;
}

// Invoice system types
export interface Company {
  id: number;
  name: string;
  legalName?: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  floridaTaxId?: string | null;
  federalTaxId?: string | null;
  logoPath?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: number;
  name: string;
  legalName?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  taxId?: string | null;
  paymentTerms?: string | null;
  paymentNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum ClientInvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

export interface ClientInvoice {
  id: number;
  invoiceNumber: number;
  cycleId: number;
  clientId: number;
  invoiceDate: Date;
  dueDate: Date;
  status: ClientInvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  amountDue: number;
  notes?: string | null;
  paymentTerms?: string | null;
  sentDate?: Date | null;
  approvedDate?: Date | null;
  paidDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: number;
  invoiceId: number;
  serviceName: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  consultantIds?: number[] | null; // JSON array parsed
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientInvoiceWithDetails extends ClientInvoice {
  client: Client;
  cycle: PayrollCycle;
  lineItems: InvoiceLineItem[];
}
