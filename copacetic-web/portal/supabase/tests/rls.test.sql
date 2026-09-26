-- RLS and permission tests for Phase 1. Run with `supabase test db` (pgTAP).
-- Every test signs in as a fixture user by setting the same role and JWT claims PostgREST would.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(53);

-- Results are collected here so each assertion can run as whichever role it needs.
create temp table _tap (n serial, line text);
grant all on _tap, _tap_n_seq to authenticated, anon;

create function pg_temp.login(p_uid uuid, p_email text, p_aal text default 'aal1') returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal, 'email', p_email)::text, true);
end $$;
create function pg_temp.anon() returns void
language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
-- Rows changed by a statement, run as the current role (RLS silently filters UPDATE/DELETE).
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
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'agency@example.com', 'authenticated', 'authenticated', '{"full_name":"Agency"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'owner.a@firm-a.test', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-0000-0000-0000000000a2', 'editor.a@firm-a.test', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner.b@firm-b.test', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-0000-0000-0000000000c1', 'new.person@firm-a.test', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-0000-0000-0000000000c2', 'someone.else@example.com', 'authenticated', 'authenticated', '{}');
update public.profiles set is_agency_admin = true where user_id = '00000000-0000-0000-0000-00000000000a';

insert into public.organisations (id, name, slug) values
  ('10000000-0000-0000-0000-00000000000a', 'Firm A LLP', 'firm-a'),
  ('10000000-0000-0000-0000-00000000000b', 'Firm B Solicitors', 'firm-b');
insert into public.memberships (org_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'editor'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.sites (id, org_id, name, stage) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'firm-a.co.uk', 'in_review'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'firm-b.co.uk', 'invited');
insert into public.builds (site_id, org_id, url, version_label, shared_with_client) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'https://a-v1.example.app', 'v1', true),
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'https://a-v2.example.app', 'v2 draft', false),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'https://b-v1.example.app', 'v1', true);

-- ------------------------------------------------ anonymous visitors ---
select pg_temp.anon();
insert into _tap (line) select throws_ok('select * from public.organisations', '42501', null, 'anon cannot read organisations');
insert into _tap (line) select throws_ok('select * from public.builds', '42501', null, 'anon cannot read builds');
insert into _tap (line) select throws_ok($$select public.accept_invitation('x')$$, '42501', null, 'anon cannot accept invitations');
reset role;

