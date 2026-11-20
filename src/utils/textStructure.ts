import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

interface PositionedSpan {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL: boolean;
}

interface TextLine {
  y: number;
  height: number;
  spans: PositionedSpan[];
}

export function countMeaningfulChars(text: string): number {
  const matches = text.match(/[A-Za-z0-9]/g);
  return matches ? matches.length : 0;
}

/**
 * Reconstructs ordered lines and paragraph spacing from PDF.js text content items,
 * preserving unit numbers, headings, and bullet lines.
 */
export function reconstructPdfPageText(
  items: Array<TextItem | TextMarkedContent>
): string {
  const spans: PositionedSpan[] = [];

  for (const rawItem of items) {
    if (!('str' in rawItem)) continue;
    const item = rawItem as TextItem;
    const text = item.str;
    if (!text) continue;

    const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0];
    const x = typeof transform[4] === 'number' ? transform[4] : 0;
    const y = typeof transform[5] === 'number' ? transform[5] : 0;
    const height =
      typeof item.height === 'number' && item.height > 0
        ? item.height
        : Math.abs(typeof transform[3] === 'number' ? transform[3] : 10) || 10;

    spans.push({
      str: text,
      x,
      y,
      width: typeof item.width === 'number' ? item.width : 0,
      height,
      hasEOL: Boolean(item.hasEOL),
    });
  }

  if (spans.length === 0) return '';

  // Sort top-to-bottom (higher PDF Y is higher on page), then left-to-right
  spans.sort((a, b) => {
    if (Math.abs(b.y - a.y) > 3) {
      return b.y - a.y;
    }
    return a.x - b.x;
  });

  const lines: TextLine[] = [];
  const Y_TOLERANCE = 3.2;

  for (const span of spans) {
    const lastLine = lines[lines.length - 1];
    if (lastLine && Math.abs(lastLine.y - span.y) <= Y_TOLERANCE) {
      lastLine.spans.push(span);
      lastLine.height = Math.max(lastLine.height, span.height);
    } else {
      lines.push({
        y: span.y,
        height: span.height,
        spans: [span],
      });
    }
  }

  const outputLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    line.spans.sort((a, b) => a.x - b.x);

    let lineText = '';
    for (let j = 0; j < line.spans.length; j++) {
      const curr = line.spans[j];
      if (j === 0) {
        lineText = curr.str;
        continue;
      }

      const prev = line.spans[j - 1];
      const prevEnd = prev.x + prev.width;
      const gap = curr.x - prevEnd;
      const spaceThreshold = Math.max(1.5, curr.height * 0.18);

      const needsSpace =
        gap > spaceThreshold &&
        !lineText.endsWith(' ') &&
        !curr.str.startsWith(' ');

      lineText += (needsSpace ? ' ' : '') + curr.str;
    }

    const trimmedLine = lineText.replace(/\s+/g, ' ').trim();
    if (!trimmedLine) continue;

    if (i > 0 && outputLines.length > 0) {
      const prevLine = lines[i - 1];
      const verticalGap = prevLine.y - line.y;
      const typicalLineSpacing = Math.max(line.height, prevLine.height, 10) * 1.75;
      if (verticalGap > typicalLineSpacing) {
        outputLines.push('');
      }
    }

    outputLines.push(trimmedLine);
  }

  return outputLines.join('\n');
}

/**
 * Checks whether a line matches common page number or footer patterns.
 */
function isPageNumberOrFooterLine(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  if (!trimmed) return true;

  // Patterns like "Page 1", "Page 1 of 12", "1 / 15", "12", "- 4 -", "[ 5 ]"
  if (/^(?:page\s*)?\d+(?:\s*(?:of|\/|-)\s*\d+)?$/i.test(trimmed)) return true;
  if (/^[-–—]\s*\d+\s*[-–—]$/.test(trimmed)) return true;
  if (/^\[\s*\d+\s*\]$/.test(trimmed)) return true;

  // Common footer/disclaimer patterns
  if (/^(?:copyright|all rights reserved|\(c\)|©)/i.test(trimmed)) return true;
  if (/^www\.[a-z0-9.-]+\.[a-z]{2,}/i.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;

  return false;
}

/**
 * Normalizes extracted text from PDF.js or Tesseract OCR while preserving
 * unit numbers, module headings, and bulleted/numbered topic lists.
 * Also strips repeated headers/footers/page numbers and duplicate consecutive lines.
 */
export function normalizeSyllabusText(rawText: string): string {
  if (!rawText) return '';

  const rawLines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .split('\n');

  // Track line frequencies to detect repeated headers across multiple pages
  const lineFrequencies = new Map<string, number>();
  for (const raw of rawLines) {
    const t = raw.trim();
    if (t.length > 5 && t.length < 90 && !/^(?:unit|module|chapter|part)\b/i.test(t)) {
      lineFrequencies.set(t, (lineFrequencies.get(t) || 0) + 1);
    }
  }

  const cleanedLines: string[] = [];
  let lastNonEmpty = '';

  for (const line of rawLines) {
    const trimmed = line.replace(/[ \t]+/g, ' ').trim();
    if (!trimmed) {
      if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== '') {
        cleanedLines.push('');
      }
      continue;
    }

    // Filter page numbers and footers
    if (isPageNumberOrFooterLine(trimmed)) {
      continue;
    }

    // Filter repetitive header lines that appear 3+ times (e.g. university header repeated on each page)
    const freq = lineFrequencies.get(trimmed) || 0;
    if (freq >= 3 && !/^(?:unit|module|chapter|part)\b/i.test(trimmed)) {
      continue;
    }

    // Filter consecutive duplicate lines
    if (trimmed.toLowerCase() === lastNonEmpty.toLowerCase()) {
      continue;
    }

    // Normalize bullet glyphs
    const normalizedBullet = trimmed.replace(/^[•▪◦●■◆➢➤]\s*/, '- ');
    cleanedLines.push(normalizedBullet);
    lastNonEmpty = trimmed;
  }

  // Remove trailing blank lines and collapse multiple blanks
  const collapsed: string[] = [];
  let blankStreak = 0;
  for (const line of cleanedLines) {
    if (line === '') {
      blankStreak += 1;
      if (blankStreak <= 1 && collapsed.length > 0) {
        collapsed.push('');
      }
    } else {
      blankStreak = 0;
      collapsed.push(line);
    }
  }

  return collapsed.join('\n').trim();
}
