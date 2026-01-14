/**
 * Health Check Routes
 * GET /api/health - Server health status
 */

import { Router, Request, Response } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      backend: 'unknown', // Will be updated in Phase 2
      llm: 'unknown', // Will be updated in Phase 4
    },
  });
});