-- --------------------------------------------- owner of firm A (org A) ---
select pg_temp.login('00000000-0000-0000-0000-0000000000a1', 'owner.a@firm-a.test');
insert into _tap (line) select results_eq('select name from public.organisations', $$values ('Firm A LLP')$$, 'owner A sees only firm A');
insert into _tap (line) select is((select count(*)::int from public.sites), 1, 'owner A sees only firm A''s site');
insert into _tap (line) select is((select count(*)::int from public.memberships), 2, 'owner A sees only firm A''s members');
insert into _tap (line) select is((select count(*)::int from public.profiles where email like '%firm-b%'), 0, 'owner A cannot see firm B people');
insert into _tap (line) select results_eq('select version_label from public.builds', $$values ('v1')$$, 'owner A sees only builds shared with firm A');
insert into _tap (line) select is((select count(*)::int from public.audit_log), 0, 'clients cannot read the audit log');
insert into _tap (line) select throws_ok($$insert into public.organisations (name, slug) values ('X', 'x')$$, '42501', null, 'clients cannot create organisations');
insert into _tap (line) select throws_ok($$update public.sites set stage = 'live'$$, '42501', null, 'clients cannot set a site''s stage directly');
insert into _tap (line) select throws_ok($$select public.transition_stage('20000000-0000-0000-0000-00000000000a', 'live')$$, '42501', null, 'clients cannot call transition_stage');
insert into _tap (line) select throws_ok($$insert into public.builds (site_id, org_id, url, version_label, created_by) values ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'https://x.example', 'x', '00000000-0000-0000-0000-0000000000a1')$$, '42501', null, 'clients cannot add builds');
insert into _tap (line) select is(pg_temp.affected($q$update public.builds set shared_with_client = true$q$), 0, 'clients cannot share builds');
insert into _tap (line) select throws_ok($$update public.profiles set is_agency_admin = true where user_id = auth.uid()$$, '42501', null, 'nobody can make themselves agency admin');
insert into _tap (line) select is(pg_temp.affected($q$update public.organisations set name = 'Hacked' where slug = 'firm-b'$q$), 0, 'owner A cannot rename firm B');
insert into _tap (line) select is(pg_temp.affected($q$update public.organisations set name = 'Firm A LLP (renamed)' where slug = 'firm-a'$q$), 1, 'owner A can rename firm A');
insert into _tap (line) select throws_ok($$update public.organisations set slug = 'z' where slug = 'firm-a'$$, '42501', null, 'owners cannot change the slug');
insert into _tap (line) select throws_ok($$select public.create_invitation('10000000-0000-0000-0000-00000000000b', 'x@y.com', 'owner')$$, '42501', null, 'owner A cannot invite into firm B');
insert into _tap (line) select isnt((select token from public.create_invitation('10000000-0000-0000-0000-00000000000a', 'New.Person@Firm-A.test', 'approver')), null, 'owner A can invite into firm A');
insert into _tap (line) select is((select email from public.invitations order by created_at desc limit 1), 'new.person@firm-a.test', 'invitation emails are stored lower-case');
insert into _tap (line) select throws_ok('select token_hash from public.invitations', '42501', null, 'token hashes are never readable');
insert into _tap (line) select throws_ok($$insert into public.memberships (org_id, user_id, role) values ('10000000-0000-0000-0000-00000000000b', auth.uid(), 'owner')$$, '42501', null, 'nobody can add themselves to another firm');
insert into _tap (line) select throws_ok($$delete from public.memberships where user_id = auth.uid()$$, 'P0001', 'An organisation must keep at least one owner', 'the last owner cannot leave');
insert into _tap (line) select is(pg_temp.affected($q$update public.memberships set role = 'approver' where user_id = '00000000-0000-0000-0000-0000000000a2'$q$), 1, 'owners can change roles in their firm');
insert into _tap (line) select is(pg_temp.affected($q$update public.invitations set revoked_at = now() where email = 'new.person@firm-a.test'$q$), 1, 'owners can withdraw an invitation');
insert into _tap (line) select throws_ok($q$update public.invitations set revoked_at = null where email = 'new.person@firm-a.test'$q$, '42501', null, 'but cannot bring a withdrawn one back');
reset role;

-- ------------------------------------------- editor of firm A (org A) ---
update public.memberships set role = 'editor' where user_id = '00000000-0000-0000-0000-0000000000a2';  -- undo the owner's change above
select pg_temp.login('00000000-0000-0000-0000-0000000000a2', 'editor.a@firm-a.test');
insert into _tap (line) select throws_ok($$select public.create_invitation('10000000-0000-0000-0000-00000000000a', 'x@y.com', 'owner')$$, '42501', null, 'editors cannot invite');
insert into _tap (line) select is(pg_temp.affected($q$update public.memberships set role = 'owner' where user_id = auth.uid()$q$), 0, 'editors cannot promote themselves');
insert into _tap (line) select is((select count(*)::int from public.invitations), 0, 'editors cannot see invitations');
reset role;

-- ------------------------------------------ owner of firm B (org B) ---
select pg_temp.login('00000000-0000-0000-0000-0000000000b1', 'owner.b@firm-b.test');
insert into _tap (line) select results_eq('select name from public.organisations', $$values ('Firm B Solicitors')$$, 'owner B sees only firm B');
insert into _tap (line) select is((select count(*)::int from public.builds where org_id = '10000000-0000-0000-0000-00000000000a'), 0, 'owner B cannot see firm A builds');
insert into _tap (line) select is((select count(*)::int from public.invitations where org_id = '10000000-0000-0000-0000-00000000000a'), 0, 'owner B cannot see firm A invitations');
insert into _tap (line) select is(pg_temp.affected($q$delete from public.memberships where org_id = '10000000-0000-0000-0000-00000000000a'$q$), 0, 'owner B cannot remove firm A members');
reset role;

