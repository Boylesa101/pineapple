-- Phase 3 follow-ups.

-- 1. Recording an Asana task id is bookkeeping, not an edit: don't bump the version (which would make
--    an open editor think someone else changed the content) or the "updated by" stamp.
create or replace function private.touch_content() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - 'asana_task_gid') = (to_jsonb(old) - 'asana_task_gid') then return new; end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if new is distinct from old then new.version := old.version + 1; end if;
  return new;
end;
$$;

-- 2. The worker needs to know whether a project's webhook was registered.
create function public.asana_webhook_gid(p_project text) returns text
language sql stable security definer set search_path = '' as $$
  select webhook_gid from private.asana_webhooks where project_gid = p_project;
$$;
revoke all on function public.asana_webhook_gid(text) from public, anon, authenticated;
grant execute on function public.asana_webhook_gid(text) to service_role;

-- 3. Retrying a failed job when a newer one for the same thing is already waiting: the newer one
--    covers it, so close the old one instead of tripping the one-waiting-job rule.
create or replace function public.retry_integration_event(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.integration_events;
begin
  if not private.is_agency_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into v from public.integration_events where id = p_id and status = 'failed' for update;
  if not found then return; end if;
  if exists (select 1 from public.integration_events
             where provider = v.provider and action = v.action and entity_id = v.entity_id and status = 'pending') then
    update public.integration_events
    set status = 'done', done_at = now(), last_error = 'Superseded by a newer job', updated_at = now()
    where id = p_id;
  else
    update public.integration_events
    set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null, updated_at = now()
    where id = p_id;
  end if;
end;
$$;
revoke all on function public.retry_integration_event(bigint) from public, anon, authenticated;
grant execute on function public.retry_integration_event(bigint) to authenticated;
