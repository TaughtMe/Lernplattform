-- Lernraum stores only short-lived ciphertext in Supabase. Plaintext learning
-- content, student identities and personal learning state never enter this table.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.content_transfers (
  id uuid primary key default gen_random_uuid(),
  locator text not null unique
    check (locator ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$'),
  package_id text not null check (char_length(package_id) between 1 and 200),
  schema_version text not null
    check (char_length(schema_version) between 1 and 30),
  content_version bigint not null check (content_version >= 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'ready')),
  ciphertext text,
  nonce text,
  wrapped_key_qr text,
  wrapped_key_manual text,
  crypto_metadata jsonb,
  upload_token_hash bytea not null unique,
  retrieval_token_hash bytea not null unique,
  manual_code_hash bytea not null,
  failed_attempts smallint not null default 0
    check (failed_attempts between 0 and 5),
  attempt_window_started_at timestamptz,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint content_transfers_expiry_check check (
    expires_at > created_at
    and expires_at <= created_at + interval '24 hours'
  ),
  constraint content_transfers_ready_payload_check check (
    status = 'reserved'
    or (
      ciphertext is not null
      and nonce is not null
      and wrapped_key_qr is not null
      and wrapped_key_manual is not null
      and crypto_metadata is not null
      and jsonb_typeof(crypto_metadata) = 'object'
    )
  )
);

comment on table public.content_transfers is
  'Encrypted LearningBundle hand-off records; automatically removed after at most 24 hours.';
comment on column public.content_transfers.ciphertext is
  'Client-side encrypted LearningBundle. Supabase never receives the plaintext.';
comment on column public.content_transfers.failed_attempts is
  'Aggregate room-level manual-code failures only; never linked to a student.';

create index content_transfers_expires_at_idx
  on public.content_transfers (expires_at);

alter table public.content_transfers enable row level security;
alter table public.content_transfers force row level security;

-- The table itself is never a public API. All access goes through the four
-- capability-checked functions below. No permissive RLS policy is created.
revoke all on table public.content_transfers
  from public, anon, authenticated;

create or replace function private.random_readable_code(p_length integer)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_result text := '';
  v_index integer;
begin
  if p_length < 1 or p_length > 128 then
    raise exception 'invalid code length' using errcode = '22023';
  end if;

  for v_index in 1..p_length loop
    v_result := v_result || substr(
      v_alphabet,
      (get_byte(extensions.gen_random_bytes(1), 0) % char_length(v_alphabet)) + 1,
      1
    );
  end loop;

  return v_result;
end;
$$;

create or replace function private.base64url(p_value bytea)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select rtrim(translate(encode(p_value, 'base64'), '+/', '-_'), '=');
$$;

revoke execute on function private.random_readable_code(integer) from public;
revoke execute on function private.base64url(bytea) from public;