-- ---------------------------------------------------- invitation flow ---
-- Mint a known token as the agency (bypassing the RPC so the test knows the raw token).
insert into public.invitations (org_id, email, role, token_hash) values
  ('10000000-0000-0000-0000-00000000000b', 'new.person@firm-a.test', 'editor', encode(digest('tok-valid', 'sha256'), 'hex')),
  ('10000000-0000-0000-0000-00000000000b', 'new.person@firm-a.test', 'editor', encode(digest('tok-expired', 'sha256'), 'hex'));
update public.invitations set expires_at = now() - interval '1 minute' where token_hash = encode(digest('tok-expired', 'sha256'), 'hex');

select pg_temp.anon();
insert into _tap (line) select results_eq($$select org_name, status from public.invitation_preview('tok-valid')$$, $$values ('Firm B Solicitors', 'pending')$$, 'the invite page can preview a valid token before sign-in');
insert into _tap (line) select is_empty($$select * from public.invitation_preview('not-a-token')$$, 'an unknown token reveals nothing');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000c2', 'someone.else@example.com');
insert into _tap (line) select throws_ok($$select public.accept_invitation('tok-valid')$$, 'P0001', 'This invitation was sent to a different email address', 'an invitation only works for the invited email');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000c1', 'new.person@firm-a.test');
insert into _tap (line) select throws_ok($$select public.accept_invitation('tok-expired')$$, 'P0001', 'This invitation has expired', 'expired invitations fail');
insert into _tap (line) select is(public.accept_invitation('tok-valid'), '10000000-0000-0000-0000-00000000000b'::uuid, 'the invited person can accept');
insert into _tap (line) select results_eq('select role::text from public.memberships where user_id = auth.uid()', $$values ('editor')$$, 'accepting creates the membership with the invited role');
insert into _tap (line) select results_eq('select stage::text from public.sites', $$values ('onboarding')$$, 'the first acceptance moves the site from invited to onboarding');
insert into _tap (line) select throws_ok($$select public.accept_invitation('tok-valid')$$, 'P0001', 'This invitation has already been used', 'invitations are single use');
reset role;

-- --------------------------------------------------------- agency admin ---
-- Without two-factor authentication the agency flag grants nothing.
select pg_temp.login('00000000-0000-0000-0000-00000000000a', 'agency@example.com', 'aal1');
insert into _tap (line) select is((select count(*)::int from public.organisations), 0, 'agency admin without 2FA sees no organisations');
insert into _tap (line) select throws_ok($$insert into public.organisations (name, slug) values ('X', 'x')$$, '42501', null, 'agency admin without 2FA cannot create organisations');
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000a', 'agency@example.com', 'aal2');
insert into _tap (line) select is((select count(*)::int from public.organisations), 2, 'agency admin with 2FA sees every organisation');
insert into _tap (line) select is((select count(*)::int from public.builds), 3, 'agency admin sees unshared builds too');
insert into _tap (line) select lives_ok($$insert into public.organisations (name, slug) values ('Firm C', 'firm-c')$$, 'agency admin can create organisations');
insert into _tap (line) select is(public.transition_stage('20000000-0000-0000-0000-00000000000a', 'signed_off')::text, 'signed_off', 'agency admin can move a site''s stage');
insert into _tap (line) select ok((select count(*) from public.audit_log where entity = 'sites' and after ->> 'stage' = 'signed_off') = 1, 'stage changes are audited');
insert into _tap (line) select ok((select count(*) from public.audit_log where entity = 'invitations' and (after ? 'token_hash' or before ? 'token_hash')) = 0, 'the audit log never stores token hashes');
insert into _tap (line) select throws_ok($$update public.audit_log set action = 'x'$$, '42501', null, 'the audit log cannot be edited through the API');
reset role;

-- Even the database owner can't rewrite history.
insert into _tap (line) select throws_ok($$delete from public.audit_log$$, 'P0001', 'audit_log is append-only', 'the audit log is append-only for every role');
insert into _tap (line) select ok(
  (select bool_and(a.prev_hash is not distinct from (select b.hash from public.audit_log b where b.id < a.id order by b.id desc limit 1))
   from public.audit_log a),
  'each audit entry chains to the previous hash');

select line from _tap order by n;
select * from finish();
rollback;
