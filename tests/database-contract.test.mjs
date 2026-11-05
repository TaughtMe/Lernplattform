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

async function battleRoom(ip) {
  const opened = await room(ip);
  const members = [];
  for (const animal of ["Fuchs", "Hase", "Igel"]) {
    members.push(
      (
        await rpc(
          "select * from public.join_room_secure($1,$2)",
          [opened.code, animal],
          ip,
        )
      )[0],
    );
  }
  await rpc("select public.update_session_secure($1,$2,$3,$4)", [
    opened.room_id,
    opened.access_token,
    "22222222-2222-4222-8222-222222222222",
    JSON.stringify({
      words: [{ id: "word", targetWord: "Haus" }],
      gameMode: "BATTLE",
      battleOptions: { ink: true, flicker: false },
    }),
  ]);
  return { ...opened, members };
}

const activityQuery =
  "select public.get_room_activity_secure($1,$2,$3,$4) as activity";
const attackQuery =
  "select public.send_room_attack_secure($1,$2,$3,$4,$5) as accepted";

test("authorizes peer reads by room and current session, without leaking result details", async () => {
  const first = await battleRoom("192.0.2.110");
  const other = await battleRoom("192.0.2.111");
  const member = first.members[0];
  const args = [
    first.room_id,
    member.participant_token,
    "22222222-2222-4222-8222-222222222222",
    0,
  ];
  const [{ activity }] = await rpc(activityQuery, args);
  assert.equal(activity.peers.length, 3);
  assert.deepEqual(Object.keys(activity.peers[0]).sort(), [
    "animal",
    "index",
    "key",
    "number",
  ]);
  assert.deepEqual(activity.attacks, []);
  for (const token of [
    null,
    "wrong",
    "f".repeat(48),
    first.access_token,
    other.members[0].participant_token,
  ]) {
    await assert.rejects(
      rpc(activityQuery, [
        first.room_id,
        token,
        "22222222-2222-4222-8222-222222222222",
        0,
      ]),
      /Ungueltige Raumteilnahme/,
    );
  }
  await assert.rejects(
    rpc(activityQuery, [
      first.room_id,
      member.participant_token,
      "old-session",
      0,
    ]),
    /Ungueltige Raumteilnahme/,
  );
  // A participant capability cannot become the teacher's access capability.
  assert.deepEqual(
    await rpc("select * from public.get_room_participants_secure($1,$2)", [
      first.room_id,
      member.participant_token,
    ]),
    [],
  );
  assert.deepEqual(
    await rpc("select * from public.get_room_students_secure($1,$2)", [
      first.room_id,
      member.participant_token,
    ]),
    [],
  );
  await assert.rejects(
    rpc("select public.end_room_secure($1,$2)", [
      first.room_id,
      member.participant_token,
    ]),
  );
  await assert.rejects(
    rpc("select * from private.room_attacks"),
    /permission denied/,
  );
  await assert.rejects(
    rpcAs("authenticated", activityQuery, args),
    /permission denied/,
  );
});

