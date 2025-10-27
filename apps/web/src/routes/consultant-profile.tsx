import { useParams, Link, useNavigate } from 'react-router-dom';
import { useConsultantProfile, useDeleteConsultant } from '@/hooks/use-consultant-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, Edit, Trash2, Download, User, Building, Phone, MapPin, FileText, CreditCard, FileCheck } from 'lucide-react';
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

  const handleDownloadDocument = (documentType: 'cnh' | 'address_proof') => {
    const url = apiClient.getConsultantDocumentUrl(consultantId, documentType);
    window.open(url, '_blank');
  };

  const handleGenerateContract = async () => {
    setIsGeneratingContract(true);
    setContractError(null);
    
    try {
      const response = await apiClient.generateConsultantContract(consultantId);
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'contract.txt';
      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
        if (matches) {
          filename = matches[1];
        }
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="font-medium">{consultant.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Hourly Rate</label>
                <p className="font-mono font-medium">{formatCurrency(consultant.hourlyRate)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Start Date</label>
                <p>{formatDate(consultant.startDate)}</p>
              </div>
              {consultant.terminationDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Termination Date</label>
                  <p>{formatDate(consultant.terminationDate)}</p>
                </div>
              )}
              {consultant.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p>{consultant.email}</p>
                </div>
              )}
              {consultant.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p>{consultant.phone}</p>
                </div>
              )}
              {consultant.birthDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Birth Date</label>
                  <p>{formatDate(consultant.birthDate)}</p>
                </div>
              )}
              {consultant.shirtSize && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Shirt Size</label>
                  <p>{consultant.shirtSize}</p>
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
                <div>
                  <label className="text-sm font-medium text-gray-500">Trade Name</label>
                  <p className="font-medium">{consultant.companyTradeName}</p>
                </div>
              )}
              {consultant.companyLegalName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Legal Name</label>
                  <p>{consultant.companyLegalName}</p>
                </div>
              )}
              {consultant.cnpj && (
                <div>
                  <label className="text-sm font-medium text-gray-500">CNPJ</label>
                  <p className="font-mono">{consultant.cnpj}</p>
                </div>
              )}
              {consultant.payoneerID && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Payoneer ID</label>
                  <p className="font-mono text-blue-600">{consultant.payoneerID}</p>
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
            <CardContent className="space-y-2">
              {consultant.address && (
                <p>{consultant.address}</p>
              )}
              {consultant.neighborhood && (
                <p className="text-gray-600">{consultant.neighborhood}</p>
              )}
              <div className="flex gap-2">
                {consultant.city && <span>{consultant.city}</span>}
                {consultant.state && <span>- {consultant.state}</span>}
              </div>
              {consultant.cep && (
                <p className="text-sm text-gray-500">CEP: {consultant.cep}</p>
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
            <CardContent className="space-y-2">
              {consultant.emergencyContactName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p>{consultant.emergencyContactName}</p>
                </div>
              )}
              {consultant.emergencyContactRelation && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Relation</label>
                  <p>{consultant.emergencyContactRelation}</p>
                </div>
              )}
              {consultant.emergencyContactPhone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p>{consultant.emergencyContactPhone}</p>
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
                  <div>
                    <label className="text-sm font-medium text-gray-500">CPF</label>
                    <p className="font-mono">{consultant.cpf}</p>
                  </div>
                )}
                
                {consultant.cnhPhotoPath && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">CNH Photo</label>
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
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address Proof</label>
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
      </div>
    </div>
  );
}
