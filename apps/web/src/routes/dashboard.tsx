import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useCycles } from '@/hooks/use-cycles';
import { useVacationCalendar, useVacationBalances } from '@/hooks/use-vacations';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import { useCeremonyOccurrences } from '@/hooks/use-sprint-ceremonies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlurredValue } from '@/components/ui/blurred-value';
import { Calendar as DayPickerCalendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Calendar as CalendarIcon, DollarSign, Users, FileText, CalendarCheck, Sparkles, Plane, Clock } from 'lucide-react';
import type { VacationCalendarEvent, CalendarEventOccurrence } from '@vsol-admin/shared';
import { CreateCeremonyDialog } from '@/components/calendar/create-ceremony-dialog';

export default function DashboardPage() {
  const { data: cycles, isLoading } = useCycles();
  
  // Vacation calendar state
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const monthStart = useMemo(() => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    return date.toISOString().split('T')[0];
  }, [selectedMonth]);
  
  const monthEnd = useMemo(() => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    return date.toISOString().split('T')[0];
  }, [selectedMonth]);
  
  const { data: vacationEvents } = useVacationCalendar(monthStart, monthEnd);
  const { data: vacationBalances } = useVacationBalances();
  const { data: calendarEvents } = useCalendarEvents(selectedMonth);
  
  // Get upcoming ceremonies (next 30 days)
  const upcomingCeremoniesStart = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);
  
  const upcomingCeremoniesEnd = useMemo(() => {
    const today = new Date();
    const future = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days ahead
    return future.toISOString().split('T')[0];
  }, []);
  
  const { data: upcomingCeremonyOccurrences } = useCeremonyOccurrences(
    upcomingCeremoniesStart,
    upcomingCeremoniesEnd
  );
  
  // Group all calendar events by date and type
  const eventsByDate = useMemo(() => {
    if (!calendarEvents?.data) return new Map<string, CalendarEventOccurrence[]>();
    
    const map = new Map<string, CalendarEventOccurrence[]>();
    calendarEvents.data.forEach((event: CalendarEventOccurrence) => {
      const dateStr = event.date.toISOString().split('T')[0];
      const existing = map.get(dateStr) || [];
      map.set(dateStr, [...existing, event]);
    });
    return map;
  }, [calendarEvents]);
  
  // Get dates with events for calendar modifiers
  const vacationDates = useMemo(() => {
    if (!calendarEvents?.data) return [];
    return calendarEvents.data
      .filter(e => e.type === 'vacation')
      .map(e => {
        const d = new Date(e.date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      });
  }, [calendarEvents]);

  const ceremonyDates = useMemo(() => {
    if (!calendarEvents?.data) return [];
    return calendarEvents.data
      .filter(e => e.type === 'ceremony')
      .map(e => {
        const d = new Date(e.date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      });
  }, [calendarEvents]);

  const holidayDates = useMemo(() => {
    if (!calendarEvents?.data) return [];
    return calendarEvents.data
      .filter(e => e.type === 'holiday')
      .map(e => {
        const d = new Date(e.date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      });
  }, [calendarEvents]);

  // Group vacation events by date (for existing popover functionality)
  const vacationsByDate = useMemo(() => {
    if (!vacationEvents) return new Map<string, VacationCalendarEvent[]>();
    
    const map = new Map<string, VacationCalendarEvent[]>();
    vacationEvents.forEach((event: VacationCalendarEvent) => {
      const existing = map.get(event.date) || [];
      map.set(event.date, [...existing, event]);
    });
    return map;
  }, [vacationEvents]);
  
  // Get upcoming vacations (next 30 days)
  const upcomingVacations = useMemo(() => {
    if (!vacationEvents) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    return vacationEvents
      .filter((event: VacationCalendarEvent) => {
        const eventDate = new Date(event.date);
        return eventDate >= today && eventDate <= thirtyDaysLater;
      })
      .sort((a: VacationCalendarEvent, b: VacationCalendarEvent) => 
        a.date.localeCompare(b.date)
      )
      .slice(0, 10);
  }, [vacationEvents]);
  
  // Get consultants with low vacation balance
  const lowBalanceConsultants = useMemo(() => {
    if (!vacationBalances) return [];
    return vacationBalances
      .filter((balance: any) => balance.daysRemaining < 5 && balance.daysRemaining > 0)
      .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);
  }, [vacationBalances]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  const latestCycle = cycles?.[0]; // Cycles are sorted by createdAt desc
  const currentYear = new Date().getFullYear();
  
  // Calculate total bonus for current year
  // Extract year from monthLabel (e.g., "January 2024") or use createdAt year as fallback
  const yearlyBonusTotal = cycles?.reduce((sum, cycle) => {
    let cycleYear: number | null = null;
    
    // Try to extract year from monthLabel (format: "Month YYYY")
    const yearMatch = cycle.monthLabel.match(/\b(\d{4})\b/);
    if (yearMatch) {
      cycleYear = parseInt(yearMatch[1], 10);
    } else {
      // Fallback to createdAt year
      cycleYear = new Date(cycle.createdAt).getFullYear();
    }
    
    if (cycleYear === currentYear && cycle.omnigoBonus) {
      return sum + cycle.omnigoBonus;
    }
    return sum;
  }, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Portal - Golden Sheet Management</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <a
              href="https://calendly.com/vsol/meeting-with-bandeira"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CalendarCheck className="mr-2 h-4 w-4" />
              Schedule Meeting
            </a>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/cycles/new">
              <Plus className="mr-2 h-4 w-4" />
              New Cycle
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cycles</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cycles?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Cycle</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestCycle?.monthLabel || 'None'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Work Hours</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestCycle?.globalWorkHours || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Omnigo Bonus</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <BlurredValue>{formatCurrency(yearlyBonusTotal)}</BlurredValue>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Total paid in {currentYear}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cycles */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Payroll Cycles</CardTitle>
          <CardDescription>
            Click on a cycle to view the Golden Sheet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cycles && cycles.length > 0 ? (
            <div className="space-y-3">
              {cycles.slice(0, 5).map((cycle: any, index: number) => {
                const isLatest = index === 0;
                return (
                  <Link
                    key={cycle.id}
                    to={`/cycles/${cycle.id}`}
                    className={`
                      relative flex items-center justify-between p-4 rounded-lg transition-all duration-200
                      ${isLatest 
                        ? 'border-2 border-blue-500/30 bg-gradient-to-r from-blue-50/50 to-transparent shadow-md hover:shadow-lg hover:border-blue-500/50' 
                        : 'border rounded-lg hover:bg-gray-50 hover:border-gray-300'
                      }
                    `}
                  >
                    {isLatest && (
                      <div className="absolute -top-2 -right-2">
                        <Badge 
                          variant="default" 
                          className="bg-blue-600 text-white shadow-sm flex items-center gap-1 px-2 py-0.5"
                        >
                          <Sparkles className="h-3 w-3" />
                          Latest
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isLatest && (
                        <div className="w-1 h-12 bg-gradient-to-b from-blue-500 to-blue-400 rounded-full flex-shrink-0" />
                      )}
                      <div className={`${isLatest ? 'flex-1' : ''} min-w-0`}>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium text-sm sm:text-base truncate ${isLatest ? 'text-blue-900' : 'text-gray-900'}`}>
                            {cycle.monthLabel}
                          </h3>
                        </div>
                        <p className={`text-xs sm:text-sm ${isLatest ? 'text-blue-700' : 'text-gray-600'}`}>
                          Created {formatDate(cycle.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-medium text-sm sm:text-base ${isLatest ? 'text-blue-900' : 'text-gray-900'}`}>
                        {cycle.globalWorkHours} hours
                      </p>
                      <p className={`text-xs sm:text-sm ${isLatest ? 'text-blue-700' : 'text-gray-600'}`}>
                        {cycle.omnigoBonus ? <BlurredValue>{formatCurrency(cycle.omnigoBonus)}</BlurredValue> : 'No bonus'}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No payroll cycles found</p>
              <p className="text-sm">Create your first cycle to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Vacation Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>
                  View vacations, ceremonies, and holidays
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <CreateCeremonyDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Ceremony
                    </Button>
                  }
                />
                <Button variant="outline" size="sm" asChild>
                  <Link to="/vacations">
                    <Plane className="mr-2 h-4 w-4" />
                    Vacations
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <DayPickerCalendar
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
                      Days with vacations
                    </div>
                  )}
                  {ceremonyDates.length > 0 && (
                    <div>
                      <span className="inline-block w-3 h-3 bg-green-100 rounded mr-1"></span>
                      Days with ceremonies
                    </div>
                  )}
                  {holidayDates.length > 0 && (
                    <div>
                      <span className="inline-block w-3 h-3 bg-red-100 rounded mr-1"></span>
                      Holidays
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
                                  <div className="font-medium text-blue-900">Vacation: {typeof event.metadata === 'object' && 'consultantName' in event.metadata ? event.metadata.consultantName : 'Unknown'}</div>
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
        
        <div className="space-y-6">
          {/* Upcoming Vacations */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Vacations</CardTitle>
              <CardDescription>Next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingVacations && upcomingVacations.length > 0 ? (
                <div className="space-y-2">
                  {upcomingVacations.map((event: VacationCalendarEvent, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">{event.consultantName}</div>
                        <div className="text-xs text-gray-600">{formatDate(new Date(event.date))}</div>
                      </div>
                      {event.notes && (
                        <div className="text-xs text-gray-500 max-w-xs truncate">{event.notes}</div>
                      )}
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
          
          {/* Upcoming Ceremonies */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Ceremonies</CardTitle>
              <CardDescription>Next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingCeremonyOccurrences && Array.isArray(upcomingCeremonyOccurrences) && upcomingCeremonyOccurrences.length > 0 ? (
                <div className="space-y-2">
                  {upcomingCeremonyOccurrences
                    .sort((a: any, b: any) => {
                      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
                      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
                      return dateA.getTime() - dateB.getTime();
                    })
                    .slice(0, 10)
                    .map((occurrence: any, idx: number) => {
                      const occurrenceDate = occurrence.date instanceof Date 
                        ? occurrence.date
                        : new Date(occurrence.date);
                      const ceremony = occurrence.ceremony || {};
                      return (
                        <div key={`ceremony-${occurrence.ceremonyId}-${idx}`} className="flex items-start justify-between p-2 border rounded">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-green-900">{ceremony.title || 'Ceremony'}</div>
                            <div className="text-xs text-gray-600 mt-1">{formatDate(occurrenceDate)}</div>
                            {ceremony.startTime && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {ceremony.startTime}
                                {ceremony.durationMinutes && ` (${ceremony.durationMinutes} min)`}
                              </div>
                            )}
                            {ceremony.location && (
                              <div className="text-xs text-gray-500 mt-1">{ceremony.location}</div>
                            )}
                          </div>
                          {ceremony.ceremonyType && (
                            <Badge variant="outline" className="ml-2">
                              {ceremony.ceremonyType}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No upcoming ceremonies
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Low Balance Alert */}
          {lowBalanceConsultants && lowBalanceConsultants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Low Vacation Balance</CardTitle>
                <CardDescription>Consultants with less than 5 days remaining</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowBalanceConsultants.map((balance: any) => (
                    <div key={balance.consultantId} className="flex items-center justify-between p-2 border rounded">
                      <Link
                        to={`/consultants/${balance.consultantId}`}
                        className="font-medium text-sm text-blue-600 hover:underline"
                      >
                        {balance.consultantName}
                      </Link>
                      <Badge variant="destructive">
                        {balance.daysRemaining} remaining
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
