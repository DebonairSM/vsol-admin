// Use Vite proxy in development (relative URL), or explicit URL if set
// When VITE_API_URL is not set, use relative URL which goes through Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

  async deleteCycle(id: number) {
    return this.request<any>(`/cycles/${id}`, {
      method: 'DELETE',
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

  async generateBonusEmail(cycleId: number, consultantId?: number | null) {
    return this.request<any>(`/cycles/${cycleId}/bonus/generate-email`, {
      method: 'POST',
      body: JSON.stringify({ consultantId }),
    });
  }

  // Settings methods
  async getSettings() {
    return this.request<any>('/settings');
  }

  async updateSettings(data: any) {
    return this.request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Backup methods
  async listBackups() {
    return this.request<{ backups: Array<{ filename: string; size: number; created: string; modified: string }>; backupDirectory: string }>('/backups');
  }

  async createBackup() {
    return this.request<{ 
      success: boolean; 
      message: string; 
      backup: { filename: string; size: number; created: string };
      deletedOldBackups: string[];
    }>('/backups/create', {
      method: 'POST',
    });
  }

  async restoreFromBackup(filename: string) {
    return this.request<{ success: boolean; message: string; preRestoreBackup: string | null }>('/backups/restore', {
      method: 'POST',
      body: JSON.stringify({ filename }),
    });
  }

  // System/Backup status methods
  async getBackupStatus() {
    return this.request<{
      backupDirectory: string;
      totalCount: number;
      lastBackup: {
        filename: string;
        created: string;
        timestamp: string;
        size: number;
      } | null;
      recentBackups: Array<{
        filename: string;
        created: string;
        timestamp: string;
        size: number;
      }>;
      environment: string;
    }>('/system/backup-status');
  }

  async triggerBackup() {
    return this.request<{
      success: boolean;
      message: string;
      backup: {
        filename: string;
        size: number;
        created: string;
      };
      deletedOldBackups: string[];
    }>('/system/backup-now', {
      method: 'POST',
    });
  }

  // Generic HTTP methods for extensibility
  async get<T = any>(endpoint: string): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint);
    return { data: result };
  }

  async post<T = any>(endpoint: string, body?: any): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data: result };
  }

  async put<T = any>(endpoint: string, body: any): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return { data: result };
  }

  async delete<T = any>(endpoint: string): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, {
      method: 'DELETE',
    });
    return { data: result };
  }

  // Store refresh token
  setRefreshToken(refreshToken: string | null) {
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    } else {
      localStorage.removeItem('refresh_token');
    }
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  // Refresh access token using refresh token
  async refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.message || errorData.error || 'Token refresh failed');
    }

    const data = await response.json();
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  }

  // Update login method to store refresh token
  async login(username: string, password: string) {
    const response = await this.request<{ 
      token: string; 
      accessToken: string;
      refreshToken: string;
      user: any 
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    // Store refresh token
    if (response.refreshToken) {
      this.setRefreshToken(response.refreshToken);
    }

    return response;
  }

  // Update logout to revoke refresh token
  async logout() {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    this.setRefreshToken(null);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
