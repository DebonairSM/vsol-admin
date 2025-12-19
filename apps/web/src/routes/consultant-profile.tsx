import { useParams, Link } from 'react-router-dom';
import { useConsultantProfile } from '@/hooks/use-consultant-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';

export default function ConsultantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const consultantId = parseInt(id!);
  
  const { data: consultant, isLoading, error } = useConsultantProfile(consultantId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading consultant...</div>
      </div>
    );
  }

  if (error || !consultant) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-red-600">Consultant not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <Link to="/consultants">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{consultant.name}</h1>
              <p className="mt-2 text-sm text-gray-600">
                Consultant Profile
              </p>
            </div>
          </div>
        </div>
        <Link to={`/consultants/${consultantId}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Consultant details and information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <p className="text-sm text-gray-900">{consultant.name}</p>
            </div>
            {consultant.email && (
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{consultant.email}</p>
              </div>
            )}
            {consultant.phone && (
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{consultant.phone}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">Hourly Rate</label>
              <p className="text-sm text-gray-900">${consultant.hourlyRate?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
