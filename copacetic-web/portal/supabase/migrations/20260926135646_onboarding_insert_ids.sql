-- The app picks row ids up front (a file's id is part of its storage path), so allow them on insert.
grant insert (id) on public.content_sections to authenticated;
grant insert (id) on public.media to authenticated;
