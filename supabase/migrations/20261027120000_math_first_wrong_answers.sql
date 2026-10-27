-- Mathe im Live-Raum: erste falsche Antwort je Aufgabe für die Lehrkraft.
-- Die Lehrkraft leitet daraus auf ihrem Gerät eine vermutete Fehlerart für den
-- CSV-Export ab. Die Antworten gehören zur Fortschrittszeile des Kindes
-- (pseudonym, wie word_errors) und verschwinden mit dem Raum.
--
-- Abwärtskompatibel: Das neue Argument steht am Ende und hat einen Standard.
-- Die Version 0.9.4 ruft upsert_progress_secure weiter mit 13 Argumenten auf;
-- get_room_students_secure liefert die Spalte zusätzlich, ältere Leser ignorieren
-- sie. Deshalb diese Migration vor dem neuen Client einspielen.
begin;

alter table public.room_students
  add column first_wrong_answers jsonb not null default '{}'::jsonb
  check (jsonb_typeof(first_wrong_answers)='object' and octet_length(first_wrong_answers::text)<=65536);

-- Die alte Signatur (13 Argumente) wird ersetzt, nicht ergänzt: Zwei Überladungen
-- mit Standardwerten machten einen Aufruf mit 13 Argumenten mehrdeutig.
drop function public.upsert_progress_secure(uuid,text,text,text,int,int,int,int,boolean,int,jsonb,text,int);

create function public.upsert_progress_secure(
  p_room_id uuid,p_session_id text,p_participant_token text,p_student_key text,
  p_current_index int,p_peeks int default 0,p_attempts int default 0,p_errors int default 0,
  p_finished boolean default false,p_duration_ms int default null,p_word_errors jsonb default null,
  p_app_version text default null,p_station_number int default null,
  p_first_wrong_answers jsonb default null
)
returns void language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare r public.rooms%rowtype; pid uuid; assigned text; sk text; wc int; sc int; math_prompts text[];
begin
 select x.* into r from public.rooms x where x.id=p_room_id and x.status='live' and x.session_id=p_session_id; if not found then raise exception 'Raum oder Sitzung ist nicht aktiv'; end if;
 select v.participant_id,v.student_key into pid,assigned from private.valid_participant(p_room_id,p_participant_token) v; if pid is null then raise exception 'Ungueltiger Teilnehmertoken'; end if;
 wc:=case when jsonb_typeof(r.config->'words')='array' then jsonb_array_length(r.config->'words') else 0 end;
 if p_current_index<0 or p_current_index>=greatest(wc,1) or p_peeks not between 0 and 100000 or p_attempts not between 0 and 100000 or p_errors not between 0 and 100000 then raise exception 'Ungueltige Fortschrittswerte'; end if;
 if p_duration_ms is not null and p_duration_ms not between 0 and 86400000 then raise exception 'Ungueltige Dauer'; end if;
 if p_word_errors is not null and (jsonb_typeof(p_word_errors)<>'object' or octet_length(p_word_errors::text)>65536) then raise exception 'Ungueltige Fehlerstatistik'; end if;
 if p_app_version is not null and length(p_app_version)>32 then raise exception 'Ungueltige App-Version'; end if;
 if p_station_number is not null then sc:=least(200,greatest(1,coalesce((r.config->>'stationCount')::int,24))); if not r.station_mode or p_station_number not between 1 and sc then raise exception 'Ungueltige Stationsnummer'; end if; sk:='station-'||p_station_number; else sk:=assigned; end if;
 -- Erste falsche Antworten: nur zu Mathe-Aufgaben des Raums (Schlüssel wie
 -- liveWordErrorKey: Aufgabentext), höchstens eine je Aufgabe, je Antwort
 -- höchstens 32 Zeichen, insgesamt wie word_errors höchstens 64 KiB.
 if p_first_wrong_answers is not null then
  if jsonb_typeof(p_first_wrong_answers)<>'object' or octet_length(p_first_wrong_answers::text)>65536 then raise exception 'Ungueltige Antwortstatistik'; end if;
  if exists(select 1 from jsonb_each(p_first_wrong_answers) e where jsonb_typeof(e.value)<>'string' or length(e.value #>> '{}')>32 or length(e.key) not between 1 and 2000) then raise exception 'Ungueltige Antwortstatistik'; end if;
  if (select count(*) from jsonb_object_keys(p_first_wrong_answers))>greatest(wc,1) then raise exception 'Ungueltige Antwortstatistik'; end if;
  if jsonb_typeof(r.config->'words')='array' then
   select coalesce(array_agg(coalesce(w->>'prompt',w->>'targetWord')),'{}') into math_prompts
   from jsonb_array_elements(r.config->'words') w
   where jsonb_typeof(w)='object' and coalesce(w->>'kind',case when coalesce(w->>'prompt','')<>'' then 'math' else 'text' end)='math';
  else math_prompts:='{}'; end if;
  if exists(select 1 from jsonb_object_keys(p_first_wrong_answers) k where k<>all(math_prompts)) then raise exception 'Ungueltige Antwortstatistik'; end if;
 end if;
 insert into public.room_students(room_id,session_id,student_key,participant_id,station_number,current_index,peeks,attempts,errors,finished,duration_ms,word_errors,first_wrong_answers,app_version,updated_at)
 values(p_room_id,p_session_id,sk,pid,p_station_number,p_current_index,p_peeks,p_attempts,p_errors,p_finished,p_duration_ms,coalesce(p_word_errors,'{}'),coalesce(p_first_wrong_answers,'{}'),p_app_version,now())
 on conflict(room_id,session_id,student_key) do update set participant_id=excluded.participant_id,current_index=excluded.current_index,peeks=excluded.peeks,attempts=excluded.attempts,errors=excluded.errors,finished=excluded.finished,duration_ms=coalesce(excluded.duration_ms,room_students.duration_ms),word_errors=coalesce(p_word_errors,room_students.word_errors),
  -- Die erste Antwort bleibt erhalten: Bereits gespeicherte Aufgaben gewinnen
  -- (zweites Gerät, Neuladen ohne lokalen Stand). Die Schlüssel sind Aufgaben
  -- des Raums, die Zusammenführung bleibt also unter der Grenze von oben.
  first_wrong_answers=coalesce(p_first_wrong_answers,'{}'::jsonb)||room_students.first_wrong_answers,
  app_version=coalesce(excluded.app_version,room_students.app_version),station_number=coalesce(excluded.station_number,room_students.station_number),updated_at=now()
 where room_students.station_number is not null or room_students.participant_id is null or room_students.participant_id=excluded.participant_id;
 if not found then raise exception 'Teilnehmername ist bereits einem anderen Geraet zugeordnet'; end if;
 update public.room_participants set last_seen_at=now() where id=pid; update public.rooms set last_activity_at=now() where id=p_room_id;
end $$;

revoke all on function public.upsert_progress_secure(uuid,text,text,text,int,int,int,int,boolean,int,jsonb,text,int,jsonb) from public,anon,authenticated;
grant execute on function public.upsert_progress_secure(uuid,text,text,text,int,int,int,int,boolean,int,jsonb,text,int,jsonb) to anon;

-- Der Lehrkraft-Abruf (setof room_students) liefert die neue Spalte ohne Änderung
-- mit; Rechte und Signatur bleiben unverändert.

commit;
