import { useParams, useNavigate } from 'react-router-dom';
import { useCycle, useCycleSummary, useUpdateLineItem, useUpdateCycle, useDeleteCycle } from '@/hooks/use-cycles';
import { useBonusWorkflow } from '@/hooks/use-bonus-workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import BonusInfoCell from '@/components/bonus-info-cell';
import WorkflowTracker from '@/components/workflow-tracker';
import BonusWorkflowSection from '@/components/bonus-workflow-section';

export default function GoldenSheetPage() {
  const { id } = useParams<{ id: string }>();
  const cycleId = parseInt(id!);
  const navigate = useNavigate();
  
  const { data: cycle, isLoading: cycleLoading } = useCycle(cycleId);
  const { data: summary, isLoading: summaryLoading } = useCycleSummary(cycleId);
  const { data: bonusWorkflow } = useBonusWorkflow(cycleId);
  const updateLineItem = useUpdateLineItem();
  const updateCycle = useUpdateCycle();
  const deleteCycle = useDeleteCycle();

  const [editingCell, setEditingCell] = useState<{ lineId: number; field: string } | null>(null);
  const [editingCycleField, setEditingCycleField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (cycleLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading Golden Sheet...</div>
      </div>
    );
  }

  if (!cycle || !summary) {
    return (
      <div className="text-center py-12">
        <div className="text-lg text-red-600">Cycle not found</div>
      </div>
    );
  }

  const handleCellEdit = (lineId: number, field: string, currentValue: any) => {
    setEditingCell({ lineId, field });
    setEditValue(currentValue?.toString() || '');
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    try {
      let value: any = editValue;
      
      // Convert value based on field type
      if (['adjustmentValue', 'workHours', 'additionalPaidAmount'].includes(editingCell.field)) {
        value = editValue ? parseFloat(editValue) : null;
      } else if (editingCell.field === 'invoiceSent') {
        value = editValue === 'true';
      } else if (editingCell.field === 'additionalPaidDate') {
        value = editValue ? new Date(editValue).toISOString() : null;
      }

      await updateLineItem.mutateAsync({
        cycleId,
        lineId: editingCell.lineId,
        data: { [editingCell.field]: value }
      });

      setEditingCell(null);
    } catch (error) {
      console.error('Failed to update line item:', error);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleCycleFieldEdit = (field: string, currentValue: any) => {
    setEditingCycleField(field);
    setEditValue(currentValue?.toString() || '');
  };

  const handleCycleFieldSave = async () => {
    if (!editingCycleField) return;

    try {
      const value = editValue ? parseFloat(editValue) : null;

      await updateCycle.mutateAsync({
        id: cycleId,
        data: { [editingCycleField]: value }
      });

      setEditingCycleField(null);
      setEditValue('');
      toast.success('Cycle updated successfully');
    } catch (error) {
      console.error('Failed to update cycle:', error);
      toast.error('Failed to update cycle');
    }
  };

  const handleCycleFieldCancel = () => {
    setEditingCycleField(null);
    setEditValue('');
  };

  const handleWorkflowDateUpdate = async (fieldName: string, date: string | null) => {
    try {
      await updateCycle.mutateAsync({
        id: cycleId,
        data: { [fieldName]: date }
      });
    } catch (error) {
      console.error('Failed to update workflow date:', error);
      throw error;
    }
  };

  const handleDeleteCycle = async () => {
    try {
      await deleteCycle.mutateAsync(cycleId);
      toast.success('Cycle archived successfully');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive cycle');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Golden Sheet</h1>
          <p className="text-gray-600">{cycle.monthLabel} Payroll Cycle</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Cycle
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely certain?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p className="font-semibold text-red-600">
                  This action cannot be undone. Once archived, this payroll cycle will be permanently removed from the active cycles list.
                </p>
                <p>
                  This will archive the cycle <strong>{cycle.monthLabel}</strong> and all associated line items, invoices, and payments. The data will be preserved but hidden from normal operations.
                </p>
                <p className="text-sm text-muted-foreground">
                  If you proceed, you will need to contact a system administrator to restore this cycle in the future.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCycle}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Archive This Cycle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Workflow Tracker */}
      <WorkflowTracker 
        cycle={cycle}
        onUpdateWorkflowDate={handleWorkflowDateUpdate}
      />

      {/* Bonus Workflow Section */}
      <BonusWorkflowSection cycleId={cycleId} />

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Consultant Line Items</CardTitle>
          <CardDescription>
            Click on cells to edit values. Changes are saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor Info</TableHead>
                  <TableHead>Sent Invoice</TableHead>
                  <TableHead>Adjustment Value</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Bonus Information</TableHead>
                  <TableHead>Additional Paid Amount</TableHead>
                  <TableHead>Additional Paid Date</TableHead>
                  <TableHead>Rate/Hour</TableHead>
                  <TableHead>Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycle.lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{line.consultant.name}</div>
                        {line.consultant.companyTradeName && (
                          <div className="text-xs text-gray-600">
                            {line.consultant.companyTradeName}
                          </div>
                        )}
                        {line.consultant.payoneerID && (
                          <div className="text-xs text-blue-600">
                            Payoneer: {line.consultant.payoneerID}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Checkbox
                        checked={line.invoiceSent || false}
                        onCheckedChange={(checked) => {
                          updateLineItem.mutate({
                            cycleId,
                            lineId: line.id,
                            data: { invoiceSent: checked }
                          });
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      {editingCell?.lineId === line.id && editingCell?.field === 'adjustmentValue' ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave();
                              if (e.key === 'Escape') handleCellCancel();
                            }}
                            autoFocus
                          />
                          <Button size="sm" onClick={handleCellSave}>Save</Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                          onClick={() => handleCellEdit(line.id, 'adjustmentValue', line.adjustmentValue)}
                        >
                          {line.adjustmentValue ? formatCurrency(line.adjustmentValue) : '-'}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingCell?.lineId === line.id && editingCell?.field === 'comments' ? (
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-32"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave();
                              if (e.key === 'Escape') handleCellCancel();
                            }}
                            autoFocus
                          />
                          <Button size="sm" onClick={handleCellSave}>Save</Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                          onClick={() => handleCellEdit(line.id, 'comments', line.comments)}
                        >
                          {line.comments || '-'}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <BonusInfoCell
                        lineItem={line}
                        cycleId={cycleId}
                        cycleSendReceiptDate={cycle.sendReceiptDate}
                        bonusRecipientConsultantId={bonusWorkflow?.bonusRecipientConsultantId || null}
                        onUpdate={(lineId, data) => updateLineItem.mutateAsync({ cycleId, lineId, data })}
                      />
                    </TableCell>

                    {/* Additional Paid Amount */}
                    <TableCell>
                      {editingCell?.lineId === line.id && editingCell?.field === 'additionalPaidAmount' ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave();
                              if (e.key === 'Escape') handleCellCancel();
                            }}
                            autoFocus
                          />
                          <Button size="sm" onClick={handleCellSave}>Save</Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                          onClick={() => handleCellEdit(line.id, 'additionalPaidAmount', line.additionalPaidAmount)}
                        >
                          {line.additionalPaidAmount ? formatCurrency(line.additionalPaidAmount) : '-'}
                        </div>
                      )}
                    </TableCell>

                    {/* Additional Paid Date */}
                    <TableCell>
                      {editingCell?.lineId === line.id && editingCell?.field === 'additionalPaidDate' ? (
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-32"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave();
                              if (e.key === 'Escape') handleCellCancel();
                            }}
                            autoFocus
                          />
                          <Button size="sm" onClick={handleCellSave}>Save</Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                          onClick={() => handleCellEdit(line.id, 'additionalPaidDate', line.additionalPaidDate ? new Date(line.additionalPaidDate).toISOString().split('T')[0] : '')}
                        >
                          {line.additionalPaidDate ? formatDate(line.additionalPaidDate) : '-'}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="font-mono">
                      {formatCurrency(line.ratePerHour)}
                    </TableCell>

                    <TableCell className="font-mono font-bold">
                      {formatCurrency(line.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Footer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Hourly Value:</span>
              <span className="font-mono">{formatCurrency(summary.totalHourlyValue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Global Work Hours:</span>
              <span className="font-mono">{cycle.globalWorkHours || 0}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>USD Total:</span>
              <span className="font-mono">{formatCurrency(summary.usdTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adjustments</CardTitle>
            <CardDescription>Click on values to edit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Omnigo Bonus:</span>
              {editingCycleField === 'omnigoBonus' ? (
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 h-8 text-right font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCycleFieldSave();
                      if (e.key === 'Escape') handleCycleFieldCancel();
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCycleFieldSave}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={handleCycleFieldCancel}>Cancel</Button>
                </div>
              ) : (
                <span 
                  className="font-mono cursor-pointer hover:bg-gray-100 p-1 rounded"
                  onClick={() => handleCycleFieldEdit('omnigoBonus', cycle.omnigoBonus)}
                >
                  {formatCurrency(cycle.omnigoBonus || 0)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span>Pagamento PIX:</span>
              {editingCycleField === 'pagamentoPIX' ? (
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 h-8 text-right font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCycleFieldSave();
                      if (e.key === 'Escape') handleCycleFieldCancel();
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCycleFieldSave}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={handleCycleFieldCancel}>Cancel</Button>
                </div>
              ) : (
                <span 
                  className="font-mono cursor-pointer hover:bg-gray-100 p-1 rounded"
                  onClick={() => handleCycleFieldEdit('pagamentoPIX', cycle.pagamentoPIX)}
                >
                  {formatCurrency(cycle.pagamentoPIX || 0)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span>Pagamento Inter:</span>
              {editingCycleField === 'pagamentoInter' ? (
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 h-8 text-right font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCycleFieldSave();
                      if (e.key === 'Escape') handleCycleFieldCancel();
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCycleFieldSave}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={handleCycleFieldCancel}>Cancel</Button>
                </div>
              ) : (
                <span 
                  className="font-mono cursor-pointer hover:bg-gray-100 p-1 rounded"
                  onClick={() => handleCycleFieldEdit('pagamentoInter', cycle.pagamentoInter)}
                >
                  {formatCurrency(cycle.pagamentoInter || 0)}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span>Equipments USD:</span>
              {editingCycleField === 'equipmentsUSD' ? (
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 h-8 text-right font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCycleFieldSave();
                      if (e.key === 'Escape') handleCycleFieldCancel();
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCycleFieldSave}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={handleCycleFieldCancel}>Cancel</Button>
                </div>
              ) : (
                <span 
                  className="font-mono cursor-pointer hover:bg-gray-100 p-1 rounded"
                  onClick={() => handleCycleFieldEdit('equipmentsUSD', cycle.equipmentsUSD)}
                >
                  {formatCurrency(cycle.equipmentsUSD || 0)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p><strong>Line Items:</strong> {summary.lineCount}</p>
              <p><strong>Created:</strong> {formatDate(cycle.createdAt)}</p>
              <p><strong>Updated:</strong> {formatDate(cycle.updatedAt)}</p>
            </div>
            {summary.anomalies.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-600 mb-2">Anomalies:</p>
                <ul className="text-xs text-red-600 space-y-1">
                  {summary.anomalies.map((anomaly: string, index: number) => (
                    <li key={index}>• {anomaly}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
