/**
 * Integration Tests: Resume Build Endpoint
 * Covers auth, schema validation, and PDF response contract.
 */

import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PDFDocument } from 'pdf-lib';
import type { AddressInfo } from 'node:net';
import type { ResumeBuildPdfResponseContract, ResumeBuildRequest, ResumeTemplateModel } from '../../types/resume.types.js';

process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.OPENAI_API_KEY ??= 'test-openai-key';

const TEST_USER_ID = 'resume-test-user';

function buildValidPayload(): ResumeBuildRequest {
  return {
    personalInfo: {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      phone: '+1-555-123-4567',
      location: 'Austin, TX',
      headline: 'Software Engineer',
    },
    summary: 'Experienced software engineer with strong TypeScript and backend skills.',
    experience: [
      {
        position: 'Software Engineer',
        company: 'Acme Inc',
        location: 'Austin, TX',
        startDate: '2021-01',
        endDate: '2024-01',
        summary: 'Built backend services and APIs.',
        highlights: ['Designed REST APIs', 'Improved performance by 30%'],
      },
    ],
    education: [
      {
        institution: 'State University',
        degree: 'BSc Computer Science',
        startDate: '2016-08',
        endDate: '2020-05',
      },
    ],
    skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
    template: 'classic',
  };
}

function createAuthToken(): string {
  return jwt.sign({ userId: TEST_USER_ID, email: 'jane.doe@example.com' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

function buildLongTemplateModel(): ResumeTemplateModel {
  const longLine = Array.from({ length: 22 }, (_, index) => `impactful contribution ${index + 1}`).join(' ');

  return {
    personalInfo: {
      fullName: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '+1-555-123-4567',
      location: 'Austin, TX',
      headline: 'Software Engineer',
      links: [{ label: 'Portfolio', url: 'https://example.com/portfolio' }],
    },
    profile: {
      summary: `${longLine} ${longLine} ${longLine}`,
      objective: 'Deliver maintainable systems with strong product outcomes.',
    },
    experience: Array.from({ length: 20 }, (_, index) => ({
      position: `Senior Engineer ${index + 1}`,
      company: `Acme ${index + 1}`,
      location: 'Austin, TX',
      dateRange: `20${(index % 10) + 10}-01 - 20${(index % 10) + 11}-12`,
      summary: `${longLine} ${longLine}`,
      highlights: [`${longLine} ${longLine}`, `${longLine}`],
    })),
    education: [
      {
        institution: 'State University',
        degree: 'BSc Computer Science',
        fieldOfStudy: 'Computer Science',
        dateRange: '2016-08 - 2020-05',
        location: 'Austin, TX',
        details: `${longLine} ${longLine}`,
      },
    ],
    skills: Array.from({ length: 24 }, (_, index) => `Skill-${index + 1}`),
    certifications: [
      {
        name: 'Cloud Architect',
        issuer: 'Certification Board',
        issueDate: '2024-01',
      },
    ],
    projects: [
      {
        name: 'Large Scale Platform',
        role: 'Lead Engineer',
        description: `${longLine} ${longLine} ${longLine}`,
        technologies: ['TypeScript', 'Node.js', 'PostgreSQL', 'Kubernetes'],
      },
    ],
  };
}

async function createResumeTestServer(): Promise<{ server: Server; baseUrl: string }> {
  const [{ authMiddleware }, { resumeRoutes }] = await Promise.all([
    import('../../server/middleware/auth.middleware.js'),
    import('../../server/routes/resume.routes.js'),
  ]);

  const app = express();
  app.use(express.json());
  app.use('/api/resume', authMiddleware, resumeRoutes);
  app.use((_, res) => res.status(404).json({ error: 'Not found' }));

  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function testUnauthorizedMissingToken(): Promise<boolean> {
  console.log('🔒 Test: Missing token is rejected');
  const { server, baseUrl } = await createResumeTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/resume/build`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildValidPayload()),
    });

    assert.equal(response.status, 401);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, 'Missing or invalid authorization header');
    console.log('   ✅ Passed');
    return true;
  } catch (error) {
    console.log(`   ❌ ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function testUnauthorizedInvalidToken(): Promise<boolean> {
  console.log('🔒 Test: Invalid token is rejected');
  const { server, baseUrl } = await createResumeTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/resume/build`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer invalid.token.value',
      },
      body: JSON.stringify(buildValidPayload()),
    });

    assert.equal(response.status, 401);
    const body = (await response.json()) as { error?: string };
    assert.equal(body.error, 'Invalid token');
    console.log('   ✅ Passed');
    return true;
  } catch (error) {
    console.log(`   ❌ ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function testInvalidPayloadValidationFailure(): Promise<boolean> {
  console.log('🧱 Test: Invalid payload fails schema validation');
  const { server, baseUrl } = await createResumeTestServer();
  const token = createAuthToken();

  try {
    const response = await fetch(`${baseUrl}/api/resume/build`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        personalInfo: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@example.com',
        },
        experience: [],
        education: [],
        skills: [],
      }),
    });

    assert.equal(response.status, 400);
    const body = (await response.json()) as { message?: string; details?: Array<{ path?: string; message?: string }> };
    assert.equal(body.message, 'Resume build request payload failed validation');
    assert.ok(Array.isArray(body.details) && body.details.length > 0);
    const hasSummaryRule = body.details.some((issue) => issue.path === 'summary');
    assert.ok(hasSummaryRule);
    console.log('   ✅ Passed');
    return true;
  } catch (error) {
    console.log(`   ❌ ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function testUnknownKeysValidationFailure(): Promise<boolean> {
  console.log('🧱 Test: Unknown payload keys are rejected');
  const { server, baseUrl } = await createResumeTestServer();
  const token = createAuthToken();

  try {
    const response = await fetch(`${baseUrl}/api/resume/build`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...buildValidPayload(),
        unsupportedRootField: true,
        personalInfo: {
          ...buildValidPayload().personalInfo,
          nickname: 'JD',
        },
      }),
    });

    assert.equal(response.status, 400);
    const body = (await response.json()) as { details?: Array<{ path?: string; message?: string }> };
    assert.ok(Array.isArray(body.details) && body.details.length > 0);
    const hasRootUnknownKeysIssue = body.details.some(
      (issue) => issue.path === '(root)' && issue.message?.includes('Unrecognized key')
    );
    const hasNestedUnknownKeysIssue = body.details.some(
      (issue) => issue.path === 'personalInfo' && issue.message?.includes('Unrecognized key')
    );
    assert.ok(hasRootUnknownKeysIssue || hasNestedUnknownKeysIssue);
    console.log('   ✅ Passed');
    return true;
  } catch (error) {
    console.log(`   ❌ ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function testValidPayloadReturnsPdfContract(): Promise<boolean> {
  console.log('📄 Test: Valid payload returns PDF contract metadata and body');
  const { server, baseUrl } = await createResumeTestServer();
  const token = createAuthToken();
  const { resumeService } = await import('../../services/resume.service.js');
  const originalBuildResume = resumeService.buildResume.bind(resumeService);
  const payload = buildValidPayload();
  const pdfBytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
  const mockedResponse: ResumeBuildPdfResponseContract = {
    statusCode: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="jane-doe-resume.pdf"',
    },
    bodyFormat: 'binary',
    body: pdfBytes,
  };
  let capturedContext: { token: string; userId: string } | null = null;

  resumeService.buildResume = async (
    request: ResumeBuildRequest,
    context: { token: string; userId: string }
  ): Promise<ResumeBuildPdfResponseContract> => {
    assert.deepEqual(request, payload);
    capturedContext = context;
    return mockedResponse;
  };

  try {
    const response = await fetch(`${baseUrl}/api/resume/build`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/pdf',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.equal(response.headers.get('content-disposition'), 'attachment; filename="jane-doe-resume.pdf"');

    const body = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual(body, pdfBytes);
    assert.deepEqual(capturedContext, { token, userId: TEST_USER_ID });
    console.log('   ✅ Passed');
    return true;
  } catch (error) {
    console.log(`   ❌ ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    resumeService.buildResume = originalBuildResume;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function testLongResumeRendersAcrossPages(): Promise<boolean> {
  console.log('📚 Test: Long valid resume renders as multi-page PDF');
  const { server, baseUrl } = await createResumeTestServer();
  const token = createAuthToken();
  const payload = buildValidPayload();
  const longTemplateModel = buildLongTemplateModel();
  const { resumeContentService } = await import('../../services/resume-content.service.js');
  const originalGenerateResumeContent = resumeContentService.generateResumeContent.bind(resumeContentService);

  resumeContentService.generateResumeContent = async () => longTemplateModel;

  try {
    const response = await fetch(`${baseUrl}/api/resume/build`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/pdf',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.equal(response.headers.get('content-disposition'), 'attachment; filename="jane-doe-resume.pdf"');

    const body = new Uint8Array(await response.arrayBuffer());
    assert.ok(body.length > 0);

    const parsedPdf = await PDFDocument.load(body);
    assert.ok(parsedPdf.getPageCount() > 1, 'Expected long resume to paginate beyond one page');
    console.log('   ✅ Passed');
    return true;
  } catch (error) {
    console.log(`   ❌ ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    resumeContentService.generateResumeContent = originalGenerateResumeContent;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

export async function runResumeBuildTests(): Promise<{ passed: number; failed: number }> {
  console.log('🧪 Resume Build Integration Tests\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  if (await testUnauthorizedMissingToken()) passed++;
  else failed++;

  if (await testUnauthorizedInvalidToken()) passed++;
  else failed++;

  if (await testInvalidPayloadValidationFailure()) passed++;
  else failed++;

  if (await testUnknownKeysValidationFailure()) passed++;
  else failed++;

  if (await testValidPayloadReturnsPdfContract()) passed++;
  else failed++;

  if (await testLongResumeRendersAcrossPages()) passed++;
  else failed++;

  console.log('='.repeat(60));
  console.log(`Resume Build Tests: ${passed} passed, ${failed} failed\n`);

  return { passed, failed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runResumeBuildTests().then((result) => {
    process.exit(result.failed > 0 ? 1 : 0);
  }).catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}
