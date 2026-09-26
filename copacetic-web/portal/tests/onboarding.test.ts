import { describe, expect, it } from 'vitest';
import { toHex, toRgb } from '@/lib/colour';
import { briefingProgress, cleanBriefing } from '@/lib/content/briefing';
import { isEmptyRichText, plainText, richTextSchema } from '@/lib/content/richtext';
import { cleanFields, missingParts, type SectionRow } from '@/lib/content/sections';
import { checkSignature, checkSvg, extOf, safeFileName } from '@/lib/uploads';

describe('brand colours', () => {
  it('accepts hex in any common form and stores 6-digit lower-case hex', () => {
    expect(toHex('#1C1917')).toBe('#1c1917');
    expect(toHex('1c1917')).toBe('#1c1917');
    expect(toHex('#fff')).toBe('#ffffff');
  });
  it('accepts RGB with or without rgb()', () => {
    expect(toHex('rgb(28, 25, 23)')).toBe('#1c1917');
    expect(toHex('28, 25, 23')).toBe('#1c1917');
    expect(toHex('rgba(22,101,52,0.5)')).toBe('#166534');
    expect(toHex('28 25 23')).toBe('#1c1917');
  });
  it('rejects anything else', () => {
    expect(toHex('rgb(300, 0, 0)')).toBeNull();
    expect(toHex('#12345')).toBeNull();
    expect(toHex('red')).toBeNull();
    expect(toHex('')).toBeNull();
  });
  it('shows hex as RGB', () => expect(toRgb('#166534')).toBe('rgb(22, 101, 52)'));
});

describe('uploads', () => {
  const bytes = (...xs: (number | string)[]) =>
    new Uint8Array(xs.flatMap((x) => (typeof x === 'string' ? [...x].map((c) => c.charCodeAt(0)) : [x])));

  it('checks real file signatures, not just extensions', () => {
    expect(checkSignature('png', bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))).toBeNull();
    expect(checkSignature('png', bytes(0xff, 0xd8, 0xff, 0xe0))).toMatch(/not a PNG/);
    expect(checkSignature('jpg', bytes(0xff, 0xd8, 0xff, 0xe0))).toBeNull();
    expect(checkSignature('pdf', bytes('%PDF-1.7'))).toBeNull();
    expect(checkSignature('pdf', bytes('<html>'))).toMatch(/not a PDF/);
    expect(checkSignature('woff2', bytes('wOF2', 0, 1))).toBeNull();
    expect(checkSignature('webp', bytes('RIFF', 0, 0, 0, 0, 'WEBP'))).toBeNull();
    expect(checkSignature('docx', bytes(0x50, 0x4b, 3, 4, '....[Content_Types].xml'))).toBeNull();
    expect(checkSignature('docx', bytes(0x50, 0x4b, 3, 4, 'just a zip'))).toMatch(/Office/);
  });

  it('accepts plain SVGs and rejects active content', () => {
    expect(checkSvg('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>')).toBeNull();
    expect(checkSvg('<svg><script>alert(1)</script></svg>')).toMatch(/script/);
    expect(checkSvg('<svg onload="alert(1)"></svg>')).toMatch(/event handlers/);
    expect(checkSvg('<svg><a href="javascript:alert(1)">x</a></svg>')).toMatch(/unsafe link/);
    expect(checkSvg('<svg><foreignObject><div/></foreignObject></svg>')).toMatch(/HTML/);
    expect(checkSvg('<!DOCTYPE x [<!ENTITY a "b">]><svg></svg>')).toMatch(/entities/);
    expect(checkSvg('<html><body>hi</body></html>')).toMatch(/not an SVG/);
  });

  it('rejects SVG tricks that get past simple checks', () => {
    expect(checkSvg('<svg><a><animate attributeName="href" values="jav&#x61;script:alert(1)"/></a></svg>')).not.toBeNull();
    expect(checkSvg('<svg><a><set attributeName="xlink:href" to="https://x.test"/></a></svg>')).toMatch(/animates a link|outside/);
    expect(checkSvg('<svg><a href="&#106;avascript:alert(1)">x</a></svg>')).toMatch(/encoded/);
    expect(checkSvg('<svg><use href="data:image/svg+xml;base64,PHN2Zz4="/></svg>')).toMatch(/embedded/);
    expect(checkSvg('<svg><image href="https://tracker.test/x.png"/></svg>')).toMatch(/outside/);
    expect(checkSvg('<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#a"/><image href="data:image/png;base64,iVBOR"/></svg>')).toBeNull();
  });

  it('makes storage-safe names and reads extensions', () => {
    expect(safeFileName('Our Logo (final) v2.SVG')).toBe('Our-Logo-final-v2.svg');
    expect(safeFileName('../../etc/passwd.png')).toBe('etc-passwd.png');
    expect(extOf('photo.JPEG')).toBe('jpeg');
    expect(extOf('script.exe')).toBeNull();
  });
});

