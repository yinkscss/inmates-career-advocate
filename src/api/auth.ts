/**
 * Authentication Utilities
 * JWT token handling and validation helpers
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export interface TokenPayload {
  userId: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      // Provide more detailed error message
      const message = error.message || 'Invalid token';
      throw new Error(`Invalid token: ${message}`);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new Error('Token not active yet');
    }
    throw new Error(`Token verification failed: ${(error as Error).message}`);
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Get user ID from token
 */
export function getUserIdFromToken(token: string): string {
  const payload = verifyToken(token);
  if (!payload.userId) {
    throw new Error('Token does not contain userId');
  }
  return payload.userId;
}
