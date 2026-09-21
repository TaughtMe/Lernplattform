-- Room identity contract: animal tokens are live-only display metadata.
-- Existing participant and progress rows remain readable; new submissions use
-- the opaque participant key rather than a profile-derived display name.
alter table public.room_participants
  add column if not exists animal_token text,
  add column if not exists animal_number integer not null default 0;

alter table public.room_participants
  drop constraint if exists room_participants_animal_token_check;
alter table public.room_participants
  add constraint room_participants_animal_token_check check (
    animal_token is null or animal_token in (
      'Koala', 'Fledermaus', 'Kamel', 'Igel', 'Capybara',
      'Eichhörnchen', 'Elefant', 'Qualle', 'Tiefseefisch', 'Clownfisch',
      'Schwein', 'Ente', 'Phönix', 'Kiwi', 'Roter Panda', 'Giraffe',
      'Löwin', 'Einhorn', 'Orca', 'Schildkröte', 'Pfau', 'Affe',
      'Gorilla', 'Fuchs', 'Katze', 'Sphynx-Katze', 'Lama', 'Yak',
      'Kobra', 'Krokodil', 'Zebra', 'Flamingo', 'Oktopus', 'Chamäleon',
      'Hirsch', 'Pelikan', 'Erdmännchen', 'Käfer', 'Heuschrecke',
      'Schnabeltier', 'Mistkäfer', 'Krabbe', 'Mammut', 'Kaninchen',
      'Truthahn', 'Gottesanbeterin', 'Esel', 'Robbe', 'Strauß', 'Taube',
      'Gepard', 'Schmetterling', 'Libelle', 'Pudel', 'Bobtail', 'Mops',
      'Schäferhund', 'Collie', 'Dackel', 'Perserkatze'
    )
  );
alter table public.room_participants
  drop constraint if exists room_participants_animal_number_check;
alter table public.room_participants
  add constraint room_participants_animal_number_check check (
    animal_number >= 0 and (animal_token is not null or animal_number = 0)
  );

-- A reentry token must not become a credential for a second room.
create unique index if not exists room_participants_token_hash_global_uidx
  on public.room_participants(token_hash);
create unique index if not exists room_participants_animal_number_uidx
  on public.room_participants(room_id, animal_token, animal_number)
  where animal_token is not null;

drop function public.join_room_secure(text,text,text);
create function public.join_room_secure(
  p_code text,
  p_student_key text,
  p_participant_token text default null
)
returns table(
  room_id uuid,
  station_mode boolean,
  status text,
  assigned_student_key text,
  participant_token text,
  animal_token text,
  animal_number integer
)
language plpgsql
security definer
set search_path=public,private,extensions,pg_catalog
as $$
declare
  r public.rooms%rowtype;
  p public.room_participants%rowtype;
  raw_animal text := nullif(trim(p_student_key), '');
  animal text;
  tok text;
  number integer;
begin
  select * into r
  from public.rooms x
  where x.code=p_code and x.status in ('lobby','live')
  limit 1;

  -- A token can only reenter the same currently running room.
  if p_participant_token is not null
     and p_participant_token ~ '^[0-9a-f]{48}$' then
    select * into p
    from public.room_participants x
    where x.room_id=r.id
      and x.token_hash=encode(extensions.digest(p_participant_token,'sha256'),'hex')
    limit 1;
    if found then
      update public.room_participants set last_seen_at=now() where id=p.id;
      return query select r.id,r.station_mode,r.status,p.student_key,
        p_participant_token,p.animal_token,p.animal_number;
      return;
    end if;
  end if;

  perform private.enforce_rate_limit('join_room',600,interval '10 minutes');
  if p_code is null or p_code !~ '^[0-9]{4}$' or r.id is null then return; end if;

  -- Invalid or legacy free text means no animal; it is never persisted.
  animal := case when raw_animal in (
    'Koala', 'Fledermaus', 'Kamel', 'Igel', 'Capybara',
    'Eichhörnchen', 'Elefant', 'Qualle', 'Tiefseefisch', 'Clownfisch',
    'Schwein', 'Ente', 'Phönix', 'Kiwi', 'Roter Panda', 'Giraffe',
    'Löwin', 'Einhorn', 'Orca', 'Schildkröte', 'Pfau', 'Affe',
    'Gorilla', 'Fuchs', 'Katze', 'Sphynx-Katze', 'Lama', 'Yak',
    'Kobra', 'Krokodil', 'Zebra', 'Flamingo', 'Oktopus', 'Chamäleon',
    'Hirsch', 'Pelikan', 'Erdmännchen', 'Käfer', 'Heuschrecke',
    'Schnabeltier', 'Mistkäfer', 'Krabbe', 'Mammut', 'Kaninchen',
    'Truthahn', 'Gottesanbeterin', 'Esel', 'Robbe', 'Strauß', 'Taube',
    'Gepard', 'Schmetterling', 'Libelle', 'Pudel', 'Bobtail', 'Mops',
    'Schäferhund', 'Collie', 'Dackel', 'Perserkatze'
  ) then raw_animal else null end;

  -- Unmatched tokens are never rebound to a new room. The server issues a
  -- fresh 192-bit token, so an old tab cannot carry a credential across rooms.
  tok := encode(extensions.gen_random_bytes(24),'hex');

  if animal is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('animal:' || r.id::text || ':' || animal, 0)
    );
    select coalesce(max(x.animal_number),0)+1 into number
    from public.room_participants x
    where x.room_id=r.id and x.animal_token=animal;
  else
    number := 0;
  end if;

  insert into public.room_participants(
    room_id,student_key,token_hash,animal_token,animal_number
  ) values (
    r.id,
    'participant-' || encode(extensions.gen_random_bytes(16),'hex'),
    encode(extensions.digest(tok,'sha256'),'hex'),
    animal,
    number
  ) returning * into p;

  return query select r.id,r.station_mode,r.status,p.student_key,
    tok,p.animal_token,p.animal_number;
