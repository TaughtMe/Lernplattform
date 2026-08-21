-- Duelle (siehe "09 - Duelle"): Schüler:innen fordern sich mit ihrem
-- eigenen oder gemeinsamen Wortschatz heraus. Anders als die Laufdiktat-
-- Räume gibt es hier keine Lehrkraft/kein Dashboard mit Schreibrechten --
-- alle Teilnehmer:innen sind gleichberechtigt, nur die/der Ersteller:in
-- (join_order = 0) legt einmalig den finalen Aufgabeninhalt fest.
--
-- Sicherheitsmodell identisch zum gehärteten Laufdiktat-Muster (siehe
-- 20260710130000_security_hardening_compat.sql): RLS deny-by-default, jeder
-- Zugriff ausschließlich über SECURITY DEFINER-RPCs, geräteweite
-- Teilnehmertokens werden nie im Klartext gespeichert (nur ihr SHA-256-Hash).
-- Bewusst NICHT übernommen aus dem Laufdiktat-Vorbild: das
-- private.request_limits-Ratenlimit und der pg_cron-Aufräumjob -- beides
-- sind sinnvolle Härtungsschritte für einen späteren Schritt, sobald echte
-- Nutzung zeigt, ob/wo sie nötig sind; cleanup_abandoned_duells() existiert
-- bereits als aufrufbare Funktion, ist aber noch nicht automatisch
-- terminiert (siehe Funktionskommentar unten).

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.duells (
  id                uuid primary key default gen_random_uuid(),
  code              text not null,
  art               text not null check (art in ('herausforderer-stapel', 'wechselduell', 'schwierige-woerter', 'zufaellige-woerter')),
  round_size        int not null default 12 check (round_size between 1 and 50),
  status            text not null default 'lobby' check (status in ('lobby', 'live', 'ended')),
  content           jsonb,
  created_at        timestamptz not null default now(),
  started_at        timestamptz,
  ended_at          timestamptz,
  last_activity_at  timestamptz not null default now(),
  constraint duells_code_format_check check (code ~ '^[0-9]{4}$'),
  constraint duells_content_size_check check (content is null or octet_length(content::text) <= 1048576)
);

-- Wie bei Laufdiktat-Räumen: der Code ist nur unter aktiven (nicht beendeten) Duellen eindeutig.
create unique index duells_active_code_uidx on public.duells (code) where status <> 'ended';
create index duells_status_activity_idx on public.duells (status, last_activity_at);

create table public.duell_participants (
  id            uuid primary key default gen_random_uuid(),
  duell_id      uuid not null references public.duells(id) on delete cascade,
  alias         text not null,
  token_hash    text not null,
  join_order    int not null,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  unique (duell_id, join_order),
  unique (duell_id, token_hash),
  unique (duell_id, alias),
  constraint duell_participants_alias_valid check (length(alias) between 1 and 60 and alias !~ '[[:cntrl:]]'),
  constraint duell_participants_token_hash_valid check (token_hash ~ '^[0-9a-f]{64}$')
);

create index duell_participants_duell_idx on public.duell_participants (duell_id, join_order);

create table public.duell_results (
  id              uuid primary key default gen_random_uuid(),
  duell_id        uuid not null references public.duells(id) on delete cascade,
  participant_id  uuid not null references public.duell_participants(id) on delete cascade,
  word_results    jsonb not null,
  correct_count   int not null check (correct_count >= 0),
  total_count     int not null check (total_count >= 0 and correct_count <= total_count),
  accuracy        int not null check (accuracy between 0 and 100),
  total_time_ms   int not null check (total_time_ms between 0 and 86400000),
  submitted_at    timestamptz not null default now(),
  unique (duell_id, participant_id),
  constraint duell_results_word_results_size_check check (octet_length(word_results::text) <= 1048576)
);

create index duell_results_duell_idx on public.duell_results (duell_id);

