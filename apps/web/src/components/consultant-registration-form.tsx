import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { CreateConsultantRequest } from '@vsol-admin/shared';
import { getMonthsList } from '@/lib/utils';

interface ConsultantRegistrationFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  loading?: boolean;
}

interface FormState extends Omit<CreateConsultantRequest, 'birthDate' | 'startDate'> {
  birthDate: string;
  startDate: string;
  cnhPhoto?: File;
  addressProofPhoto?: File;
}

export default function ConsultantRegistrationForm({ onSubmit, loading = false }: ConsultantRegistrationFormProps) {
  const [formState, setFormState] = useState<FormState>({
    name: '',
    hourlyRate: 0,
    startDate: new Date().toISOString().split('T')[0],
    evaluationNotes: '',
    // Personal Data
    email: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
    phone: '',
    birthDate: '',
    shirtSize: undefined,
    // Company Data
    companyLegalName: '',
    companyTradeName: '',
    cnpj: '',
    payoneerID: '',
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: '',
    // Documents
    cpf: '',
    // Bonus
    yearlyBonus: undefined,
    bonusMonth: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof FormState, value: string | number | File | undefined) => {
    setFormState(prev => ({ ...prev, [field]: value }));
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
    
    // Create FormData for multipart upload
    const formData = new FormData();
    
    // Add all text fields
    Object.entries(formState).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && !(value instanceof File)) {
        formData.append(key, value.toString());
      }
    });

    // Add files if present
    if (formState.cnhPhoto) {
      formData.append('cnhPhoto', formState.cnhPhoto);
    }
    if (formState.addressProofPhoto) {
      formData.append('addressProofPhoto', formState.addressProofPhoto);
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={formState.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Arthur Francisco Félix da Silva"
              required
            />
          </div>
          <div>
            <Label htmlFor="hourlyRate">Taxa Horária (USD) *</Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              value={formState.hourlyRate || ''}
              onChange={(e) => handleInputChange('hourlyRate', parseFloat(e.target.value) || 0)}
              placeholder="25.00"
              required
            />
          </div>
          <div>
            <Label htmlFor="startDate">Data de Início</Label>
            <Input
              id="startDate"
              type="date"
              value={formState.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formState.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="adm.thurbecode@outlook.com"
            />
          </div>
        </div>
      </Card>

      {/* Personal Data */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dados Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formState.cpf}
              onChange={(e) => {
                const formatted = formatCPF(e.target.value);
                if (formatted.length <= 14) {
                  handleInputChange('cpf', formatted);
                }
              }}
              placeholder="137.257.707-60"
              maxLength={14}
            />
          </div>
          <div>
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              value={formState.birthDate}
              onChange={(e) => handleInputChange('birthDate', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formState.phone}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                handleInputChange('phone', formatted);
              }}
              placeholder="+55 21 96971-6663"
            />
          </div>
          <div>
            <Label htmlFor="shirtSize">Tamanho da Camisa</Label>
            <Select onValueChange={(value) => handleInputChange('shirtSize', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tamanho" />
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
        </div>
      </Card>

      {/* Address */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="address">Rua e Número</Label>
            <Input
              id="address"
              value={formState.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Rua Hermengarda, nº 515 – Apto 601"
            />
          </div>
          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              value={formState.neighborhood}
              onChange={(e) => handleInputChange('neighborhood', e.target.value)}
              placeholder="Méier"
            />
          </div>
          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={formState.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="Rio de Janeiro"
            />
          </div>
          <div>
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              value={formState.state}
              onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
              placeholder="RJ"
              maxLength={2}
            />
          </div>
          <div>
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              value={formState.cep}
              onChange={(e) => {
                const formatted = formatCEP(e.target.value);
                if (formatted.length <= 9) {
                  handleInputChange('cep', formatted);
                }
              }}
              placeholder="20710-010"
              maxLength={9}
            />
          </div>
        </div>
      </Card>

      {/* Company Data */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Dados da Empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="companyLegalName">Razão Social</Label>
            <Input
              id="companyLegalName"
              value={formState.companyLegalName}
              onChange={(e) => handleInputChange('companyLegalName', e.target.value)}
              placeholder="ARTHUR FELIX SOLUCOES INTELIGENTES EM SOFTWARE LTDA"
            />
          </div>
          <div>
            <Label htmlFor="companyTradeName">Nome Fantasia</Label>
            <Input
              id="companyTradeName"
              value={formState.companyTradeName}
              onChange={(e) => handleInputChange('companyTradeName', e.target.value)}
              placeholder="THUR BE CODE"
            />
          </div>
          <div>
            <Label htmlFor="payoneerID">Payoneer ID</Label>
            <Input
              id="payoneerID"
              value={formState.payoneerID}
              onChange={(e) => handleInputChange('payoneerID', e.target.value)}
              placeholder="48617898"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={formState.cnpj}
              onChange={(e) => {
                const formatted = formatCNPJ(e.target.value);
                if (formatted.length <= 18) {
                  handleInputChange('cnpj', formatted);
                }
              }}
              placeholder="44.577.002/0001-13"
              maxLength={18}
            />
          </div>
        </div>
      </Card>

      {/* Emergency Contact */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Contato de Emergência</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergencyContactName">Nome</Label>
            <Input
              id="emergencyContactName"
              value={formState.emergencyContactName}
              onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
              placeholder="Fernanda"
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactRelation">Relação</Label>
            <Input
              id="emergencyContactRelation"
              value={formState.emergencyContactRelation}
              onChange={(e) => handleInputChange('emergencyContactRelation', e.target.value)}
              placeholder="Esposa"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="emergencyContactPhone">Telefone</Label>
            <Input
              id="emergencyContactPhone"
              value={formState.emergencyContactPhone}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                handleInputChange('emergencyContactPhone', formatted);
              }}
              placeholder="+55 21 96660-4765"
            />
          </div>
        </div>
      </Card>

      {/* Documents */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Documentos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cnhPhoto">Foto da CNH</Label>
            <Input
              id="cnhPhoto"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleInputChange('cnhPhoto', file);
              }}
            />
            <p className="text-sm text-gray-500 mt-1">Formatos aceitos: JPEG, PNG (máx. 5MB)</p>
          </div>
          <div>
            <Label htmlFor="addressProofPhoto">Foto da Prova de Endereço</Label>
            <Input
              id="addressProofPhoto"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleInputChange('addressProofPhoto', file);
              }}
            />
            <p className="text-sm text-gray-500 mt-1">Formatos aceitos: JPEG, PNG (máx. 5MB)</p>
          </div>
        </div>
      </Card>

      {/* Evaluation Notes */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Observações</h3>
        <div>
          <Label htmlFor="evaluationNotes">Notas de Avaliação</Label>
          <Textarea
            id="evaluationNotes"
            value={formState.evaluationNotes}
            onChange={(e) => handleInputChange('evaluationNotes', e.target.value)}
            placeholder="Informações adicionais sobre o consultor..."
            rows={4}
          />
        </div>
      </Card>

      {/* Bonus Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Informações de Bônus</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="yearlyBonus">Bônus Anual (USD)</Label>
            <Input
              id="yearlyBonus"
              type="number"
              step="0.01"
              value={formState.yearlyBonus || ''}
              onChange={(e) => handleInputChange('yearlyBonus', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>
          <div>
            <Label htmlFor="bonusMonth">Mês do Bônus</Label>
            <Select
              value={formState.bonusMonth?.toString() || ''}
              onValueChange={(value) => handleInputChange('bonusMonth', value ? parseInt(value) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum">
                  {formState.bonusMonth 
                    ? getMonthsList().find(m => m.value === formState.bonusMonth)?.label 
                    : 'Nenhum'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {getMonthsList().map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">Mês em que o consultor recebe o bônus anual</p>
          </div>
        </div>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Consultor'}
        </Button>
      </div>
    </form>
  );
}
