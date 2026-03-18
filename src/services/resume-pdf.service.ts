import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type {
  ResumeTemplateCertificationItem,
  ResumeTemplateEducationItem,
  ResumeTemplateExperienceItem,
  ResumeTemplateModel,
  ResumeTemplateProjectItem,
} from '../types/resume.types.js';

const PAGE = {
  width: 612,
  height: 792,
  marginX: 48,
  marginTop: 44,
  marginBottom: 44,
};

const TYPO = {
  nameSize: 24,
  headlineSize: 11,
  contactSize: 10,
  sectionTitleSize: 10,
  sectionBodySize: 10,
  metaSize: 9,
  lineHeight: 14,
  sectionGap: 12,
  blockGap: 8,
};

const PALETTE = {
  text: rgb(0.13, 0.14, 0.16),
  muted: rgb(0.38, 0.41, 0.45),
  sectionTitle: rgb(0.08, 0.1, 0.14),
  accent: rgb(0.16, 0.39, 0.83),
  divider: rgb(0.84, 0.87, 0.91),
};

const FIXED_PDF_DATE = new Date('2020-01-01T00:00:00.000Z');

export interface RenderedResumePdf {
  filename: string;
  body: Uint8Array;
}

export class ResumePdfRenderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ResumePdfRenderError';
  }
}

type PdfPage = ReturnType<PDFDocument['addPage']>;

