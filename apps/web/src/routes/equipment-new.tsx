import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useActiveConsultants } from '@/hooks/use-consultants';
import { useCreateEquipment } from '@/hooks/use-equipment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '../components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ArrowLeft, CalendarIcon, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NewEquipmentPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    consultantId: '',
    deviceName: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    returnRequired: true,
    notes: '',
  });
  const [selectedDate, setSelectedDate] = useState<Date>();

  const { data: consultants, isLoading: consultantsLoading } = useActiveConsultants();
  const createEquipmentMutation = useCreateEquipment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.consultantId || !formData.deviceName) {
      return;
    }

    try {
      await createEquipmentMutation.mutateAsync({
        consultantId: Number(formData.consultantId),
        deviceName: formData.deviceName,
        model: formData.model || undefined,
        serialNumber: formData.serialNumber || undefined,
        purchaseDate: formData.purchaseDate || undefined,
        returnRequired: formData.returnRequired,
        notes: formData.notes || undefined,
      });
      
      navigate('/equipment');
    } catch (error) {
      console.error('Failed to create equipment:', error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setFormData(prev => ({
      ...prev,
      purchaseDate: date ? date.toISOString() : ''
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/equipment')}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Laptop className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">Add New Equipment</h1>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Consultant Selection */}
            <div className="space-y-2">
              <Label htmlFor="consultantId">Assigned Consultant *</Label>
              {consultantsLoading ? (
                <div className="text-sm text-gray-500">Loading consultants...</div>
              ) : (
                <Select
                  value={formData.consultantId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, consultantId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select consultant" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultants?.map((consultant) => (
                      <SelectItem key={consultant.id} value={consultant.id.toString()}>
                        {consultant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Device Name */}
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name *</Label>
              <Input
                id="deviceName"
                placeholder="e.g., Dell Vostro 15, MacBook Pro"
                value={formData.deviceName}
                onChange={(e) => setFormData(prev => ({ ...prev, deviceName: e.target.value }))}
                required
              />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="e.g., 5510, M1 Pro"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              />
            </div>

            {/* Serial Number */}
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                placeholder="e.g., HMD57L3, F0YKWZ3"
                value={formData.serialNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
              />
            </div>

            {/* Purchase Date */}
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Return Required */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="returnRequired"
                checked={formData.returnRequired}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, returnRequired: checked as boolean }))
                }
              />
              <Label 
                htmlFor="returnRequired"
                className="text-sm font-normal cursor-pointer"
              >
                Return required when consultant leaves
              </Label>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information about this equipment..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/equipment')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !formData.consultantId || 
                  !formData.deviceName || 
                  createEquipmentMutation.isPending
                }
              >
                {createEquipmentMutation.isPending ? 'Adding...' : 'Add Equipment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Form Validation Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Required Information:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Consultant assignment</li>
              <li>Device name or description</li>
            </ul>
            <p className="mt-3 text-blue-600">
              All other fields are optional but help track equipment details and return requirements.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
