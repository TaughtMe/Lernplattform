-- Persisted, token-bound Laufdiktat rooms. No historical room data is migrated.
create extension if not exists pgcrypto;
create extension if not exists pg_cron;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[0-9]{4}$'),
  access_token text not null default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'lobby' check (status in ('lobby','live','ended')),
  session_id text,
  config jsonb not null default '{}'::jsonb check (octet_length(config::text) <= 1048576),
  station_mode boolean not null default false,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  last_activity_at timestamptz not null default now()
);
create unique index rooms_active_code_uidx on public.rooms(code) where status <> 'ended';
create index rooms_status_activity_idx on public.rooms(status,last_activity_at);

create table public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  student_key text not null check (length(student_key) between 1 and 64 and student_key !~ '[[:cntrl:]]'),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(room_id,student_key), unique(room_id,token_hash)
);
create index room_participants_room_idx on public.room_participants(room_id,last_seen_at desc);

create table public.room_students (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  session_id text not null check (length(session_id) between 1 and 64),
  student_key text not null check (length(student_key) between 1 and 64 and student_key !~ '[[:cntrl:]]'),
  participant_id uuid references public.room_participants(id) on delete set null,
  station_number int check (station_number is null or station_number between 1 and 200),
  current_index int not null default 0 check (current_index between 0 and 10000),
  peeks int not null default 0 check (peeks between 0 and 100000),
  attempts int not null default 0 check (attempts between 0 and 100000),
  errors int not null default 0 check (errors between 0 and 100000),
  finished boolean not null default false,
  duration_ms int check (duration_ms is null or duration_ms between 0 and 86400000),
  word_errors jsonb not null default '{}'::jsonb check (jsonb_typeof(word_errors)='object' and octet_length(word_errors::text)<=65536),
  app_version text check (app_version is null or length(app_version)<=32),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(room_id,session_id,student_key)
);
create index room_students_room_idx on public.room_students(room_id,session_id);
create index room_students_participant_idx on public.room_students(participant_id,room_id,session_id) where participant_id is not null;

alter table public.rooms enable row level security;
alter table public.rooms force row level security;
alter table public.room_participants enable row level security;
alter table public.room_participants force row level security;
alter table public.room_students enable row level security;
alter table public.room_students force row level security;
revoke all on public.rooms, public.room_participants, public.room_students from public, anon, authenticated;

create table private.request_limits(scope text not null,key_hash text not null,requested_at timestamptz not null default now());
create index request_limits_lookup_idx on private.request_limits(scope,key_hash,requested_at desc);

create function private.request_key_hash() returns text language plpgsql security definer set search_path=pg_catalog,extensions as $$
declare h jsonb; ip text;
begin
  begin h:=nullif(current_setting('request.headers',true),'')::jsonb; ip:=nullif(trim(split_part(coalesce(h->>'x-forwarded-for',''),',',1)),''); exception when others then ip:=null; end;
  return encode(extensions.digest(coalesce(ip,'unknown'),'sha256'),'hex');
end $$;
create function private.enforce_rate_limit(p_scope text,p_max_requests int,p_window interval) returns void language plpgsql security definer set search_path=private,pg_catalog as $$
declare k text:=private.request_key_hash(); n bigint;
begin
  delete from private.request_limits where requested_at < now()-interval '1 day';
  select count(*) into n from private.request_limits where scope=p_scope and key_hash=k and requested_at>=now()-p_window;
  if n>=p_max_requests then raise exception 'Zu viele Anfragen. Bitte kurz warten.' using errcode='P0001'; end if;
  insert into private.request_limits(scope,key_hash) values(p_scope,k);
end $$;
create function private.valid_participant(p_room_id uuid,p_participant_token text)
returns table(participant_id uuid,student_key text) language sql stable security definer set search_path=public,extensions,pg_catalog as $$
 select rp.id,rp.student_key from public.room_participants rp where rp.room_id=p_room_id and p_participant_token ~ '^[0-9a-f]{48}$' and rp.token_hash=encode(extensions.digest(p_participant_token,'sha256'),'hex') limit 1