interface LayoutCursor {
  page: PdfPage;
  y: number;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

function buildPdfFilename(content: ResumeTemplateModel): string {
  const raw = `${content.personalInfo.fullName}-resume`;
  const sanitized = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

  if (!sanitized) {
    throw new ResumePdfRenderError('Unable to build PDF filename from personal info');
  }

  return `${sanitized}.pdf`;
}

function createPage(pdf: PDFDocument): PdfPage {
  return pdf.addPage([PAGE.width, PAGE.height]);
}

function ensureLineCapacityForHeight(
  cursor: LayoutCursor,
  pdf: PDFDocument,
  requiredHeight = TYPO.lineHeight
): LayoutCursor {
  if (cursor.y - requiredHeight >= PAGE.marginBottom) {
    return cursor;
  }

  return {
    page: createPage(pdf),
    y: PAGE.height - PAGE.marginTop,
  };
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function wrapText(text: string, maxChars: number): string[] {
  if (maxChars <= 0) {
    throw new ResumePdfRenderError('Text layout configuration is invalid');
  }

  const words = normalizeLine(text).split(' ').filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = words[0];
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${currentLine} ${words[index]}`;
    if (candidate.length <= maxChars) {
      currentLine = candidate;
      continue;
    }
    lines.push(currentLine);
    currentLine = words[index];
  }
  lines.push(currentLine);
  return lines;
}

function drawTextLines(args: {
  cursor: LayoutCursor;
  lines: string[];
  x: number;
  size: number;
  color?: ReturnType<typeof rgb>;
  pdf: PDFDocument;
  font: PDFFont;
}): LayoutCursor {
  const { lines, x, size, pdf, font, color = PALETTE.text } = args;
  let cursor = args.cursor;

  for (const line of lines) {
    cursor = ensureLineCapacityForHeight(cursor, pdf, TYPO.lineHeight);
    cursor.page.drawText(line, {
      x,
      y: cursor.y,
      size,
      font,
      color,
    });
    cursor = { ...cursor, y: cursor.y - TYPO.lineHeight };
  }

  return cursor;
}

function drawSectionHeader(cursor: LayoutCursor, title: string, pdf: PDFDocument, fonts: Fonts): LayoutCursor {
  const safeCursor = ensureLineCapacityForHeight(cursor, pdf, 24);
  const titleX = PAGE.marginX + 14;
  const lineY = safeCursor.y - 6;

  safeCursor.page.drawRectangle({
    x: PAGE.marginX,
    y: safeCursor.y - 2,
    width: 4,
    height: 12,
    color: PALETTE.accent,
  });

  safeCursor.page.drawText(title, {
    x: titleX,
    y: safeCursor.y,
    size: TYPO.sectionTitleSize,
    font: fonts.bold,
    color: PALETTE.sectionTitle,
  });

  safeCursor.page.drawLine({
    start: { x: titleX + 58, y: lineY },
    end: { x: PAGE.width - PAGE.marginX, y: lineY },
    thickness: 1,
    color: PALETTE.divider,
  });

  return { ...safeCursor, y: safeCursor.y - 18 };
}

function drawEntryTitleLine(args: {
  cursor: LayoutCursor;
  left: string;
  right?: string;
  pdf: PDFDocument;
  fonts: Fonts;
}): LayoutCursor {
  let cursor = ensureLineCapacityForHeight(args.cursor, args.pdf, TYPO.lineHeight);

  cursor.page.drawText(args.left, {
    x: PAGE.marginX,
    y: cursor.y,
    size: TYPO.sectionBodySize,
    font: args.fonts.bold,
    color: PALETTE.text,
  });

  if (args.right) {
    const textWidth = args.fonts.regular.widthOfTextAtSize(args.right, TYPO.metaSize);
    cursor.page.drawText(args.right, {
      x: PAGE.width - PAGE.marginX - textWidth,
      y: cursor.y,
      size: TYPO.metaSize,
      font: args.fonts.regular,
      color: PALETTE.muted,
    });
  }

  return { ...cursor, y: cursor.y - TYPO.lineHeight };
}

function metadataLine(values: Array<string | undefined>): string {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(' | ');
}

function experienceTitle(item: ResumeTemplateExperienceItem): string {
  return `${item.position} | ${item.company}`;
}

function educationTitle(item: ResumeTemplateEducationItem): string {
  return `${item.degree}${item.fieldOfStudy ? `, ${item.fieldOfStudy}` : ''}`;
}

function certificationTitle(item: ResumeTemplateCertificationItem): string {
  return `${item.name} | ${item.issuer}`;
}

function projectTitle(item: ResumeTemplateProjectItem): string {
  return item.name;
}

export class ResumePdfService {
  async renderResumePdf(content: ResumeTemplateModel): Promise<RenderedResumePdf> {
    try {
      const filename = buildPdfFilename(content);
      const pdf = await PDFDocument.create();
      pdf.setCreator('inmates-career-advocate');
      pdf.setProducer('inmates-career-advocate');
      pdf.setCreationDate(FIXED_PDF_DATE);
      pdf.setModificationDate(FIXED_PDF_DATE);
      pdf.setTitle(`${content.personalInfo.fullName} Resume`);

      const fonts: Fonts = {
        regular: await pdf.embedFont(StandardFonts.Helvetica),
        bold: await pdf.embedFont(StandardFonts.HelveticaBold),
      };

      let cursor: LayoutCursor = {
        page: createPage(pdf),
        y: PAGE.height - PAGE.marginTop,
      };

      const usableWidth = PAGE.width - PAGE.marginX * 2;
      const maxChars = Math.max(24, Math.floor(usableWidth / 6.3));

      cursor.page.drawRectangle({
        x: PAGE.marginX,
        y: cursor.y - 34,
        width: usableWidth,
        height: 2,
        color: PALETTE.accent,
      });

      cursor = drawTextLines({
        cursor,
        lines: [content.personalInfo.fullName],
        x: PAGE.marginX,
        size: TYPO.nameSize,
        color: PALETTE.sectionTitle,
        pdf,
        font: fonts.bold,
      });

      if (content.personalInfo.headline) {
        cursor = drawTextLines({
          cursor,
          lines: wrapText(content.personalInfo.headline, maxChars),
          x: PAGE.marginX,
          size: TYPO.headlineSize,
          color: PALETTE.accent,
          pdf,
          font: fonts.regular,
        });
      }

      const contactLine = metadataLine([
        content.personalInfo.email,
        content.personalInfo.phone,
        content.personalInfo.location,
      ]);

      if (contactLine) {
        cursor = drawTextLines({
          cursor: { ...cursor, y: cursor.y - 2 },
          lines: [contactLine],
          x: PAGE.marginX,
          size: TYPO.contactSize,
          color: PALETTE.muted,
          pdf,
          font: fonts.regular,
        });
      }

      cursor = { ...cursor, y: cursor.y - TYPO.sectionGap };

      cursor = drawSectionHeader(cursor, 'SUMMARY', pdf, fonts);
      cursor = drawTextLines({
        cursor,
        lines: wrapText(content.profile.summary, maxChars),
        x: PAGE.marginX,
        size: TYPO.sectionBodySize,
        pdf,
        font: fonts.regular,
      });
      cursor = { ...cursor, y: cursor.y - TYPO.sectionGap };

      cursor = drawSectionHeader(cursor, 'EXPERIENCE', pdf, fonts);
      for (const item of content.experience) {
        cursor = drawEntryTitleLine({
          cursor,
          left: experienceTitle(item),
          right: item.dateRange,
          pdf,
          fonts,
        });

        const itemMeta = metadataLine([item.location]);
        if (itemMeta) {
          cursor = drawTextLines({
            cursor,
            lines: [itemMeta],
            x: PAGE.marginX,
            size: TYPO.metaSize,
            color: PALETTE.muted,
            pdf,
            font: fonts.regular,
          });
        }

        if (item.summary) {
          cursor = drawTextLines({
            cursor,
            lines: wrapText(item.summary, maxChars - 1),
            x: PAGE.marginX,
            size: TYPO.sectionBodySize,
            pdf,
            font: fonts.regular,
          });
        }

        if (item.highlights?.length) {
          for (const highlight of item.highlights) {
            cursor = drawTextLines({
              cursor,
              lines: wrapText(`• ${highlight}`, maxChars - 2),
              x: PAGE.marginX + 10,
              size: TYPO.sectionBodySize,
              pdf,
              font: fonts.regular,
            });
          }
        }

        cursor = { ...cursor, y: cursor.y - TYPO.blockGap };
      }

      cursor = drawSectionHeader(cursor, 'EDUCATION', pdf, fonts);
      for (const item of content.education) {
        cursor = drawEntryTitleLine({
          cursor,
          left: educationTitle(item),
          right: item.dateRange,
          pdf,
          fonts,
        });

        const schoolLine = metadataLine([item.institution, item.location]);
        if (schoolLine) {
          cursor = drawTextLines({
            cursor,
            lines: [schoolLine],
            x: PAGE.marginX,
            size: TYPO.metaSize,
            color: PALETTE.muted,
            pdf,
            font: fonts.regular,
          });
        }

        if (item.details) {
          cursor = drawTextLines({
            cursor,
            lines: wrapText(item.details, maxChars - 1),
            x: PAGE.marginX,
            size: TYPO.sectionBodySize,
            pdf,
            font: fonts.regular,
          });
        }

        cursor = { ...cursor, y: cursor.y - TYPO.blockGap };
      }

      cursor = drawSectionHeader(cursor, 'SKILLS', pdf, fonts);
      cursor = drawTextLines({
        cursor,
        lines: wrapText(content.skills.join(' • '), maxChars),
        x: PAGE.marginX,
        size: TYPO.sectionBodySize,
        pdf,
        font: fonts.regular,
      });
      cursor = { ...cursor, y: cursor.y - TYPO.sectionGap };

      if (content.certifications.length > 0) {
        cursor = drawSectionHeader(cursor, 'CERTIFICATIONS', pdf, fonts);
        for (const item of content.certifications) {
          cursor = drawEntryTitleLine({
            cursor,
            left: certificationTitle(item),
            right: item.issueDate ?? item.expirationDate,
            pdf,
            fonts,
          });

          if (item.credentialId) {
            cursor = drawTextLines({
              cursor,
              lines: [`Credential ID: ${item.credentialId}`],
              x: PAGE.marginX,
              size: TYPO.metaSize,
              color: PALETTE.muted,
              pdf,
              font: fonts.regular,
            });
          }

          if (item.credentialUrl) {
            cursor = drawTextLines({
              cursor,
              lines: wrapText(item.credentialUrl, maxChars),
              x: PAGE.marginX,
              size: TYPO.metaSize,
              color: PALETTE.muted,
              pdf,
              font: fonts.regular,
            });
          }

          cursor = { ...cursor, y: cursor.y - TYPO.blockGap };
        }
      }

      if (content.projects.length > 0) {
        cursor = drawSectionHeader(cursor, 'PROJECTS', pdf, fonts);
        for (const item of content.projects) {
          cursor = drawEntryTitleLine({
            cursor,
            left: projectTitle(item),
            right: item.dateRange,
            pdf,
            fonts,
          });

          if (item.role) {
            cursor = drawTextLines({
              cursor,
              lines: [item.role],
              x: PAGE.marginX,
              size: TYPO.metaSize,
              color: PALETTE.muted,
              pdf,
              font: fonts.regular,
            });
          }

          cursor = drawTextLines({
            cursor,
            lines: wrapText(item.description, maxChars),
            x: PAGE.marginX,
            size: TYPO.sectionBodySize,
            pdf,
            font: fonts.regular,
          });

          if (item.technologies?.length) {
            cursor = drawTextLines({
              cursor,
              lines: wrapText(`Tech: ${item.technologies.join(', ')}`, maxChars - 1),
              x: PAGE.marginX,
              size: TYPO.metaSize,
              color: PALETTE.muted,
              pdf,
              font: fonts.regular,
            });
          }

          if (item.projectUrl) {
            cursor = drawTextLines({
              cursor,
              lines: wrapText(item.projectUrl, maxChars),
              x: PAGE.marginX,
              size: TYPO.metaSize,
              color: PALETTE.muted,
              pdf,
              font: fonts.regular,
            });
          }

          cursor = { ...cursor, y: cursor.y - TYPO.blockGap };
        }
      }

      if (content.personalInfo.links.length > 0) {
        cursor = drawSectionHeader(cursor, 'LINKS', pdf, fonts);
        for (const link of content.personalInfo.links) {
          cursor = drawTextLines({
            cursor,
            lines: wrapText(`${link.label}: ${link.url}`, maxChars),
            x: PAGE.marginX,
            size: TYPO.sectionBodySize,
            pdf,
            font: fonts.regular,
          });
        }
      }

      const body = await pdf.save();
      return { filename, body };
    } catch (error) {
      if (error instanceof ResumePdfRenderError) {
        throw error;
      }
      throw new ResumePdfRenderError('Failed to render deterministic resume PDF', { cause: error });
    }
  }
}

export const resumePdfService = new ResumePdfService();
