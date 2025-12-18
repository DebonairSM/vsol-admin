import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  role: z.string(),
  createdAt: z.date()
});

// Brazilian validation functions
const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(.)\1*$/.test(cleanCPF)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF[10])) return false;
  
  return true;
};

const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14) return false;
  if (/^(.)\1*$/.test(cleanCNPJ)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleanCNPJ[12])) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleanCNPJ[13])) return false;
  
  return true;
};

// Consultant schemas
export const createConsultantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  hourlyRate: z.number().positive('Hourly rate must be positive'),
  startDate: z.string().datetime().optional(),
  evaluationNotes: z.string().optional(),
  // Personal Data
  email: z.string().email('Invalid email format').optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2, 'State must be 2 characters (e.g., RJ)').optional(),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP must be in format 12345-678').optional(),
  phone: z.string().regex(/^\+?55\s?\d{2}\s?\d{4,5}-?\d{4}$/, 'Invalid Brazilian phone format').optional(),
  birthDate: z.string().datetime().optional(),
  shirtSize: z.enum(['P', 'M', 'G', 'GG', 'GGG']).optional(),
  // Company Data
  companyLegalName: z.string().optional(),
  companyTradeName: z.string().optional(),
  cnpj: z.string().optional().superRefine((val, ctx) => {
    if (val === undefined || val === '') {
      return; // Skip validation for empty/undefined values
    }
    if (!validateCNPJ(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid CNPJ format'
      });
    }
  }),
  payoneerID: z.string().optional(),
  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  emergencyContactPhone: z.string().regex(/^\+?55\s?\d{2}\s?\d{4,5}-?\d{4}$/, 'Invalid Brazilian phone format').optional(),
      // Documents
      cpf: z.string().refine(validateCPF, 'Invalid CPF format').optional(),
      // Bonus
      yearlyBonus: z.number().positive().optional(),
      bonusMonth: z.number().int().min(1).max(12).optional(),
      // Number field for custom assignment
      number: z.number().refine(val => val === null || isFinite(val), 'Must be a finite number').nullable().optional(),
      // Invoice role for grouping
      role: z.string().optional(),
      serviceDescription: z.string().optional(),
      // Client invoice (billing) fields - independent from consultant payouts
      clientInvoiceServiceName: z.string().optional(),
      clientInvoiceUnitPrice: z.number().positive().optional(),
      clientInvoiceServiceDescription: z.string().optional()
});

