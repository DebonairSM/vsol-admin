import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatMonthAbbr } from '@/lib/utils';
import { Mail, Info, Copy, X } from 'lucide-react';
import { useBonusWorkflow, useCreateBonusWorkflow, useUpdateBonusWorkflow, useGenerateBonusEmail } from '@/hooks/use-bonus-workflow';
import { useCycleLines, useCycle } from '@/hooks/use-cycles';
import { toast } from 'sonner';
import { parseMonthLabel } from '@/lib/business-days';
import { getMonthName } from '@/lib/work-hours';

interface BonusWorkflowSectionProps {
  cycleId: number;
}

export default function BonusWorkflowSection({ cycleId }: BonusWorkflowSectionProps) {
  const { data: workflow, isLoading } = useBonusWorkflow(cycleId);
  const { data: cycle } = useCycle(cycleId);
  const { data: cycleLines } = useCycleLines(cycleId);
  const createWorkflow = useCreateBonusWorkflow(cycleId);
  const updateWorkflow = useUpdateBonusWorkflow(cycleId);
  const generateEmail = useGenerateBonusEmail(cycleId);

  // Calculate the work payment month (next month after cycle start) and bonus payment month (one month after)
  const workPaymentMonth = useMemo(() => {
    if (!cycle?.monthLabel) return null;
    const parsed = parseMonthLabel(cycle.monthLabel);
    if (!parsed) return null;
    
    let nextMonth = parsed.month + 1;
    let nextYear = parsed.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    
    return {
      month: nextMonth,
      year: nextYear,
      monthName: getMonthName(nextMonth)
    };
  }, [cycle?.monthLabel]);

  // Bonus is paid one month after cycle start
  const bonusPaymentMonth = useMemo(() => {
    if (!cycle?.monthLabel) return null;
    const parsed = parseMonthLabel(cycle.monthLabel);
    if (!parsed) return null;
    
    let bonusMonth = parsed.month + 1;
    let bonusYear = parsed.year;
    if (bonusMonth > 12) {
      bonusMonth = bonusMonth - 12;
      bonusYear++;
    }
    
    return {
      month: bonusMonth,
      year: bonusYear,
      monthName: getMonthName(bonusMonth)
    };
  }, [cycle?.monthLabel]);

  const [selectedConsultantId, setSelectedConsultantId] = useState<number | null>(
    workflow?.bonusRecipientConsultantId || null
  );
  const [announcementDate, setAnnouncementDate] = useState<string>(
    workflow?.bonusAnnouncementDate 
      ? new Date(workflow.bonusAnnouncementDate).toISOString().split('T')[0]
      : ''
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    workflow?.bonusPaymentDate 
      ? new Date(workflow.bonusPaymentDate).toISOString().split('T')[0]
      : ''
  );
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState(workflow?.emailContent || '');
  const [notes, setNotes] = useState(workflow?.notes || '');
  const [emailGenerated, setEmailGenerated] = useState(workflow?.emailGenerated || false);
  const [paidWithPayroll, setPaidWithPayroll] = useState(workflow?.paidWithPayroll || false);

  // Update state when workflow changes
  useEffect(() => {
    if (workflow) {
      setSelectedConsultantId(workflow.bonusRecipientConsultantId || null);
      setAnnouncementDate(
        workflow.bonusAnnouncementDate 
          ? new Date(workflow.bonusAnnouncementDate).toISOString().split('T')[0]
          : ''
      );
      setPaymentDate(
        workflow.bonusPaymentDate 
          ? new Date(workflow.bonusPaymentDate).toISOString().split('T')[0]
          : ''
      );
      setEmailContent(workflow.emailContent || '');
      setNotes(workflow.notes || '');
      setEmailGenerated(workflow.emailGenerated || false);
      setPaidWithPayroll(workflow.paidWithPayroll || false);
    }
  }, [workflow]);

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
      const result = await generateEmail.mutateAsync(selectedConsultantId);
      setEmailSubject(result.emailSubject || '');
      setEmailContent(result.emailContent);
      setEmailGenerated(true);
      toast.success('Email content generated successfully');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to generate email content. Make sure consultants have bonus amounts.';
      toast.error(errorMessage);
    }
  };

  const handleCopySubject = async () => {
    try {
      await navigator.clipboard.writeText(emailSubject);
      toast.success('Subject copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy subject');
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailContent);
      toast.success('Email content copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy email content');
    }
  };

  const handleCopyEmailAddress = async () => {
    try {
      const recipientEmail = selectedConsultant?.email || '';
      if (!recipientEmail) {
        toast.error('No email address available for this consultant');
        return;
      }
      await navigator.clipboard.writeText(recipientEmail);
      toast.success('Recipient email address copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy email address');
    }
  };

  const handleSave = async () => {
    try {
      await updateWorkflow.mutateAsync({
        bonusRecipientConsultantId: selectedConsultantId,
        bonusAnnouncementDate: announcementDate ? new Date(announcementDate).toISOString() : null,
        bonusPaymentDate: paymentDate ? new Date(paymentDate).toISOString() : null,
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

  // Find selected consultant and check for advances
  const selectedConsultant = cycleLines?.find(line => line.consultant.id === selectedConsultantId)?.consultant;
  const consultantLineItem = cycleLines?.find(line => line.consultantId === selectedConsultantId);
  const advanceAmount = consultantLineItem?.bonusAdvance || 0;

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
              <p className="text-sm text-gray-600 mb-2">No bonus workflow has been created for this cycle yet.</p>
              <p className="text-xs text-gray-500">
                Recipient will be auto-selected when bonus month matches the bonus payment month (one month after cycle start) or when bonus fields are set on line items.
              </p>
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
        {/* Consultant Selection */}
        <div className="space-y-2">
          <Label>Bonus Recipient</Label>
          <Select 
            value={selectedConsultantId?.toString() || ''} 
            onValueChange={(value) => setSelectedConsultantId(value ? parseInt(value) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select consultant who will receive the bonus">
                {selectedConsultantId && cycleLines
                  ? cycleLines.find(line => line.consultant.id === selectedConsultantId)?.consultant.name || 'Select a consultant'
                  : 'Select consultant who will receive the bonus'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {cycleLines?.map((line) => {
                const monthHint = line.consultant.bonusMonth 
                  ? ` (${formatMonthAbbr(line.consultant.bonusMonth)})` 
                  : '';
                const matchesBonusMonth = bonusPaymentMonth && line.consultant.bonusMonth === bonusPaymentMonth.month;
                return (
                  <SelectItem 
                    key={line.consultant.id} 
                    value={line.consultant.id.toString()}
                    className={matchesBonusMonth ? 'font-semibold bg-green-50 dark:bg-green-950' : ''}
                  >
                    {line.consultant.name}{monthHint}
                    {matchesBonusMonth && ' ✓ (matches bonus payment month)'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {bonusPaymentMonth && workPaymentMonth && (
            <div className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-950 p-2 rounded flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                This cycle: Consultants work in <strong>{workPaymentMonth.monthName} {workPaymentMonth.year}</strong> and 
                receive bonus in <strong>{bonusPaymentMonth.monthName} {bonusPaymentMonth.year}</strong>. 
                Select a consultant whose bonus month matches <strong>{bonusPaymentMonth.monthName}</strong>.
              </span>
            </div>
          )}
          {!selectedConsultantId && (
            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Recipient will be auto-selected when bonus month matches the bonus payment month ({bonusPaymentMonth?.monthName}) 
                or when bonus fields are set on line items.
              </span>
            </div>
          )}
          {selectedConsultant && selectedConsultant.bonusMonth && (
            <div className={`text-sm p-2 rounded flex items-start gap-2 ${
              bonusPaymentMonth && selectedConsultant.bonusMonth === bonusPaymentMonth.month
                ? 'text-green-600 bg-green-50 dark:bg-green-950'
                : 'text-amber-600 bg-amber-50 dark:bg-amber-950'
            }`}>
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                This consultant has bonus month: {formatMonthAbbr(selectedConsultant.bonusMonth)}
                {bonusPaymentMonth && selectedConsultant.bonusMonth === bonusPaymentMonth.month 
                  ? ' ✓ (matches bonus payment month)'
                  : bonusPaymentMonth 
                    ? ` ⚠ (bonus payment month is ${bonusPaymentMonth.monthName})`
                    : ''
                }
              </span>
            </div>
          )}
          {selectedConsultant && advanceAmount > 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ {selectedConsultant.name} has an advance of ${advanceAmount.toFixed(2)}. 
              Net bonus will be ${(3111 - advanceAmount).toFixed(2)}.
            </div>
          )}
        </div>

        {/* Bonus Announcement Date */}
        <div className="space-y-2">
          <Label htmlFor="announcementDate">Bonus Announcement Date</Label>
          <div className="flex gap-2">
            <Input
              id="announcementDate"
              type="date"
              value={announcementDate}
              onChange={(e) => setAnnouncementDate(e.target.value)}
              className="flex-1"
            />
            {announcementDate && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAnnouncementDate('')}
                className="flex-shrink-0"
                title="Clear date"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Generate Email */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Email Subject</Label>
            {emailSubject && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySubject}
                className="flex items-center gap-1 h-7"
              >
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            )}
          </div>
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
          {emailSubject && (
            <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm font-medium">
              {emailSubject}
            </div>
          )}
        </div>

        {/* Email Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Email Content</Label>
            {emailContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyEmail}
                className="flex items-center gap-1 h-7"
              >
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            )}
          </div>
          <Textarea
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            placeholder="Email content will appear here after generation..."
            rows={12}
            className="font-mono text-sm"
          />
        </div>

        {/* Recipient Email Address */}
        {selectedConsultant && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recipient Email Address</Label>
              {selectedConsultant.email && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyEmailAddress}
                  className="flex items-center gap-1 h-7"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              )}
            </div>
            <div className={`p-3 rounded border text-sm ${
              selectedConsultant.email 
                ? 'bg-gray-50 border-gray-200 font-mono' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {selectedConsultant.email || 'No email address on file for this consultant'}
            </div>
          </div>
        )}

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
            <Label htmlFor="paymentDate">Bonus Payment Date</Label>
            <div className="flex gap-2">
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="flex-1"
              />
              {paymentDate && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPaymentDate('')}
                  className="flex-shrink-0"
                  title="Clear date"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
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

