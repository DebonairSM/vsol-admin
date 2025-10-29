import { db, users, consultants, payrollCycles, cycleLineItems, systemSettings } from './index';
import { hashPassword } from '../lib/bcrypt';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper function to parse month abbreviation from "Jul-24" format
function parseBonusMonth(bonusDateStr: string | null | undefined): number | null {
  if (!bonusDateStr || !bonusDateStr.trim()) return null;
  
  const monthMap: Record<string, number> = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
    'may': 5, 'jun': 6, 'jul': 7, 'aug': 8,
    'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
  };
  
  // Extract month abbreviation (first 3 letters)
  const monthAbbr = bonusDateStr.trim().toLowerCase().substring(0, 3);
  return monthMap[monthAbbr] || null;
}

// Parse CSV to extract bonus months for consultants
function parseCSVForBonusMonths(): Map<string, number> {
  const csvPath = join(__dirname, '../../../../seeding/vsol-admin-excel.csv');
  let content: string;
  
  try {
    content = readFileSync(csvPath, 'utf-8');
  } catch (error) {
    console.warn('⚠️  Could not read CSV file, bonusMonth will not be populated from CSV');
    return new Map();
  }
  
  const lines = content.split('\n').filter(line => line.trim());
  const bonusMonthMap = new Map<string, number>();
  
  // Skip header (line 0) and process data rows
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',');
    if (columns.length < 5) continue; // Skip incomplete rows
    
    const contractorName = columns[0]?.trim();
    const bonusDate = columns[4]?.trim(); // Bonus Date column (5th column, index 4)
    
    if (contractorName && bonusDate && contractorName !== '') {
      const month = parseBonusMonth(bonusDate);
      if (month) {
        bonusMonthMap.set(contractorName, month);
      }
    }
  }
  
  return bonusMonthMap;
}

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Create users (rommel, isabel, celiane)
    console.log('Creating users...');
    const hashedPassword = await hashPassword('admin123'); // Default password for all users
    
    await db.insert(users).values([
      {
        username: 'rommel',
        passwordHash: hashedPassword,
        role: 'admin'
      },
      {
        username: 'isabel',
        passwordHash: hashedPassword,
        role: 'admin'
      },
      {
        username: 'celiane',
        passwordHash: hashedPassword,
        role: 'admin'
      }
    ]);

    // Parse CSV to get bonus months
    console.log('Parsing CSV for bonus month assignments...');
    const bonusMonthMap = parseCSVForBonusMonths();

    // Create consultants with exact data from CSV
    console.log('Creating consultants...');
    const consultantData = [
      { name: 'Gustavo Moutella Vilela', hourlyRate: 30.00, startDate: new Date('2012-09-24'), bonusMonth: bonusMonthMap.get('Gustavo Moutella Vilela') || null },
      { name: 'Enzo Gehlen', hourlyRate: 26.05, startDate: new Date('2018-07-07'), bonusMonth: bonusMonthMap.get('Enzo Gehlen') || null },
      { name: 'Fabiano Louback Gonçalves', hourlyRate: 18.60, startDate: new Date('2020-05-12'), bonusMonth: bonusMonthMap.get('Fabiano Louback Gonçalves') || bonusMonthMap.get('Fabiano Louback Gonalves') || null },
      { name: 'Rafael Celegato', hourlyRate: 35.00, startDate: new Date('2021-10-06'), bonusMonth: bonusMonthMap.get('Rafael Celegato') || null },
      { name: 'Kristof Berge', hourlyRate: 17.93, startDate: new Date('2021-11-16'), bonusMonth: bonusMonthMap.get('Kristof Berge') || null },
      { name: 'Lucas R. L. Martins', hourlyRate: 22.00, startDate: new Date('2021-11-29'), bonusMonth: bonusMonthMap.get('Lucas R. L. Martins') || null },
      { name: 'Arthur Felix', hourlyRate: 26.00, startDate: new Date('2022-01-03'), bonusMonth: bonusMonthMap.get('Arthur Felix') || null },
      { name: 'Tiago Lima', hourlyRate: 23.12, startDate: new Date('2022-07-04'), bonusMonth: bonusMonthMap.get('Tiago Lima') || null },
      { name: 'Fernando Motta', hourlyRate: 13.00, startDate: new Date('2023-01-02'), bonusMonth: bonusMonthMap.get('Fernando Motta') || null },
      { name: 'Guilherme Martini Bronzatti', hourlyRate: 12.50, startDate: new Date('2022-05-30'), bonusMonth: bonusMonthMap.get('Guilherme Martini Bronzatti') || null }
    ];
    
    // Log bonus month assignments for verification
    consultantData.forEach(c => {
      if (c.bonusMonth) {
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        console.log(`   ${c.name}: Bonus month = ${monthNames[c.bonusMonth]} (${c.bonusMonth})`);
      }
    });

    const createdConsultants = await db.insert(consultants).values(consultantData).returning();

    // Create October 2025 payroll cycle
    console.log('Creating October 2025 payroll cycle...');
    const [cycle] = await db.insert(payrollCycles).values({
      monthLabel: '2025-10',
      calculatedPaymentDate: new Date('2025-10-25'),
      paymentArrivalDate: new Date('2025-10-25'),
      sendReceiptDate: new Date('2025-10-25'),
      sendInvoiceDate: new Date('2025-10-25'),
      invoiceApprovalDate: new Date('2025-10-01'),
      hoursLimitChangedOn: new Date('2025-10-01'),
      additionalPaidOn: new Date('2025-10-01'),
      globalWorkHours: 184,
      omnigoBonus: 3111.00,
      pagamentoPIX: 0.00,
      pagamentoInter: 0.00,
      equipmentsUSD: 0.00
    }).returning();

    // Create cycle line items with specific data from golden sheet
    console.log('Creating cycle line items...');
    const lineItemsData = [
      {
        cycleId: cycle.id,
        consultantId: createdConsultants[0].id, // Gustavo
        ratePerHour: 30.00,
        bonusDate: new Date('2024-07-01'),
        informedDate: new Date('2024-02-21'),
        bonusPaydate: new Date('2025-07-01')
      },
      {
        cycleId: cycle.id,
        consultantId: createdConsultants[1].id, // Enzo
        ratePerHour: 26.05,
        adjustmentValue: 3111.00,
        bonusDate: new Date('2024-06-02'),
        informedDate: new Date('2025-05-15'),
        bonusPaydate: new Date('2025-06-02')
      },
      {
        cycleId: cycle.id,
        consultantId: createdConsultants[2].id, // Fabiano
        ratePerHour: 18.60,
        bonusDate: new Date('2024-03-04'),
        informedDate: new Date('2025-02-24'),
        bonusPaydate: new Date('2025-03-04')
      },
      {
        cycleId: cycle.id,
        consultantId: createdConsultants[3].id, // Rafael
        ratePerHour: 35.00,
        bonusDate: new Date('2024-04-04'),
        informedDate: new Date('2025-04-04'),
        bonusPaydate: new Date('2025-04-04')
      },
      {
        cycleId: cycle.id,
        consultantId: createdConsultants[4].id, // Kristof
        ratePerHour: 17.93,
        bonusDate: new Date('2024-11-02'),
        bonusPaydate: new Date('2024-11-02')
        // informedDate is null for Kristof
      },
      {
        cycleId: cycle.id,
        consultantId: createdConsultants[5].id, // Lucas
        ratePerHour: 22.00,
        bonusDate: new Date('2024-12-02'),
        informedDate: new Date('2024-12-02'),
        bonusPaydate: new Date('2024-12-02')
      },
      {
        cycleId: cycle.id,
        consultantId: createdConsultants[6].id, // Arthur
        ratePerHour: 26.00,
        bonusDate: new Date('2025-09-01'),
        informedDate: new Date('2025-09-01'),
        bonusPaydate: new Date('2025-09-01')
      },
      {
        cycleId: cycle.id,
        consultantId: createdConsultants[7].id, // Tiago
        ratePerHour: 23.12,
        bonusDate: new Date('2025-05-02'),
        informedDate: new Date('2025-05-02'),
        bonusPaydate: new Date('2025-05-02')
      },
      {
        cycleId: cycle.id,
        consultantId: createdConsultants[8].id, // Fernando
        ratePerHour: 13.00,
        bonusDate: new Date('2025-10-01'),
        informedDate: new Date('2025-09-12'),
        bonusPaydate: new Date('2025-10-01'),
        bonusAdvance: 500.00,
        advanceDate: new Date('2025-03-14')
      },
      {
        cycleId: cycle.id,
        consultantId: createdConsultants[9].id, // Guilherme
        ratePerHour: 12.50,
        bonusDate: new Date('2025-08-02'),
        informedDate: new Date('2025-07-10'),
        bonusPaydate: new Date('2025-08-02')
      }
    ];

    await db.insert(cycleLineItems).values(lineItemsData);

    // Initialize system settings (singleton - check if exists first)
    console.log('Initializing system settings...');
    const existingSettings = await db.query.systemSettings.findFirst({
      orderBy: (settings, { asc }) => [asc(settings.id)]
    });

    if (!existingSettings) {
      // Initialize with the cycle's omnigoBonus value if available, otherwise 0
      const defaultBonus = cycle.omnigoBonus || 0;
      await db.insert(systemSettings).values({
        defaultOmnigoBonus: defaultBonus,
        updatedAt: new Date()
      });
      console.log(`   System settings initialized with defaultOmnigoBonus: ${defaultBonus}`);
    } else {
      console.log('   System settings already exist, skipping initialization');
    }

    console.log('✅ Database seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   - 3 users (rommel, isabel, celiane)`);
    console.log(`   - 10 consultants`);
    console.log(`   - 1 payroll cycle (October 2025)`);
    console.log(`   - 10 cycle line items`);
    console.log(`   - 1 system settings record`);
    console.log(`🔑 Default password for all users: admin123`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed if called directly
if (require.main === module) {
  seed().then(() => {
    console.log('🎉 Seed completed!');
    process.exit(0);
  });
}

export default seed;
