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
async function room(ip = "192.0.2.20") {
  const teacher = crypto.randomUUID();
  await db.query(
    "insert into private.teacher_pilot_keys(label,token_hash) values('test',encode(extensions.digest($1,'sha256'),'hex'))",
    [teacher],
  );
  return (
    await rpc("select * from public.open_room_secure('{}', $1)", [teacher], ip)
  )[0];
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
    rpc("select * from private.teacher_pilot_keys"),
    /permission denied/,
  );
  await assert.rejects(
    rpc("select private.request_key_hash()"),
    /permission denied/,
  );
});

test("counts rejected teacher keys across committed requests", async () => {
  for (let i = 0; i < 12; i++) {
    assert.deepEqual(
      await rpc(
        "select * from public.open_room_secure('{}',$1)",
        ["wrong-teacher-key"],
        "192.0.2.30",
      ),
      [],
    );
  }
  await assert.rejects(
    rpc(
      "select * from public.open_room_secure('{}',$1)",
      ["wrong-teacher-key"],
      "192.0.2.30",
    ),
    /Zu viele Anfragen/,
  );
  const result = await db.query(
    "select count(*)::int as count from private.request_limits where scope='open_room' and key_hash=encode(extensions.digest('192.0.2.30','sha256'),'hex')",
  );
  assert.equal(result.rows[0].count, 12);
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
  assert.equal(again.assigned_student_key, "Mia");
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
  const result = await db.query(
    "select has_function_privilege('anon', 'public.retrieve_content_transfer_by_qr(uuid,text)', 'execute') as allowed, has_function_privilege('authenticated', 'public.reserve_content_transfer(text,text,bigint,integer)', 'execute') as authenticated_allowed",
  );
  assert.equal(result.rows[0].allowed, true);
  assert.equal(result.rows[0].authenticated_allowed, false);
  assert.deepEqual(
    await rpc(
      "select * from public.retrieve_content_transfer_by_qr($1,'wrong')",
      [transfer.transfer_id],
    ),
    [],
  );
});
