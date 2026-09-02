-- New database objects are private by default. Every future Data API endpoint
-- must be exposed deliberately in the same migration as its RLS/access model.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables
  from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences
  from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- The transfer flow currently has no Supabase Auth session. Keep its public API
-- surface limited to the anon role used with the publishable browser key.
revoke execute on function public.reserve_content_transfer(text, text, bigint, integer)
  from authenticated;
revoke execute on function public.upload_content_transfer(uuid, text, text, text, text, text, jsonb)
  from authenticated;
revoke execute on function public.retrieve_content_transfer_by_qr(uuid, text)
  from authenticated;
revoke execute on function public.retrieve_content_transfer_by_code(text)
  from authenticated;
