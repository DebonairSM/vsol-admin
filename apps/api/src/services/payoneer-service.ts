import axios, { AxiosInstance } from 'axios';
import { SettingsService } from './settings-service';
import { PayoneerPayee } from '@vsol-admin/shared';

export class PayoneerService {
  private static axiosInstance: AxiosInstance | null = null;

  /**
   * Get or create axios instance configured with Payoneer API credentials.
   * Retrieves API key and program ID from settings.
   */
  private static async getAxiosInstance(): Promise<AxiosInstance> {
    try {
      const apiKey = await SettingsService.getSetting('payoneer_api_key');
      const programId = await SettingsService.getSetting('payoneer_program_id');
      const apiUrl = await SettingsService.getSetting('payoneer_api_url').catch(() => 'https://api.payoneer.com/v4');

      const instance = axios.create({
        baseURL: `${apiUrl}/programs/${programId}`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      return instance;
    } catch (error) {
      throw new Error(`Payoneer API configuration not found. Please configure Payoneer credentials in Settings. Error: ${error}`);
    }
  }

  /**
   * Test Payoneer API connection with current credentials.
   * Returns true if connection is successful, throws error otherwise.
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const instance = await this.getAxiosInstance();
      
      // Try to fetch payees to verify connection
      // Using a minimal request to test authentication
      const response = await instance.get('/payees', {
        params: { limit: 1 } // Fetch only 1 payee to minimize data transfer
      });

      if (response.status === 200) {
        return {
          success: true,
          message: 'Successfully connected to Payoneer API'
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
          message: `Payoneer API error: ${error.response.status} - ${error.response.data?.message || error.message}`
        };
      } else if (error.request) {
        // Request made but no response
        return {
          success: false,
          message: 'No response from Payoneer API. Please check your network connection.'
        };
      } else {
        // Error setting up request
        return {
          success: false,
          message: error.message || 'Failed to test Payoneer API connection'
        };
      }
    }
  }

  /**
   * Fetch all payees from Payoneer Mass Payouts API.
   * Returns list of payees with their details.
   */
  static async getPayees(): Promise<PayoneerPayee[]> {
    try {
      const instance = await this.getAxiosInstance();
      
      const response = await instance.get('/payees');

      if (response.status === 200 && response.data) {
        // Parse Payoneer API response
        // Note: Actual response structure may vary based on Payoneer's API
        const payees = response.data.payees || response.data.items || response.data;
        
        if (Array.isArray(payees)) {
          return payees.map((payee: any) => ({
            payeeId: payee.payee_id || payee.payeeId || payee.id,
            email: payee.email || '',
            firstName: payee.first_name || payee.firstName || '',
            lastName: payee.last_name || payee.lastName || '',
            status: payee.status || 'UNKNOWN',
            paymentMethod: payee.payment_method || payee.paymentMethod
          }));
        }

        throw new Error('Invalid response format from Payoneer API');
      }

      throw new Error(`Unexpected response status: ${response.status}`);
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Payoneer API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from Payoneer API. Please check your network connection.');
      } else {
        throw new Error(error.message || 'Failed to fetch payees from Payoneer API');
      }
    }
  }

  /**
   * Get a specific payee by ID.
   */
  static async getPayee(payeeId: string): Promise<PayoneerPayee> {
    try {
      const instance = await this.getAxiosInstance();
      
      const response = await instance.get(`/payees/${payeeId}`);

      if (response.status === 200 && response.data) {
        const payee = response.data;
        return {
          payeeId: payee.payee_id || payee.payeeId || payee.id,
          email: payee.email || '',
          firstName: payee.first_name || payee.firstName || '',
          lastName: payee.last_name || payee.lastName || '',
          status: payee.status || 'UNKNOWN',
          paymentMethod: payee.payment_method || payee.paymentMethod
        };
      }

      throw new Error(`Unexpected response status: ${response.status}`);
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Payoneer API error: ${error.response.status} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from Payoneer API. Please check your network connection.');
      } else {
        throw new Error(error.message || `Failed to fetch payee ${payeeId} from Payoneer API`);
      }
    }
  }
}

