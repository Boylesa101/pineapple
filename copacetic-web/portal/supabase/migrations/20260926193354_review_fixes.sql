-- Fixes from the bug review.

-- 1. Reopening only makes sense while the client can still edit (onboarding / content submitted);
--    later it would leave a draft nobody can change.
create or replace function public.reopen_section(p_section uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if not private.is_agency_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select org_id into v_org from public.content_sections where id = p_section;
  if v_org is null then return; end if;
  if not private.org_editable(v_org) then
    raise exception 'the client can no longer edit content at this stage' using errcode = '22023';
  end if;
  update public.content_sections set status = 'draft', submitted_at = null, submitted_by = null
  where id = p_section;
end;
$$;

create or replace function public.reopen_briefing(p_org uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_agency_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not private.org_editable(p_org) then
    raise exception 'the client can no longer edit content at this stage' using errcode = '22023';
  end if;
  update public.briefings set status = 'draft', submitted_at = null, submitted_by = null where org_id = p_org;
end;
$$;

-- 2. A new request merged into a waiting job gets the full set of retries again.
create or replace function private.enqueue(p_action text, p_org uuid, p_entity text, p_payload jsonb default '{}')
returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.integration_events (provider, action, org_id, entity_id, payload)
  values ('asana', p_action, p_org, p_entity, coalesce(p_payload, '{}'))
  on conflict (provider, action, entity_id) where status = 'pending'
  do update set payload = excluded.payload, next_attempt_at = now(), attempts = 0, updated_at = now();
end;
$$;

create or replace function private.queue_site_refresh(p_org uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.integration_events (provider, action, org_id, entity_id)
  select 'website', 'revalidate_site', s.org_id, s.id::text
  from public.sites s join private.site_hooks h on h.site_id = s.id
  where s.org_id = p_org and s.website_url is not null
  on conflict (provider, action, entity_id) where status = 'pending'
  do update set next_attempt_at = now(), attempts = 0, updated_at = now();
$$;

-- 3. Scheduled posts: when one goes live, refresh the client's site. Runs every minute and looks back
--    a little further than that so a late run doesn't miss anything (repeat refreshes merge).
create function private.queue_scheduled_posts() returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  for v_org in
    select distinct p.org_id from public.posts p
    where p.status = 'published' and p.published_at > now() - interval '3 minutes' and p.published_at <= now()
      and p.published_at > p.updated_at   -- scheduled ahead of time, not just published
  loop
    perform private.queue_site_refresh(v_org);
  end loop;
end;
$$;
revoke all on function private.queue_scheduled_posts() from public, anon, authenticated;
select cron.schedule('portal-scheduled-posts', '* * * * *', $$select private.queue_scheduled_posts()$$);
