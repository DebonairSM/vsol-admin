const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      (error as any).response = { data: errorData, status: response.status };
      throw error;
    }

    return response.json();
  }

  // Auth methods
  async login(username: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Consultant methods
  async getConsultants() {
    return this.request<any[]>('/consultants');
  }

  async getActiveConsultants() {
    return this.request<any[]>('/consultants/active');
  }

  async getConsultant(id: number) {
    return this.request<any>(`/consultants/${id}`);
  }

  async createConsultant(data: any) {
    return this.request<any>('/consultants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateConsultant(id: number, data: any) {
    return this.request<any>(`/consultants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadConsultantDocument(
    consultantId: number,
    documentType: 'cnh' | 'address_proof',
    file: File
  ) {
    const formData = new FormData();
    formData.append('document', file);
    
    const url = `${this.baseURL}/consultants/${consultantId}/documents/${documentType}`;
    const headers: Record<string, string> = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      (error as any).response = { data: errorData, status: response.status };
      throw error;
    }

    return response.json();
  }

  getConsultantDocumentUrl(consultantId: number, documentType: 'cnh' | 'address_proof') {
    return `${this.baseURL}/consultants/${consultantId}/documents/${documentType}`;
  }

  async generateConsultantContract(consultantId: number): Promise<void> {
    const url = `${this.baseURL}/consultants/${consultantId}/contract`;
    const headers: Record<string, string> = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      (error as any).response = { data: errorData, status: response.status };
      throw error;
    }

    // Handle file download
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'contract.txt';
    if (contentDisposition) {
      const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
      if (matches) {
        filename = matches[1];
      }
    }
    
    // Create blob and trigger download
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  }

  async deleteConsultant(id: number) {
    return this.request<any>(`/consultants/${id}`, {
      method: 'DELETE',
    });
  }

  // Cycle methods
  async getCycles() {
    return this.request<any[]>('/cycles');
  }

  async getCycle(id: number) {
    return this.request<any>(`/cycles/${id}`);
  }

  async getCycleSummary(id: number) {
    return this.request<any>(`/cycles/${id}/summary`);
  }

  async getCycleLines(id: number) {
    return this.request<any[]>(`/cycles/${id}/lines`);
  }

  async createCycle(data: any) {
    return this.request<any>('/cycles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCycle(id: number, data: any) {
    return this.request<any>(`/cycles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateLineItem(cycleId: number, lineId: number, data: any) {
    return this.request<any>(`/cycles/${cycleId}/lines/${lineId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Invoice methods
  async getInvoices(cycleId?: number) {
    const query = cycleId ? `?cycleId=${cycleId}` : '';
    return this.request<any[]>(`/invoices${query}`);
  }

  async createInvoice(data: any) {
    return this.request<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: number, data: any) {
    return this.request<any>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Payment methods
  async getPayments(cycleId?: number) {
    const query = cycleId ? `?cycleId=${cycleId}` : '';
    return this.request<any[]>(`/payments${query}`);
  }

  async createPayment(data: any) {
    return this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: number) {
    return this.request<any>(`/payments/${id}`, {
      method: 'DELETE',
    });
  }

  // Payment calculation
  async calculatePayment(cycleId: number) {
    return this.request<any>(`/cycles/${cycleId}/calculate-payment`, {
      method: 'POST',
    });
  }

  // Work hours methods
  async getWorkHours() {
    return this.request<any[]>('/work-hours');
  }

  async getWorkHoursByYear(year: number) {
    return this.request<any[]>(`/work-hours/${year}`);
  }

  async getSuggestedWorkHours(monthLabel: string) {
    return this.request<{ suggestedHours: number | null }>(`/work-hours/suggestion/${encodeURIComponent(monthLabel)}`);
  }

  async importWorkHours(jsonContent: string) {
    return this.request<any>('/work-hours/import', {
      method: 'POST',
      body: JSON.stringify({ jsonContent }),
    });
  }

  async deleteWorkHoursYear(year: number) {
    return this.request<any>(`/work-hours/${year}`, {
      method: 'DELETE',
    });
  }

  // Audit methods
  async getAuditLogs(params?: { cycleId?: number; userId?: number; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.cycleId) query.append('cycleId', params.cycleId.toString());
    if (params?.userId) query.append('userId', params.userId.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    
    const queryString = query.toString();
    return this.request<any[]>(`/audit${queryString ? `?${queryString}` : ''}`);
  }

  // Equipment methods
  async getEquipment(consultantId?: number) {
    const query = consultantId ? `?consultantId=${consultantId}` : '';
    return this.request<any[]>(`/equipment${query}`);
  }

  async getEquipmentById(id: number) {
    return this.request<any>(`/equipment/${id}`);
  }

  async createEquipment(data: any) {
    return this.request<any>('/equipment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEquipment(id: number, data: any) {
    return this.request<any>(`/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEquipment(id: number) {
    return this.request<any>(`/equipment/${id}`, {
      method: 'DELETE',
    });
  }

  async markEquipmentReturned(id: number, returnedDate?: string) {
    return this.request<any>(`/equipment/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(returnedDate ? { returnedDate } : {}),
    });
  }

  async getPendingReturns(consultantId?: number) {
    const query = consultantId ? `?consultantId=${consultantId}` : '';
    return this.request<any[]>(`/equipment/pending-returns${query}`);
  }

  // Time Doctor API methods
  async getTimeDoctorSyncStatus() {
    return this.request<any>('/time-doctor/status');
  }

  async syncAllTimeDoctorConsultants() {
    return this.request<any>('/time-doctor/sync');
  }

  async syncTimeDoctorConsultant(consultantId: number) {
    return this.request<any>(`/time-doctor/sync/${consultantId}`, {
      method: 'POST',
    });
  }

  async toggleTimeDoctorSync(consultantId: number, enabled: boolean) {
    return this.request<any>(`/time-doctor/consultant/${consultantId}/toggle-sync`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }

  async getTimeDoctorSettings() {
    return this.request<any>('/time-doctor/settings');
  }

  // Bonus workflow API methods
  async getBonusWorkflow(cycleId: number) {
    return this.request<any>(`/cycles/${cycleId}/bonus`);
  }

  async createBonusWorkflow(cycleId: number) {
    return this.request<any>(`/cycles/${cycleId}/bonus`, {
      method: 'POST',
    });
  }

  async updateBonusWorkflow(cycleId: number, data: any) {
    return this.request<any>(`/cycles/${cycleId}/bonus`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async generateBonusEmail(cycleId: number) {
    return this.request<any>(`/cycles/${cycleId}/bonus/generate-email`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
