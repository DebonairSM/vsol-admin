import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useClientInvoice, useUpdateInvoiceStatus } from '@/hooks/use-client-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';

function getStatusColor(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800';
    case 'SENT':
      return 'bg-blue-100 text-blue-800';
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800';
    case 'PAID':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function ClientInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const invoiceId = id ? parseInt(id) : 0;
  const { data: invoice, isLoading } = useClientInvoice(invoiceId);
  const updateStatusMutation = useUpdateInvoiceStatus();

  const handleMarkAsSent = async () => {
    if (!invoice) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: invoice.id,
        status: 'SENT'
      });
      toast.success('Invoice marked as sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update invoice status');
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-6">Invoice not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/client-invoices" className="flex items-center text-gray-600 hover:text-gray-900 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Invoices
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Invoice #{invoice.invoiceNumber}
          </h1>
        </div>
        <Badge className={getStatusColor(invoice.status)}>
          {invoice.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Invoice Date</p>
                  <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Due Date</p>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Client</p>
                  <p className="font-medium">{invoice.client?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cycle</p>
                  <Link 
                    to={`/cycles/${invoice.cycleId}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {invoice.cycle?.monthLabel || 'N/A'}
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Line Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lineItems?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.serviceName}</TableCell>
                        <TableCell className="text-sm text-gray-600">{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatCurrency(invoice.tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(invoice.total)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2">
                      <span>Amount Due:</span>
                      <span>{formatCurrency(invoice.amountDue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.status === 'DRAFT' && (
                <Button
                  onClick={handleMarkAsSent}
                  disabled={updateStatusMutation.isPending}
                  className="w-full"
                >
                  {updateStatusMutation.isPending ? 'Updating...' : 'Mark as Sent'}
                </Button>
              )}
              <Link to={`/cycles/${invoice.cycleId}`} className="block">
                <Button variant="outline" className="w-full">
                  View Cycle
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

