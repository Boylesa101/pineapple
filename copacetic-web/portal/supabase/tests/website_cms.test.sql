-- Phase 4: website content (posts, opening times, documents), public feeds and site refresh jobs.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(35);

create temp table _tap (n serial, line text);
grant all on _tap, _tap_n_seq to authenticated, anon, service_role;
create function pg_temp.login(p_uid uuid, p_aal text default 'aal1') returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
end $$;
create function pg_temp.anon() returns void
language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end $$;
create function pg_temp.affected(q text) returns integer
language plpgsql as $$
declare n integer;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon, service_role;

-- Firm A: site in build (website editing open). Firm B: still onboarding.
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'agency@example.com', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'owner.a@firm-a.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'editor.a@firm-a.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner.b@firm-b.test', 'authenticated', 'authenticated');
update public.profiles set is_agency_admin = true where user_id = '00000000-0000-0000-0000-00000000000a';
insert into public.organisations (id, name, slug) values
  ('10000000-0000-0000-0000-00000000000a', 'Firm A LLP', 'firm-a'),
  ('10000000-0000-0000-0000-00000000000b', 'Firm B LLP', 'firm-b');
insert into public.memberships (org_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'editor'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.sites (id, org_id, name, stage) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'firm-a.co.uk', 'in_build'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'firm-b.co.uk', 'onboarding');
insert into public.content_sections (id, org_id, type, title, fields, status) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'office', 'Leeds', '{"address": "1 Park Row, Leeds"}', 'approved'),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'faq', 'FAQ', '{}', 'approved');
-- Checked library files for firm A (as the upload pipeline would leave them).
insert into public.media (id, org_id, section_id, kind, storage_path, original_name, mime_type, size_bytes, status, alt_text) values
  ('40000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', null, 'image',
   '10000000-0000-0000-0000-00000000000a/40000000-0000-0000-0000-0000000000a1/cover.jpg', 'cover.jpg', 'image/jpeg', 1000, 'clean', 'Our office'),
  ('40000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', null, 'document',
   '10000000-0000-0000-0000-00000000000a/40000000-0000-0000-0000-0000000000a2/prices.pdf', 'prices.pdf', 'application/pdf', 1000, 'clean', null),
  ('40000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', null, 'image',
   '10000000-0000-0000-0000-00000000000a/40000000-0000-0000-0000-0000000000a3/draft.jpg', 'draft.jpg', 'image/jpeg', 1000, 'clean', null);

-- ------------------------------------------------------------------ posts --
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
insert into _tap (line) select lives_ok($$insert into public.posts (id, org_id, title, slug, summary, body, cover_media_id, created_by) values
  ('50000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'Buying your first home', 'buying-your-first-home',
   'What to expect', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}',
   '40000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2')$$, 'an editor can start a draft post');
