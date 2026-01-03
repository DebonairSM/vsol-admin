import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useClientInvoice, useUpdateInvoiceStatus, useDeleteClientInvoice } from '@/hooks/use-client-invoices';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Trash2, Download, Eye } from 'lucide-react';
import { ClientInvoiceStatus } from '@vsol-admin/shared';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

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
  const navigate = useNavigate();
  const invoiceId = id ? parseInt(id) : 0;
  const { data: invoice, isLoading, refetch: refetchInvoice } = useClientInvoice(invoiceId);
  const updateStatusMutation = useUpdateInvoiceStatus();
  const deleteInvoiceMutation = useDeleteClientInvoice();

  const handleMarkAsSent = async () => {
    if (!invoice) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: invoice.id,
        status: ClientInvoiceStatus.SENT
      });
      // Refetch invoice to get updated status
      await refetchInvoice();
      toast.success('Invoice marked as sent and PDF attached to email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update invoice status');
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    try {
      await deleteInvoiceMutation.mutateAsync(invoice.id);
      toast.success('Invoice deleted successfully');
      navigate('/client-invoices');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete invoice');
    }
  };

  const handlePreviewPDF = async () => {
    if (!invoice) return;
    try {
      const blob = await apiClient.getClientInvoicePDF(invoice.id, true);
      
      // Verify it's actually a PDF
      if (blob.size === 0) {
        throw new Error('Invalid PDF response from server');
      }

      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Note: We don't revoke the URL immediately since it's opened in a new tab
      // The browser will clean it up when the tab is closed
    } catch (error: any) {
      console.error('PDF preview error:', error);
      toast.error(error.message || 'Failed to preview PDF. Please try downloading instead.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      const blob = await apiClient.getClientInvoicePDF(invoice.id, false);
      
      // Verify it's actually a PDF
      if (blob.size === 0) {
        throw new Error('Invalid PDF response from server');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast.error(error.message || 'Failed to download PDF');
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
              <Button
                onClick={handlePreviewPDF}
                variant="default"
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview PDF
              </Button>
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              {invoice.status === 'DRAFT' && (
                <>
                  <Button
                    onClick={handleMarkAsSent}
                    disabled={updateStatusMutation.isPending}
                    className="w-full"
                  >
                    {updateStatusMutation.isPending ? 'Updating...' : 'Mark as Sent'}
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    PDF will be automatically attached to the email
                  </p>
                </>
              )}
              <Link to={`/cycles/${invoice.cycleId}`} className="block">
                <Button variant="outline" className="w-full">
                  View Cycle
                </Button>
              </Link>
              {invoice.status === 'DRAFT' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Invoice
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Invoice #{invoice.invoiceNumber}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this invoice? This action cannot be undone.
                        You can recreate the invoice from the cycle page if needed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteInvoiceMutation.isPending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {deleteInvoiceMutation.isPending ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

