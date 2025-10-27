import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Download, FileText, Calendar, DollarSign } from 'lucide-react';
import {
  useTerminationStatus,
  useInitiateTermination,
  useSignTerminationContract,
  useGenerateTerminationDocument,
  downloadTerminationDocument
} from '@/hooks/use-termination';
import type { InitiateTerminationRequest, TerminationReason } from '@vsol-admin/shared';

interface TerminationWorkflowProps {
  consultantId: number;
}

interface TerminationFormData {
  terminationReason: TerminationReason | '';
  terminationDate: string;
  finalPaymentAmount: string;
  equipmentReturnDeadline: string;
}

const terminationReasons = [
  { value: 'FIRED', label: 'Fired' },
  { value: 'LAID_OFF', label: 'Laid Off' },
  { value: 'QUIT', label: 'Quit' },
  { value: 'MUTUAL_AGREEMENT', label: 'Mutual Agreement' }
];

export default function TerminationWorkflow({ consultantId }: TerminationWorkflowProps) {
  const [showInitiateForm, setShowInitiateForm] = useState(false);
  const [formData, setFormData] = useState<TerminationFormData>({
    terminationReason: '',
    terminationDate: new Date().toISOString().split('T')[0],
    finalPaymentAmount: '',
    equipmentReturnDeadline: ''
  });

  const { data: terminationStatus, isLoading } = useTerminationStatus(consultantId);
  const initiateTerminationMutation = useInitiateTermination();
  const signContractMutation = useSignTerminationContract();
  const generateDocumentMutation = useGenerateTerminationDocument();

  const handleInitiateTermination = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.terminationReason || !formData.finalPaymentAmount) {
      return;
    }

    const data: InitiateTerminationRequest = {
      consultantId,
      terminationReason: formData.terminationReason as TerminationReason,
      terminationDate: new Date(formData.terminationDate).toISOString(),
      finalPaymentAmount: parseFloat(formData.finalPaymentAmount),
      equipmentReturnDeadline: formData.equipmentReturnDeadline 
        ? new Date(formData.equipmentReturnDeadline).toISOString()
        : undefined
    };

    try {
      await initiateTerminationMutation.mutateAsync({ consultantId, data });
      setShowInitiateForm(false);
      setFormData({
        terminationReason: '',
        terminationDate: new Date().toISOString().split('T')[0],
        finalPaymentAmount: '',
        equipmentReturnDeadline: ''
      });
    } catch (error) {
      console.error('Error initiating termination:', error);
    }
  };

  const handleSignContract = async () => {
    try {
      await signContractMutation.mutateAsync({ consultantId });
    } catch (error) {
      console.error('Error signing contract:', error);
    }
  };

  const handleGenerateDocument = async () => {
    try {
      const blob = await generateDocumentMutation.mutateAsync(consultantId);
      downloadTerminationDocument(blob, terminationStatus?.consultant?.name || 'consultant');
    } catch (error) {
      console.error('Error generating document:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Termination Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading termination status...</div>
        </CardContent>
      </Card>
    );
  }

  if (!terminationStatus?.isTerminated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Termination Process
          </CardTitle>
          <CardDescription>
            Initiate termination process for this consultant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showInitiateForm ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                This consultant is currently active. You can initiate the termination process here.
              </p>
              <Button 
                onClick={() => setShowInitiateForm(true)}
                variant="destructive"
              >
                Initiate Termination
              </Button>
            </div>
          ) : (
            <form onSubmit={handleInitiateTermination} className="space-y-4">
              <h4 className="font-medium text-lg">Initiate Termination</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="terminationReason">Termination Reason *</Label>
                  <Select
                    value={formData.terminationReason}
                    onValueChange={(value) => 
                      setFormData({ ...formData, terminationReason: value as TerminationReason })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {terminationReasons.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="terminationDate">Termination Date *</Label>
                  <Input
                    id="terminationDate"
                    type="date"
                    value={formData.terminationDate}
                    onChange={(e) => setFormData({ ...formData, terminationDate: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="finalPaymentAmount">Final Payment Amount (R$) *</Label>
                  <Input
                    id="finalPaymentAmount"
                    type="number"
                    step="0.01"
                    value={formData.finalPaymentAmount}
                    onChange={(e) => setFormData({ ...formData, finalPaymentAmount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="equipmentReturnDeadline">Equipment Return Deadline</Label>
                  <Input
                    id="equipmentReturnDeadline"
                    type="date"
                    value={formData.equipmentReturnDeadline}
                    onChange={(e) => setFormData({ ...formData, equipmentReturnDeadline: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use default (5 days from termination date)
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="submit"
                  disabled={initiateTerminationMutation.isPending}
                  variant="destructive"
                >
                  Initiate Termination
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowInitiateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  const { consultant, equipmentStatus, processStatus, nextSteps } = terminationStatus;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Termination Process
          <Badge variant="destructive">Terminated</Badge>
        </CardTitle>
        <CardDescription>
          Manage termination workflow and document generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Termination Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-500">Termination Date</Label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatDate(consultant.terminationDate)}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-500">Reason</Label>
            <div>
              <Badge variant="outline">
                {terminationReasons.find(r => r.value === consultant.terminationReason)?.label || consultant.terminationReason}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-500">Final Payment</Label>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="font-mono">
                R$ {consultant.finalPaymentAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs font-medium text-gray-500">Equipment Deadline</Label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className={processStatus?.equipmentDeadlinePassed ? 'text-red-600 font-medium' : ''}>
                {consultant.equipmentReturnDeadline ? formatDate(consultant.equipmentReturnDeadline) : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {/* Process Status */}
        <div className="space-y-4">
          <h4 className="font-medium">Process Status</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {processStatus?.isEquipmentReturned ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              <div>
                <div className="font-medium text-sm">Equipment Return</div>
                <div className="text-xs text-gray-600">
                  {equipmentStatus?.returned || 0}/{equipmentStatus?.requireReturn || 0} returned
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {processStatus?.isContractSigned ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              <div>
                <div className="font-medium text-sm">Contract Signed</div>
                <div className="text-xs text-gray-600">
                  {consultant.contractSignedDate 
                    ? `Signed ${formatDate(consultant.contractSignedDate)}`
                    : 'Pending signature'
                  }
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {processStatus?.isProcessComplete ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              <div>
                <div className="font-medium text-sm">Process Complete</div>
                <div className="text-xs text-gray-600">
                  {processStatus?.isProcessComplete ? 'All steps completed' : 'In progress'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {nextSteps && nextSteps.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Next Steps</h4>
            <ul className="space-y-1">
              {nextSteps.map((step, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          {!processStatus?.isContractSigned && (
            <Button
              onClick={handleSignContract}
              disabled={signContractMutation.isPending}
            >
              Mark Contract as Signed
            </Button>
          )}
          
          <Button
            onClick={handleGenerateDocument}
            disabled={generateDocumentMutation.isPending}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Termination Contract
          </Button>
        </div>

        {/* Equipment deadline warning */}
        {processStatus?.equipmentDeadlinePassed && !processStatus?.isEquipmentReturned && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Equipment Return Deadline Passed</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              The deadline for equipment return has passed. {equipmentStatus?.pending || 0} items are still pending return.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