describe('rich text', () => {
  const doc = (content: unknown[]) => ({ type: 'doc', content });

  it('keeps allowed formatting', () => {
    const ok = richTextSchema.safeParse(
      doc([
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hi' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { href: 'https://x.co', target: '_blank', rel: 'x' } }] }] },
      ]),
    );
    expect(ok.success).toBe(true);
    // Extra link attributes are stripped down to href.
    expect(JSON.stringify(ok.data)).not.toContain('_blank');
  });
  it('rejects javascript: links, unknown nodes and h1', () => {
    expect(richTextSchema.safeParse(doc([{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }])).success).toBe(false);
    expect(richTextSchema.safeParse(doc([{ type: 'iframe', attrs: { src: 'https://evil' } }])).success).toBe(false);
    expect(richTextSchema.safeParse(doc([{ type: 'heading', attrs: { level: 1 }, content: [] }])).success).toBe(false);
  });
  it('extracts plain text and spots empty documents', () => {
    expect(plainText(doc([{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }]))).toBe('Hello');
    expect(isEmptyRichText(doc([{ type: 'paragraph' }]))).toBe(true);
    expect(isEmptyRichText(null)).toBe(true);
  });
});

describe('briefing', () => {
  it('keeps only known fields and valid options', () => {
    const cleaned = cleanBriefing({
      firm: { legalName: 'Smith LLP', hacker: 'x', structure: 'llp', complaintsProcedure: true },
      business: { practiceAreas: ['family', 'nope', 'family'], clients: 'dogs' },
      unknownPart: { a: 1 },
      timing: { launchDate: 'next week' },
    });
    expect(cleaned).toEqual({
      firm: { legalName: 'Smith LLP', structure: 'llp', complaintsProcedure: true },
      business: { practiceAreas: ['family'] },
    });
  });
  it('reports what’s missing', () => {
    const p = briefingProgress({});
    expect(p.complete).toBe(false);
    expect(p.missing).toContain('Firm and regulatory');
  });
});

describe('content sections', () => {
  const row = (over: Partial<SectionRow>): SectionRow => ({ id: 'x', type: 'faq', title: null, body: null, fields: {}, status: 'draft', ...over });

  it('knows when a section is ready to submit', () => {
    expect(missingParts(row({ fields: { question: 'Q?' } }))).toEqual(['Answer']);
    expect(missingParts(row({ fields: { question: 'Q?', answer: 'A.' } }))).toEqual([]);
  });
  it('requires permission for testimonials', () => {
    expect(missingParts(row({ type: 'testimonial', fields: { quote: 'Great', source: 'J' } }))).toContain(
      'We have the client’s permission to publish this',
    );
  });
  it('requires a colour, a font and a logo for brand', () => {
    const r = row({ type: 'brand', title: 'Brand' });
    expect(missingParts(r, { colours: 0, fonts: 0, logos: 0 })).toEqual(['At least one colour', 'At least one font', 'At least one logo']);
    expect(missingParts(r, { colours: 1, fonts: 1, logos: 1 })).toEqual([]);
  });
  it('cleans brand colours and fonts', () => {
    const f = cleanFields('brand', {
      colours: [{ name: 'Ink', use: 'text', hex: '#1c1917' }, { hex: 'red' }, { hex: '#FFFFFF', use: 'weird' }],
      fonts: [{ name: ' DM Sans ', role: 'body' }, { name: '' }],
      evil: '<script>',
    });
    expect(f.colours).toEqual([{ name: 'Ink', use: 'text', hex: '#1c1917' }]);
    expect(f.fonts).toEqual([{ name: 'DM Sans', role: 'body', source: '' }]);
    expect(f).not.toHaveProperty('evil');
  });
});
