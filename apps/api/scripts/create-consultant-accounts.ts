import 'dotenv/config';
import { initializeDatabase } from '../src/db';
import { db, users, consultants } from '../src/db';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../src/lib/password';
import { EmailService } from '../src/services/email-service';
import * as readline from 'readline';

const DEFAULT_PASSWORD = process.env.CONSULTANT_DEFAULT_PASSWORD || 'ChangeMe123!';

/**
 * Get login URL from environment or default to localhost
 */
function getLoginUrl(): string {
  return process.env.APP_LOGIN_URL || 'http://localhost:5173';
}

/**
 * Generate username from consultant name
 * Format: firstName + lastInitial
 * Example: "John Doe" -> "JohnD"
 */
function generateUsername(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) {
    throw new Error('Consultant name cannot be empty');
  }
  
  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '';
  
  return firstName + lastInitial;
}

/**
 * Check if username already exists
 */
async function usernameExists(username: string): Promise<boolean> {
  const existing = await db.query.users.findFirst({
    where: eq(users.username, username)
  });
  return !!existing;
}

/**
 * Prompt for manual username override
 */
function promptUsername(consultantName: string, defaultUsername: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      `Consultant: ${consultantName}\n  Default username: ${defaultUsername}\n  Enter username (or press Enter to use default): `,
      (answer) => {
        rl.close();
        const username = answer.trim() || defaultUsername;
        resolve(username);
      }
    );
  });
}

/**
 * Create consultant account
 */
async function createConsultantAccount(
  consultant: { id: number; name: string; email: string | null },
  sendEmail: boolean = true
): Promise<{ success: boolean; username?: string; error?: string }> {
  try {
    // Check if account already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.consultantId, consultant.id)
    });

    if (existingUser) {
      console.log(`  ⏭  Account already exists for ${consultant.name} (username: ${existingUser.username})`);
      return { success: false, error: 'Account already exists' };
    }

    // Check if email exists
    if (!consultant.email) {
      console.log(`  ⚠️  Skipping ${consultant.name} - no email address`);
      return { success: false, error: 'No email address' };
    }

    // Generate username
    let username = generateUsername(consultant.name);
    
    // Check for duplicates and prompt for override if needed
    if (await usernameExists(username)) {
      console.log(`  ⚠️  Username ${username} already exists`);
      username = await promptUsername(consultant.name, username);
      
      // Check again after manual input
      if (await usernameExists(username)) {
        console.log(`  ❌ Username ${username} still exists. Skipping.`);
        return { success: false, error: 'Username already exists' };
      }
    }

    // Hash password
    const passwordHash = await hashPassword(DEFAULT_PASSWORD);

    // Create user account
    const [newUser] = await db.insert(users)
      .values({
        username,
        passwordHash,
        role: 'consultant',
        mustChangePassword: true,
        consultantId: consultant.id
      })
      .returning();

    console.log(`  ✅ Created account: ${username}`);

    // Send email if requested
    if (sendEmail) {
      try {
        await EmailService.sendAccountCredentials({
          username,
          password: DEFAULT_PASSWORD,
          email: consultant.email,
          consultantName: consultant.name,
          loginUrl: getLoginUrl()
        });
        console.log(`  📧 Email sent to ${consultant.email}`);
      } catch (error) {
        console.error(`  ❌ Failed to send email to ${consultant.email}:`, error);
        // Don't fail the account creation if email fails
      }
    }

    return { success: true, username };
  } catch (error) {
    console.error(`  ❌ Error creating account for ${consultant.name}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Creating consultant accounts...\n');

  try {
    // Initialize database
    await initializeDatabase();

    // Get all consultants and filter those with email addresses
    const allConsultants = await db.query.consultants.findMany({
      columns: {
        id: true,
        name: true,
        email: true
      }
    });

    // Filter consultants with valid email addresses
    const consultantsWithEmails = allConsultants.filter(
      c => c.email && c.email.trim().length > 0 && c.email.includes('@')
    );

    if (consultantsWithEmails.length === 0) {
      console.log('❌ No consultants with email addresses found');
      process.exit(1);
    }

    console.log(`Found ${consultantsWithEmails.length} consultants with email addresses\n`);

    // Ask if should send emails
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const sendEmailAnswer = await new Promise<string>((resolve) => {
      rl.question('Send welcome emails to consultants? (y/n, default: y): ', (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() || 'y');
      });
    });

    const sendEmail = sendEmailAnswer === 'y' || sendEmailAnswer === 'yes';

    if (sendEmail && !process.env.RESEND_KEY) {
      console.log('⚠️  WARNING: RESEND_KEY not found. Emails will not be sent.');
    }

    console.log('\n');

    // Create accounts
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const consultant of consultantsWithEmails) {
      const result = await createConsultantAccount(consultant, sendEmail);
      if (result.success) {
        successCount++;
      } else if (result.error === 'Account already exists' || result.error === 'No email address') {
        skipCount++;
      } else {
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Created: ${successCount}`);
    console.log(`  ⏭  Skipped: ${skipCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`\n🔑 Default password for all accounts: ${DEFAULT_PASSWORD}`);
    console.log(`🌐 Login URL: ${getLoginUrl()}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

