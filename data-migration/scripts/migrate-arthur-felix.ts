import path from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';
import { db, consultants, consultantEquipment, initializeDatabase } from '../../apps/api/src/db';
import { ConsultantService } from '../../apps/api/src/services/consultant-service';
import { EquipmentService } from '../../apps/api/src/services/equipment-service';
import { fileStorage } from '../../apps/api/src/lib/file-storage';
import { parseDocx, parseDate, extractCPF, extractCNPJ, extractEmail, extractPhone, extractCEP, extractFieldValue, extractTableRows, normalizePhone, formatCEP } from './document-parsers';
import { eq, sql } from 'drizzle-orm';
import { CreateEquipmentRequest, UpdateConsultantRequest } from '@vsol-admin/shared';

// Document paths
const DATA_DIR = path.join(__dirname, '..', 'Arthur Felix');
const FICHA_CADASTRAL = path.join(DATA_DIR, 'Ficha Cadastral do Consultor (VSol) - AF.docx');
const EQUIPMENT_INVENTORY = path.join(DATA_DIR, 'Assigned Equipment Inventory - Initials.docx');
const CONTRACT_PDF = path.join(DATA_DIR, 'Master Services Agt - Arthur Felix.pdf');
const CONTRACT_DOCX = path.join(DATA_DIR, 'Master Services Agt- Arthur Felix.docx');
const OFFER_DOCX = path.join(DATA_DIR, 'Oferta_de_Contrato_AF.docx');

/**
 * Backup database before migration
 */
async function backupDatabase(): Promise<void> {
  console.log('📦 Creating database backup...');
  try {
    execSync('pnpm --filter @vsol-admin/api db:backup', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });
    console.log('✅ Database backup created successfully\n');
  } catch (error) {
    console.error('❌ Failed to create database backup:', error);
    throw error;
  }
}

/**
 * Extract consultant data from Ficha Cadastral document
 */