export const updateConsultantSchema = z.object({
  name: z.string().min(1).optional(),
  hourlyRate: z.number().positive().optional(),
  terminationDate: z.string().datetime().nullable().optional(),
  evaluationNotes: z.string().nullable().optional(),
  // Personal Data
  email: z.string().email('Invalid email format').nullable().optional(),
  address: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().length(2, 'State must be 2 characters (e.g., RJ)').nullable().optional(),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP must be in format 12345-678').nullable().optional(),
  phone: z.string().regex(/^\+?55\s?\d{2}\s?\d{4,5}-?\d{4}$/, 'Invalid Brazilian phone format').nullable().optional(),
  birthDate: z.string().datetime().nullable().optional(),
  shirtSize: z.enum(['P', 'M', 'G', 'GG', 'GGG']).nullable().optional(),
  // Company Data
  companyLegalName: z.string().nullable().optional(),
  companyTradeName: z.string().nullable().optional(),
  cnpj: z.preprocess(
    (val) => {
      // Normalize: convert empty string to null
      if (val === '' || val === null || val === undefined) return null;
      // Strip formatting to normalize the value
      if (typeof val === 'string') {
        const cleaned = val.replace(/\D/g, '');
        // If empty after cleaning, return null
        if (cleaned === '') return null;
        // Return cleaned value for validation
        return cleaned;
      }
      return val;
    },
    z.union([
      z.string().refine((val) => {
        // If we have exactly 14 digits, validate the CNPJ format and check digits
        if (val.length === 14) {
          return validateCNPJ(val);
        }
        // Reject incomplete CNPJs (must be exactly 14 digits or null)
        return false;
      }, 'Invalid CNPJ format. CNPJ must have exactly 14 digits with valid check digits.'),
      z.null()
    ]).optional()
  ),
  payoneerID: z.string().nullable().optional(),
  // Emergency Contact
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactRelation: z.string().nullable().optional(),
  emergencyContactPhone: z.string().regex(/^\+?55\s?\d{2}\s?\d{4,5}-?\d{4}$/, 'Invalid Brazilian phone format').nullable().optional(),
  // Documents
  cpf: z.string().refine(validateCPF, 'Invalid CPF format').nullable().optional(),
  // Termination Process
  finalPaymentAmount: z.number().positive().nullable().optional(),
  equipmentReturnDeadline: z.string().datetime().nullable().optional(),
  contractSignedDate: z.string().datetime().nullable().optional(),
      terminationReason: z.enum(['FIRED', 'LAID_OFF', 'QUIT', 'MUTUAL_AGREEMENT']).nullable().optional(),
      // Bonus
      yearlyBonus: z.number().positive().nullable().optional(),
      bonusMonth: z.number().int().min(1).max(12).nullable().optional(),
      // Number field for custom assignment
      number: z.number().refine(val => val === null || isFinite(val), 'Must be a finite number').nullable().optional(),
      // Invoice role for grouping
      role: z.string().nullable().optional(),
      serviceDescription: z.string().nullable().optional(),
      // Client invoice (billing) fields - independent from consultant payouts
      clientInvoiceServiceName: z.string().nullable().optional(),
      clientInvoiceUnitPrice: z.number().positive().nullable().optional(),
      clientInvoiceServiceDescription: z.string().nullable().optional()
});

// Cycle schemas
export const createCycleSchema = z.object({
  monthLabel: z.string().min(1, 'Month label is required'),
  globalWorkHours: z.number().int().positive().optional(),
  omnigoBonus: z.number().optional(),
  invoiceBonus: z.number().optional()
});

export const updateCycleSchema = z.object({
  monthLabel: z.string().min(1).optional(),
  payoneerAccountFundedDate: z.string().datetime().nullable().optional(),
  payoneerFundingDate: z.string().datetime().nullable().optional(),
  calculatedPaymentDate: z.string().datetime().nullable().optional(),
  paymentArrivalExpectedDate: z.string().datetime().nullable().optional(),
  paymentArrivalDate: z.string().datetime().nullable().optional(),
  sendReceiptDate: z.string().datetime().nullable().optional(),
  sendInvoiceDate: z.string().datetime().nullable().optional(),
  clientInvoicePaymentDate: z.string().datetime().nullable().optional(),
  clientPaymentScheduledDate: z.string().datetime().nullable().optional(),
  invoiceApprovalDate: z.string().datetime().nullable().optional(),
  hoursLimitChangedOn: z.string().datetime().nullable().optional(),
  additionalPaidOn: z.string().datetime().nullable().optional(), // Deprecated but kept for backward compatibility
  consultantsPaidDate: z.string().datetime().nullable().optional(),
  timeDoctorMarkedPaidDate: z.string().datetime().nullable().optional(),
  globalWorkHours: z.number().int().positive().refine(val => isFinite(val), 'Must be a finite number').nullable().optional(),
  omnigoBonus: z.number().refine(val => isFinite(val), 'Must be a finite number').nullable().optional(),
  invoiceBonus: z.number().refine(val => isFinite(val), 'Must be a finite number').nullable().optional(),
  pagamentoPIX: z.number().refine(val => isFinite(val), 'Must be a finite number').nullable().optional(),
  pagamentoInter: z.number().refine(val => isFinite(val), 'Must be a finite number').nullable().optional(),
  equipmentsUSD: z.number().refine(val => isFinite(val), 'Must be a finite number').nullable().optional(),
  payoneerBalanceCarryover: z.number().refine(val => isFinite(val), 'Must be a finite number').nullable().optional(),
  payoneerBalanceApplied: z.number().refine(val => isFinite(val), 'Must be a finite number').nullable().optional(),
  receiptAmount: z.number().refine(val => isFinite(val), 'Must be a finite number').nullable().optional()
});