test("binds attacks to the token owner and recipient, rejects spoofing and limits repeated sends", async () => {
  const opened = await battleRoom("192.0.2.112");
  const [sender, target, observer] = opened.members;
  const attack = [
    opened.room_id,
    sender.participant_token,
    "22222222-2222-4222-8222-222222222222",
    target.assigned_student_key,
    "ink",
  ];
  for (const token of [null, "wrong", opened.access_token]) {
    await assert.rejects(
      rpc(attackQuery, [opened.room_id, token, ...attack.slice(2)]),
      /Ungueltige Raumteilnahme/,
    );
  }
  for (const [session, recipient, type] of [
    ["old-session", target.assigned_student_key, "ink"],
    ["22222222-2222-4222-8222-222222222222", "foreign-participant", "ink"],
    [
      "22222222-2222-4222-8222-222222222222",
      sender.assigned_student_key,
      "ink",
    ],
    [
      "22222222-2222-4222-8222-222222222222",
      target.assigned_student_key,
      "flicker",
    ],
    [
      "22222222-2222-4222-8222-222222222222",
      target.assigned_student_key,
      "unknown",
    ],
  ]) {
    assert.equal(
      (
        await rpc(attackQuery, [
          opened.room_id,
          sender.participant_token,
          session,
          recipient,
          type,
        ])
      )[0].accepted,
      false,
    );
  }
  assert.equal((await rpc(attackQuery, attack))[0].accepted, true);
  assert.equal((await rpc(attackQuery, attack))[0].accepted, false);
  const [{ activity }] = await rpc(activityQuery, [
    opened.room_id,
    target.participant_token,
    "22222222-2222-4222-8222-222222222222",
    0,
  ]);
  assert.equal(activity.attacks.length, 1);
  assert.equal(activity.attacks[0].from, "Fuchs");
  assert.equal(activity.attacks[0].type, "ink");
  assert.deepEqual(
    (
      await rpc(activityQuery, [
        opened.room_id,
        observer.participant_token,
        "22222222-2222-4222-8222-222222222222",
        0,
      ])
    )[0].activity.attacks,
    [],
  );
  assert.deepEqual(
    (
      await rpc(activityQuery, [
        opened.room_id,
        target.participant_token,
        "22222222-2222-4222-8222-222222222222",
        activity.attacks[0].id,
      ])
    )[0].activity.attacks,
    [],
  );
  // There is no RPC argument for a caller-supplied sender or label.
  await assert.rejects(
    rpc(
      "select public.send_room_attack_secure(p_room_id => $1, p_participant_token => $2, p_session_id => $3, p_target => $4, p_type => $5, p_from => 'Hase')",
      attack,
    ),
    /does not exist/,
  );
});

test("derives room/practice presence from the capability and stops access at removal, end and expiry", async () => {
  const opened = await battleRoom("192.0.2.113");
  const [first, second, third] = opened.members;
  await rpc(
    "select public.touch_participant_activity_secure($1,$2,'practice')",
    [opened.room_id, first.participant_token],
  );
  const participants = await rpc(
    "select * from public.get_room_participants_secure($1,$2)",
    [opened.room_id, opened.access_token],
  );
  assert.equal(
    participants.find((p) => p.student_key === first.assigned_student_key)
      .activity,
    "practice",
  );
  assert.equal(
    participants.find((p) => p.student_key === second.assigned_student_key)
      .activity,
    "room",
  );
  await assert.rejects(
    rpc("select public.touch_participant_activity_secure($1,$2,'teacher')", [
      opened.room_id,
      first.participant_token,
    ]),
    /Ungueltige Raumteilnahme/,
  );
  await rpc("select public.remove_room_participant_secure($1,$2,$3)", [
    opened.room_id,
    opened.access_token,
    first.assigned_student_key,
  ]);
  await assert.rejects(
    rpc(activityQuery, [
      opened.room_id,
      first.participant_token,
      "22222222-2222-4222-8222-222222222222",
      0,
    ]),
    /Ungueltige Raumteilnahme/,
  );
  await backdateRoom(opened.room_id, 121);
  await assert.rejects(
    rpc(activityQuery, [
      opened.room_id,
      second.participant_token,
      "22222222-2222-4222-8222-222222222222",
      0,
    ]),
    /Ungueltige Raumteilnahme/,
  );
  await assert.rejects(
    rpc(attackQuery, [
      opened.room_id,
      second.participant_token,
      "22222222-2222-4222-8222-222222222222",
      third.assigned_student_key,
      "ink",
    ]),
    /Ungueltige Raumteilnahme/,
  );
  await assert.rejects(
    rpc("select public.touch_participant_activity_secure($1,$2,'room')", [
      opened.room_id,
      second.participant_token,
    ]),
    /Ungueltige Raumteilnahme/,
  );
  await backdateRoom(opened.room_id, 1);
  await rpc("select public.end_room_secure($1,$2)", [
    opened.room_id,
    opened.access_token,
  ]);
  await assert.rejects(
    rpc(activityQuery, [
      opened.room_id,
      second.participant_token,
      "22222222-2222-4222-8222-222222222222",
      0,
    ]),
    /Ungueltige Raumteilnahme/,
  );
  await assert.rejects(
    rpc(attackQuery, [
      opened.room_id,
      second.participant_token,
      "22222222-2222-4222-8222-222222222222",
      third.assigned_student_key,
      "ink",
    ]),
    /Ungueltige Raumteilnahme/,
  );
});
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