$$;
revoke all on function private.request_key_hash() from public,anon,authenticated;
revoke all on function private.enforce_rate_limit(text,int,interval) from public,anon,authenticated;
revoke all on function private.valid_participant(uuid,text) from public,anon,authenticated;

create function public.open_room_secure(p_config jsonb default '{}'::jsonb)
returns table(room_id uuid,code text,access_token text) language plpgsql security definer set search_path=public,private,extensions,pg_catalog as $$
declare c text; tries int:=0;
begin
 if jsonb_typeof(coalesce(p_config,'{}'))<>'object' or octet_length(coalesce(p_config,'{}')::text)>1048576 then raise exception 'Ungueltige oder zu grosse Raumkonfiguration'; end if;
 perform private.enforce_rate_limit('open_room',60,interval '10 minutes');
 loop tries:=tries+1; c:=lpad((1000+floor(random()*9000))::int::text,4,'0');
  begin return query insert into public.rooms(code,config) values(c,coalesce(p_config,'{}')) returning rooms.id,rooms.code,rooms.access_token; return;
  exception when unique_violation then if tries>=20 then raise exception 'Kein freier Raum-Code'; end if; end;
 end loop;
end $$;

create function public.join_room_secure(p_code text,p_student_key text,p_participant_token text default null)
returns table(room_id uuid,station_mode boolean,status text,assigned_student_key text,participant_token text)
language plpgsql security definer set search_path=public,private,extensions,pg_catalog as $$
declare r public.rooms%rowtype; p public.room_participants%rowtype; base text:=trim(p_student_key); n text; tok text; suffix int:=1;
begin
 if p_code !~ '^[0-9]{4}$' then return; end if;
 if length(base) not between 1 and 60 or base ~ '[[:cntrl:]]' then raise exception 'Ungueltiger Teilnehmername'; end if;
 select * into r from public.rooms x where x.code=p_code and x.status in ('lobby','live') limit 1; if not found then return; end if;
 if p_participant_token is not null and p_participant_token ~ '^[0-9a-f]{48}$' then
  select * into p from public.room_participants x where x.room_id=r.id and x.token_hash=encode(extensions.digest(p_participant_token,'sha256'),'hex') limit 1;
  if found then update public.room_participants set last_seen_at=now() where id=p.id; return query select r.id,r.station_mode,r.status,p.student_key,p_participant_token; return; end if;
 end if;
 perform private.enforce_rate_limit('join_room',600,interval '10 minutes'); tok:=encode(extensions.gen_random_bytes(24),'hex');
 loop n:=case when suffix=1 then base else left(base,60-length(suffix::text)-1)||' '||suffix::text end;
  begin insert into public.room_participants(room_id,student_key,token_hash) values(r.id,n,encode(extensions.digest(tok,'sha256'),'hex')) returning * into p; exit;
  exception when unique_violation then suffix:=suffix+1; if suffix>999 then raise exception 'Kein freier Teilnehmername'; end if; end;
 end loop;
 return query select r.id,r.station_mode,r.status,p.student_key,tok;
end $$;

create function public.get_room_state_secure(p_room_id uuid,p_participant_token text default null,p_access_token text default null)
returns table(status text,session_id text,config jsonb) language sql stable security definer set search_path=public,private,pg_catalog as $$
 select r.status,r.session_id,r.config from public.rooms r where r.id=p_room_id and ((p_access_token is not null and r.access_token=p_access_token) or exists(select 1 from private.valid_participant(r.id,p_participant_token))) limit 1
$$;

create function public.update_session_secure(p_room_id uuid,p_access_token text,p_session_id text,p_config jsonb) returns void
language plpgsql security definer set search_path=public,pg_catalog as $$
begin
 if p_session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Ungueltige Sitzungs-ID'; end if;
 if jsonb_typeof(p_config)<>'object' or octet_length(p_config::text)>1048576 or jsonb_typeof(p_config->'words')<>'array' or jsonb_array_length(p_config->'words') not between 1 and 2000 then raise exception 'Ungueltige Raumkonfiguration'; end if;
 update public.rooms set status='live',session_id=p_session_id,config=p_config,station_mode=coalesce((p_config->>'stationMode')::boolean,station_mode),started_at=coalesce(started_at,now()),last_activity_at=now() where id=p_room_id and access_token=p_access_token;
 if not found then raise exception 'Ungueltiger Raum oder Token'; end if;
