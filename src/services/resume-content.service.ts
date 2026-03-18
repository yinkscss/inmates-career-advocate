import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config/config.js';
import {
  type ResumeBuildRequest,
  type ResumeTemplateModel,
  ResumeTemplateModelSchema,
} from '../types/resume.types.js';

function createDateRange(startDate?: string, endDate?: string, isCurrent?: boolean): string {
  const start = startDate?.trim();
  const end = isCurrent ? 'Present' : endDate?.trim();

  if (start && end) {
    return `${start} - ${end}`;
  }
  if (start) {
    return start;
  }
  if (end) {
    return end;
  }
  return 'Dates not specified';
}

function dedupeValues(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(normalized);
    }
  }

  return deduped;
}

function normalizeResumeRequest(request: ResumeBuildRequest): ResumeTemplateModel {
  const fullName = `${request.personalInfo.firstName} ${request.personalInfo.lastName}`.trim();
  const summary = request.summary ?? request.objective;
  if (!summary) {
    throw new ResumeContentGenerationError('Resume summary normalization failed: summary/objective missing');
  }

  const normalizedModel: ResumeTemplateModel = {
    personalInfo: {
      fullName,
      email: request.personalInfo.email,
      phone: request.personalInfo.phone,
      location: request.personalInfo.location,
      headline: request.personalInfo.headline,
      links: request.links ?? [],
    },
    profile: {
      summary,
      objective: request.objective,
    },
    experience: request.experience.map((item) => ({
      position: item.position,
      company: item.company,
      location: item.location,
      dateRange: createDateRange(item.startDate, item.endDate, item.isCurrent),
      summary: item.summary,
      highlights: item.highlights ?? [],
    })),
    education: request.education.map((item) => ({
      institution: item.institution,
      degree: item.degree,
      fieldOfStudy: item.fieldOfStudy,
      dateRange: createDateRange(item.startDate, item.endDate),
      location: item.location,
      details: item.details,
    })),
    skills: dedupeValues(request.skills),
    certifications: (request.certifications ?? []).map((item) => ({
      name: item.name,
      issuer: item.issuer,
      issueDate: item.issueDate,
      expirationDate: item.expirationDate,
      credentialId: item.credentialId,
      credentialUrl: item.credentialUrl,
    })),
    projects: (request.projects ?? []).map((item) => ({
      name: item.name,
      role: item.role,
      description: item.description,
      technologies: item.technologies ?? [],
      dateRange: createDateRange(item.startDate, item.endDate),
      projectUrl: item.projectUrl,
    })),
  };

  return ResumeTemplateModelSchema.parse(normalizedModel);
}

export class ResumeContentGenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ResumeContentGenerationError';
  }
}

export class ResumeContentService {
  private createWordingModel(): ChatOpenAI {
    return new ChatOpenAI({
      model: config.agentModel,
      apiKey: config.openaiApiKey,
      temperature: 0,
    });
  }

  private async enhanceWording(normalizedModel: ResumeTemplateModel): Promise<ResumeTemplateModel> {
    const wordingModel = this.createWordingModel().withStructuredOutput(ResumeTemplateModelSchema, {
      name: 'ResumeContentModel',
    });

    const systemPrompt = [
      'You are a professional resume writing assistant.',
      'Improve wording quality for clarity, impact, and ATS-friendliness.',
      'Do not invent jobs, dates, companies, schools, skills, certifications, or projects.',
      'Preserve section ordering and list lengths exactly as provided.',
      'Keep text concise and professional. Use strong action verbs for summaries and highlights.',
      'Return a fully populated structured object that matches the provided schema.',
    ].join(' ');

    try {
      const enhancedModel = await wordingModel.invoke([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Improve the wording in this normalized resume model while preserving facts:\n${JSON.stringify(normalizedModel)}`,
        },
      ]);
      return ResumeTemplateModelSchema.parse(enhancedModel);
    } catch (error) {
      throw new ResumeContentGenerationError('Failed to generate enhanced resume content', {
        cause: error instanceof Error ? error : new Error('Unknown LLM failure'),
      });
    }
  }

  async generateResumeContent(request: ResumeBuildRequest): Promise<ResumeTemplateModel> {
    const normalizedModel = normalizeResumeRequest(request);
    return this.enhanceWording(normalizedModel);
  }
}

export const resumeContentService = new ResumeContentService();
