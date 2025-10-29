import { useParams, Link, useNavigate } from 'react-router-dom';
import { useConsultantProfile, useUpdateConsultantProfile, useUploadConsultantDocument } from '@/hooks/use-consultant-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UpdateConsultantRequest } from '@vsol-admin/shared';
import { ArrowLeft, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import EquipmentManagement from '@/components/equipment-management';
import TerminationWorkflow from '@/components/termination-workflow';
import { getMonthsList } from '@/lib/utils';

export default function ConsultantEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const consultantId = parseInt(id!);
  
  const { data: consultant, isLoading, error } = useConsultantProfile(consultantId);
  const updateProfile = useUpdateConsultantProfile();
  const uploadDocument = useUploadConsultantDocument();

  const [formState, setFormState] = useState<UpdateConsultantRequest>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form state when consultant data loads
  useEffect(() => {
    if (consultant) {
      setFormState({
        name: consultant.name,
        hourlyRate: consultant.hourlyRate,
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
        birthDate: consultant.birthDate ? new Date(consultant.birthDate).toISOString().split('T')[0] : undefined,
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
        yearlyBonus: consultant.yearlyBonus,
        bonusMonth: consultant.bonusMonth,
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
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
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
      // Convert birthDate back to ISO string if it exists
      const dataToUpdate = { ...formState };
      if (dataToUpdate.birthDate) {
        dataToUpdate.birthDate = new Date(dataToUpdate.birthDate).toISOString();
      }
      
      await updateProfile.mutateAsync({ id: consultantId, data: dataToUpdate });
      setHasChanges(false);
      navigate(`/consultants/${consultantId}`);
    } catch (error) {
      console.error('Failed to update consultant:', error);
    }
  };

  const handleFileUpload = async (documentType: 'cnh' | 'address_proof', file: File) => {
    try {
      await uploadDocument.mutateAsync({ consultantId, documentType, file });
    } catch (error) {
      console.error('Failed to upload document:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to={`/consultants/${consultantId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
            <p className="text-gray-600">{consultant.name}</p>
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
                <Input
                  id="terminationDate"
                  type="date"
                  value={formState.terminationDate ? new Date(formState.terminationDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleInputChange('terminationDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
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
                />
                <p className="text-sm text-gray-500 mt-1">Formats: JPEG, PNG (max. 5MB)</p>
              </div>
              
              <div>
                <Label htmlFor="addressProofPhoto">Address Proof Photo</Label>
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
                />
                <p className="text-sm text-gray-500 mt-1">Formats: JPEG, PNG (max. 5MB)</p>
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
                <Input
                  id="yearlyBonus"
                  type="number"
                  step="0.01"
                  value={formState.yearlyBonus || ''}
                  onChange={(e) => handleInputChange('yearlyBonus', e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
              <div>
                <Label htmlFor="bonusMonth">Bonus Month</Label>
                <Select
                  value={formState.bonusMonth?.toString() || ''}
                  onValueChange={(value) => handleInputChange('bonusMonth', value ? parseInt(value) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Month" />
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
          <div className="flex justify-end space-x-4">
            <Link to={`/consultants/${consultantId}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={updateProfile.isPending || !hasChanges}
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
