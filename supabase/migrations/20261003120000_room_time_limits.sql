-- Room time limits (Entscheidung 52): new devices may join for 90 minutes after
-- the room was opened; a room closes by itself 120 minutes after opening.
-- Devices that already joined keep returning with their participant token.
-- The same values live in src/integrations/laufdiktat/room-limits.ts.

create or replace function public.join_room_secure(
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

  -- A token can only reenter the same currently running room. The join
  -- window does not apply here: returning devices are already in the room.
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

  -- New joins end 90 minutes after the room was opened. The answer is empty,
  -- exactly like for an unknown code.
  if r.created_at <= now() - interval '90 minutes' then return; end if;

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

revoke all on function public.join_room_secure(text,text,text) from public,anon,authenticated;
grant execute on function public.join_room_secure(text,text,text) to anon;

-- Closing by the server is the same state change as end_room_secure: the
-- room becomes 'ended', so students receive the usual end signal.
create or replace function public.cleanup_abandoned_rooms()
returns void
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
begin
  update public.rooms
  set status='ended',ended_at=now()
  where status<>'ended'
    and (
      last_activity_at<now()-interval '3 hours'
      or created_at<now()-interval '120 minutes'
    );
  delete from public.rooms
  where status='ended' and coalesce(ended_at,created_at)<now()-interval '24 hours';
  delete from private.request_limits where requested_at<now()-interval '1 day';
end
$$;

revoke all on function public.cleanup_abandoned_rooms() from public,anon,authenticated;
grant execute on function public.cleanup_abandoned_rooms() to service_role;

-- Every 5 minutes, so a room closes at most 5 minutes late.
select cron.unschedule(jobid) from cron.job where jobname='cleanup-abandoned-rooms';
select cron.schedule('cleanup-abandoned-rooms','*/5 * * * *','select public.cleanup_abandoned_rooms()');
