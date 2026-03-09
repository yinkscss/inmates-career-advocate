/**
 * Express Server Setup
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '../config/config.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import { chatRoutes } from './routes/chat.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { authMiddleware } from './middleware/auth.middleware.js';

export async function startServer(): Promise<void> {
  const app: Express = express();

  // Security middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );
  // CORS configuration (driven by environment)
  const allowedOrigins = config.corsOrigins;

  // Log CORS configuration for debugging
  console.log('🔒 CORS Configuration:');
  console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests without Origin header (e.g. server-to-server, curl)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      console.warn(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  };

  // Apply CORS to all routes
  app.use(cors(corsOptions));

  // Explicitly handle CORS preflight for all routes (including /api/chat)
  app.options('*', cors(corsOptions));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging (before routes)
  app.use(loggerMiddleware);

  // Explicit preflight for /api/chat so CORS headers are always sent (e.g. behind proxies)
  app.options('/api/chat', cors(corsOptions), (_req, res) => res.sendStatus(204));

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
