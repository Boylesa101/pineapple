import { TRANSPARENCY_SERVICES } from './transparency';
import { isEmptyRichText } from './richtext';

export type SectionType =
  | 'brand' | 'about' | 'service' | 'team_member' | 'office' | 'price_page' | 'testimonial' | 'faq' | 'custom';
export type MediaKind = 'logo' | 'image' | 'font' | 'document';

export type SectionField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'url';
  required?: boolean;
  hint?: string;
  options?: readonly { id: string; label: string }[];
  max?: number;
};

export type SectionConfig = {
  type: SectionType;
  slug: string;              // URL segment for the list page
  label: string;             // plural / page title
  itemLabel: string;         // "a service", used in buttons
  repeatable: boolean;
  intro: string;
  titleLabel?: string;       // if set, the section has a title field with this label
  titleRequired?: boolean;
  bodyLabel?: string;        // if set, the section has a rich-text body with this label
  bodyRequired?: boolean;
  fields: SectionField[];
  media?: { kinds: MediaKind[]; label: string; hint?: string; minRequired?: number };
};

export const SECTIONS: SectionConfig[] = [
  {
    type: 'brand', slug: 'brand', label: 'Brand assets', itemLabel: 'brand assets', repeatable: false,
    intro: 'Your colours, fonts, logos, images and brand documents.',
    fields: [{ key: 'notes', label: 'Anything else about your brand?', type: 'textarea' }],
    media: { kinds: ['logo', 'image', 'font', 'document'], label: 'Files' },
  },
  {
    type: 'about', slug: 'about', label: 'About us', itemLabel: 'about us', repeatable: false,
    intro: 'Your firm’s story, values and history.',
    bodyLabel: 'Your story', bodyRequired: true,
    fields: [
      { key: 'values', label: 'Your values', type: 'textarea' },
      { key: 'history', label: 'Key dates and history', type: 'textarea' },
    ],
    media: { kinds: ['image'], label: 'Photos', hint: 'Office, team or community photos for this page.' },
  },
  {
    type: 'service', slug: 'services', label: 'Services', itemLabel: 'a service', repeatable: true,
    intro: 'One entry per service or practice area.',
    titleLabel: 'Service name', titleRequired: true,
    bodyLabel: 'Full description', bodyRequired: true,
    fields: [
      { key: 'summary', label: 'One-line summary', type: 'text', required: true, max: 300 },
      { key: 'whoFor', label: 'Who it’s for', type: 'textarea' },
      { key: 'keyPeople', label: 'Key people', type: 'text', hint: 'Who leads this work?' },
    ],
  },
  {
    type: 'team_member', slug: 'team', label: 'Team', itemLabel: 'a team member', repeatable: true,
    intro: 'One entry per person to feature on the site.',
    titleLabel: 'Full name', titleRequired: true,
    bodyLabel: 'Biography', bodyRequired: true,
    fields: [
      { key: 'role', label: 'Job title', type: 'text', required: true },
      { key: 'qualifications', label: 'Qualifications', type: 'text' },
      { key: 'practisingStatus', label: 'Practising status', type: 'select',
        options: [
          { id: 'solicitor', label: 'Solicitor' }, { id: 'cilex', label: 'Chartered legal executive (CILEx)' },
          { id: 'licensed_conveyancer', label: 'Licensed conveyancer' }, { id: 'trainee', label: 'Trainee solicitor' },
          { id: 'paralegal', label: 'Paralegal' }, { id: 'non_lawyer', label: 'Not a lawyer' },
        ] },
      { key: 'languages', label: 'Languages spoken', type: 'text' },
      { key: 'email', label: 'Email to show (optional)', type: 'text' },
    ],
    media: { kinds: ['image'], label: 'Photo', hint: 'A headshot, ideally at least 800px wide.' },
  },
  {
    type: 'office', slug: 'offices', label: 'Offices', itemLabel: 'an office', repeatable: true,
    intro: 'Each office or location clients can visit.',
    titleLabel: 'Office name', titleRequired: true,
    fields: [
      { key: 'address', label: 'Address', type: 'textarea', required: true },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'hours', label: 'Opening hours', type: 'textarea' },
      { key: 'mapLink', label: 'Map link', type: 'url', hint: 'A Google or Apple Maps link.' },
    ],
    media: { kinds: ['image'], label: 'Photos' },
  },
  {
    type: 'price_page', slug: 'price-pages', label: 'Price and service pages', itemLabel: 'a price page', repeatable: true,
    intro: 'One page for each SRA Transparency Rules service you offer.',
    fields: [
      { key: 'service', label: 'Service', type: 'select', required: true, options: TRANSPARENCY_SERVICES },
      { key: 'totalCost', label: 'Total cost, or an average or range', type: 'textarea', required: true },
      { key: 'basisOfCharges', label: 'Basis of your charges (hourly rates, fixed fees)', type: 'textarea', required: true },
      { key: 'disbursements', label: 'Likely disbursements and their costs', type: 'textarea', required: true },
      { key: 'vat', label: 'VAT: is it included, and at what rate?', type: 'text', required: true },
      { key: 'inclusions', label: 'What the price includes', type: 'textarea', required: true },
      { key: 'exclusions', label: 'What it doesn’t include, that people might expect', type: 'textarea' },
      { key: 'keyStages', label: 'Key stages of the matter', type: 'textarea', required: true },
      { key: 'timescales', label: 'Typical timescales', type: 'textarea', required: true },
      { key: 'staffExperience', label: 'Experience and qualifications of the people doing the work', type: 'textarea', required: true },
      { key: 'supervision', label: 'Who supervises the work', type: 'textarea' },
    ],
  },
  {
    type: 'testimonial', slug: 'testimonials', label: 'Testimonials', itemLabel: 'a testimonial', repeatable: true,
    intro: 'Client quotes you have permission to publish.',
    fields: [
      { key: 'quote', label: 'Quote', type: 'textarea', required: true },
      { key: 'source', label: 'Who said it (as it should appear)', type: 'text', required: true,
        hint: 'For example “J. Smith, Leeds” or “Business client”.' },
      { key: 'permissionConfirmed', label: 'We have the client’s permission to publish this', type: 'checkbox', required: true },
    ],
  },
  {
    type: 'faq', slug: 'faqs', label: 'FAQs', itemLabel: 'a question', repeatable: true,
    intro: 'Questions clients often ask.',
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
    ],
  },
  {
    type: 'custom', slug: 'custom', label: 'Custom sections', itemLabel: 'a custom section', repeatable: true,
    intro: 'Anything else you want on the site. Tell us which page it belongs on.',
    titleLabel: 'Title', titleRequired: true,
    bodyLabel: 'Content', bodyRequired: true,
    fields: [
      { key: 'targetPage', label: 'Which page should it go on?', type: 'text', required: true },
      { key: 'placementNote', label: 'Where on the page, and anything else we should know', type: 'textarea' },
    ],
    media: { kinds: ['image', 'document'], label: 'Files' },
  },
];

