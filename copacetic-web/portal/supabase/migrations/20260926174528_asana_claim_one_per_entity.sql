-- Don't hand out a job while another worker is still working on the same thing (e.g. a resubmission
-- arriving while the first task is being created), so two workers can't create duplicate tasks.
create or replace function public.claim_integration_events(p_limit integer default 10)
returns setof public.integration_events
language sql security definer set search_path = '' as $$
  update public.integration_events e
  set status = 'processing', locked_at = now(), attempts = e.attempts + 1, updated_at = now()
  where e.id in (
    select j.id from public.integration_events j
    where ((j.status = 'pending' and j.next_attempt_at <= now())
        or (j.status = 'processing' and j.locked_at < now() - interval '10 minutes'))   -- crashed worker
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
revoke all on function public.claim_integration_events(integer) from public, anon, authenticated;
grant execute on function public.claim_integration_events(integer) to service_role;
