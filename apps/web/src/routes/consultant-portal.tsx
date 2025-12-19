import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useConsultantVacationBalance, useConsultantVacationCalendar } from '@/hooks/use-vacations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { FileText, Calendar, CheckCircle, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';

export default function ConsultantPortalPage() {
  const { data: cycles, isLoading, error: cyclesError } = useQuery({
    queryKey: ['consultant-cycles'],
    queryFn: () => apiClient.getConsultantCycles(),
    retry: 1,
    onError: (error) => {
      console.error('Failed to load consultant cycles:', error);
    },
  });

  const { data: profile, error: profileError } = useQuery({
    queryKey: ['consultant-profile'],
    queryFn: () => apiClient.getConsultantProfile(),
    retry: 1,
    onError: (error) => {
      console.error('Failed to load consultant profile:', error);
    },
  });

  const { data: vacationBalance } = useConsultantVacationBalance();
  
  const [selectedMonth] = useState<Date>(new Date());
  const monthStart = useMemo(() => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    return date.toISOString().split('T')[0];
  }, [selectedMonth]);
  
  const monthEnd = useMemo(() => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
    return date.toISOString().split('T')[0];
  }, [selectedMonth]);
  
  const { data: upcomingVacations } = useConsultantVacationCalendar(monthStart, monthEnd);
  
  // Get next 5 upcoming vacations
  const nextVacations = useMemo(() => {
    if (!upcomingVacations) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return upcomingVacations
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= today;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [upcomingVacations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Consultant Portal</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome, {profile?.name || 'Consultant'}
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
              <p className="text-2xl font-bold">{cycles?.length || 0}</p>
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
            {vacationBalance ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Days Remaining</span>
                  <Badge variant={vacationBalance.daysRemaining < 5 ? 'destructive' : 'default'}>
                    {vacationBalance.daysRemaining} / {vacationBalance.totalAllocated}
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
    </div>
  );
}

