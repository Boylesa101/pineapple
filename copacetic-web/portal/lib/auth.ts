import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Role = 'owner' | 'approver' | 'editor';

// Verified identity for this request (the JWT is checked, not just read from the cookie).
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, email, full_name, is_agency_admin')
    .eq('user_id', claims.sub)
    .maybeSingle();
  return {
    userId: claims.sub,
    email: (claims.email as string | undefined)?.toLowerCase() ?? profile?.email ?? '',
    aal: claims.aal as 'aal1' | 'aal2' | undefined,
    fullName: profile?.full_name ?? null,
    isAgencyAdmin: profile?.is_agency_admin ?? false,
  };
});

export async function requireUser() {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  return viewer;
}

// Agency pages: the admin flag AND a two-factor session. Anyone else gets a 404, not a hint.
export async function requireAdmin() {
  const viewer = await requireUser();
  if (!viewer.isAgencyAdmin) notFound();
  if (viewer.aal !== 'aal2') redirect('/admin/mfa');
  return viewer;
}

// For the 2FA page itself, which runs before the session reaches aal2.
export async function requireAdminFlag() {
  const viewer = await requireUser();
  if (!viewer.isAgencyAdmin) notFound();
  return viewer;
}

export async function requireOrgRole(orgId: string, roles: Role[]) {
  const viewer = await requireUser();
  if (viewer.isAgencyAdmin && viewer.aal === 'aal2') return viewer;
  const supabase = await createClient();
  const { data } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', viewer.userId)
    .maybeSingle();
  if (!data || !roles.includes(data.role as Role)) notFound();
  return viewer;
}

// Only ever redirect to a path on this site.
export function safeNext(next: string | null | undefined, fallback = '/') {
  // Control characters are rejected too: browsers strip them, so "/\t/evil.com" would become "//evil.com".
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') && !/[\u0000-\u001f\u007f]/.test(next)
    ? next
    : fallback;
}
