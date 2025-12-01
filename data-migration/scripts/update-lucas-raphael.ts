import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { db, consultants, initializeDatabase } from '../../apps/api/src/db';
import { ConsultantService } from '../../apps/api/src/services/consultant-service';
import { UpdateConsultantRequest } from '@vsol-admin/shared';
import { parseDate, normalizePhone, formatCEP } from './document-parsers';

// Helper to log and write to file
const logFile = path.join(__dirname, 'update-lucas-raphael.log');
async function log(message: string) {
  console.log(message);
  await fs.appendFile(logFile, message + '\n');
}

/**
 * Backup database before update
 */
async function backupDatabase(): Promise<void> {
  await log('📦 Creating database backup...');
  try {
    execSync('pnpm --filter @vsol-admin/api db:backup', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });
    await log('✅ Database backup created successfully\n');
  } catch (error) {
    await log(`❌ Failed to create database backup: ${error}`);
    throw error;
  }
}

/**
 * Find consultant by name, CPF, email, or CNPJ
 */
async function findConsultant(): Promise<any> {
  const allConsultants = await db.query.consultants.findMany();
  
  // Try to find by name
  const name = 'Lucas Raphael Leão Martins';
  const normalizedName = name.toLowerCase().trim();
  const nameParts = normalizedName.split(/\s+/);
  
  // Try exact match first
  let consultant = allConsultants.find(c => 
    c.name.toLowerCase().trim() === normalizedName
  );
  
  // Try partial match (both first and last name present)
  if (!consultant && nameParts.length >= 2) {
    consultant = allConsultants.find(c => {
      const cName = c.name.toLowerCase();
      return nameParts.every(part => cName.includes(part));
    });
  }
  
  // Try finding by CPF
  if (!consultant) {
    const cpf = '06890257693';
    consultant = allConsultants.find(c => c.cpf === cpf);
  }
  
  // Try finding by email
  if (!consultant) {
    const email = 'lucasraphaellm@gmail.com';
    consultant = allConsultants.find(c => c.email?.toLowerCase() === email.toLowerCase());
  }
  
  // Try finding by CNPJ
  if (!consultant) {
    const cnpj = '44363358000154'; // Clean CNPJ without formatting
    consultant = allConsultants.find(c => c.cnpj?.replace(/\D/g, '') === cnpj);
  }
  
  return consultant || null;
}

/**
 * Main update function
 */
async function updateConsultant(): Promise<void> {
  // Clear log file
  await fs.writeFile(logFile, '');
  await log('🚀 Starting Lucas Raphael Leão Martins data update...\n');

  try {
    // Initialize database (required if encryption is enabled)
    await initializeDatabase();

    // Step 1: Backup database
    await backupDatabase();

    // Step 2: Find consultant
    await log('🔍 Finding consultant in database...');
    const consultant = await findConsultant();
    
    if (!consultant) {
      await log('❌ Consultant not found in database.');
      await log('   Please create the consultant first or check the name/CPF/email/CNPJ.');
      process.exit(1);
    }
    
    await log(`  ✅ Found consultant: ${consultant.name} (ID: ${consultant.id})\n`);

    // Step 3: Prepare update data
    await log('📝 Preparing update data...');
    
    // Parse birth date: 19/06/1991
    const birthDate = parseDate('19/06/1991');
    
    // Format phone: +5531998483805 -> +55 31 99848-3805
    const phone = normalizePhone('+5531998483805');
    
    // Format CEP: 30190002 -> 30190-002
    const cep = formatCEP('30190002');
    
    // Clean CNPJ: 44.363.358/0001-54 -> 44363358000154
    const cnpj = '44.363.358/0001-54'.replace(/\D/g, '');
    
    // Format CPF: 06890257693 (already clean, but ensure it's stored correctly)
    const cpf = '06890257693';
    
    // Format emergency contact phone: +5531991652028
    const emergencyPhone = normalizePhone('+5531991652028');
    
    const updateData: UpdateConsultantRequest = {
      name: 'Lucas Raphael Leão Martins',
      email: 'lucasraphaellm@gmail.com',
      address: 'Avenida Augusto de Lima, 1674, Apto. 1708',
      neighborhood: 'Barro Preto',
      city: 'Belo Horizonte',
      state: 'MG',
      cep: cep,
      phone: phone,
      birthDate: birthDate ? birthDate.toISOString() : undefined,
      shirtSize: 'M',
      // Emergency Contact
      emergencyContactName: 'Soraia Leão',
      emergencyContactRelation: 'Mãe',
      emergencyContactPhone: emergencyPhone,
      // Company Data
      companyLegalName: 'LUCAS RAPHAEL LEAO MARTINS CONSULTORIA EM TECNOLOGIA DA INFORMACAO LTDA',
      companyTradeName: null, // N/A
      cnpj: cnpj,
      payoneerID: '48357994',
      // Documents
      cpf: cpf
    };

    await log('  ✅ Update data prepared\n');

    // Step 4: Update consultant
    await log('💾 Updating consultant record...');
    await ConsultantService.update(consultant.id, updateData);
    await log(`  ✅ Updated consultant: ${consultant.name} (ID: ${consultant.id})\n`);

    // Step 5: Verify update
    await log('🔍 Verifying update...');
    const updatedConsultant = await ConsultantService.getById(consultant.id);
    await log('  ✅ Verification complete\n');

    await log('✅ Update completed successfully!');
    await log('\n📊 Summary:');
    await log(`   - Consultant: ${updatedConsultant.name} (ID: ${updatedConsultant.id})`);
    await log(`   - Email: ${updatedConsultant.email || 'N/A'}`);
    await log(`   - CPF: ${updatedConsultant.cpf || 'N/A'}`);
    await log(`   - CNPJ: ${updatedConsultant.cnpj || 'N/A'}`);
    await log(`   - City: ${updatedConsultant.city || 'N/A'}, ${updatedConsultant.state || 'N/A'}`);

  } catch (error) {
    await log(`\n❌ Update failed: ${error}`);
    await log('\n💡 Tip: You can restore the database from the backup if needed.');
    process.exit(1);
  }
}

// Run update
if (require.main === module) {
  updateConsultant().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { updateConsultant };
