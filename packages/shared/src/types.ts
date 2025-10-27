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
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollCycle {
  id: number;
  monthLabel: string;
  // Header dates
  calculatedPaymentDate?: Date | null;
  paymentArrivalDate?: Date | null;
  sendReceiptDate?: Date | null;
  sendInvoiceDate?: Date | null;
  invoiceApprovalDate?: Date | null;
  hoursLimitChangedOn?: Date | null;
  additionalPaidOn?: Date | null;
  // Footer values
  globalWorkHours?: number | null;
  omnigoBonus?: number | null;
  pagamentoPIX?: number | null;
  pagamentoInter?: number | null;
  equipmentsUSD?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CycleLineItem {
  id: number;
  cycleId: number;
  consultantId: number;
  invoiceSent?: boolean | null;
  adjustmentValue?: number | null;
  bonusDate?: Date | null;
  informedDate?: Date | null;
  bonusPaydate?: Date | null;
  ratePerHour: number; // Snapshot of consultant rate
  bonusAdvance?: number | null;
  advanceDate?: Date | null;
  workHours?: number | null; // Override for cycle.globalWorkHours
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
}

// Brazilian-specific types
export type ShirtSize = 'P' | 'M' | 'G' | 'GG' | 'GGG';

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
