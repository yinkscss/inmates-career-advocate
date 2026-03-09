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
  corsOrigins: string[];
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || defaultValue || '';
}

/** Parse CORS_ORIGINS string: comma-separated, strip inline # comments and empty entries */
function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((part) => {
      const commentIndex = part.indexOf('#');
      const origin = (commentIndex >= 0 ? part.slice(0, commentIndex) : part).trim();
      return origin;
    })
    .filter((origin) => origin.length > 0);
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
  corsOrigins: parseCorsOrigins(
    getEnvVar(
      'CORS_ORIGINS',
      getEnvVar('CORS_ORIGIN', 'http://localhost:3000')
    )
  ),
};
