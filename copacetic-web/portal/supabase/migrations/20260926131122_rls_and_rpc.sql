-- Row Level Security for every Phase 1 table, plus the few RPCs that need to act across rows.
-- RLS is the backstop: server actions check permissions too.

alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.sites enable row level security;
alter table public.builds enable row level security;
alter table public.audit_log enable row level security;

-- Start from nothing: anon gets no table access at all; authenticated gets only what's granted below.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, public;

-- ----------------------------------------------------------- organisations ---
grant select, insert, update, delete on public.organisations to authenticated;

create policy "members and agency can read organisations" on public.organisations
  for select to authenticated
  using (private.is_agency_admin() or private.is_org_member(id));
create policy "agency creates organisations" on public.organisations
  for insert to authenticated with check (private.is_agency_admin());
create policy "agency or owner updates organisation" on public.organisations
  for update to authenticated
  using (private.is_agency_admin() or private.has_org_role(id, '{owner}'))
  with check (private.is_agency_admin() or private.has_org_role(id, '{owner}'));
create policy "agency deletes organisations" on public.organisations
  for delete to authenticated using (private.is_agency_admin());

-- Owners may edit their firm's details but not its slug (used in URLs and integrations).
revoke update on public.organisations from authenticated;
grant update (name, sra_number) on public.organisations to authenticated;

-- ---------------------------------------------------------------- profiles ---
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;  -- never is_agency_admin or email

create policy "read own, teammates', or all as agency" on public.profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_agency_admin()
    or exists (
      select 1 from public.memberships mine
      join public.memberships theirs on theirs.org_id = mine.org_id
      where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.user_id
    )
  );
create policy "update own name" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ------------------------------------------------------------- memberships ---
grant select, update, delete on public.memberships to authenticated;
revoke update on public.memberships from authenticated;
grant update (role) on public.memberships to authenticated;
-- No INSERT grant: people join only through accept_invitation() (or agency tooling).

create policy "members see their org's members" on public.memberships
  for select to authenticated
  using (private.is_agency_admin() or private.is_org_member(org_id));
create policy "agency or owner changes roles" on public.memberships
  for update to authenticated
  using (private.is_agency_admin() or private.has_org_role(org_id, '{owner}'))
  with check (private.is_agency_admin() or private.has_org_role(org_id, '{owner}'));
create policy "agency or owner removes members; anyone can leave" on public.memberships
  for delete to authenticated
  using (private.is_agency_admin() or private.has_org_role(org_id, '{owner}') or user_id = (select auth.uid()));

-- ------------------------------------------------------------- invitations ---
-- Created through create_invitation() (which mints the token); owners/agency can read and revoke.
grant select on public.invitations to authenticated;
grant update (revoked_at) on public.invitations to authenticated;

create policy "agency and owners see invitations" on public.invitations
  for select to authenticated
  using (private.is_agency_admin() or private.has_org_role(org_id, '{owner}'));
create policy "agency and owners revoke invitations" on public.invitations
  for update to authenticated
  using ((private.is_agency_admin() or private.has_org_role(org_id, '{owner}')) and accepted_at is null)
  with check (private.is_agency_admin() or private.has_org_role(org_id, '{owner}'));

-- The token hash is never readable through the API.
revoke select on public.invitations from authenticated;
grant select (id, org_id, email, role, expires_at, accepted_at, accepted_by, revoked_at, invited_by, created_at)
  on public.invitations to authenticated;

-- ------------------------------------------------------------------- sites ---
grant select, insert, delete on public.sites to authenticated;
grant update (name, invoice_on) on public.sites to authenticated;  -- stage only via transition_stage()

create policy "members and agency read sites" on public.sites
  for select to authenticated using (private.is_agency_admin() or private.is_org_member(org_id));
create policy "agency creates sites" on public.sites
  for insert to authenticated with check (private.is_agency_admin() and stage = 'invited');
create policy "agency updates sites" on public.sites
  for update to authenticated using (private.is_agency_admin()) with check (private.is_agency_admin());
create policy "agency deletes sites" on public.sites
  for delete to authenticated using (private.is_agency_admin());

-- ------------------------------------------------------------------ builds ---
grant select, insert, delete on public.builds to authenticated;
grant update (version_label, notes, shared_with_client, status, url) on public.builds to authenticated;

