-- Phase 3: Asana sync. A transactional outbox (integration_events) filled by triggers, drained by the
-- job worker (server-side, secret key), plus Asana webhook secrets for two-way task completion.

alter table public.sites
  add column asana_project_gid text check (asana_project_gid ~ '^[0-9]{1,30}$'),
  add column asana_sections jsonb not null default '{}';   -- { "Briefing": "<gid>", "Content": "<gid>", ... }
alter table public.briefings add column asana_task_gid text check (asana_task_gid ~ '^[0-9]{1,30}$');
alter table public.content_sections
  add constraint content_sections_asana_task_gid_check check (asana_task_gid ~ '^[0-9]{1,30}$');

create type public.integration_status as enum ('pending', 'processing', 'done', 'failed');

create table public.integration_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('asana')),
  action text not null check (action in (
    'ensure_project', 'upsert_briefing_task', 'upsert_section_task', 'section_reopened', 'briefing_reopened')),
  org_id uuid references public.organisations (id) on delete cascade,
  entity_id text not null,
  payload jsonb not null default '{}',
  status public.integration_status not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz
);
-- Repeated submissions of the same thing merge into one waiting job.
create unique index integration_events_one_pending
  on public.integration_events (provider, action, entity_id) where status = 'pending';
create index integration_events_due on public.integration_events (next_attempt_at) where status = 'pending';
create index integration_events_org on public.integration_events (org_id, created_at desc);

-- Asana webhook secrets (one per client project). Server-only: no API role can read this schema.
create table private.asana_webhooks (
  project_gid text primary key check (project_gid ~ '^[0-9]{1,30}$'),
  webhook_gid text,
  secret text,
  -- The worker opens a short handshake window just before asking Asana to create the webhook;
  -- the handshake endpoint only accepts a secret while the window is open, and only once.
  handshake_expires_at timestamptz,
  created_at timestamptz not null default now()
);
revoke all on private.asana_webhooks from public, anon, authenticated;

-- ---------------------------------------------------------------- enqueue ---
create function private.enqueue(p_action text, p_org uuid, p_entity text, p_payload jsonb default '{}')
returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.integration_events (provider, action, org_id, entity_id, payload)
  values ('asana', p_action, p_org, p_entity, coalesce(p_payload, '{}'))
  on conflict (provider, action, entity_id) where status = 'pending'
  do update set payload = excluded.payload, next_attempt_at = now(), updated_at = now();
end;
$$;
revoke all on function private.enqueue(text, uuid, text, jsonb) from public, anon, authenticated;

create function private.sites_enqueue() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue('ensure_project', new.org_id, new.id::text);
  return new;
end;
$$;
create trigger sites_enqueue_asana after insert on public.sites
  for each row execute function private.sites_enqueue();

create function private.sections_enqueue() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'submitted' and old.status = 'draft' then
    perform private.enqueue('upsert_section_task', new.org_id, new.id::text);
  elsif new.status = 'draft' and old.status in ('submitted', 'approved') then
    perform private.enqueue('section_reopened', new.org_id, new.id::text);
  end if;
  return new;
end;
$$;
create trigger content_sections_enqueue_asana after update of status on public.content_sections
  for each row execute function private.sections_enqueue();

create function private.briefings_enqueue() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'submitted' and old.status = 'draft' then
    perform private.enqueue('upsert_briefing_task', new.org_id, new.org_id::text);
  elsif new.status = 'draft' and old.status = 'submitted' then
    perform private.enqueue('briefing_reopened', new.org_id, new.org_id::text);
  end if;
  return new;
end;
$$;
create trigger briefings_enqueue_asana after update of status on public.briefings
  for each row execute function private.briefings_enqueue();

-- ------------------------------------------------------------ worker RPCs ---
-- Claim due jobs (the worker calls this with the secret key; no signed-in role may).
create function public.claim_integration_events(p_limit integer default 10)
returns setof public.integration_events
language sql security definer set search_path = '' as $$
  update public.integration_events e
  set status = 'processing', locked_at = now(), attempts = e.attempts + 1, updated_at = now()
  where e.id in (
    select id from public.integration_events
    where (status = 'pending' and next_attempt_at <= now())
       or (status = 'processing' and locked_at < now() - interval '10 minutes')   -- crashed worker
    order by next_attempt_at
    limit greatest(1, least(p_limit, 50))
    for update skip locked
  )
  returning e.*;
