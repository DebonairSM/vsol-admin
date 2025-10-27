import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
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
  const weights2 = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];
  
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
  cnpj: z.string().refine(validateCNPJ, 'Invalid CNPJ format').optional(),
  payoneerID: z.string().optional(),
  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  emergencyContactPhone: z.string().regex(/^\+?55\s?\d{2}\s?\d{4,5}-?\d{4}$/, 'Invalid Brazilian phone format').optional(),
  // Documents
  cpf: z.string().refine(validateCPF, 'Invalid CPF format').optional()
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
  cnpj: z.string().refine(validateCNPJ, 'Invalid CNPJ format').nullable().optional(),
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
  terminationReason: z.enum(['FIRED', 'LAID_OFF', 'QUIT', 'MUTUAL_AGREEMENT']).nullable().optional()
});

// Cycle schemas
export const createCycleSchema = z.object({
  monthLabel: z.string().min(1, 'Month label is required'),
  globalWorkHours: z.number().int().positive().optional(),
  omnigoBonus: z.number().optional()
});

export const updateCycleSchema = z.object({
  monthLabel: z.string().min(1).optional(),
  calculatedPaymentDate: z.string().datetime().nullable().optional(),
  paymentArrivalDate: z.string().datetime().nullable().optional(),
  sendReceiptDate: z.string().datetime().nullable().optional(),
  sendInvoiceDate: z.string().datetime().nullable().optional(),
  consultantInvoicesVerifiedDate: z.string().datetime().nullable().optional(),
  invoiceApprovalDate: z.string().datetime().nullable().optional(),
  hoursLimitChangedOn: z.string().datetime().nullable().optional(),
  additionalPaidOn: z.string().datetime().nullable().optional(),
  globalWorkHours: z.number().int().positive().nullable().optional(),
  omnigoBonus: z.number().nullable().optional(),
  pagamentoPIX: z.number().nullable().optional(),
  pagamentoInter: z.number().nullable().optional(),
  equipmentsUSD: z.number().nullable().optional()
});

// Line item schemas
export const updateLineItemSchema = z.object({
  invoiceSent: z.boolean().nullable().optional(),
  adjustmentValue: z.number().nullable().optional(),
  bonusDate: z.string().datetime().nullable().optional(),
  informedDate: z.string().datetime().nullable().optional(),
  bonusPaydate: z.string().datetime().nullable().optional(),
  bonusAdvance: z.number().nullable().optional(),
  advanceDate: z.string().datetime().nullable().optional(),
  workHours: z.number().int().positive().nullable().optional(),
  comments: z.string().nullable().optional()
});

// Invoice schemas
export const createInvoiceSchema = z.object({
  cycleId: z.number().int().positive(),
  consultantId: z.number().int().positive(),
  hours: z.number().positive().optional(),
  rate: z.number().positive().optional(),
  amount: z.number().positive().optional()
});

export const updateInvoiceSchema = z.object({
  hours: z.number().positive().nullable().optional(),
  rate: z.number().positive().nullable().optional(),
  amount: z.number().positive().nullable().optional(),
  sent: z.boolean().nullable().optional(),
  approved: z.boolean().nullable().optional(),
  sentDate: z.string().datetime().nullable().optional(),
  approvedDate: z.string().datetime().nullable().optional()
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
export type CreateConsultantRequest = z.infer<typeof createConsultantSchema>;
export type UpdateConsultantRequest = z.infer<typeof updateConsultantSchema>;
export type CreateCycleRequest = z.infer<typeof createCycleSchema>;
export type UpdateCycleRequest = z.infer<typeof updateCycleSchema>;
export type UpdateLineItemRequest = z.infer<typeof updateLineItemSchema>;
export type CreateInvoiceRequest = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceRequest = z.infer<typeof updateInvoiceSchema>;
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

// Export equipment and termination types
export type CreateEquipmentRequest = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentRequest = z.infer<typeof updateEquipmentSchema>;
export type InitiateTerminationRequest = z.infer<typeof initiateTerminationSchema>;
export type GenerateTerminationDocumentRequest = z.infer<typeof generateTerminationDocumentSchema>;
