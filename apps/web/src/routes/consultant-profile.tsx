import { useParams, Link, useNavigate } from 'react-router-dom';
import { useConsultantProfile, useDeleteConsultant } from '@/hooks/use-consultant-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatMonthName } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Edit, Trash2, Download, User, Building, Phone, MapPin, FileText, FileCheck } from 'lucide-react';
import { useState } from 'react';

export default function ConsultantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const consultantId = parseInt(id!);
  
  const { data: consultant, isLoading, error } = useConsultantProfile(consultantId);
  const deleteConsultant = useDeleteConsultant();
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading consultant profile...</div>
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

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${consultant.name}? This action cannot be undone.`)) {
      try {
        await deleteConsultant.mutateAsync(consultantId);
        navigate('/consultants');
      } catch (error) {
        console.error('Failed to delete consultant:', error);
        alert('Failed to delete consultant. Check if they are used in any payroll cycles.');
      }
    }
  };

  const handleDownloadDocument = async (documentType: 'cnh' | 'address_proof') => {
    try {
      const blob = await apiClient.downloadConsultantDocument(consultantId, documentType);
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Open in new tab
      window.open(blobUrl, '_blank');
      
      // Clean up after a delay (give time for the tab to load)
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (error: any) {
      console.error('Failed to download document:', error);
      if (error.message?.includes('401') || error.message?.includes('Access token')) {
        alert('Session expired. Please log in again.');
        window.location.href = '/login';
      } else {
        alert(error.message || 'Failed to load document. Please try again.');
      }
    }
  };

  const handleGenerateContract = async () => {
    setIsGeneratingContract(true);
    setContractError(null);
    
    try {
      await apiClient.generateConsultantContract(consultantId);
    } catch (error: any) {
      console.error('Failed to generate contract:', error);
      setContractError(error.message || 'Failed to generate contract');
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const canGenerateContract = consultant && 
    consultant.name?.trim() && 
    consultant.companyLegalName?.trim() && 
    consultant.cnpj?.trim();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/consultants">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Consultants
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{consultant.name}</h1>
            <p className="text-gray-600">
              {consultant.companyTradeName || 'Consultant Profile'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={handleGenerateContract}
            disabled={isGeneratingContract || !canGenerateContract}
            title={!canGenerateContract ? 'Missing required fields: Name, Company Legal Name, or CNPJ' : 'Generate Master Services Agreement'}
          >
            <FileCheck className="w-4 h-4 mr-2" />
            {isGeneratingContract ? 'Generating...' : 'Generate Contract'}
          </Button>
          <Link to={`/consultants/${consultantId}/edit`}>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleteConsultant.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div>
        <Badge variant={consultant.terminationDate ? "destructive" : "secondary"} className="mb-4">
          {consultant.terminationDate ? 'Terminated' : 'Active'}
        </Badge>
      </div>

      {/* Contract Error Display */}
      {contractError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="text-red-700">
              <strong>Contract Generation Error:</strong> {contractError}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Name</label>
                <p className="text-base font-semibold text-gray-900">{consultant.name}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Hourly Rate</label>
                <p className="text-base font-mono font-semibold text-gray-900">{formatCurrency(consultant.hourlyRate)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Start Date</label>
                <p className="text-base text-gray-900">{formatDate(consultant.startDate)}</p>
              </div>
              {consultant.terminationDate && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Termination Date</label>
                  <p className="text-base text-gray-900">{formatDate(consultant.terminationDate)}</p>
                </div>
              )}
              {consultant.email && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
                  <p className="text-base text-gray-900">{consultant.email}</p>
                </div>
              )}
              {consultant.phone && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</label>
                  <p className="text-base text-gray-900">{consultant.phone}</p>
                </div>
              )}
              {consultant.birthDate && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Birth Date</label>
                  <p className="text-base text-gray-900">{formatDate(consultant.birthDate)}</p>
                </div>
              )}
              {consultant.shirtSize && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Shirt Size</label>
                  <p className="text-base text-gray-900">{consultant.shirtSize}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        {(consultant.companyLegalName || consultant.companyTradeName || consultant.cnpj || consultant.payoneerID) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {consultant.companyTradeName && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Trade Name</label>
                  <p className="text-base font-semibold text-gray-900">{consultant.companyTradeName}</p>
                </div>
              )}
              {consultant.companyLegalName && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Legal Name</label>
                  <p className="text-base text-gray-900">{consultant.companyLegalName}</p>
                </div>
              )}
              {consultant.cnpj && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">CNPJ</label>
                  <p className="text-base font-mono text-gray-900">{consultant.cnpj}</p>
                </div>
              )}
              {consultant.payoneerID && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Payoneer ID</label>
                  <p className="text-base font-mono font-semibold text-blue-600">{consultant.payoneerID}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Address Information */}
        {(consultant.address || consultant.city || consultant.state || consultant.cep) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {consultant.address && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Street Address</label>
                  <p className="text-base text-gray-900">{consultant.address}</p>
                </div>
              )}
              {consultant.neighborhood && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Neighborhood</label>
                  <p className="text-base text-gray-900">{consultant.neighborhood}</p>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">City & State</label>
                <div className="flex gap-2">
                  {consultant.city && <span className="text-base text-gray-900">{consultant.city}</span>}
                  {consultant.state && <span className="text-base text-gray-900">- {consultant.state}</span>}
                </div>
              </div>
              {consultant.cep && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">CEP</label>
                  <p className="text-base font-mono text-gray-900">{consultant.cep}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        {(consultant.emergencyContactName || consultant.emergencyContactPhone) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="w-5 h-5 mr-2" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {consultant.emergencyContactName && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Name</label>
                  <p className="text-base font-semibold text-gray-900">{consultant.emergencyContactName}</p>
                </div>
              )}
              {consultant.emergencyContactRelation && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Relation</label>
                  <p className="text-base text-gray-900">{consultant.emergencyContactRelation}</p>
                </div>
              )}
              {consultant.emergencyContactPhone && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</label>
                  <p className="text-base text-gray-900">{consultant.emergencyContactPhone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {(consultant.cpf || consultant.cnhPhotoPath || consultant.addressProofPhotoPath) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {consultant.cpf && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">CPF</label>
                    <p className="text-base font-mono text-gray-900">{consultant.cpf}</p>
                  </div>
                )}
                
                {consultant.cnhPhotoPath && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">CNH Photo</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDocument('cnh')}
                      className="mt-1 w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      View CNH
                    </Button>
                  </div>
                )}
                
                {consultant.addressProofPhotoPath && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Address Proof</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDocument('address_proof')}
                      className="mt-1 w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      View Proof
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluation Notes */}
        {consultant.evaluationNotes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Evaluation Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{consultant.evaluationNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Bonus Information */}
        {(consultant.bonusMonth || consultant.yearlyBonus) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Bonus Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {consultant.bonusMonth && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Bonus Month</label>
                    <p className="text-base font-semibold text-gray-900">{formatMonthName(consultant.bonusMonth) || 'Not set'}</p>
                  </div>
                )}
                {consultant.yearlyBonus && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Yearly Bonus</label>
                    <p className="text-base font-mono font-semibold text-gray-900">{formatCurrency(consultant.yearlyBonus)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