// Line item schemas
export const updateLineItemSchema = z.object({
  invoiceSent: z.boolean().nullable().optional(),
  adjustmentValue: z.number().refine(val => val === null || isFinite(val), 'Must be a finite number').nullable().optional(),
  informedDate: z.string().datetime().nullable().optional(),
  bonusPaydate: z.string().datetime().nullable().optional(),
  bonusAdvance: z.number().refine(val => val === null || isFinite(val), 'Must be a finite number').nullable().optional(),
  advanceDate: z.string().datetime().nullable().optional(),
  workHours: z.number().int().positive().refine(val => val === null || isFinite(val), 'Must be a finite number').nullable().optional(),
  additionalPaidAmount: z.number().refine(val => val === null || isFinite(val), 'Must be a finite number').nullable().optional(),
  additionalPaidDate: z.string().datetime().nullable().optional(),
  additionalPaidMethod: z.enum(['PIX', 'INTER', 'OTHER']).nullable().optional(),
  comments: z.string().nullable().optional()
});

// Payment schemas
export const paymentKindSchema = z.enum(['REGULAR', 'BONUS', 'ADVANCE', 'ADJUSTMENT']);

export const createPaymentSchema = z.object({
  cycleId: z.number().int().positive(),
  consultantId: z.number().int().positive().nullable().optional(),
  kind: paymentKindSchema,
  amount: z.number(),
  date: z.string().datetime()
});

// Export types from schemas
export type LoginRequest = z.infer<typeof loginSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type CreateConsultantRequest = z.infer<typeof createConsultantSchema>;
export type UpdateConsultantRequest = z.infer<typeof updateConsultantSchema>;
export type CreateCycleRequest = z.infer<typeof createCycleSchema>;
export type UpdateCycleRequest = z.infer<typeof updateCycleSchema>;
export type UpdateLineItemRequest = z.infer<typeof updateLineItemSchema>;
export type CreatePaymentRequest = z.infer<typeof createPaymentSchema>;

// File upload schemas
export const fileUploadSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string().refine(
    (type) => ['image/jpeg', 'image/jpg', 'image/png'].includes(type),
    'Only JPEG and PNG files are allowed'
  ),
  size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
  buffer: z.instanceof(Buffer)
});

export type FileUploadRequest = z.infer<typeof fileUploadSchema>;

// Equipment schemas
export const createEquipmentSchema = z.object({
  consultantId: z.number().int().positive(),
  deviceName: z.string().min(1, 'Device name is required'),
  model: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  serialNumber: z.string().optional(),
  returnRequired: z.boolean().default(true),
  notes: z.string().optional()
});

export const updateEquipmentSchema = z.object({
  deviceName: z.string().min(1).optional(),
  model: z.string().nullable().optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  returnRequired: z.boolean().optional(),
  returnedDate: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional()
});

// Termination schemas
export const initiateTerminationSchema = z.object({
  consultantId: z.number().int().positive(),
  terminationReason: z.enum(['FIRED', 'LAID_OFF', 'QUIT', 'MUTUAL_AGREEMENT']),
  terminationDate: z.string().datetime(),
  finalPaymentAmount: z.number().positive(),
  equipmentReturnDeadline: z.string().datetime().optional()
});

export const generateTerminationDocumentSchema = z.object({
  consultantId: z.number().int().positive()
});

// Payment calculation schemas
export const calculatePaymentSchema = z.object({
  noBonus: z.boolean().optional(), // If true, set omnigoBonus to 0 for this calculation
});

