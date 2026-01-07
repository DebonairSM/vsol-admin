import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, Download, Eye, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Invoice {
  id: number;
  cycleId: number;
  fileName: string | null;
  uploadedAt: Date | null;
  cycle: {
    id: number;
    monthLabel: string;
  };
}

export default function ConsultantInvoicesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingCycleId, setDownloadingCycleId] = useState<number | null>(null);
  const [replacingCycleId, setReplacingCycleId] = useState<number | null>(null);

  const { data: cycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ['consultant-cycles'],
    queryFn: () => apiClient.getConsultantCycles(),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['consultant-invoices'],
    queryFn: () => apiClient.getConsultantInvoices(),
  });

  const selectedCycleLabel =
    Array.isArray(cycles) && selectedCycleId
      ? cycles.find((c) => c.id.toString() === selectedCycleId)?.monthLabel
      : undefined;

  const uploadMutation = useMutation({
    mutationFn: async ({ cycleId, file }: { cycleId: number; file: File }) => {
      return apiClient.uploadInvoice(cycleId, file);
    },
    onSuccess: (_, variables) => {
      const isReplacement = replacingCycleId === variables.cycleId;
      toast({
        title: isReplacement ? 'Invoice Replaced' : 'Invoice Uploaded',
        description: isReplacement 
          ? 'Your invoice has been replaced successfully.'
          : 'Your invoice has been uploaded successfully.',
      });
      setSelectedFile(null);
      setSelectedCycleId('');
      setReplacingCycleId(null);
      queryClient.invalidateQueries({ queryKey: ['consultant-invoices'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload invoice',
        variant: 'destructive',
      });
      setReplacingCycleId(null);
    },
  });

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF or image file (JPEG/PNG)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'File size must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCycleId || !selectedFile) {
      toast({
        title: 'Missing Information',
        description: 'Please select a cycle and choose a file',
        variant: 'destructive',
      });
      return;
    }

    uploadMutation.mutate({
      cycleId: parseInt(selectedCycleId),
      file: selectedFile,
    });
  };

  const handleDownload = async (cycleId: number, fileName: string | null) => {
    try {
      setDownloadingCycleId(cycleId);
      const blob = await apiClient.downloadConsultantInvoice(cycleId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `invoice-${cycleId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Download Started',
        description: 'Your invoice is being downloaded.',
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download invoice',
        variant: 'destructive',
      });
    } finally {
      setDownloadingCycleId(null);
    }
  };

  const handleView = async (cycleId: number) => {
    try {
      setDownloadingCycleId(cycleId);
      const blob = await apiClient.downloadConsultantInvoice(cycleId);
      
      // Open in new tab
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error: any) {
      toast({
        title: 'Failed to Open',
        description: error.message || 'Failed to open invoice',
        variant: 'destructive',
      });
    } finally {
      setDownloadingCycleId(null);
    }
  };

  const handleReplaceClick = (cycleId: number) => {
    // Trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
          toast({
            title: 'Invalid File Type',
            description: 'Please upload a PDF or image file (JPEG/PNG)',
            variant: 'destructive',
          });
          return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'File Too Large',
            description: 'File size must be less than 10MB',
            variant: 'destructive',
          });
          return;
        }

        setReplacingCycleId(cycleId);
        // Auto-submit the replacement
        uploadMutation.mutate({
          cycleId,
          file,
        });
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload Invoice</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload your monthly invoice for payroll processing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Upload</CardTitle>
          <CardDescription>
            Select a payroll cycle and upload your invoice file (PDF or image)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="cycle" className="block text-sm font-medium text-gray-700 mb-2">
                Payroll Cycle
              </label>
              <Select
                value={selectedCycleId}
                onValueChange={setSelectedCycleId}
              >
                <SelectTrigger id="cycle" disabled={cyclesLoading}>
                  <SelectValue placeholder="Select a cycle">
                    {selectedCycleLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(cycles) && cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id.toString()}>
                      {cycle.monthLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice File
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div className="text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Click to upload
                      </label>
                      <span className="mx-2">or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, JPEG, or PNG (max 10MB)
                    </p>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!selectedCycleId || !selectedFile || uploadMutation.isPending}
              className="w-full"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Invoice'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Invoices</CardTitle>
          <CardDescription>
            View and download your previously uploaded invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="text-center py-8 text-gray-500">Loading invoices...</div>
          ) : !invoices || !Array.isArray(invoices) || invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invoices uploaded yet
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice: Invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {invoice.cycle.monthLabel}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{invoice.fileName || 'Invoice file'}</span>
                        {invoice.uploadedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Uploaded {format(new Date(invoice.uploadedAt), 'MMM d, yyyy')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(invoice.cycleId)}
                      disabled={downloadingCycleId === invoice.cycleId || replacingCycleId === invoice.cycleId}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(invoice.cycleId, invoice.fileName)}
                      disabled={downloadingCycleId === invoice.cycleId || replacingCycleId === invoice.cycleId}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadingCycleId === invoice.cycleId ? 'Downloading...' : 'Download'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReplaceClick(invoice.cycleId)}
                      disabled={downloadingCycleId === invoice.cycleId || replacingCycleId === invoice.cycleId || uploadMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${replacingCycleId === invoice.cycleId && uploadMutation.isPending ? 'animate-spin' : ''}`} />
                      {replacingCycleId === invoice.cycleId && uploadMutation.isPending ? 'Replacing...' : 'Replace'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

