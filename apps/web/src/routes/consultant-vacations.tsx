import { useState, useMemo } from 'react';
import { useConsultantVacations, useConsultantVacationBalance, useCreateConsultantVacationDay, useCreateConsultantVacationRange, useDeleteConsultantVacationDay } from '@/hooks/use-vacations';
import { useConsultantCalendarEvents } from '@/hooks/use-consultant-calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { formatDate } from '@/lib/utils';
import { Plus, Calendar as CalendarIcon, Trash2, Plane } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CalendarEventOccurrence, VacationDay } from '@vsol-admin/shared';

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
  
  
  const { data: calendarEvents } = useConsultantCalendarEvents(selectedMonth);
  
  // Group calendar events by date
  const eventsByDate = useMemo(() => {
    if (!calendarEvents) return new Map<string, CalendarEventOccurrence[]>();
    
    const map = new Map<string, CalendarEventOccurrence[]>();
    calendarEvents.forEach((event: CalendarEventOccurrence) => {
      const dateStr = event.date.toISOString().split('T')[0];
      const existing = map.get(dateStr) || [];
      map.set(dateStr, [...existing, event]);
    });
    return map;
  }, [calendarEvents]);
  
  // Get dates with events for calendar modifiers
  const vacationDates = useMemo(() => {
    if (!calendarEvents) return [];
    return calendarEvents
      .filter(e => e.type === 'vacation')
      .map(e => {
        const d = new Date(e.date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      });
  }, [calendarEvents]);

  const ceremonyDates = useMemo(() => {
    if (!calendarEvents) return [];
    return calendarEvents
      .filter(e => e.type === 'ceremony')
      .map(e => {
        const d = new Date(e.date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      });
  }, [calendarEvents]);

  const holidayDates = useMemo(() => {
    if (!calendarEvents) return [];
    return calendarEvents
      .filter(e => e.type === 'holiday')
      .map(e => {
        const d = new Date(e.date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      });
  }, [calendarEvents]);

  // Get upcoming vacations (next 30 days)
  const upcomingVacations = useMemo(() => {
    if (!vacations || !Array.isArray(vacations)) return [];
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
        // Store as noon UTC to prevent off-by-one day shifts when viewed in different timezones
        vacationDate: `${dayForm.vacationDate}T12:00:00.000Z`,
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
        // Store as noon UTC to prevent off-by-one day shifts when viewed in different timezones
        startDate: `${rangeForm.startDate}T12:00:00.000Z`,
        endDate: `${rangeForm.endDate}T12:00:00.000Z`,
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
  
  // @ts-ignore - TypeScript inference issue with JSX
  return (
    <div className="space-y-6" key="consultant-vacations-page">
      {/* Header */}
      {(
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" key="header">
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
      ) as any}
      
      {/* Vacation Balance */}
      {balance && typeof balance === 'object' && balance !== null && 'daysRemaining' in balance && (
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
                <Badge variant={(balance as any).daysRemaining < 5 ? 'destructive' : 'default'} className="text-lg px-4 py-2">
                  {(balance as any).daysRemaining} / {(balance as any).totalAllocated}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Used: {(balance as any).daysUsed} days</div>
                <div>
                  Period: {formatDate((balance as any).currentYearStart)} - {formatDate((balance as any).currentYearEnd)}
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
            <CardDescription>Your vacations, ceremonies, and holidays</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Calendar
                mode="single"
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                modifiers={{
                  vacation: vacationDates,
                  ceremony: ceremonyDates,
                  holiday: holidayDates
                }}
                modifiersClassNames={{
                  vacation: "bg-blue-100 text-blue-900 font-semibold hover:bg-blue-200",
                  ceremony: "bg-green-100 text-green-900 font-semibold hover:bg-green-200",
                  holiday: "bg-red-100 text-red-900 font-semibold hover:bg-red-200"
                }}
                className="rounded-md border"
              />
              {(vacationDates.length > 0 || ceremonyDates.length > 0 || holidayDates.length > 0) && (
                <div className="text-xs text-gray-600 space-y-1">
                  {vacationDates.length > 0 && (
                    <div>
                      <span className="inline-block w-3 h-3 bg-blue-100 rounded mr-1"></span>
                      My vacations
                    </div>
                  )}
                  {ceremonyDates.length > 0 && (
                    <div>
                      <span className="inline-block w-3 h-3 bg-green-100 rounded mr-1"></span>
                      Ceremonies
                    </div>
                  )}
                  {holidayDates.length > 0 && (
                    <div>
                      <span className="inline-block w-3 h-3 bg-red-100 rounded mr-1"></span>
                      Company holidays
                    </div>
                  )}
                </div>
              )}
              {eventsByDate.size > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {Array.from(eventsByDate.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(0, 5)
                    .map(([dateStr, events]) => (
                      <Popover key={dateStr}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start text-xs h-auto py-1">
                            <span className="font-medium">{formatDate(new Date(dateStr))}:</span>
                            <span className="ml-2">{events.length} event{events.length !== 1 ? 's' : ''}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">
                              {formatDate(new Date(dateStr))}
                            </h4>
                            <div className="space-y-2">
                              {events.filter(e => e.type === 'vacation').map((event, idx) => (
                                <div key={`vacation-${idx}`} className="text-sm p-2 bg-blue-50 rounded">
                                  <div className="font-medium text-blue-900">My Vacation</div>
                                  {typeof event.metadata === 'object' && 'notes' in event.metadata && event.metadata.notes && (
                                    <div className="text-xs text-blue-700">{event.metadata.notes}</div>
                                  )}
                                </div>
                              ))}
                              {events.filter(e => e.type === 'ceremony').map((event, idx) => (
                                <div key={`ceremony-${idx}`} className="text-sm p-2 bg-green-50 rounded">
                                  <div className="font-medium text-green-900">{event.title}</div>
                                  {event.startTime && (
                                    <div className="text-xs text-green-700">Time: {event.startTime}</div>
                                  )}
                                  {typeof event.metadata === 'object' && 'location' in event.metadata && event.metadata.location && (
                                    <div className="text-xs text-green-700">Location: {event.metadata.location}</div>
                                  )}
                                </div>
                              ))}
                              {events.filter(e => e.type === 'holiday').map((event, idx) => (
                                <div key={`holiday-${idx}`} className="text-sm p-2 bg-red-50 rounded">
                                  <div className="font-medium text-red-900">{event.title}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                </div>
              )}
            </div>
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
            {vacations && Array.isArray(vacations) ? `${vacations.length} vacation day${vacations.length !== 1 ? 's' : ''} found` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : vacations && Array.isArray(vacations) && vacations.length > 0 ? (
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
  ) as any;
}

