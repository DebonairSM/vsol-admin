import { useQuery } from '@tanstack/react-query';
import { useVacationCalendar } from './use-vacations';
import { useCeremonyOccurrences } from './use-sprint-ceremonies';
import { useHolidays } from './use-holidays';
import type { CalendarEventOccurrence, VacationCalendarEvent, Holiday } from '@vsol-admin/shared';

export function useCalendarEvents(month: Date) {
  const year = month.getFullYear();
  const monthNum = month.getMonth();
  
  // Calculate start and end dates for the month
  const monthStart = new Date(year, monthNum, 1);
  const monthEnd = new Date(year, monthNum + 1, 0);
  
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const monthEndStr = monthEnd.toISOString().split('T')[0];

  // Fetch all event types
  const { data: vacationEvents } = useVacationCalendar(monthStartStr, monthEndStr);
  const { data: ceremonyOccurrences } = useCeremonyOccurrences(monthStartStr, monthEndStr);
  const { data: holidays } = useHolidays(year);

  // Combine and transform into unified calendar events
  const events: CalendarEventOccurrence[] = [];

  // Add vacation events
  if (vacationEvents) {
    vacationEvents.forEach((event: VacationCalendarEvent) => {
      events.push({
        id: `vacation-${event.date}`,
        type: 'vacation',
        title: event.consultantName,
        date: new Date(event.date),
        color: 'blue',
        metadata: event,
      });
    });
  }

  // Add ceremony occurrences
  if (ceremonyOccurrences) {
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
  if (holidays) {
    holidays.forEach((holiday: Holiday) => {
      const holidayDate = new Date(holiday.date);
      // Only include holidays in the current month
      if (holidayDate.getMonth() === monthNum && holidayDate.getFullYear() === year) {
        events.push({
          id: `holiday-${holiday.id}`,
          type: 'holiday',
          title: holiday.name,
          date: holidayDate,
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
    isLoading: false, // We'll handle loading states in the component
  };
}

