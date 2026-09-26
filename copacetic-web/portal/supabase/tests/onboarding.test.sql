-- Phase 2 onboarding: briefing, content sections, files and the submit / reopen workflow.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(35);

create temp table _tap (n serial, line text);
grant all on _tap, _tap_n_seq to authenticated, anon;
create function pg_temp.login(p_uid uuid, p_aal text default 'aal1') returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
end $$;
create function pg_temp.affected(p_sql text) returns int
language plpgsql as $$
declare v int;
begin
  execute p_sql;
  get diagnostics v = row_count;
  return v;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- ------------------------------------------------------------- fixtures ---
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'agency@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'owner.a@firm-a.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'editor.a@firm-a.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner.b@firm-b.test', 'authenticated', 'authenticated');
update public.profiles set is_agency_admin = true where user_id = '00000000-0000-0000-0000-00000000000a';
insert into public.organisations (id, name, slug) values
  ('10000000-0000-0000-0000-00000000000a', 'Firm A LLP', 'firm-a'),
  ('10000000-0000-0000-0000-00000000000b', 'Firm B Solicitors', 'firm-b');
insert into public.memberships (org_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'editor'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.sites (id, org_id, name, stage) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'firm-a.co.uk', 'onboarding'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'firm-b.co.uk', 'onboarding');
insert into public.content_sections (id, org_id, type, title) values
  ('30000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'about', 'About Firm B');

insert into _tap (line) select is((select count(*)::int from public.briefings), 2, 'every organisation gets a briefing automatically');

-- ------------------------------------------------ editor of firm A ---
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
insert into _tap (line) select is((select count(*)::int from public.briefings), 1, 'members see only their own briefing');
insert into _tap (line) select is(pg_temp.affected($q$update public.briefings set data = '{"firm":{"legalName":"Firm A LLP"}}'$q$), 1, 'members can edit a draft briefing during onboarding');
insert into _tap (line) select throws_ok($$update public.briefings set status = 'submitted'$$, '42501', null, 'members cannot set the briefing status directly');
insert into _tap (line) select lives_ok($$insert into public.content_sections (id, org_id, type, title) values ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'brand', 'Brand')$$, 'members can add sections during onboarding');
insert into _tap (line) select lives_ok($$insert into public.content_sections (id, org_id, type, title, fields) values ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'faq', 'FAQ', '{"question":"Q","answer":"A"}')$$, 'members can add repeatable sections');
insert into _tap (line) select throws_ok($$insert into public.content_sections (org_id, type, title) values ('10000000-0000-0000-0000-00000000000a', 'brand', 'Brand again')$$, '23505', null, 'brand is one per firm');
insert into _tap (line) select throws_ok($$insert into public.content_sections (org_id, type, title) values ('10000000-0000-0000-0000-00000000000b', 'faq', 'Sneaky')$$, '42501', null, 'members cannot add sections to another firm');
insert into _tap (line) select is((select count(*)::int from public.content_sections), 2, 'members only see their own firm''s content');
insert into _tap (line) select is(pg_temp.affected($q$update public.content_sections set title = 'Hacked' where org_id = '10000000-0000-0000-0000-00000000000b'$q$), 0, 'members cannot edit another firm''s content');
insert into _tap (line) select throws_ok($$update public.content_sections set status = 'approved'$$, '42501', null, 'members cannot set section status directly');
insert into _tap (line) select lives_ok($$insert into public.media (org_id, section_id, kind, storage_path, original_name, mime_type, size_bytes, uploaded_by) values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', 'logo', '10000000-0000-0000-0000-00000000000a/40000000-0000-0000-0000-0000000000a1/logo.svg', 'logo.svg', 'image/svg+xml', 1200, auth.uid())$$, 'members can register an upload in a draft section');
insert into _tap (line) select throws_ok($$insert into public.media (org_id, section_id, kind, storage_path, original_name, mime_type, size_bytes, uploaded_by) values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', 'logo', '10000000-0000-0000-0000-00000000000b/x/logo.svg', 'logo.svg', 'image/svg+xml', 1200, auth.uid())$$, '23514', null, 'files must live in the firm''s own storage folder');
insert into _tap (line) select throws_ok($$insert into public.media (org_id, section_id, kind, storage_path, original_name, mime_type, size_bytes, uploaded_by) values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a1', 'font', '10000000-0000-0000-0000-00000000000a/y/f.woff2', 'f.woff2', 'font/woff2', 1200, auth.uid())$$, '23514', null, 'font files need the licence confirmation');
insert into _tap (line) select throws_ok($$update public.media set status = 'clean'$$, '42501', null, 'members cannot mark their own files as checked');
insert into _tap (line) select throws_ok($$select public.finalize_media('00000000-0000-0000-0000-000000000000', true, null, 1, 'forged')$$, 'P0001', 'media signing secret is not configured', 'file approval fails closed without the signing secret');
insert into _tap (line) select lives_ok($$select public.submit_section('30000000-0000-0000-0000-0000000000a2')$$, 'editors can submit a section');
insert into _tap (line) select is(pg_temp.affected($q$update public.content_sections set title = 'Changed' where id = '30000000-0000-0000-0000-0000000000a2'$q$), 0, 'submitted sections are read-only');
insert into _tap (line) select throws_ok($$select public.submit_all('10000000-0000-0000-0000-00000000000a')$$, '42501', null, 'editors cannot submit everything');
insert into _tap (line) select throws_ok($$select public.reopen_section('30000000-0000-0000-0000-0000000000a2')$$, '42501', null, 'clients cannot reopen sections');
reset role;

-- ------------------------------------------------ owner of firm B ---
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
insert into _tap (line) select is((select count(*)::int from public.media), 0, 'firm B cannot see firm A''s files');
insert into _tap (line) select throws_ok($$select public.submit_section('30000000-0000-0000-0000-0000000000a1')$$, '42501', null, 'firm B cannot submit firm A''s sections');
insert into _tap (line) select is(pg_temp.affected($q$delete from public.content_sections where id = '30000000-0000-0000-0000-0000000000b1'$q$), 0, 'About us cannot be deleted');
reset role;

-- ------------------------------------------------ owner of firm A submits everything ---
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
insert into _tap (line) select lives_ok($$select public.submit_all('10000000-0000-0000-0000-00000000000a')$$, 'owners can submit everything');
insert into _tap (line) select results_eq('select stage::text from public.sites', $$values ('content_submitted')$$, 'submitting everything moves the site to content submitted');
insert into _tap (line) select results_eq('select status::text from public.briefings', $$values ('submitted')$$, 'the briefing is submitted too');
insert into _tap (line) select is((select count(*)::int from public.content_sections where status <> 'submitted'), 0, 'every section is submitted');
insert into _tap (line) select is(pg_temp.affected($q$update public.briefings set data = '{}'$q$), 0, 'the submitted briefing is read-only');
insert into _tap (line) select throws_ok($$insert into public.content_sections (org_id, type, title) values ('10000000-0000-0000-0000-00000000000a', 'faq', 'Late')$$, '42501', null, 'no new sections after submission');
reset role;

-- ------------------------------------------------ agency reopens one section ---
select pg_temp.login('00000000-0000-0000-0000-00000000000a', 'aal2');
insert into _tap (line) select lives_ok($$select public.reopen_section('30000000-0000-0000-0000-0000000000a2')$$, 'the agency can reopen a section');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
insert into _tap (line) select is(pg_temp.affected($q$update public.content_sections set title = 'Fixed' where id = '30000000-0000-0000-0000-0000000000a2'$q$), 1, 'clients can edit a reopened section after submission');
insert into _tap (line) select lives_ok($$select public.submit_section('30000000-0000-0000-0000-0000000000a2')$$, 'and resubmit it');
reset role;

-- ------------------------------------------------ signed file approval ---
select vault.create_secret('test-signing-secret', 'media_signing_secret');
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
insert into _tap (line) select throws_ok($$select public.finalize_media((select id from public.media limit 1), true, repeat('a', 64), 1200, 'forged')$$, '42501', null, 'a forged approval signature is rejected');
insert into _tap (line) select lives_ok(format($$select public.finalize_media(%L, true, %L, 1200, %L)$$,
  (select id from public.media limit 1), repeat('a', 64),
  encode(hmac(concat_ws('|', (select id from public.media limit 1)::text, 'clean', repeat('a', 64), '1200'), 'test-signing-secret', 'sha256'), 'hex')),
  'a correctly signed approval is accepted');
insert into _tap (line) select results_eq('select status::text from public.media', $$values ('clean')$$, 'and marks the file clean');
reset role;

select line from _tap order by n;
select * from finish();
rollback;
