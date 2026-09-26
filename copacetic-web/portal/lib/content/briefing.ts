import { TRANSPARENCY_SERVICES } from './transparency';

// The client briefing: eight parts, written from the portal spec (section 6). Each answer is stored
// in briefings.data as { [part]: { [field]: value } }. Brand colours, fonts and files are collected
// separately in the Brand assets section.

export type FieldType = 'text' | 'textarea' | 'email' | 'url' | 'date' | 'select' | 'multi' | 'yesno';
export type BriefingField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  options?: readonly { id: string; label: string }[];
  max?: number;
};
export type BriefingPart = { id: string; title: string; intro?: string; fields: BriefingField[] };

const opts = (...labels: string[]) =>
  labels.map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), label }));

export const BRIEFING: BriefingPart[] = [
  {
    id: 'firm',
    title: 'Firm and regulatory',
    intro: 'The details your site must show to meet SRA and Companies Act requirements.',
    fields: [
      { key: 'legalName', label: 'Registered (legal) name of the firm', type: 'text', required: true },
      { key: 'tradingName', label: 'Trading name, if different', type: 'text' },
      { key: 'structure', label: 'Business structure', type: 'select', required: true,
        options: opts('Sole practice', 'Partnership', 'LLP', 'Limited company', 'Alternative business structure (ABS)') },
      { key: 'sraNumber', label: 'SRA number', type: 'text', required: true, hint: 'Shown on the site next to the SRA digital badge.' },
      { key: 'companyNumber', label: 'Company or LLP registration number', type: 'text', hint: 'Required on the site if you are an LLP or limited company.' },
      { key: 'registeredOffice', label: 'Registered office address', type: 'textarea', required: true },
      { key: 'vatNumber', label: 'VAT number', type: 'text' },
      { key: 'colp', label: 'COLP (compliance officer for legal practice)', type: 'text' },
      { key: 'cofa', label: 'COFA (compliance officer for finance and administration)', type: 'text' },
      { key: 'complaintsProcedure', label: 'Do you have a written complaints procedure we can publish?', type: 'yesno', required: true },
      { key: 'complaintsContact', label: 'Who handles complaints (name and email)?', type: 'text' },
    ],
  },
  {
    id: 'business',
    title: 'Your business',
    fields: [
      { key: 'practiceAreas', label: 'Practice areas', type: 'multi', required: true,
        options: opts('Residential property', 'Commercial property', 'Wills and probate', 'Family', 'Employment',
          'Litigation and disputes', 'Personal injury', 'Crime', 'Immigration', 'Corporate and commercial', 'Private client', 'Other') },
      { key: 'otherPracticeAreas', label: 'Other practice areas', type: 'text' },
      { key: 'clients', label: 'Who are your clients?', type: 'select', required: true,
        options: opts('Individuals', 'Businesses', 'Both') },
      { key: 'areasServed', label: 'Where are your clients? (towns, regions or nationwide)', type: 'text', required: true },
      { key: 'teamSize', label: 'How many people work at the firm?', type: 'text' },
      { key: 'difference', label: 'What makes the firm different?', type: 'textarea', required: true,
        hint: 'In your own words. We’ll turn this into the site’s main message.' },
      { key: 'competitors', label: 'Firms you compete with (names or websites)', type: 'textarea' },
      { key: 'goals', label: 'What should the website achieve?', type: 'multi', required: true,
        options: opts('More enquiries', 'Show expertise', 'Recruit staff', 'Meet regulatory requirements', 'Replace an outdated site', 'Launch a new firm') },
    ],
  },
  {
    id: 'pricing',
    title: 'Price and service information',
    intro: 'The SRA Transparency Rules require price and service pages for some services. We’ll create one page for each service you tick.',
    fields: [
      { key: 'services', label: 'Which of these services do you offer?', type: 'multi', options: TRANSPARENCY_SERVICES,
        hint: 'Leave all unticked if none apply.' },
      { key: 'priceInfoReady', label: 'Do you already have your price and service information written?', type: 'select',
        options: opts('Yes, all of it', 'Some of it', 'No, we need help') },
      { key: 'pricingNotes', label: 'Anything else about how you charge?', type: 'textarea' },
    ],
  },
  {
    id: 'branding',
    title: 'Branding',
    intro: 'Your colours, fonts, logos and images go in the Brand assets section. This part is about look and feel.',
    fields: [
      { key: 'existingBrand', label: 'Do you have an existing brand?', type: 'select', required: true,
        options: opts('Yes, keep it as it is', 'Yes, but it needs refreshing', 'No, we need a new brand') },
      { key: 'brandWords', label: 'Three words that should describe the firm', type: 'text', required: true },
      { key: 'likedSites', label: 'Websites you like, and why', type: 'textarea' },
      { key: 'dislikedSites', label: 'Websites you don’t like, and why', type: 'textarea' },
      { key: 'tone', label: 'Tone of voice', type: 'select',
        options: opts('Formal and traditional', 'Professional but approachable', 'Warm and plain-spoken', 'Modern and bold') },
    ],
  },
  {
    id: 'content',
    title: 'Content and features',
    fields: [
      { key: 'pages', label: 'Pages you need', type: 'multi', required: true,
        options: opts('Home', 'About us', 'Services', 'Team', 'Fees', 'Contact', 'Careers', 'News or blog', 'FAQs', 'Testimonials') },
      { key: 'features', label: 'Features you’d like', type: 'multi',
        options: opts('Enquiry form', 'Online booking', 'AI chatbot', 'Client document upload', 'Online payments', 'Newsletter sign-up', 'Reviews widget', 'Multiple languages') },
      { key: 'copywriting', label: 'Who will write the website copy?', type: 'select', required: true,
        options: opts('We will', 'You will', 'A mix of both') },
      { key: 'photography', label: 'Photography', type: 'select', required: true,
        options: opts('We have professional photos', 'We have some photos', 'We need a photographer', 'Use stock images') },
    ],
  },
  {
    id: 'blog',
    title: 'Blog',
    fields: [
      { key: 'wantBlog', label: 'Do you want a blog or news section?', type: 'yesno', required: true },
      { key: 'blogAuthors', label: 'Who will write posts?', type: 'text' },
      { key: 'blogFrequency', label: 'How often do you plan to post?', type: 'select',
        options: opts('Weekly', 'Monthly', 'Occasionally', 'Not sure yet') },
      { key: 'blogTopics', label: 'Topics you’d like to cover', type: 'textarea' },
    ],
  },
  {
    id: 'technical',
    title: 'Technical',
    fields: [
      { key: 'currentSite', label: 'Current website address', type: 'url' },
      { key: 'domains', label: 'Domain name(s) you want to use', type: 'text', required: true },
      { key: 'domainControl', label: 'Who manages your domain and DNS?', type: 'text', hint: 'For example your IT company, or the registrar’s name.' },
      { key: 'emailProvider', label: 'Email provider', type: 'select',
        options: opts('Microsoft 365', 'Google Workspace', 'Other', 'Not sure') },
      { key: 'systems', label: 'Systems the site may need to connect to', type: 'textarea',
        hint: 'Case management, CRM, booking or accounts software.' },
      { key: 'accessibility', label: 'Any specific accessibility needs?', type: 'textarea' },
    ],
  },
  {
    id: 'timing',
    title: 'Timing and budget',
    fields: [
      { key: 'launchDate', label: 'Target launch date', type: 'date' },
      { key: 'deadlineReason', label: 'Is there a fixed deadline? What’s driving it?', type: 'textarea' },
      { key: 'budget', label: 'Budget', type: 'text', hint: 'A range is fine.' },
      { key: 'decisionMakers', label: 'Who will approve the website?', type: 'text', required: true },
      { key: 'heardFrom', label: 'How did you hear about us?', type: 'text' },
    ],
  },
];

