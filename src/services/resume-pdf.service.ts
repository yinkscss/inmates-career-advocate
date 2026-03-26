import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type {
  ResumeTemplateModel,
} from '../types/resume.types.js';
import type { ResumeTemplate } from '../types/resume.types.js';

// ─── Shared constants ──────────────────────────────────────────────────────────

const PAGE_W = 612;
const PAGE_H = 792;
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

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic?: PDFFont;
  boldItalic?: PDFFont;
}

interface Cursor {
  page: PDFPage;
  y: number;
}

function buildFilename(content: ResumeTemplateModel): string {
  const raw = `${content.personalInfo.fullName}-resume`;
  const sanitized = raw.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  if (!sanitized) throw new ResumePdfRenderError('Unable to build PDF filename');
  return `${sanitized}.pdf`;
}

const WINANSI_REPLACEMENTS: Array<[RegExp, string]> = [
  [/[\u2018\u2019\u201A]/g, "'"],
  [/[\u201C\u201D\u201E]/g, '"'],
  [/\u2026/g, '...'],
  [/[\u25B8\u25B9\u25BA\u25BB\u2023]/g, '\u2022'],
  [/[\u2713\u2714\u2715\u2716]/g, '*'],
  [/[\u2605\u2606]/g, '*'],
  [/[\u25CF\u25CB\u25A0\u25A1\u25C6\u25C7]/g, '\u2022'],
  [/[\u2192\u2794\u27A4\u279C]/g, '-'],
];

function sanitizeForPdf(text: string): string {
  let result = text;
  for (const [pattern, replacement] of WINANSI_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  // eslint-disable-next-line no-control-regex
  return result.replace(/[^\x00-\xFF]/g, '');
}

function wrapText(text: string, maxChars: number): string[] {
  const safe = sanitizeForPdf(text);
  if (maxChars <= 0) return [safe];
  const words = safe.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (candidate.length <= maxChars) { current = candidate; continue; }
    lines.push(current);
    current = words[i];
  }
  lines.push(current);
  return lines;
}

function metaLine(values: Array<string | undefined>): string {
  return values.map(v => v?.trim()).filter((v): v is string => Boolean(v)).join('  \u00B7  ');
}

// ─── Template 1: Classic ───────────────────────────────────────────────────────
// Clean, traditional, ATS-safe. Single column, serif-inspired layout.

