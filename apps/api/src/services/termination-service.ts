import { eq } from 'drizzle-orm';
import { db, consultants } from '../db';
import { InitiateTerminationRequest } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';
import { EquipmentService } from './equipment-service';

export class TerminationService {
  static async initiateTermination(data: InitiateTerminationRequest) {
    // Verify consultant exists and is not already terminated
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, data.consultantId)
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    if (consultant.terminationDate) {
      throw new ValidationError('Consultant is already terminated');
    }

    // Calculate equipment return deadline if not provided
    let equipmentReturnDeadline = data.equipmentReturnDeadline;
    if (!equipmentReturnDeadline) {
      const termDate = new Date(data.terminationDate);
      termDate.setDate(termDate.getDate() + 5); // 5 days from termination
      equipmentReturnDeadline = termDate.toISOString();
    }

    // Update consultant with termination details
    const [updatedConsultant] = await db.update(consultants)
      .set({
        terminationDate: new Date(data.terminationDate),
        terminationReason: data.terminationReason,
        finalPaymentAmount: data.finalPaymentAmount,
        equipmentReturnDeadline: new Date(equipmentReturnDeadline),
        updatedAt: new Date()
      })
      .where(eq(consultants.id, data.consultantId))
      .returning();

    return updatedConsultant;
  }

  static async signContract(consultantId: number, contractSignedDate?: Date) {
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, consultantId)
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    if (!consultant.terminationDate) {
      throw new ValidationError('Consultant termination must be initiated first');
    }

    if (consultant.contractSignedDate) {
      throw new ValidationError('Contract already signed');
    }

    const [updatedConsultant] = await db.update(consultants)
      .set({
        contractSignedDate: contractSignedDate || new Date(),
        updatedAt: new Date()
      })
      .where(eq(consultants.id, consultantId))
      .returning();

    return updatedConsultant;
  }

  static async getTerminationStatus(consultantId: number) {
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, consultantId),
      with: {
        equipment: true
      }
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    if (!consultant.terminationDate) {
      return {
        isTerminated: false,
        consultant
      };
    }

    // Get equipment return status
    const equipmentStatus = await EquipmentService.getReturnStatus(consultantId);

    // Check if termination process is complete
    const isEquipmentReturned = equipmentStatus.allReturned;
    const isContractSigned = !!consultant.contractSignedDate;
    const isProcessComplete = isEquipmentReturned && isContractSigned;

    // Check if deadlines have passed
    const now = new Date();
    const equipmentDeadlinePassed = consultant.equipmentReturnDeadline 
      ? now > consultant.equipmentReturnDeadline 
      : false;

    return {
      isTerminated: true,
      consultant,
      equipmentStatus,
      processStatus: {
        isEquipmentReturned,
        isContractSigned,
        isProcessComplete,
        equipmentDeadlinePassed
      },
      nextSteps: this.getNextSteps(consultant, equipmentStatus, isContractSigned)
    };
  }

  private static getNextSteps(consultant: any, equipmentStatus: any, isContractSigned: boolean): string[] {
    const steps: string[] = [];

    if (equipmentStatus && !equipmentStatus.allReturned) {
      steps.push(`Return ${equipmentStatus.pending} pending equipment items`);
    }

    if (!isContractSigned) {
      steps.push('Sign termination contract');
    }

    if (equipmentStatus && equipmentStatus.allReturned && isContractSigned) {
      steps.push('Process final payment');
    }

    return steps;
  }

  static async canGenerateDocument(consultantId: number): Promise<{ canGenerate: boolean; reasons?: string[] }> {
    const status = await this.getTerminationStatus(consultantId);

    if (!status.isTerminated) {
      return { 
        canGenerate: false, 
        reasons: ['Consultant termination must be initiated first'] 
      };
    }

    const reasons: string[] = [];

    if (status.equipmentStatus && !status.equipmentStatus.allReturned) {
      reasons.push(`${status.equipmentStatus.pending} equipment items not yet returned`);
    }

    return {
      canGenerate: reasons.length === 0,
      reasons: reasons.length > 0 ? reasons : undefined
    };
  }

  static async validateTerminationData(consultantId: number) {
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, consultantId),
      with: {
        equipment: true
      }
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    if (!consultant.terminationDate) {
      throw new ValidationError('Consultant is not terminated');
    }

    const missingFields: string[] = [];

    if (!consultant.finalPaymentAmount) {
      missingFields.push('finalPaymentAmount');
    }

    if (!consultant.terminationReason) {
      missingFields.push('terminationReason');
    }

    // Check required personal data for document generation
    if (!consultant.cpf) {
      missingFields.push('cpf');
    }

    if (!consultant.address) {
      missingFields.push('address');
    }

    if (!consultant.companyLegalName && !consultant.companyTradeName) {
      missingFields.push('companyLegalName or companyTradeName');
    }

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Missing required fields for termination: ${missingFields.join(', ')}`,
        {
          code: 'MISSING_TERMINATION_DOCUMENT_FIELDS',
          consultantId,
          missingFields
        }
      );
    }

    return {
      consultant,
      equipment: consultant.equipment || []
    };
  }
}

