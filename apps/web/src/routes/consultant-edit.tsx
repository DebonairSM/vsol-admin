import { useParams, Link, useNavigate } from 'react-router-dom';
import { useConsultantProfile, useUpdateConsultantProfile, useUploadConsultantDocument } from '@/hooks/use-consultant-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UpdateConsultantRequest } from '@vsol-admin/shared';
import { ArrowLeft, Save, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import EquipmentManagement from '@/components/equipment-management';
import TerminationWorkflow from '@/components/termination-workflow';
import { getMonthsList } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ConsultantEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const consultantId = parseInt(id!);
  
  const { data: consultant, isLoading, error } = useConsultantProfile(consultantId);
  const updateProfile = useUpdateConsultantProfile();
  const uploadDocument = useUploadConsultantDocument();
  const { toast } = useToast();

  const [formState, setFormState] = useState<UpdateConsultantRequest>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState<'cnh' | 'address_proof' | null>(null);

  // Helper function to safely convert date to YYYY-MM-DD format
  const formatDateForInput = (dateValue: any): string | undefined => {
    if (!dateValue) return undefined;
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return undefined;
      
      // Use UTC components to avoid timezone shifts when displaying date-only inputs
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return undefined;
    }
  };

  // Initialize form state when consultant data loads
  useEffect(() => {
    if (consultant) {
      setFormState({
        name: consultant.name,
        hourlyRate: consultant.hourlyRate,
        startDate: formatDateForInput(consultant.startDate),
        terminationDate: consultant.terminationDate,
        evaluationNotes: consultant.evaluationNotes,
        // Personal Data
        email: consultant.email,
        address: consultant.address,
        neighborhood: consultant.neighborhood,
        city: consultant.city,
        state: consultant.state,
        cep: consultant.cep,
        phone: consultant.phone,
        birthDate: formatDateForInput(consultant.birthDate),
        shirtSize: consultant.shirtSize,
        // Company Data
        companyLegalName: consultant.companyLegalName,
        companyTradeName: consultant.companyTradeName,
        cnpj: consultant.cnpj,
        payoneerID: consultant.payoneerID,
        // Emergency Contact
        emergencyContactName: consultant.emergencyContactName,
        emergencyContactRelation: consultant.emergencyContactRelation,
        emergencyContactPhone: consultant.emergencyContactPhone,
        // Documents
        cpf: consultant.cpf,
        // Bonus
        bonusMonth: consultant.bonusMonth,
        // Invoice fields
        role: consultant.role,
        serviceDescription: consultant.serviceDescription,
        clientInvoiceServiceName: consultant.clientInvoiceServiceName,
        clientInvoiceUnitPrice: consultant.clientInvoiceUnitPrice,
        clientInvoiceServiceDescription: consultant.clientInvoiceServiceDescription,
      });
    }
  }, [consultant]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading consultant...</div>
      </div>
    );
  }

  if (error || !consultant) {
    return (
      <div className="text-center py-12">
        <div className="text-lg text-red-600">Consultant not found</div>
        <Link to="/consultants">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Consultants
          </Button>
        </Link>
      </div>
    );
  }

  const handleInputChange = (field: keyof UpdateConsultantRequest, value: string | number | null) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    // If we have exactly 14 digits, format it as XX.XXX.XXX/XXXX-XX
    if (numbers.length === 14) {
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
    }
    
    // Allow partial formatting while typing
    if (numbers.length > 0 && numbers.length < 14) {
      let formatted = '';
      if (numbers.length > 0) formatted += numbers.slice(0, 2);
      if (numbers.length > 2) formatted += '.' + numbers.slice(2, 5);
      if (numbers.length > 5) formatted += '.' + numbers.slice(5, 8);
      if (numbers.length > 8) formatted += '/' + numbers.slice(8, 12);
      if (numbers.length > 12) formatted += '-' + numbers.slice(12, 14);
      return formatted;
    }
    
    // If more than 14 digits, take only first 14 and format
    if (numbers.length > 14) {
      const first14 = numbers.slice(0, 14);
      return `${first14.slice(0, 2)}.${first14.slice(2, 5)}.${first14.slice(5, 8)}/${first14.slice(8, 12)}-${first14.slice(12, 14)}`;
    }
    
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '+55 $1 $2-$3');
    }
    return value;
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Prepare data for submission - convert empty strings to null for nullable fields
      const dataToUpdate: UpdateConsultantRequest = {};
      
      // Basic fields
      if (formState.name !== undefined) dataToUpdate.name = formState.name;
      if (formState.hourlyRate !== undefined) dataToUpdate.hourlyRate = formState.hourlyRate;
      if (formState.startDate !== undefined) {
        const startDateStr = String(formState.startDate || '').trim();
        // Required field; send as UTC midnight ISO to avoid timezone shifts
        if (startDateStr) {
          dataToUpdate.startDate = new Date(`${startDateStr}T00:00:00.000Z`).toISOString();
        }
      }
      if (formState.terminationDate !== undefined) {
        dataToUpdate.terminationDate = formState.terminationDate ? new Date(formState.terminationDate).toISOString() : null;
      }
      if (formState.evaluationNotes !== undefined) {
        dataToUpdate.evaluationNotes = formState.evaluationNotes || null;
      }
      
      // Helper to convert empty strings to null
      const toNullIfEmpty = (value: string | null | undefined): string | null | undefined => {
        if (value === undefined) return undefined;
        if (value === null) return null;
        const trimmed = typeof value === 'string' ? value.trim() : value;
        return trimmed === '' ? null : trimmed;
      };
      
      // Personal Data - convert empty strings to null
      if (formState.email !== undefined) dataToUpdate.email = toNullIfEmpty(formState.email);
      if (formState.address !== undefined) dataToUpdate.address = toNullIfEmpty(formState.address);
      if (formState.neighborhood !== undefined) dataToUpdate.neighborhood = toNullIfEmpty(formState.neighborhood);
      if (formState.city !== undefined) dataToUpdate.city = toNullIfEmpty(formState.city);
      if (formState.state !== undefined) dataToUpdate.state = toNullIfEmpty(formState.state);
      if (formState.cep !== undefined) dataToUpdate.cep = toNullIfEmpty(formState.cep);
      if (formState.phone !== undefined) dataToUpdate.phone = toNullIfEmpty(formState.phone);
      if (formState.birthDate !== undefined) {
        // Date input provides YYYY-MM-DD; send as UTC midnight ISO to avoid timezone shifts
        dataToUpdate.birthDate = formState.birthDate ? new Date(`${formState.birthDate}T00:00:00.000Z`).toISOString() : null;
      }
      if (formState.shirtSize !== undefined) dataToUpdate.shirtSize = formState.shirtSize || null;
      
      // Company Data
      if (formState.companyLegalName !== undefined) dataToUpdate.companyLegalName = toNullIfEmpty(formState.companyLegalName);
      if (formState.companyTradeName !== undefined) dataToUpdate.companyTradeName = toNullIfEmpty(formState.companyTradeName);
      if (formState.cnpj !== undefined) {
        const cnpjValue = toNullIfEmpty(formState.cnpj);
        // If CNPJ has a value, strip formatting to send only digits
        // The API validation will handle the validation, but we normalize the format
        dataToUpdate.cnpj = cnpjValue && typeof cnpjValue === 'string' 
          ? cnpjValue.replace(/\D/g, '') || null 
          : cnpjValue;
      }
      if (formState.payoneerID !== undefined) dataToUpdate.payoneerID = toNullIfEmpty(formState.payoneerID);
      
      // Emergency Contact
      if (formState.emergencyContactName !== undefined) dataToUpdate.emergencyContactName = toNullIfEmpty(formState.emergencyContactName);
      if (formState.emergencyContactRelation !== undefined) dataToUpdate.emergencyContactRelation = toNullIfEmpty(formState.emergencyContactRelation);
      if (formState.emergencyContactPhone !== undefined) dataToUpdate.emergencyContactPhone = toNullIfEmpty(formState.emergencyContactPhone);
      
      // Documents
      if (formState.cpf !== undefined) dataToUpdate.cpf = toNullIfEmpty(formState.cpf);
      
      // Bonus
      if (formState.bonusMonth !== undefined) dataToUpdate.bonusMonth = formState.bonusMonth || null;
      
      // Invoice fields
      if (formState.role !== undefined) dataToUpdate.role = toNullIfEmpty(formState.role);
      if (formState.serviceDescription !== undefined) dataToUpdate.serviceDescription = toNullIfEmpty(formState.serviceDescription);
      if (formState.clientInvoiceServiceName !== undefined) {
        dataToUpdate.clientInvoiceServiceName = toNullIfEmpty(formState.clientInvoiceServiceName);
      }
      if (formState.clientInvoiceUnitPrice !== undefined) {
        dataToUpdate.clientInvoiceUnitPrice = formState.clientInvoiceUnitPrice;
      }
      if (formState.clientInvoiceServiceDescription !== undefined) {
        dataToUpdate.clientInvoiceServiceDescription = toNullIfEmpty(formState.clientInvoiceServiceDescription);
      }
      
      await updateProfile.mutateAsync({ id: consultantId, data: dataToUpdate });
      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Consultant profile updated successfully.',
      });
      navigate(`/consultants/${consultantId}`);
    } catch (error: any) {
      console.error('Failed to update consultant:', error);
      
      // Extract validation details if available
      const errorData = error?.response?.data;
      let errorMessage = error?.message || 'Failed to update consultant';
      
      if (errorData?.details && Array.isArray(errorData.details)) {
        console.log('Validation error details:', JSON.stringify(errorData.details, null, 2));
        const validationErrors = errorData.details.map((err: any) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        errorMessage = `Validation failed: ${validationErrors}`;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      }
      console.log('Full error response:', JSON.stringify(errorData, null, 2));
      
      toast({
        title: 'Update failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async (documentType: 'cnh' | 'address_proof', file: File) => {
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Only JPEG and PNG files are allowed',
        variant: 'destructive',
      });
      return;
    }

    setUploadingDocument(documentType);
    try {
      await uploadDocument.mutateAsync({ consultantId, documentType, file });
      toast({
        title: 'Document uploaded successfully',
        description: `${documentType === 'cnh' ? 'CNH' : 'Address proof'} photo has been saved.`,
      });
      // Reset file input
      const input = document.getElementById(documentType === 'cnh' ? 'cnhPhoto' : 'addressProofPhoto') as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      toast({
        title: 'Upload failed',
        description: error?.response?.data?.message || error?.message || 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingDocument(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link to={`/consultants/${consultantId}`}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Profile</h1>
            <p className="text-sm sm:text-base text-gray-600">{consultant.name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formState.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="hourlyRate">Hourly Rate (USD) *</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={formState.hourlyRate || ''}
                  onChange={(e) => handleInputChange('hourlyRate', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formState.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formState.phone || ''}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    handleInputChange('phone', formatted);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formState.birthDate || ''}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formState.startDate || ''}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="shirtSize">Shirt Size</Label>
                <Select
                  value={formState.shirtSize || ''}
                  onValueChange={(value) => handleInputChange('shirtSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P">P</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="G">G</SelectItem>
                    <SelectItem value="GG">GG</SelectItem>
                    <SelectItem value="GGG">GGG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="terminationDate">Termination Date</Label>
                <div className="flex gap-2">
                  <Input
                    id="terminationDate"
                    type="date"
                    value={formatDateForInput(formState.terminationDate) || ''}
                    onChange={(e) => handleInputChange('terminationDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="flex-1"
                  />
                  {formState.terminationDate && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleInputChange('terminationDate', null)}
                      className="flex-shrink-0"
                      title="Clear date"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="role">Invoice Role</Label>
                <Input
                  id="role"
                  value={formState.role || ''}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  placeholder="e.g., Senior Software Developer I"
                />
                <p className="text-xs text-gray-500 mt-1">Used as service name on invoices</p>
              </div>
              <div>
                <Label htmlFor="clientInvoiceServiceName">Client Invoice Service Name</Label>
                <Input
                  id="clientInvoiceServiceName"
                  value={formState.clientInvoiceServiceName || ''}
                  onChange={(e) => handleInputChange('clientInvoiceServiceName', e.target.value)}
                  placeholder="Defaults to Invoice Role if empty"
                />
                <p className="text-xs text-gray-500 mt-1">Overrides service name used on client invoices</p>
              </div>
              <div>
                <Label htmlFor="clientInvoiceUnitPrice">Client Invoice Unit Price (USD)</Label>
                <Input
                  id="clientInvoiceUnitPrice"
                  type="number"
                  step="0.01"
                  value={formState.clientInvoiceUnitPrice ?? ''}
                  onChange={(e) =>
                    handleInputChange(
                      'clientInvoiceUnitPrice',
                      e.target.value === '' ? null : (parseFloat(e.target.value) || 0)
                    )
                  }
                  placeholder="e.g., 5410.77"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Monthly unit price billed to the client (used for invoice totals)
                </p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="serviceDescription">Service Description</Label>
                <Textarea
                  id="serviceDescription"
                  value={formState.serviceDescription || ''}
                  onChange={(e) => handleInputChange('serviceDescription', e.target.value)}
                  placeholder="Description of services provided (used in invoice line items)"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="clientInvoiceServiceDescription">Client Invoice Description (Base)</Label>
                <Textarea
                  id="clientInvoiceServiceDescription"
                  value={formState.clientInvoiceServiceDescription || ''}
                  onChange={(e) => handleInputChange('clientInvoiceServiceDescription', e.target.value)}
                  placeholder="Base description used on client invoice line items (consultant names are appended automatically)"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use this to match the exact Omnigo invoice wording for this consultant's billed role
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formState.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="neighborhood">Neighborhood</Label>
                <Input
                  id="neighborhood"
                  value={formState.neighborhood || ''}
                  onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formState.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formState.state || ''}
                  onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formState.cep || ''}
                  onChange={(e) => {
                    const formatted = formatCEP(e.target.value);
                    if (formatted.length <= 9) {
                      handleInputChange('cep', formatted);
                    }
                  }}
                  maxLength={9}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Data */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="companyLegalName">Legal Name</Label>
                <Input
                  id="companyLegalName"
                  value={formState.companyLegalName || ''}
                  onChange={(e) => handleInputChange('companyLegalName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="companyTradeName">Trade Name</Label>
                <Input
                  id="companyTradeName"
                  value={formState.companyTradeName || ''}
                  onChange={(e) => handleInputChange('companyTradeName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="payoneerID">Payoneer ID</Label>
                <Input
                  id="payoneerID"
                  value={formState.payoneerID || ''}
                  onChange={(e) => handleInputChange('payoneerID', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formState.cnpj || ''}
                  onChange={(e) => {
                    const formatted = formatCNPJ(e.target.value);
                    if (formatted.length <= 18) {
                      handleInputChange('cnpj', formatted);
                    }
                  }}
                  maxLength={18}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContactName">Name</Label>
                <Input
                  id="emergencyContactName"
                  value={formState.emergencyContactName || ''}
                  onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="emergencyContactRelation">Relation</Label>
                <Input
                  id="emergencyContactRelation"
                  value={formState.emergencyContactRelation || ''}
                  onChange={(e) => handleInputChange('emergencyContactRelation', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="emergencyContactPhone">Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  value={formState.emergencyContactPhone || ''}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    handleInputChange('emergencyContactPhone', formatted);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formState.cpf || ''}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value);
                    if (formatted.length <= 14) {
                      handleInputChange('cpf', formatted);
                    }
                  }}
                  maxLength={14}
                />
              </div>
              <div></div>
              
              <div>
                <Label htmlFor="cnhPhoto">CNH Photo</Label>
                <div className="space-y-2">
                  {consultant.cnhPhotoPath && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Document uploaded</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      id="cnhPhoto"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload('cnh', file);
                        }
                      }}
                      disabled={uploadingDocument === 'cnh'}
                      className="flex-1"
                    />
                    {uploadingDocument === 'cnh' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">Formats: JPEG, PNG (max. 5MB)</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="addressProofPhoto">Address Proof Photo</Label>
                <div className="space-y-2">
                  {consultant.addressProofPhotoPath && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Document uploaded</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      id="addressProofPhoto"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload('address_proof', file);
                        }
                      }}
                      disabled={uploadingDocument === 'address_proof'}
                      className="flex-1"
                    />
                    {uploadingDocument === 'address_proof' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">Formats: JPEG, PNG (max. 5MB)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formState.evaluationNotes || ''}
              onChange={(e) => handleInputChange('evaluationNotes', e.target.value)}
              placeholder="Additional notes about the consultant..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Bonus Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bonus Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="yearlyBonus">Yearly Bonus (USD)</Label>
                <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                  $3,111.00
                </div>
                <p className="text-sm text-gray-500 mt-1">Global bonus amount (same for all consultants)</p>
              </div>
              <div>
                <Label htmlFor="bonusMonth">Bonus Month</Label>
                <Select
                  value={formState.bonusMonth?.toString() || ''}
                  onValueChange={(value) => handleInputChange('bonusMonth', value ? parseInt(value) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None">
                      {formState.bonusMonth 
                        ? getMonthsList().find(m => m.value === formState.bonusMonth)?.label 
                        : 'None'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {getMonthsList().map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">Month when consultant receives yearly bonus</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Equipment Management */}
      <EquipmentManagement 
        consultantId={consultantId} 
        isTerminated={!!consultant.terminationDate}
      />

      {/* Termination Workflow */}
      <TerminationWorkflow consultantId={consultantId} />

      {/* Submit Actions */}
      <div className="space-y-6">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
            <Link to={`/consultants/${consultantId}`} className="w-full sm:w-auto">
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={updateProfile.isPending || !hasChanges}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
