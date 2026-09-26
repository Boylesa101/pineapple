-- Phase 2: onboarding. Briefing, content sections, uploaded files, and the submit / reopen workflow.
--
-- Editing window: a firm's members can edit drafts while its site is in `onboarding`. After
-- "Submit everything" (stage -> content_submitted) content is read-only, except sections the
-- agency reopens, which become drafts again and can be edited and resubmitted.

create type public.briefing_status as enum ('draft', 'submitted');
create type public.section_type as enum (
  'brand', 'about', 'service', 'team_member', 'office', 'price_page', 'testimonial', 'faq', 'custom'
);
create type public.section_status as enum ('draft', 'submitted', 'approved');
create type public.media_kind as enum ('logo', 'image', 'font', 'document');
create type public.media_status as enum ('pending', 'clean', 'rejected');

-- ----------------------------------------------------------------- tables ---
create table public.briefings (
  org_id uuid primary key references public.organisations (id) on delete cascade,
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 200000),
  status public.briefing_status not null default 'draft',
  version integer not null default 1,
  submitted_at timestamptz,
  submitted_by uuid references public.profiles (user_id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (user_id) on delete set null
);

create table public.content_sections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  type public.section_type not null,
  title text check (char_length(title) <= 200),
  body jsonb check (body is null or (jsonb_typeof(body) = 'object' and pg_column_size(body) < 200000)),
  fields jsonb not null default '{}' check (jsonb_typeof(fields) = 'object' and pg_column_size(fields) < 100000),
  sort_order integer not null default 0,
  status public.section_status not null default 'draft',
  placement text check (char_length(placement) <= 500),
  asana_task_gid text,
  version integer not null default 1,
  submitted_at timestamptz,
  submitted_by uuid references public.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (user_id) on delete set null,
  unique (id, org_id)
);
create index content_sections_org_idx on public.content_sections (org_id, type, sort_order);
-- Brand and About us are one-per-firm.
create unique index content_sections_singletons on public.content_sections (org_id, type)
  where type in ('brand', 'about');

create table public.media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  section_id uuid not null,
  kind public.media_kind not null,
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  alt_text text check (char_length(alt_text) <= 500),
  label text check (char_length(label) <= 120),  -- e.g. "Primary logo", "Reversed", "Office photo"
  font_licence_confirmed boolean not null default false,
  status public.media_status not null default 'pending',
  uploaded_by uuid references public.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (section_id, org_id) references public.content_sections (id, org_id) on delete cascade,
  -- Files live under the firm's own folder in storage.
  check (storage_path like org_id::text || '/%'),
  check (kind <> 'font' or font_licence_confirmed)
);
create index media_section_idx on public.media (section_id);
create index media_org_idx on public.media (org_id);

