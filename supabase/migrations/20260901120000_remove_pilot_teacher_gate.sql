-- Removes the accompanied-pilot teacher gate added in
-- 20260831120000_gate_pilot_room_creation.sql. Laufdiktat itself never
-- required a separate provisioned passphrase to open a room (see
-- open_room_secure(jsonb) in 20260825124001_migrate_laufdiktat_live_rooms.sql);
-- room creation is rate-limited per caller instead, same as the original.

drop function if exists public.open_room_secure(jsonb, text);
drop table if exists private.teacher_pilot_keys;

create function public.open_room_secure(
  p_config jsonb default '{}'::jsonb
)
returns table(room_id uuid, code text, access_token text)
language plpgsql
security definer
set search_path = public, private, extensions, pg_catalog
as $$
declare
  c text;
begin
  if jsonb_typeof(coalesce(p_config, '{}')) <> 'object'
     or octet_length(coalesce(p_config, '{}')::text) > 1048576 then
    raise exception 'Ungueltige oder zu grosse Raumkonfiguration';
  end if;

  perform private.enforce_rate_limit('open_room', 12, interval '10 minutes');

  for attempt in 1..40 loop
    c := lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      return query
      insert into public.rooms(code, config)
      values (c, coalesce(p_config, '{}'::jsonb))
      returning rooms.id, rooms.code, rooms.access_token;
      return;
    exception when unique_violation then
      null;
    end;
  end loop;

  raise exception 'Zurzeit ist kein freier Raumcode verfügbar';
end;
$$;

revoke all on function public.open_room_secure(jsonb) from public, anon, authenticated;
grant execute on function public.open_room_secure(jsonb) to anon;