-- Kompakte Zusammenfassung der eigenen LernBox (Wort + niedrigster
-- Schreib-Boxwert, keine lokale ID) je Teilnehmer:in -- die Grundlage,
-- damit die/der Ersteller:in bei "Wechselduell"/"schwierige Wörter"/
-- "zufällige Wörter" auch über den eigenen Wortschatz hinaus zusammenstellen
-- kann, ohne dass Geräte direkt aufeinander zugreifen. Wird nur bis zum
-- Feststehen des Inhalts gebraucht (siehe cleanup_abandoned_duells -- die
-- Zeile stirbt automatisch mit dem Duell, kein separates Aufräumen nötig).
create table public.duell_candidate_pools (
  id              uuid primary key default gen_random_uuid(),
  duell_id        uuid not null references public.duells(id) on delete cascade,
  participant_id  uuid not null references public.duell_participants(id) on delete cascade,
  candidates      jsonb not null,
  submitted_at    timestamptz not null default now(),
  unique (duell_id, participant_id),
  constraint duell_candidate_pools_shape_check check (jsonb_typeof(candidates) = 'array' and jsonb_array_length(candidates) <= 500),
  constraint duell_candidate_pools_size_check check (octet_length(candidates::text) <= 1048576)
);

create index duell_candidate_pools_duell_idx on public.duell_candidate_pools (duell_id);

alter table public.duells enable row level security;
alter table public.duell_participants enable row level security;
alter table public.duell_results enable row level security;
alter table public.duell_candidate_pools enable row level security;

create policy duells_deny_direct_access on public.duells
  for all to anon, authenticated using (false) with check (false);
create policy duell_participants_deny_direct_access on public.duell_participants
  for all to anon, authenticated using (false) with check (false);
create policy duell_results_deny_direct_access on public.duell_results
  for all to anon, authenticated using (false) with check (false);
create policy duell_candidate_pools_deny_direct_access on public.duell_candidate_pools
  for all to anon, authenticated using (false) with check (false);

revoke all on table public.duells, public.duell_participants, public.duell_results, public.duell_candidate_pools
  from public, anon, authenticated;

-- Prüft ein Teilnehmertoken gegen genau dieses Duell und liefert dessen
-- Identität zurück -- der einzige Weg, wie eine RPC-Funktion unten "wer bin
-- ich" beantwortet.
create or replace function private.valid_duell_participant(
  p_duell_id uuid,
  p_participant_token text
)
returns table(participant_id uuid, alias text, join_order int)
language sql
stable
security definer
set search_path = public, extensions, pg_catalog
as $$
  select dp.id, dp.alias, dp.join_order
  from public.duell_participants dp
  where dp.duell_id = p_duell_id
    and p_participant_token ~ '^[0-9a-f]{48}$'
    and dp.token_hash = encode(extensions.digest(p_participant_token, 'sha256'), 'hex')
  limit 1;
$$;

revoke all on function private.valid_duell_participant(uuid, text) from public, anon, authenticated;

-- Erzeugt ein neues Duell samt der/dem Ersteller:in als erstem Teilnehmer
-- (join_order 0) -- anders als bei Laufdiktat-Räumen gibt es kein separates
-- Lehrer-Dashboard, das den Raum nur oeffnet, ohne mitzuspielen.
create or replace function public.open_duell_secure(
  p_art text,
  p_alias text,
  p_round_size int default 12
)
returns table (duell_id uuid, code text, participant_token text)
language plpgsql
security definer
set search_path = public, private, extensions, pg_catalog
as $$
declare
  v_code text;
  v_attempt int := 0;
  v_duell_id uuid;
  v_token text;
  v_alias text := trim(p_alias);
begin
  if p_art not in ('herausforderer-stapel', 'wechselduell', 'schwierige-woerter', 'zufaellige-woerter') then
    raise exception 'Ungueltige Duellart';
  end if;
  if p_round_size not between 1 and 50 then
    raise exception 'Ungueltige Rundengroesse';
  end if;
  if length(v_alias) not between 1 and 60 or v_alias ~ '[[:cntrl:]]' then
    raise exception 'Ungueltiger Anzeigename';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
    begin
      insert into public.duells (code, art, round_size)
      values (v_code, p_art, p_round_size)
      returning id into v_duell_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 20 then
        raise exception 'Kein freier Duell-Code nach % Versuchen gefunden', v_attempt;
      end if;
    end;
  end loop;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.duell_participants (duell_id, alias, token_hash, join_order)
  values (v_duell_id, v_alias, encode(extensions.digest(v_token, 'sha256'), 'hex'), 0);

  return query select v_duell_id, v_code, v_token;
end;
$$;

