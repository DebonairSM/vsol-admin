import { eq } from 'drizzle-orm';
import { db, companies } from '../db';
import { UpdateCompanyRequest } from '@vsol-admin/shared';
import { NotFoundError } from '../middleware/errors';

export class CompanyService {
  static async getCompany() {
    // Company is a singleton - get the first (and only) company
    const company = await db.query.companies.findFirst();
    
    if (!company) {
      throw new NotFoundError('Company information not found. Please seed the database.');
    }
    
    return company;
  }

  static async updateCompany(data: UpdateCompanyRequest) {
    const existing = await this.getCompany();
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.legalName !== undefined) updateData.legalName = data.legalName;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.zip !== undefined) updateData.zip = data.zip;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.floridaTaxId !== undefined) updateData.floridaTaxId = data.floridaTaxId;
    if (data.federalTaxId !== undefined) updateData.federalTaxId = data.federalTaxId;
    if (data.logoPath !== undefined) updateData.logoPath = data.logoPath;
    updateData.updatedAt = new Date();

    const [updated] = await db.update(companies)
      .set(updateData)
      .where(eq(companies.id, existing.id))
      .returning();

    return updated;
  }
}


