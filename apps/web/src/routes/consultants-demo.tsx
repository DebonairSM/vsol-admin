import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useConsultants } from '@/hooks/use-consultants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Eye, Edit, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function ConsultantsDemoPage() {
  const { data: consultants, isLoading } = useConsultants();
  const [insertingDemo, setInsertingDemo] = useState(false);
  const [demoInserted, setDemoInserted] = useState(false);

  const insertBrazilianData = async () => {
    setInsertingDemo(true);
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

      await apiClient.createConsultant(consultantData);
      setDemoInserted(true);
    } catch (error) {
      console.error('Failed to insert Brazilian consultant data:', error);
      alert('Failed to insert data. Check console for details.');
    } finally {
      setInsertingDemo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading consultants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Consultants</h1>
          <p className="text-gray-600">Manage consultant information and rates</p>
        </div>
        <div className="flex space-x-2">
          {!demoInserted && (
            <Button 
              onClick={insertBrazilianData} 
              disabled={insertingDemo}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              {insertingDemo ? 'Adding Arthur...' : 'Add Arthur (Demo)'}
            </Button>
          )}
        </div>
      </div>

      {demoInserted && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-green-600 font-medium">
                ✅ Brazilian consultant data inserted successfully!
              </div>
              <p className="text-sm text-green-600 mt-2">
                Arthur Francisco Félix da Silva has been added with all Brazilian registration details.
                Check the table below and click "View" to see the full profile.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Consultants</CardTitle>
          <CardDescription>
            View and manage consultant profiles, rates, and status. Click "View" to see full profiles with Brazilian registration details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultant Info</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Company Details</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Termination Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultants?.map((consultant: any) => (
                <TableRow key={consultant.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{consultant.name}</div>
                      {consultant.email && (
                        <div className="text-xs text-gray-600">{consultant.email}</div>
                      )}
                      {consultant.phone && (
                        <div className="text-xs text-gray-500">{consultant.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{formatCurrency(consultant.hourlyRate)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {consultant.companyTradeName && (
                        <div className="font-medium">{consultant.companyTradeName}</div>
                      )}
                      {consultant.companyLegalName && consultant.companyLegalName !== consultant.companyTradeName && (
                        <div className="text-xs text-gray-600">{consultant.companyLegalName}</div>
                      )}
                      {consultant.payoneerID && (
                        <div className="text-xs text-blue-600">Payoneer: {consultant.payoneerID}</div>
                      )}
                      {consultant.cnpj && (
                        <div className="text-xs text-gray-500">CNPJ: {consultant.cnpj}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(consultant.startDate)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      consultant.terminationDate 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {consultant.terminationDate ? 'Terminated' : 'Active'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {consultant.terminationDate ? formatDate(consultant.terminationDate) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link to={`/consultants/${consultant.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link to={`/consultants/${consultant.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
