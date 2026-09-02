-- Fail-closed teacher gate for the accompanied Laufdiktat pilot.
-- Participant and room access tokens remain separate and unchanged.

create table if not exists private.teacher_pilot_keys (
  id uuid primary key default extensions.gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 120),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

revoke all on private.teacher_pilot_keys from public, anon, authenticated;

drop function if exists public.open_room_secure(jsonb);

create function public.open_room_secure(
  p_config jsonb default '{}'::jsonb,
  p_teacher_token text default null
)
returns table(room_id uuid, code text, access_token text)
language plpgsql
security definer
set search_path = public, private, extensions, pg_catalog
as $$
declare
  c text;
  key_id uuid;
begin
  perform private.enforce_rate_limit('open_room', 12, interval '10 minutes');

  if p_teacher_token is null
     or char_length(p_teacher_token) < 12
     or char_length(p_teacher_token) > 200 then
    raise exception 'Lehrkraftfreigabe fehlt oder ist ungültig';
  end if;

  select k.id into key_id
  from private.teacher_pilot_keys k
  where k.active
    and k.token_hash = encode(extensions.digest(p_teacher_token, 'sha256'), 'hex')
  limit 1;

  if key_id is null then
    raise exception 'Lehrkraftfreigabe fehlt oder ist ungültig';
  end if;

  update private.teacher_pilot_keys set last_used_at = now() where id = key_id;

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

revoke all on function public.open_room_secure(jsonb, text) from public, anon, authenticated;
grant execute on function public.open_room_secure(jsonb, text) to anon;

comment on table private.teacher_pilot_keys is
  'Hashed, revocable operator-provisioned access keys for creating accompanied pilot rooms.';

