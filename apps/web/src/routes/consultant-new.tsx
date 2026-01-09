import { useNavigate } from 'react-router-dom';
import { useCreateConsultant } from '@/hooks/use-consultants';
import ConsultantRegistrationForm from '@/components/consultant-registration-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

export default function ConsultantNewPage() {
  const navigate = useNavigate();
  const createConsultant = useCreateConsultant();
  const { toast } = useToast();

  const handleSubmit = async (formData: FormData) => {
    try {
      // Extract text fields from FormData
      const data: any = {};
      
      // Get all text fields
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // Handle file uploads separately if needed
          continue;
        }
        
        // Convert string values appropriately
        if (key === 'hourlyRate' || key === 'yearlyBonus' || key === 'clientInvoiceUnitPrice' || key === 'number') {
          data[key] = value ? parseFloat(value as string) : undefined;
        } else if (key === 'bonusMonth') {
          data[key] = value ? parseInt(value as string) : undefined;
        } else if (key === 'startDate' || key === 'birthDate') {
          // Convert date string to ISO datetime format
          if (value && value.toString().trim()) {
            const dateStr = value.toString();
            // If it's already in ISO format, use it; otherwise convert from YYYY-MM-DD
            if (dateStr.includes('T')) {
              data[key] = dateStr;
            } else {
              // Convert YYYY-MM-DD to ISO datetime
              const date = new Date(dateStr + 'T00:00:00.000Z');
              data[key] = date.toISOString();
            }
          }
        } else {
          // String fields - only include if not empty
          if (value && value.toString().trim()) {
            data[key] = value.toString().trim();
          }
        }
      }

      // Handle file uploads if present
      const cnhPhoto = formData.get('cnhPhoto') as File | null;
      const addressProofPhoto = formData.get('addressProofPhoto') as File | null;

      // Create consultant via API
      const consultant = await createConsultant.mutateAsync(data);

      // Upload documents if provided
      if (cnhPhoto) {
        try {
          await apiClient.uploadConsultantDocument(consultant.id, 'cnh', cnhPhoto);
        } catch (error) {
          console.error('Failed to upload CNH photo:', error);
          toast({
            title: 'Consultant created',
            description: 'Consultant was created but CNH photo upload failed.',
            variant: 'destructive',
          });
        }
      }

      if (addressProofPhoto) {
        try {
          await apiClient.uploadConsultantDocument(consultant.id, 'address_proof', addressProofPhoto);
        } catch (error) {
          console.error('Failed to upload address proof photo:', error);
          toast({
            title: 'Consultant created',
            description: 'Consultant was created but address proof upload failed.',
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Success',
        description: 'Consultant created successfully.',
      });

      // Navigate to consultant profile
      navigate(`/consultants/${consultant.id}`);
    } catch (error: any) {
      console.error('Failed to create consultant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create consultant.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/consultants')}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Add New Consultant</h1>
      </div>

      {/* Form */}
      <ConsultantRegistrationForm
        onSubmit={handleSubmit}
        loading={createConsultant.isPending}
      />
    </div>
  );
}
