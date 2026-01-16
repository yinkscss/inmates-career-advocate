/**
 * Health Check Routes
 * GET /api/health - Server health status
 */

import { Router, Request, Response } from 'express';
import { backendApiClient } from '../../api/client.js';
import { config } from '../../config/config.js';
import { ChatOpenAI } from '@langchain/openai';

export const healthRoutes = Router();

/**
 * Check LLM availability
 * Tries to initialize the LLM model to verify API key and connectivity
 */
async function checkLLMAvailability(): Promise<'available' | 'unavailable'> {
  try {
    // Quick check: try to create an LLM instance
    // This validates the API key format and basic connectivity
    const model = new ChatOpenAI({
      model: config.agentModel,
      temperature: config.agentTemperature,
      apiKey: config.openaiApiKey,
      timeout: 5000, // Short timeout for health check
    });

    // Try a minimal invocation to verify the API is working
    // We use a very simple prompt to minimize cost
    await model.invoke('Hi');
    return 'available';
  } catch (error) {
    if (config.nodeEnv === 'development') {
      console.debug('[Health Check] LLM unavailable:', (error as Error).message);
    }
    return 'unavailable';
  }
}

healthRoutes.get('/', async (_req: Request, res: Response) => {
  // Check backend connectivity
  const backendStatus = await backendApiClient.healthCheck()
    ? 'connected'
    : 'disconnected';

  // Check LLM availability
  const llmStatus = await checkLLMAvailability();

  // Determine overall health status
  const overallStatus = backendStatus === 'connected' && llmStatus === 'available'
    ? 'healthy'
    : 'degraded';

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      backend: backendStatus,
      llm: llmStatus,
    },
  });
});
