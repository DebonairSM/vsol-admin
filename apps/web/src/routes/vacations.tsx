import { useState } from 'react';
import { useVacations, useVacationBalances, useCreateVacationDay, useCreateVacationRange, useUpdateVacationDay, useDeleteVacationDay } from '@/hooks/use-vacations';
import { useConsultants } from '@/hooks/use-consultants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Plus, Calendar, Trash2, Edit, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import type { VacationDay, VacationBalance } from '@vsol-admin/shared';

export default function VacationsPage() {
  const { data: consultants } = useConsultants();
  const { toast } = useToast();
  
  const [selectedConsultant, setSelectedConsultant] = useState<number | undefined>();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const { data: vacations, isLoading } = useVacations(
    selectedConsultant,
    startDate || undefined,
    endDate || undefined
  );
  
  const { data: balances } = useVacationBalances();
  
  const createDay = useCreateVacationDay();
  const createRange = useCreateVacationRange();
  const updateDay = useUpdateVacationDay();
  const deleteDay = useDeleteVacationDay();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRangeDialogOpen, setIsRangeDialogOpen] = useState(false);
  const [editingVacation, setEditingVacation] = useState<VacationDay | null>(null);
  
  // Form state for single day
  const [dayForm, setDayForm] = useState({
    consultantId: '',
    vacationDate: '',
    notes: ''
  });
  
  // Form state for range
  const [rangeForm, setRangeForm] = useState({
    consultantId: '',
    startDate: '',
    endDate: '',
    notes: ''
  });
  
  const handleCreateDay = async () => {
    if (!dayForm.consultantId || !dayForm.vacationDate) {
      toast({
        title: 'Error',
        description: 'Consultant and date are required',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await createDay.mutateAsync({
        consultantId: parseInt(dayForm.consultantId),
        vacationDate: new Date(dayForm.vacationDate).toISOString(),
        notes: dayForm.notes || undefined
      });
      
      toast({
        title: 'Success',
        description: 'Vacation day created successfully'
      });
      
      setIsCreateDialogOpen(false);
      setDayForm({ consultantId: '', vacationDate: '', notes: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create vacation day',
        variant: 'destructive'
      });
    }
  };
  
  const handleCreateRange = async () => {
    if (!rangeForm.consultantId || !rangeForm.startDate || !rangeForm.endDate) {
      toast({
        title: 'Error',
        description: 'Consultant, start date, and end date are required',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await createRange.mutateAsync({
        consultantId: parseInt(rangeForm.consultantId),
        startDate: new Date(rangeForm.startDate).toISOString(),
        endDate: new Date(rangeForm.endDate).toISOString(),
        notes: rangeForm.notes || undefined
      });
      
      toast({
        title: 'Success',
        description: 'Vacation range created successfully'
      });
      
      setIsRangeDialogOpen(false);
      setRangeForm({ consultantId: '', startDate: '', endDate: '', notes: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create vacation range',
        variant: 'destructive'
      });
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this vacation day?')) {
      return;
    }
    
    try {
      await deleteDay.mutateAsync(id);
      toast({
        title: 'Success',
        description: 'Vacation day deleted successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete vacation day',
        variant: 'destructive'
      });
    }
  };
  
  const getConsultantName = (consultantId: number) => {
    const consultant = consultants?.find((c: any) => c.id === consultantId);
    return consultant?.name || `Consultant ${consultantId}`;
  };
  
  const getBalanceForConsultant = (consultantId: number): VacationBalance | undefined => {
    return balances?.find((b: VacationBalance) => b.consultantId === consultantId);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vacations</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage consultant vacation days</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isRangeDialogOpen} onOpenChange={setIsRangeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Add Range
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Vacation Range</DialogTitle>
                <DialogDescription>
                  Create multiple vacation days for a date range
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="range-consultant">Consultant</Label>
                  <Select
                    value={rangeForm.consultantId}
                    onValueChange={(value) => setRangeForm({ ...rangeForm, consultantId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select consultant" />
                    </SelectTrigger>
                    <SelectContent>
                      {consultants?.map((consultant: any) => (
                        <SelectItem key={consultant.id} value={consultant.id.toString()}>
                          {consultant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="range-start">Start Date</Label>
                  <Input
                    id="range-start"
                    type="date"
                    value={rangeForm.startDate}
                    onChange={(e) => setRangeForm({ ...rangeForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="range-end">End Date</Label>
                  <Input
                    id="range-end"
                    type="date"
                    value={rangeForm.endDate}
                    onChange={(e) => setRangeForm({ ...rangeForm, endDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="range-notes">Notes (optional)</Label>
                  <Textarea
                    id="range-notes"
                    value={rangeForm.notes}
                    onChange={(e) => setRangeForm({ ...rangeForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsRangeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRange} disabled={createRange.isPending}>
                    {createRange.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Day
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Vacation Day</DialogTitle>
                <DialogDescription>
                  Add a single vacation day for a consultant
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="day-consultant">Consultant</Label>
                  <Select
                    value={dayForm.consultantId}
                    onValueChange={(value) => setDayForm({ ...dayForm, consultantId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select consultant" />
                    </SelectTrigger>
                    <SelectContent>
                      {consultants?.map((consultant: any) => (
                        <SelectItem key={consultant.id} value={consultant.id.toString()}>
                          {consultant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="day-date">Date</Label>
                  <Input
                    id="day-date"
                    type="date"
                    value={dayForm.vacationDate}
                    onChange={(e) => setDayForm({ ...dayForm, vacationDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="day-notes">Notes (optional)</Label>
                  <Textarea
                    id="day-notes"
                    value={dayForm.notes}
                    onChange={(e) => setDayForm({ ...dayForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateDay} disabled={createDay.isPending}>
                    {createDay.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filter-consultant">Consultant</Label>
              <Select
                value={selectedConsultant?.toString() || ''}
                onValueChange={(value) => setSelectedConsultant(value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All consultants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All consultants</SelectItem>
                  {consultants?.map((consultant: any) => (
                    <SelectItem key={consultant.id} value={consultant.id.toString()}>
                      {consultant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-start">Start Date</Label>
              <Input
                id="filter-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filter-end">End Date</Label>
              <Input
                id="filter-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Vacation Balances */}
      {balances && balances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vacation Balances</CardTitle>
            <CardDescription>
              Each consultant gets 20 days per year, resetting on their hire anniversary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {balances.map((balance: VacationBalance) => (
                <div key={balance.consultantId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Link
                      to={`/consultants/${balance.consultantId}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {balance.consultantName}
                    </Link>
                    <Badge variant={balance.daysRemaining < 5 ? 'destructive' : 'default'}>
                      {balance.daysRemaining} remaining
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Used: {balance.daysUsed} / {balance.totalAllocated}</div>
                    <div className="text-xs">
                      Period: {formatDate(balance.currentYearStart)} - {formatDate(balance.currentYearEnd)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Vacations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vacation Days</CardTitle>
          <CardDescription>
            {vacations ? `${vacations.length} vacation day${vacations.length !== 1 ? 's' : ''} found` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : vacations && vacations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Consultant</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.map((vacation: any) => {
                  const balance = getBalanceForConsultant(vacation.consultantId);
                  return (
                    <TableRow key={vacation.id}>
                      <TableCell>{formatDate(vacation.vacationDate)}</TableCell>
                      <TableCell>
                        <Link
                          to={`/consultants/${vacation.consultantId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {getConsultantName(vacation.consultantId)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {balance && (
                          <Badge variant={balance.daysRemaining < 5 ? 'destructive' : 'default'}>
                            {balance.daysRemaining} remaining
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {vacation.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(vacation.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No vacation days found</p>
              <p className="text-sm">Create your first vacation day to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}









