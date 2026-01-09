import { useConsultants, useUpdateConsultant } from '@/hooks/use-consultants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BlurredValue } from '@/components/ui/blurred-value';
import { formatCurrency, formatDate, formatMonthAbbr } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { Link } from 'react-router-dom';
import { Eye, Edit, FileCheck, AlertTriangle } from 'lucide-react';
import { useState, useMemo } from 'react';
import PayrollSettingsTable from '@/components/payroll-settings-table';

export default function ConsultantsPage() {
  const { data: consultants, isLoading } = useConsultants();
  const updateConsultant = useUpdateConsultant();
  const [generatingContracts, setGeneratingContracts] = useState<Record<number, boolean>>({});
  const [editingNumber, setEditingNumber] = useState<{ consultantId: number; value: string } | null>(null);

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

  const handleNumberEdit = (consultantId: number, currentValue: number | null) => {
    setEditingNumber({ consultantId, value: currentValue?.toString() || '' });
  };

  const handleNumberSave = async () => {
    if (!editingNumber) return;

    try {
      const value = editingNumber.value.trim() === '' ? null : parseFloat(editingNumber.value);
      await updateConsultant.mutateAsync({
        id: editingNumber.consultantId,
        data: { number: (value !== null && !isNaN(value)) ? value : null }
      });
      setEditingNumber(null);
    } catch (error) {
      console.error('Failed to update number:', error);
    }
  };

  const handleNumberCancel = () => {
    setEditingNumber(null);
  };

  // Calculate total of all numbers
  const totalNumber = useMemo(() => {
    if (!consultants) return 0;
    return consultants.reduce((sum: number, consultant: any) => {
      const num = consultant.number;
      return sum + (num != null && !isNaN(num) ? num : 0);
    }, 0);
  }, [consultants]);

  // Calculate total hourly rate (sum of all consultant hourly rates)
  const totalHourlyRate = useMemo(() => {
    if (!consultants) return 0;
    return consultants.reduce((sum: number, consultant: any) => {
      const rate = consultant.hourlyRate;
      return sum + (rate != null && !isNaN(rate) ? rate : 0);
    }, 0);
  }, [consultants]);

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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Consultants</h1>
        <p className="text-sm sm:text-base text-gray-600">Manage consultant information and rates</p>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Consultants</CardTitle>
                  <CardDescription>
                    View and manage consultant profiles, rates, and status
                  </CardDescription>
                </div>
                <Link to="/consultants/new">
                  <Button>Add Consultant</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-white min-w-[180px]">Consultant Info</TableHead>
                      <TableHead className="text-xs md:text-sm">Number</TableHead>
                      <TableHead className="text-xs md:text-sm">Hourly Rate</TableHead>
                      <TableHead className="text-xs md:text-sm">Bonus Month</TableHead>
                      <TableHead className="text-xs md:text-sm">Company Details</TableHead>
                      <TableHead className="text-xs md:text-sm">Start Date</TableHead>
                      <TableHead className="text-xs md:text-sm">Status</TableHead>
                      <TableHead className="text-xs md:text-sm">Termination Date</TableHead>
                      <TableHead className="text-xs md:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultants?.map((consultant: any) => (
                      <TableRow key={consultant.id}>
                        <TableCell className="font-medium sticky left-0 z-10 bg-white min-w-[180px]">
                        <div>
                          <div className="font-semibold text-xs md:text-sm">{consultant.name}</div>
                          {consultant.email && (
                            <div className="text-xs text-gray-600">{consultant.email}</div>
                          )}
                          {consultant.phone && (
                            <div className="text-xs text-gray-500">{consultant.phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingNumber?.consultantId === consultant.id ? (
                          <div className="flex gap-1 items-center">
                            <Input
                              type="number"
                              value={editingNumber?.value || ''}
                              onChange={(e) => editingNumber && setEditingNumber({ ...editingNumber, value: e.target.value })}
                              className="w-20 h-8 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNumberSave();
                                if (e.key === 'Escape') handleNumberCancel();
                              }}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={handleNumberSave} className="h-8 px-2 text-xs">✓</Button>
                            <Button size="sm" variant="ghost" onClick={handleNumberCancel} className="h-8 px-2 text-xs">✕</Button>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded text-xs md:text-sm font-mono"
                            onClick={() => handleNumberEdit(consultant.id, consultant.number ?? null)}
                          >
                            {consultant.number != null ? consultant.number : '-'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs md:text-sm"><BlurredValue>{formatCurrency(consultant.hourlyRate)}</BlurredValue></TableCell>
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
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          <Link to={`/consultants/${consultant.id}`}>
                            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>
                          <Link to={`/consultants/${consultant.id}/edit`}>
                            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleGenerateContract(consultant)}
                            disabled={generatingContracts[consultant.id] || !canGenerateContract(consultant)}
                            title={!canGenerateContract(consultant) ? 'Missing required fields: Name, Company Legal Name, or CNPJ' : 'Generate Master Services Agreement'}
                            className="text-xs sm:text-sm"
                          >
                            <FileCheck className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                            <span className="hidden sm:inline">{generatingContracts[consultant.id] ? 'Generating...' : 'Contract'}</span>
                            <span className="sm:hidden">{generatingContracts[consultant.id] ? '...' : 'Doc'}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={1} className="sticky left-0 z-10 bg-gray-50">
                      <span className="text-xs md:text-sm">Total</span>
                    </TableCell>
                    <TableCell className="text-xs md:text-sm font-mono">
                      {totalNumber.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs md:text-sm font-mono">
                      <BlurredValue>{formatCurrency(totalHourlyRate)}</BlurredValue>
                    </TableCell>
                    <TableCell colSpan={6}></TableCell>
                  </TableRow>
                </tfoot>
              </Table>
              </div>
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
