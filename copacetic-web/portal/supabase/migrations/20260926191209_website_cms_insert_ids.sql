-- The app picks ids up front (so it can redirect straight to the new item).
grant insert (id) on public.posts, public.site_documents, public.office_closures to authenticated;
