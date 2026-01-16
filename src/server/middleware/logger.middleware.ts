/**
 * Request Logging Middleware
 * Logs incoming requests for debugging and monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/config.js';

export function loggerMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Only log in development
  if (config.nodeEnv === 'development') {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;
    const query = Object.keys(req.query).length > 0 
      ? `?${new URLSearchParams(req.query as Record<string, string>).toString()}`
      : '';
    const fullPath = `${path}${query}`;
    
    // Log request
    console.log(`[${timestamp}] ${method} ${fullPath}`);
    
    // Log request body for POST/PUT/PATCH (but not sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      // Don't log full message content (could be long), just preview
      if (req.body.message) {
        const messagePreview = req.body.message.length > 100
          ? `${req.body.message.substring(0, 100)}...`
          : req.body.message;
        console.log(`  Body: { message: "${messagePreview}", conversationId: "${req.body.conversationId || 'none'}" }`);
      } else {
        console.log(`  Body:`, JSON.stringify(req.body).substring(0, 200));
      }
    }
  }

  next();
}
