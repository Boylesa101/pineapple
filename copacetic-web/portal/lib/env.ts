import 'server-only';
import { z } from 'zod';

const gid = z.string().regex(/^[0-9]{1,30}$/);

// Server-side configuration, validated once at start-up. Secrets never get a NEXT_PUBLIC_ prefix.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  // Public origin of the portal, used in email links (e.g. https://portal.example.co.uk).
  PORTAL_URL: z.url().default('http://localhost:3000'),
  // Optional: without it, invite emails aren't sent and the admin copies the link instead.
  RESEND_API_KEY: z.string().min(10).optional(),
  EMAIL_FROM: z.string().min(3).default('copacetic.web <portal@localhost>'),
  // Where submission notifications go (the agency inbox). Optional.
  AGENCY_NOTIFY_EMAIL: z.email().optional(),
  // Signs upload verdicts; must match the `media_signing_secret` in Supabase Vault. Without it,
  // uploads stay "checking" and are never marked clean.
  MEDIA_SIGNING_SECRET: z.string().min(32).optional(),

  // Phase 3 (Asana). All optional: without them, jobs queue up in the database and wait.
  // Supabase secret key (sb_secret_…): only the job worker and the Asana webhook use it.
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  // Shared with Supabase Vault (`jobs_secret`) so the scheduled call can run jobs.
  JOBS_SECRET: z.string().min(32).optional(),
  ASANA_TOKEN: z.string().min(10).optional(),
  ASANA_WORKSPACE_GID: gid.optional(),
  ASANA_TEAM_GID: gid.optional(),
  ASANA_ASSIGNEE_GID: gid.optional(),
});

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PORTAL_URL: process.env.PORTAL_URL || undefined,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  AGENCY_NOTIFY_EMAIL: process.env.AGENCY_NOTIFY_EMAIL || undefined,
  MEDIA_SIGNING_SECRET: process.env.MEDIA_SIGNING_SECRET || undefined,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
  JOBS_SECRET: process.env.JOBS_SECRET || undefined,
  ASANA_TOKEN: process.env.ASANA_TOKEN || undefined,
  ASANA_WORKSPACE_GID: process.env.ASANA_WORKSPACE_GID || undefined,
  ASANA_TEAM_GID: process.env.ASANA_TEAM_GID || undefined,
  ASANA_ASSIGNEE_GID: process.env.ASANA_ASSIGNEE_GID || undefined,
});

export const portalUrl = (path: string) => new URL(path, env.PORTAL_URL).toString();