async function extractConsultantData(docxPath: string): Promise<Partial<UpdateConsultantRequest>> {
  console.log(`📄 Extracting consultant data from: ${path.basename(docxPath)}`);
  
  const text = await parseDocx(docxPath);
  const data: Partial<UpdateConsultantRequest> = {};

  // Extract name - look for "Arthur Felix" specifically or extract from nome field
  const nameMatch = text.match(/Arthur\s+Felix/i) || 
                    extractFieldValue(text, 'nome') || 
                    extractFieldValue(text, 'name');
  if (nameMatch) {
    // If we found "Arthur Felix" in text, use that; otherwise use extracted value
    if (typeof nameMatch === 'string' && nameMatch.match(/Arthur\s+Felix/i)) {
      data.name = 'Arthur Felix';
    } else if (typeof nameMatch === 'string') {
      // Clean up extracted name (remove "Nome:" prefix if present)
      data.name = nameMatch.replace(/^nome\s*:?\s*/i, '').trim();
    } else {
      data.name = 'Arthur Felix'; // Fallback
    }
  } else {
    data.name = 'Arthur Felix'; // Fallback
  }

  // Extract email
  const email = extractEmail(text);
  if (email) {
    data.email = email;
  }

  // Extract CPF
  const cpf = extractCPF(text);
  if (cpf) {
    data.cpf = cpf;
  }

  // Extract phone
  const phone = extractPhone(text);
  if (phone) {
    // Format phone to match expected regex: +55 XX XXXXX-XXXX
    const normalized = normalizePhone(phone);
    data.phone = normalized;
  }

  // Extract address components - the document format is "Rua e nº: ..."
  const addressMatch = text.match(/Rua\s+e\s+nº\s*:\s*([^\n]+)/i);
  if (addressMatch) {
    data.address = addressMatch[1].trim();
  }

  const neighborhoodMatch = text.match(/Bairro\s*:\s*([^\n]+)/i);
  if (neighborhoodMatch) {
    data.neighborhood = neighborhoodMatch[1].trim();
  }

  // Extract city and state together (format: "Cidade/Estado: Rio de Janeiro/RJ")
  const cityStateMatch = text.match(/Cidade\/Estado\s*:\s*([^/]+)\/([A-Z]{2})/i);
  if (cityStateMatch) {
    data.city = cityStateMatch[1].trim();
    data.state = cityStateMatch[2].trim().toUpperCase();
  }

  const cep = extractCEP(text);
  if (cep) {
    data.cep = formatCEP(cep);
  }

  // Extract birth date - format: "Data de Nascimento: 29/05/1991"
  const birthDateMatch = text.match(/Data\s+de\s+Nascimento\s*:\s*([^\n]+)/i);
  if (birthDateMatch) {
    const birthDate = parseDate(birthDateMatch[1].trim());
    if (birthDate) {
      data.birthDate = birthDate.toISOString();
    }
  }

  // Extract shirt size - look for pattern like "GG (X)" or "GGG ( )"
  const shirtSizeMatch = text.match(/tamanho.*?camisa[^]*?(P|M|G{1,3})\s*\([^)]*X[^)]*\)/i);
  if (shirtSizeMatch) {
    data.shirtSize = shirtSizeMatch[1].toUpperCase();
  } else {
    const shirtSize = extractFieldValue(text, 'tamanho') || 
                      extractFieldValue(text, 'size') || 
                      extractFieldValue(text, 'camisa');
    if (shirtSize) {
      const sizeMatch = shirtSize.match(/\b([PMG]{1,3})\b/i);
      if (sizeMatch) {
        data.shirtSize = sizeMatch[1].toUpperCase();
      }
    }
  }

  // Extract emergency contact - format: " Nome: Fernanda" and " Relação: Esposa"
  const emergencyNameMatch = text.match(/Contato\s+de\s+Emergência[^]*?Nome\s*:\s*([^\n]+)/i);
  if (emergencyNameMatch) {
    data.emergencyContactName = emergencyNameMatch[1].trim();
  }

  const emergencyRelationMatch = text.match(/Contato\s+de\s+Emergência[^]*?Relação\s*:\s*([^\n]+)/i);
  if (emergencyRelationMatch) {
    data.emergencyContactRelation = emergencyRelationMatch[1].trim();
  }

  // Emergency phone is in the emergency section
  const emergencySection = text.split(/Contato\s+de\s+Emergência/i)[1]?.split(/Dados\s+da\s+Empresa/i)[0] || '';
  const emergencyPhone = extractPhone(emergencySection);
  if (emergencyPhone) {
    data.emergencyContactPhone = normalizePhone(emergencyPhone);
  }

  // Extract company data
  const cnpj = extractCNPJ(text);
  if (cnpj) {
    data.cnpj = cnpj;
  }

  // Extract company data - format: "Razão social: ..." and "Nome Fantasia: ..."
  const companyLegalNameMatch = text.match(/Razão\s+social\s*:\s*([^\n]+)/i);
  if (companyLegalNameMatch) {
    data.companyLegalName = companyLegalNameMatch[1].trim();
  }

  const companyTradeNameMatch = text.match(/Nome\s+Fantasia\s*:\s*([^\n]+)/i);
  if (companyTradeNameMatch) {
    data.companyTradeName = companyTradeNameMatch[1].trim();
  }

  // Extract Payoneer ID - format: "Payoneer ID: 48617898"
  const payoneerIDMatch = text.match(/Payoneer\s+ID\s*:\s*([^\n]+)/i);
  if (payoneerIDMatch) {
    data.payoneerID = payoneerIDMatch[1].trim();
  }

  console.log(`✅ Extracted consultant data: ${Object.keys(data).length} fields`);
  return data;
}

/**
 * Extract equipment data from inventory document
 */
