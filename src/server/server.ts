/**
 * Express Server Setup
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '../config/config.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { chatRoutes } from './routes/chat.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { authMiddleware } from './middleware/auth.middleware.js';

export async function startServer(): Promise<void> {
  const app: Express = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
  }));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
