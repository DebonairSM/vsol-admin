import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, X, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { UpdateConsultantProfileRequest } from '@vsol-admin/shared';

// Helper function to safely convert date to YYYY-MM-DD format
const formatDateForInput = (dateValue: any): string | undefined => {
  if (!dateValue) return undefined;
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return undefined;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return undefined;
  }
};

export default function ConsultantMyProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { data: profile, isLoading } = useQuery({
    queryKey: ['consultant-profile'],
    queryFn: () => apiClient.getConsultantProfile(),
  });

  const [formData, setFormData] = useState<UpdateConsultantProfileRequest>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      const p = profile as any; // Profile is sanitized consultant data
      setFormData({
        email: p.email || null,
        address: p.address || null,
        neighborhood: p.neighborhood || null,
        city: p.city || null,
        state: p.state || null,
        cep: p.cep || null,
        phone: p.phone || null,
        birthDate: p.birthDate ? new Date(p.birthDate).toISOString() : null,
        shirtSize: p.shirtSize || null,
        companyLegalName: p.companyLegalName || null,
        companyTradeName: p.companyTradeName || null,
        cnpj: p.cnpj || null,
        payoneerID: p.payoneerID || null,
        emergencyContactName: p.emergencyContactName || null,
        emergencyContactRelation: p.emergencyContactRelation || null,
        emergencyContactPhone: p.emergencyContactPhone || null,
        cpf: p.cpf || null,
      });
      setHasChanges(false);
      setIsEditing(false);
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async (data: UpdateConsultantProfileRequest) => {
      return apiClient.updateConsultantProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant-profile'] });
      toast({
        title: 'Success',
        description: 'Profile updated successfully.',
      });
      setHasChanges(false);
      setIsEditing(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update profile';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const changePassword = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      return apiClient.changePassword(currentPassword, newPassword);
    },
    onSuccess: () => {
      toast({
        title: 'Password Changed',
        description: 'Your password has been changed successfully. Please log in again.',
      });

      // Clear any stored tokens
      apiClient.setToken(null);
      apiClient.setRefreshToken(null);

      // Redirect to login
      navigate('/login', {
        state: {
          message: 'Password changed successfully. Please log in with your new password.'
        }
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to change password';
      setPasswordError(errorMessage);
    },
  });

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return null;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // Validate passwords
    const newPasswordError = validatePassword(newPassword);
    if (newPasswordError) {
      setPasswordError(newPasswordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    await changePassword.mutateAsync({ currentPassword, newPassword });
  };

  const handleFieldChange = (field: keyof UpdateConsultantProfileRequest, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? null : value,
    }));
    setHasChanges(true);
    setIsEditing(true);
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCancel = () => {
    if (profile) {
      const p = profile as any; // Profile is sanitized consultant data
      setFormData({
        email: p.email || null,
        address: p.address || null,
        neighborhood: p.neighborhood || null,
        city: p.city || null,
        state: p.state || null,
        cep: p.cep || null,
        phone: p.phone || null,
        birthDate: p.birthDate ? new Date(p.birthDate).toISOString() : null,
        shirtSize: p.shirtSize || null,
        companyLegalName: p.companyLegalName || null,
        companyTradeName: p.companyTradeName || null,
        cnpj: p.cnpj || null,
        payoneerID: p.payoneerID || null,
        emergencyContactName: p.emergencyContactName || null,
        emergencyContactRelation: p.emergencyContactRelation || null,
        emergencyContactPhone: p.emergencyContactPhone || null,
        cpf: p.cpf || null,
      });
    }
    setHasChanges(false);
    setIsEditing(false);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Prepare submit data - convert empty strings to null
    const submitData: UpdateConsultantProfileRequest = {
      email: formData.email || null,
      address: formData.address || null,
      neighborhood: formData.neighborhood || null,
      city: formData.city || null,
      state: formData.state || null,
      cep: formData.cep || null,
      phone: formData.phone || null,
      birthDate: formData.birthDate || null,
      shirtSize: formData.shirtSize || null,
      companyLegalName: formData.companyLegalName || null,
      companyTradeName: formData.companyTradeName || null,
      cnpj: formData.cnpj || null,
      payoneerID: formData.payoneerID || null,
      emergencyContactName: formData.emergencyContactName || null,
      emergencyContactRelation: formData.emergencyContactRelation || null,
      emergencyContactPhone: formData.emergencyContactPhone || null,
      cpf: formData.cpf || null,
    };

    await updateProfile.mutateAsync(submitData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">No profile data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and update your profile information
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Account Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account login credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={user?.username || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Your login username</p>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password (min 8 characters)"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>{passwordError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
              >
                {changePassword.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Your personal contact and address details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={(profile as any)?.name || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Name cannot be changed</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+55 11 1234-5678"
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="Street address"
              />
              {errors.address && (
                <p className="text-xs text-red-500 mt-1">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="neighborhood">Neighborhood</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood || ''}
                  onChange={(e) => handleFieldChange('neighborhood', e.target.value)}
                  placeholder="Neighborhood"
                />
                {errors.neighborhood && (
                  <p className="text-xs text-red-500 mt-1">{errors.neighborhood}</p>
                )}
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  placeholder="City"
                />
                {errors.city && (
                  <p className="text-xs text-red-500 mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state || ''}
                  onChange={(e) => handleFieldChange('state', e.target.value.toUpperCase())}
                  placeholder="RJ"
                  maxLength={2}
                />
                {errors.state && (
                  <p className="text-xs text-red-500 mt-1">{errors.state}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep || ''}
                  onChange={(e) => handleFieldChange('cep', e.target.value)}
                  placeholder="12345-678"
                />
                {errors.cep && (
                  <p className="text-xs text-red-500 mt-1">{errors.cep}</p>
                )}
              </div>

              <div>
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate ? formatDateForInput(formData.birthDate) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Preserve the selected date by appending local midnight time
                      const dateStr = e.target.value; // YYYY-MM-DD format
                      handleFieldChange('birthDate', `${dateStr}T00:00:00.000Z`);
                    } else {
                      handleFieldChange('birthDate', null);
                    }
                  }}
                />
                {errors.birthDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.birthDate}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="shirtSize">Shirt Size</Label>
              <Select
                value={formData.shirtSize || ''}
                onValueChange={(value) => handleFieldChange('shirtSize', value || null)}
              >
                <SelectTrigger id="shirtSize">
                  <SelectValue placeholder="Select shirt size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P">P</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="G">G</SelectItem>
                  <SelectItem value="GG">GG</SelectItem>
                  <SelectItem value="GGG">GGG</SelectItem>
                </SelectContent>
              </Select>
              {errors.shirtSize && (
                <p className="text-xs text-red-500 mt-1">{errors.shirtSize}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>
              Contact information for emergencies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emergencyContactName">Contact Name</Label>
              <Input
                id="emergencyContactName"
                value={formData.emergencyContactName || ''}
                onChange={(e) => handleFieldChange('emergencyContactName', e.target.value)}
                placeholder="Full name"
              />
              {errors.emergencyContactName && (
                <p className="text-xs text-red-500 mt-1">{errors.emergencyContactName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContactRelation">Relation</Label>
                <Input
                  id="emergencyContactRelation"
                  value={formData.emergencyContactRelation || ''}
                  onChange={(e) => handleFieldChange('emergencyContactRelation', e.target.value)}
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
                {errors.emergencyContactRelation && (
                  <p className="text-xs text-red-500 mt-1">{errors.emergencyContactRelation}</p>
                )}
              </div>

              <div>
                <Label htmlFor="emergencyContactPhone">Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  value={formData.emergencyContactPhone || ''}
                  onChange={(e) => handleFieldChange('emergencyContactPhone', e.target.value)}
                  placeholder="+55 11 1234-5678"
                />
                {errors.emergencyContactPhone && (
                  <p className="text-xs text-red-500 mt-1">{errors.emergencyContactPhone}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              Personal identification documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf || ''}
                onChange={(e) => handleFieldChange('cpf', e.target.value)}
                placeholder="000.000.000-00"
              />
              {errors.cpf && (
                <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              Your company details (if applicable)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyLegalName">Legal Name</Label>
                <Input
                  id="companyLegalName"
                  value={formData.companyLegalName || ''}
                  onChange={(e) => handleFieldChange('companyLegalName', e.target.value)}
                  placeholder="Company legal name"
                />
                {errors.companyLegalName && (
                  <p className="text-xs text-red-500 mt-1">{errors.companyLegalName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="companyTradeName">Trade Name</Label>
                <Input
                  id="companyTradeName"
                  value={formData.companyTradeName || ''}
                  onChange={(e) => handleFieldChange('companyTradeName', e.target.value)}
                  placeholder="Company trade name"
                />
                {errors.companyTradeName && (
                  <p className="text-xs text-red-500 mt-1">{errors.companyTradeName}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj || ''}
                onChange={(e) => handleFieldChange('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00"
              />
              {errors.cnpj && (
                <p className="text-xs text-red-500 mt-1">{errors.cnpj}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>
              Payment account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="payoneerID">Payoneer ID</Label>
              <Input
                id="payoneerID"
                value={formData.payoneerID || ''}
                onChange={(e) => handleFieldChange('payoneerID', e.target.value)}
                placeholder="Payoneer account ID"
              />
              {errors.payoneerID && (
                <p className="text-xs text-red-500 mt-1">{errors.payoneerID}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateProfile.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={updateProfile.isPending || !hasChanges}
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
