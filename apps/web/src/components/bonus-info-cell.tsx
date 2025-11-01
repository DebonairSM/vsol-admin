import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Edit, DollarSign, Info } from 'lucide-react';

interface BonusInfoCellProps {
  lineItem: {
    id: number;
    consultantId: number;
    informedDate?: Date | string | null;
    bonusPaydate?: Date | string | null;
  };
  cycleId: number;
  cycleSendReceiptDate?: Date | string | null;
  bonusRecipientConsultantId?: number | null;
  onUpdate: (lineId: number, data: Record<string, any>) => Promise<void>;
}

export default function BonusInfoCell({ lineItem, cycleSendReceiptDate, bonusRecipientConsultantId, onUpdate }: BonusInfoCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    informedDate: lineItem.informedDate ? new Date(lineItem.informedDate).toISOString().split('T')[0] : '',
    bonusPaydate: lineItem.bonusPaydate ? new Date(lineItem.bonusPaydate).toISOString().split('T')[0] : '',
  });

  // Check if this consultant is the bonus recipient
  const isBonusRecipient = bonusRecipientConsultantId !== null && bonusRecipientConsultantId === lineItem.consultantId;

  const handleSave = async () => {
    try {
      const updatePayload: Record<string, any> = {};
      
      // Convert dates back to ISO strings or null
      if (editData.informedDate !== (lineItem.informedDate ? new Date(lineItem.informedDate).toISOString().split('T')[0] : '')) {
        updatePayload.informedDate = editData.informedDate ? new Date(editData.informedDate).toISOString() : null;
      }
      if (editData.bonusPaydate !== (lineItem.bonusPaydate ? new Date(lineItem.bonusPaydate).toISOString().split('T')[0] : '')) {
        updatePayload.bonusPaydate = editData.bonusPaydate ? new Date(editData.bonusPaydate).toISOString() : null;
      }

      // Only update if there are changes
      if (Object.keys(updatePayload).length > 0) {
        await onUpdate(lineItem.id, updatePayload);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update bonus info:', error);
    }
  };

  const handleCancel = () => {
    setEditData({
      informedDate: lineItem.informedDate ? new Date(lineItem.informedDate).toISOString().split('T')[0] : '',
      bonusPaydate: lineItem.bonusPaydate ? new Date(lineItem.bonusPaydate).toISOString().split('T')[0] : '',
    });
    setIsEditing(false);
  };

  const hasAnyBonusData = lineItem.informedDate || lineItem.bonusPaydate;

  const canEdit = isBonusRecipient || bonusRecipientConsultantId === null;

  return (
    <div className="min-w-[200px]">
      <Popover open={isEditing && canEdit} onOpenChange={(open) => canEdit && setIsEditing(open)}>
        <PopoverTrigger asChild>
          <div className={cn(
            "p-2 rounded border transition-colors",
            canEdit ? "cursor-pointer hover:bg-gray-50" : "cursor-not-allowed bg-gray-50 opacity-60"
          )}>
            {hasAnyBonusData ? (
              <div className="space-y-1 text-xs">
                {lineItem.informedDate && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    <Info className="w-3 h-3" />
                    <span>Bonus Announcement Date: {formatDate(lineItem.informedDate)}</span>
                  </div>
                )}
                {lineItem.bonusPaydate && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded">
                    <DollarSign className="w-3 h-3" />
                    <span>Pay: {formatDate(lineItem.bonusPaydate)}</span>
                  </div>
                )}
                <div className="flex justify-center mt-2">
                  <Edit className="w-3 h-3 text-gray-400" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-12 text-gray-400">
                <div className="text-center">
                  {!canEdit ? (
                    <>
                      <div className="text-xs text-gray-500">No bonus recipient</div>
                      <div className="text-[10px] text-gray-400">Select recipient in workflow</div>
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mx-auto mb-1" />
                      <div className="text-xs">Add bonus info</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Bonus Information</h4>
              <p className="text-sm text-gray-500">Edit bonus dates</p>
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="informedDate" className="text-xs">Bonus Announcement Date</Label>
                <Input
                  id="informedDate"
                  type="date"
                  value={editData.informedDate}
                  onChange={(e) => setEditData(prev => ({ ...prev, informedDate: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonusPaydate" className="text-xs">Bonus Pay Date</Label>
                <Input
                  id="bonusPaydate"
                  type="date"
                  value={editData.bonusPaydate}
                  onChange={(e) => setEditData(prev => ({ ...prev, bonusPaydate: e.target.value }))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
