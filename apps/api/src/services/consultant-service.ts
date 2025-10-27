import { eq, isNull } from 'drizzle-orm';
import { db, consultants } from '../db';
import { CreateConsultantRequest, UpdateConsultantRequest } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';
import { fileStorage } from '../lib/file-storage';

export class ConsultantService {
  static async getAll() {
    return db.query.consultants.findMany({
      orderBy: (consultants, { asc }) => [asc(consultants.name)]
    });
  }

  static async getActive() {
    return db.query.consultants.findMany({
      where: isNull(consultants.terminationDate),
      orderBy: (consultants, { asc }) => [asc(consultants.name)]
    });
  }

  static async getById(id: number) {
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, id)
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    return consultant;
  }

  static async create(data: CreateConsultantRequest) {
    // Check if name already exists
    const existing = await db.query.consultants.findFirst({
      where: eq(consultants.name, data.name)
    });

    if (existing) {
      throw new ValidationError('Consultant with this name already exists');
    }

    const [consultant] = await db.insert(consultants).values({
      name: data.name,
      hourlyRate: data.hourlyRate,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      evaluationNotes: data.evaluationNotes || null,
      // Personal Data
      email: data.email || null,
      address: data.address || null,
      neighborhood: data.neighborhood || null,
      city: data.city || null,
      state: data.state || null,
      cep: data.cep || null,
      phone: data.phone || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      shirtSize: data.shirtSize || null,
      // Company Data
      companyLegalName: data.companyLegalName || null,
      companyTradeName: data.companyTradeName || null,
      cnpj: data.cnpj || null,
      payoneerID: data.payoneerID || null,
      // Emergency Contact
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactRelation: data.emergencyContactRelation || null,
      emergencyContactPhone: data.emergencyContactPhone || null,
      // Documents
      cpf: data.cpf || null
    }).returning();

    return consultant;
  }

  static async update(id: number, data: UpdateConsultantRequest) {
    const existing = await this.getById(id);

    // Check if name change conflicts with another consultant
    if (data.name && data.name !== existing.name) {
      const nameConflict = await db.query.consultants.findFirst({
        where: eq(consultants.name, data.name)
      });

      if (nameConflict) {
        throw new ValidationError('Consultant with this name already exists');
      }
    }

    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Basic fields
    if (data.name !== undefined) updateData.name = data.name;
    if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate;
    if (data.terminationDate !== undefined) {
      updateData.terminationDate = data.terminationDate ? new Date(data.terminationDate) : null;
    }
    if (data.evaluationNotes !== undefined) updateData.evaluationNotes = data.evaluationNotes;
    
    // Personal Data
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.neighborhood !== undefined) updateData.neighborhood = data.neighborhood;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.cep !== undefined) updateData.cep = data.cep;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    }
    if (data.shirtSize !== undefined) updateData.shirtSize = data.shirtSize;
    
    // Company Data
    if (data.companyLegalName !== undefined) updateData.companyLegalName = data.companyLegalName;
    if (data.companyTradeName !== undefined) updateData.companyTradeName = data.companyTradeName;
    if (data.cnpj !== undefined) updateData.cnpj = data.cnpj;
    if (data.payoneerID !== undefined) updateData.payoneerID = data.payoneerID;
    
    // Emergency Contact
    if (data.emergencyContactName !== undefined) updateData.emergencyContactName = data.emergencyContactName;
    if (data.emergencyContactRelation !== undefined) updateData.emergencyContactRelation = data.emergencyContactRelation;
    if (data.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = data.emergencyContactPhone;
    
    // Documents
    if (data.cpf !== undefined) updateData.cpf = data.cpf;

    const [consultant] = await db.update(consultants)
      .set(updateData)
      .where(eq(consultants.id, id))
      .returning();

    return consultant;
  }

  static async delete(id: number) {
    // Check if consultant is used in any cycles
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, id),
      with: {
        lineItems: true
      }
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    if (consultant.lineItems.length > 0) {
      throw new ValidationError('Cannot delete consultant that has been used in payroll cycles. Use termination date instead.');
    }

    // Delete associated files before deleting consultant
    if (consultant.cnhPhotoPath) {
      await fileStorage.deleteFile(consultant.cnhPhotoPath);
    }
    if (consultant.addressProofPhotoPath) {
      await fileStorage.deleteFile(consultant.addressProofPhotoPath);
    }

    await db.delete(consultants).where(eq(consultants.id, id));
    return { success: true };
  }

  static async uploadDocument(
    consultantId: number,
    documentType: 'cnh' | 'address_proof',
    file: Express.Multer.File
  ) {
    const consultant = await this.getById(consultantId);
    
    // Save file
    const result = await fileStorage.saveFile(
      consultantId,
      consultant.name,
      documentType,
      file
    );

    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to save file');
    }

    // Update consultant record with file path
    const updateData: any = { updatedAt: new Date() };
    if (documentType === 'cnh') {
      // Delete old file if exists
      if (consultant.cnhPhotoPath) {
        await fileStorage.deleteFile(consultant.cnhPhotoPath);
      }
      updateData.cnhPhotoPath = result.filePath;
    } else if (documentType === 'address_proof') {
      // Delete old file if exists
      if (consultant.addressProofPhotoPath) {
        await fileStorage.deleteFile(consultant.addressProofPhotoPath);
      }
      updateData.addressProofPhotoPath = result.filePath;
    }

    const [updatedConsultant] = await db.update(consultants)
      .set(updateData)
      .where(eq(consultants.id, consultantId))
      .returning();

    return updatedConsultant;
  }

  static async getDocumentPath(consultantId: number, documentType: 'cnh' | 'address_proof'): Promise<string | null> {
    const consultant = await this.getById(consultantId);
    
    const filePath = documentType === 'cnh' 
      ? consultant.cnhPhotoPath 
      : consultant.addressProofPhotoPath;

    if (!filePath) {
      return null;
    }

    const fileInfo = await fileStorage.getFileInfo(filePath);
    if (!fileInfo.exists) {
      return null;
    }

    return fileStorage.getFullPath(filePath);
  }
}
