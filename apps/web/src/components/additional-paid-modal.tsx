import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface AdditionalPaidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItem: {
    id: number;
    additionalPaidAmount?: number | null;
    additionalPaidDate?: Date | string | null;
    additionalPaidMethod?: 'PIX' | 'INTER' | 'OTHER' | null;
  };
  onUpdate: (lineId: number, data: Record<string, any>) => Promise<void>;
}

export default function AdditionalPaidModal({
  open,
  onOpenChange,
  lineItem,
  onUpdate,
}: AdditionalPaidModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [method, setMethod] = useState<'PIX' | 'INTER' | 'OTHER' | ''>('');

  // Initialize form with existing values when modal opens or lineItem changes
  useEffect(() => {
    if (open) {
      setAmount(
        lineItem.additionalPaidAmount !== null && lineItem.additionalPaidAmount !== undefined
          ? lineItem.additionalPaidAmount.toString()
          : ''
      );
      setDate(
        lineItem.additionalPaidDate
          ? new Date(lineItem.additionalPaidDate).toISOString().split('T')[0]
          : ''
      );
      setMethod(lineItem.additionalPaidMethod || '');
    }
  }, [open, lineItem]);

  const handleSave = async () => {
    try {
      const updatePayload: Record<string, any> = {};

      // Convert amount to number or null
      const amountValue = amount.trim() === '' ? null : parseFloat(amount);
      if (amountValue !== null && (isNaN(amountValue) || !isFinite(amountValue))) {
        // Invalid number - could show error toast here
        return;
      }
      if (
        amountValue !==
        (lineItem.additionalPaidAmount !== null && lineItem.additionalPaidAmount !== undefined
          ? lineItem.additionalPaidAmount
          : null)
      ) {
        updatePayload.additionalPaidAmount = amountValue;
      }

      // Convert date to ISO string or null
      const dateValue = date.trim() === '' ? null : new Date(date).toISOString();
      const currentDateValue = lineItem.additionalPaidDate
        ? new Date(lineItem.additionalPaidDate).toISOString().split('T')[0]
        : '';
      if (date !== currentDateValue) {
        updatePayload.additionalPaidDate = dateValue;
      }

      // Payment method
      const methodValue = method === '' ? null : (method as 'PIX' | 'INTER' | 'OTHER');
      if (methodValue !== (lineItem.additionalPaidMethod || null)) {
        updatePayload.additionalPaidMethod = methodValue;
      }

      // Only update if there are changes
      if (Object.keys(updatePayload).length > 0) {
        await onUpdate(lineItem.id, updatePayload);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update additional paid info:', error);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setAmount(
      lineItem.additionalPaidAmount !== null && lineItem.additionalPaidAmount !== undefined
        ? lineItem.additionalPaidAmount.toString()
        : ''
    );
    setDate(
      lineItem.additionalPaidDate
        ? new Date(lineItem.additionalPaidDate).toISOString().split('T')[0]
        : ''
    );
    setMethod(lineItem.additionalPaidMethod || '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Additional Payment Information</DialogTitle>
          <DialogDescription>
            Set the additional payment amount, date, and payment method for this line item.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="additional-paid-amount">Additional Paid Amount</Label>
            <Input
              id="additional-paid-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="additional-paid-date">Additional Paid Date</Label>
            <Input
              id="additional-paid-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="additional-paid-method">Payment Method</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as 'PIX' | 'INTER' | 'OTHER' | '')}>
              <SelectTrigger id="additional-paid-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="INTER">Inter</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

