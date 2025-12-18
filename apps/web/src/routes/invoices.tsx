import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInvoices, useDeleteInvoice } from '@/hooks/use-invoices';
import { useCycles } from '@/hooks/use-cycles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: number;
  cycleId: number;
  consultantId: number;
  hours?: number | null;
  rate?: number | null;
  amount?: number | null;
  sent?: boolean | null;
  approved?: boolean | null;
  sentDate?: Date | string | null;
  approvedDate?: Date | string | null;
  consultant?: {
    id: number;
    name: string;
  };
  cycle?: {
    id: number;
    monthLabel: string;
  };
}

export default function InvoicesPage() {
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; invoice?: Invoice }>({
    open: false
  });
  const { toast } = useToast();

  const cycleId = selectedCycleId ? parseInt(selectedCycleId) : undefined;
  const { data: invoices, isLoading, error } = useInvoices(cycleId);
  const { data: cycles } = useCycles();
  const deleteInvoice = useDeleteInvoice();

  const handleDelete = async () => {
    if (!deleteDialog.invoice) return;

    try {
      await deleteInvoice.mutateAsync(deleteDialog.invoice.id);
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
      setDeleteDialog({ open: false });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive',
      });
    }
  };

  const calculateAmount = (invoice: Invoice): number | null => {
    if (invoice.amount != null) {
      return invoice.amount;
    }
    if (invoice.hours != null && invoice.rate != null) {
      return invoice.hours * invoice.rate;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading invoices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm sm:text-base text-gray-600">Track invoice submissions and approvals</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Error loading invoices: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="text-sm sm:text-base text-gray-600">Track invoice submissions and approvals</p>
      </div>

      {/* Cycle Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Filter invoices by payroll cycle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
              <SelectTrigger>
                <SelectValue placeholder="All Cycles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Cycles</SelectItem>
                {cycles?.map((cycle: any) => (
                  <SelectItem key={cycle.id} value={cycle.id.toString()}>
                    {cycle.monthLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>
            View and manage consultant invoices, submission status, and approvals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">Invoice ID</TableHead>
                  <TableHead className="sticky left-0 z-10 bg-white min-w-[180px] text-xs md:text-sm">Consultant</TableHead>
                  <TableHead className="text-xs md:text-sm">Cycle</TableHead>
                  <TableHead className="text-xs md:text-sm">Hours</TableHead>
                  <TableHead className="text-xs md:text-sm">Rate</TableHead>
                  <TableHead className="text-xs md:text-sm">Amount</TableHead>
                  <TableHead className="text-xs md:text-sm">Sent</TableHead>
                  <TableHead className="text-xs md:text-sm">Approved</TableHead>
                  <TableHead className="text-xs md:text-sm">Sent Date</TableHead>
                  <TableHead className="text-xs md:text-sm">Approved Date</TableHead>
                  <TableHead className="text-right text-xs md:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!invoices || invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>No invoices found</p>
                      <p className="text-sm">Invoices will appear here once created</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice: Invoice) => {
                    const amount = calculateAmount(invoice);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-xs md:text-sm">#{invoice.id}</TableCell>
                        <TableCell className="font-medium sticky left-0 z-10 bg-white min-w-[180px] text-xs md:text-sm">
                          {invoice.consultant ? (
                            <Link
                              to={`/consultants/${invoice.consultant.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {invoice.consultant.name}
                            </Link>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {invoice.cycle ? (
                            <Link
                              to={`/cycles/${invoice.cycle.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {invoice.cycle.monthLabel}
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {invoice.hours != null ? invoice.hours.toFixed(2) : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs md:text-sm">
                          {invoice.rate != null ? formatCurrency(invoice.rate) : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs md:text-sm font-medium">
                          {amount != null ? formatCurrency(amount) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={invoice.sent ? 'default' : 'secondary'}
                            className={
                              invoice.sent
                                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                            }
                          >
                            {invoice.sent ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={invoice.approved ? 'default' : 'secondary'}
                            className={
                              invoice.approved
                                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                            }
                          >
                            {invoice.approved ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {invoice.sentDate ? formatDate(invoice.sentDate) : '-'}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm">
                          {invoice.approvedDate ? formatDate(invoice.approvedDate) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs sm:text-sm"
                              asChild
                            >
                              <Link to={`/invoices/${invoice.id}`}>
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                <span className="hidden sm:inline">View</span>
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs sm:text-sm"
                              asChild
                            >
                              <Link to={`/invoices/${invoice.id}/edit`}>
                                <Edit className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteDialog({ open: true, invoice })}
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, invoice: deleteDialog.invoice })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice #{deleteDialog.invoice?.id}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false })}
              disabled={deleteInvoice.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
