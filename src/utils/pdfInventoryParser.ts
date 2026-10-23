import { PublicationCategory } from '../types';

export interface ParsedInventoryRow {
  code: string;
  title: string;
  quantity: number | null; // null when imported from a Catalog PDF without quantities
  sectionName: string;
  category: PublicationCategory;
  isSpecialRequest?: boolean;
}

export interface ParsedInventoryReport {
  mode: 'inventory' | 'catalog';
  reportPeriod: string;
  reportLanguage: string;
  items: ParsedInventoryRow[];
}

interface TextFragment {
  str: string;
  x: number;
  y: number;
}

const KNOWN_TITLES_BY_CODE: Record<string, string> = {
  be: 'Benefíciese de la Escuela del Ministerio Teocrático',
  bhs: '¿Qué nos enseña la Biblia?',
  bt: 'Demos “un testimonio completo sobre el Reino de Dios”',
  btlp: 'Demos “un testimonio completo sobre el Reino de Dios” (letra grande)',
  cf: '“Ven y sé mi seguidor”',
  cl: 'Acerquémonos a Jehová',
  ia: 'Ejemplos de fe',
  'it-1': 'Perspicacia para comprender las Escrituras - Volumen 1',
  'it-2': 'Perspicacia para comprender las Escrituras - Volumen 2',
  jd: 'Vivamos muy pendientes del día de Jehová',
  jv: 'Los testigos de Jehová, proclamadores del Reino de Dios',
  jy: 'Jesús: el camino, la verdad y la vida',
  jylp: 'Jesús: el camino, la verdad y la vida (letra grande)',
  jrlp: 'Dios nos habla mediante Jeremías (letra grande)',
  kr: 'El Reino de Dios ya está gobernando',
  lfb: 'Lecciones que aprendo de la Biblia',
  lff: '¡Disfrute de la vida para siempre! Curso interactivo de la Biblia',
  lffi: '¡Disfrute de la vida para siempre! (folleto)',
  lr: 'Aprendamos del Gran Maestro',
  lvs: 'Continúe en el amor de Dios',
  od: 'Organizados para hacer la voluntad de Jehová',
  rr: 'La adoración pura de Jehová: ¡por fin restaurada!',
  rrlp: 'La adoración pura de Jehová: ¡por fin restaurada! (letra grande)',
  scl: 'Textos bíblicos para la vida cristiana',
  sfg: 'Pastoreen el rebaño de Dios',
  sfglp: 'Pastoreen el rebaño de Dios (letra grande)',
  sjj: 'Cantemos con gozo a Jehová',
  sjjls: 'Cantemos con gozo a Jehová (edición grande)',
  sjjyls: 'Cantemos con gozo a Jehová (sin partitura)',
  wcg: 'Seamos valientes al andar con Dios',
  wcglp: 'Seamos valientes al andar con Dios (letra grande)',
  yp1: 'Lo que los jóvenes preguntan. Respuestas prácticas (volumen 1)',
  yp2: 'Lo que los jóvenes preguntan. Respuestas prácticas (volumen 2)',
};

function mapSectionToCategory(sectionRaw: string): {
  sectionName: string;
  category: PublicationCategory;
} | null {
  const clean = sectionRaw.trim().toLowerCase();

  if (
    clean === 'biblias' ||
    clean === 'bibles' ||
    clean.startsWith('biblias |') ||
    clean.startsWith('bibles |')
  ) {
    if (clean.includes('letra grande') || clean.includes('large print')) {
      return { sectionName: 'Biblias · Letra grande', category: 'Letra Grande' };
    }
    return { sectionName: 'Biblias', category: 'Biblias' };
  }

  if (
    clean === 'libros' ||
    clean === 'books' ||
    clean.startsWith('libros |') ||
    clean.startsWith('books |')
  ) {
    if (clean.includes('letra grande') || clean.includes('large print')) {
      return { sectionName: 'Libros · Letra grande', category: 'Letra Grande' };
    }
    return { sectionName: 'Libros', category: 'Libros' };
  }

  if (
    clean === 'folletos' ||
    clean === 'folletos y tratados' ||
    clean === 'tratados' ||
    clean === 'brochures' ||
    clean === 'brochures and booklets' ||
    clean === 'tracts' ||
    clean.startsWith('folletos |') ||
    clean.startsWith('tratados |')
  ) {
    return { sectionName: 'Folletos y Tratados', category: 'Folletos y Tratados' };
  }

  if (
    clean === 'formularios y suministros' ||
    clean === 'formularios' ||
    clean === 'forms and supplies' ||
    clean === 'forms' ||
    clean.startsWith('formularios |')
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
    clean === 'magazines' ||
    clean.startsWith('revistas |')
  ) {
    return { sectionName: 'Revistas para el público', category: 'Revistas' };
  }

  return null;
}

function normalizeCatalogCode(rawCode: string): string {
  // Strip JW Hub language suffix like "-S" (Spanish), "-E" (English), "-T" (Portuguese)
  // while keeping volume numbers like "it-1" -> "it-1-S" => "it-1"
  return rawCode.trim().replace(/-[A-Za-z]{1,3}$/, '');
}

