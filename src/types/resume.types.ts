import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1, 'Field is required');

export const ResumePersonalInfoSchema = z
  .object({
    firstName: nonEmptyStringSchema,
    lastName: nonEmptyStringSchema,
    email: z.string().trim().email('Valid email is required'),
    phone: nonEmptyStringSchema.optional(),
    location: nonEmptyStringSchema.optional(),
    headline: nonEmptyStringSchema.optional(),
  })
  .strict();

export const ResumeExperienceItemSchema = z
  .object({
    position: nonEmptyStringSchema,
    company: nonEmptyStringSchema,
    location: nonEmptyStringSchema.optional(),
    startDate: nonEmptyStringSchema,
    endDate: nonEmptyStringSchema.optional(),
    isCurrent: z.boolean().optional(),
    summary: nonEmptyStringSchema.optional(),
    highlights: z.array(nonEmptyStringSchema).optional(),
  })
  .strict();

export const ResumeEducationItemSchema = z
  .object({
    institution: nonEmptyStringSchema,
    degree: nonEmptyStringSchema,
    fieldOfStudy: nonEmptyStringSchema.optional(),
    startDate: nonEmptyStringSchema.optional(),
    endDate: nonEmptyStringSchema.optional(),
    location: nonEmptyStringSchema.optional(),
    details: nonEmptyStringSchema.optional(),
  })
  .strict();

export const ResumeCertificationItemSchema = z
  .object({
    name: nonEmptyStringSchema,
    issuer: nonEmptyStringSchema,
    issueDate: nonEmptyStringSchema.optional(),
    expirationDate: nonEmptyStringSchema.optional(),
    credentialId: nonEmptyStringSchema.optional(),
    credentialUrl: z.string().trim().url('Certification URL must be valid').optional(),
  })
  .strict();

export const ResumeProjectItemSchema = z
  .object({
    name: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    role: nonEmptyStringSchema.optional(),
    technologies: z.array(nonEmptyStringSchema).optional(),
    startDate: nonEmptyStringSchema.optional(),
    endDate: nonEmptyStringSchema.optional(),
    projectUrl: z.string().trim().url('Project URL must be valid').optional(),
  })
  .strict();

export const ResumeLinkItemSchema = z
  .object({
    label: nonEmptyStringSchema,
    url: z.string().trim().url('Link URL must be valid'),
  })
  .strict();

export const RESUME_TEMPLATES = ['classic', 'modern', 'executive'] as const;
export type ResumeTemplate = (typeof RESUME_TEMPLATES)[number];

export const ResumeBuildRequestSchema = z
  .object({
    personalInfo: ResumePersonalInfoSchema,
    summary: nonEmptyStringSchema.optional(),
    objective: nonEmptyStringSchema.optional(),
    experience: z.array(ResumeExperienceItemSchema).min(1, 'At least one experience entry is required'),
    education: z.array(ResumeEducationItemSchema).min(1, 'At least one education entry is required'),
    skills: z.array(nonEmptyStringSchema).min(1, 'At least one skill is required'),
    certifications: z
      .array(ResumeCertificationItemSchema)
      .min(1, 'Certifications must include at least one entry when provided')
      .optional(),
    projects: z.array(ResumeProjectItemSchema).min(1, 'Projects must include at least one entry when provided').optional(),
    links: z.array(ResumeLinkItemSchema).min(1, 'Links must include at least one entry when provided').optional(),
    template: z.enum(RESUME_TEMPLATES).default('classic'),
  })
  .strict()
  .refine((payload) => Boolean(payload.summary || payload.objective), {
    message: 'Either summary or objective is required',
    path: ['summary'],
  });

export type ResumePersonalInfo = z.infer<typeof ResumePersonalInfoSchema>;
export type ResumeExperienceItem = z.infer<typeof ResumeExperienceItemSchema>;
export type ResumeEducationItem = z.infer<typeof ResumeEducationItemSchema>;
export type ResumeCertificationItem = z.infer<typeof ResumeCertificationItemSchema>;
export type ResumeProjectItem = z.infer<typeof ResumeProjectItemSchema>;
export type ResumeLinkItem = z.infer<typeof ResumeLinkItemSchema>;
export type ResumeBuildRequest = z.infer<typeof ResumeBuildRequestSchema>;

export const ResumeTemplatePersonalInfoSchema = z
  .object({
    fullName: nonEmptyStringSchema,
    email: z.string().trim().email('Valid email is required'),
    phone: nonEmptyStringSchema.optional(),
    location: nonEmptyStringSchema.optional(),
    headline: nonEmptyStringSchema.optional(),
    links: z.array(ResumeLinkItemSchema).default([]),
  })
  .strict();

export const ResumeTemplateProfileSchema = z
  .object({
    summary: nonEmptyStringSchema,
    objective: nonEmptyStringSchema.optional(),
  })
  .strict();

export const ResumeTemplateExperienceItemSchema = z
  .object({
    position: nonEmptyStringSchema,
    company: nonEmptyStringSchema,
    location: nonEmptyStringSchema.optional(),
    dateRange: nonEmptyStringSchema,
    summary: nonEmptyStringSchema.optional(),
    highlights: z.array(nonEmptyStringSchema).default([]),
  })
  .strict();

