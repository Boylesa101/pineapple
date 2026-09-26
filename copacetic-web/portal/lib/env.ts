import 'server-only';
import { z } from 'zod';

// Server-side configuration, validated once at start-up. Secrets never get a NEXT_PUBLIC_ prefix.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  // Public origin of the portal, used in email links (e.g. https://portal.example.co.uk).
  PORTAL_URL: z.url().default('http://localhost:3000'),
  // Optional: without it, invite emails aren't sent and the admin copies the link instead.
  RESEND_API_KEY: z.string().min(10).optional(),
  EMAIL_FROM: z.string().min(3).default('copacetic.web <portal@localhost>'),
});

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PORTAL_URL: process.env.PORTAL_URL || undefined,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
});

export const portalUrl = (path: string) => new URL(path, env.PORTAL_URL).toString();
