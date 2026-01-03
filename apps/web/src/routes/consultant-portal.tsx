import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useConsultantVacationBalance, useConsultantVacationCalendar } from '@/hooks/use-vacations';
import { useConsultantCalendarEvents } from '@/hooks/use-consultant-calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { FileText, Calendar, CheckCircle, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import type { CalendarEventOccurrence } from '@vsol-admin/shared';

export default function ConsultantPortalPage() {
  const { data: cycles, isLoading, error: cyclesError } = useQuery({
    queryKey: ['consultant-cycles'],
    queryFn: () => apiClient.getConsultantCycles(),
    retry: 1,
  });

  const { data: profile } = useQuery({
    queryKey: ['consultant-profile'],
    queryFn: () => apiClient.getConsultantProfile(),
    retry: 1,
  });

  const { data: vacationBalance } = useConsultantVacationBalance();
  
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const monthStart = useMemo(() => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    return date.toISOString().split('T')[0];
  }, [selectedMonth]);
  
  const monthEnd = useMemo(() => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    return date.toISOString().split('T')[0];
  }, [selectedMonth]);
  
  const { data: upcomingVacations } = useConsultantVacationCalendar(monthStart, monthEnd);
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
  
  // Get next 5 upcoming vacations
  const nextVacations = useMemo(() => {
    if (!upcomingVacations || !Array.isArray(upcomingVacations)) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return upcomingVacations
      .filter((event: any) => {
        const eventDate = new Date(event.date);
        return eventDate >= today;
      })
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [upcomingVacations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Consultant Portal</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome, {(profile as any)?.name || 'Consultant'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Invoice
            </CardTitle>
            <CardDescription>
              Upload your monthly invoice for payroll processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="/consultant/invoices"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Go to Invoice Upload →
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Available Cycles
            </CardTitle>
            <CardDescription>
              Payroll cycles available for invoice upload
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : cyclesError ? (
              <p className="text-sm text-red-500">Unable to load cycles</p>
            ) : (
              <p className="text-2xl font-bold">{Array.isArray(cycles) ? cycles.length : 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              View and update your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="/consultant/profile"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View Profile →
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              My Vacations
            </CardTitle>
            <CardDescription>
              Manage your vacation days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vacationBalance && typeof vacationBalance === 'object' && vacationBalance !== null && 'daysRemaining' in vacationBalance ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Days Remaining</span>
                  <Badge variant={(vacationBalance as any).daysRemaining < 5 ? 'destructive' : 'default'}>
                    {(vacationBalance as any).daysRemaining} / {(vacationBalance as any).totalAllocated}
                  </Badge>
                </div>
                {nextVacations && nextVacations.length > 0 && (
                  <div className="text-xs text-gray-500 mt-2">
                    Next: {formatDate(new Date(nextVacations[0].date))}
                  </div>
                )}
                <Link
                  to="/consultant/vacations"
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm block mt-2"
                >
                  Manage Vacations →
                </Link>
              </div>
            ) : (
              <Link
                to="/consultant/vacations"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View Vacations →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>
                View your vacations, team ceremonies, and company holidays
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/consultant/vacations">
                <Plane className="mr-2 h-4 w-4" />
                Manage Vacations
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <CalendarComponent
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
                    Sprint ceremonies
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
    </div>
  );
}

