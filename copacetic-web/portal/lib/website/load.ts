import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/onboarding';
import { createClient } from '@/lib/supabase/server';

// Stages from which a firm manages its own website content (matches private.website_enabled()).
export const WEBSITE_STAGES = ['in_build', 'in_review', 'signed_off', 'paid', 'live'] as const;
export const websiteEnabled = (stage: string | null | undefined) =>
  !!stage && (WEBSITE_STAGES as readonly string[]).includes(stage);

// The firm, its sites and what this person may do in the Website area. 404s for non-members.
export const loadWebsite = cache(async (orgId: string) => {
  const { viewer, role, isAgency } = await requireMember(orgId);
  const supabase = await createClient();
  const [{ data: org }, { data: sites }] = await Promise.all([
    supabase.from('organisations').select('id, name').eq('id', orgId).maybeSingle(),
    supabase.from('sites').select('id, name, stage, website_url').eq('org_id', orgId).order('created_at'),
  ]);
  if (!org) notFound();
  const enabled = (sites ?? []).some((s) => websiteEnabled(s.stage));
  return {
    viewer,
    org,
    sites: sites ?? [],
    enabled,
    isAgency,
    canPublish: isAgency || (enabled && (role === 'owner' || role === 'approver')),
  };
});
export type WebsiteContext = Awaited<ReturnType<typeof loadWebsite>>;
