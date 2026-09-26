import { z } from 'zod';
import { STAGE_IDS } from '@/lib/stages';

export const email = z.email('Enter a valid email address').trim().toLowerCase().max(320);
export const role = z.enum(['owner', 'approver', 'editor']);
export const uuid = z.uuid();

export const newClientSchema = z.object({
  name: z.string().trim().min(1, 'Enter the firm’s name').max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lower-case letters, numbers and single hyphens')
    .max(80),
  sraNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{3,8}$/, 'SRA numbers are 3 to 8 digits')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  siteName: z.string().trim().min(1, 'Enter the site name or domain').max(200),
  invoiceOn: z.enum(['sign_off', 'deposit_and_sign_off']),
  contactEmail: email,
  contactRole: role,
});

export const inviteSchema = z.object({ orgId: uuid, email, role });

export const buildSchema = z.object({
  orgId: uuid,
  siteId: uuid,
  url: z
    .url('Enter the full preview link, starting https://')
    .max(2000)
    .refine((u) => u.startsWith('https://'), 'Preview links must use https://'),
  versionLabel: z.string().trim().min(1, 'Give this version a label').max(120),
  notes: z.string().trim().max(4000).optional().or(z.literal('').transform(() => undefined)),
  share: z.boolean(),
});

export const stageSchema = z.object({ orgId: uuid, siteId: uuid, stage: z.enum(STAGE_IDS) });

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const formString = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
};
