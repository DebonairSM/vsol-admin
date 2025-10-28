const fs = require('fs');
const path = require('path');
const { db } = require('../apps/api/dist/db/index.js');
const { monthlyWorkHours } = require('../apps/api/dist/db/schema.js');

/**
 * Convert CSV data to JSON format expected by the import system
 */
function csvToJson(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  const result = {};
  let currentYear = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    
    // Check if this is a year declaration (just a number)
    if (parts.length === 3 && /^\d{4}$/.test(parts[0].trim())) {
      currentYear = parseInt(parts[0].trim());
      if (currentYear && !result[currentYear]) {
        result[currentYear] = [];
      }
      continue;
    }
    
    // Skip header lines
    if (parts[0].toLowerCase() === 'month' || parts[0].toLowerCase() === 'total') {
      continue;
    }
    
    // Process month data
    if (parts.length >= 3 && currentYear) {
      const month = parts[0].trim();
      const weekdays = parseInt(parts[1].trim());
      const workHours = parseInt(parts[2].trim());
      
      if (month && !isNaN(weekdays) && !isNaN(workHours) && workHours > 0) {
        // Convert month name to month number
        const monthNumber = getMonthNumber(month);
        if (monthNumber > 0) {
          result[currentYear].push({
            month,
            monthNumber,
            weekdays,
            workHours
          });
        }
      }
    }
  }
  
  return result;
}

function getMonthNumber(monthName) {
  const months = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12
  };
  
  return months[monthName.toLowerCase()] || -1;
}

async function importData() {
  const csvPath = path.join(__dirname, '../temp/vsol-admin-excel-work-hours.csv');
  
  console.log('📊 Converting CSV to JSON format...');
  const data = csvToJson(csvPath);
  
  console.log('📝 Parsed data:', JSON.stringify(data, null, 2));
  
  console.log('\n🔄 Importing data to database...');
  
  let totalImported = 0;
  let totalUpdated = 0;
  
  for (const [yearStr, months] of Object.entries(data)) {
    const year = parseInt(yearStr);
    
    if (year < 2020 || year > 2030) {
      console.log(`⚠️  Skipping invalid year: ${year}`);
      continue;
    }
    
    console.log(`\n📅 Processing year ${year}...`);
    
    for (const monthData of months) {
      // Check if record exists
      const existing = await db.query.monthlyWorkHours.findFirst({
        where: (workHours, { and, eq }) => and(
          eq(workHours.year, year),
          eq(workHours.monthNumber, monthData.monthNumber)
        )
      });
      
      if (existing) {
        // Update existing record
        await db.update(monthlyWorkHours)
          .set({
            month: monthData.month,
            weekdays: monthData.weekdays,
            workHours: monthData.workHours,
            updatedAt: new Date()
          })
          .where((table, { eq }) => eq(table.id, existing.id));
        console.log(`  ✅ Updated: ${monthData.month} (${monthData.workHours} hours)`);
        totalUpdated++;
      } else {
        // Insert new record
        await db.insert(monthlyWorkHours).values({
          year,
          month: monthData.month,
          monthNumber: monthData.monthNumber,
          weekdays: monthData.weekdays,
          workHours: monthData.workHours
        });
        console.log(`  ➕ Imported: ${monthData.month} (${monthData.workHours} hours)`);
        totalImported++;
      }
    }
  }
  
  console.log(`\n✨ Import complete!`);
  console.log(`   📊 Imported: ${totalImported} records`);
  console.log(`   🔄 Updated: ${totalUpdated} records`);
  console.log(`   📈 Total processed: ${totalImported + totalUpdated} records`);
}

importData().catch(console.error);