create policy "agency sees all builds; clients see builds shared with them" on public.builds
  for select to authenticated
  using (private.is_agency_admin() or (shared_with_client and private.is_org_member(org_id)));
create policy "agency adds builds" on public.builds
  for insert to authenticated
  with check (private.is_agency_admin() and created_by = (select auth.uid()));
create policy "agency edits builds" on public.builds
  for update to authenticated using (private.is_agency_admin()) with check (private.is_agency_admin());
create policy "agency deletes builds" on public.builds
  for delete to authenticated using (private.is_agency_admin());

-- --------------------------------------------------------------- audit_log ---
grant select on public.audit_log to authenticated;
create policy "agency reads the audit log" on public.audit_log
  for select to authenticated using (private.is_agency_admin());
-- No insert/update/delete policies: entries come only from private.write_audit().

-- ================================================================== RPCs ===

-- Mint an invitation. Returns the raw token exactly once; only its SHA-256 is stored.
create function public.create_invitation(p_org uuid, p_email text, p_role public.member_role)
returns table (invitation_id uuid, token text)
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_email text := lower(trim(p_email));
  v_id uuid;
begin
  if not (private.is_agency_admin() or private.has_org_role(p_org, '{owner}')) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- One live invitation per person per firm: revoke any older pending one.
  update public.invitations set revoked_at = now()
  where org_id = p_org and email = v_email and accepted_at is null and revoked_at is null;
  insert into public.invitations (org_id, email, role, token_hash, invited_by)
  values (p_org, v_email, p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid())
  returning id into v_id;
  return query select v_id, v_token;
end;
$$;

-- What the invite page shows before sign-in. Reveals nothing without the token.
create function public.invitation_preview(p_token text)
returns table (org_name text, email text, role public.member_role, status text)
language sql stable security definer set search_path = '' as $$
  select o.name, i.email, i.role,
    case
      when i.revoked_at is not null then 'revoked'
      when i.accepted_at is not null then 'accepted'
      when i.expires_at < now() then 'expired'
      else 'pending'
    end
  from public.invitations i
  join public.organisations o on o.id = i.org_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- Accept an invitation as the signed-in user. Single use, 7-day expiry, email must match.
create function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations;
  v_email text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  select * into v_inv from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;
  if not found or v_inv.revoked_at is not null then
    raise exception 'This invitation is not valid' using errcode = 'P0001';
  elsif v_inv.accepted_at is not null then
    raise exception 'This invitation has already been used' using errcode = 'P0001';
  elsif v_inv.expires_at < now() then
    raise exception 'This invitation has expired' using errcode = 'P0001';
  elsif v_email is null or v_inv.email <> v_email then
    raise exception 'This invitation was sent to a different email address' using errcode = 'P0001';
  end if;

  insert into public.memberships (org_id, user_id, role)
  values (v_inv.org_id, auth.uid(), v_inv.role)
  on conflict (org_id, user_id) do nothing;

  update public.invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;

  -- The first person in finishes the `invited` stage.
  update public.sites set stage = 'onboarding' where org_id = v_inv.org_id and stage = 'invited';
  return v_inv.org_id;
end;
$$;

-- Move a site to another stage. Phase 1: agency admins only (client-driven moves come later).
create function public.transition_stage(p_site uuid, p_to public.site_stage)
returns public.site_stage
language plpgsql security definer set search_path = '' as $$
declare v_from public.site_stage;
begin
  if not private.is_agency_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select stage into v_from from public.sites where id = p_site for update;
  if not found then
    raise exception 'site not found' using errcode = 'P0002';
  end if;
  if v_from = p_to then
    return v_from;
  end if;
  update public.sites set stage = p_to where id = p_site;  -- audited by the sites trigger
  return p_to;
end;
$$;

revoke all on function public.create_invitation(uuid, text, public.member_role),
  public.invitation_preview(text), public.accept_invitation(text),
  public.transition_stage(uuid, public.site_stage) from public, anon, authenticated;
grant execute on function public.create_invitation(uuid, text, public.member_role),
  public.accept_invitation(text), public.transition_stage(uuid, public.site_stage) to authenticated;
-- The invite page is shown before sign-in.
grant execute on function public.invitation_preview(text) to anon, authenticated;
