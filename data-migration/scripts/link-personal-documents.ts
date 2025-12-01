import path from 'path';
import fs from 'fs/promises';
import { db, consultants } from '../../apps/api/src/db';
import { ConsultantService } from '../../apps/api/src/services/consultant-service';
import { fileStorage } from '../../apps/api/src/lib/file-storage';
import { initializeDatabase } from '../../apps/api/src/db';
import { eq } from 'drizzle-orm';

const DATA_DIR = path.join(__dirname, '..', 'Arthur Felix');
const DOCUMENT_IMAGE = path.join(DATA_DIR, 'personal-document-01.png');

/**
 * Link personal documents (CNH + Address Proof) to consultant profile
 */
async function linkPersonalDocuments(): Promise<void> {
  console.log('📄 Linking personal documents to Arthur Felix profile...\n');

  try {
    // Initialize database
    await initializeDatabase();

    // Find Arthur Felix
    const allConsultants = await db.query.consultants.findMany();
    const arthur = allConsultants.find(c => 
      c.name.toLowerCase().includes('arthur') && c.name.toLowerCase().includes('felix')
    );

    if (!arthur) {
      throw new Error('Arthur Felix not found in database');
    }

    console.log(`✅ Found consultant: ${arthur.name} (ID: ${arthur.id})\n`);

    // Check if file exists
    try {
      await fs.access(DOCUMENT_IMAGE);
    } catch {
      throw new Error(`Document file not found: ${DOCUMENT_IMAGE}`);
    }

    console.log(`📁 Reading document file: ${path.basename(DOCUMENT_IMAGE)}`);

    // Read the image file
    const imageBuffer = await fs.readFile(DOCUMENT_IMAGE);
    const stats = await fs.stat(DOCUMENT_IMAGE);

    // Validate file size (5MB limit)
    if (stats.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit');
    }

    // Validate file type (should be PNG)
    if (!DOCUMENT_IMAGE.toLowerCase().endsWith('.png')) {
      throw new Error('File must be a PNG image');
    }

    // Ensure upload directory exists
    const uploadDir = await fileStorage.ensureUploadDirectory(arthur.id);
    console.log(`📂 Upload directory: ${uploadDir}\n`);

    // Generate filename using the same pattern as fileStorage
    const timestamp = Date.now();
    const sanitizedName = arthur.name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    // Since this contains both documents, we'll name it appropriately
    const fileName = `${sanitizedName}_cnh_and_address_proof_${timestamp}.png`;
    const fullPath = path.join(uploadDir, fileName);

    // Save the file
    await fs.writeFile(fullPath, imageBuffer);
    console.log(`✅ Saved file: ${fileName}`);

    // Generate relative path (same format as fileStorage returns)
    const relativePath = path.join('consultants', arthur.id.toString(), fileName);

    // Update consultant record - link to both CNH and address proof fields
    // since this single image contains both documents
    console.log('\n💾 Updating consultant record...');

    const updateData: any = {
      updatedAt: new Date()
    };

    // Delete old files if they exist
    if (arthur.cnhPhotoPath) {
      await fileStorage.deleteFile(arthur.cnhPhotoPath);
      console.log(`  🗑️  Deleted old CNH photo: ${arthur.cnhPhotoPath}`);
    }

    if (arthur.addressProofPhotoPath) {
      // Only delete if it's different from CNH path
      if (arthur.addressProofPhotoPath !== arthur.cnhPhotoPath) {
        await fileStorage.deleteFile(arthur.addressProofPhotoPath);
        console.log(`  🗑️  Deleted old address proof: ${arthur.addressProofPhotoPath}`);
      }
    }

    // Link the same file to both fields since it contains both documents
    updateData.cnhPhotoPath = relativePath;
    updateData.addressProofPhotoPath = relativePath;

    const [updatedConsultant] = await db.update(consultants)
      .set(updateData)
      .where(eq(consultants.id, arthur.id))
      .returning();

    console.log(`  ✅ Updated CNH photo path: ${relativePath}`);
    console.log(`  ✅ Updated address proof path: ${relativePath}`);
    console.log('\n✅ Personal documents linked successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - File saved: ${fileName}`);
    console.log(`   - File size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   - Linked to: CNH Photo & Address Proof Photo`);
    console.log(`   - Full path: ${fullPath}`);

  } catch (error) {
    console.error('\n❌ Error linking personal documents:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  linkPersonalDocuments().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { linkPersonalDocuments };