-- Every organisation gets its (empty) briefing up front.
create function private.create_briefing() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.briefings (org_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger organisations_create_briefing after insert on public.organisations
  for each row execute function private.create_briefing();
insert into public.briefings (org_id) select id from public.organisations on conflict do nothing;

-- Stamp who/when and bump the version on every content change (optimistic concurrency for autosave).
create function private.touch_content() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if new is distinct from old then new.version := old.version + 1; end if;
  return new;
end;
$$;
create trigger briefings_touch before update on public.briefings
  for each row execute function private.touch_content();
create trigger content_sections_touch before update on public.content_sections
  for each row execute function private.touch_content();

-- ---------------------------------------------------------------- helpers ---
-- Can this firm's members still edit drafts? (Onboarding, or reopened sections after submission.)
create function private.org_editable(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sites s where s.org_id = p_org and s.stage in ('onboarding', 'content_submitted')
  );
$$;
-- New sections can only be added during onboarding.
create function private.org_onboarding(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sites s where s.org_id = p_org and s.stage = 'onboarding');
$$;
create function private.section_is_draft(p_section uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.content_sections c where c.id = p_section and c.status = 'draft');
$$;
revoke all on function private.org_editable(uuid), private.org_onboarding(uuid), private.section_is_draft(uuid)
  from public, anon;
grant execute on function private.org_editable(uuid), private.org_onboarding(uuid), private.section_is_draft(uuid)
  to authenticated;

-- ------------------------------------------------------------------ audit ---
-- Autosave would flood the log, so only status changes, creations and deletions are audited.
create function private.audit_content() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_summary jsonb;
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;
  v_summary := jsonb_strip_nulls(jsonb_build_object(
    'type', v_row ->> 'type', 'title', v_row ->> 'title', 'kind', v_row ->> 'kind',
    'original_name', v_row ->> 'original_name', 'status', v_row ->> 'status'));
  perform private.write_audit(
    lower(tg_op), tg_table_name, coalesce(v_row ->> 'id', v_row ->> 'org_id'), (v_row ->> 'org_id')::uuid,
    case when tg_op <> 'INSERT' then jsonb_build_object('status', to_jsonb(old) ->> 'status') end,
    case when tg_op <> 'DELETE' then v_summary end);
  return coalesce(new, old);
end;
$$;
create trigger audit_briefings after update on public.briefings
  for each row execute function private.audit_content();
create trigger audit_content_sections after insert or update or delete on public.content_sections
  for each row execute function private.audit_content();
create trigger audit_media after insert or update or delete on public.media
  for each row execute function private.audit_content();

-- -------------------------------------------------------------------- RLS ---
alter table public.briefings enable row level security;
alter table public.content_sections enable row level security;
alter table public.media enable row level security;

-- briefings: one row per firm, created by trigger; members edit `data` while it's a draft.
grant select on public.briefings to authenticated;
grant update (data) on public.briefings to authenticated;
create policy "members and agency read the briefing" on public.briefings
  for select to authenticated using (private.is_agency_admin() or private.is_org_member(org_id));
create policy "members edit a draft briefing" on public.briefings
  for update to authenticated
  using (status = 'draft' and private.is_org_member(org_id) and private.org_editable(org_id))
  with check (status = 'draft' and private.is_org_member(org_id) and private.org_editable(org_id));

-- content_sections
grant select, delete on public.content_sections to authenticated;
grant insert (org_id, type, title, body, fields, sort_order, placement) on public.content_sections to authenticated;
grant update (title, body, fields, sort_order, placement) on public.content_sections to authenticated;
create policy "members and agency read content" on public.content_sections
  for select to authenticated using (private.is_agency_admin() or private.is_org_member(org_id));
create policy "members add content during onboarding" on public.content_sections
  for insert to authenticated
  with check (status = 'draft' and private.is_org_member(org_id) and private.org_onboarding(org_id));
create policy "members edit draft content" on public.content_sections
  for update to authenticated
  using (status = 'draft' and private.is_org_member(org_id) and private.org_editable(org_id))
  with check (status = 'draft' and private.is_org_member(org_id) and private.org_editable(org_id));
create policy "members delete draft content during onboarding" on public.content_sections
  for delete to authenticated
  using (status = 'draft' and type not in ('brand', 'about')
         and private.is_org_member(org_id) and private.org_onboarding(org_id));

-- media: rows are created just before upload (status pending); only finalize_media() marks them clean.
grant select, delete on public.media to authenticated;
grant insert (org_id, section_id, kind, storage_path, original_name, mime_type, size_bytes, alt_text, label,
              font_licence_confirmed, uploaded_by) on public.media to authenticated;
grant update (alt_text, label) on public.media to authenticated;
create policy "members and agency see files" on public.media
  for select to authenticated using (private.is_agency_admin() or private.is_org_member(org_id));
create policy "members add files to draft sections" on public.media
  for insert to authenticated
  with check (status = 'pending' and uploaded_by = (select auth.uid())
              and private.is_org_member(org_id) and private.org_editable(org_id)
              and private.section_is_draft(section_id));
create policy "members label files in draft sections" on public.media
  for update to authenticated
  using (private.is_org_member(org_id) and private.org_editable(org_id) and private.section_is_draft(section_id))
  with check (private.is_org_member(org_id) and private.org_editable(org_id) and private.section_is_draft(section_id));
create policy "members remove files from draft sections" on public.media
  for delete to authenticated
  using (private.is_org_member(org_id) and private.org_editable(org_id) and private.section_is_draft(section_id));

-- ---------------------------------------------------------------- storage ---
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-files', 'client-files', false, 26214400, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'font/woff2', 'font/woff', 'font/otf', 'font/ttf'
])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Path layout: {org_id}/{media_id}/{file name}. Access follows the media row.
create policy "client files: members and agency read" on storage.objects
  for select to authenticated
  using (bucket_id = 'client-files' and exists (
    select 1 from public.media m
    where m.storage_path = storage.objects.name
      and (private.is_agency_admin() or private.is_org_member(m.org_id))));
