/**
 * HTTP Client for Backend API
 * Base client with authentication and error handling
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { config } from '../config/config.js';
import { ApiError } from '../types/api.types.js';

export class BackendApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = config.backendApiBaseUrl;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (requestConfig) => {
        // Log request in development
        if (config.nodeEnv === 'development') {
          console.debug(`[API] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`);
        }
        return requestConfig;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Log response structure in development
        if (config.nodeEnv === 'development' && response.config.url?.includes('/jobs/all-jobs')) {
          console.debug('[API Response]', {
            url: response.config.url,
            status: response.status,
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : [],
            dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
          });
        }
        return response;
      },
      (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Make authenticated GET request
   */
  async get<T>(
    url: string,
    token: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
    };

    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * Make authenticated POST request
   */
  async post<T>(
    url: string,
    token: string,
    data?: unknown
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as ApiError | unknown;

      const apiError: ApiError = {
        error: (data as ApiError)?.error || 'API request failed',
        message: (data as ApiError)?.message || error.message,
        statusCode: status,
      };

      // Log error in development
      if (config.nodeEnv === 'development') {
        console.error(`[API Error] ${status}:`, apiError);
      }

      return Promise.reject(apiError);
    } else if (error.request) {
      // Request made but no response received
      const apiError: ApiError = {
        error: 'Network error',
        message: 'No response from server. Please check your connection.',
      };

      if (config.nodeEnv === 'development') {
        console.error('[API Error] Network:', error.message);
      }

      return Promise.reject(apiError);
    } else {
      // Error setting up request
      const apiError: ApiError = {
        error: 'Request error',
        message: error.message,
      };

      return Promise.reject(apiError);
    }
  }

  /**
   * Check if backend is reachable
   * Tries to connect to the base URL
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to connect to the base URL with a short timeout
      // This just checks if the server is reachable, not if it's fully functional
      const response = await axios.get(this.baseURL, {
        timeout: 5000,
        validateStatus: (status) => status < 500, // Accept any status < 500 as "reachable"
      });
      // If we get any response (even 404), the server is reachable
      return response.status < 500;
    } catch (error) {
      // Connection failed or timeout
      if (config.nodeEnv === 'development') {
        console.debug('[Health Check] Backend not reachable:', (error as Error).message);
      }
      return false;
    }
  }
}

// Export singleton instance
export const backendApiClient = new BackendApiClient();
