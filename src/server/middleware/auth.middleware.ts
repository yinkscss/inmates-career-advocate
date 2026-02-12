/**
 * Authentication Middleware
 * Validates JWT tokens from frontend requests
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/config.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    [key: string]: unknown;
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token using same secret as backend
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      email?: string;
      [key: string]: unknown;
    };

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    // Store token for backend API calls
    req.headers['x-access-token'] = token;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(500).json({ error: 'Authentication error' });
  }
}
