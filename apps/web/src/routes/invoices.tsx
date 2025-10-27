import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-600">Track invoice submissions and approvals</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
          <CardDescription>
            This page will show invoice tracking functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Invoice management features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
