import type { UpdateConsultantProfileRequest } from '@vsol-admin/shared';

// Determine API base URL
// Priority: 1) VITE_API_URL env var, 2) Auto-detect from current hostname, 3) Use proxy
let API_BASE_URL = import.meta.env.VITE_API_URL;

// If accessing from localhost, always use the Vite proxy to avoid CORS issues
// This overrides VITE_API_URL when accessing from localhost
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  API_BASE_URL = '/api';
}

// If VITE_API_URL is not set, try to auto-detect from current location
// This handles remote browser access where localhost won't work
if (!API_BASE_URL || API_BASE_URL === '/api') {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If accessing from a remote IP (not localhost/127.0.0.1), use that IP for API
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      // Remote IP access - construct API URL using same hostname
      API_BASE_URL = `http://${hostname}:2020/api`;
      console.log(`[API Client] Detected remote access from ${hostname}, using API URL: ${API_BASE_URL}`);
    } else if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Hostname-based access (e.g., vsol-aurora.home) - construct API URL
      API_BASE_URL = `http://${hostname}:2020/api`;
      console.log(`[API Client] Detected hostname access from ${hostname}, using API URL: ${API_BASE_URL}`);
    } else {
      // Localhost access - use proxy
      API_BASE_URL = '/api';
    }
  } else {
    // Server-side or fallback - use proxy
    API_BASE_URL = '/api';
  }
}

// Validate and normalize the API base URL
if (API_BASE_URL && !API_BASE_URL.startsWith('/') && !API_BASE_URL.startsWith('http')) {
  // If it's malformed (e.g., ":2021/api"), default to proxy
  console.warn('Invalid VITE_API_URL format, using proxy:', API_BASE_URL);
  API_BASE_URL = '/api';
}

// Ensure API_BASE_URL is never empty - default to proxy if somehow empty
if (!API_BASE_URL) {
  console.warn('[API Client] API_BASE_URL is empty, defaulting to /api proxy');
  API_BASE_URL = '/api';
}