export const sectionConfig = (type: string) => SECTIONS.find((s) => s.type === type);
export const sectionBySlug = (slug: string) => SECTIONS.find((s) => s.slug === slug);

export type SectionRow = {
  id: string;
  type: SectionType;
  title: string | null;
  body: unknown;
  fields: Record<string, unknown>;
  status: 'draft' | 'submitted' | 'approved';
};

const filled = (v: unknown) => (typeof v === 'string' ? v.trim().length > 0 : v === true);

// Which required parts of a section are still missing (empty list = ready to submit).
export function missingParts(row: SectionRow, extra?: { colours?: number; fonts?: number; logos?: number; photos?: number }) {
  const cfg = sectionConfig(row.type);
  if (!cfg) return ['unknown section'];
  const missing: string[] = [];
  if (cfg.titleRequired && !filled(row.title)) missing.push(cfg.titleLabel ?? 'Title');
  if (cfg.bodyRequired && isEmptyRichText(row.body)) missing.push(cfg.bodyLabel ?? 'Content');
  for (const f of cfg.fields) if (f.required && !filled(row.fields?.[f.key])) missing.push(f.label);
  if (row.type === 'brand') {
    if (!extra?.colours) missing.push('At least one colour');
    if (!extra?.fonts) missing.push('At least one font');
    if (!extra?.logos) missing.push('At least one logo');
  }
  return missing;
}

// Keep only known fields, as strings (or booleans for checkboxes), trimmed to size.
export function cleanFields(type: SectionType, input: unknown): Record<string, unknown> {
  const cfg = sectionConfig(type);
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const f of cfg?.fields ?? []) {
    const v = src[f.key];
    if (f.type === 'checkbox') {
      if (v === true) out[f.key] = true;
    } else if (f.type === 'select') {
      if (typeof v === 'string' && f.options?.some((o) => o.id === v)) out[f.key] = v;
    } else if (typeof v === 'string' && v.length) {
      out[f.key] = v.slice(0, f.max ?? (f.type === 'textarea' ? 5000 : 500));
    }
  }
  if (type === 'brand') {
    out.colours = cleanColours(src.colours);
    out.fonts = cleanFonts(src.fonts);
  }
  return out;
}

export const COLOUR_USES = [
  { id: 'primary', label: 'Primary' }, { id: 'secondary', label: 'Secondary' }, { id: 'accent', label: 'Accent' },
  { id: 'text', label: 'Text' }, { id: 'background', label: 'Background' }, { id: 'other', label: 'Other' },
] as const;
export const FONT_ROLES = [
  { id: 'headings', label: 'Headings' }, { id: 'body', label: 'Body text' }, { id: 'other', label: 'Other' },
] as const;

export type Colour = { name: string; use: string; hex: string };
export type Font = { name: string; role: string; source: string };

function cleanColours(v: unknown): Colour[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 30)
    .map((c) => c as Partial<Colour>)
    .filter((c) => typeof c.hex === 'string' && /^#[0-9a-f]{6}$/.test(c.hex))
    .map((c) => ({
      name: String(c.name ?? '').slice(0, 80),
      use: COLOUR_USES.some((u) => u.id === c.use) ? String(c.use) : 'other',
      hex: c.hex as string,
    }));
}

function cleanFonts(v: unknown): Font[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 20)
    .map((f) => f as Partial<Font>)
    .filter((f) => typeof f.name === 'string' && f.name.trim())
    .map((f) => ({
      name: String(f.name).trim().slice(0, 120),
      role: FONT_ROLES.some((r) => r.id === f.role) ? String(f.role) : 'other',
      source: String(f.source ?? '').slice(0, 300),
    }));
}