test("stores the first wrong math answers for the teacher and keeps old calls working", async () => {
  const opened = await room("192.0.2.61");
  const [joined] = await rpc(
    "select * from public.join_room_secure($1,'Mia')",
    [opened.code],
    "192.0.2.61",
  );
  await rpc("select public.update_session_secure($1,$2,$3,$4)", [
    opened.room_id,
    opened.access_token,
    sessionId,
    JSON.stringify({
      words: [
        { id: "m1", kind: "math", prompt: "7 · 8 = _", targetWord: "56" },
        { id: "m2", prompt: "12 + 9 = _", targetWord: "21" },
        { id: "v1", kind: "vocabulary", prompt: "Haus", targetWord: "house" },
        { id: "t1", targetWord: "Schule" },
      ],
    }),
  ]);
  const base = [opened.room_id, sessionId, joined.participant_token];
  const teacherRows = () =>
    rpc("select * from public.get_room_students_secure($1,$2)", [
      opened.room_id,
      opened.access_token,
    ]);

  // Neuer Client: 14. Argument, erste falsche Antwort je Aufgabe.
  const write =
    "select public.upsert_progress_secure($1,$2,$3,'Mia',$4,0,1,1,false,null,$5,null,null,$6)";
  await rpc(write, [
    ...base,
    0,
    JSON.stringify({ "7 · 8 = _": 1 }),
    JSON.stringify({ "7 · 8 = _": "48" }),
  ]);
  assert.deepEqual((await teacherRows())[0].first_wrong_answers, {
    "7 · 8 = _": "48",
  });

  // Die erste Antwort bleibt, auch wenn ein anderes Gerät eine spätere sendet.
  await rpc(write, [
    ...base,
    1,
    JSON.stringify({ "7 · 8 = _": 2, "12 + 9 = _": 1 }),
    JSON.stringify({ "7 · 8 = _": "54", "12 + 9 = _": "3" }),
  ]);
  assert.deepEqual((await teacherRows())[0].first_wrong_answers, {
    "7 · 8 = _": "48",
    "12 + 9 = _": "3",
  });

  // Alter Client (0.9.4): 13 Argumente positional und benannt, ohne das Feld.
  await rpc(
    "select public.upsert_progress_secure($1,$2,$3,'Mia',$4,1,3,2,true,9000,'{\"7 · 8 = _\":3}')",
    [...base, 1],
  );
  await rpc(
    `select public.upsert_progress_secure(p_room_id => $1, p_session_id => $2,
       p_participant_token => $3, p_student_key => 'Mia', p_current_index => 1,
       p_peeks => 1, p_attempts => 4, p_errors => 3, p_finished => true,
       p_duration_ms => 9500, p_word_errors => '{"7 · 8 = _":3}',
       p_app_version => 'lernraum-0.9.4', p_station_number => null)`,
    base,
  );
  const [row] = await teacherRows();
  assert.equal(row.attempts, 4);
  assert.equal(row.finished, true);
  assert.deepEqual(row.first_wrong_answers, {
    "7 · 8 = _": "48",
    "12 + 9 = _": "3",
  });

  // Der neue Zeilentyp hat nur eine Signatur (keine mehrdeutige Überladung).
  const [{ count }] = (
    await db.query(
      "select count(*)::int as count from pg_proc where proname='upsert_progress_secure'",
    )
  ).rows;
  assert.equal(count, 1);

  // Grenzen: Länge, Typ, Anzahl, nur Mathe-Aufgaben des Raums.
  const rejected = (answers, index = 1) =>
    assert.rejects(
      rpc(write, [...base, index, "{}", JSON.stringify(answers)]),
      /Antwortstatistik/,
    );
  await rejected({ "7 · 8 = _": "x".repeat(33) });
  await rejected({ "7 · 8 = _": 48 });
  await rejected(["48"]);
  await rejected({ Haus: "house" });
  await rejected({ Schule: "Schule" });
  await rejected({ "99 + 1 = _": "2" });
  await rejected({
    "7 · 8 = _": "1",
    "12 + 9 = _": "2",
    "1 + 1 = _": "3",
    "2 + 2 = _": "4",
    "3 + 3 = _": "5",
  });
  await rpc(write, [
    ...base,
    1,
    "{}",
    JSON.stringify({ "7 · 8 = _": "ä".repeat(32) }),
  ]);
  assert.equal((await teacherRows())[0].first_wrong_answers["7 · 8 = _"], "48");
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

async function backdateRoom(roomId, minutes) {
  await db.query(
    `update public.rooms
     set created_at=now()-($2::int * interval '1 minute'),
         last_activity_at=now()
     where id=$1`,
    [roomId, minutes],
  );
}

test("keeps the room time limits in the migration and the TypeScript constants identical", async () => {
  const limits = await readFile(
    "src/integrations/laufdiktat/room-limits.ts",
    "utf8",
  );
  const joinMinutes = Number(
    limits.match(/ROOM_JOIN_WINDOW_MINUTES\s*=\s*(\d+)/)?.[1],
  );
  const maxMinutes = Number(limits.match(/ROOM_MAX_MINUTES\s*=\s*(\d+)/)?.[1]);
  assert.equal(joinMinutes, 90);
  assert.equal(maxMinutes, 120);
  const migration = await readFile(
    "supabase/migrations/20261003120000_room_time_limits.sql",
    "utf8",
  );
  assert.ok(
    migration.includes(`now() - interval '${joinMinutes} minutes'`),
    "join window in migration",
  );
  assert.ok(
    migration.includes(`now()-interval '${maxMinutes} minutes'`),
    "closing limit in migration",
  );
});

test("accepts new joins within 90 minutes and rejects them afterwards", async () => {
  const opened = await room("192.0.2.90");
  await backdateRoom(opened.room_id, 89);
  const [early] = await rpc(
    "select * from public.join_room_secure($1,'Fuchs')",
    [opened.code],
    "192.0.2.91",
  );
  assert.equal(early.room_id, opened.room_id);

  await backdateRoom(opened.room_id, 91);
  assert.deepEqual(
    await rpc(
      "select * from public.join_room_secure($1,'Fuchs')",
      [opened.code],
      "192.0.2.92",
    ),
    [],
  );
  // The answer looks like an unknown code and still counts against the limit.
  const { rows } = await db.query(
    "select count(*)::int as n from private.request_limits where scope='join_room' and key_hash=encode(extensions.digest('192.0.2.92','sha256'),'hex')",
  );
  assert.equal(rows[0].n, 1);
});

test("lets a joined device return with its token after the join window", async () => {
  const opened = await room("192.0.2.93");
  const [joined] = await rpc(
    "select * from public.join_room_secure($1,'Mia')",
    [opened.code],
    "192.0.2.94",
  );
  await backdateRoom(opened.room_id, 100);
  const [again] = await rpc(
    "select * from public.join_room_secure($1,'Mia',$2)",
    [opened.code, joined.participant_token],
    "192.0.2.94",
  );
  assert.equal(again.participant_token, joined.participant_token);
  assert.equal(again.assigned_student_key, joined.assigned_student_key);
  // A second device without a token is turned away.
  assert.deepEqual(
    await rpc(
      "select * from public.join_room_secure($1,'Mia')",
      [opened.code],
      "192.0.2.95",
    ),
    [],
  );
});

test("closes rooms 120 minutes after opening and keeps younger rooms open", async () => {
  const old = await room("192.0.2.96");
  const young = await room("192.0.2.97");
  const [joined] = await rpc(
    "select * from public.join_room_secure($1,'Mia')",
    [old.code],
    "192.0.2.98",
  );
  await backdateRoom(old.room_id, 121);
  await backdateRoom(young.room_id, 119);

  const {
    rows: [job],
  } = await db.query(
    "select schedule, command from cron.job where jobname='cleanup-abandoned-rooms'",
  );
  assert.equal(job.schedule, "*/5 * * * *");
  await rpcAs("service_role", job.command);

  const { rows } = await db.query(
    "select id, status, ended_at is not null as has_end from public.rooms where id = any($1)",
    [[old.room_id, young.room_id]],
  );
  const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
  assert.equal(byId[old.room_id].status, "ended");
  assert.equal(byId[old.room_id].has_end, true);
  assert.notEqual(byId[young.room_id].status, "ended");

  // Students see the same signals as after an end by the teacher: the state
  // is "ended" and the participant token no longer opens the room.
  assert.deepEqual(
    await rpc("select * from public.get_room_state_secure($1,$2,null)", [
      old.room_id,
      joined.participant_token,
    ]),
    [],
  );
  assert.equal(
    (
      await rpc("select * from public.get_room_state_secure($1,null,$2)", [
        old.room_id,
        old.access_token,
      ])
    )[0].status,
    "ended",
  );
});
