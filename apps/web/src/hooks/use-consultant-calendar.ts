import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useConsultantVacationCalendar } from './use-vacations';
import type { CalendarEventOccurrence, VacationCalendarEvent, Holiday } from '@vsol-admin/shared';

export function useConsultantCalendarEvents(month: Date) {
  const year = month.getFullYear();
  const monthNum = month.getMonth();
  
  // Calculate start and end dates for the month
  const monthStart = new Date(year, monthNum, 1);
  const monthEnd = new Date(year, monthNum + 1, 0);
  
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const monthEndStr = monthEnd.toISOString().split('T')[0];

  // Fetch consultant's vacations
  const { data: vacationEvents, isLoading: vacationsLoading } = useConsultantVacationCalendar(monthStartStr, monthEndStr);
  
  // Fetch all ceremony occurrences (read-only for consultants)
  const { data: ceremonyOccurrences, isLoading: ceremoniesLoading } = useQuery({
    queryKey: ['consultant', 'ceremony-occurrences', monthStartStr, monthEndStr],
    queryFn: () => apiClient.getConsultantCeremonyOccurrences(monthStartStr, monthEndStr),
  });

  // Fetch all holidays (read-only for consultants)
  const { data: holidays, isLoading: holidaysLoading } = useQuery({
    queryKey: ['consultant', 'holidays', year],
    queryFn: () => apiClient.getConsultantHolidays(year),
  });

  const isLoading = vacationsLoading || ceremoniesLoading || holidaysLoading;

  // Combine and transform into unified calendar events
  const events: CalendarEventOccurrence[] = [];

  // Add vacation events
  if (Array.isArray(vacationEvents)) {
    vacationEvents.forEach((event: VacationCalendarEvent) => {
      events.push({
        id: `vacation-${event.date}`,
        type: 'vacation',
        title: 'My Vacation',
        date: new Date(event.date),
        color: 'blue',
        metadata: event,
      });
    });
  }

  // Add ceremony occurrences (already expanded from API)
  if (Array.isArray(ceremonyOccurrences)) {
    ceremonyOccurrences.forEach((occurrence: any) => {
      const occurrenceDate = occurrence.date instanceof Date 
        ? occurrence.date
        : new Date(occurrence.date);
      const dateStr = occurrenceDate.toISOString().split('T')[0];
      events.push({
        id: `ceremony-${occurrence.ceremonyId}-${dateStr}`,
        type: 'ceremony',
        title: occurrence.ceremony?.title || 'Ceremony',
        date: occurrenceDate,
        startTime: occurrence.ceremony?.startTime || undefined,
        durationMinutes: occurrence.ceremony?.durationMinutes || undefined,
        color: 'green',
        metadata: occurrence.ceremony,
      });
    });
  }

  // Add holidays
  if (Array.isArray(holidays)) {
    holidays.forEach((holiday: Holiday) => {
      const holidayDate = new Date(holiday.date);
      // Use UTC methods to avoid timezone shifts
      const holidayYear = holidayDate.getUTCFullYear();
      const holidayMonth = holidayDate.getUTCMonth();
      const holidayDay = holidayDate.getUTCDate();
      // Create normalized date in local timezone
      const normalizedDate = new Date(holidayYear, holidayMonth, holidayDay);
      // Only include holidays in the current month
      if (holidayMonth === monthNum && holidayYear === year) {
        events.push({
          id: `holiday-${holiday.id}`,
          type: 'holiday',
          title: holiday.name,
          date: normalizedDate,
          color: 'red',
          metadata: holiday,
        });
      }
    });
  }

  // Sort by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    data: events,
    isLoading,
  };
}

