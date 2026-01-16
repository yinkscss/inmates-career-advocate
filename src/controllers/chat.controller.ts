/**
 * Chat Controller
 * Handles chat endpoint requests for conversational job discovery
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../server/middleware/auth.middleware.js';
import { AgentService } from '../services/agent.service.js';
import { formatErrorMessage } from '../utils/response-formatter.js';

const agentService = new AgentService();

/**
 * POST /api/chat
 * Process a user message and return agent response with job results
 */
export async function chatController(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    // Validate request body
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Message is required and must be a non-empty string',
      });
      return;
    }

    // Get JWT token from authenticated request (stored by auth middleware)
    const token = req.headers['x-access-token'] as string;
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication token is missing',
      });
      return;
    }

    // TODO: In Phase 7, use req.user?.userId for session management

    // TODO: In Phase 7, retrieve conversation history using conversationId
    // For now, we'll use empty history (session-scoped memory only)
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Process message through agent
    const result = await agentService.processMessage(
      message.trim(),
      token,
      conversationHistory
    );

    // Return successful response
    res.status(200).json({
      success: true,
      data: {
        response: result.response,
        jobs: result.jobs || [],
        conversationId: conversationId || `conv_${Date.now()}`, // Generate if not provided
        // Include metadata if jobs were found
        ...(result.jobs && result.jobs.length > 0 && {
          jobsCount: result.jobs.length,
          suggestedActions: generateSuggestedActions(result.jobs),
        }),
      },
    });
  } catch (error) {
    // Handle different error types
    const errorMessage = formatErrorMessage(error);
    
    // Determine appropriate status code
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
        statusCode = 401;
      } else if (error.message.includes('Invalid request') || error.message.includes('required')) {
        statusCode = 400;
      } else if (error.message.includes('Not Found') || error.message.includes('404')) {
        statusCode = 404;
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        statusCode = 429;
      }
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[CHAT CONTROLLER ERROR]', error);
    }

    // Return error response
    res.status(statusCode).json({
      success: false,
      error: 'Failed to process message',
      message: errorMessage,
    });
  }
}

/**
 * Generate suggested actions based on job results
 */
function generateSuggestedActions(jobs: Array<{ _id: string; title: string; url: string }>): string[] {
  const actions: string[] = [];

  if (jobs.length > 0) {
    actions.push('View job details');
    if (jobs.length > 1) {
      actions.push('Refine search');
    }
    actions.push('Apply to job');
  } else {
    actions.push('Refine search criteria');
    actions.push('Try different keywords');
  }

  return actions;
}
