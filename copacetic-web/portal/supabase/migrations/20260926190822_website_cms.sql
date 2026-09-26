-- Phase 4: content clients manage on their live website: blog posts, opening times and downloadable
-- documents. Read-only public feeds serve the published parts; each change queues a "refresh"
-- call to the client's site through the integration queue.
--
-- Available once a site is in build or later (so posts can be ready for launch day).

-- ---------------------------------------------------------------- helpers ---
create function private.website_enabled(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sites s
    where s.org_id = p_org and s.stage in ('in_build', 'in_review', 'signed_off', 'paid', 'live')
  );
$$;
revoke all on function private.website_enabled(uuid) from public, anon;
grant execute on function private.website_enabled(uuid) to authenticated;

-- Can the current user publish (owner/approver) for this firm?
create function private.can_publish(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_agency_admin()
      or (private.website_enabled(p_org) and private.has_org_role(p_org, array['owner', 'approver']::public.member_role[]));
$$;
revoke all on function private.can_publish(uuid) from public, anon;
grant execute on function private.can_publish(uuid) to authenticated;

-- ---------------------------------------------------------- media library ---
-- Website files (blog images, documents) aren't part of an onboarding section.
alter table public.media alter column section_id drop not null;
alter table public.media add constraint media_library_kinds check (section_id is not null or kind in ('image', 'document'));
alter table public.media add constraint media_id_org_key unique (id, org_id);

create function private.media_editable(p_org uuid, p_section uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_org_member(p_org) and case
    when p_section is null then private.website_enabled(p_org)
    else private.org_editable(p_org) and private.section_is_draft(p_section)
  end;
$$;
revoke all on function private.media_editable(uuid, uuid) from public, anon;
grant execute on function private.media_editable(uuid, uuid) to authenticated;

drop policy "members add files to draft sections" on public.media;
drop policy "members label files in draft sections" on public.media;
drop policy "members remove files from draft sections" on public.media;
create policy "members add files" on public.media
  for insert to authenticated
  with check (status = 'pending' and uploaded_by = (select auth.uid()) and private.media_editable(org_id, section_id));
create policy "members label files" on public.media
  for update to authenticated
  using (private.media_editable(org_id, section_id)) with check (private.media_editable(org_id, section_id));
create policy "members remove files" on public.media
  for delete to authenticated using (private.media_editable(org_id, section_id));

drop policy "client files: members delete from draft sections" on storage.objects;
create policy "client files: members delete editable files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-files' and exists (
    select 1 from public.media m
    where m.storage_path = storage.objects.name and private.media_editable(m.org_id, m.section_id)));

-- ------------------------------------------------------------------- posts ---
create type public.post_status as enum ('draft', 'published');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  summary text not null default '' check (char_length(summary) <= 500),
  body jsonb not null default '{"type": "doc"}'
    check (jsonb_typeof(body) = 'object' and pg_column_size(body) < 200000),
  cover_media_id uuid,
  status public.post_status not null default 'draft',
  -- In the future = scheduled.
  published_at timestamptz,
  version integer not null default 1,
  created_by uuid references public.profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (user_id) on delete set null,
  unique (org_id, slug),
  foreign key (cover_media_id, org_id) references public.media (id, org_id) on delete set null (cover_media_id),
  check (status = 'draft' or published_at is not null)
);
create index posts_feed_idx on public.posts (org_id, published_at desc) where status = 'published';
create index posts_cover_idx on public.posts (cover_media_id);

-- A cover must be one of the firm's checked images.
create function private.check_post_cover() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.cover_media_id is not null and not exists (
    select 1 from public.media m
    where m.id = new.cover_media_id and m.org_id = new.org_id and m.kind = 'image' and m.status = 'clean'
  ) then
    raise exception 'cover must be a checked image' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger posts_check_cover before insert or update of cover_media_id on public.posts
  for each row execute function private.check_post_cover();
create trigger posts_touch before update on public.posts
  for each row execute function private.touch_content();
create trigger audit_posts after insert or update or delete on public.posts
  for each row execute function private.audit_content();

alter table public.posts enable row level security;
grant select, delete on public.posts to authenticated;
grant insert (org_id, title, slug, summary, body, cover_media_id, created_by) on public.posts to authenticated;
grant update (title, slug, summary, body, cover_media_id) on public.posts to authenticated;
create policy "members and agency read posts" on public.posts
  for select to authenticated using (private.is_agency_admin() or private.is_org_member(org_id));
