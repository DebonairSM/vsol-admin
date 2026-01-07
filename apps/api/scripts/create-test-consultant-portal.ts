import { db, users, consultants } from '../src/db';
import { hashPassword } from '../src/lib/password';
import { eq } from 'drizzle-orm';
import { initializeDatabase } from '../src/db';

/**
 * Create a comprehensive test consultant for portal testing
 * 
 * This script creates a test consultant with all fields populated
 * and a user account with known credentials for easy testing.
 * 
 * Usage: tsx scripts/create-test-consultant-portal.ts
 */
async function createTestConsultantPortal() {
  try {
    // Initialize database (handles encryption if needed)
    await initializeDatabase();

    const consultantName = 'Test Consultant Portal';
    const username = 'test-consultant-portal';
    const email = 'test-consultant-portal@example.com';
    const password = 'ChangeMe123!';
    // Use valid (check-digit-correct) document numbers to satisfy server-side validation.
    // - CPF: 12345678909
    // - CNPJ: 12345678000195
    const cpf = '12345678909';
    const cnpj = '12345678000195';

    // Check if test consultant user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username)
    });

    if (existingUser) {
      console.log(`⚠️  Test consultant user already exists (username: ${username}). Ensuring credentials...`);

      // Ensure the consultant record exists and is linked
      let consultantId = existingUser.consultantId ?? null;
      if (!consultantId) {
        let consultant = await db.query.consultants.findFirst({
          where: eq(consultants.name, consultantName)
        });

        if (!consultant) {
          console.log('📝 Creating missing test consultant...');
          const [newConsultant] = await db.insert(consultants).values({
            name: consultantName,
            hourlyRate: 25.0,
            email,
            cpf,
            cnpj
          }).returning();
          consultant = newConsultant;
        }

        consultantId = consultant.id;

        await db.update(users)
          .set({ consultantId })
          .where(eq(users.id, existingUser.id));
      } else {
        // Ensure consultant has valid document numbers for profile update tests.
        await db.update(consultants)
          .set({ cpf, cnpj })
          .where(eq(consultants.id, consultantId));
      }

      // Ensure password + flags are correct for automated tests
      const passwordHash = await hashPassword(password);
      await db.update(users)
        .set({
          passwordHash,
          role: 'consultant',
          mustChangePassword: false
        })
        .where(eq(users.id, existingUser.id));

      console.log('✅ Test consultant portal user is ready.');
      console.log('\n📋 Login Credentials:');
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log(`   Consultant ID: ${consultantId}`);

      return;
    }

    // Check if test consultant exists
    let testConsultant = await db.query.consultants.findFirst({
      where: eq(consultants.name, consultantName)
    });

    if (!testConsultant) {
      console.log('📝 Creating test consultant...');
      const [newConsultant] = await db.insert(consultants).values({
        name: consultantName,
        hourlyRate: 25.00,
        email: email,
        startDate: new Date(),
        // Personal Data
        phone: '+55 11 99999-9999',
        address: '123 Test Street',
        neighborhood: 'Test Neighborhood',
        city: 'São Paulo',
        state: 'SP',
        cep: '01234-567',
        birthDate: new Date('1990-01-01'),
        shirtSize: 'M',
        cpf: cpf,
        // Company Data
        companyLegalName: 'Test Company Legal Name',
        companyTradeName: 'Test Company',
        cnpj: cnpj,
        payoneerID: 'TEST123456',
        // Emergency Contact
        emergencyContactName: 'Test Emergency Contact',
        emergencyContactRelation: 'Spouse',
        emergencyContactPhone: '+55 11 88888-8888',
      }).returning();
      testConsultant = newConsultant;
      console.log(`✅ Created test consultant (ID: ${testConsultant.id})`);
    } else {
      console.log(`⚠️  Test consultant already exists (ID: ${testConsultant.id})`);
    }

    // Create test consultant user
    console.log('👤 Creating test consultant user...');
    const passwordHash = await hashPassword(password);
    
    await db.insert(users).values({
      username: username,
      passwordHash,
      role: 'consultant',
      consultantId: testConsultant.id,
      mustChangePassword: false // Set to false for easier testing
    });

    console.log('\n✅ Test consultant portal setup complete!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Consultant ID: ${testConsultant.id}`);
    console.log(`\n🌐 Portal URL: http://localhost:5173/consultant`);
    console.log(`\n🗑️  To delete when done testing, run:`);
    console.log(`   tsx scripts/delete-test-consultant-portal.ts ${testConsultant.id}`);
  } catch (error) {
    console.error('❌ Error creating test consultant portal:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createTestConsultantPortal()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createTestConsultantPortal };
