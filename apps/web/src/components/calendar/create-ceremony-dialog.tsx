import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateSprintCeremony } from '@/hooks/use-sprint-ceremonies';
import type { RecurrenceFrequency } from '@vsol-admin/shared';

interface CreateCeremonyDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function CreateCeremonyDialog({ open, onOpenChange, trigger }: CreateCeremonyDialogProps) {
  const createCeremony = useCreateSprintCeremony();
  const [isOpen, setIsOpen] = useState(open || false);
  const [formData, setFormData] = useState({
    title: '',
    ceremonyType: 'STANDUP' as 'STANDUP' | 'SPRINT_PLANNING' | 'SPRINT_REVIEW' | 'RETROSPECTIVE' | 'OTHER',
    startDate: null as Date | null,
    startTime: '',
    durationMinutes: '',
    isRecurring: false,
    recurrenceFrequency: 'WEEKLY' as RecurrenceFrequency,
    recurrenceInterval: '1',
    recurrenceDaysOfWeek: [] as number[],
    recurrenceEndDate: null as Date | null,
    location: '',
    notes: ''
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.startDate) {
      return;
    }

    // Build start date with time
    const startDateTime = new Date(formData.startDate);
    if (formData.startTime) {
      const [hours, minutes] = formData.startTime.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);
    }

    const ceremonyData = {
      title: formData.title,
      ceremonyType: formData.ceremonyType,
      startDate: startDateTime.toISOString(),
      startTime: formData.startTime || null,
      durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
      isRecurring: formData.isRecurring,
      recurrenceRule: formData.isRecurring ? {
        frequency: formData.recurrenceFrequency,
        interval: parseInt(formData.recurrenceInterval) || 1,
        endDate: formData.recurrenceEndDate ? formData.recurrenceEndDate.toISOString() : null,
        daysOfWeek: formData.recurrenceFrequency === 'WEEKLY' && formData.recurrenceDaysOfWeek.length > 0
          ? formData.recurrenceDaysOfWeek
          : undefined
      } : null,
      location: formData.location || null,
      notes: formData.notes || null
    };

    try {
      await createCeremony.mutateAsync(ceremonyData);
      // Reset form
      setFormData({
        title: '',
        ceremonyType: 'STANDUP',
        startDate: null,
        startTime: '',
        durationMinutes: '',
        isRecurring: false,
        recurrenceFrequency: 'WEEKLY',
        recurrenceInterval: '1',
        recurrenceDaysOfWeek: [],
        recurrenceEndDate: null,
        location: '',
        notes: ''
      });
      handleOpenChange(false);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setFormData(prev => ({
      ...prev,
      recurrenceDaysOfWeek: prev.recurrenceDaysOfWeek.includes(day)
        ? prev.recurrenceDaysOfWeek.filter(d => d !== day)
        : [...prev.recurrenceDaysOfWeek, day]
    }));
  };

  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Sprint Ceremony</DialogTitle>
          <DialogDescription>
            Create a new sprint ceremony. You can make it recurring to automatically schedule future occurrences.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Daily Standup"
                required
              />
            </div>

            {/* Ceremony Type */}
            <div className="space-y-2">
              <Label htmlFor="ceremonyType">Ceremony Type *</Label>
              <Select
                value={formData.ceremonyType}
                onValueChange={(value: any) => setFormData({ ...formData, ceremonyType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDUP">Standup</SelectItem>
                  <SelectItem value="SPRINT_PLANNING">Sprint Planning</SelectItem>
                  <SelectItem value="SPRINT_REVIEW">Sprint Review</SelectItem>
                  <SelectItem value="RETROSPECTIVE">Retrospective</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.startDate || undefined}
                    onSelect={(date) => setFormData({ ...formData, startDate: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time (optional)</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration (minutes, optional)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min="1"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                placeholder="e.g., 30"
              />
            </div>

            {/* Recurring */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, isRecurring: checked as boolean })
                }
              />
              <Label htmlFor="isRecurring" className="text-sm font-normal cursor-pointer">
                Recurring event
              </Label>
            </div>

            {/* Recurrence Options */}
            {formData.isRecurring && (
              <div className="space-y-4 pl-6 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="recurrenceFrequency">Frequency</Label>
                  <Select
                    value={formData.recurrenceFrequency}
                    onValueChange={(value: RecurrenceFrequency) => 
                      setFormData({ ...formData, recurrenceFrequency: value, recurrenceDaysOfWeek: [] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurrenceFrequency === 'WEEKLY' && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {dayLabels.map((label, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`day-${index}`}
                            checked={formData.recurrenceDaysOfWeek.includes(index)}
                            onCheckedChange={() => toggleDayOfWeek(index)}
                          />
                          <Label htmlFor={`day-${index}`} className="text-sm font-normal cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(formData.recurrenceFrequency === 'DAILY' || formData.recurrenceFrequency === 'WEEKLY' || formData.recurrenceFrequency === 'BIWEEKLY') && (
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceInterval">Interval</Label>
                    <Input
                      id="recurrenceInterval"
                      type="number"
                      min="1"
                      value={formData.recurrenceInterval}
                      onChange={(e) => setFormData({ ...formData, recurrenceInterval: e.target.value })}
                      placeholder="e.g., 2 for every 2 weeks"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.recurrenceEndDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.recurrenceEndDate ? format(formData.recurrenceEndDate, 'PPP') : 'No end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.recurrenceEndDate || undefined}
                        onSelect={(date) => setFormData({ ...formData, recurrenceEndDate: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location/URL (optional)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Meeting room or Zoom URL"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCeremony.isPending}>
              {createCeremony.isPending ? 'Creating...' : 'Create Ceremony'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}