insert into _tap (line) select lives_ok($$insert into public.posts (id, org_id, title, slug, created_by) values
  ('50000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'Draft only', 'draft-only', '00000000-0000-0000-0000-0000000000a2')$$,
  'and another');
insert into _tap (line) select throws_ok($$select public.publish_post('50000000-0000-0000-0000-0000000000a1')$$, '42501', null, 'editors cannot publish');
insert into _tap (line) select throws_ok($$update public.posts set status = 'published' where id = '50000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'nobody can set the status directly');
insert into _tap (line) select throws_ok($$update public.posts set cover_media_id = '40000000-0000-0000-0000-0000000000a2' where id = '50000000-0000-0000-0000-0000000000a1'$$,
  '22023', null, 'a cover must be an image');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select public.publish_post('50000000-0000-0000-0000-0000000000a1');
insert into _tap (line) select is((select status::text from public.posts where id = '50000000-0000-0000-0000-0000000000a1'), 'published', 'owners publish');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
insert into _tap (line) select is(pg_temp.affected($$update public.posts set title = 'Changed' where id = '50000000-0000-0000-0000-0000000000a1'$$), 0,
  'editors cannot change a published post');
insert into _tap (line) select is(pg_temp.affected($$update public.posts set title = 'Draft edited' where id = '50000000-0000-0000-0000-0000000000a2'$$), 1,
  'but can edit drafts');
insert into _tap (line) select throws_ok($$select public.unpublish_post('50000000-0000-0000-0000-0000000000a1')$$, '42501', null, 'or unpublish');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
insert into _tap (line) select is(pg_temp.affected($$update public.posts set summary = 'Updated summary' where id = '50000000-0000-0000-0000-0000000000a1'$$), 1,
  'owners can correct a published post');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
insert into _tap (line) select is((select count(*)::int from public.posts), 0, 'other firms cannot see the posts');
insert into _tap (line) select throws_ok($$insert into public.posts (org_id, title, slug, created_by) values
  ('10000000-0000-0000-0000-00000000000b', 'Too early', 'too-early', '00000000-0000-0000-0000-0000000000b1')$$,
  '42501', null, 'the blog opens once the site is in build');
insert into _tap (line) select throws_ok($$select public.publish_post('50000000-0000-0000-0000-0000000000a2')$$, '42501', null, 'other firms cannot publish our posts');
reset role;

-- A scheduled post stays out of the feed until its time.
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
insert into public.posts (id, org_id, title, slug, created_by) values
  ('50000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', 'Next week', 'next-week', '00000000-0000-0000-0000-0000000000a1');
select public.publish_post('50000000-0000-0000-0000-0000000000a3', now() + interval '7 days');
reset role;

-- ----------------------------------------------------------- public feed --
select pg_temp.anon();
insert into _tap (line) select is((select count(*)::int from public.public_site_posts('20000000-0000-0000-0000-00000000000a')), 1,
  'the public feed lists only live posts (no drafts, nothing scheduled)');
insert into _tap (line) select is((select body ->> 'type' from public.public_site_post('20000000-0000-0000-0000-00000000000a', 'buying-your-first-home')), 'doc',
  'a single post includes its body');
insert into _tap (line) select is((select count(*)::int from public.public_site_post('20000000-0000-0000-0000-00000000000a', 'draft-only')), 0,
  'drafts are not reachable by address');
insert into _tap (line) select is((select cover_alt from public.public_site_posts('20000000-0000-0000-0000-00000000000a')), 'Our office', 'covers carry their alt text');
insert into _tap (line) select throws_ok($$select * from public.posts$$, '42501', null, 'the public cannot read the posts table');
insert into _tap (line) select is((select count(*)::int from public.public_file('40000000-0000-0000-0000-0000000000a1')), 1, 'a live post’s cover is public');
insert into _tap (line) select is((select count(*)::int from public.public_file('40000000-0000-0000-0000-0000000000a3')), 0, 'other images are not');
reset role;

-- --------------------------------------------------------- opening times --
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
insert into _tap (line) select lives_ok($$insert into public.office_hours (office_id, org_id, weekly, note) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a',
   '{"mon":[{"open":"09:00","close":"12:30"},{"open":"13:30","close":"17:30"}],"sat":[]}', 'Saturdays by appointment')$$,
  'any member can set opening times');
insert into _tap (line) select throws_ok($$update public.office_hours set weekly = '{"mon":[{"open":"17:00","close":"09:00"}]}'
  where office_id = '30000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'closing before opening is refused');
insert into _tap (line) select throws_ok($$update public.office_hours set weekly = '{"funday":[]}' where office_id = '30000000-0000-0000-0000-0000000000a1'$$,
  '23514', null, 'unknown days are refused');
insert into _tap (line) select throws_ok($$insert into public.office_hours (office_id, org_id) values
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a')$$, '22023', null, 'hours only attach to offices');
insert into _tap (line) select lives_ok($$insert into public.office_closures (office_id, org_id, day, note) values
  ('30000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', (now() at time zone 'Europe/London')::date + 3, 'Staff training')$$,
  'and add a closure');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
insert into _tap (line) select is(pg_temp.affected($$update public.office_hours set note = 'x'$$), 0, 'other firms cannot change them');
reset role;

-- --------------------------------------------------------------- documents --
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
insert into _tap (line) select lives_ok($$insert into public.site_documents (id, org_id, media_id, title) values
  ('60000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a2', 'Price list')$$,
  'members can publish a document');
insert into _tap (line) select throws_ok($$insert into public.site_documents (org_id, media_id, title) values
  ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a3', 'Not a PDF')$$, '22023', null, 'documents must be document files');
insert into _tap (line) select lives_ok($$insert into public.media (org_id, section_id, kind, storage_path, original_name, mime_type, size_bytes, uploaded_by) values
  ('10000000-0000-0000-0000-00000000000a', null, 'image', '10000000-0000-0000-0000-00000000000a/new/new.png', 'new.png', 'image/png', 10,
   '00000000-0000-0000-0000-0000000000a2')$$, 'members can upload website images');
reset role;

select pg_temp.anon();
insert into _tap (line) select is((select count(*)::int from public.public_site_hours('20000000-0000-0000-0000-00000000000a')
  where jsonb_array_length(closures) = 1 and note = 'Saturdays by appointment'), 1, 'the public hours feed includes hours and closures');
insert into _tap (line) select is((select count(*)::int from public.public_site_documents('20000000-0000-0000-0000-00000000000a')), 1, 'and visible documents');
insert into _tap (line) select ok(private.media_path_is_public('10000000-0000-0000-0000-00000000000a/40000000-0000-0000-0000-0000000000a2/prices.pdf'),
  'whose file the public can download');
reset role;

-- ------------------------------------------------------------ site refresh --
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
insert into _tap (line) select throws_ok($$select public.set_site_website('20000000-0000-0000-0000-00000000000a', 'https://firm-a.co.uk', repeat('s', 40))$$,
  '42501', null, 'only the agency sets up the site refresh');
insert into _tap (line) select throws_ok($$select * from public.site_revalidate_target('20000000-0000-0000-0000-00000000000a')$$, '42501', null,
  'and nobody signed in can read its secret');
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000a', 'aal2');
select public.set_site_website('20000000-0000-0000-0000-00000000000a', 'https://firm-a.co.uk', repeat('s', 40));
update public.office_hours set note = 'Closed for lunch 12:30 to 13:30' where office_id = '30000000-0000-0000-0000-0000000000a1';
update public.site_documents set title = 'Our prices' where id = '60000000-0000-0000-0000-0000000000a1';
insert into _tap (line) select is((select count(*)::int from public.integration_events
  where provider = 'website' and entity_id = '20000000-0000-0000-0000-00000000000a' and status = 'pending'), 1,
  'changes queue one refresh of the client’s site');
reset role;

insert into _tap (line) select * from finish();
select line from _tap order by n;
rollback;
