import { PublicationCategory } from '../types';

export interface ParsedInventoryRow {
  code: string;
  title: string;
  quantity: number;
  sectionName: string;
  category: PublicationCategory;
}

export interface ParsedInventoryReport {
  reportPeriod: string;
  reportLanguage: string;
  items: ParsedInventoryRow[];
}

interface TextFragment {
  str: string;
  x: number;
  y: number;
}

function mapSectionToCategory(sectionRaw: string): {
  sectionName: string;
  category: PublicationCategory;
} | null {
  const clean = sectionRaw.trim().toLowerCase();

  if (clean === 'biblias' || clean === 'bibles') {
    return { sectionName: 'Biblias', category: 'Biblias' };
  }
  if (clean === 'libros' || clean === 'books') {
    return { sectionName: 'Libros', category: 'Libros' };
  }
  if (
    clean === 'folletos' ||
    clean === 'folletos y tratados' ||
    clean === 'tratados' ||
    clean === 'brochures' ||
    clean === 'brochures and booklets' ||
    clean === 'tracts'
  ) {
    return { sectionName: 'Folletos', category: 'Folletos y Tratados' };
  }
  if (
    clean === 'formularios y suministros' ||
    clean === 'formularios' ||
    clean === 'forms and supplies' ||
    clean === 'forms'
  ) {
    return {
      sectionName: 'Formularios y suministros',
      category: 'Formularios y Suministros',
    };
  }
  if (
    clean === 'revistas para el público' ||
    clean === 'revistas para el publico' ||
    clean === 'revistas' ||
    clean === 'public magazines' ||
    clean === 'magazines'
  ) {
    return { sectionName: 'Revistas para el público', category: 'Revistas' };
  }

  return null;
}

function parseLinesFromText(lines: string[]): ParsedInventoryReport {
  let reportPeriod = '';
  let reportLanguage = 'Español';
  let currentSection = 'Libros';
  let currentCategory: PublicationCategory = 'Libros';

  const itemsMap = new Map<string, ParsedInventoryRow>();

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) continue;

    // Detect header period & language e.g. "Septiembre de 2026 | Español" or "September 2026 | English"
    if (line.includes('|') && /\b20\d{2}\b/.test(line)) {
      const parts = line.split('|').map((s) => s.trim());
      if (parts.length >= 2) {
        reportPeriod = parts[0];
        const langCandidate = parts[1];
        if (langCandidate.toLowerCase() === 'english') {
          reportLanguage = 'Inglés';
        } else if (langCandidate) {
          reportLanguage = langCandidate;
        }
      }
      continue;
    }

    // Detect section headers
    const sectionMatch = mapSectionToCategory(line);
    if (sectionMatch) {
      currentSection = sectionMatch.sectionName;
      currentCategory = sectionMatch.category;
      continue;
    }

    // Ignore "Otros 28" / "Others 1482" summary rows
    if (/^(otros|other|others)\s+[\d,.]+$/i.test(line)) {
      continue;
    }

    // Match publication row: (code) Title Quantity
    const rowMatch = line.match(/^\(([A-Za-z0-9.\-_]+)\)\s+(.+?)\s+([\d,.]+)$/);
    if (rowMatch) {
      const code = rowMatch[1].trim();
      const rawTitle = rowMatch[2].trim();
      const qtyClean = rowMatch[3].replace(/[,.]/g, '');
      const quantity = parseInt(qtyClean, 10);

      if (!code || !rawTitle || Number.isNaN(quantity)) continue;

      const key = code.toLowerCase();
      itemsMap.set(key, {
        code,
        title: rawTitle,
        quantity,
        sectionName: currentSection,
        category: currentCategory,
      });
    }
  }

  return {
    reportPeriod,
    reportLanguage,
    items: Array.from(itemsMap.values()),
  };
}

export async function parseJwHubInventoryPdf(
  source: ArrayBuffer | Uint8Array
): Promise<ParsedInventoryReport> {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfWorkerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerModule.default;

  const data = source instanceof Uint8Array ? source : new Uint8Array(source);
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const fragments: TextFragment[] = [];
    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string') {
        const text = item.str.trim();
        if (!text) continue;
        const transform = (item as { transform?: number[] }).transform;
        const x = Array.isArray(transform) ? transform[4] ?? 0 : 0;
        const y = Array.isArray(transform) ? transform[5] ?? 0 : 0;
        fragments.push({ str: item.str, x, y });
      }
    }

    fragments.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 4) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    const rows: Array<{ y: number; items: TextFragment[] }> = [];
    for (const frag of fragments) {
      const lastRow = rows[rows.length - 1];
      if (lastRow && Math.abs(lastRow.y - frag.y) <= 4) {
        lastRow.items.push(frag);
      } else {
        rows.push({ y: frag.y, items: [frag] });
      }
    }

    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      const lineStr = row.items
        .map((it) => it.str.trim())
        .filter(Boolean)
        .join(' ');
      if (lineStr) {
        allLines.push(lineStr);
      }
    }
  }

  return parseLinesFromText(allLines);
}