// Receipt schemas
export const sendReceiptSchema = z.object({
  receiptAmount: z.number().positive('Receipt amount must be greater than zero'),
  recipientEmail: z.string().email('Invalid email address').optional(),
  invoiceNumber: z.number().optional()
});

// Work hours schemas
export const importWorkHoursSchema = z.object({
  jsonContent: z.string().min(1, 'JSON content is required')
});

export const workHoursYearSchema = z.object({
  year: z.number().int().min(2020).max(2030)
});

// Export equipment and termination types
export type CreateEquipmentRequest = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentRequest = z.infer<typeof updateEquipmentSchema>;
export type InitiateTerminationRequest = z.infer<typeof initiateTerminationSchema>;
export type GenerateTerminationDocumentRequest = z.infer<typeof generateTerminationDocumentSchema>;
export type CalculatePaymentRequest = z.infer<typeof calculatePaymentSchema>;
export type SendReceiptRequest = z.infer<typeof sendReceiptSchema>;
export type ImportWorkHoursRequest = z.infer<typeof importWorkHoursSchema>;
export type WorkHoursYearRequest = z.infer<typeof workHoursYearSchema>;

// Time Doctor schemas
export const timeDoctorSyncStatusSchema = z.object({
  success: z.boolean(),
  status: z.object({
    totalConsultants: z.number(),
    syncEnabledConsultants: z.number(),
    lastSyncTimes: z.record(z.number(), z.date().nullable()),
    apiConnected: z.boolean()
  }).optional(),
  error: z.string().optional()
});

export const timeDoctorSyncResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  synced: z.number().optional(),
  errors: z.array(z.string()).optional(),
  totalConsultants: z.number().optional(),
  error: z.string().optional()
});

export const timeDoctorToggleSyncSchema = z.object({
  enabled: z.boolean()
});

export const timeDoctorPayrollSettingsSchema = z.object({
  payeeId: z.string(),
  name: z.string(),
  paymentMethod: z.string(),
  payrollPeriod: z.string(),
  rateType: z.string(),
  currency: z.string(),
  ratePerHour: z.number(),
  hourlyLimit: z.number(),
  maxRatePerPeriod: z.number()
});

// Time Doctor API response schemas
export const timeDoctorSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(timeDoctorPayrollSettingsSchema).optional(),
  error: z.string().optional()
});

// Export Time Doctor types
export type TimeDoctorSyncStatus = z.infer<typeof timeDoctorSyncStatusSchema>;
export type TimeDoctorSyncResult = z.infer<typeof timeDoctorSyncResultSchema>;
export type TimeDoctorToggleSyncRequest = z.infer<typeof timeDoctorToggleSyncSchema>;
export type TimeDoctorPayrollSettings = z.infer<typeof timeDoctorPayrollSettingsSchema>;
export type TimeDoctorSettingsResponse = z.infer<typeof timeDoctorSettingsResponseSchema>;

// Bonus workflow schemas
export const createBonusWorkflowSchema = z.object({
  cycleId: z.number().int().positive()
});