-- Beitritt per Code, geräteweit wiederverwendbar (gleicher Ablauf wie
-- join_room_secure): ein bekannter Teilnehmertoken liefert dieselbe
-- Identität zurück, statt ein zweites Profil anzulegen.
create or replace function public.join_duell_secure(
  p_code text,
  p_alias text,
  p_participant_token text default null
)
returns table (
  duell_id uuid,
  status text,
  art text,
  assigned_alias text,
  join_order int,
  participant_token text
)
language plpgsql
security definer
set search_path = public, private, extensions, pg_catalog
as $$
declare
  v_duell public.duells%rowtype;
  v_participant public.duell_participants%rowtype;
  v_base_alias text := trim(p_alias);
  v_alias text;
  v_token text;
  v_suffix int := 1;
  v_next_order int;
begin
  if p_code !~ '^[0-9]{4}$' then
    return;
  end if;
  if length(v_base_alias) not between 1 and 60 or v_base_alias ~ '[[:cntrl:]]' then
    raise exception 'Ungueltiger Anzeigename';
  end if;

  select * into v_duell from public.duells d where d.code = p_code and d.status = 'lobby' limit 1;
  if not found then return; end if;

  if p_participant_token is not null and p_participant_token ~ '^[0-9a-f]{48}$' then
    select * into v_participant
    from public.duell_participants dp
    where dp.duell_id = v_duell.id
      and dp.token_hash = encode(extensions.digest(p_participant_token, 'sha256'), 'hex')
    limit 1;
    if found then
      update public.duell_participants set last_seen_at = now() where id = v_participant.id;
      return query select v_duell.id, v_duell.status, v_duell.art, v_participant.alias, v_participant.join_order, p_participant_token;
      return;
    end if;
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  loop
    select coalesce(max(dp.join_order), -1) + 1 into v_next_order
    from public.duell_participants dp where dp.duell_id = v_duell.id;
    v_alias := case
      when v_suffix = 1 then v_base_alias
      else left(v_base_alias, 60 - length(v_suffix::text) - 1) || ' ' || v_suffix::text
    end;
    begin
      insert into public.duell_participants (duell_id, alias, token_hash, join_order)
      values (v_duell.id, v_alias, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_next_order)
      returning * into v_participant;
      exit;
    exception when unique_violation then
      v_suffix := v_suffix + 1;
      if v_suffix > 999 then raise exception 'Beitritt derzeit nicht moeglich'; end if;
    end;
  end loop;

  update public.duells set last_activity_at = now() where id = v_duell.id;
  return query select v_duell.id, v_duell.status, v_duell.art, v_participant.alias, v_participant.join_order, v_token;
end;
$$;

-- Lesender Zustand für ein Duell (Art, Status, Rundengröße, sobald
-- festgelegt auch der Inhalt) -- nur für gültige Teilnehmer:innen.
create or replace function public.get_duell_state_secure(
  p_duell_id uuid,
  p_participant_token text
)
returns table(status text, art text, round_size int, content jsonb)
language sql
stable
security definer
set search_path = public, private, pg_catalog
as $$
  select d.status, d.art, d.round_size, d.content
  from public.duells d
  where d.id = p_duell_id
    and exists (select 1 from private.valid_duell_participant(d.id, p_participant_token))
  limit 1;
$$;

-- Teilnehmerliste für die Lobby-Anzeige ("wer ist schon da") -- per Polling
-- gelesen, kein eigener Realtime-Kanal nötig (siehe Kommentar in
-- 20260728120000_participant_heartbeat.sql zur Zuverlässigkeit von Polling
-- gegenüber Presence).
create or replace function public.list_duell_participants_secure(
  p_duell_id uuid,
  p_participant_token text
)
returns table(alias text, join_order int)
language sql
stable
security definer
set search_path = public, private, pg_catalog
as $$
  select dp.alias, dp.join_order
  from public.duell_participants dp
  where dp.duell_id = p_duell_id
    and exists (select 1 from private.valid_duell_participant(p_duell_id, p_participant_token))
  order by dp.join_order;
$$;

