import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

let db;
before(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema extensions;
    set search_path = public, extensions;
    -- Only cron registration is a fixture; RPC bodies and grants run unchanged.
    create schema cron;
    create table cron.job(jobid bigint generated always as identity, jobname text, schedule text, command text);
    create function cron.schedule(text,text,text) returns bigint language sql as $$
      insert into cron.job(jobname,schedule,command) values($1,$2,$3) returning jobid
    $$;
    create function cron.unschedule(bigint) returns boolean language sql as $$
      delete from cron.job where jobid=$1 returning true
    $$;
  `);
  for (const file of (await readdir("supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = (await readFile(`supabase/migrations/${file}`, "utf8")).replace(
      /create extension if not exists pg_cron;/gi,
      "-- Cron registration fixture above.",
    );
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(
        `${file}: ${error.message}; position ${error.position}; ${sql.slice(Number(error.position) - 100, Number(error.position) + 100)}`,
        { cause: error },
      );
    }
  }
});
after(async () => {
  await db?.close();
});

// Each request commits independently, like PostgREST. A surrounding rollback
// would hide the exact failed-attempt bug these tests are intended to catch.
async function rpc(sql, parameters = [], ip = "192.0.2.10") {
  return db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    await tx.query("select set_config('request.headers', $1, true)", [
      JSON.stringify({ "x-forwarded-for": ip }),
    ]);
    return (await tx.query(sql, parameters)).rows;
  });
}

async function rpcAs(role, sql, parameters = [], ip = "192.0.2.10") {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.headers', $1, true)", [
      JSON.stringify({ "x-forwarded-for": ip }),
    ]);
    return (await tx.query(sql, parameters)).rows;
  });
}

async function readyTransfer({
  packageId = `bundle-${crypto.randomUUID()}`,
  contentVersion = 1,
  ttlMinutes = 15,
  ip = "192.0.2.70",
} = {}) {
  const [reservation] = await rpc(
    "select * from public.reserve_content_transfer($1,'1.0.0',$2,$3)",
    [packageId, contentVersion, ttlMinutes],
    ip,
  );
  assert.ok(reservation);

  const [upload] = await rpc(
    "select public.upload_content_transfer($1,$2,$3,$4,$5,$6,$7::jsonb) as accepted",
    [
      reservation.transfer_id,
      reservation.upload_token,
      "encrypted-learning-bundle",
      "nonce-123456",
      "wrapped-qr-key",
      "wrapped-manual-key",
      JSON.stringify({ algorithm: "AES-GCM", version: 1 }),
    ],
    ip,
  );
  assert.equal(upload.accepted, true);
  return reservation;
}
async function room(ip = "192.0.2.20") {
  return (await rpc("select * from public.open_room_secure('{}')", [], ip))[0];
}
const sessionId = "11111111-1111-4111-8111-111111111111";

test("rejects direct table access and private helpers after all migrations", async () => {
  for (const table of [
    "rooms",
    "room_students",
    "room_participants",
    "content_transfers",
  ]) {
    await assert.rejects(
      rpc(`select * from public.${table}`),
      /permission denied/,
    );
  }
  await assert.rejects(
    rpc("select * from private.request_limits"),
    /permission denied/,
  );
  await assert.rejects(
    rpc("select private.request_key_hash()"),
    /permission denied/,
  );
});

test("counts rejected room configurations across committed requests", async () => {
  for (let i = 0; i < 12; i++) {
    assert.deepEqual(
      await rpc(
        "select * from public.open_room_secure($1::jsonb)",
        ["[]"],
        "192.0.2.30",
      ),
      [],
    );
  }
  await assert.rejects(
    rpc(
      "select * from public.open_room_secure($1::jsonb)",
      ["[]"],
      "192.0.2.30",
    ),
    /Zu viele Anfragen/,
  );
  const result = await db.query(
    "select count(*)::int as count from private.request_limits where scope='open_room' and key_hash=encode(extensions.digest('192.0.2.30','sha256'),'hex')",
  );
  assert.equal(result.rows[0].count, 12);
});

test("serializes same-caller rate limits and keeps room codes unique", async () => {
  const [rateLimitFunction] = (
    await db.query(
      `select p.prosrc
       from pg_proc p
       join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='private' and p.proname='enforce_rate_limit'`,
    )
  ).rows;
  assert.match(rateLimitFunction.prosrc, /pg_advisory_xact_lock/);

  const index = (
    await db.query(
      `select indexdef from pg_indexes
       where schemaname='public' and indexname='rooms_active_code_uidx'`,
    )
  ).rows[0];
  assert.match(index.indexdef, /unique/i);
  assert.match(index.indexdef, /status <> 'ended'/);
});

test("counts unknown room codes and preserves valid token-based rejoin", async () => {
  const opened = await room();
  const [joined] = await rpc(
    "select * from public.join_room_secure($1,'Mia')",
    [opened.code],
    "192.0.2.40",
  );
  // Fill the remainder with requests for a syntactically invalid code: also
  // exercises the rejection path without relying on a randomly free code.
  for (let i = 1; i < 600; i++) {
    assert.deepEqual(
      await rpc(
        "select * from public.join_room_secure('xxxx','Mia')",
        [],
        "192.0.2.40",
      ),
      [],
    );
  }
  await assert.rejects(
    rpc(
      "select * from public.join_room_secure('xxxx','Mia')",
      [],
      "192.0.2.40",
    ),
    /Zu viele Anfragen/,
  );
  const [again] = await rpc(
    "select * from public.join_room_secure($1,'Mia',$2)",
    [opened.code, joined.participant_token],
    "192.0.2.40",
  );
  assert.equal(again.participant_token, joined.participant_token);
  assert.equal(again.assigned_student_key, joined.assigned_student_key);
  assert.equal(again.animal_token, null);
  assert.equal(again.animal_number, 0);
  const [missing] = (
    await db.query(
      "select lpad(n::text,4,'0') as code from generate_series(0,9999) n where not exists(select 1 from public.rooms where code=lpad(n::text,4,'0') and status<>'ended') limit 1",
    )
  ).rows;
  assert.deepEqual(
    await rpc(
      "select * from public.join_room_secure($1,'Mia')",
      [missing.code],
      "192.0.2.41",
    ),
    [],
  );
  const { rows } = await db.query(
    "select count(*)::int as n from private.request_limits where scope='join_room' and key_hash=encode(extensions.digest('192.0.2.41','sha256'),'hex')",
  );
  assert.equal(rows[0].n, 1);
});

test("binds animal display metadata to room participants, not submissions", async () => {
  const opened = await room("192.0.2.42");
  const firstToken = "a".repeat(48);
  const secondToken = "b".repeat(48);
  const [first] = await rpc(
    "select * from public.join_room_secure($1,'Fuchs',$2)",
    [opened.code, firstToken],
    "192.0.2.42",
  );
  const [rejoined] = await rpc(
    "select * from public.join_room_secure($1,'Fuchs',$2)",
    [opened.code, first.participant_token],
    "192.0.2.43",
  );
  const [second] = await rpc(
    "select * from public.join_room_secure($1,'Fuchs',$2)",
    [opened.code, secondToken],
    "192.0.2.44",
  );
  const [neutral] = await rpc(
    "select * from public.join_room_secure($1,'Mia',$2)",
    [opened.code, "c".repeat(48)],
    "192.0.2.45",
  );

  assert.equal(first.animal_token, "Fuchs");
  assert.equal(first.animal_number, 1);
  assert.equal(rejoined.assigned_student_key, first.assigned_student_key);
  assert.equal(rejoined.animal_number, 1);
  assert.notEqual(second.assigned_student_key, first.assigned_student_key);
  assert.equal(second.animal_token, "Fuchs");
  assert.equal(second.animal_number, 2);
  assert.equal(neutral.animal_token, null);
  assert.equal(neutral.animal_number, 0);

  await rpc("select public.update_session_secure($1,$2,$3,$4)", [
    opened.room_id,
    opened.access_token,
    sessionId,
    JSON.stringify({ words: [{ id: "house", targetWord: "Haus" }] }),
  ]);
  await rpc(
    "select public.upsert_progress_secure($1,$2,$3,'Fuchs',$4,0,1,0,true)",
    [opened.room_id, sessionId, first.participant_token, 0],
  );
  const [submission] = (
    await db.query(
      "select student_key from public.room_students where room_id=$1",
      [opened.room_id],
    )
  ).rows;
  assert.deepEqual(submission, { student_key: first.assigned_student_key });
});

test("blocks old participant tokens as soon as a room ends", async () => {
  const opened = await room("192.0.2.46");
  const [joined] = await rpc(
    "select * from public.join_room_secure($1,'Fuchs',$2)",
    [opened.code, "d".repeat(48)],
    "192.0.2.46",
  );
  await rpc("select public.end_room_secure($1,$2)", [
    opened.room_id,
    opened.access_token,
  ]);

  assert.deepEqual(
    await rpc("select * from public.get_room_state_secure($1,$2,null)", [
      opened.room_id,
      joined.participant_token,
    ]),
    [],
  );
  assert.deepEqual(
    await rpc(
      "select * from public.join_room_secure($1,'Fuchs',$2)",
      [opened.code, joined.participant_token],
      "192.0.2.47",
    ),
    [],
  );
});

test("saves completion, restores details, and rejects foreign tokens", async () => {
  const opened = await room("192.0.2.50");
  const [joined] = await rpc(
    "select * from public.join_room_secure($1,'Mia')",
    [opened.code],
    "192.0.2.50",
  );
  await rpc("select public.update_session_secure($1,$2,$3,$4)", [
    opened.room_id,
    opened.access_token,
    sessionId,
    JSON.stringify({ words: [{ id: "house", targetWord: "Haus" }] }),
  ]);
  const save =
    "select public.upsert_progress_secure($1,$2,$3,'Mia',$4,1,2,1,true,12000,'{\"house\":1}')";
  await rpc(save, [opened.room_id, sessionId, joined.participant_token, 0]);
  await rpc(save, [opened.room_id, sessionId, joined.participant_token, 0]);
  await assert.rejects(
    rpc(save, [opened.room_id, sessionId, joined.participant_token, 1]),
    /Fortschrittswerte/,
  );
  await assert.rejects(
    rpc(save, [opened.room_id, sessionId, "f".repeat(48), 0]),
    /Teilnehmertoken/,
  );
  const [progress] = await rpc(
    "select * from public.get_my_progress_secure($1,$2,$3)",
    [opened.room_id, sessionId, joined.participant_token],
  );
  assert.deepEqual(progress, {
    current_index: 0,
    peeks: 1,
    attempts: 2,
    errors: 1,
    finished: true,
    duration_ms: 12000,
    word_errors: { house: 1 },
    station_number: null,
  });
  assert.deepEqual(
    await rpc("select * from public.get_my_progress_secure($1,$2,$3)", [
      opened.room_id,
      sessionId,
      "f".repeat(48),
    ]),
    [],
  );
  assert.deepEqual(
    await rpc("select * from public.get_room_students_secure($1,$2)", [
      opened.room_id,
      "wrong",
    ]),
    [],
  );
  const students = await rpc(
    "select * from public.get_room_students_secure($1,$2)",
    [opened.room_id, opened.access_token],
  );
  assert.equal(students.length, 1);
  assert.equal(students[0].finished, true);
});

test("retains the shared station workflow", async () => {
  const opened = await room("192.0.2.60");
  const [joined] = await rpc(
    "select * from public.join_room_secure($1,'Stationgerät')",
    [opened.code],
    "192.0.2.60",
  );
  await rpc("select public.update_session_secure($1,$2,$3,$4)", [
    opened.room_id,
    opened.access_token,
    sessionId,
    JSON.stringify({
      words: [{ id: "one", targetWord: "Haus" }],
      stationMode: true,
      stationCount: 2,
    }),
  ]);
  await rpc(
    "select public.upsert_progress_secure($1,$2,$3,'station-2',0,1,0,0,true,null,null,null,2)",
    [opened.room_id, sessionId, joined.participant_token],
  );
  const [saved] = await rpc(
    "select * from public.get_my_progress_secure($1,$2,$3,'station-2')",
    [opened.room_id, sessionId, joined.participant_token],
  );
  assert.equal(saved.station_number, 2);
  assert.equal(saved.finished, true);
  await assert.rejects(
    rpc(
      "select public.upsert_progress_secure($1,$2,$3,'station-3',0,0,0,0,false,null,null,null,3)",
      [opened.room_id, sessionId, joined.participant_token],
    ),
    /Stationsnummer/,
  );
});

test("restores only the intended transfer capabilities", async () => {
  const [transfer] = await rpc(
    "select * from public.reserve_content_transfer('bundle','1.0.0',1,15)",
  );
  assert.ok(transfer.transfer_id);
  const {
    rows: [privileges],
  } = await db.query(`
    select
      has_function_privilege('anon', 'public.reserve_content_transfer(text,text,bigint,integer)', 'execute') as anon_reserve,
      has_function_privilege('anon', 'public.upload_content_transfer(uuid,text,text,text,text,text,jsonb)', 'execute') as anon_upload,
      has_function_privilege('anon', 'public.retrieve_content_transfer_by_qr(uuid,text)', 'execute') as anon_qr,
      has_function_privilege('anon', 'public.retrieve_content_transfer_by_code(text)', 'execute') as anon_code,
      has_function_privilege('authenticated', 'public.reserve_content_transfer(text,text,bigint,integer)', 'execute') as authenticated_reserve,
      has_function_privilege('authenticated', 'public.upload_content_transfer(uuid,text,text,text,text,text,jsonb)', 'execute') as authenticated_upload,
      has_function_privilege('authenticated', 'public.retrieve_content_transfer_by_qr(uuid,text)', 'execute') as authenticated_qr,
      has_function_privilege('authenticated', 'public.retrieve_content_transfer_by_code(text)', 'execute') as authenticated_code
  `);
  assert.deepEqual(privileges, {
    anon_reserve: true,
    anon_upload: true,
    anon_qr: true,
    anon_code: true,
    authenticated_reserve: false,
    authenticated_upload: false,
    authenticated_qr: false,
    authenticated_code: false,
  });
  assert.deepEqual(
    await rpc(
      "select * from public.retrieve_content_transfer_by_qr($1,'wrong')",
      [transfer.transfer_id],
    ),
    [],
  );
});

test("keeps the encrypted transfer table private and free of learner data", async () => {
  const {
    rows: [security],
  } = await db.query(`
    select relrowsecurity as rls_enabled, relforcerowsecurity as rls_forced
    from pg_class
    where oid = 'public.content_transfers'::regclass
  `);
  assert.deepEqual(security, { rls_enabled: true, rls_forced: true });

  const { rows: policies } = await db.query(
    "select policyname from pg_policies where schemaname='public' and tablename='content_transfers'",
  );
  assert.deepEqual(policies, []);

  const { rows: columns } = await db.query(`
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'content_transfers'
    order by ordinal_position
  `);
  const names = columns.map(({ column_name }) => column_name);
  for (const forbidden of [
    "student_id",
    "membership_id",
    "display_name",
    "learning_progress",
    "answers",
    "errors",
    "due_at",
  ]) {
    assert.equal(names.includes(forbidden), false);
  }

  await assert.rejects(
    rpcAs("authenticated", "select * from public.content_transfers"),
    /permission denied/,
  );
});

test("validates version metadata and the maximum transfer lifetime", async () => {
  for (const [packageId, schemaVersion, contentVersion, ttlMinutes] of [
    ["", "1.0.0", 1, 15],
    ["bundle", "", 1, 15],
    ["bundle", "1.0.0", -1, 15],
    ["bundle", "1.0.0", 1, 14],
    ["bundle", "1.0.0", 1, 1441],
  ]) {
    await assert.rejects(
      rpc(
        "select * from public.reserve_content_transfer($1,$2,$3,$4)",
        [packageId, schemaVersion, contentVersion, ttlMinutes],
        "192.0.2.71",
      ),
      /invalid transfer reservation/,
    );
  }

  const [transfer] = await rpc(
    "select * from public.reserve_content_transfer('versioned-bundle','1.0.0',7,1440)",
    [],
    "192.0.2.72",
  );
  const {
    rows: [stored],
  } = await db.query(
    `select package_id, schema_version, content_version,
      expires_at <= created_at + interval '24 hours' as within_limit
     from public.content_transfers where id=$1`,
    [transfer.transfer_id],
  );
  assert.deepEqual(stored, {
    package_id: "versioned-bundle",
    schema_version: "1.0.0",
    content_version: 7,
    within_limit: true,
  });
});

test("accepts one upload and makes retries unable to replace ciphertext", async () => {
  const reservation = await readyTransfer({
    packageId: "single-upload",
    contentVersion: 2,
    ip: "192.0.2.73",
  });

  const [retry] = await rpc(
    "select public.upload_content_transfer($1,$2,'replacement','nonce-123456','wrapped-qr-key','wrapped-manual-key','{}'::jsonb) as accepted",
    [reservation.transfer_id, reservation.upload_token],
    "192.0.2.73",
  );
  assert.equal(retry.accepted, false);

  const {
    rows: [stored],
  } = await db.query(
    "select ciphertext, status from public.content_transfers where id=$1",
    [reservation.transfer_id],
  );
  assert.deepEqual(stored, {
    ciphertext: "encrypted-learning-bundle",
    status: "ready",
  });
});

test("returns the same versioned ciphertext for repeated authorized retrievals", async () => {
  const reservation = await readyTransfer({
    packageId: "repeatable-retrieval",
    contentVersion: 3,
    ip: "192.0.2.74",
  });
  const query = "select * from public.retrieve_content_transfer_by_qr($1,$2)";

  const first = await rpc(
    query,
    [reservation.transfer_id, reservation.retrieval_token],
    "192.0.2.74",
  );
  const repeated = await rpc(
    query,
    [reservation.transfer_id, reservation.retrieval_token],
    "192.0.2.75",
  );
  assert.deepEqual(repeated, first);
  assert.deepEqual(first, [
    {
      package_id: "repeatable-retrieval",
      schema_version: "1.0.0",
      content_version: 3,
      ciphertext: "encrypted-learning-bundle",
      nonce: "nonce-123456",
      wrapped_key: "wrapped-qr-key",
      crypto_metadata: { algorithm: "AES-GCM", version: 1 },
      expires_at: reservation.expires_at,
    },
  ]);

  assert.deepEqual(
    await rpc(query, [reservation.transfer_id, "x".repeat(32)]),
    [],
  );
});

test("locks manual retrieval after repeated unauthorized attempts", async () => {
  const reservation = await readyTransfer({
    packageId: "manual-lockout",
    ip: "192.0.2.76",
  });
  const locator = reservation.manual_transfer_code.slice(0, 9);
  const wrongCode = `${locator}ZZZZ-ZZZZ-ZZZZ-ZZZZ`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.deepEqual(
      await rpc(
        "select * from public.retrieve_content_transfer_by_code($1)",
        [wrongCode],
        "192.0.2.76",
      ),
      [],
    );
  }
  assert.deepEqual(
    await rpc(
      "select * from public.retrieve_content_transfer_by_code($1)",
      [reservation.manual_transfer_code],
      "192.0.2.76",
    ),
    [],
  );

  const {
    rows: [locked],
  } = await db.query(
    "select failed_attempts, locked_until > statement_timestamp() as locked from public.content_transfers where id=$1",
    [reservation.transfer_id],
  );
  assert.deepEqual(locked, { failed_attempts: 5, locked: true });
});

test("makes expired transfers unreadable and deletes them with the scheduled cleanup", async () => {
  const reservation = await readyTransfer({
    packageId: "expired-bundle",
    ip: "192.0.2.77",
  });
  await db.query(
    `update public.content_transfers
     set created_at=statement_timestamp()-interval '1 hour',
         expires_at=statement_timestamp()-interval '1 second'
     where id=$1`,
    [reservation.transfer_id],
  );

  assert.deepEqual(
    await rpc("select * from public.retrieve_content_transfer_by_qr($1,$2)", [
      reservation.transfer_id,
      reservation.retrieval_token,
    ]),
    [],
  );
  assert.deepEqual(
    await rpc("select * from public.retrieve_content_transfer_by_code($1)", [
      reservation.manual_transfer_code,
    ]),
    [],
  );

  const {
    rows: [job],
  } = await db.query(
    "select schedule, command from cron.job where jobname='delete-expired-content-transfers'",
  );
  assert.equal(job.schedule, "17 * * * *");
  assert.match(job.command, /delete from public\.content_transfers/);
  await db.exec(job.command);
  const {
    rows: [remaining],
  } = await db.query(
    "select count(*)::int as count from public.content_transfers where id=$1",
    [reservation.transfer_id],
  );
  assert.equal(remaining.count, 0);
});
