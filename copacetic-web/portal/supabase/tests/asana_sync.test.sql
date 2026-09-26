-- Phase 3: the Asana outbox (integration_events) and its permissions.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(22);

create temp table _tap (n serial, line text);
grant all on _tap, _tap_n_seq to authenticated, anon, service_role;
create function pg_temp.login(p_uid uuid, p_aal text default 'aal1') returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon, service_role;

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'agency@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'owner.a@firm-a.test', 'authenticated', 'authenticated');
update public.profiles set is_agency_admin = true where user_id = '00000000-0000-0000-0000-00000000000a';
insert into public.organisations (id, name, slug) values ('10000000-0000-0000-0000-00000000000a', 'Firm A LLP', 'firm-a');
insert into public.memberships (org_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner');
insert into public.sites (id, org_id, name, stage) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'firm-a.co.uk', 'onboarding');

insert into _tap (line) select is((select count(*)::int from public.integration_events where action = 'ensure_project' and entity_id = '20000000-0000-0000-0000-00000000000a'), 1, 'adding a client queues its Asana project');

insert into public.content_sections (id, org_id, type, title, fields) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'faq', 'FAQ', '{"question":"Q","answer":"A"}'),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'faq', 'FAQ 2', '{"question":"Q","answer":"A"}');
insert into _tap (line) select is((select count(*)::int from public.integration_events where action = 'upsert_section_task'), 0, 'drafts are not sent to Asana');

select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.submit_section('30000000-0000-0000-0000-0000000000a1');
insert into _tap (line) select is((select count(*)::int from public.integration_events), 0, 'clients cannot see integration jobs');
insert into _tap (line) select throws_ok($$insert into public.integration_events (provider, action, entity_id) values ('asana', 'ensure_project', 'x')$$, '42501', null, 'clients cannot create jobs');
insert into _tap (line) select throws_ok($$select public.retry_integration_event(1)$$, '42501', null, 'clients cannot retry jobs');
insert into _tap (line) select throws_ok($$select public.link_asana_project('20000000-0000-0000-0000-00000000000a', '123')$$, '42501', null, 'clients cannot link Asana projects');
insert into _tap (line) select throws_ok($$select * from public.claim_integration_events(5)$$, '42501', null, 'clients cannot claim jobs');
insert into _tap (line) select throws_ok($$select public.asana_webhook_secret('123')$$, '42501', null, 'clients cannot read webhook secrets');
reset role;

insert into _tap (line) select is((select count(*)::int from public.integration_events where action = 'upsert_section_task' and entity_id = '30000000-0000-0000-0000-0000000000a1'), 1, 'submitting a section queues its Asana task');

select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.submit_all('10000000-0000-0000-0000-00000000000a');
reset role;
insert into _tap (line) select is((select count(*)::int from public.integration_events where action = 'upsert_section_task'), 2, 'submit everything queues one task per section (no duplicates)');
insert into _tap (line) select is((select count(*)::int from public.integration_events where action = 'upsert_briefing_task'), 1, 'and one for the briefing');

select pg_temp.login('00000000-0000-0000-0000-00000000000a', 'aal2');
select public.reopen_section('30000000-0000-0000-0000-0000000000a1');
insert into _tap (line) select is((select count(*)::int from public.integration_events where action = 'section_reopened'), 1, 'reopening a section queues a comment on its task');
insert into _tap (line) select ok((select count(*) from public.integration_events) > 0, 'the agency can see integration jobs');
reset role;

-- Resubmitting while the first job still waits merges into it.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.submit_section('30000000-0000-0000-0000-0000000000a1');
reset role;
insert into _tap (line) select is((select count(*)::int from public.integration_events where action = 'upsert_section_task' and entity_id = '30000000-0000-0000-0000-0000000000a1' and status = 'pending'), 1, 'repeated submissions merge into one waiting job');

-- An Asana "complete" moving a section to approved must not echo back to Asana.
update public.content_sections set status = 'approved' where id = '30000000-0000-0000-0000-0000000000a2';
update public.content_sections set status = 'submitted' where id = '30000000-0000-0000-0000-0000000000a2';
insert into _tap (line) select is((select count(*)::int from public.integration_events where entity_id = '30000000-0000-0000-0000-0000000000a2'), 1, 'approval changes from Asana do not create new jobs');

-- The worker (secret key) claims due jobs once each.
create temp table _due as select count(*)::int as n from public.integration_events where status = 'pending';
grant select on _due to service_role;
set local role service_role;
insert into _tap (line) select is((select count(*)::int from public.claim_integration_events(50)), (select n from _due), 'the worker claims every due job');
insert into _tap (line) select is((select count(*)::int from public.claim_integration_events(50)), 0, 'a claimed job is not handed out twice');
reset role;

-- A resubmission while its first job is still being worked on waits for that job to finish.
select pg_temp.login('00000000-0000-0000-0000-00000000000a', 'aal2');
select public.reopen_section('30000000-0000-0000-0000-0000000000a1');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.submit_section('30000000-0000-0000-0000-0000000000a1');
reset role;
set local role service_role;
insert into _tap (line) select is((select count(*)::int from public.claim_integration_events(50) where entity_id = '30000000-0000-0000-0000-0000000000a1'), 0, 'jobs for something already being worked on wait their turn');
reset role;

-- Recording the Asana task id is bookkeeping: an open editor must not see it as someone else's edit.
create temp table _v as select version from public.content_sections where id = '30000000-0000-0000-0000-0000000000a2';
update public.content_sections set asana_task_gid = '1234567890' where id = '30000000-0000-0000-0000-0000000000a2';
insert into _tap (line) select is((select version from public.content_sections where id = '30000000-0000-0000-0000-0000000000a2'), (select version from _v), 'saving the Asana task id does not bump the version');

-- Retrying failed jobs.
insert into public.integration_events (id, provider, action, entity_id, status) overriding system value values
  (900001, 'asana', 'ensure_project', 'retry-alone', 'failed'),
  (900002, 'asana', 'ensure_project', 'retry-dup', 'failed'),
  (900003, 'asana', 'ensure_project', 'retry-dup', 'pending');
select pg_temp.login('00000000-0000-0000-0000-00000000000a', 'aal2');
select public.retry_integration_event(900001);
select public.retry_integration_event(900002);
reset role;
insert into _tap (line) select is((select status::text from public.integration_events where id = 900001), 'pending', 'the agency can retry a failed job');
insert into _tap (line) select is((select status::text from public.integration_events where id = 900002), 'done', 'retrying a job that a newer one already covers just closes it');
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
insert into _tap (line) select throws_ok($$select public.asana_webhook_gid('123')$$, '42501', null, 'clients cannot look up webhooks');
reset role;

insert into _tap (line) select * from finish();
select line from _tap order by n;
rollback;