end $$;

create function public.end_room_secure(p_room_id uuid,p_access_token text) returns void language plpgsql security definer set search_path=public,pg_catalog as $$
begin update public.rooms set status='ended',ended_at=now(),last_activity_at=now() where id=p_room_id and access_token=p_access_token; if not found then raise exception 'Ungueltiger Raum oder Token'; end if; end $$;

create function public.upsert_progress_secure(p_room_id uuid,p_session_id text,p_participant_token text,p_student_key text,p_current_index int,p_peeks int default 0,p_attempts int default 0,p_errors int default 0,p_finished boolean default false,p_duration_ms int default null,p_word_errors jsonb default null,p_app_version text default null,p_station_number int default null)
returns void language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare r public.rooms%rowtype; pid uuid; assigned text; sk text; wc int; sc int;
begin
 select x.* into r from public.rooms x where x.id=p_room_id and x.status='live' and x.session_id=p_session_id; if not found then raise exception 'Raum oder Sitzung ist nicht aktiv'; end if;
 select v.participant_id,v.student_key into pid,assigned from private.valid_participant(p_room_id,p_participant_token) v; if pid is null then raise exception 'Ungueltiger Teilnehmertoken'; end if;
 wc:=case when jsonb_typeof(r.config->'words')='array' then jsonb_array_length(r.config->'words') else 0 end;
 if p_current_index<0 or p_current_index>=greatest(wc,1) or p_peeks not between 0 and 100000 or p_attempts not between 0 and 100000 or p_errors not between 0 and 100000 then raise exception 'Ungueltige Fortschrittswerte'; end if;
 if p_duration_ms is not null and p_duration_ms not between 0 and 86400000 then raise exception 'Ungueltige Dauer'; end if;
 if p_word_errors is not null and (jsonb_typeof(p_word_errors)<>'object' or octet_length(p_word_errors::text)>65536) then raise exception 'Ungueltige Fehlerstatistik'; end if;
 if p_app_version is not null and length(p_app_version)>32 then raise exception 'Ungueltige App-Version'; end if;
 if p_station_number is not null then sc:=least(200,greatest(1,coalesce((r.config->>'stationCount')::int,24))); if not r.station_mode or p_station_number not between 1 and sc then raise exception 'Ungueltige Stationsnummer'; end if; sk:='station-'||p_station_number; else sk:=assigned; end if;
 insert into public.room_students(room_id,session_id,student_key,participant_id,station_number,current_index,peeks,attempts,errors,finished,duration_ms,word_errors,app_version,updated_at)
 values(p_room_id,p_session_id,sk,pid,p_station_number,p_current_index,p_peeks,p_attempts,p_errors,p_finished,p_duration_ms,coalesce(p_word_errors,'{}'),p_app_version,now())
 on conflict(room_id,session_id,student_key) do update set participant_id=excluded.participant_id,current_index=excluded.current_index,peeks=excluded.peeks,attempts=excluded.attempts,errors=excluded.errors,finished=excluded.finished,duration_ms=coalesce(excluded.duration_ms,room_students.duration_ms),word_errors=coalesce(p_word_errors,room_students.word_errors),app_version=coalesce(excluded.app_version,room_students.app_version),station_number=coalesce(excluded.station_number,room_students.station_number),updated_at=now()
 where room_students.station_number is not null or room_students.participant_id is null or room_students.participant_id=excluded.participant_id;
 if not found then raise exception 'Teilnehmername ist bereits einem anderen Geraet zugeordnet'; end if;
 update public.room_participants set last_seen_at=now() where id=pid; update public.rooms set last_activity_at=now() where id=p_room_id;
end $$;

