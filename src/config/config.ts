/**
 * Application Configuration
 * Loads and validates environment variables
 */

import { config as loadEnv } from 'dotenv';

loadEnv();

interface AppConfig {
  port: number;
  nodeEnv: string;
  backendApiBaseUrl: string;
  jwtSecret: string;
  openaiApiKey: string;
  agentModel: string;
  agentTemperature: number;
  maxIterations: number;
  maxHistoryMessages: number;
  corsOrigin: string;
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || defaultValue || '';
}

export const config: AppConfig = {
  port: parseInt(getEnvVar('PORT', '3001'), 10),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  backendApiBaseUrl: getEnvVar('BACKEND_API_BASE_URL', 'http://localhost:6543/api'),
  jwtSecret: getEnvVar('JWT_SECRET'),
  openaiApiKey: getEnvVar('OPENAI_API_KEY'),
  agentModel: getEnvVar('AGENT_MODEL', 'gpt-4o-mini'),
  agentTemperature: parseFloat(getEnvVar('AGENT_TEMPERATURE', '0.1')),
  maxIterations: parseInt(getEnvVar('MAX_ITERATIONS', '10'), 10),
  maxHistoryMessages: parseInt(getEnvVar('MAX_HISTORY_MESSAGES', '12'), 10),
  corsOrigin: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
};
