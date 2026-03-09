/**
 * Express Server Setup
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { config } from '../config/config.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import { chatRoutes } from './routes/chat.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { authMiddleware } from './middleware/auth.middleware.js';

const CORS_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const CORS_HEADERS = 'Content-Type, Authorization, Accept';

/** Set CORS headers on res if origin is allowed. Returns true if origin was allowed. */
function setCorsHeaders(origin: string | undefined, allowedOrigins: string[], res: Response): boolean {
  if (!origin) return true;
  if (!allowedOrigins.includes(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', CORS_METHODS);
  res.setHeader('Access-Control-Allow-Headers', CORS_HEADERS);
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

export async function startServer(): Promise<void> {
  const app: Express = express();
  const allowedOrigins = config.corsOrigins;

  console.log('🔒 CORS Configuration:');
  console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);

  // 1) CORS first, before anything else (so proxy/helmet cannot strip headers)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const allowed = setCorsHeaders(origin, allowedOrigins, res);
    if (req.method === 'OPTIONS') {
      if (allowed) return res.sendStatus(204);
      return res.sendStatus(403);
    }
    if (!origin) return next();
    if (!allowed) {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      return res.status(403).json({ error: 'Not allowed by CORS' });
    }
    next();
  });

  // Security middleware (after CORS so it doesn't override our headers)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging (before routes)
  app.use(loggerMiddleware);

  // Routes
  app.use('/api/chat', authMiddleware, chatRoutes);
  app.use('/api/health', healthRoutes);

  // Error handling (must be last)
  app.use(errorMiddleware);

  // Start server
  const port = config.port;
  app.listen(port, () => {
    console.log(`🚀 Career Advocate API server running on port ${port}`);
    console.log(`📡 Environment: ${config.nodeEnv}`);
    console.log(`🔗 Backend API: ${config.backendApiBaseUrl}`);
  });
}
