import axios, { AxiosInstance } from 'axios';
import { SettingsService } from './settings-service';
import { TimeDoctorUser, TimeDoctorActivity, TimeDoctorActivityParams } from '@vsol-admin/shared';

export class TimeDoctorService {
  private static axiosInstance: AxiosInstance | null = null;

  /**
   * Get or create axios instance configured with Time Doctor API credentials.
   * Retrieves API token and company ID from settings.
   */
  private static async getAxiosInstance(): Promise<AxiosInstance> {
    try {
      const apiToken = await SettingsService.getSetting('timedoctor_api_token');
      const companyId = await SettingsService.getSetting('timedoctor_company_id');
      const apiUrl = await SettingsService.getSetting('timedoctor_api_url').catch(() => 'https://api2.timedoctor.com/api/1.0');

      const instance = axios.create({
        baseURL: apiUrl,
        headers: {
          'Authorization': `JWT ${apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      // Store company ID for use in requests
      (instance as any).companyId = companyId;

      return instance;
    } catch (error) {
      throw new Error(`Time Doctor API configuration not found. Please configure Time Doctor credentials in Settings. Error: ${error}`);
    }
  }

  /**
   * Test Time Doctor API connection with current credentials.
   * Returns true if connection is successful, throws error otherwise.
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const instance = await this.getAxiosInstance();
      const companyId = (instance as any).companyId;
      
      // Try to fetch users to verify connection
      // Using a minimal request to test authentication
      const response = await instance.get(`/companies/${companyId}/users`, {
        params: { limit: 1 } // Fetch only 1 user to minimize data transfer
      });

      if (response.status === 200) {
        return {
          success: true,
          message: 'Successfully connected to Time Doctor API'
        };
      }

      return {
        success: false,
        message: `Unexpected response status: ${response.status}`
      };
    } catch (error: any) {
      if (error.response) {
        // API responded with error status
        return {
          success: false,
          message: `Time Doctor API error: ${error.response.status} - ${error.response.data?.message || error.message}`
        };
      } else if (error.request) {
        // Request made but no response
        return {
          success: false,
          message: 'No response from Time Doctor API. Please check your network connection.'
        };
      } else {
        // Error setting up request
        return {
          success: false,
          message: error.message || 'Failed to test Time Doctor API connection'
        };
      }
    }
  }

  /**
   * Fetch all users from Time Doctor API.
   * Returns list of users with their details.
   */
  static async getUsers(): Promise<TimeDoctorUser[]> {
    try {
      const instance = await this.getAxiosInstance();
      const companyId = (instance as any).companyId;
      
      const response = await instance.get(`/companies/${companyId}/users`);

      if (response.status === 200 && response.data) {
        // Parse Time Doctor API response
        // Note: Actual response structure may vary based on Time Doctor's API
        const users = response.data.users || response.data.data || response.data;
        
        if (Array.isArray(users)) {
          return users.map((user: any) => ({
            userId: user.user_id || user.userId || user.id,
            email: user.email || '',
            firstName: user.first_name || user.firstName || '',
            lastName: user.last_name || user.lastName || '',
            status: user.status || 'UNKNOWN'
          }));
        }

        throw new Error('Invalid response format from Time Doctor API');
      }

      throw new Error(`Unexpected response status: ${response.status}`);
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Time Doctor API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from Time Doctor API. Please check your network connection.');
      } else {
        throw new Error(error.message || 'Failed to fetch users from Time Doctor API');
      }
    }
  }

  /**
   * Fetch activity/work hours data for a date range.
   * Requires from and to dates in YYYY-MM-DD format.
   * Optional userId to filter for specific user.
   */
  static async getActivity(params: TimeDoctorActivityParams): Promise<TimeDoctorActivity[]> {
    try {
      const instance = await this.getAxiosInstance();
      const companyId = (instance as any).companyId;
      
      // Build query parameters
      const queryParams: any = {
        from: params.from,
        to: params.to
      };

      if (params.userId) {
        queryParams.user_ids = params.userId;
      }

      const response = await instance.get(`/companies/${companyId}/worklog`, {
        params: queryParams
      });

      if (response.status === 200 && response.data) {
        // Parse Time Doctor API response
        const activities = response.data.worklogs || response.data.data || response.data;
        
        if (Array.isArray(activities)) {
          return activities.map((activity: any) => ({
            userId: activity.user_id || activity.userId,
            userName: activity.user_name || activity.userName || `${activity.first_name || ''} ${activity.last_name || ''}`.trim(),
            date: activity.date || activity.task_date,
            workHours: activity.length ? Number((activity.length / 3600).toFixed(2)) : 0, // Convert seconds to hours
            tasks: activity.task_name || activity.tasks || '',
            projects: activity.project_name || activity.projects || ''
          }));
        }

        throw new Error('Invalid response format from Time Doctor API');
      }

      throw new Error(`Unexpected response status: ${response.status}`);
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Time Doctor API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from Time Doctor API. Please check your network connection.');
      } else {
        throw new Error(error.message || 'Failed to fetch activity from Time Doctor API');
      }
    }
  }
}