-- Jede teilnehmende Person legt hier einmal ihre eigene (kompakt
-- zusammengefasste) Wortübersicht ab -- Grundlage für die
-- Inhalts-Zusammenstellung über die eigenen Wörter der/des Ersteller:in
-- hinaus. Erneutes Absenden ersetzt nur den eigenen Eintrag. Nur vor
-- Rundenbeginn sinnvoll -- danach ist der Inhalt bereits festgelegt.
create or replace function public.submit_duell_candidates_secure(
  p_duell_id uuid,
  p_participant_token text,
  p_candidates jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_participant_id uuid;
begin
  select vp.participant_id into v_participant_id
  from private.valid_duell_participant(p_duell_id, p_participant_token) vp;
  if v_participant_id is null then raise exception 'Ungueltiger Teilnehmertoken'; end if;

  if not exists (select 1 from public.duells where id = p_duell_id and status = 'lobby') then
    raise exception 'Duell ist nicht mehr in der Lobby';
  end if;
  if jsonb_typeof(p_candidates) <> 'array' or jsonb_array_length(p_candidates) > 500 then
    raise exception 'Ungueltige Wortuebersicht';
  end if;
  if octet_length(p_candidates::text) > 1048576 then
    raise exception 'Wortuebersicht zu gross';
  end if;

  insert into public.duell_candidate_pools (duell_id, participant_id, candidates)
  values (p_duell_id, v_participant_id, p_candidates)
  on conflict (duell_id, participant_id) do update
  set candidates = excluded.candidates, submitted_at = now();

  update public.duell_participants set last_seen_at = now() where id = v_participant_id;
end;
$$;

-- Liest alle bisher eingereichten Wortübersichten, geordnet nach
-- Beitrittsreihenfolge -- so kann jede gültige teilnehmende Person (nicht
-- nur die/der Ersteller:in) den Stand nachvollziehen, auch wenn nur sie
-- den Inhalt tatsächlich festlegen darf.
create or replace function public.list_duell_candidate_pools_secure(
  p_duell_id uuid,
  p_participant_token text
)
returns table(join_order int, candidates jsonb)
language sql
stable
security definer
set search_path = public, private, pg_catalog
as $$
  select dp.join_order, cp.candidates
  from public.duell_candidate_pools cp
  join public.duell_participants dp on dp.id = cp.participant_id
  where cp.duell_id = p_duell_id
    and exists (select 1 from private.valid_duell_participant(p_duell_id, p_participant_token))
  order by dp.join_order;
$$;

-- Nur die/der Ersteller:in (join_order 0) darf den Inhalt einmalig
-- festlegen -- danach ist das Duell live und der Inhalt unveränderlich.
create or replace function public.submit_duell_content_secure(
  p_duell_id uuid,
  p_participant_token text,
  p_content jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_participant_id uuid;
  v_join_order int;
begin
  select vp.participant_id, vp.join_order into v_participant_id, v_join_order
  from private.valid_duell_participant(p_duell_id, p_participant_token) vp;
  if v_participant_id is null then raise exception 'Ungueltiger Teilnehmertoken'; end if;
  if v_join_order <> 0 then raise exception 'Nur die Duell-Ersteller:in kann den Inhalt festlegen'; end if;

  if jsonb_typeof(p_content) <> 'array' or jsonb_array_length(p_content) not between 1 and 50 then
    raise exception 'Ungueltige Wortliste';
  end if;
  if octet_length(p_content::text) > 1048576 then
    raise exception 'Wortliste zu gross';
  end if;

  update public.duells
  set content = p_content, status = 'live', started_at = coalesce(started_at, now()), last_activity_at = now()
  where id = p_duell_id and status = 'lobby';

  if not found then raise exception 'Duell ist nicht mehr in der Lobby'; end if;
end;
$$;

-- Ergebnis EINER teilnehmenden Person -- erneutes Absenden (z. B. nach
-- Verbindungsabbruch) überschreibt nur das eigene, nie ein fremdes Ergebnis.
create or replace function public.submit_duell_result_secure(
  p_duell_id uuid,
  p_participant_token text,
  p_word_results jsonb,
  p_correct_count int,
  p_total_count int,
  p_accuracy int,
  p_total_time_ms int
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_participant_id uuid;
begin
  select vp.participant_id into v_participant_id
  from private.valid_duell_participant(p_duell_id, p_participant_token) vp;
  if v_participant_id is null then raise exception 'Ungueltiger Teilnehmertoken'; end if;

  if not exists (select 1 from public.duells where id = p_duell_id and status = 'live') then
    raise exception 'Duell ist nicht aktiv';
  end if;
  if jsonb_typeof(p_word_results) <> 'array' or octet_length(p_word_results::text) > 1048576 then
    raise exception 'Ungueltige Ergebnisliste';
  end if;
  if p_correct_count < 0 or p_total_count < 0 or p_correct_count > p_total_count then
    raise exception 'Ungueltige Zaehlerwerte';
  end if;
  if p_accuracy not between 0 and 100 then raise exception 'Ungueltige Genauigkeit'; end if;
  if p_total_time_ms not between 0 and 86400000 then raise exception 'Ungueltige Dauer'; end if;

  insert into public.duell_results (duell_id, participant_id, word_results, correct_count, total_count, accuracy, total_time_ms)
  values (p_duell_id, v_participant_id, p_word_results, p_correct_count, p_total_count, p_accuracy, p_total_time_ms)
  on conflict (duell_id, participant_id) do update
  set word_results = excluded.word_results,
      correct_count = excluded.correct_count,
      total_count = excluded.total_count,
      accuracy = excluded.accuracy,
      total_time_ms = excluded.total_time_ms,
      submitted_at = now();

  update public.duell_participants set last_seen_at = now() where id = v_participant_id;
  update public.duells set last_activity_at = now() where id = p_duell_id;
end;
$$;

-- Ergebnisliste, sortiert wie im Fachkapitel gefordert: Genauigkeit vor
-- Zeit. Lesbar für jede gültige teilnehmende Person, auch bevor alle
-- abgegeben haben (die Lobby/Ergebnis-Seite pollt einfach erneut).
create or replace function public.get_duell_results_secure(
  p_duell_id uuid,
  p_participant_token text
)
returns table(
  alias text,
  join_order int,
  correct_count int,
  total_count int,
  accuracy int,
  total_time_ms int,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public, private, pg_catalog
as $$
  select dp.alias, dp.join_order, dr.correct_count, dr.total_count, dr.accuracy, dr.total_time_ms, dr.submitted_at
  from public.duell_results dr
  join public.duell_participants dp on dp.id = dr.participant_id
  where dr.duell_id = p_duell_id
    and exists (select 1 from private.valid_duell_participant(p_duell_id, p_participant_token))
  order by dr.accuracy desc, dr.total_time_ms asc;
$$;

-- Aufräumen wie bei den Laufdiktat-Räumen (dieselben Fristen), aber bewusst
-- (noch) nicht per pg_cron terminiert -- erst automatisieren, sobald ein
-- echtes Supabase-Projekt läuft und der Job dort eingerichtet wird
-- (`select cron.schedule('cleanup-abandoned-duells', '*/15 * * * *',
-- 'select public.cleanup_abandoned_duells()');`, analog zum
-- Laufdiktat-Vorbild in 20260710130000_security_hardening_compat.sql).
create or replace function public.cleanup_abandoned_duells()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.duells
  set status = 'ended', ended_at = now()
  where status <> 'ended' and last_activity_at < now() - interval '3 hours';

  delete from public.duells
  where status = 'ended' and coalesce(ended_at, created_at) < now() - interval '24 hours';
end;
$$;

revoke all on function public.cleanup_abandoned_duells() from public, anon, authenticated;
grant execute on function public.cleanup_abandoned_duells() to service_role;

revoke all on function public.open_duell_secure(text, text, int) from public;
revoke all on function public.join_duell_secure(text, text, text) from public;
revoke all on function public.get_duell_state_secure(uuid, text) from public;
revoke all on function public.list_duell_participants_secure(uuid, text) from public;
revoke all on function public.submit_duell_candidates_secure(uuid, text, jsonb) from public;
revoke all on function public.list_duell_candidate_pools_secure(uuid, text) from public;
revoke all on function public.submit_duell_content_secure(uuid, text, jsonb) from public;
revoke all on function public.submit_duell_result_secure(uuid, text, jsonb, int, int, int, int) from public;
revoke all on function public.get_duell_results_secure(uuid, text) from public;

grant execute on function public.open_duell_secure(text, text, int) to anon, authenticated;
grant execute on function public.join_duell_secure(text, text, text) to anon, authenticated;
grant execute on function public.get_duell_state_secure(uuid, text) to anon, authenticated;
grant execute on function public.list_duell_participants_secure(uuid, text) to anon, authenticated;
grant execute on function public.submit_duell_candidates_secure(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.list_duell_candidate_pools_secure(uuid, text) to anon, authenticated;
grant execute on function public.submit_duell_content_secure(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.submit_duell_result_secure(uuid, text, jsonb, int, int, int, int) to anon, authenticated;
grant execute on function public.get_duell_results_secure(uuid, text) to anon, authenticated;