export const updateBonusWorkflowSchema = z.object({
  bonusRecipientConsultantId: z.number().int().nullable().optional(),
  bonusAnnouncementDate: z.string().datetime().nullable().optional(),
  emailGenerated: z.boolean().nullable().optional(),
  emailContent: z.string().nullable().optional(),
  paidWithPayroll: z.boolean().nullable().optional(),
  bonusPaymentDate: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type CreateBonusWorkflowRequest = z.infer<typeof createBonusWorkflowSchema>;
export type UpdateBonusWorkflowRequest = z.infer<typeof updateBonusWorkflowSchema>;

// System settings schemas
export const updateSettingsSchema = z.object({
  defaultOmnigoBonus: z.number().refine(val => isFinite(val) && val >= 0, 'Must be a finite non-negative number')
});

export type UpdateSettingsRequest = z.infer<typeof updateSettingsSchema>;

// Key-value settings schemas
export const settingSchema = z.object({
  key: z.string().min(1, 'Setting key is required'),
  value: z.string().min(1, 'Setting value is required')
});

export const payoneerConfigSchema = z.object({
  apiKey: z.string().min(1, 'Payoneer API key is required'),
  programId: z.string().min(1, 'Payoneer program ID is required'),
  apiUrl: z.string().url('Must be a valid URL').default('https://api.payoneer.com/v4')
});

export type SettingRequest = z.infer<typeof settingSchema>;
export type PayoneerConfigRequest = z.infer<typeof payoneerConfigSchema>;

// Shipping address schema for equipment shipments
export const shippingAddressSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  neighborhood: z.string().min(1, 'Neighborhood is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters (e.g., RJ)'),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP must be in format 12345-678')
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

// Company schemas
export const updateCompanySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  legalName: z.string().nullable().optional(),
  address: z.string().min(1, 'Address is required').optional(),
  city: z.string().min(1, 'City is required').optional(),
  state: z.string().min(1, 'State is required').optional(),
  zip: z.string().min(1, 'Zip is required').optional(),
  country: z.string().min(1, 'Country is required').optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  email: z.string().email('Invalid email format').nullable().optional(),
  floridaTaxId: z.string().nullable().optional(),
  federalTaxId: z.string().nullable().optional(),
  logoPath: z.string().nullable().optional()
});

// Client schemas
export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  legalName: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Invalid email format').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  paymentNotes: z.string().optional()
});

export const updateClientSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  legalName: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactEmail: z.string().email('Invalid email format').nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  paymentNotes: z.string().nullable().optional()
});

// Client invoice schemas
export const clientInvoiceStatusSchema = z.enum(['DRAFT', 'SENT', 'APPROVED', 'OVERDUE', 'PAID', 'CANCELLED']);

export const createClientInvoiceSchema = z.object({
  cycleId: z.number().int().positive(),
  clientId: z.number().int().positive(),
  invoiceDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional()
});

export const updateClientInvoiceSchema = z.object({
  invoiceDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  status: clientInvoiceStatusSchema.optional(),
  subtotal: z.number().optional(),
  tax: z.number().optional(),
  total: z.number().optional(),
  amountDue: z.number().optional(),
  notes: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  sentDate: z.string().datetime().nullable().optional(),
  approvedDate: z.string().datetime().nullable().optional(),
  paidDate: z.string().datetime().nullable().optional()
});

export const updateClientInvoiceStatusSchema = z.object({
  status: clientInvoiceStatusSchema
});

// Invoice line item schemas
export const createInvoiceLineItemSchema = z.object({
  invoiceId: z.number().int().positive(),
  serviceName: z.string().min(1, 'Service name is required'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive(),
  rate: z.number().positive(),
  amount: z.number().positive(),
  consultantIds: z.array(z.number().int().positive()).optional(),
  sortOrder: z.number().int().optional()
});

export const updateInvoiceLineItemSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  quantity: z.number().int().positive().optional(),
  rate: z.number().positive().optional(),
  amount: z.number().positive().optional(),
  consultantIds: z.array(z.number().int().positive()).nullable().optional(),
  sortOrder: z.number().int().optional()
});

// Export types
export type UpdateCompanyRequest = z.infer<typeof updateCompanySchema>;
export type CreateClientRequest = z.infer<typeof createClientSchema>;
export type UpdateClientRequest = z.infer<typeof updateClientSchema>;
export type CreateClientInvoiceRequest = z.infer<typeof createClientInvoiceSchema>;
export type UpdateClientInvoiceRequest = z.infer<typeof updateClientInvoiceSchema>;
export type UpdateClientInvoiceStatusRequest = z.infer<typeof updateClientInvoiceStatusSchema>;
export type CreateInvoiceLineItemRequest = z.infer<typeof createInvoiceLineItemSchema>;
export type UpdateInvoiceLineItemRequest = z.infer<typeof updateInvoiceLineItemSchema>;