create policy "members start drafts" on public.posts
  for insert to authenticated
  with check (status = 'draft' and created_by = (select auth.uid())
              and private.is_org_member(org_id) and private.website_enabled(org_id));
-- Editors change drafts; owners, approvers and the agency can also change published posts.
create policy "members edit posts" on public.posts
  for update to authenticated
  using (private.can_publish(org_id)
         or (status = 'draft' and private.is_org_member(org_id) and private.website_enabled(org_id)))
  with check (private.can_publish(org_id)
              or (status = 'draft' and private.is_org_member(org_id) and private.website_enabled(org_id)));
create policy "members delete posts" on public.posts
  for delete to authenticated
  using (private.can_publish(org_id)
         or (status = 'draft' and private.is_org_member(org_id) and private.website_enabled(org_id)));

-- Publish now or at a set time (owners, approvers, agency).
create function public.publish_post(p_post uuid, p_at timestamptz default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.posts;
begin
  select * into v from public.posts where id = p_post for update;
  if not found then raise exception 'post not found' using errcode = 'P0002'; end if;
  if not private.can_publish(v.org_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if btrim(v.title) = '' then raise exception 'a post needs a title' using errcode = '22023'; end if;
  if p_at is not null and p_at > now() + interval '1 year' then
    raise exception 'schedule within a year' using errcode = '22023';
  end if;
  update public.posts
  set status = 'published', published_at = greatest(coalesce(p_at, now()), now() - interval '1 minute')
  where id = p_post;
end;
$$;

create function public.unpublish_post(p_post uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select org_id into v_org from public.posts where id = p_post;
  if v_org is null then raise exception 'post not found' using errcode = 'P0002'; end if;
  if not private.can_publish(v_org) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.posts set status = 'draft', published_at = null where id = p_post;
end;
$$;
revoke all on function public.publish_post(uuid, timestamptz), public.unpublish_post(uuid) from public, anon;
grant execute on function public.publish_post(uuid, timestamptz), public.unpublish_post(uuid) to authenticated;

-- ---------------------------------------------------------- opening times ---
-- Intervals are [{"open": "09:00", "close": "17:30"}, ...], at most three a day, in order.
create function private.valid_intervals(p jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare i integer; v_prev text := '';
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 3 then return false; end if;
  for i in 0 .. jsonb_array_length(p) - 1 loop
    if jsonb_typeof(p -> i) <> 'object'
       or (select count(*) from jsonb_object_keys(p -> i)) <> 2
       or coalesce(p -> i ->> 'open', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(p -> i ->> 'close', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$|^24:00$'
       or (p -> i ->> 'open') >= (p -> i ->> 'close')
       or (p -> i ->> 'open') < v_prev then
      return false;
    end if;
    v_prev := p -> i ->> 'close';
  end loop;
  return true;
end;
$$;

create function private.valid_week(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'object'
     and not exists (select 1 from jsonb_object_keys(p) k where k not in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'))
     and not exists (select 1 from jsonb_each(p) e where not private.valid_intervals(e.value));
$$;

-- One row per office (offices are the firm's "office" content items).
create table public.office_hours (
  office_id uuid primary key,
  org_id uuid not null,
  weekly jsonb not null default '{}' check (private.valid_week(weekly)),
  note text check (char_length(note) <= 300),   -- e.g. "Saturday appointments by arrangement"
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (user_id) on delete set null,
  foreign key (office_id, org_id) references public.content_sections (id, org_id) on delete cascade
);

create table public.office_closures (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null,
  org_id uuid not null,
  day date not null,
  -- Closed all day, or open with these special hours.
  hours jsonb check (hours is null or private.valid_intervals(hours)),
  note text check (char_length(note) <= 200),    -- e.g. "Christmas Day"
  created_at timestamptz not null default now(),
  unique (office_id, day),
  foreign key (office_id, org_id) references public.content_sections (id, org_id) on delete cascade
);
create index office_closures_org_idx on public.office_closures (org_id, day);

create function private.check_office() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.content_sections c where c.id = new.office_id and c.org_id = new.org_id and c.type = 'office') then
    raise exception 'not an office' using errcode = '22023';
  end if;
  if tg_table_name = 'office_hours' then
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end;
$$;
create trigger office_hours_check before insert or update on public.office_hours
  for each row execute function private.check_office();
create trigger office_closures_check before insert or update on public.office_closures
  for each row execute function private.check_office();

-- ------------------------------------------------------------- documents ---
create table public.site_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  media_id uuid not null,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 500),
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (media_id, org_id) references public.media (id, org_id) on delete cascade
);
create index site_documents_org_idx on public.site_documents (org_id, sort_order);
create index site_documents_media_idx on public.site_documents (media_id);

create function private.check_document() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.media m
    where m.id = new.media_id and m.org_id = new.org_id and m.kind = 'document' and m.status = 'clean'
  ) then
    raise exception 'must be a checked document' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger site_documents_check before insert or update on public.site_documents
  for each row execute function private.check_document();

-- -------------------------------------------------------------- audit log ---
create function private.audit_website() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_row jsonb := to_jsonb(coalesce(new, old));
begin
  perform private.write_audit(
    lower(tg_op), tg_table_name, coalesce(v_row ->> 'id', v_row ->> 'office_id'), (v_row ->> 'org_id')::uuid, null,
    jsonb_strip_nulls(jsonb_build_object('title', v_row ->> 'title', 'day', v_row ->> 'day', 'office_id', v_row ->> 'office_id')));
  return coalesce(new, old);
end;
$$;
create trigger audit_office_hours after insert or update or delete on public.office_hours
  for each row execute function private.audit_website();
create trigger audit_office_closures after insert or update or delete on public.office_closures
  for each row execute function private.audit_website();
create trigger audit_site_documents after insert or update or delete on public.site_documents
  for each row execute function private.audit_website();

-- ------------------------------------------------------------------- RLS ---
alter table public.office_hours enable row level security;
alter table public.office_closures enable row level security;
alter table public.site_documents enable row level security;

grant select, delete on public.office_hours, public.office_closures, public.site_documents to authenticated;
grant insert (office_id, org_id, weekly, note), update (weekly, note) on public.office_hours to authenticated;
grant insert (office_id, org_id, day, hours, note), update (hours, note) on public.office_closures to authenticated;
grant insert (org_id, media_id, title, description, visible, sort_order),
      update (media_id, title, description, visible, sort_order) on public.site_documents to authenticated;

create policy "members and agency read hours" on public.office_hours
  for select to authenticated using (private.is_agency_admin() or private.is_org_member(org_id));
create policy "members manage hours" on public.office_hours
  for all to authenticated
  using (private.is_agency_admin() or (private.is_org_member(org_id) and private.website_enabled(org_id)))
  with check (private.is_agency_admin() or (private.is_org_member(org_id) and private.website_enabled(org_id)));

create policy "members and agency read closures" on public.office_closures
  for select to authenticated using (private.is_agency_admin() or private.is_org_member(org_id));
create policy "members manage closures" on public.office_closures
  for all to authenticated
  using (private.is_agency_admin() or (private.is_org_member(org_id) and private.website_enabled(org_id)))
  with check (private.is_agency_admin() or (private.is_org_member(org_id) and private.website_enabled(org_id)));

create policy "members and agency read documents" on public.site_documents
  for select to authenticated using (private.is_agency_admin() or private.is_org_member(org_id));
create policy "members manage documents" on public.site_documents
  for all to authenticated
  using (private.is_agency_admin() or (private.is_org_member(org_id) and private.website_enabled(org_id)))
  with check (private.is_agency_admin() or (private.is_org_member(org_id) and private.website_enabled(org_id)));

-- ---------------------------------------------------------- public feeds ---
-- Read by anyone (the client's website), so they return published content only.

create function private.site_org(p_site uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select org_id from public.sites where id = p_site;
$$;
revoke all on function private.site_org(uuid) from public, anon, authenticated;

-- A file is public while it is a published post's cover or a visible document.
create function private.media_is_public(p_media uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.media m where m.id = p_media and m.status = 'clean')
     and (exists (select 1 from public.posts p
                  where p.cover_media_id = p_media and p.status = 'published' and p.published_at <= now())
          or exists (select 1 from public.site_documents d where d.media_id = p_media and d.visible));
$$;
create function private.media_path_is_public(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.media m where m.storage_path = p_path and private.media_is_public(m.id));
$$;
revoke all on function private.media_is_public(uuid), private.media_path_is_public(text) from public;
grant usage on schema private to anon;
grant execute on function private.media_path_is_public(text) to anon, authenticated;

-- Lets the public feed hand out short-lived download links for public files only.
create policy "client files: public website files" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'client-files' and private.media_path_is_public(name));

create function public.public_site_posts(p_site uuid, p_limit integer default 20, p_offset integer default 0)
returns table (id uuid, slug text, title text, summary text, cover_media_id uuid, cover_alt text, published_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.slug, p.title, p.summary, p.cover_media_id, m.alt_text, p.published_at, p.updated_at
  from public.posts p left join public.media m on m.id = p.cover_media_id
  where p.org_id = private.site_org(p_site) and p.status = 'published' and p.published_at <= now()
  order by p.published_at desc, p.id
  limit greatest(1, least(coalesce(p_limit, 20), 50)) offset greatest(0, least(coalesce(p_offset, 0), 10000));
$$;

create function public.public_site_post(p_site uuid, p_slug text)
returns table (id uuid, slug text, title text, summary text, body jsonb, cover_media_id uuid, cover_alt text, published_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.slug, p.title, p.summary, p.body, p.cover_media_id, m.alt_text, p.published_at, p.updated_at
  from public.posts p left join public.media m on m.id = p.cover_media_id
  where p.org_id = private.site_org(p_site) and p.slug = p_slug
    and p.status = 'published' and p.published_at <= now();
$$;

create function public.public_site_hours(p_site uuid)
returns table (office_id uuid, name text, address text, phone text, weekly jsonb, note text, closures jsonb, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, coalesce(nullif(c.title, ''), 'Office'), c.fields ->> 'address', c.fields ->> 'phone',
         coalesce(h.weekly, '{}'), h.note,
         coalesce((select jsonb_agg(jsonb_build_object('day', x.day, 'hours', x.hours, 'note', x.note) order by x.day)
                   from public.office_closures x
                   where x.office_id = c.id and x.day between (now() at time zone 'Europe/London')::date - 1
                                                         and (now() at time zone 'Europe/London')::date + 120), '[]'),
         h.updated_at
  from public.content_sections c left join public.office_hours h on h.office_id = c.id
  where c.org_id = private.site_org(p_site) and c.type = 'office'
  order by c.sort_order, c.created_at;
$$;

create function public.public_site_documents(p_site uuid)
returns table (id uuid, title text, description text, media_id uuid, file_name text, mime_type text, size_bytes bigint, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, d.title, d.description, d.media_id, m.original_name, m.mime_type, m.size_bytes, d.updated_at
  from public.site_documents d join public.media m on m.id = d.media_id
  where d.org_id = private.site_org(p_site) and d.visible and m.status = 'clean'
  order by d.sort_order, d.created_at;
$$;

create function public.public_file(p_media uuid) returns table (storage_path text, file_name text, mime_type text)
language sql stable security definer set search_path = '' as $$
  select m.storage_path, m.original_name, m.mime_type from public.media m
  where m.id = p_media and private.media_is_public(m.id);
$$;

revoke all on function public.public_site_posts(uuid, integer, integer), public.public_site_post(uuid, text),
  public.public_site_hours(uuid), public.public_site_documents(uuid), public.public_file(uuid) from public;
grant execute on function public.public_site_posts(uuid, integer, integer), public.public_site_post(uuid, text),
  public.public_site_hours(uuid), public.public_site_documents(uuid), public.public_file(uuid) to anon, authenticated;

-- ------------------------------------------------------ website refresh ---
-- The agency records each client site's address and the secret its /api/revalidate endpoint expects.
alter table public.sites add column website_url text
  check (website_url ~ '^https://[a-z0-9.-]+(:[0-9]+)?(/[^\s]*)?$' and char_length(website_url) <= 300);

create table private.site_hooks (
  site_id uuid primary key references public.sites (id) on delete cascade,
  secret text not null check (char_length(secret) between 32 and 200)
);
revoke all on private.site_hooks from public, anon, authenticated;

create function public.set_site_website(p_site uuid, p_url text, p_secret text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_agency_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.sites set website_url = nullif(btrim(p_url), '') where id = p_site;
  if not found then raise exception 'site not found' using errcode = 'P0002'; end if;
  if nullif(btrim(p_url), '') is null then
    delete from private.site_hooks where site_id = p_site;
  elsif p_secret is not null then
    insert into private.site_hooks (site_id, secret) values (p_site, p_secret)
    on conflict (site_id) do update set secret = excluded.secret;
  end if;
end;
$$;
create function public.site_website_configured(p_site uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_agency_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return exists (select 1 from private.site_hooks h join public.sites s on s.id = h.site_id
                 where h.site_id = p_site and s.website_url is not null);
end;
$$;
revoke all on function public.set_site_website(uuid, text, text), public.site_website_configured(uuid) from public, anon;
grant execute on function public.set_site_website(uuid, text, text), public.site_website_configured(uuid) to authenticated;

-- For the job worker (secret key only).
create function public.site_revalidate_target(p_site uuid) returns table (url text, secret text)
language sql stable security definer set search_path = '' as $$
  select s.website_url, h.secret from public.sites s join private.site_hooks h on h.site_id = s.id
  where s.id = p_site and s.website_url is not null;
$$;
revoke all on function public.site_revalidate_target(uuid) from public, anon, authenticated;
grant execute on function public.site_revalidate_target(uuid) to service_role;

-- Queue a refresh for each of the firm's sites that has a website set up. Repeated changes merge
-- into one waiting job per site.
alter table public.integration_events drop constraint integration_events_provider_check;
alter table public.integration_events add constraint integration_events_provider_check
  check (provider in ('asana', 'website'));
alter table public.integration_events drop constraint integration_events_action_check;
alter table public.integration_events add constraint integration_events_action_check check (action in (
  'ensure_project', 'upsert_briefing_task', 'upsert_section_task', 'section_reopened', 'briefing_reopened',
  'revalidate_site'));

create function private.queue_site_refresh(p_org uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.integration_events (provider, action, org_id, entity_id)
  select 'website', 'revalidate_site', s.org_id, s.id::text
  from public.sites s join private.site_hooks h on h.site_id = s.id
  where s.org_id = p_org and s.website_url is not null
  on conflict (provider, action, entity_id) where status = 'pending'
  do update set next_attempt_at = now(), updated_at = now();
$$;
revoke all on function private.queue_site_refresh(uuid) from public, anon, authenticated;

create function private.website_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
  v_published boolean := false;
begin
  if tg_op <> 'DELETE' then
    v_org := new.org_id;
    if tg_table_name = 'posts' then v_published := new.status = 'published'; end if;
  end if;
  if tg_op <> 'INSERT' then
    v_org := coalesce(v_org, old.org_id);
    if tg_table_name = 'posts' then v_published := v_published or old.status = 'published'; end if;
  end if;
  -- Draft edits don't show on the site; anything touching a published post does.
  if tg_table_name = 'posts' and not v_published then return null; end if;
  perform private.queue_site_refresh(v_org);
  return null;
end;
$$;
create trigger posts_refresh_site after insert or update or delete on public.posts
  for each row execute function private.website_changed();
create trigger office_hours_refresh_site after insert or update or delete on public.office_hours
  for each row execute function private.website_changed();
create trigger office_closures_refresh_site after insert or update or delete on public.office_closures
  for each row execute function private.website_changed();
create trigger site_documents_refresh_site after insert or update or delete on public.site_documents
  for each row execute function private.website_changed();

-- The worker claims jobs for the providers it has credentials for.
drop function public.claim_integration_events(integer);
create function public.claim_integration_events(p_limit integer default 10, p_providers text[] default array['asana', 'website'])
returns setof public.integration_events
language sql security definer set search_path = '' as $$
  update public.integration_events e
  set status = 'processing', locked_at = now(), attempts = e.attempts + 1, updated_at = now()
  where e.id in (
    select j.id from public.integration_events j
    where j.provider = any (p_providers)
      and ((j.status = 'pending' and j.next_attempt_at <= now())
        or (j.status = 'processing' and j.locked_at < now() - interval '10 minutes'))
      and not exists (
        select 1 from public.integration_events busy
        where busy.provider = j.provider and busy.entity_id = j.entity_id and busy.id <> j.id
          and busy.status = 'processing' and busy.locked_at >= now() - interval '10 minutes')
    order by j.next_attempt_at
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  )
  returning e.*;
$$;
revoke all on function public.claim_integration_events(integer, text[]) from public, anon, authenticated;
grant execute on function public.claim_integration_events(integer, text[]) to service_role;
