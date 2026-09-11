-- Preserve existing rooms, tokens and progress. No learning history is rewritten.
-- Rejected requests return an empty result to commit their rate-limit counter.
create or replace function private.enforce_rate_limit(p_scope text,p_max_requests int,p_window interval) returns void language plpgsql security definer set search_path=private,pg_catalog as $$
declare k text:=private.request_key_hash(); n bigint;
begin
  -- Serialize count + insert for concurrent requests from the same gateway key.
  perform pg_advisory_xact_lock(hashtextextended(p_scope || ':' || k, 0));
  select count(*) into n from private.request_limits where scope=p_scope and key_hash=k and requested_at>=now()-p_window;
  if n>=p_max_requests then raise exception 'Zu viele Anfragen. Bitte kurz warten.' using errcode='P0001'; end if;
  insert into private.request_limits(scope,key_hash) values(p_scope,k);
end $$;

create or replace function public.join_room_secure(p_code text,p_student_key text,p_participant_token text default null)
returns table(room_id uuid,station_mode boolean,status text,assigned_student_key text,participant_token text)
language plpgsql security definer set search_path=public,private,extensions,pg_catalog as $$
declare r public.rooms%rowtype; p public.room_participants%rowtype; base text:=trim(p_student_key); n text; tok text; suffix int:=1;
begin
 select * into r from public.rooms x where x.code=p_code and x.status in ('lobby','live') limit 1;
 if p_participant_token is not null and p_participant_token ~ '^[0-9a-f]{48}$' then
  select * into p from public.room_participants x where x.room_id=r.id and x.token_hash=encode(extensions.digest(p_participant_token,'sha256'),'hex') limit 1;
  if found then update public.room_participants set last_seen_at=now() where id=p.id; return query select r.id,r.station_mode,r.status,p.student_key,p_participant_token; return; end if;
 end if;
 perform private.enforce_rate_limit('join_room',600,interval '10 minutes');
 -- Empty results commit the counter. Raising here would roll it back.
 if p_code is null or p_code !~ '^[0-9]{4}$' or r.id is null
    or base is null or length(base) not between 1 and 60 or base ~ '[[:cntrl:]]' then return; end if;
 tok:=encode(extensions.gen_random_bytes(24),'hex');
 loop n:=case when suffix=1 then base else left(base,60-length(suffix::text)-1)||' '||suffix::text end;
  begin insert into public.room_participants(room_id,student_key,token_hash) values(r.id,n,encode(extensions.digest(tok,'sha256'),'hex')) returning * into p; exit;
  exception when unique_violation then suffix:=suffix+1; if suffix>999 then raise exception 'Kein freier Teilnehmername'; end if; end;
 end loop;
 return query select r.id,r.station_mode,r.status,p.student_key,tok;
end $$;

create or replace function public.open_room_secure(
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
  perform private.enforce_rate_limit('open_room', 12, interval '10 minutes');

  if jsonb_typeof(coalesce(p_config, '{}'::jsonb)) <> 'object'
     or octet_length(coalesce(p_config, '{}'::jsonb)::text) > 1048576 then
    return;
  end if;


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



-- PostgreSQL requires dropping a function when its result shape gains columns.
drop function public.get_my_progress_secure(uuid,text,text,text);
create or replace function public.get_my_progress_secure(p_room_id uuid,p_session_id text,p_participant_token text,p_student_key text default null)
returns table(current_index int,peeks int,attempts int,errors int,finished boolean,duration_ms int,word_errors jsonb,station_number int) language plpgsql stable security definer set search_path=public,private,pg_catalog as $$
declare pid uuid; assigned text; k text;
begin select v.participant_id,v.student_key into pid,assigned from private.valid_participant(p_room_id,p_participant_token) v; if pid is null then return; end if;
 k:=case when p_student_key ~ '^station-[0-9]{1,3}$' then p_student_key else assigned end;
 return query select s.current_index,s.peeks,s.attempts,s.errors,s.finished,s.duration_ms,s.word_errors,s.station_number from public.room_students s join public.rooms r on r.id=s.room_id where s.room_id=p_room_id and s.session_id=p_session_id and r.session_id=p_session_id and s.student_key=k and (s.station_number is not null or s.participant_id=pid);
end $$;
revoke all on function public.get_my_progress_secure(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.get_my_progress_secure(uuid,text,text,text) to anon;

-- Restore only the capability-protected transfer API revoked by the room port.
grant execute on function public.reserve_content_transfer(text,text,bigint,integer),
 public.upload_content_transfer(uuid,text,text,text,text,text,jsonb),
 public.retrieve_content_transfer_by_qr(uuid,text),
 public.retrieve_content_transfer_by_code(text) to anon;