const IGNORED_CATALOG_LINES = new Set([
  'jw',
  'hub',
  'jw hub',
  'publicaciones de la congregación',
  'publicaciones de la congregacion',
  'congregation literature',
  'informe de inventario',
  'inventory report',
  'solicitado el',
  'requested on',
  'regular',
  'letra grande',
  'large print',
  'solicitud especial',
  'special request',
]);

function isIgnoredCatalogLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (IGNORED_CATALOG_LINES.has(lower)) return true;
  // Ignore congregation header line e.g. "CAMPO VERDE ESPAÑOL - ENCARNACIÓN ITA (760)"
  if (/\(\d{2,6}\)$/.test(line) && line === line.toUpperCase()) return true;
  return false;
}

function parseLinesFromText(lines: string[]): ParsedInventoryReport {
  let reportPeriod = '';
  let reportLanguage = 'Español';
  let currentSection = 'Libros';
  let currentCategory: PublicationCategory = 'Libros';

  const inventoryItemsMap = new Map<string, ParsedInventoryRow>();
  const catalogItemsMap = new Map<string, ParsedInventoryRow>();

  let pendingCatalogEntry: {
    code: string;
    language: string;
    sectionName: string;
    category: PublicationCategory;
    isSpecialRequest: boolean;
    titleParts: string[];
  } | null = null;

  const flushPendingCatalogEntry = () => {
    if (!pendingCatalogEntry) return;
    const codeKey = pendingCatalogEntry.code.toLowerCase();
    const joinedTitle = pendingCatalogEntry.titleParts.join(' ').trim();
    const finalTitle =
      joinedTitle || KNOWN_TITLES_BY_CODE[codeKey] || pendingCatalogEntry.code;

    catalogItemsMap.set(codeKey, {
      code: pendingCatalogEntry.code,
      title: finalTitle,
      quantity: null,
      sectionName: pendingCatalogEntry.sectionName,
      category: pendingCatalogEntry.category,
      isSpecialRequest: pendingCatalogEntry.isSpecialRequest,
    });
    pendingCatalogEntry = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) continue;

    // 1. Check section headers first (e.g. "Libros | Regular", "Libros | Letra grande", "Biblias", "Folletos")
    const sectionMatch = mapSectionToCategory(line);
    if (sectionMatch) {
      flushPendingCatalogEntry();
      currentSection = sectionMatch.sectionName;
      currentCategory = sectionMatch.category;
      continue;
    }

    // 2. Check JW Hub Catalog Item Header: e.g. "be-S | Español", "it-1-S | Español", "nwt-S | Español"
    const catalogHeaderMatch = line.match(
      /^([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\s*\|\s*([A-Za-zÁÉÍÓÚáéíóúñÑüÜ\s]+)$/
    );
    if (
      catalogHeaderMatch &&
      !/\b20\d{2}\b/.test(line) &&
      !mapSectionToCategory(line)
    ) {
      flushPendingCatalogEntry();
      const rawCode = catalogHeaderMatch[1].trim();
      const normalizedCode = normalizeCatalogCode(rawCode);
      const lang = catalogHeaderMatch[2].trim() || 'Español';
      reportLanguage = lang;

      pendingCatalogEntry = {
        code: normalizedCode,
        language: lang,
        sectionName: currentSection,
        category:
          normalizedCode.endsWith('lp') && currentCategory === 'Libros'
            ? 'Letra Grande'
            : currentCategory,
        isSpecialRequest: false,
        titleParts: [],
      };
      continue;
    }

    // 3. Detect Inventory Report header period & language e.g. "Septiembre de 2026 | Español"
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

    // 4. Ignore "Otros 28" / "Others 1482" summary rows
    if (/^(otros|other|others)\s+[\d,.]+$/i.test(line)) {
      continue;
    }

    // 5. Match Inventory Report row: (code) Title Quantity
    const rowMatch = line.match(/^\(([A-Za-z0-9.\-_]+)\)\s+(.+?)\s+([\d,.]+)$/);
    if (rowMatch) {
      const code = rowMatch[1].trim();
      const rawTitle = rowMatch[2].trim();
      const qtyClean = rowMatch[3].replace(/[,.]/g, '');
      const quantity = parseInt(qtyClean, 10);

      if (!code || !rawTitle || Number.isNaN(quantity)) continue;

      const key = code.toLowerCase();
      inventoryItemsMap.set(key, {
        code,
        title: rawTitle,
        quantity,
        sectionName: currentSection,
        category: currentCategory,
      });
      continue;
    }

    // 6. If we are inside a Catalog Entry ("be-S | Español"), capture "Solicitud especial" or the Title line
    if (pendingCatalogEntry) {
      const lower = line.toLowerCase();
      if (lower === 'solicitud especial' || lower === 'special request') {
        pendingCatalogEntry.isSpecialRequest = true;
        continue;
      }
      if (isIgnoredCatalogLine(line)) {
        continue;
      }
      pendingCatalogEntry.titleParts.push(line);
    }
  }

  flushPendingCatalogEntry();

  if (inventoryItemsMap.size >= catalogItemsMap.size && inventoryItemsMap.size > 0) {
    return {
      mode: 'inventory',
      reportPeriod,
      reportLanguage,
      items: Array.from(inventoryItemsMap.values()),
    };
  }

  return {
    mode: 'catalog',
    reportPeriod: reportPeriod || 'Catálogo de publicaciones',
    reportLanguage,
    items: Array.from(catalogItemsMap.values()),
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