async function renderClassic(content: ResumeTemplateModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setCreator('inmates-career-advocate');
  pdf.setProducer('inmates-career-advocate');
  pdf.setCreationDate(FIXED_PDF_DATE);
  pdf.setModificationDate(FIXED_PDF_DATE);
  pdf.setTitle(`${content.personalInfo.fullName} Resume`);

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.TimesRoman),
    bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    boldItalic: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic),
  };

  const MX = 54;
  const MT = 54;
  const MB = 48;
  const usable = PAGE_W - MX * 2;
  const maxChars = Math.floor(usable / 5.8);

  const C = {
    black: rgb(0.05, 0.05, 0.08),
    muted: rgb(0.35, 0.35, 0.38),
    accent: rgb(0.1, 0.22, 0.52),
    rule: rgb(0.15, 0.15, 0.18),
    light: rgb(0.75, 0.75, 0.78),
  };

  function newPage(): PDFPage { return pdf.addPage([PAGE_W, PAGE_H]); }

  function guard(cur: Cursor, need = 14): Cursor {
    if (cur.y - need >= MB) return cur;
    return { page: newPage(), y: PAGE_H - MT };
  }

  function drawLines(cur: Cursor, lines: string[], x: number, size: number, font: PDFFont, color = C.black): Cursor {
    for (const line of lines) {
      cur = guard(cur, size + 4);
      cur.page.drawText(line, { x, y: cur.y, size, font, color });
      cur = { ...cur, y: cur.y - (size + 4) };
    }
    return cur;
  }

  function sectionRule(cur: Cursor, title: string): Cursor {
    cur = guard(cur, 22);
    cur.page.drawText(title.toUpperCase(), { x: MX, y: cur.y, size: 9, font: fonts.bold, color: C.accent });
    cur.page.drawLine({ start: { x: MX, y: cur.y - 3 }, end: { x: MX + usable, y: cur.y - 3 }, thickness: 0.75, color: C.rule });
    return { ...cur, y: cur.y - 14 };
  }

  let cur: Cursor = { page: newPage(), y: PAGE_H - MT };

  // Name centred
  const nameW = fonts.bold.widthOfTextAtSize(content.personalInfo.fullName, 22);
  cur.page.drawText(content.personalInfo.fullName, { x: (PAGE_W - nameW) / 2, y: cur.y, size: 22, font: fonts.bold, color: C.black });
  cur = { ...cur, y: cur.y - 26 };

  if (content.personalInfo.headline) {
    const hlW = fonts.italic!.widthOfTextAtSize(content.personalInfo.headline, 10);
    cur.page.drawText(content.personalInfo.headline, { x: (PAGE_W - hlW) / 2, y: cur.y, size: 10, font: fonts.italic!, color: C.accent });
    cur = { ...cur, y: cur.y - 14 };
  }

  const contact = metaLine([content.personalInfo.email, content.personalInfo.phone, content.personalInfo.location]);
  if (contact) {
    const cW = fonts.regular.widthOfTextAtSize(contact, 9);
    cur.page.drawText(contact, { x: (PAGE_W - cW) / 2, y: cur.y, size: 9, font: fonts.regular, color: C.muted });
    cur = { ...cur, y: cur.y - 12 };
  }

  cur.page.drawLine({ start: { x: MX, y: cur.y }, end: { x: MX + usable, y: cur.y }, thickness: 1, color: C.rule });
  cur = { ...cur, y: cur.y - 14 };

  // Summary
  cur = sectionRule(cur, 'Summary');
  cur = drawLines(cur, wrapText(content.profile.summary, maxChars), MX, 10, fonts.regular);
  cur = { ...cur, y: cur.y - 10 };

  // Experience
  cur = sectionRule(cur, 'Experience');
  for (const exp of content.experience) {
    cur = guard(cur, 28);
    const dateW = fonts.italic!.widthOfTextAtSize(exp.dateRange, 9);
    cur.page.drawText(`${exp.position}`, { x: MX, y: cur.y, size: 10.5, font: fonts.bold, color: C.black });
    cur.page.drawText(exp.dateRange, { x: PAGE_W - MX - dateW, y: cur.y, size: 9, font: fonts.italic!, color: C.muted });
    cur = { ...cur, y: cur.y - 13 };
    cur.page.drawText(`${exp.company}${exp.location ? `  ·  ${exp.location}` : ''}`, { x: MX, y: cur.y, size: 9, font: fonts.italic!, color: C.muted });
    cur = { ...cur, y: cur.y - 12 };
    if (exp.summary) cur = drawLines(cur, wrapText(exp.summary, maxChars), MX, 9.5, fonts.regular);
    for (const h of exp.highlights) {
      cur = drawLines(cur, wrapText(`• ${h}`, maxChars - 3), MX + 10, 9.5, fonts.regular);
    }
    cur = { ...cur, y: cur.y - 8 };
  }

  // Education
  cur = sectionRule(cur, 'Education');
  for (const edu of content.education) {
    cur = guard(cur, 24);
    const degreeStr = `${edu.degree}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}`;
    const dateW = fonts.italic!.widthOfTextAtSize(edu.dateRange ?? '', 9);
    cur.page.drawText(degreeStr, { x: MX, y: cur.y, size: 10.5, font: fonts.bold, color: C.black });
    if (edu.dateRange) cur.page.drawText(edu.dateRange, { x: PAGE_W - MX - dateW, y: cur.y, size: 9, font: fonts.italic!, color: C.muted });
    cur = { ...cur, y: cur.y - 13 };
    cur.page.drawText(edu.institution, { x: MX, y: cur.y, size: 9, font: fonts.italic!, color: C.muted });
    cur = { ...cur, y: cur.y - 12 };
    if (edu.details) cur = drawLines(cur, wrapText(edu.details, maxChars), MX, 9.5, fonts.regular);
    cur = { ...cur, y: cur.y - 6 };
  }

  // Skills
  cur = sectionRule(cur, 'Skills');
  cur = drawLines(cur, wrapText(content.skills.join('  •  '), maxChars), MX, 9.5, fonts.regular);

  // Projects
  if (content.projects.length > 0) {
    cur = { ...cur, y: cur.y - 8 };
    cur = sectionRule(cur, 'Projects');
    for (const proj of content.projects) {
      cur = guard(cur, 24);
      cur.page.drawText(proj.name, { x: MX, y: cur.y, size: 10.5, font: fonts.bold, color: C.black });
      if (proj.dateRange) {
        const dW = fonts.italic!.widthOfTextAtSize(proj.dateRange, 9);
        cur.page.drawText(proj.dateRange, { x: PAGE_W - MX - dW, y: cur.y, size: 9, font: fonts.italic!, color: C.muted });
      }
      cur = { ...cur, y: cur.y - 13 };
      if (proj.role) { cur.page.drawText(proj.role, { x: MX, y: cur.y, size: 9, font: fonts.italic!, color: C.muted }); cur = { ...cur, y: cur.y - 12 }; }
      cur = drawLines(cur, wrapText(proj.description, maxChars), MX, 9.5, fonts.regular);
      if (proj.technologies.length) cur = drawLines(cur, wrapText(`Tech: ${proj.technologies.join(', ')}`, maxChars), MX, 9, fonts.italic!, C.muted);
      cur = { ...cur, y: cur.y - 6 };
    }
  }

  // Certifications
  if (content.certifications.length > 0) {
    cur = { ...cur, y: cur.y - 4 };
    cur = sectionRule(cur, 'Certifications');
    for (const cert of content.certifications) {
      cur = guard(cur, 18);
      cur.page.drawText(`${cert.name}  —  ${cert.issuer}`, { x: MX, y: cur.y, size: 10, font: fonts.bold, color: C.black });
      cur = { ...cur, y: cur.y - 13 };
      const certMeta = metaLine([cert.issueDate, cert.credentialId]);
      if (certMeta) { cur.page.drawText(certMeta, { x: MX, y: cur.y, size: 9, font: fonts.regular, color: C.muted }); cur = { ...cur, y: cur.y - 12 }; }
    }
  }

  return pdf.save();
}

