import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm sm:text-base text-gray-600">Track payments and transfers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Tracking</CardTitle>
          <CardDescription>
            This page will show payment tracking functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Payment tracking features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
