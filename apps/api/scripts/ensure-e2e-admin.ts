import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, users, initializeDatabase } from '../src/db';
import { hashPassword } from '../src/lib/password';

/**
 * Ensure an admin user exists for local E2E runs.
 *
 * - Creates the user if missing
 * - Resets password deterministically so Playwright can authenticate
 *
 * Usage:
 *   pnpm --filter @vsol-admin/api exec tsx scripts/ensure-e2e-admin.ts
 */
async function ensureE2EAdmin() {
  await initializeDatabase();

  const username = process.env.TEST_ADMIN_USERNAME || 'e2e-admin';
  const password = process.env.TEST_ADMIN_PASSWORD || 'admin123';

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username)
  });

  const passwordHash = await hashPassword(password);

  if (!existing) {
    await db.insert(users).values({
      username,
      passwordHash,
      role: 'admin',
      mustChangePassword: false
    });

    console.log('✅ E2E admin user created');
  } else {
    await db.update(users)
      .set({
        passwordHash,
        role: 'admin',
        mustChangePassword: false
      })
      .where(eq(users.id, existing.id));

    console.log('✅ E2E admin user updated');
  }

  console.log('\n📋 Admin Login Credentials (E2E):');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
}

if (require.main === module) {
  ensureE2EAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Failed to ensure E2E admin user:', error);
      process.exit(1);
    });
}

export { ensureE2EAdmin };