export const ResumeTemplateEducationItemSchema = z
  .object({
    institution: nonEmptyStringSchema,
    degree: nonEmptyStringSchema,
    fieldOfStudy: nonEmptyStringSchema.optional(),
    dateRange: nonEmptyStringSchema.optional(),
    location: nonEmptyStringSchema.optional(),
    details: nonEmptyStringSchema.optional(),
  })
  .strict();

export const ResumeTemplateCertificationItemSchema = z
  .object({
    name: nonEmptyStringSchema,
    issuer: nonEmptyStringSchema,
    issueDate: nonEmptyStringSchema.optional(),
    expirationDate: nonEmptyStringSchema.optional(),
    credentialId: nonEmptyStringSchema.optional(),
    credentialUrl: z.string().trim().url('Certification URL must be valid').optional(),
  })
  .strict();

export const ResumeTemplateProjectItemSchema = z
  .object({
    name: nonEmptyStringSchema,
    role: nonEmptyStringSchema.optional(),
    description: nonEmptyStringSchema,
    technologies: z.array(nonEmptyStringSchema).default([]),
    dateRange: nonEmptyStringSchema.optional(),
    projectUrl: z.string().trim().url('Project URL must be valid').optional(),
  })
  .strict();

export const ResumeTemplateModelSchema = z
  .object({
    personalInfo: ResumeTemplatePersonalInfoSchema,
    profile: ResumeTemplateProfileSchema,
    experience: z.array(ResumeTemplateExperienceItemSchema).min(1),
    education: z.array(ResumeTemplateEducationItemSchema).min(1),
    skills: z.array(nonEmptyStringSchema).min(1),
    certifications: z.array(ResumeTemplateCertificationItemSchema).default([]),
    projects: z.array(ResumeTemplateProjectItemSchema).default([]),
  })
  .strict();

export type ResumeTemplatePersonalInfo = z.infer<typeof ResumeTemplatePersonalInfoSchema>;
export type ResumeTemplateProfile = z.infer<typeof ResumeTemplateProfileSchema>;
export type ResumeTemplateExperienceItem = z.infer<typeof ResumeTemplateExperienceItemSchema>;
export type ResumeTemplateEducationItem = z.infer<typeof ResumeTemplateEducationItemSchema>;
export type ResumeTemplateCertificationItem = z.infer<typeof ResumeTemplateCertificationItemSchema>;
export type ResumeTemplateProjectItem = z.infer<typeof ResumeTemplateProjectItemSchema>;
export type ResumeTemplateModel = z.infer<typeof ResumeTemplateModelSchema>;

export const RESUME_BUILD_ENDPOINT_PATH = '/api/resume/build' as const;
export const RESUME_BUILD_REQUEST_CONTENT_TYPE = 'application/json' as const;
export const RESUME_BUILD_REQUEST_ACCEPT = 'application/pdf' as const;
export const RESUME_BUILD_RESPONSE_CONTENT_TYPE = 'application/pdf' as const;
export const RESUME_BUILD_RESPONSE_DISPOSITION_TYPE = 'attachment' as const;
export const DEFAULT_RESUME_PDF_FILENAME = 'resume.pdf' as const;
export const RESUME_BUILD_RESPONSE_STATUS_CODE = 200 as const;
export const RESUME_BUILD_RESPONSE_BODY_FORMAT = 'binary' as const;

export interface ResumeBuildRequestContract {
  method: 'POST';
  path: typeof RESUME_BUILD_ENDPOINT_PATH;
  headers: {
    'content-type': typeof RESUME_BUILD_REQUEST_CONTENT_TYPE;
    accept: typeof RESUME_BUILD_REQUEST_ACCEPT;
    authorization: `Bearer ${string}`;
  };
  body: ResumeBuildRequest;
}

export interface ResumeBuildPdfResponseHeaders {
  'content-type': typeof RESUME_BUILD_RESPONSE_CONTENT_TYPE;
  'content-disposition': string;
}

export interface ResumeBuildPdfResponseContract {
  statusCode: typeof RESUME_BUILD_RESPONSE_STATUS_CODE;
  headers: ResumeBuildPdfResponseHeaders;
  bodyFormat: typeof RESUME_BUILD_RESPONSE_BODY_FORMAT;
  body: Uint8Array;
}

export interface ResumePdfRenderHandoff {
  request: ResumeBuildRequest;
  context: { token: string; userId: string };
  content: ResumeTemplateModel;
}

export function createResumePdfContentDisposition(filename: string = DEFAULT_RESUME_PDF_FILENAME): string {
  const sanitized = filename.replace(/["\r\n]/g, '').trim();
  const normalizedFilename = sanitized.length > 0 ? sanitized : DEFAULT_RESUME_PDF_FILENAME;
  const safeFilename = normalizedFilename.toLowerCase().endsWith('.pdf')
    ? normalizedFilename
    : `${normalizedFilename}.pdf`;
  return `${RESUME_BUILD_RESPONSE_DISPOSITION_TYPE}; filename="${safeFilename}"`;
}