async function extractEquipmentData(docxPath: string): Promise<CreateEquipmentRequest[]> {
  console.log(`📄 Extracting equipment data from: ${path.basename(docxPath)}`);
  
  const text = await parseDocx(docxPath);
  const equipment: CreateEquipmentRequest[] = [];

  // Split text into lines
  const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  // Look for table structure - find header row first
  let headerIndex = -1;
  const possibleHeaders = ['device', 'description', 'model', 'serial', 'purchase', 'date', 'notes', 'issues'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    // Check if this line contains multiple header keywords
    const headerMatches = possibleHeaders.filter(h => line.includes(h));
    if (headerMatches.length >= 2) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex >= 0 && headerIndex < lines.length - 1) {
    // Parse table structure
    // Try to identify columns by looking at the header row
    const headerLine = lines[headerIndex];
    
    // Extract data rows (skip header)
    let currentDevice: Partial<CreateEquipmentRequest> | null = null;
    let notes: string[] = [];
    
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is a new device row (contains device name patterns)
      const isDeviceRow = /^(dell|hp|lenovo|macbook|laptop|notebook|monitor|keyboard|mouse|headset|webcam)/i.test(line) ||
                         /^device|^description/i.test(line);
      
      // Check if this is a model row
      const isModelRow = /^model\s*:/i.test(line);
      
      // Check if this is a serial number row
      const isSerialRow = /^serial/i.test(line);
      
      // Check if this is a date row (likely purchase date or issue date)
      const isDateRow = /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4}/i.test(line);
      
      if (isDeviceRow && !isModelRow && !isSerialRow) {
        // Save previous device if exists
        if (currentDevice && currentDevice.deviceName) {
          const equipmentItem: CreateEquipmentRequest = {
            consultantId: 0,
            deviceName: currentDevice.deviceName,
            model: currentDevice.model || null,
            serialNumber: currentDevice.serialNumber || null,
            purchaseDate: currentDevice.purchaseDate || null,
            returnRequired: true,
            notes: notes.length > 0 ? notes.join('\n') : null
          };
          equipment.push(equipmentItem);
        }
        
        // Start new device
        const deviceName = line.replace(/^device\s+name\s+or\s+description\s*:?\s*/i, '').trim();
        if (deviceName) {
          currentDevice = { deviceName };
          notes = [];
        }
      } else if (isModelRow && currentDevice) {
        const model = line.replace(/^model\s*:?\s*/i, '').trim();
        if (model) {
          currentDevice.model = model;
        }
      } else if (isSerialRow && currentDevice) {
        const serial = line.replace(/^serial\s+number\s*:?\s*/i, '').trim();
        if (serial) {
          currentDevice.serialNumber = serial;
        }
      } else if (isDateRow && currentDevice) {
        // Could be purchase date or issue date - try to parse
        const date = parseDate(line);
        if (date && !currentDevice.purchaseDate) {
          // Assume first date is purchase date
          currentDevice.purchaseDate = date.toISOString();
        }
        // Add to notes if it's an issue date
        if (line.toLowerCase().includes('issue') || line.toLowerCase().includes('laptop')) {
          notes.push(line);
        }
      } else if (currentDevice && line.length > 10) {
        // Other lines go to notes
        if (!line.match(/^issues\s+reported/i) && !line.match(/^purchase\s+date/i)) {
          notes.push(line);
        }
      }
    }
    
    // Don't forget the last device
    if (currentDevice && currentDevice.deviceName) {
      const equipmentItem: CreateEquipmentRequest = {
        consultantId: 0,
        deviceName: currentDevice.deviceName,
        model: currentDevice.model || null,
        serialNumber: currentDevice.serialNumber || null,
        purchaseDate: currentDevice.purchaseDate || null,
        returnRequired: true,
        notes: notes.length > 0 ? notes.join('\n') : null
      };
      equipment.push(equipmentItem);
    }
  }

  // Filter out invalid entries (must have device name)
  const validEquipment = equipment.filter(eq => eq.deviceName && eq.deviceName.length > 3);

  console.log(`✅ Extracted ${validEquipment.length} equipment items`);
  return validEquipment;
}

/**
 * Store archival documents (contracts) to file storage
 */
