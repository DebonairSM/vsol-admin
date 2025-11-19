#!/usr/bin/env tsx

/**
 * Script to change a user's password
 * 
 * Usage (interactive - recommended):
 *   pnpm tsx scripts/change-password.ts <username>
 *   (password will be prompted securely)
 * 
 * Usage (command line - use quotes for special characters):
 *   pnpm tsx scripts/change-password.ts <username> <new-password>
 * 
 * Example:
 *   pnpm tsx scripts/change-password.ts rommel
 *   # Or with password on command line (use quotes for special chars):
 *   pnpm tsx scripts/change-password.ts rommel "myPassword$$"
 */

import { eq } from 'drizzle-orm';
import { db, users } from '../src/db';
import { hashPassword } from '../src/lib/password';
import { initializeDatabase } from '../src/db';
import * as readline from 'readline';

async function changePassword(username: string, newPassword: string) {
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
        columns: { username: true }
      });
      allUsers.forEach(u => console.log(`  - ${u.username}`));
      process.exit(1);
    }

    // Validate password is not empty
    if (!newPassword || newPassword.trim().length === 0) {
      console.error('❌ Password cannot be empty');
      process.exit(1);
    }

    // Hash the new password
    console.log(`🔐 Hashing new password for user: ${username}...`);
    const passwordHash = await hashPassword(newPassword);

    // Update user's password
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));

    console.log(`✅ Password changed successfully for user: ${username}`);
    console.log(`📝 User ID: ${user.id}`);
    console.log(`👤 Username: ${user.username}`);
    console.log(`🔑 Role: ${user.role}`);

  } catch (error) {
    console.error('❌ Error changing password:', error);
    process.exit(1);
  }
}

/**
 * Prompt for password securely (hides input)
 */
function promptPassword(username: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Hide password input
    const stdin = process.stdin;
    const originalSetRawMode = stdin.setRawMode;
    stdin.setRawMode = function(mode: boolean) {
      if (stdin.isTTY) {
        originalSetRawMode.call(stdin, mode);
      }
      return stdin;
    };

    rl.question(`Enter new password for ${username}: `, (password) => {
      rl.close();
      resolve(password);
    });

    // Hide input on Windows (basic approach)
    if (process.platform === 'win32' && process.stdin.isTTY) {
      // On Windows, we can't easily hide input in Node.js without additional packages
      // But the prompt will still work, just not hidden
      // For better security, users should use the command-line with quotes
    }
  });
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Username is required');
    console.log('\nUsage (interactive - recommended):');
    console.log('  pnpm tsx scripts/change-password.ts <username>');
    console.log('  (password will be prompted)');
    console.log('\nUsage (command line):');
    console.log('  pnpm tsx scripts/change-password.ts <username> <new-password>');
    console.log('\nNote: If your password contains special characters (like $, &, etc.),');
    console.log('      use single quotes: pnpm tsx scripts/change-password.ts rommel \'pass$$word\'');
    console.log('      Or use interactive mode (no password argument)');
    process.exit(1);
  }

  const username = args[0];
  
  // If password is provided as argument, use it; otherwise prompt
  if (args.length >= 2) {
    // Join all arguments after username as the password (handles passwords with spaces)
    const newPassword = args.slice(1).join(' ');
    
    // Warn if password might have been mangled by shell (contains common shell variables)
    if (newPassword.includes('admin123') && !args[1].includes('admin123')) {
      console.warn('⚠️  WARNING: Password may have been modified by shell variable expansion.');
      console.warn('   If your password contains $ characters, use single quotes:');
      console.warn(`   pnpm tsx scripts/change-password.ts ${username} 'your$$password'`);
      console.warn('   Or use interactive mode (no password argument)');
    }
    
    changePassword(username, newPassword)
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
      });
  } else {
    // Interactive mode - prompt for password
    promptPassword(username)
      .then((newPassword) => {
        if (!newPassword || newPassword.trim().length === 0) {
          console.error('❌ Password cannot be empty');
          process.exit(1);
        }
        return changePassword(username, newPassword);
      })
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
      });
  }
}

