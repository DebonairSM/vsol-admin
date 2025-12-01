import { db, consultants, cycleLineItems, sqliteDb } from '../src/db';
import { ConsultantService } from '../src/services/consultant-service';
import { eq, desc } from 'drizzle-orm';

/**
 * Fix Arthur Felix's hourly rate
 * 
 * This script restores Arthur Felix's hourly rate to $26.00, which was
 * overwritten to 0 by the migration script. It also attempts to recover
 * the rate from the most recent cycle line item if available.
 */
function fixArthurFelixHourlyRate() {
  try {
    console.log('🔍 Starting fix script for Arthur Felix hourly rate...\n');
    
    // Find Arthur Felix using direct SQL query
    const result = sqliteDb.prepare('SELECT id, name, hourly_rate FROM consultants WHERE name = ?').get('Arthur Felix') as any;
    
    if (!result) {
      console.error('❌ Arthur Felix not found in database');
      process.exit(1);
    }

    console.log('📊 Current state:');
    console.log(`   Name: ${result.name}`);
    console.log(`   ID: ${result.id}`);
    console.log(`   Current Hourly Rate: $${result.hourly_rate}`);

    // Try to recover rate from most recent cycle line item
    const lineItemResult = sqliteDb.prepare(`
      SELECT rate_per_hour, cli.created_at, pc.month_label
      FROM cycle_line_items cli
      JOIN payroll_cycles pc ON cli.cycle_id = pc.id
      WHERE cli.consultant_id = ?
      ORDER BY cli.created_at DESC
      LIMIT 1
    `).get(result.id) as any;

    let targetRate = 26.00; // Default from seed data

    if (lineItemResult && lineItemResult.rate_per_hour > 0) {
      console.log(`\n📋 Found recent cycle line item:`);
      console.log(`   Cycle: ${lineItemResult.month_label || 'Unknown'}`);
      console.log(`   Snapshot Rate: $${lineItemResult.rate_per_hour}`);
      targetRate = lineItemResult.rate_per_hour;
    } else {
      console.log(`\n📋 No recent cycle line items found, using default rate: $${targetRate}`);
    }

    if (result.hourly_rate === targetRate) {
      console.log(`\n✅ Arthur Felix already has the correct hourly rate ($${targetRate}). No changes needed.`);
      process.exit(0);
    }

    // Update the hourly rate using direct SQL
    console.log(`\n💾 Updating hourly rate from $${result.hourly_rate} to $${targetRate}...`);
    sqliteDb.prepare('UPDATE consultants SET hourly_rate = ?, updated_at = ? WHERE id = ?').run(
      targetRate,
      new Date().toISOString(),
      result.id
    );

    // Verify the update
    const updated = sqliteDb.prepare('SELECT id, name, hourly_rate FROM consultants WHERE id = ?').get(result.id) as any;
    console.log(`\n✅ Successfully updated Arthur Felix:`);
    console.log(`   Name: ${updated.name}`);
    console.log(`   Hourly Rate: $${updated.hourly_rate}`);
    console.log(`\nArthur Felix's hourly rate has been restored to $${targetRate}`);
  } catch (error) {
    console.error('❌ Error updating Arthur Felix hourly rate:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

fixArthurFelixHourlyRate();

