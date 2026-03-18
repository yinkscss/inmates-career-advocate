import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../server/middleware/auth.middleware.js';
import { ResumeBuildRequestSchema } from '../types/resume.types.js';
import { ResumeBuildFailedError, resumeService } from '../services/resume.service.js';

function formatValidationIssuePath(path: (string | number)[]): string {
  return path.length > 0 ? path.join('.') : '(root)';
}

export async function buildResumeController(req: AuthenticatedRequest, res: Response): Promise<void> {
  const token = req.headers['x-access-token'];
  if (typeof token !== 'string' || token.length === 0) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication token is missing',
    });
    return;
  }

  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'User ID not found in token',
    });
    return;
  }

  const validationResult = ResumeBuildRequestSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid request',
      message: 'Resume build request payload failed validation',
      details: validationResult.error.issues.map((issue) => ({
        path: formatValidationIssuePath(issue.path),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const result = await resumeService.buildResume(validationResult.data, { token, userId });

    res
      .status(result.statusCode)
      .set(result.headers)
      .send(Buffer.from(result.body));
  } catch (error) {
    if (error instanceof ResumeBuildFailedError) {
      res.status(500).json({
        success: false,
        error: 'Failed to build resume',
        message: error.message,
      });
      return;
    }

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Resume build request payload failed validation',
        details: error.issues.map((issue) => ({
          path: formatValidationIssuePath(issue.path),
          message: issue.message,
        })),
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown resume build failure';
    res.status(500).json({
      success: false,
      error: 'Failed to build resume',
      message,
    });
  }
}