type Answers = Record<string, Record<string, unknown>>;

const filled = (v: unknown) =>
  Array.isArray(v) ? v.length > 0 : typeof v === 'boolean' ? true : typeof v === 'string' ? v.trim().length > 0 : v != null;

export function partProgress(part: BriefingPart, data: Answers) {
  const req = part.fields.filter((f) => f.required);
  const done = req.filter((f) => filled(data?.[part.id]?.[f.key])).length;
  return { done, total: req.length, complete: done === req.length };
}

export function briefingProgress(data: Answers) {
  const parts = BRIEFING.map((p) => partProgress(p, data));
  const done = parts.reduce((n, p) => n + p.done, 0);
  const total = parts.reduce((n, p) => n + p.total, 0);
  return { done, total, complete: done === total, missing: BRIEFING.filter((_, i) => !parts[i].complete).map((p) => p.title) };
}

// Keep only known fields with values of the right shape (drafts may be incomplete).
export function cleanBriefing(input: unknown): Answers {
  const out: Answers = {};
  const src = (input && typeof input === 'object' ? input : {}) as Answers;
  for (const part of BRIEFING) {
    const got = src[part.id] ?? {};
    const clean: Record<string, unknown> = {};
    for (const f of part.fields) {
      const v = got[f.key];
      if (v == null || v === '') continue;
      if (f.type === 'multi') {
        if (Array.isArray(v)) {
          const ids = new Set(f.options?.map((o) => o.id));
          const vals = v.filter((x): x is string => typeof x === 'string' && ids.has(x));
          if (vals.length) clean[f.key] = [...new Set(vals)];
        }
      } else if (f.type === 'yesno') {
        if (typeof v === 'boolean') clean[f.key] = v;
      } else if (f.type === 'select') {
        if (typeof v === 'string' && f.options?.some((o) => o.id === v)) clean[f.key] = v;
      } else if (typeof v === 'string') {
        const s = v.slice(0, f.max ?? (f.type === 'textarea' ? 5000 : 500));
        if (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(s)) continue;
        clean[f.key] = s; // URLs are stored as typed and only ever shown as text
      }
    }
    if (Object.keys(clean).length) out[part.id] = clean;
  }
  return out;
}

export const displayValue = (f: BriefingField, v: unknown): string => {
  if (v == null || v === '') return '';
  if (f.type === 'yesno') return v ? 'Yes' : 'No';
  if (f.type === 'select') return f.options?.find((o) => o.id === v)?.label ?? String(v);
  if (f.type === 'multi' && Array.isArray(v)) return v.map((x) => f.options?.find((o) => o.id === x)?.label ?? x).join(', ');
  if (f.type === 'date' && typeof v === 'string') {
    const d = new Date(`${v}T00:00:00`);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return String(v);
};
