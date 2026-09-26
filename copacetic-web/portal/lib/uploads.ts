import type { MediaKind } from '@/lib/content/sections';

// What clients may upload, by extension. The extension picks the declared type; the server then
// checks the file's real signature matches before it's marked clean.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const FILE_TYPES = {
  jpg: { mime: 'image/jpeg', family: 'image' },
  jpeg: { mime: 'image/jpeg', family: 'image' },
  png: { mime: 'image/png', family: 'image' },
  webp: { mime: 'image/webp', family: 'image' },
  svg: { mime: 'image/svg+xml', family: 'svg' },
  pdf: { mime: 'application/pdf', family: 'pdf' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', family: 'office' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', family: 'office' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', family: 'office' },
  woff2: { mime: 'font/woff2', family: 'font' },
  woff: { mime: 'font/woff', family: 'font' },
  otf: { mime: 'font/otf', family: 'font' },
  ttf: { mime: 'font/ttf', family: 'font' },
} as const;
export type Ext = keyof typeof FILE_TYPES;

// Which extensions each kind of upload accepts.
export const KIND_EXTS: Record<MediaKind, Ext[]> = {
  logo: ['svg', 'png', 'webp', 'jpg', 'jpeg', 'pdf'],
  image: ['jpg', 'jpeg', 'png', 'webp'],
  font: ['woff2', 'woff', 'otf', 'ttf'],
  document: ['pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg', 'jpeg'],
};

export const KIND_LABELS: Record<MediaKind, string> = {
  logo: 'Logos', image: 'Images', font: 'Font files', document: 'Documents',
};

export const extOf = (name: string): Ext | null => {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m && m[1] in FILE_TYPES ? (m[1] as Ext) : null;
};

export const acceptFor = (kind: MediaKind) => KIND_EXTS[kind].map((e) => `.${e}`).join(',');

// A storage-safe version of the original name (the original is kept in the database for display).
export const safeFileName = (name: string) => {
  const ext = extOf(name) ?? 'bin';
  const base = name
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  return `${base || 'file'}.${ext}`;
};

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

// Does the file's content match its extension? Returns a reason when it doesn't.
export function checkSignature(ext: Ext, bytes: Uint8Array): string | null {
  const family = FILE_TYPES[ext].family;
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]) ? null : 'not a JPEG image';
    case 'png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ? null : 'not a PNG image';
    case 'webp':
      return startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8) ? null : 'not a WebP image';
    case 'pdf':
      return startsWith(bytes, ascii('%PDF-')) ? null : 'not a PDF';
    case 'woff2':
      return startsWith(bytes, ascii('wOF2')) ? null : 'not a WOFF2 font';
    case 'woff':
      return startsWith(bytes, ascii('wOFF')) ? null : 'not a WOFF font';
    case 'otf':
      return startsWith(bytes, ascii('OTTO')) || startsWith(bytes, [0, 1, 0, 0]) ? null : 'not an OpenType font';
    case 'ttf':
      return startsWith(bytes, [0, 1, 0, 0]) || startsWith(bytes, ascii('true')) ? null : 'not a TrueType font';
    case 'svg':
      return checkSvg(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
  }
  if (family === 'office') {
    // DOCX / XLSX / PPTX are ZIP packages containing [Content_Types].xml.
    if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'not an Office document';
    const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 64 * 1024)));
    return head.includes('[Content_Types].xml') ? null : 'not an Office document';
  }
  return 'unsupported file type';
}

// SVGs can carry scripts. Anything active is rejected rather than rewritten, so what the client
// uploaded is exactly what the agency receives. (SVGs are also always served as downloads.)
export function checkSvg(text: string): string | null {
  const t = text.replace(/^﻿/, '');
  if (!/<svg[\s>]/i.test(t)) return 'not an SVG image';
  if (/<script[\s>]/i.test(t)) return 'SVG contains a script';
  if (/<foreignObject[\s>]/i.test(t)) return 'SVG contains embedded HTML';
  if (/\son[a-z]+\s*=/i.test(t)) return 'SVG contains event handlers';
  if (/(?:href|src)\s*=\s*["']?\s*(?:javascript|data:text\/html)/i.test(t)) return 'SVG contains an unsafe link';
  if (/<!ENTITY/i.test(t)) return 'SVG contains XML entities';
  return null;
}