$$;
revoke all on function public.claim_integration_events(integer) from public, anon, authenticated;
grant execute on function public.claim_integration_events(integer) to service_role;

-- Asana webhook secret handling (secret key only).
create function public.open_asana_handshake(p_project text) returns void
language sql security definer set search_path = '' as $$
  insert into private.asana_webhooks (project_gid, handshake_expires_at)
  values (p_project, now() + interval '2 minutes')
  on conflict (project_gid) do update set handshake_expires_at = now() + interval '2 minutes';
$$;
create function public.accept_asana_handshake(p_project text, p_secret text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update private.asana_webhooks set secret = p_secret, handshake_expires_at = null
  where project_gid = p_project and handshake_expires_at > now();
  return found;
end;
$$;
create function public.set_asana_webhook_gid(p_project text, p_webhook text) returns void
language sql security definer set search_path = '' as $$
  update private.asana_webhooks set webhook_gid = p_webhook where project_gid = p_project;
$$;
create function public.asana_webhook_secret(p_project text) returns text
language sql stable security definer set search_path = '' as $$
  select secret from private.asana_webhooks where project_gid = p_project;
$$;
revoke all on function public.open_asana_handshake(text), public.accept_asana_handshake(text, text),
  public.set_asana_webhook_gid(text, text), public.asana_webhook_secret(text) from public, anon, authenticated;
grant execute on function public.open_asana_handshake(text), public.accept_asana_handshake(text, text),
  public.set_asana_webhook_gid(text, text), public.asana_webhook_secret(text) to service_role;

-- ------------------------------------------------------------- admin RPCs ---
create function public.retry_integration_event(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_agency_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.integration_events
  set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null, updated_at = now()
  where id = p_id and status = 'failed';
end;
$$;

-- Queue project creation for a site (e.g. if the first attempt failed permanently).
create function public.request_asana_project(p_site uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if not private.is_agency_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select org_id into v_org from public.sites where id = p_site;
  if v_org is null then raise exception 'site not found' using errcode = 'P0002'; end if;
  perform private.enqueue('ensure_project', v_org, p_site::text);
end;
$$;

-- Link an existing Asana project instead of creating one; the worker then adds sections and the webhook.
create function public.link_asana_project(p_site uuid, p_project text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if not private.is_agency_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_project !~ '^[0-9]{1,30}$' then raise exception 'invalid project' using errcode = '22023'; end if;
  update public.sites set asana_project_gid = p_project, asana_sections = '{}' where id = p_site
  returning org_id into v_org;
  if v_org is null then raise exception 'site not found' using errcode = 'P0002'; end if;
  perform private.enqueue('ensure_project', v_org, p_site::text);
end;
$$;

revoke all on function public.retry_integration_event(bigint), public.request_asana_project(uuid),
  public.link_asana_project(uuid, text) from public, anon, authenticated;
grant execute on function public.retry_integration_event(bigint), public.request_asana_project(uuid),
  public.link_asana_project(uuid, text) to authenticated;

-- -------------------------------------------------------------------- RLS ---
alter table public.integration_events enable row level security;
grant select on public.integration_events to authenticated;
create policy "agency reads integration events" on public.integration_events
  for select to authenticated using (private.is_agency_admin());
-- No write grants to API roles: only triggers, security-definer RPCs and the worker change jobs.

-- ------------------------------------------------------------- scheduling ---
-- Every minute, ask the portal to run due jobs. Needs pg_cron + pg_net and two Vault secrets:
--   jobs_url    (e.g. https://portal.example.co.uk/api/jobs/run)
--   jobs_secret (same value as the app's JOBS_SECRET)
-- Until both exist, the scheduled call does nothing.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create function private.kick_jobs() returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'jobs_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'jobs_secret';
  if v_url is null or v_secret is null then return; end if;
  if not exists (select 1 from public.integration_events where status = 'pending' and next_attempt_at <= now())
     and not exists (select 1 from public.integration_events where status = 'processing' and locked_at < now() - interval '10 minutes') then
    return;  -- nothing due: don't wake the app
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000);
end;
$$;
revoke all on function private.kick_jobs() from public, anon, authenticated;

select cron.schedule('portal-integration-jobs', '* * * * *', $$select private.kick_jobs()$$);

-- Existing sites (created before this phase) get their project queued too.
insert into public.integration_events (provider, action, org_id, entity_id)
select 'asana', 'ensure_project', org_id, id::text from public.sites
on conflict do nothing;
