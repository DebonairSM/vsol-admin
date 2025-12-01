import { db, initializeDatabase } from '../../apps/api/src/db';

async function verify() {
  await initializeDatabase();
  const allConsultants = await db.query.consultants.findMany();
  
  // Try to find by name
  const consultant = allConsultants.find(c => 
    c.name.toLowerCase().includes('lucas') && 
    c.name.toLowerCase().includes('raphael')
  );
  
  if (consultant) {
    console.log('Found consultant:');
    console.log(`  ID: ${consultant.id}`);
    console.log(`  Name: ${consultant.name}`);
    console.log(`  Email: ${consultant.email || 'N/A'}`);
    console.log(`  CPF: ${consultant.cpf || 'N/A'}`);
    console.log(`  CNPJ: ${consultant.cnpj || 'N/A'}`);
    console.log(`  City: ${consultant.city || 'N/A'}, ${consultant.state || 'N/A'}`);
  } else {
    console.log('Consultant not found');
  }
  
  process.exit(0);
}

verify().catch(console.error);
