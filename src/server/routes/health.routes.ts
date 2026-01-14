/**
 * Health Check Routes
 * GET /api/health - Server health status
 */

import { Router, Request, Response } from 'express';
import { backendApiClient } from '../../api/client.js';

export const healthRoutes = Router();

healthRoutes.get('/', async (_req: Request, res: Response) => {
  // Check backend connectivity
  const backendStatus = await backendApiClient.healthCheck()
    ? 'connected'
    : 'disconnected';

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      backend: backendStatus,
      llm: 'unknown', // Will be updated in Phase 4
    },
  });
});
