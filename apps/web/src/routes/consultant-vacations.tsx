import { useState, useMemo } from 'react';
import { useConsultantVacations, useConsultantVacationBalance, useConsultantVacationCalendar, useCreateConsultantVacationDay, useCreateConsultantVacationRange, useDeleteConsultantVacationDay } from '@/hooks/use-vacations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { formatDate } from '@/lib/utils';
import { Plus, Calendar as CalendarIcon, Trash2, Plane } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { VacationDay, VacationBalance } from '@vsol-admin/shared';

export default function ConsultantVacationsPage() {
  const { toast } = useToast();
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  const { data: vacations, isLoading } = useConsultantVacations(
    startDate || undefined,
    endDate || undefined
  );
  
  const { data: balance } = useConsultantVacationBalance();
  
  const createDay = useCreateConsultantVacationDay();
  const createRange = useCreateConsultantVacationRange();
  const deleteDay = useDeleteConsultantVacationDay();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRangeDialogOpen, setIsRangeDialogOpen] = useState(false);
  
  // Form state for single day
  const [dayForm, setDayForm] = useState({
    vacationDate: '',
    notes: ''
  });
  
  // Form state for range
  const [rangeForm, setRangeForm] = useState({
    startDate: '',
    endDate: '',
    notes: ''
  });
  
  const monthStart = useMemo(() => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    return date.toISOString().split('T')[0];
  }, [selectedMonth]);
  
  const monthEnd = useMemo(() => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    return date.toISOString().split('T')[0];
  }, [selectedMonth]);
  
  const { data: calendarEvents } = useConsultantVacationCalendar(monthStart, monthEnd);
  
  // Get dates with vacations for calendar modifiers
  const vacationDates = useMemo(() => {
    if (!calendarEvents) return [];
    return calendarEvents.map(event => {
      const [year, month, day] = event.date.split('-').map(Number);
      return new Date(year, month - 1, day);
    });
  }, [calendarEvents]);
  
  // Get upcoming vacations (next 30 days)
  const upcomingVacations = useMemo(() => {
    if (!vacations) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    return vacations
      .filter((vacation: VacationDay) => {
        const vacationDate = new Date(vacation.vacationDate);
        return vacationDate >= today && vacationDate <= thirtyDaysLater;
      })
      .sort((a: VacationDay, b: VacationDay) => 
        new Date(a.vacationDate).getTime() - new Date(b.vacationDate).getTime()
      )
      .slice(0, 10);
  }, [vacations]);
  
  const handleCreateDay = async () => {
    if (!dayForm.vacationDate) {
      toast({
        title: 'Error',
        description: 'Date is required',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await createDay.mutateAsync({
        vacationDate: new Date(dayForm.vacationDate).toISOString(),
        notes: dayForm.notes || undefined
      });
      
      toast({
        title: 'Success',
        description: 'Vacation day created successfully'
      });
      
      setIsCreateDialogOpen(false);
      setDayForm({ vacationDate: '', notes: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create vacation day',
        variant: 'destructive'
      });
    }
  };
  
  const handleCreateRange = async () => {
    if (!rangeForm.startDate || !rangeForm.endDate) {
      toast({
        title: 'Error',
        description: 'Start date and end date are required',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await createRange.mutateAsync({
        startDate: new Date(rangeForm.startDate).toISOString(),
        endDate: new Date(rangeForm.endDate).toISOString(),
        notes: rangeForm.notes || undefined
      });
      
      toast({
        title: 'Success',
        description: 'Vacation range created successfully'
      });
      
      setIsRangeDialogOpen(false);
      setRangeForm({ startDate: '', endDate: '', notes: '' });
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
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Vacations</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your vacation days</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isRangeDialogOpen} onOpenChange={setIsRangeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
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
                  Add a single vacation day
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
      
      {/* Vacation Balance */}
      {balance && (
        <Card>
          <CardHeader>
            <CardTitle>Vacation Balance</CardTitle>
            <CardDescription>
              You get 20 days per year, resetting on your hire anniversary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">Days Remaining</span>
                <Badge variant={balance.daysRemaining < 5 ? 'destructive' : 'default'} className="text-lg px-4 py-2">
                  {balance.daysRemaining} / {balance.totalAllocated}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Used: {balance.daysUsed} days</div>
                <div>
                  Period: {formatDate(balance.currentYearStart)} - {formatDate(balance.currentYearEnd)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Calendar and Upcoming Vacations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Your vacation days</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              modifiers={{
                vacation: vacationDates
              }}
              modifiersClassNames={{
                vacation: "bg-blue-100 text-blue-900 font-semibold hover:bg-blue-200"
              }}
              className="rounded-md border"
            />
            {vacationDates.length > 0 && (
              <div className="mt-4 text-xs text-gray-600">
                <span className="inline-block w-3 h-3 bg-blue-100 rounded mr-1"></span>
                Days with vacations
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Vacations</CardTitle>
            <CardDescription>Next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingVacations && upcomingVacations.length > 0 ? (
              <div className="space-y-2">
                {upcomingVacations.map((vacation: VacationDay) => (
                  <div key={vacation.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium text-sm">{formatDate(vacation.vacationDate)}</div>
                      {vacation.notes && (
                        <div className="text-xs text-gray-600">{vacation.notes}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(vacation.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No upcoming vacations
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      
      {/* Vacations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Vacation Days</CardTitle>
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
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.map((vacation: VacationDay) => (
                  <TableRow key={vacation.id}>
                    <TableCell>{formatDate(vacation.vacationDate)}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Plane className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No vacation days found</p>
              <p className="text-sm">Create your first vacation day to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

