/**
 * API Type Definitions
 * Request/response types for API endpoints
 */

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

/**
 * Backend API response envelope observed from inmates-backend:
 * { success: boolean, data: T }
 */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    backend: 'connected' | 'disconnected' | 'unknown';
    llm: 'available' | 'unavailable' | 'unknown';
  };
}