// ─── Template 2: Modern ───────────────────────────────────────────────────────
// Two-column layout. Dark sidebar with contact info, white main body.

async function renderModern(content: ResumeTemplateModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setCreator('inmates-career-advocate');
  pdf.setProducer('inmates-career-advocate');
  pdf.setCreationDate(FIXED_PDF_DATE);
  pdf.setModificationDate(FIXED_PDF_DATE);
  pdf.setTitle(`${content.personalInfo.fullName} Resume`);

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
  };

  const SIDEBAR_W = 178;
  const MAIN_X = SIDEBAR_W + 20;
  const MAIN_W = PAGE_W - MAIN_X - 24;
  const SIDE_MX = 16;
  const SIDE_W = SIDEBAR_W - SIDE_MX * 2;
  const MT = 36;
  const MB = 36;
  const maxCharsMain = Math.floor(MAIN_W / 5.8);
  const maxCharsSide = Math.floor(SIDE_W / 5.8);

  const C = {
    sidebarBg: rgb(0.1, 0.12, 0.18),
    sidebarText: rgb(0.92, 0.92, 0.95),
    sidebarMuted: rgb(0.62, 0.65, 0.72),
    sidebarAccent: rgb(0.96, 0.67, 0.26),
    mainBg: rgb(1, 1, 1),
    mainText: rgb(0.08, 0.08, 0.1),
    mainMuted: rgb(0.4, 0.4, 0.44),
    mainAccent: rgb(0.1, 0.22, 0.52),
    rule: rgb(0.88, 0.88, 0.92),
  };

  function newPage(): PDFPage {
    const p = pdf.addPage([PAGE_W, PAGE_H]);
    // Sidebar background
    p.drawRectangle({ x: 0, y: 0, width: SIDEBAR_W, height: PAGE_H, color: C.sidebarBg });
    return p;
  }

  function guardMain(cur: Cursor, need = 14): Cursor {
    if (cur.y - need >= MB) return cur;
    return { page: newPage(), y: PAGE_H - MT };
  }

  function drawMainLines(cur: Cursor, lines: string[], x: number, size: number, font: PDFFont, color = C.mainText): Cursor {
    for (const line of lines) {
      cur = guardMain(cur, size + 4);
      cur.page.drawText(line, { x, y: cur.y, size, font, color });
      cur = { ...cur, y: cur.y - (size + 4) };
    }
    return cur;
  }

  function mainSection(cur: Cursor, title: string): Cursor {
    cur = guardMain(cur, 20);
    cur.page.drawRectangle({ x: MAIN_X, y: cur.y - 1, width: 3, height: 13, color: C.sidebarAccent });
    cur.page.drawText(title.toUpperCase(), { x: MAIN_X + 8, y: cur.y, size: 8.5, font: fonts.bold, color: C.mainAccent });
    cur.page.drawLine({ start: { x: MAIN_X + 8, y: cur.y - 3 }, end: { x: PAGE_W - 24, y: cur.y - 3 }, thickness: 0.5, color: C.rule });
    return { ...cur, y: cur.y - 16 };
  }

  const page1 = newPage();
  let cur: Cursor = { page: page1, y: PAGE_H - MT };

  // ── Sidebar content (static, page 1 only) ──
  let sy = PAGE_H - MT;

  // Name block
  const nameParts = content.personalInfo.fullName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  page1.drawText(firstName, { x: SIDE_MX, y: sy, size: 16, font: fonts.bold, color: C.sidebarText });
  sy -= 20;
  if (lastName) { page1.drawText(lastName, { x: SIDE_MX, y: sy, size: 16, font: fonts.bold, color: C.sidebarAccent }); sy -= 20; }
  if (content.personalInfo.headline) {
    for (const line of wrapText(content.personalInfo.headline, maxCharsSide)) {
      page1.drawText(line, { x: SIDE_MX, y: sy, size: 8.5, font: fonts.italic!, color: C.sidebarMuted }); sy -= 12;
    }
  }
  sy -= 10;
  page1.drawLine({ start: { x: SIDE_MX, y: sy }, end: { x: SIDEBAR_W - SIDE_MX, y: sy }, thickness: 0.5, color: rgb(0.25, 0.28, 0.35) });
  sy -= 14;

  // Contact
  page1.drawText('CONTACT', { x: SIDE_MX, y: sy, size: 7.5, font: fonts.bold, color: C.sidebarAccent }); sy -= 12;
  const contactItems = [content.personalInfo.email, content.personalInfo.phone, content.personalInfo.location].filter(Boolean) as string[];
  for (const item of contactItems) {
    for (const line of wrapText(item, maxCharsSide)) {
      page1.drawText(line, { x: SIDE_MX, y: sy, size: 8, font: fonts.regular, color: C.sidebarMuted }); sy -= 11;
    }
  }
  sy -= 10;

  // Skills in sidebar
  page1.drawLine({ start: { x: SIDE_MX, y: sy }, end: { x: SIDEBAR_W - SIDE_MX, y: sy }, thickness: 0.5, color: rgb(0.25, 0.28, 0.35) });
  sy -= 14;
  page1.drawText('SKILLS', { x: SIDE_MX, y: sy, size: 7.5, font: fonts.bold, color: C.sidebarAccent }); sy -= 14;
  for (const skill of content.skills) {
    if (sy < MB + 10) break;
    page1.drawRectangle({ x: SIDE_MX, y: sy - 2, width: SIDE_W, height: 13, color: rgb(0.16, 0.19, 0.26) });
    page1.drawText(skill, { x: SIDE_MX + 6, y: sy, size: 8, font: fonts.regular, color: C.sidebarText }); sy -= 17;
  }

  // Certifications in sidebar if any
  if (content.certifications.length > 0 && sy > MB + 40) {
    sy -= 8;
    page1.drawLine({ start: { x: SIDE_MX, y: sy }, end: { x: SIDEBAR_W - SIDE_MX, y: sy }, thickness: 0.5, color: rgb(0.25, 0.28, 0.35) });
    sy -= 14;
    page1.drawText('CERTIFICATIONS', { x: SIDE_MX, y: sy, size: 7.5, font: fonts.bold, color: C.sidebarAccent }); sy -= 12;
    for (const cert of content.certifications) {
      if (sy < MB + 10) break;
      for (const line of wrapText(cert.name, maxCharsSide)) {
        page1.drawText(line, { x: SIDE_MX, y: sy, size: 8, font: fonts.bold, color: C.sidebarText }); sy -= 11;
      }
      page1.drawText(cert.issuer, { x: SIDE_MX, y: sy, size: 7.5, font: fonts.regular, color: C.sidebarMuted }); sy -= 13;
    }
  }

  // ── Main body ──
  // Summary
  cur = mainSection(cur, 'Summary');
  cur = drawMainLines(cur, wrapText(content.profile.summary, maxCharsMain), MAIN_X, 9.5, fonts.regular);
  cur = { ...cur, y: cur.y - 10 };

  // Experience
  cur = mainSection(cur, 'Experience');
  for (const exp of content.experience) {
    cur = guardMain(cur, 28);
    cur.page.drawText(exp.position, { x: MAIN_X, y: cur.y, size: 10.5, font: fonts.bold, color: C.mainText });
    const dW = fonts.italic!.widthOfTextAtSize(exp.dateRange, 8.5);
    cur.page.drawText(exp.dateRange, { x: PAGE_W - 24 - dW, y: cur.y, size: 8.5, font: fonts.italic!, color: C.mainMuted });
    cur = { ...cur, y: cur.y - 13 };
    cur.page.drawText(`${exp.company}${exp.location ? `  ·  ${exp.location}` : ''}`, { x: MAIN_X, y: cur.y, size: 8.5, font: fonts.italic!, color: C.mainAccent });
    cur = { ...cur, y: cur.y - 12 };
    if (exp.summary) cur = drawMainLines(cur, wrapText(exp.summary, maxCharsMain), MAIN_X, 9, fonts.regular);
    for (const h of exp.highlights) cur = drawMainLines(cur, wrapText(`\u2022 ${h}`, maxCharsMain - 3), MAIN_X + 8, 9, fonts.regular);
    cur = { ...cur, y: cur.y - 8 };
  }

  // Education
  cur = mainSection(cur, 'Education');
  for (const edu of content.education) {
    cur = guardMain(cur, 24);
    const degStr = `${edu.degree}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}`;
    cur.page.drawText(degStr, { x: MAIN_X, y: cur.y, size: 10.5, font: fonts.bold, color: C.mainText });
    if (edu.dateRange) {
      const dW = fonts.italic!.widthOfTextAtSize(edu.dateRange, 8.5);
      cur.page.drawText(edu.dateRange, { x: PAGE_W - 24 - dW, y: cur.y, size: 8.5, font: fonts.italic!, color: C.mainMuted });
    }
    cur = { ...cur, y: cur.y - 13 };
    cur.page.drawText(edu.institution, { x: MAIN_X, y: cur.y, size: 8.5, font: fonts.italic!, color: C.mainAccent });
    cur = { ...cur, y: cur.y - 12 };
    if (edu.details) cur = drawMainLines(cur, wrapText(edu.details, maxCharsMain), MAIN_X, 9, fonts.regular);
    cur = { ...cur, y: cur.y - 6 };
  }

  // Projects
  if (content.projects.length > 0) {
    cur = mainSection(cur, 'Projects');
    for (const proj of content.projects) {
      cur = guardMain(cur, 24);
      cur.page.drawText(proj.name, { x: MAIN_X, y: cur.y, size: 10.5, font: fonts.bold, color: C.mainText });
      if (proj.dateRange) {
        const dW = fonts.italic!.widthOfTextAtSize(proj.dateRange, 8.5);
        cur.page.drawText(proj.dateRange, { x: PAGE_W - 24 - dW, y: cur.y, size: 8.5, font: fonts.italic!, color: C.mainMuted });
      }
      cur = { ...cur, y: cur.y - 13 };
      if (proj.role) { cur.page.drawText(proj.role, { x: MAIN_X, y: cur.y, size: 8.5, font: fonts.italic!, color: C.mainAccent }); cur = { ...cur, y: cur.y - 12 }; }
      cur = drawMainLines(cur, wrapText(proj.description, maxCharsMain), MAIN_X, 9, fonts.regular);
      if (proj.technologies.length) cur = drawMainLines(cur, wrapText(`Tech: ${proj.technologies.join(', ')}`, maxCharsMain), MAIN_X, 8.5, fonts.italic!, C.mainMuted);
      cur = { ...cur, y: cur.y - 6 };
    }
  }

  return pdf.save();
}

