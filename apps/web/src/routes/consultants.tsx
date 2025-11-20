import { useConsultants } from '@/hooks/use-consultants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency, formatDate, formatMonthAbbr } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { Link } from 'react-router-dom';
import { Eye, Edit, FileCheck, AlertTriangle } from 'lucide-react';
import { useState, useMemo } from 'react';
import PayrollSettingsTable from '@/components/payroll-settings-table';

export default function ConsultantsPage() {
  const { data: consultants, isLoading } = useConsultants();
  const [generatingContracts, setGeneratingContracts] = useState<Record<number, boolean>>({});

  // Check if there are any consultants with bonuses that need to be dissolved
  const hasConsultantsWithBonuses = useMemo(() => {
    if (!consultants || consultants.length === 0) return false;
    
    // Debug: log consultant data to check structure
    console.log('Consultants data:', consultants);
    console.log('Checking for bonuses:', consultants.map((c: any) => ({
      name: c.name,
      yearlyBonus: c.yearlyBonus,
      bonusMonth: c.bonusMonth
    })));
    
    const hasBonuses = consultants.some((consultant: any) => {
      // Check both camelCase and snake_case field names
      const bonus = consultant.yearlyBonus ?? consultant.yearly_bonus;
      return bonus != null && bonus > 0;
    });
    
    console.log('Has consultants with bonuses:', hasBonuses);
    
    // TEMPORARY: Uncomment the line below to always show warning for testing
    // return true;
    
    return hasBonuses;
  }, [consultants]);

  const handleGenerateContract = async (consultant: any) => {
    const consultantId = consultant.id;
    setGeneratingContracts(prev => ({ ...prev, [consultantId]: true }));
    
    try {
      await apiClient.generateConsultantContract(consultantId);
    } catch (error: any) {
      console.error('Failed to generate contract:', error);
      alert(`Failed to generate contract: ${error.message}`);
    } finally {
      setGeneratingContracts(prev => ({ ...prev, [consultantId]: false }));
    }
  };

  const canGenerateContract = (consultant: any) => 
    consultant.name?.trim() && 
    consultant.companyLegalName?.trim() && 
    consultant.cnpj?.trim();

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

      <Tabs defaultValue="consultants" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="consultants">Consultant Management</TabsTrigger>
          <TabsTrigger value="payroll-settings">Payroll Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="consultants" className="space-y-4">
          {hasConsultantsWithBonuses && (
            <Alert variant="default" className="border-yellow-500 bg-yellow-50 text-yellow-900">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-900 font-semibold">Bonus Dissolution Required</AlertTitle>
              <AlertDescription className="text-yellow-800">
                Before adding a new consultant, you must dissolve all existing bonuses into hourly payments. 
                This feature will distribute each consultant's bonus into their hourly rate and reset the bonus to $0. 
                Please use the bonus dissolution feature before creating new consultants.
              </AlertDescription>
            </Alert>
          )}
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
                    <TableHead>Bonus Month</TableHead>
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
                        {consultant.bonusMonth ? (
                          <span className="text-xs font-medium text-gray-700">{formatMonthAbbr(consultant.bonusMonth)}</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
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
                        <div className="flex flex-wrap gap-2">
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleGenerateContract(consultant)}
                            disabled={generatingContracts[consultant.id] || !canGenerateContract(consultant)}
                            title={!canGenerateContract(consultant) ? 'Missing required fields: Name, Company Legal Name, or CNPJ' : 'Generate Master Services Agreement'}
                          >
                            <FileCheck className="w-4 h-4 mr-1" />
                            {generatingContracts[consultant.id] ? 'Generating...' : 'Contract'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll-settings" className="space-y-4">
          <PayrollSettingsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
