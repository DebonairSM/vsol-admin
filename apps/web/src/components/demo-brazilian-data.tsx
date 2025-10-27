import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { createConsultant } from '@/lib/api-client';

export default function DemoBrazilianData() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const insertBrazilianData = async () => {
    setLoading(true);
    try {
      // Arthur Francisco Félix da Silva data from the user's query
      const consultantData = {
        name: 'Arthur Francisco Félix da Silva',
        hourlyRate: 25.00, // Example rate
        email: 'adm.thurbecode@outlook.com',
        address: 'Rua Hermengarda, nº 515 – Apto 601',
        neighborhood: 'Méier',
        city: 'Rio de Janeiro',
        state: 'RJ',
        cep: '20710-010',
        phone: '+55 21 96971-6663',
        birthDate: '1991-05-29T00:00:00.000Z',
        shirtSize: 'GG' as const,
        // Company Data
        companyLegalName: 'ARTHUR FELIX SOLUCOES INTELIGENTES EM SOFTWARE LTDA',
        companyTradeName: 'THUR BE CODE',
        cnpj: '44.577.002/0001-13',
        payoneerID: '48617898',
        // Emergency Contact
        emergencyContactName: 'Fernanda',
        emergencyContactRelation: 'Esposa',
        emergencyContactPhone: '+55 21 96660-4765',
        // Documents
        cpf: '137.257.707-60'
      };

      await createConsultant(consultantData);
      setSuccess(true);
    } catch (error) {
      console.error('Failed to insert Brazilian consultant data:', error);
      alert('Failed to insert data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-green-600 font-medium">
              ✅ Brazilian consultant data inserted successfully!
            </div>
            <p className="text-sm text-green-600 mt-2">
              Arthur Francisco Félix da Silva has been added to the system with all Brazilian registration details.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo: Insert Brazilian Consultant Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will insert the Brazilian consultant registration data provided in the requirements:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>Nome:</strong> Arthur Francisco Félix da Silva</li>
            <li>• <strong>Email:</strong> adm.thurbecode@outlook.com</li>
            <li>• <strong>Empresa:</strong> THUR BE CODE (ARTHUR FELIX SOLUCOES INTELIGENTES EM SOFTWARE LTDA)</li>
            <li>• <strong>CPF:</strong> 137.257.707-60</li>
            <li>• <strong>CNPJ:</strong> 44.577.002/0001-13</li>
            <li>• <strong>Payoneer ID:</strong> 48617898</li>
            <li>• <strong>Contato Emergência:</strong> Fernanda (Esposa)</li>
          </ul>
          <Button 
            onClick={insertBrazilianData} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Inserting Data...' : 'Insert Brazilian Consultant Data'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
