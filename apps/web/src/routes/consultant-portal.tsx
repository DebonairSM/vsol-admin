import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, CheckCircle } from 'lucide-react';

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
      </div>
    </div>
  );
}