async function storeArchivalDocuments(
  consultantId: number,
  consultantName: string,
  contractPdfPath?: string,
  contractDocxPath?: string,
  offerPath?: string
): Promise<{ contractPdfPath?: string; contractDocxPath?: string; offerPath?: string }> {
  console.log('📁 Storing archival documents...');
  const storedPaths: { contractPdfPath?: string; contractDocxPath?: string; offerPath?: string } = {};

  try {
    // Ensure upload directory exists
    const uploadDir = await fileStorage.ensureUploadDirectory(consultantId);

    // Store PDF contract if exists
    if (contractPdfPath && await fileExists(contractPdfPath)) {
      const pdfBuffer = await fs.readFile(contractPdfPath);
      const pdfFileName = `master_services_agreement_${Date.now()}.pdf`;
      const pdfFullPath = path.join(uploadDir, pdfFileName);
      await fs.writeFile(pdfFullPath, pdfBuffer);
      storedPaths.contractPdfPath = path.join('consultants', consultantId.toString(), pdfFileName);
      console.log(`  ✅ Stored PDF contract: ${path.basename(contractPdfPath)}`);
    }

    // Store DOCX contract if exists
    if (contractDocxPath && await fileExists(contractDocxPath)) {
      const docxBuffer = await fs.readFile(contractDocxPath);
      const docxFileName = `master_services_agreement_${Date.now()}.docx`;
      const docxFullPath = path.join(uploadDir, docxFileName);
      await fs.writeFile(docxFullPath, docxBuffer);
      storedPaths.contractDocxPath = path.join('consultants', consultantId.toString(), docxFileName);
      console.log(`  ✅ Stored DOCX contract: ${path.basename(contractDocxPath)}`);
    }

    // Store offer document if exists
    if (offerPath && await fileExists(offerPath)) {
      const offerBuffer = await fs.readFile(offerPath);
      const offerFileName = `contract_offer_${Date.now()}.docx`;
      const offerFullPath = path.join(uploadDir, offerFileName);
      await fs.writeFile(offerFullPath, offerBuffer);
      storedPaths.offerPath = path.join('consultants', consultantId.toString(), offerFileName);
      console.log(`  ✅ Stored offer document: ${path.basename(offerPath)}`);
    }

    console.log('✅ All archival documents stored\n');
  } catch (error) {
    console.error('❌ Error storing archival documents:', error);
    throw error;
  }

  return storedPaths;
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find consultant by name (case-insensitive, partial match)
 */
async function findConsultantByName(name: string): Promise<any> {
  const allConsultants = await db.query.consultants.findMany();
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
  
  // Try finding by first or last name
  if (!consultant) {
    consultant = allConsultants.find(c => {
      const cName = c.name.toLowerCase();
      return nameParts.some(part => cName.includes(part));
    });
  }
  
  return consultant || null;
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  console.log('🚀 Starting Arthur Felix data migration...\n');

  try {
    // Initialize database (required if encryption is enabled)
    await initializeDatabase();

    // Step 1: Backup database
    await backupDatabase();

    // Step 2: Verify files exist
    console.log('📋 Verifying source files...');
    const filesToCheck = [
      { path: FICHA_CADASTRAL, name: 'Ficha Cadastral' },
      { path: EQUIPMENT_INVENTORY, name: 'Equipment Inventory' }
    ];

    for (const file of filesToCheck) {
      if (!(await fileExists(file.path))) {
        throw new Error(`Required file not found: ${file.name} at ${file.path}`);
      }
      console.log(`  ✅ Found: ${file.name}`);
    }
    console.log('');

    // Step 3: Find or create consultant
    console.log('🔍 Finding consultant in database...');
    let consultant = await findConsultantByName('Arthur Felix');
    
    if (!consultant) {
      console.log('  ⚠️  Consultant not found. Will create after extracting data...\n');
    } else {
      console.log(`  ✅ Found consultant: ${consultant.name} (ID: ${consultant.id})\n`);
    }

    // Step 4: Extract consultant data
    const consultantData = await extractConsultantData(FICHA_CADASTRAL);
    console.log('');

    // Step 5: Create or update consultant record
    if (!consultant) {
      // Create new consultant
      console.log('💾 Creating consultant record...');
      const extractedName = consultantData.name;
      if (!extractedName) {
        consultantData.name = 'Arthur Felix'; // Fallback name
      } else {
        // Try to find consultant with extracted name
        consultant = await findConsultantByName(extractedName);
        if (consultant) {
          console.log(`  ✅ Found consultant with extracted name: ${consultant.name} (ID: ${consultant.id})\n`);
        }
      }
      
      if (!consultant) {
        // Only set hourlyRate to 0 if creating a completely new consultant
        // and no rate was extracted. Otherwise, try to preserve from existing data.
        if (!consultantData.hourlyRate || consultantData.hourlyRate === 0) {
          console.log('  ⚠️  No hourly rate found in document. Setting to 0 - must be set manually.');
          consultantData.hourlyRate = 0; // Will need to be set manually
        }
      
        const createData: any = {
          name: consultantData.name,
          hourlyRate: consultantData.hourlyRate || 0,
          startDate: consultantData.birthDate || new Date().toISOString(),
          ...consultantData
        };
        
        // Remove fields that shouldn't be in create request
        delete createData.birthDate; // Will be set separately if needed
        
        consultant = await ConsultantService.create(createData as any);
        console.log(`  ✅ Created consultant: ${consultant.name} (ID: ${consultant.id})\n`);
        
        // Update with date fields if needed
        if (consultantData.birthDate) {
          await ConsultantService.update(consultant.id, { birthDate: consultantData.birthDate });
        }
      }
    }
    
    if (consultant) {
      // Update existing consultant (whether found initially or just created)
      if (consultant.id !== 7 || !consultantData.name || consultantData.name === 'Arthur Felix') {
        console.log('💾 Updating consultant record...');
        const updateData: Partial<UpdateConsultantRequest> = {};
        
        // Only include fields that were successfully extracted (don't overwrite with null)
        // IMPORTANT: Never overwrite hourlyRate if it's not in the extracted data
        Object.keys(consultantData).forEach(key => {
          const value = consultantData[key as keyof UpdateConsultantRequest];
          // Preserve existing hourlyRate if not extracted from document
          if (key === 'hourlyRate' && (value === null || value === undefined || value === 0)) {
            console.log(`  ⚠️  Skipping hourlyRate update to preserve existing rate: $${consultant.hourlyRate}`);
            return;
          }
          if (value !== null && value !== undefined && key !== 'name') {
            (updateData as any)[key] = value;
          }
        });

        if (Object.keys(updateData).length > 0) {
          await ConsultantService.update(consultant.id, updateData);
          console.log(`  ✅ Updated ${Object.keys(updateData).length} fields\n`);
        } else {
          console.log('  ⚠️  No fields to update\n');
        }
      }
    } else {
      // Update existing consultant
      console.log('💾 Updating consultant record...');
      const updateData: Partial<UpdateConsultantRequest> = {};
      
      // Only include fields that were successfully extracted (don't overwrite with null)
      // IMPORTANT: Never overwrite hourlyRate if it's not in the extracted data
      Object.keys(consultantData).forEach(key => {
        const value = consultantData[key as keyof UpdateConsultantRequest];
        // Preserve existing hourlyRate if not extracted from document
        if (key === 'hourlyRate' && (value === null || value === undefined || value === 0)) {
          console.log(`  ⚠️  Skipping hourlyRate update to preserve existing rate`);
          return;
        }
        if (value !== null && value !== undefined) {
          (updateData as any)[key] = value;
        }
      });

      if (Object.keys(updateData).length > 0) {
        await ConsultantService.update(consultant.id, updateData);
        console.log(`  ✅ Updated ${Object.keys(updateData).length} fields\n`);
      } else {
        console.log('  ⚠️  No fields to update\n');
      }
    }

    // Step 6: Extract equipment data
    const equipmentData = await extractEquipmentData(EQUIPMENT_INVENTORY);
    console.log('');

    // Step 7: Create equipment records
    if (equipmentData.length > 0) {
      console.log('💾 Creating equipment records...');
      let created = 0;
      let skipped = 0;

      for (const equipment of equipmentData) {
        equipment.consultantId = consultant.id;

        // Check if equipment already exists (by serial number or device name)
        const existingEquipment = await db.query.consultantEquipment.findMany({
          where: eq(consultantEquipment.consultantId, consultant.id)
        });

        const duplicate = existingEquipment.find(eq => 
          (equipment.serialNumber && eq.serialNumber === equipment.serialNumber) ||
          (eq.deviceName.toLowerCase() === equipment.deviceName.toLowerCase())
        );

        if (duplicate) {
          console.log(`  ⏭️  Skipping duplicate: ${equipment.deviceName}`);
          skipped++;
          continue;
        }

        await EquipmentService.create(equipment);
        console.log(`  ✅ Created: ${equipment.deviceName}`);
        created++;
      }

      console.log(`\n  ✅ Created ${created} equipment records, skipped ${skipped} duplicates\n`);
    } else {
      console.log('  ⚠️  No equipment items found\n');
    }

    // Step 8: Store archival documents
    const storedDocs = await storeArchivalDocuments(
      consultant.id,
      consultant.name,
      await fileExists(CONTRACT_PDF) ? CONTRACT_PDF : undefined,
      await fileExists(CONTRACT_DOCX) ? CONTRACT_DOCX : undefined,
      await fileExists(OFFER_DOCX) ? OFFER_DOCX : undefined
    );

    // Note: Document paths are stored but not yet linked to consultant record
    // This would require adding fields to consultants table or creating a documents table
    if (Object.keys(storedDocs).length > 0) {
      console.log('📝 Note: Document paths stored but not yet linked to consultant record.');
      console.log('   Consider adding document reference fields to consultants table.\n');
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Consultant: ${consultant ? `${consultant.name} (ID: ${consultant.id})` : 'Not found/created'}`);
    console.log(`   - Equipment created: ${equipmentData.length} items`);
    console.log(`   - Documents stored: ${Object.keys(storedDocs).length} files`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 Tip: You can restore the database from the backup if needed.');
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrate().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { migrate };

