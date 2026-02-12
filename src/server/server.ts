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
  // CORS configuration
  const allowedOrigins = (process.env.CORS_ORIGINS || config.corsOrigin || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  // Log CORS configuration for debugging
  console.log(`🔒 CORS Configuration:`);
  console.log(`   CORS_ORIGINS env: ${process.env.CORS_ORIGINS || 'not set'}`);
  console.log(`   Allowed origins: ${allowedOrigins.join(', ') || 'none'}`);

  app.use(cors({
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
  }));

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
