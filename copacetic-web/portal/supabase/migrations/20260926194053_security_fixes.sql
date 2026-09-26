-- Fixes from the security review.

-- 1. A checked upload can't be swapped: while a file is pending (uploaded, not yet checked), its
--    stored object can't be deleted, and without a delete the path can't be uploaded to again.
drop policy "client files: members delete editable files" on storage.objects;
create policy "client files: members delete editable files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-files' and exists (
    select 1 from public.media m
    where m.storage_path = storage.objects.name and m.status <> 'pending'
      and private.media_editable(m.org_id, m.section_id)));

-- 2. Showing a document on the website is publishing: editors can prepare hidden documents,
--    owners, approvers and the agency make them visible. Only website-library files qualify.
drop policy "members manage documents" on public.site_documents;
create policy "members add documents" on public.site_documents
  for insert to authenticated
  with check (private.can_publish(org_id)
              or (not visible and private.is_org_member(org_id) and private.website_enabled(org_id)));
create policy "members change documents" on public.site_documents
  for update to authenticated
  using (private.can_publish(org_id)
         or (not visible and private.is_org_member(org_id) and private.website_enabled(org_id)))
  with check (private.can_publish(org_id)
              or (not visible and private.is_org_member(org_id) and private.website_enabled(org_id)));
create policy "members remove documents" on public.site_documents
  for delete to authenticated
  using (private.can_publish(org_id)
         or (not visible and private.is_org_member(org_id) and private.website_enabled(org_id)));

create or replace function private.check_document() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.media m
    where m.id = new.media_id and m.org_id = new.org_id and m.kind = 'document' and m.status = 'clean'
      and m.section_id is null
  ) then
    raise exception 'must be a checked website document' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- 3. The public hours feed only shows offices the firm has sent us, once website editing is open.
create or replace function public.public_site_hours(p_site uuid)
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
  where c.org_id = private.site_org(p_site) and c.type = 'office' and c.status in ('submitted', 'approved')
    and private.website_enabled(c.org_id)
  order by c.sort_order, c.created_at;
$$;

-- 4. Owners can withdraw invitations but not bring a withdrawn one back.
drop policy "agency and owners revoke invitations" on public.invitations;
create policy "agency and owners revoke invitations" on public.invitations
  for update to authenticated
  using ((private.is_agency_admin() or private.has_org_role(org_id, '{owner}')) and accepted_at is null)
  with check ((private.is_agency_admin() or private.has_org_role(org_id, '{owner}')) and revoked_at is not null);

-- 5. Asana handshake: the registered webhook URL carries a one-time nonce, so only the request
--    Asana makes to that exact URL can set the secret.
alter table private.asana_webhooks add column handshake_nonce text;
drop function public.open_asana_handshake(text);
create function public.open_asana_handshake(p_project text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_nonce text := encode(extensions.gen_random_bytes(18), 'hex');
begin
  insert into private.asana_webhooks (project_gid, handshake_expires_at, handshake_nonce)
  values (p_project, now() + interval '2 minutes', v_nonce)
  on conflict (project_gid) do update set handshake_expires_at = now() + interval '2 minutes', handshake_nonce = v_nonce;
  return v_nonce;
end;
$$;
drop function public.accept_asana_handshake(text, text);
create function public.accept_asana_handshake(p_project text, p_secret text, p_nonce text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update private.asana_webhooks set secret = p_secret, handshake_expires_at = null, handshake_nonce = null
  where project_gid = p_project and handshake_expires_at > now()
    and handshake_nonce is not null and handshake_nonce = p_nonce;
  return found;
end;
$$;
revoke all on function public.open_asana_handshake(text), public.accept_asana_handshake(text, text, text)
  from public, anon, authenticated;
grant execute on function public.open_asana_handshake(text), public.accept_asana_handshake(text, text, text)
  to service_role;

-- 6. Nothing in the private schema is callable by default; grant what policies and checks need.
revoke execute on all functions in schema private from public, anon;
alter default privileges in schema private revoke execute on functions from public;
grant execute on function private.valid_intervals(jsonb), private.valid_week(jsonb) to authenticated;
grant execute on function private.media_path_is_public(text) to anon, authenticated;
