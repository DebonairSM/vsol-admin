import 'dotenv/config';
import { initializeDatabase } from '../src/db';
import { db, users } from '../src/db';
import { eq } from 'drizzle-orm';
import { UserManagementService } from '../src/services/user-management-service';

async function resetUserPassword(username: string) {
  try {
    // Initialize database (handles encryption if enabled)
    await initializeDatabase();

    // Find user by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });

    if (!user) {
      console.error(`❌ User not found: ${username}`);
      console.log('\nAvailable users:');
      const allUsers = await db.query.users.findMany({
        columns: { username: true, role: true }
      });
      allUsers.forEach(u => console.log(`  - ${u.username} (${u.role})`));
      process.exit(1);
    }

    if (user.role !== 'consultant') {
      console.error(`❌ User ${username} is not a consultant. Only consultant passwords can be reset to default.`);
      process.exit(1);
    }

    // Reset password using the service
    console.log(`🔐 Resetting password for user: ${username}...`);
    const newPassword = await UserManagementService.resetPassword(user.id, false);

    console.log(`✅ Password reset successfully for user: ${username}`);
    console.log(`📝 User ID: ${user.id}`);
    console.log(`👤 Username: ${user.username}`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log(`⚠️  User must change password on next login`);

  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
}

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error('❌ Usage: pnpm tsx scripts/reset-user-password.ts <username>');
  console.error('   Example: pnpm tsx scripts/reset-user-password.ts GustavoV');
  process.exit(1);
}

// Run if called directly
if (require.main === module) {
  resetUserPassword(username).then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