// ─── Template 3: Executive ────────────────────────────────────────────────────
// Bold header bar, generous white space, understated elegance.

async function renderExecutive(content: ResumeTemplateModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setCreator('inmates-career-advocate');
  pdf.setProducer('inmates-career-advocate');
  pdf.setCreationDate(FIXED_PDF_DATE);
  pdf.setModificationDate(FIXED_PDF_DATE);
  pdf.setTitle(`${content.personalInfo.fullName} Resume`);

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };

  const MX = 48;
  const MB = 48;
  const usable = PAGE_W - MX * 2;
  const maxChars = Math.floor(usable / 5.9);
  const HEADER_H = 100;

  const C = {
    headerBg: rgb(0.07, 0.09, 0.14),
    headerText: rgb(0.97, 0.97, 0.98),
    headerSub: rgb(0.72, 0.75, 0.82),
    headerAccent: rgb(0.95, 0.65, 0.22),
    bodyText: rgb(0.08, 0.08, 0.1),
    bodyMuted: rgb(0.42, 0.42, 0.46),
    sectionTitle: rgb(0.07, 0.09, 0.14),
    accentLine: rgb(0.95, 0.65, 0.22),
    rule: rgb(0.9, 0.9, 0.93),
  };

  function newPage(withHeader = false): PDFPage {
    const p = pdf.addPage([PAGE_W, PAGE_H]);
    if (withHeader) {
      p.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: C.headerBg });
    }
    return p;
  }

  function guard(cur: Cursor, need = 14): Cursor {
    if (cur.y - need >= MB) return cur;
    return { page: newPage(false), y: PAGE_H - 48 };
  }

  function drawLines(cur: Cursor, lines: string[], x: number, size: number, font: PDFFont, color = C.bodyText): Cursor {
    for (const line of lines) {
      cur = guard(cur, size + 5);
      cur.page.drawText(line, { x, y: cur.y, size, font, color });
      cur = { ...cur, y: cur.y - (size + 5) };
    }
    return cur;
  }

  function sectionHeader(cur: Cursor, title: string): Cursor {
    cur = guard(cur, 22);
    cur.page.drawRectangle({ x: MX, y: cur.y - 1, width: usable, height: 0.75, color: C.rule });
    cur.page.drawRectangle({ x: MX, y: cur.y - 1, width: 32, height: 0.75, color: C.accentLine });
    cur.page.drawText(title.toUpperCase(), { x: MX, y: cur.y + 8, size: 7.5, font: fonts.bold, color: C.sectionTitle });
    return { ...cur, y: cur.y - 14 };
  }

  const page1 = newPage(true);

  // Header
  const nameY = PAGE_H - 38;
  page1.drawText(content.personalInfo.fullName, { x: MX, y: nameY, size: 24, font: fonts.bold, color: C.headerText });
  if (content.personalInfo.headline) {
    page1.drawText(content.personalInfo.headline, { x: MX, y: nameY - 22, size: 10, font: fonts.regular, color: C.headerAccent });
  }
  const contact = metaLine([content.personalInfo.email, content.personalInfo.phone, content.personalInfo.location]);
  if (contact) {
    page1.drawText(contact, { x: MX, y: nameY - 38, size: 8.5, font: fonts.regular, color: C.headerSub });
  }

  // Accent bar at bottom of header
  page1.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: 3, color: C.accentLine });

  let cur: Cursor = { page: page1, y: PAGE_H - HEADER_H - 22 };

  // Summary
  cur = sectionHeader(cur, 'Professional Summary');
  cur = drawLines(cur, wrapText(content.profile.summary, maxChars), MX, 9.5, fonts.regular);
  cur = { ...cur, y: cur.y - 12 };

  // Experience
  cur = sectionHeader(cur, 'Experience');
  for (const exp of content.experience) {
    cur = guard(cur, 30);
    // Position + date on same line
    cur.page.drawText(exp.position, { x: MX, y: cur.y, size: 11, font: fonts.bold, color: C.bodyText });
    const dW = fonts.italic!.widthOfTextAtSize(exp.dateRange, 8.5);
    cur.page.drawText(exp.dateRange, { x: PAGE_W - MX - dW, y: cur.y, size: 8.5, font: fonts.italic!, color: C.bodyMuted });
    cur = { ...cur, y: cur.y - 14 };
    // Company line with left accent dot
    cur.page.drawRectangle({ x: MX, y: cur.y + 2, width: 4, height: 4, color: C.accentLine });
    cur.page.drawText(`${exp.company}${exp.location ? `  ·  ${exp.location}` : ''}`, { x: MX + 10, y: cur.y, size: 9, font: fonts.italic!, color: C.bodyMuted });
    cur = { ...cur, y: cur.y - 13 };
    if (exp.summary) cur = drawLines(cur, wrapText(exp.summary, maxChars), MX, 9.5, fonts.regular);
    for (const h of exp.highlights) {
      cur = drawLines(cur, wrapText(`—  ${h}`, maxChars - 3), MX + 12, 9.5, fonts.regular);
    }
    cur = { ...cur, y: cur.y - 10 };
  }

  // Education
  cur = sectionHeader(cur, 'Education');
  for (const edu of content.education) {
    cur = guard(cur, 26);
    const degStr = `${edu.degree}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}`;
    cur.page.drawText(degStr, { x: MX, y: cur.y, size: 11, font: fonts.bold, color: C.bodyText });
    if (edu.dateRange) {
      const dW = fonts.italic!.widthOfTextAtSize(edu.dateRange, 8.5);
      cur.page.drawText(edu.dateRange, { x: PAGE_W - MX - dW, y: cur.y, size: 8.5, font: fonts.italic!, color: C.bodyMuted });
    }
    cur = { ...cur, y: cur.y - 14 };
    cur.page.drawRectangle({ x: MX, y: cur.y + 2, width: 4, height: 4, color: C.accentLine });
    cur.page.drawText(edu.institution, { x: MX + 10, y: cur.y, size: 9, font: fonts.italic!, color: C.bodyMuted });
    cur = { ...cur, y: cur.y - 13 };
    if (edu.details) cur = drawLines(cur, wrapText(edu.details, maxChars), MX, 9.5, fonts.regular);
    cur = { ...cur, y: cur.y - 8 };
  }

  // Skills — pill-style row
  cur = sectionHeader(cur, 'Skills');
  let sx = MX;
  const skillY = cur.y;
  let skillRow = 0;
  for (const skill of content.skills) {
    const sw = fonts.regular.widthOfTextAtSize(skill, 8.5) + 16;
    if (sx + sw > PAGE_W - MX) { sx = MX; skillRow++; }
    const rowY = skillY - skillRow * 18;
    cur = guard({ page: cur.page, y: rowY }, 18);
    cur.page.drawRectangle({ x: sx, y: rowY - 3, width: sw, height: 14, color: rgb(0.94, 0.95, 0.97) });
    cur.page.drawText(skill, { x: sx + 8, y: rowY, size: 8.5, font: fonts.regular, color: C.bodyText });
    sx += sw + 6;
  }
  cur = { ...cur, y: skillY - (skillRow + 1) * 18 - 8 };

  // Projects
  if (content.projects.length > 0) {
    cur = sectionHeader(cur, 'Projects');
    for (const proj of content.projects) {
      cur = guard(cur, 26);
      cur.page.drawText(proj.name, { x: MX, y: cur.y, size: 11, font: fonts.bold, color: C.bodyText });
      if (proj.dateRange) {
        const dW = fonts.italic!.widthOfTextAtSize(proj.dateRange, 8.5);
        cur.page.drawText(proj.dateRange, { x: PAGE_W - MX - dW, y: cur.y, size: 8.5, font: fonts.italic!, color: C.bodyMuted });
      }
      cur = { ...cur, y: cur.y - 14 };
      if (proj.role) { cur.page.drawRectangle({ x: MX, y: cur.y + 2, width: 4, height: 4, color: C.accentLine }); cur.page.drawText(proj.role, { x: MX + 10, y: cur.y, size: 9, font: fonts.italic!, color: C.bodyMuted }); cur = { ...cur, y: cur.y - 13 }; }
      cur = drawLines(cur, wrapText(proj.description, maxChars), MX, 9.5, fonts.regular);
      if (proj.technologies.length) cur = drawLines(cur, wrapText(`Tech: ${proj.technologies.join(', ')}`, maxChars), MX, 8.5, fonts.italic!, C.bodyMuted);
      cur = { ...cur, y: cur.y - 8 };
    }
  }

  // Certifications
  if (content.certifications.length > 0) {
    cur = sectionHeader(cur, 'Certifications');
    for (const cert of content.certifications) {
      cur = guard(cur, 20);
      cur.page.drawText(`${cert.name}`, { x: MX, y: cur.y, size: 10, font: fonts.bold, color: C.bodyText });
      cur = { ...cur, y: cur.y - 13 };
      cur.page.drawText(`${cert.issuer}${cert.issueDate ? `  ·  ${cert.issueDate}` : ''}`, { x: MX, y: cur.y, size: 8.5, font: fonts.regular, color: C.bodyMuted });
      cur = { ...cur, y: cur.y - 12 };
    }
  }

  return pdf.save();
}

