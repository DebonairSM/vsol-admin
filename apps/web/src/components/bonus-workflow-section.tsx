import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDate } from '@/lib/utils';
import { CalendarIcon, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBonusWorkflow, useCreateBonusWorkflow, useUpdateBonusWorkflow, useGenerateBonusEmail } from '@/hooks/use-bonus-workflow';
import { toast } from 'sonner';

interface BonusWorkflowSectionProps {
  cycleId: number;
}

export default function BonusWorkflowSection({ cycleId }: BonusWorkflowSectionProps) {
  const { data: workflow, isLoading } = useBonusWorkflow(cycleId);
  const createWorkflow = useCreateBonusWorkflow(cycleId);
  const updateWorkflow = useUpdateBonusWorkflow(cycleId);
  const generateEmail = useGenerateBonusEmail(cycleId);

  const [announcementDate, setAnnouncementDate] = useState<Date | undefined>(
    workflow?.bonusAnnouncementDate ? new Date(workflow.bonusAnnouncementDate) : undefined
  );
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(
    workflow?.bonusPaymentDate ? new Date(workflow.bonusPaymentDate) : undefined
  );
  const [emailContent, setEmailContent] = useState(workflow?.emailContent || '');
  const [notes, setNotes] = useState(workflow?.notes || '');
  const [emailGenerated, setEmailGenerated] = useState(workflow?.emailGenerated || false);
  const [paidWithPayroll, setPaidWithPayroll] = useState(workflow?.paidWithPayroll || false);

  const handleCreateWorkflow = async () => {
    try {
      await createWorkflow.mutateAsync();
      toast.success('Bonus workflow created');
    } catch (error) {
      toast.error('Failed to create bonus workflow');
    }
  };

  const handleGenerateEmail = async () => {
    try {
      const result = await generateEmail.mutateAsync();
      setEmailContent(result.emailContent);
      setEmailGenerated(true);
      toast.success('Email content generated successfully');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to generate email content. Make sure consultants have bonus amounts.';
      toast.error(errorMessage);
    }
  };

  const handleSave = async () => {
    try {
      await updateWorkflow.mutateAsync({
        bonusAnnouncementDate: announcementDate?.toISOString() || null,
        bonusPaymentDate: paymentDate?.toISOString() || null,
        emailContent,
        notes,
        emailGenerated,
        paidWithPayroll
      });
      toast.success('Bonus workflow updated');
    } catch (error) {
      toast.error('Failed to update bonus workflow');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-sm text-gray-500">Loading bonus workflow...</div>
        </CardContent>
      </Card>
    );
  }

  if (!workflow) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Bonus Workflow</h3>
              <p className="text-sm text-gray-600">No bonus workflow has been created for this cycle yet.</p>
            </div>
            <Button onClick={handleCreateWorkflow} disabled={createWorkflow.isPending}>
              Create Bonus Workflow
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bonus Workflow</CardTitle>
        <CardDescription>Manage yearly bonus announcement and payment tracking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bonus Announcement Date */}
        <div className="space-y-2">
          <Label>Bonus Announcement Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !announcementDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {announcementDate ? formatDate(announcementDate.toISOString()) : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={announcementDate}
                onSelect={setAnnouncementDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Generate Email */}
        <div className="space-y-2">
          <Label>Email Content</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateEmail}
              disabled={generateEmail.isPending}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Generate Email
            </Button>
          </div>
          <Textarea
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            placeholder="Email content will appear here after generation..."
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        {/* Email Generated Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="emailGenerated"
            checked={emailGenerated}
            onCheckedChange={(checked) => setEmailGenerated(checked as boolean)}
          />
          <Label htmlFor="emailGenerated" className="cursor-pointer">
            Email has been generated and sent
          </Label>
        </div>

        {/* Paid with Payroll Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="paidWithPayroll"
            checked={paidWithPayroll}
            onCheckedChange={(checked) => setPaidWithPayroll(checked as boolean)}
          />
          <Label htmlFor="paidWithPayroll" className="cursor-pointer">
            Bonus paid with monthly payroll
          </Label>
        </div>

        {/* Bonus Payment Date (shown only if not paid with payroll) */}
        {!paidWithPayroll && (
          <div className="space-y-2">
            <Label>Bonus Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? formatDate(paymentDate.toISOString()) : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={setPaymentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about the bonus..."
            rows={3}
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updateWorkflow.isPending}
          className="w-full"
        >
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}

