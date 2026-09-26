import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { requireUser, type Role } from '@/lib/auth';
import { briefingProgress } from '@/lib/content/briefing';
import { missingParts, SECTIONS, type SectionRow, type SectionType } from '@/lib/content/sections';
import { transparencyLabel } from '@/lib/content/transparency';
import { createClient } from '@/lib/supabase/server';

export type MediaRow = {
  id: string;
  section_id: string | null;
  kind: 'logo' | 'image' | 'font' | 'document';
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  label: string | null;
  status: 'pending' | 'clean' | 'rejected';
  created_at: string;
};

// The signed-in person's role in this firm (the agency counts as a viewer with every right).
export const requireMember = cache(async (orgId: string) => {
  const viewer = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', viewer.userId)
    .maybeSingle();
  const isAgency = viewer.isAgencyAdmin && viewer.aal === 'aal2';
  if (!data && !isAgency) notFound();
  return { viewer, role: (data?.role ?? null) as Role | null, isAgency };
});

export const loadOnboarding = cache(async (orgId: string) => {
  const supabase = await createClient();
  const [{ data: org }, { data: site }, { data: briefing }, { data: sections }, { data: media }] = await Promise.all([
    supabase.from('organisations').select('id, name').eq('id', orgId).maybeSingle(),
    supabase.from('sites').select('id, stage').eq('org_id', orgId).order('created_at').limit(1).maybeSingle(),
    supabase.from('briefings').select('data, status, version, submitted_at').eq('org_id', orgId).maybeSingle(),
    supabase
      .from('content_sections')
      .select('id, type, title, body, fields, status, version, sort_order, submitted_at, updated_at')
      .eq('org_id', orgId)
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('media')
      .select('id, section_id, kind, storage_path, original_name, mime_type, size_bytes, alt_text, label, status, created_at')
      .eq('org_id', orgId)
      .not('section_id', 'is', null) // website files (blog images, documents) live in the Website area
      .order('created_at'),
  ]);
  if (!org) notFound();
  const stage = site?.stage ?? 'invited';
  return {
    org,
    stage,
    // Members can add new content only during onboarding; reopened drafts stay editable after.
    canAdd: stage === 'onboarding',
    canEditDrafts: stage === 'onboarding' || stage === 'content_submitted',
    briefing: briefing ?? { data: {}, status: 'draft' as const, version: 1, submitted_at: null },
    sections: (sections ?? []) as (SectionRow & { version: number; sort_order: number; submitted_at: string | null; updated_at: string })[],
    media: (media ?? []) as MediaRow[],
  };
});

export type Onboarding = Awaited<ReturnType<typeof loadOnboarding>>;

export function brandCounts(o: Onboarding, sectionId: string, fields: Record<string, unknown>) {
  const files = o.media.filter((m) => m.section_id === sectionId && m.status !== 'rejected');
  return {
    colours: Array.isArray(fields.colours) ? fields.colours.length : 0,
    fonts: (Array.isArray(fields.fonts) ? fields.fonts.length : 0) + files.filter((m) => m.kind === 'font').length,
    logos: files.filter((m) => m.kind === 'logo').length,
  };
}

export function sectionMissing(o: Onboarding, row: SectionRow) {
  return missingParts(row, row.type === 'brand' ? brandCounts(o, row.id, row.fields ?? {}) : undefined);
}

// The checklist: what the firm has to provide, and what's still missing.
export function checklist(o: Onboarding) {
  const briefing = briefingProgress((o.briefing.data ?? {}) as Record<string, Record<string, unknown>>);
  const ticked: string[] = ((o.briefing.data as Record<string, Record<string, unknown>>)?.pricing?.services as string[]) ?? [];
  const byType = (t: SectionType) => o.sections.filter((s) => s.type === t);

  const items = SECTIONS.map((cfg) => {
    const rows = byType(cfg.type);
    const drafts = rows.filter((r) => r.status === 'draft');
    const incomplete = drafts.filter((r) => sectionMissing(o, r).length > 0);
    let required = false;
    let requirementMissing: string | null = null;
    if (cfg.type === 'brand' || cfg.type === 'about') {
      required = true;
      if (!rows.length) requirementMissing = 'Not started';
    } else if (cfg.type === 'service' || cfg.type === 'team_member' || cfg.type === 'office') {
      required = true;
      if (!rows.length) requirementMissing = `Add at least ${cfg.itemLabel}`;
    } else if (cfg.type === 'price_page') {
      required = ticked.length > 0;
      const have = new Set(rows.map((r) => r.fields?.service));
      const need = ticked.filter((s) => !have.has(s));
      if (need.length) requirementMissing = `Still needed: ${need.map(transparencyLabel).join('; ')}`;
    }
    const submitted = rows.filter((r) => r.status !== 'draft').length;
    const done = !requirementMissing && incomplete.length === 0 && (rows.length > 0 || !required);
    return { cfg, rows, drafts, incomplete, required, requirementMissing, submitted, done };
  });

  const blocking = [
    ...(o.briefing.status === 'draft' && !briefing.complete ? [`Briefing: ${briefing.missing.join(', ')}`] : []),
    ...items
      .filter((i) => i.requirementMissing || i.incomplete.length)
      .map((i) => `${i.cfg.label}: ${i.requirementMissing ?? `${i.incomplete.length} unfinished`}`),
  ];
  const total = items.filter((i) => i.required).length + 1;
  const complete = items.filter((i) => i.required && i.done).length + (briefing.complete || o.briefing.status !== 'draft' ? 1 : 0);
  return { briefing, items, blocking, progress: { complete, total }, ticked };
}

// Short-lived signed link to a file. SVGs and documents are always downloaded, never shown inline.
export async function signedFileUrl(path: string, opts: { download?: string | boolean } = {}) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from('client-files')
    .createSignedUrl(path, 300, opts.download ? { download: opts.download } : undefined);
  return data?.signedUrl ?? null;
}

export const isPreviewable = (m: MediaRow) =>
  m.status === 'clean' && ['image/jpeg', 'image/png', 'image/webp'].includes(m.mime_type);
