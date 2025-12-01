import fs from 'fs/promises';
import { Stats } from 'fs';
import path from 'path';
import crypto from 'crypto';

export class FileStorageService {
  private readonly baseUploadPath = path.join(process.cwd(), 'uploads');
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  async ensureUploadDirectory(consultantId: number): Promise<string> {
    const consultantDir = path.join(this.baseUploadPath, 'consultants', consultantId.toString());
    
    try {
      await fs.access(consultantDir);
    } catch {
      await fs.mkdir(consultantDir, { recursive: true });
    }
    
    return consultantDir;
  }

  generateFileName(consultantName: string, documentType: string, originalFilename: string): string {
    const timestamp = Date.now();
    const extension = path.extname(originalFilename).toLowerCase();
    const sanitizedName = consultantName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
    
    return `${sanitizedName}_${documentType}_${timestamp}${extension}`;
  }

  validateFile(file: Express.Multer.File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxFileSize) {
      return { isValid: false, error: 'File size exceeds 5MB limit' };
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      return { isValid: false, error: 'Only JPEG and PNG files are allowed' };
    }

    return { isValid: true };
  }

  async saveFile(
    consultantId: number,
    consultantName: string,
    documentType: 'cnh' | 'address_proof',
    file: Express.Multer.File
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Ensure directory exists
      const uploadDir = await this.ensureUploadDirectory(consultantId);

      // Generate descriptive filename
      const fileName = this.generateFileName(consultantName, documentType, file.originalname);
      const fullPath = path.join(uploadDir, fileName);

      // Save file
      await fs.writeFile(fullPath, file.buffer);

      // Return relative path from uploads directory
      const relativePath = path.join('consultants', consultantId.toString(), fileName);
      
      return { success: true, filePath: relativePath };
    } catch (error) {
      console.error('Error saving file:', error);
      return { success: false, error: 'Failed to save file' };
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseUploadPath, filePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async getFileInfo(filePath: string): Promise<{ exists: boolean; stats?: Stats }> {
    try {
      const fullPath = path.join(this.baseUploadPath, filePath);
      const stats = await fs.stat(fullPath);
      return { exists: true, stats };
    } catch {
      return { exists: false };
    }
  }

  getFullPath(filePath: string): string {
    return path.join(this.baseUploadPath, filePath);
  }

  // Brazilian document validation functions
  static validateCPF(cpf: string): boolean {
    // Remove non-digits
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) return false;
    
    // Check for repeated digits
    if (/^(.)\1*$/.test(cleanCPF)) return false;
    
    // Validate check digits
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
  }

  static validateCNPJ(cnpj: string): boolean {
    // Remove non-digits
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) return false;
    
    // Check for repeated digits
    if (/^(.)\1*$/.test(cleanCNPJ)) return false;
    
    // Validate check digits
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
  }

  static formatCPF(cpf: string): string {
    const clean = cpf.replace(/\D/g, '');
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  static formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  static formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '+55 $1 $2-$3');
    } else if (clean.length === 13 && clean.startsWith('55')) {
      return clean.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 $2 $3-$4');
    }
    return phone;
  }
}

export const fileStorage = new FileStorageService();
