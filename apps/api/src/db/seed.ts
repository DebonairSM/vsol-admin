import { db, users, consultants, payrollCycles, cycleLineItems } from './index';
import { hashPassword } from '../lib/bcrypt';

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

    // Create consultants with exact data from CSV
    console.log('Creating consultants...');
    const consultantData = [
      { name: 'Gustavo Moutella Vilela', hourlyRate: 30.00, startDate: new Date('2012-09-24') },
      { name: 'Enzo Gehlen', hourlyRate: 26.05, startDate: new Date('2018-07-07') },
      { name: 'Fabiano Louback Gonçalves', hourlyRate: 18.60, startDate: new Date('2020-05-12') },
      { name: 'Rafael Celegato', hourlyRate: 35.00, startDate: new Date('2021-10-06') },
      { name: 'Kristof Berge', hourlyRate: 17.93, startDate: new Date('2021-11-16') },
      { name: 'Lucas R. L. Martins', hourlyRate: 22.00, startDate: new Date('2021-11-29') },
      { name: 'Arthur Felix', hourlyRate: 26.00, startDate: new Date('2022-01-03') },
      { name: 'Tiago Lima', hourlyRate: 23.12, startDate: new Date('2022-07-04') },
      { name: 'Fernando Motta', hourlyRate: 13.00, startDate: new Date('2023-01-02') },
      { name: 'Guilherme Martini Bronzatti', hourlyRate: 12.50, startDate: new Date('2022-05-30') }
    ];

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

    console.log('✅ Database seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   - 3 users (rommel, isabel, celiane)`);
    console.log(`   - 10 consultants`);
    console.log(`   - 1 payroll cycle (October 2025)`);
    console.log(`   - 10 cycle line items`);
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
