import { useConsultants } from '@/hooks/use-consultants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Eye, Edit } from 'lucide-react';

export default function ConsultantsPage() {
  const { data: consultants, isLoading } = useConsultants();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading consultants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Consultants</h1>
        <p className="text-gray-600">Manage consultant information and rates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Consultants</CardTitle>
          <CardDescription>
            View and manage consultant profiles, rates, and status
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
