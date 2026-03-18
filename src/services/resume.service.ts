import { resumeContentService } from './resume-content.service.js';
import { ResumePdfRenderError, resumePdfService } from './resume-pdf.service.js';
import {
  RESUME_BUILD_RESPONSE_BODY_FORMAT,
  RESUME_BUILD_RESPONSE_CONTENT_TYPE,
  RESUME_BUILD_RESPONSE_STATUS_CODE,
  createResumePdfContentDisposition,
  type ResumeBuildPdfResponseContract,
  type ResumeBuildRequest,
} from '../types/resume.types.js';

export class ResumeBuildFailedError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ResumeBuildFailedError';
  }
}

export class ResumeService {
  async buildResume(request: ResumeBuildRequest, context: { token: string; userId: string }): Promise<ResumeBuildPdfResponseContract> {
    if (!context.token.trim()) {
      throw new ResumeBuildFailedError('Cannot build resume: access token is missing');
    }
    if (!context.userId.trim()) {
      throw new ResumeBuildFailedError('Cannot build resume: user identifier is missing');
    }

    try {
      const content = await resumeContentService.generateResumeContent(request);
      const renderedPdf = await resumePdfService.renderResumePdf(content);

      return {
        statusCode: RESUME_BUILD_RESPONSE_STATUS_CODE,
        headers: {
          'content-type': RESUME_BUILD_RESPONSE_CONTENT_TYPE,
          'content-disposition': createResumePdfContentDisposition(renderedPdf.filename),
        },
        bodyFormat: RESUME_BUILD_RESPONSE_BODY_FORMAT,
        body: renderedPdf.body,
      };
    } catch (error) {
      if (error instanceof ResumePdfRenderError) {
        throw new ResumeBuildFailedError(`PDF renderer failed: ${error.message}`, { cause: error });
      }
      throw new ResumeBuildFailedError('Failed to build resume PDF', {
        cause: error instanceof Error ? error : new Error('Unknown resume build failure'),
      });
    }
  }
}

export const resumeService = new ResumeService();