create or replace function public.reserve_content_transfer(
  p_package_id text,
  p_schema_version text,
  p_content_version bigint,
  p_ttl_minutes integer default 1440
)
returns table (
  transfer_id uuid,
  upload_token text,
  retrieval_token text,
  manual_transfer_code text,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_locator text;
  v_manual_secret text;
  v_upload_token text;
  v_retrieval_token text;
  v_transfer_id uuid;
  v_attempt integer := 0;
begin
  if p_package_id is null
    or char_length(btrim(p_package_id)) not between 1 and 200
    or p_schema_version is null
    or char_length(btrim(p_schema_version)) not between 1 and 30
    or p_content_version is null
    or p_content_version < 0
    or p_ttl_minutes is null
    or p_ttl_minutes not between 15 and 1440
  then
    raise exception 'invalid transfer reservation' using errcode = '22023';
  end if;

  v_manual_secret := private.random_readable_code(16);
  v_upload_token := private.base64url(extensions.gen_random_bytes(32));
  v_retrieval_token := private.base64url(extensions.gen_random_bytes(32));

  loop
    v_attempt := v_attempt + 1;
    v_locator := private.random_readable_code(8);

    begin
      insert into public.content_transfers (
        locator,
        package_id,
        schema_version,
        content_version,
        upload_token_hash,
        retrieval_token_hash,
        manual_code_hash,
        created_at,
        expires_at
      ) values (
        v_locator,
        btrim(p_package_id),
        btrim(p_schema_version),
        p_content_version,
        extensions.digest(v_upload_token, 'sha256'),
        extensions.digest(v_retrieval_token, 'sha256'),
        extensions.digest(v_manual_secret, 'sha256'),
        v_now,
        v_now + make_interval(mins => p_ttl_minutes)
      )
      returning id into v_transfer_id;

      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        raise exception 'could not allocate transfer capability';
      end if;
    end;
  end loop;

  return query select
    v_transfer_id,
    v_upload_token,
    v_retrieval_token,
    concat(
      substr(v_locator, 1, 4), '-', substr(v_locator, 5, 4), '-',
      substr(v_manual_secret, 1, 4), '-', substr(v_manual_secret, 5, 4), '-',
      substr(v_manual_secret, 9, 4), '-', substr(v_manual_secret, 13, 4)
    ),
    v_now + make_interval(mins => p_ttl_minutes);
end;
$$;

create or replace function public.upload_content_transfer(
  p_transfer_id uuid,
  p_upload_token text,
  p_ciphertext text,
  p_nonce text,
  p_wrapped_key_qr text,
  p_wrapped_key_manual text,
  p_crypto_metadata jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_transfer_id is null
    or p_upload_token is null
    or char_length(p_upload_token) not between 32 and 128
    or p_ciphertext is null
    or octet_length(p_ciphertext) not between 1 and 10485760
    or p_nonce is null
    or char_length(p_nonce) not between 8 and 512
    or p_wrapped_key_qr is null
    or char_length(p_wrapped_key_qr) not between 8 and 2048
    or p_wrapped_key_manual is null
    or char_length(p_wrapped_key_manual) not between 8 and 2048
    or p_crypto_metadata is null
    or jsonb_typeof(p_crypto_metadata) <> 'object'
    or pg_column_size(p_crypto_metadata) > 4096
  then
    raise exception 'invalid encrypted payload' using errcode = '22023';
  end if;

  update public.content_transfers
  set status = 'ready',
      ciphertext = p_ciphertext,
      nonce = p_nonce,
      wrapped_key_qr = p_wrapped_key_qr,
      wrapped_key_manual = p_wrapped_key_manual,
      crypto_metadata = p_crypto_metadata,
      upload_token_hash = extensions.digest(
        private.base64url(extensions.gen_random_bytes(32)),
        'sha256'
      )
  where id = p_transfer_id
    and status = 'reserved'
    and expires_at > statement_timestamp()
    and upload_token_hash = extensions.digest(p_upload_token, 'sha256');

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.retrieve_content_transfer_by_qr(
  p_transfer_id uuid,
  p_retrieval_token text
)
returns table (
  package_id text,
  schema_version text,
  content_version bigint,
  ciphertext text,
  nonce text,
  wrapped_key text,
  crypto_metadata jsonb,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    transfer.package_id,
    transfer.schema_version,
    transfer.content_version,
    transfer.ciphertext,
    transfer.nonce,
    transfer.wrapped_key_qr,
    transfer.crypto_metadata,
    transfer.expires_at
  from public.content_transfers as transfer
  where transfer.id = p_transfer_id
    and transfer.status = 'ready'
    and transfer.expires_at > statement_timestamp()
    and p_retrieval_token is not null
    and char_length(p_retrieval_token) between 32 and 128
    and transfer.retrieval_token_hash = extensions.digest(p_retrieval_token, 'sha256');
$$;

create or replace function public.retrieve_content_transfer_by_code(
  p_transfer_code text
)
returns table (
  package_id text,
  schema_version text,
  content_version bigint,
  ciphertext text,
  nonce text,
  wrapped_key text,
  crypto_metadata jsonb,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_normalized text;
  v_locator text;
  v_manual_secret text;
  v_transfer public.content_transfers%rowtype;
  v_now timestamptz := statement_timestamp();
begin
  v_normalized := upper(regexp_replace(coalesce(p_transfer_code, ''), '[^A-Z0-9]', '', 'g'));
  if char_length(v_normalized) <> 24 then
    return;
  end if;

  v_locator := substr(v_normalized, 1, 8);
  v_manual_secret := substr(v_normalized, 9, 16);

  select transfer.*
  into v_transfer
  from public.content_transfers as transfer
  where transfer.locator = v_locator
  for update;

  if not found
    or v_transfer.status <> 'ready'
    or v_transfer.expires_at <= v_now
    or (v_transfer.locked_until is not null and v_transfer.locked_until > v_now)
  then
    return;
  end if;

  if v_transfer.manual_code_hash <> extensions.digest(v_manual_secret, 'sha256') then
    update public.content_transfers
    set failed_attempts = case
          when attempt_window_started_at is null
            or attempt_window_started_at <= v_now - interval '15 minutes'
          then 1
          else least(failed_attempts + 1, 5)
        end,
        attempt_window_started_at = case
          when attempt_window_started_at is null
            or attempt_window_started_at <= v_now - interval '15 minutes'
          then v_now
          else attempt_window_started_at
        end,
        locked_until = case
          when (
            case
              when attempt_window_started_at is null
                or attempt_window_started_at <= v_now - interval '15 minutes'
              then 1
              else failed_attempts + 1
            end
          ) >= 5
          then v_now + interval '15 minutes'
          else null
        end
    where id = v_transfer.id;
    return;
  end if;

  update public.content_transfers
  set failed_attempts = 0,
      attempt_window_started_at = null,
      locked_until = null
  where id = v_transfer.id;

  return query select
    v_transfer.package_id,
    v_transfer.schema_version,
    v_transfer.content_version,
    v_transfer.ciphertext,
    v_transfer.nonce,
    v_transfer.wrapped_key_manual,
    v_transfer.crypto_metadata,
    v_transfer.expires_at;
end;
$$;

revoke execute on function public.reserve_content_transfer(text, text, bigint, integer)
  from public;
revoke execute on function public.upload_content_transfer(uuid, text, text, text, text, text, jsonb)
  from public;
revoke execute on function public.retrieve_content_transfer_by_qr(uuid, text)
  from public;
revoke execute on function public.retrieve_content_transfer_by_code(text)
  from public;

grant execute on function public.reserve_content_transfer(text, text, bigint, integer)
  to anon, authenticated;
grant execute on function public.upload_content_transfer(uuid, text, text, text, text, text, jsonb)
  to anon, authenticated;
grant execute on function public.retrieve_content_transfer_by_qr(uuid, text)
  to anon, authenticated;
grant execute on function public.retrieve_content_transfer_by_code(text)
  to anon, authenticated;

select cron.schedule(
  'delete-expired-content-transfers',
  '17 * * * *',
  $$delete from public.content_transfers where expires_at <= statement_timestamp()$$
);