end;
$$;

drop function public.get_room_participants_secure(uuid,text);
create function public.get_room_participants_secure(
  p_room_id uuid,
  p_access_token text
)
returns table(
  student_key text,
  animal_token text,
  animal_number integer,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path=public,pg_catalog
as $$
  select p.student_key,p.animal_token,p.animal_number,p.last_seen_at
  from public.room_participants p
  join public.rooms r on r.id=p.room_id
  where p.room_id=p_room_id and r.access_token=p_access_token
  order by p.created_at
$$;

revoke all on function public.join_room_secure(text,text,text) from public,anon,authenticated;
revoke all on function public.get_room_participants_secure(uuid,text) from public,anon,authenticated;
grant execute on function public.join_room_secure(text,text,text) to anon;
grant execute on function public.get_room_participants_secure(uuid,text) to anon;

-- Participant reads and heartbeats stop at room end, before cleanup removes rows.
create or replace function private.valid_participant(
  p_room_id uuid,
  p_participant_token text
)
returns table(participant_id uuid,student_key text)
language sql
stable
security definer
set search_path=public,extensions,pg_catalog
as $$
  select rp.id,rp.student_key
  from public.room_participants rp
  join public.rooms r on r.id=rp.room_id
  where rp.room_id=p_room_id
    and r.status in ('lobby','live')
    and p_participant_token ~ '^[0-9a-f]{48}$'
    and rp.token_hash=encode(extensions.digest(p_participant_token,'sha256'),'hex')
  limit 1
$$;

create or replace function public.get_room_state_secure(
  p_room_id uuid,
  p_participant_token text default null,
  p_access_token text default null
)
returns table(status text,session_id text,config jsonb)
language sql
stable
security definer
set search_path=public,private,pg_catalog
as $$
  select r.status,r.session_id,r.config
  from public.rooms r
  where r.id=p_room_id
    and (
      (p_access_token is not null and r.access_token=p_access_token)
      or exists(select 1 from private.valid_participant(r.id,p_participant_token))
    )
  limit 1
$$;

create or replace function public.get_my_progress_secure(
  p_room_id uuid,
  p_session_id text,
  p_participant_token text,
  p_student_key text default null
)
returns table(
  current_index int,
  peeks int,
  attempts int,
  errors int,
  finished boolean,
  duration_ms int,
  word_errors jsonb,
  station_number int
)
language plpgsql
stable
security definer
set search_path=public,private,pg_catalog
as $$
declare pid uuid; assigned text; k text;
begin
  select v.participant_id,v.student_key into pid,assigned
  from private.valid_participant(p_room_id,p_participant_token) v;
  if pid is null then return; end if;
  k:=case when p_student_key ~ '^station-[0-9]{1,3}$' then p_student_key else assigned end;
  return query
    select s.current_index,s.peeks,s.attempts,s.errors,s.finished,
      s.duration_ms,s.word_errors,s.station_number
    from public.room_students s
    join public.rooms r on r.id=s.room_id
    where s.room_id=p_room_id
      and r.status in ('lobby','live')
      and s.session_id=p_session_id
      and r.session_id=p_session_id
      and s.student_key=k
      and (s.station_number is not null or s.participant_id=pid);
end
$$;
