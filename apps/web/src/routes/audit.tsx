import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-600">View system activity and changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Audit Trail</CardTitle>
          <CardDescription>
            This page will show audit log functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Audit log viewer coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
