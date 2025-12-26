import { db, users, consultants } from '../src/db';
import { hashPassword } from '../src/lib/password';
import { eq } from 'drizzle-orm';
import { initializeDatabase } from '../src/db';

async function createTestConsultantUser() {
  try {
    // Initialize database (handles encryption if needed)
    await initializeDatabase();

    // Check if test consultant user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, 'test-consultant')
    });

    if (existingUser) {
      console.log('✅ Test consultant user already exists');
      return;
    }

    // Check if test consultant exists, create if not
    let testConsultant = await db.query.consultants.findFirst({
      where: eq(consultants.name, 'Test Consultant')
    });

    if (!testConsultant) {
      console.log('Creating test consultant...');
      const [newConsultant] = await db.insert(consultants).values({
        name: 'Test Consultant',
        hourlyRate: 10.00,
        email: 'test-consultant@example.com'
      }).returning();
      testConsultant = newConsultant;
      console.log(`✅ Created test consultant (ID: ${testConsultant.id})`);
    }

    // Create test consultant user
    console.log('Creating test consultant user...');
    const passwordHash = await hashPassword('ChangeMe123!');
    
    await db.insert(users).values({
      username: 'test-consultant',
      passwordHash,
      role: 'consultant',
      consultantId: testConsultant.id,
      mustChangePassword: false
    });

    console.log('✅ Test consultant user created successfully');
    console.log('   Username: test-consultant');
    console.log('   Password: ChangeMe123!');
  } catch (error) {
    console.error('❌ Error creating test consultant user:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createTestConsultantUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createTestConsultantUser };



