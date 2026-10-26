-- Replace public Realtime metadata with capability-authorized HTTP RPCs.
-- These rooms use per-device capabilities, not Supabase Auth users. Every
-- SECURITY DEFINER entry point validates its room-specific capability.
begin;

alter table public.room_participants
  add column activity text not null default 'room' check (activity in ('room','practice'));

-- Enforce the room lifetime on every participant operation, independently of cron.
create or replace function private.valid_participant(p_room_id uuid,p_participant_token text)
returns table(participant_id uuid,student_key text)
language sql stable security definer set search_path=public,extensions,pg_catalog as $$
  select p.id,p.student_key from public.room_participants p
  join public.rooms r on r.id=p.room_id
  where p.room_id=p_room_id and r.status in ('lobby','live')
    and r.created_at > now()-interval '120 minutes'
    and p_participant_token ~ '^[0-9a-f]{48}$'
    and p.token_hash=encode(extensions.digest(p_participant_token,'sha256'),'hex')
  limit 1
$$;
revoke all on function private.valid_participant(uuid,text) from public,anon,authenticated;

create table private.room_attacks (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  session_id text not null,
  sender_id uuid not null references public.room_participants(id) on delete cascade,
  target_id uuid not null references public.room_participants(id) on delete cascade,
  type text not null check (type in ('ink','flicker')),
  created_at timestamptz not null default now()
);
alter table private.room_attacks enable row level security;
revoke all on private.room_attacks from public,anon,authenticated;
create index room_attacks_target_idx on private.room_attacks(room_id,session_id,target_id,id);
create index room_attacks_sender_idx on private.room_attacks(sender_id,created_at);

create function public.touch_participant_activity_secure(
  p_room_id uuid,p_participant_token text,p_activity text default 'room'
) returns void language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare pid uuid;
begin
  select v.participant_id into pid from private.valid_participant(p_room_id,p_participant_token) v;
  if pid is null or p_activity is null or p_activity not in ('room','practice') then
    raise exception 'Ungueltige Raumteilnahme';
  end if;
  update public.room_participants set last_seen_at=now(),activity=p_activity where id=pid;
  update public.rooms set last_activity_at=now() where id=p_room_id;
end
$$;

-- Additive response field; old readers can ignore activity during deployment.
drop function public.get_room_participants_secure(uuid,text);
create function public.get_room_participants_secure(p_room_id uuid,p_access_token text)
returns table(student_key text,animal_token text,animal_number int,last_seen_at timestamptz,activity text)
language sql stable security definer set search_path=public,pg_catalog as $$
  select p.student_key,p.animal_token,p.animal_number,p.last_seen_at,p.activity
  from public.room_participants p join public.rooms r on r.id=p.room_id
  where p.room_id=p_room_id and r.access_token=p_access_token order by p.created_at
$$;

create function public.get_room_activity_secure(
  p_room_id uuid,p_participant_token text,p_session_id text,p_after_attack_id bigint default 0
) returns jsonb language plpgsql stable security definer set search_path=public,private,pg_catalog as $$
declare pid uuid; peers jsonb; attacks jsonb;
begin
  select v.participant_id into pid from private.valid_participant(p_room_id,p_participant_token) v;
  if pid is null or not exists (
    select 1 from public.rooms r where r.id=p_room_id and r.status='live' and r.session_id=p_session_id
  ) then raise exception 'Ungueltige Raumteilnahme'; end if;
  -- Only the minimal peer display/progress is shared, never tokens, errors,
  -- durations or the teacher's complete result records.
  select coalesce(jsonb_agg(jsonb_build_object(
    'key',p.student_key,'animal',p.animal_token,'number',p.animal_number,
    'index',coalesce(s.current_index,0)) order by p.created_at),'[]'::jsonb)
  into peers from public.room_participants p
  left join public.room_students s on s.participant_id=p.id and s.room_id=p_room_id
    and s.session_id=p_session_id and s.station_number is null
  where p.room_id=p_room_id and p.last_seen_at > now()-interval '45 seconds' and p.activity='room';
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'type',a.type,'from',case when p.animal_token is null then 'einem Mitspieler'
      else p.animal_token || case when p.animal_number>1 then ' '||p.animal_number else '' end end
    ) order by a.id),'[]'::jsonb)
  into attacks from private.room_attacks a join public.room_participants p on p.id=a.sender_id
  where a.room_id=p_room_id and a.session_id=p_session_id and a.target_id=pid
    and a.id>coalesce(p_after_attack_id,0) and a.created_at > now()-interval '15 seconds';
  return jsonb_build_object('peers',peers,'attacks',attacks);
end
$$;

create function public.send_room_attack_secure(
  p_room_id uuid,p_participant_token text,p_session_id text,p_target text,p_type text
) returns boolean language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare pid uuid; target_id uuid;
begin
  select v.participant_id into pid from private.valid_participant(p_room_id,p_participant_token) v;
  if pid is null then raise exception 'Ungueltige Raumteilnahme'; end if;
  if p_type is null or p_type not in ('ink','flicker') or not exists (
    select 1 from public.rooms r where r.id=p_room_id and r.status='live'
      and r.session_id=p_session_id and r.config->>'gameMode'='BATTLE'
      and coalesce(r.config->'battleOptions'->p_type,'true'::jsonb)='true'::jsonb
  ) then return false; end if;
  select p.id into target_id from public.room_participants p where p.room_id=p_room_id
    and p.student_key=p_target and p.id<>pid and p.activity='room'
    and p.last_seen_at > now()-interval '45 seconds';
  if target_id is null then return false; end if;
  -- Serialize competing requests from the same sender; limiting only in the
  -- UI does not prevent direct calls or concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended('attack:'||pid::text,0));
  if exists(select 1 from private.room_attacks a where a.sender_id=pid
    and a.created_at > now()-interval '15 seconds') then return false; end if;
  insert into private.room_attacks(room_id,session_id,sender_id,target_id,type)
    values(p_room_id,p_session_id,pid,target_id,p_type);
  return true;
end
$$;

revoke all on function public.touch_participant_activity_secure(uuid,text,text),
  public.get_room_participants_secure(uuid,text),
  public.get_room_activity_secure(uuid,text,text,bigint),
  public.send_room_attack_secure(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.touch_participant_activity_secure(uuid,text,text),
  public.get_room_participants_secure(uuid,text),
  public.get_room_activity_secure(uuid,text,text,bigint),
  public.send_room_attack_secure(uuid,text,text,text,text) to anon;

commit;