// ─── Content sanitizer (WinAnsi safety) ─────────────────────────────────────

function sanitizeString(s: string): string { return sanitizeForPdf(s); }
function sanitizeOptional(s: string | undefined): string | undefined { return s ? sanitizeForPdf(s) : s; }

function sanitizeContent(c: ResumeTemplateModel): ResumeTemplateModel {
  return {
    personalInfo: {
      fullName: sanitizeString(c.personalInfo.fullName),
      email: sanitizeString(c.personalInfo.email),
      phone: sanitizeOptional(c.personalInfo.phone),
      location: sanitizeOptional(c.personalInfo.location),
      headline: sanitizeOptional(c.personalInfo.headline),
      links: c.personalInfo.links.map(l => ({ ...l, label: sanitizeString(l.label) })),
    },
    profile: {
      summary: sanitizeString(c.profile.summary),
      objective: sanitizeOptional(c.profile.objective),
    },
    experience: c.experience.map(e => ({
      ...e,
      position: sanitizeString(e.position),
      company: sanitizeString(e.company),
      location: sanitizeOptional(e.location),
      dateRange: sanitizeString(e.dateRange),
      summary: sanitizeOptional(e.summary),
      highlights: e.highlights.map(sanitizeString),
    })),
    education: c.education.map(e => ({
      ...e,
      institution: sanitizeString(e.institution),
      degree: sanitizeString(e.degree),
      fieldOfStudy: sanitizeOptional(e.fieldOfStudy),
      dateRange: sanitizeOptional(e.dateRange),
      location: sanitizeOptional(e.location),
      details: sanitizeOptional(e.details),
    })),
    skills: c.skills.map(sanitizeString),
    certifications: c.certifications.map(cert => ({
      ...cert,
      name: sanitizeString(cert.name),
      issuer: sanitizeString(cert.issuer),
      issueDate: sanitizeOptional(cert.issueDate),
      expirationDate: sanitizeOptional(cert.expirationDate),
      credentialId: sanitizeOptional(cert.credentialId),
    })),
    projects: c.projects.map(p => ({
      ...p,
      name: sanitizeString(p.name),
      description: sanitizeString(p.description),
      role: sanitizeOptional(p.role),
      technologies: p.technologies.map(sanitizeString),
      dateRange: sanitizeOptional(p.dateRange),
    })),
  };
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class ResumePdfService {
  async renderResumePdf(content: ResumeTemplateModel, template: ResumeTemplate = 'classic'): Promise<RenderedResumePdf> {
    try {
      const safe = sanitizeContent(content);
      const filename = buildFilename(safe);
      let body: Uint8Array;

      switch (template) {
        case 'modern':
          body = await renderModern(safe);
          break;
        case 'executive':
          body = await renderExecutive(safe);
          break;
        default:
          body = await renderClassic(safe);
      }

      return { filename, body };
    } catch (error) {
      if (error instanceof ResumePdfRenderError) throw error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[PDF Render ${template}] Error:`, errorMessage, error instanceof Error ? error.stack : '');
      throw new ResumePdfRenderError(`Failed to render resume PDF (${template}): ${errorMessage}`, { cause: error });
    }
  }
}

export const resumePdfService = new ResumePdfService();