create function public.get_my_progress_secure(p_room_id uuid,p_session_id text,p_participant_token text,p_student_key text default null)
returns table(current_index int,peeks int,attempts int,errors int,finished boolean) language plpgsql stable security definer set search_path=public,private,pg_catalog as $$
declare pid uuid; assigned text; k text;
begin select v.participant_id,v.student_key into pid,assigned from private.valid_participant(p_room_id,p_participant_token) v; if pid is null then return; end if;
 k:=case when p_student_key ~ '^station-[0-9]{1,3}$' then p_student_key else assigned end;
 return query select s.current_index,s.peeks,s.attempts,s.errors,s.finished from public.room_students s join public.rooms r on r.id=s.room_id where s.room_id=p_room_id and s.session_id=p_session_id and r.session_id=p_session_id and s.student_key=k and (s.station_number is not null or s.participant_id=pid);
end $$;

create function public.get_room_students_secure(p_room_id uuid,p_access_token text) returns setof public.room_students language sql stable security definer set search_path=public,pg_catalog as $$
 select s.* from public.room_students s join public.rooms r on r.id=s.room_id where s.room_id=p_room_id and r.access_token=p_access_token
$$;
create function public.get_room_participants_secure(p_room_id uuid,p_access_token text)
returns table(student_key text,last_seen_at timestamptz) language sql stable security definer set search_path=public,pg_catalog as $$
 select p.student_key,p.last_seen_at from public.room_participants p join public.rooms r on r.id=p.room_id where p.room_id=p_room_id and r.access_token=p_access_token order by p.created_at
$$;
create function public.remove_room_participant_secure(p_room_id uuid,p_access_token text,p_student_key text) returns void language plpgsql security definer set search_path=public,pg_catalog as $$
begin if not exists(select 1 from public.rooms r where r.id=p_room_id and r.access_token=p_access_token) then raise exception 'Ungueltiger Raum oder Token'; end if; delete from public.room_participants where room_id=p_room_id and student_key=p_student_key; delete from public.room_students where room_id=p_room_id and student_key=p_student_key; end $$;
create function public.touch_participant_secure(p_room_id uuid,p_participant_token text) returns void language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare pid uuid; begin select v.participant_id into pid from private.valid_participant(p_room_id,p_participant_token) v; if pid is null then raise exception 'Ungueltiger Teilnehmertoken'; end if; update public.room_participants set last_seen_at=now() where id=pid; update public.rooms set last_activity_at=now() where id=p_room_id and status<>'ended'; end $$;

create function public.cleanup_abandoned_rooms() returns void language plpgsql security definer set search_path=public,private,pg_catalog as $$
begin update public.rooms set status='ended',ended_at=now() where status<>'ended' and last_activity_at<now()-interval '3 hours'; delete from public.rooms where status='ended' and coalesce(ended_at,created_at)<now()-interval '24 hours'; delete from private.request_limits where requested_at<now()-interval '1 day'; end $$;

revoke all on all functions in schema public from public,anon,authenticated;
grant execute on function public.open_room_secure(jsonb),public.join_room_secure(text,text,text),public.get_room_state_secure(uuid,text,text),public.update_session_secure(uuid,text,text,jsonb),public.end_room_secure(uuid,text),public.upsert_progress_secure(uuid,text,text,text,int,int,int,int,boolean,int,jsonb,text,int),public.get_my_progress_secure(uuid,text,text,text),public.get_room_students_secure(uuid,text),public.get_room_participants_secure(uuid,text),public.remove_room_participant_secure(uuid,text,text),public.touch_participant_secure(uuid,text) to anon;
grant execute on function public.cleanup_abandoned_rooms() to service_role;

select cron.unschedule(jobid) from cron.job where jobname='cleanup-abandoned-rooms';
select cron.schedule('cleanup-abandoned-rooms','*/15 * * * *','select public.cleanup_abandoned_rooms()');

comment on table public.rooms is 'Ephemeral Laufdiktat rooms; removed within 24 hours after ending.';
comment on table public.room_participants is 'Ephemeral pseudonymous room participants with hashed device tokens.';
comment on table public.room_students is 'Ephemeral Laufdiktat progress; cascades with its room.';
