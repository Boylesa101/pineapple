-- Phase 1 foundations: organisations, people, invitations, sites, preview builds, audit log.
-- Security model: RLS on every table; helper functions live in the unexposed `private` schema;
-- anything that must bypass RLS is a narrow SECURITY DEFINER function with its own checks.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ------------------------------------------------------------------ types ---
create type public.member_role as enum ('owner', 'approver', 'editor');
create type public.site_stage as enum (
  'invited', 'onboarding', 'content_submitted', 'in_build', 'in_review', 'signed_off', 'paid', 'live'
);
create type public.invoice_trigger as enum ('sign_off', 'deposit_and_sign_off');
create type public.build_status as enum ('in_review', 'changes_requested', 'approved');

-- ----------------------------------------------------------------- tables ---
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  sra_number text check (sra_number ~ '^[0-9]{3,8}$'),
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text check (char_length(full_name) <= 200),
  is_agency_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  role public.member_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (user_id) on delete set null,
  revoked_at timestamptz,
  invited_by uuid references public.profiles (user_id) on delete set null,
  created_at timestamptz not null default now()
);
create index invitations_org_id_idx on public.invitations (org_id);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  stage public.site_stage not null default 'invited',
  stage_changed_at timestamptz not null default now(),
  invoice_on public.invoice_trigger not null default 'sign_off',
  created_at timestamptz not null default now(),
  unique (id, org_id)
);
create index sites_org_id_idx on public.sites (org_id);

-- Draft builds / previews the agency shares with a client (Phase 1: pasted URLs).
create table public.builds (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null,
  org_id uuid not null,
  url text not null check (url ~ '^https://[^\s]+$' and char_length(url) <= 2000),
  version_label text not null check (char_length(version_label) between 1 and 120),
  notes text check (char_length(notes) <= 4000),
  shared_with_client boolean not null default false,
  status public.build_status not null default 'in_review',
  created_by uuid references public.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  -- org_id must match the site's org, so RLS can filter on org_id directly.
  foreign key (site_id, org_id) references public.sites (id, org_id) on delete cascade
);
create index builds_site_id_idx on public.builds (site_id, created_at desc);
create index builds_org_id_idx on public.builds (org_id);

-- Append-only, hash-chained. org_id has no FK so entries outlive a deleted organisation.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  org_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now(),
  prev_hash text,
  hash text not null
);
create index audit_log_org_id_idx on public.audit_log (org_id, created_at desc);

-- -------------------------------------------------------- helper functions ---
-- Agency admin = flag set AND this session passed two-factor authentication.
create function private.is_agency_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
     and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_agency_admin);
$$;

create function private.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = (select auth.uid()));
$$;

create function private.has_org_role(p_org uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role = any (p_roles)
  );
$$;

revoke all on function private.is_agency_admin(), private.is_org_member(uuid),
  private.has_org_role(uuid, public.member_role[]) from public, anon;
grant execute on function private.is_agency_admin(), private.is_org_member(uuid),
  private.has_org_role(uuid, public.member_role[]) to authenticated;

-- ------------------------------------------------------------------ audit ---
create function private.write_audit(
  p_action text, p_entity text, p_entity_id text, p_org uuid, p_before jsonb, p_after jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_prev text;
  v_now timestamptz := clock_timestamp();
  v_actor uuid := auth.uid();
begin
  -- Serialise writers so the hash chain has no forks.
  perform pg_advisory_xact_lock(hashtext('public.audit_log'));
  select a.hash into v_prev from public.audit_log a order by a.id desc limit 1;
  insert into public.audit_log (actor_id, org_id, action, entity, entity_id, before, after, created_at, prev_hash, hash)
  values (v_actor, p_org, p_action, p_entity, p_entity_id, p_before, p_after, v_now, v_prev,
    encode(extensions.digest(
      concat_ws('|', coalesce(v_prev, ''), v_actor::text, p_org::text, p_action, p_entity, p_entity_id,
                p_before::text, p_after::text, v_now::text), 'sha256'), 'hex'));
end;
$$;
revoke all on function private.write_audit(text, text, text, uuid, jsonb, jsonb) from public, anon, authenticated;

-- Generic row audit for the tables whose changes matter (role changes, deletions, stage moves...).
create function private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_org uuid := coalesce((v_row ->> 'org_id')::uuid, case when tg_table_name = 'organisations' then (v_row ->> 'id')::uuid end);
  v_id text := coalesce(v_row ->> 'id', concat_ws(':', v_row ->> 'org_id', v_row ->> 'user_id'));
begin
  -- Never copy token hashes into the log.
  v_old := v_old - 'token_hash';
  v_new := v_new - 'token_hash';
  if tg_op = 'UPDATE' and v_old = v_new then return new; end if;
  perform private.write_audit(lower(tg_op), tg_table_name, v_id, v_org, v_old, v_new);
  return coalesce(new, old);
end;
$$;

create trigger audit_organisations after insert or update or delete on public.organisations
  for each row execute function private.audit_row();
create trigger audit_memberships after insert or update or delete on public.memberships
  for each row execute function private.audit_row();
create trigger audit_invitations after insert or update or delete on public.invitations
  for each row execute function private.audit_row();
create trigger audit_sites after insert or update or delete on public.sites
  for each row execute function private.audit_row();
create trigger audit_builds after insert or update or delete on public.builds
  for each row execute function private.audit_row();

-- The log can't be edited or deleted through any role that goes through triggers.
create function private.audit_log_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;
create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function private.audit_log_immutable();

-- --------------------------------------------------------- profile sync ---
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, lower(new.email), nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = lower(new.email) where user_id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- ---------------------------------------------------------- stage guard ---
-- Stage changes go through transition_stage(); keep stage_changed_at honest.
create function private.sites_stage_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
  end if;
  return new;
end;
$$;
create trigger sites_stage_touch before update on public.sites
  for each row execute function private.sites_stage_touch();

-- Every org keeps at least one owner.
create function private.keep_an_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_org uuid := old.org_id;
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and exists (select 1 from public.organisations o where o.id = v_org)
     and not exists (select 1 from public.memberships m where m.org_id = v_org and m.role = 'owner'
                     and m.user_id <> old.user_id) then
    -- Deleting the whole organisation cascades here; only block when the org survives.
    if pg_trigger_depth() <= 1 then
      raise exception 'An organisation must keep at least one owner';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger memberships_keep_an_owner before update or delete on public.memberships
  for each row execute function private.keep_an_owner();
