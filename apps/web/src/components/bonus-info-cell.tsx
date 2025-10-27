import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency, formatDate, isSameDate, cn } from '@/lib/utils';
import { Edit, DollarSign, Calendar, Info } from 'lucide-react';

interface BonusInfoCellProps {
  lineItem: {
    id: number;
    bonusDate?: Date | string | null;
    informedDate?: Date | string | null;
    bonusPaydate?: Date | string | null;
    bonusAdvance?: number | null;
    advanceDate?: Date | string | null;
  };
  cycleId: number;
  cycleSendReceiptDate?: Date | string | null;
  onUpdate: (lineId: number, data: Record<string, any>) => Promise<void>;
}

export default function BonusInfoCell({ lineItem, cycleId, cycleSendReceiptDate, onUpdate }: BonusInfoCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    bonusDate: lineItem.bonusDate ? new Date(lineItem.bonusDate).toISOString().split('T')[0] : '',
    informedDate: lineItem.informedDate ? new Date(lineItem.informedDate).toISOString().split('T')[0] : '',
    bonusPaydate: lineItem.bonusPaydate ? new Date(lineItem.bonusPaydate).toISOString().split('T')[0] : '',
    bonusAdvance: lineItem.bonusAdvance?.toString() || '',
    advanceDate: lineItem.advanceDate ? new Date(lineItem.advanceDate).toISOString().split('T')[0] : '',
  });

  const isBonusDateHighlighted = isSameDate(lineItem.bonusDate, cycleSendReceiptDate);

  const handleSave = async () => {
    try {
      const updatePayload: Record<string, any> = {};
      
      // Convert dates back to ISO strings or null
      if (editData.bonusDate !== (lineItem.bonusDate ? new Date(lineItem.bonusDate).toISOString().split('T')[0] : '')) {
        updatePayload.bonusDate = editData.bonusDate ? new Date(editData.bonusDate).toISOString() : null;
      }
      if (editData.informedDate !== (lineItem.informedDate ? new Date(lineItem.informedDate).toISOString().split('T')[0] : '')) {
        updatePayload.informedDate = editData.informedDate ? new Date(editData.informedDate).toISOString() : null;
      }
      if (editData.bonusPaydate !== (lineItem.bonusPaydate ? new Date(lineItem.bonusPaydate).toISOString().split('T')[0] : '')) {
        updatePayload.bonusPaydate = editData.bonusPaydate ? new Date(editData.bonusPaydate).toISOString() : null;
      }
      if (editData.advanceDate !== (lineItem.advanceDate ? new Date(lineItem.advanceDate).toISOString().split('T')[0] : '')) {
        updatePayload.advanceDate = editData.advanceDate ? new Date(editData.advanceDate).toISOString() : null;
      }
      
      // Convert numeric value
      const newAdvance = editData.bonusAdvance ? parseFloat(editData.bonusAdvance) : null;
      if (newAdvance !== lineItem.bonusAdvance) {
        updatePayload.bonusAdvance = newAdvance;
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
      bonusDate: lineItem.bonusDate ? new Date(lineItem.bonusDate).toISOString().split('T')[0] : '',
      informedDate: lineItem.informedDate ? new Date(lineItem.informedDate).toISOString().split('T')[0] : '',
      bonusPaydate: lineItem.bonusPaydate ? new Date(lineItem.bonusPaydate).toISOString().split('T')[0] : '',
      bonusAdvance: lineItem.bonusAdvance?.toString() || '',
      advanceDate: lineItem.advanceDate ? new Date(lineItem.advanceDate).toISOString().split('T')[0] : '',
    });
    setIsEditing(false);
  };

  const hasAnyBonusData = lineItem.bonusDate || lineItem.informedDate || lineItem.bonusPaydate || 
                         lineItem.bonusAdvance || lineItem.advanceDate;

  return (
    <div className="min-w-[200px]">
      <Popover open={isEditing} onOpenChange={setIsEditing}>
        <PopoverTrigger asChild>
          <div className="cursor-pointer hover:bg-gray-50 p-2 rounded border transition-colors">
            {hasAnyBonusData ? (
              <div className="space-y-1 text-xs">
                {lineItem.bonusDate && (
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded",
                    isBonusDateHighlighted ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"
                  )}>
                    <Calendar className="w-3 h-3" />
                    <span>Bonus: {formatDate(lineItem.bonusDate)}</span>
                  </div>
                )}
                {lineItem.informedDate && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    <Info className="w-3 h-3" />
                    <span>Informed: {formatDate(lineItem.informedDate)}</span>
                  </div>
                )}
                {lineItem.bonusPaydate && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded">
                    <DollarSign className="w-3 h-3" />
                    <span>Pay: {formatDate(lineItem.bonusPaydate)}</span>
                  </div>
                )}
                {lineItem.bonusAdvance && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded">
                    <DollarSign className="w-3 h-3" />
                    <span>Advance: {formatCurrency(lineItem.bonusAdvance)}</span>
                  </div>
                )}
                {lineItem.advanceDate && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded">
                    <Calendar className="w-3 h-3" />
                    <span>Adv Date: {formatDate(lineItem.advanceDate)}</span>
                  </div>
                )}
                <div className="flex justify-center mt-2">
                  <Edit className="w-3 h-3 text-gray-400" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-12 text-gray-400">
                <div className="text-center">
                  <Edit className="w-4 h-4 mx-auto mb-1" />
                  <div className="text-xs">Add bonus info</div>
                </div>
              </div>
            )}
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Bonus Information</h4>
              <p className="text-sm text-gray-500">Edit bonus dates and amounts</p>
            </div>

            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="bonusDate" className="text-xs">Bonus Date</Label>
                <Input
                  id="bonusDate"
                  type="date"
                  value={editData.bonusDate}
                  onChange={(e) => setEditData(prev => ({ ...prev, bonusDate: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="informedDate" className="text-xs">Informed Date</Label>
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

              <div className="space-y-2">
                <Label htmlFor="bonusAdvance" className="text-xs">Bonus Advance ($)</Label>
                <Input
                  id="bonusAdvance"
                  type="number"
                  step="0.01"
                  value={editData.bonusAdvance}
                  onChange={(e) => setEditData(prev => ({ ...prev, bonusAdvance: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advanceDate" className="text-xs">Advance Date</Label>
                <Input
                  id="advanceDate"
                  type="date"
                  value={editData.advanceDate}
                  onChange={(e) => setEditData(prev => ({ ...prev, advanceDate: e.target.value }))}
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