// Ensure trailing slash is removed for consistency
if (API_BASE_URL.endsWith('/')) {
  API_BASE_URL = API_BASE_URL.slice(0, -1);
}

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
    options: RequestInit = {},
    retryOnAuthError: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type for JSON, not for FormData (browser will set it with boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (fetchError: any) {
      // Re-throw with more context
      const enhancedError = new Error(`Network error: ${fetchError?.message || 'Unknown error'} (URL: ${url})`);
      (enhancedError as any).originalError = fetchError;
      throw enhancedError;
    }

    // Handle 403/401 errors by attempting token refresh (except for auth endpoints)
    if (!response.ok && (response.status === 403 || response.status === 401) && retryOnAuthError && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      // Try to refresh the token
      try {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          const tokens = await this.refreshAccessToken();
          this.setToken(tokens.accessToken);
          this.setRefreshToken(tokens.refreshToken);
          
          // Retry the original request with new token
          headers['Authorization'] = `Bearer ${tokens.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          
          if (retryResponse.ok) {
            try {
              return await retryResponse.json();
            } catch (jsonError) {
              throw new Error(`Invalid JSON response from server: ${jsonError}`);
            }
          }
          // If retry also fails, fall through to error handling below
        } else {
          // No refresh token available - clear any stale access token
          this.setToken(null);
        }
      } catch (refreshError) {
        // Token refresh failed, clear tokens and let the error propagate
        this.setToken(null);
        this.setRefreshToken(null);
        // Fall through to error handling below
      }
    }

    if (!response.ok) {
      let errorData: any = {};
      const contentType = response.headers.get('content-type');
      
      try {
        // Clone the response to avoid consuming the body
        const clonedResponse = response.clone();
        
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await clonedResponse.json();
          } catch (jsonError) {
            // If JSON parsing fails, try text
            const text = await response.text();
            errorData = text ? { error: text } : { error: `HTTP ${response.status} ${response.statusText}` };
          }
        } else {
          // If not JSON, get text
          const text = await response.text();
          errorData = text ? { error: text } : { error: `HTTP ${response.status} ${response.statusText}` };
        }
      } catch (parseError) {
        // If all parsing fails, create a generic error
        errorData = { error: `HTTP ${response.status} ${response.statusText || 'Unknown error'}` };
      }
      
      // Ensure errorData is an object
      if (typeof errorData !== 'object' || errorData === null || Array.isArray(errorData)) {
        errorData = { error: String(errorData) || `HTTP ${response.status}` };
      }
      
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      const error = new Error(errorMessage);
      (error as any).response = { data: errorData, status: response.status };
      throw error;
    }

    try {
      return await response.json();
    } catch (jsonError) {
      // If response is not JSON, return empty object or handle appropriately
      throw new Error(`Invalid JSON response from server: ${jsonError}`);
    }
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

  getToken(): string | null {
    return this.token;
  }

  async downloadConsultantDocument(consultantId: number, documentType: 'cnh' | 'address_proof'): Promise<Blob> {
    const url = this.getConsultantDocumentUrl(consultantId, documentType);
    const headers: Record<string, string> = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        try {
          const refreshToken = this.getRefreshToken();
          if (refreshToken) {
            const tokens = await this.refreshAccessToken();
            this.setToken(tokens.accessToken);
            this.setRefreshToken(tokens.refreshToken);
            
            // Retry with new token
            headers['Authorization'] = `Bearer ${tokens.accessToken}`;
            const retryResponse = await fetch(url, {
              method: 'GET',
              headers,
            });
            
            if (retryResponse.ok) {
              return await retryResponse.blob();
            }
          }
        } catch (refreshError) {
          // Refresh failed
        }
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      (error as any).response = { data: errorData, status: response.status };
      throw error;
    }

    return await response.blob();
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

  // Company methods
  async getCompany() {
    return this.request<any>('/companies');
  }

  async updateCompany(data: any) {
    return this.request<any>('/companies', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Client methods
  async getClients() {
    return this.request<any[]>('/clients');
  }

  async getClient(id: number) {
    return this.request<any>(`/clients/${id}`);
  }

  async createClient(data: any) {
    return this.request<any>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: number, data: any) {
    return this.request<any>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: number) {
    return this.request<any>(`/clients/${id}`, {
      method: 'DELETE',
    });
  }

  // Client invoice methods
  async getClientInvoices(cycleId?: number, status?: string) {
    const params = new URLSearchParams();
    if (cycleId) params.append('cycleId', cycleId.toString());
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/client-invoices${query}`);
  }

  async getClientInvoice(id: number) {
    return this.request<any>(`/client-invoices/${id}`);
  }

  async getClientInvoiceByCycle(cycleId: number) {
    return this.request<any>(`/client-invoices/cycle/${cycleId}`);
  }

  async createClientInvoice(data: any) {
    return this.request<any>('/client-invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createClientInvoiceFromCycle(cycleId: number) {
    return this.request<any>(`/client-invoices/from-cycle/${cycleId}`, {
      method: 'POST',
    });
  }

  async updateClientInvoice(id: number, data: any) {
    return this.request<any>(`/client-invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateClientInvoiceStatus(id: number, status: string) {
    return this.request<any>(`/client-invoices/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async deleteClientInvoice(id: number) {
    return this.request<any>(`/client-invoices/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoice line item methods
  async getInvoiceLineItems(invoiceId: number) {
    return this.request<any[]>(`/invoice-line-items/invoice/${invoiceId}`);
  }

  async createInvoiceLineItem(data: any) {
    return this.request<any>('/invoice-line-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoiceLineItem(id: number, data: any) {
    return this.request<any>(`/invoice-line-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoiceLineItem(id: number) {
    return this.request<any>(`/invoice-line-items/${id}`, {
      method: 'DELETE',
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
  async calculatePayment(cycleId: number, noBonus: boolean = false) {
    return this.request<any>(`/cycles/${cycleId}/calculate-payment`, {
      method: 'POST',
      body: JSON.stringify({ noBonus }),
    });
  }

  // Receipt methods
  async sendReceipt(cycleId: number, receiptAmount: number, recipientEmail?: string, invoiceNumber?: number) {
    return this.request<any>(`/cycles/${cycleId}/send-receipt`, {
      method: 'POST',
      body: JSON.stringify({ receiptAmount, recipientEmail, invoiceNumber }),
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
    try {
      const response = await this.request<{ 
        token?: string; 
        accessToken?: string;
        refreshToken?: string;
        user: any;
        mustChangePassword?: boolean;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      // If password change is required, don't store tokens
      if (response.mustChangePassword) {
        return response;
      }

      // Store refresh token
      if (response.refreshToken) {
        this.setRefreshToken(response.refreshToken);
      }

      return response;
    } catch (error: any) {
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Consultant portal methods
  async getConsultantCycles() {
    return this.request('/consultant/cycles');
  }

  async uploadInvoice(cycleId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('cycleId', cycleId.toString());

    return this.request('/consultant/invoices', {
      method: 'POST',
      headers: {
        // Don't set Content-Type - browser will set it with boundary
      },
      body: formData,
    }, false); // Don't retry on auth error for file uploads
  }

  async getConsultantInvoices() {
    return this.request('/consultant/invoices');
  }

  async getConsultantInvoice(cycleId: number) {
    return this.request(`/consultant/invoices/${cycleId}`);
  }

  async downloadConsultantInvoice(cycleId: number): Promise<Blob> {
    const url = `${this.baseURL}/consultant/invoices/${cycleId}/download`;
    const headers: Record<string, string> = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        try {
          const refreshToken = this.getRefreshToken();
          if (refreshToken) {
            const tokens = await this.refreshAccessToken();
            this.setToken(tokens.accessToken);
            this.setRefreshToken(tokens.refreshToken);
            
            // Retry with new token
            headers['Authorization'] = `Bearer ${tokens.accessToken}`;
            const retryResponse = await fetch(url, {
              method: 'GET',
              headers,
            });
            
            if (retryResponse.ok) {
              return await retryResponse.blob();
            }
          }
        } catch (refreshError) {
          // Refresh failed
        }
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      const error = new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      (error as any).response = { data: errorData, status: response.status };
      throw error;
    }

    return await response.blob();
  }

  async getConsultantProfile() {
    return this.request('/consultant/profile');
  }

  async updateConsultantProfile(data: UpdateConsultantProfileRequest) {
    return this.request('/consultant/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getConsultantEquipment() {
    return this.request('/consultant/equipment');
  }

  async createConsultantEquipment(data: any) {
    return this.request('/consultant/equipment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateConsultantEquipment(equipmentId: number, data: any) {
    return this.request(`/consultant/equipment/${equipmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Vacation methods
  async getVacations(consultantId?: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (consultantId) {
      return this.request(`/vacations/consultant/${consultantId}${startDate ? `?startDate=${startDate}` : ''}${endDate ? `${startDate ? '&' : '?'}endDate=${endDate}` : ''}`);
    }
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.request(`/vacations${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getVacationBalances(referenceDate?: string) {
    const params = referenceDate ? `?referenceDate=${referenceDate}` : '';
    return this.request(`/vacations/balances${params}`);
  }

  async getVacationBalance(consultantId: number, referenceDate?: string) {
    const params = referenceDate ? `?referenceDate=${referenceDate}` : '';
    return this.request(`/vacations/consultant/${consultantId}/balance${params}`);
  }

  async getVacationCalendar(startDate: string, endDate: string) {
    return this.request(`/vacations/calendar?startDate=${startDate}&endDate=${endDate}`);
  }

  async createVacationDay(data: any) {
    return this.request('/vacations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createVacationRange(data: any) {
    return this.request('/vacations/range', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVacationDay(id: number, data: any) {
    return this.request(`/vacations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVacationDay(id: number) {
    return this.request(`/vacations/${id}`, {
      method: 'DELETE',
    });
  }

  // User management methods (admin only)
  async getConsultantUsers() {
    return this.request('/users/consultants');
  }

  async resetUserPassword(userId: number, sendEmail: boolean = false) {
    return this.request(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ sendEmail }),
    });
  }

  async sendUserCredentials(userId: number) {
    return this.request(`/users/${userId}/send-credentials`, {
      method: 'POST',
    });
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