create policy "client files: upload to a pending media row" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'client-files' and exists (
    select 1 from public.media m
    where m.storage_path = storage.objects.name and m.status = 'pending'
      and m.uploaded_by = (select auth.uid()) and private.is_org_member(m.org_id)));
create policy "client files: members delete from draft sections" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-files' and exists (
    select 1 from public.media m
    where m.storage_path = storage.objects.name
      and private.is_org_member(m.org_id) and private.org_editable(m.org_id)
      and private.section_is_draft(m.section_id)));

-- =================================================================== RPCs ===

-- Submit one section (any member) while editing is open.
create function public.submit_section(p_section uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.content_sections where id = p_section and status = 'draft' for update;
  if not found or not private.is_org_member(v_org) or not private.org_editable(v_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.content_sections
  set status = 'submitted', submitted_at = now(), submitted_by = auth.uid()
  where id = p_section;
end;
$$;

create function public.submit_briefing(p_org uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_org_member(p_org) or not private.org_editable(p_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.briefings
  set status = 'submitted', submitted_at = now(), submitted_by = auth.uid()
  where org_id = p_org and status = 'draft';
end;
$$;

-- Submit everything (owners and approvers): all drafts become submitted and the site moves on.
create function public.submit_all(p_org uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_org_role(p_org, '{owner,approver}') or not private.org_onboarding(p_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.briefings set status = 'submitted', submitted_at = now(), submitted_by = auth.uid()
  where org_id = p_org and status = 'draft';
  update public.content_sections set status = 'submitted', submitted_at = now(), submitted_by = auth.uid()
  where org_id = p_org and status = 'draft';
  update public.sites set stage = 'content_submitted' where org_id = p_org and stage = 'onboarding';
end;
$$;

-- Agency: send a section (or the briefing) back to the client for changes.
create function public.reopen_section(p_section uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_agency_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.content_sections set status = 'draft', submitted_at = null, submitted_by = null
  where id = p_section;
end;
$$;

create function public.reopen_briefing(p_org uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_agency_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.briefings set status = 'draft', submitted_at = null, submitted_by = null where org_id = p_org;
end;
$$;

-- Mark an upload clean or rejected after the server has checked its contents. The verdict must be
-- signed with the media signing secret (kept in Supabase Vault and in the app's server env), so a
-- client calling this RPC directly can't approve its own file.
create function public.finalize_media(p_media uuid, p_ok boolean, p_sha256 text, p_size bigint, p_signature text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_expected text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'media_signing_secret';
  if v_secret is null then
    raise exception 'media signing secret is not configured' using errcode = 'P0001';
  end if;
  v_expected := encode(extensions.hmac(
    concat_ws('|', p_media::text, case when p_ok then 'clean' else 'rejected' end, coalesce(p_sha256, ''), p_size::text),
    v_secret, 'sha256'), 'hex');
  if p_signature is null or p_signature <> v_expected then
    raise exception 'invalid signature' using errcode = '42501';
  end if;
  update public.media
  set status = case when p_ok then 'clean'::public.media_status else 'rejected'::public.media_status end,
      sha256 = p_sha256, size_bytes = p_size
  where id = p_media and status = 'pending';
end;
$$;

revoke all on function public.submit_section(uuid), public.submit_briefing(uuid), public.submit_all(uuid),
  public.reopen_section(uuid), public.reopen_briefing(uuid),
  public.finalize_media(uuid, boolean, text, bigint, text) from public, anon, authenticated;
grant execute on function public.submit_section(uuid), public.submit_briefing(uuid), public.submit_all(uuid),
  public.reopen_section(uuid), public.reopen_briefing(uuid),
  public.finalize_media(uuid, boolean, text, bigint, text) to authenticated;
