import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { createPersonalLearningBackup } from "../domain/personal-backup";
import { TEXTBOX_TEXTS } from "../domain/textbox-library";
import {
  buildBlankingPlan,
  finishMemorize,
  nextRound,
  sessionFromRun,
  startRun,
  submitRound,
  type TextboxSession,
} from "../domain/textbox-session";
import {
  exportPersonalLearningBackup,
  restorePersonalLearningBackup,
  restorePersonalLearningBackupText,
  serializePersonalLearningBackupFromDatabase,
} from "./personal-backup";
import {
  createTextboxRepository,
  PersonalLearningDatabase,
} from "./personal-learning-events";

const databases: PersonalLearningDatabase[] = [];
const text = TEXTBOX_TEXTS[0]!;

function createDatabase() {
  const database = new PersonalLearningDatabase(
    `textbox-${crypto.randomUUID()}`,
  );
  databases.push(database);
  return database;
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async (database) => {
      database.close();
      await database.delete();
    }),
  );
});

const t0 = "2026-10-08T08:00:00.000Z";
const t1 = "2026-10-08T08:10:00.000Z";

/** Eine Einheit nach `rounds` abgegebenen Durchgängen; nach 4 ist sie abgeschlossen. */
function makeSession(
  id: string,
  rounds: 1 | 4,
  textId = text.id,
): TextboxSession {
  let state = startRun(text, id);
  for (let round = 1; round <= rounds; round += 1) {
    state = finishMemorize(state, 100);
    const gaps = buildBlankingPlan(text, state.seed)[round - 1]!.size;
    state = submitRound(
      state,
      text,
      round === 4 ? text.text : Array.from({ length: gaps }, () => ""),
      100,
    );
    if (rounds === 4) state = nextRound(state);
  }
  return { ...sessionFromRun(state, text, { startedAt: t0, now: t1 }), textId };
}

describe("Migration auf Version 5", () => {
  it("behält alle bisherigen Daten", async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(4).stores({
      learningEvents: "id, learningObjectId, occurredAt, roundId",
      learningBoxDecks:
        "id, title, createdAt, folderId, source.kind, source.sourceId",
      learningBoxCards:
        "id, deckId, fingerprint, [deckId+fingerprint], nextReview, reverseNextReview, createdAt, source.kind, source.sourceId",
      learningBoxFolders: "id, title, createdAt",
      learningWordProgress: "id, dueAt, stage, box, lastPracticedAt",
      typingProgress: "id, completed, lastPracticedAt",
    });
    await old.table("typingProgress").add({
      id: "lesson-1",
      completed: true,
      bestWpm: 20,
      bestAccuracy: 95,
      attempts: 2,
      lastPracticedAt: t0,
      problemChars: [],
    });
    await old.table("learningWordProgress").add({
      id: "Haus",
      word: "Haus",
      stage: 1,
      box: 1,
      dueAt: t0,
      attempts: 1,
      incorrectAttempts: 0,
      helpUses: 0,
      lastPracticedAt: t0,
    });
    old.close();

    const database = new PersonalLearningDatabase(name);
    databases.push(database);
    expect(await database.typingProgress.get("lesson-1")).toMatchObject({
      attempts: 2,
    });
    expect(await database.learningWordProgress.get("Haus")).toMatchObject({
      word: "Haus",
    });
    expect(await database.textboxSessions.count()).toBe(0);
    await createTextboxRepository(database).saveRound(makeSession("neu", 1));
    expect(await database.textboxSessions.count()).toBe(1);
  });
});

describe("Textbox-Repository", () => {
  it("speichert Durchgänge, liefert die offene Einheit und verwirft sie", async () => {
    const repository = createTextboxRepository(createDatabase());
    expect(await repository.getOpen(text.id)).toBeUndefined();
    const open = makeSession("a", 1);
    await repository.saveRound(open);
    await repository.saveRound(open); // zweimal speichern ändert nichts
    expect(await repository.getOpen(text.id)).toEqual(open);
    expect(await repository.listByText(text.id)).toHaveLength(1);
    expect(await repository.listCompleted()).toEqual([]);
    await repository.discard("a");
    expect(await repository.getOpen(text.id)).toBeUndefined();
    await repository.discard("gibt-es-nicht");
  });

  it("hat höchstens eine laufende Einheit je Text", async () => {
    const repository = createTextboxRepository(createDatabase());
    await repository.saveRound(makeSession("alt", 1));
    await repository.saveRound({
      ...makeSession("neu", 1),
      updatedAt: "2026-10-09T08:00:00.000Z",
    });
    const all = await repository.listByText(text.id);
    expect(all.map((s) => s.id)).toEqual(["neu"]);
    // Eine laufende Einheit zu einem anderen Text bleibt unberührt.
    await repository.saveRound(makeSession("andere", 1, "TXT-002"));
    expect(await repository.getOpen("TXT-002")).toMatchObject({ id: "andere" });
    expect(await repository.getOpen(text.id)).toMatchObject({ id: "neu" });
  });

  it("schließt idempotent ab und schreibt genau ein Lernereignis", async () => {
    const database = createDatabase();
    const repository = createTextboxRepository(database);
    const open = makeSession("run", 1);
    await repository.saveRound(open);
    const done = makeSession("run", 4);
    expect(done.status).toBe("abgeschlossen");
    const now = new Date("2026-10-08T09:00:00.000Z");
    await Promise.all([
      repository.complete(done, now),
      repository.complete(done, now),
    ]);
    await repository.complete(done, now);
    expect(await repository.listCompleted()).toEqual([done]);
    expect(await repository.getOpen(text.id)).toBeUndefined();
    const events = await database.learningEvents.toArray();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "textbox",
      learningArea: "german",
      learningObjectId: `textbox:${text.id}`,
      roundId: "run",
      answerMode: "typed",
      help: "none",
      assessment: { writing: "correct" },
    });
  });

  it("wertet unter 90 % als nicht richtig", async () => {
    const database = createDatabase();
    const repository = createTextboxRepository(database);
    const done = { ...makeSession("schwach", 4), finalPercent: 50 };
    await repository.complete(done);
    expect(
      (await database.learningEvents.toArray())[0]?.assessment.writing,
    ).toBe("incorrect");
  });

  it("hält abgeschlossene Einheiten unveränderlich", async () => {
    const repository = createTextboxRepository(createDatabase());
    const done = makeSession("fest", 4);
    await repository.complete(done);
    await expect(repository.saveRound(done)).rejects.toThrow();
    await expect(
      repository.saveRound({ ...makeSession("fest", 1), id: "fest" }),
    ).rejects.toThrow("unveränderlich");
    await expect(repository.discard("fest")).rejects.toThrow();
    await expect(
      repository.complete({ ...done, finalPercent: 1 }),
    ).rejects.toThrow("unveränderlich");
    await expect(repository.complete(makeSession("x", 1))).rejects.toThrow();
    expect(await repository.listCompleted()).toEqual([done]);
  });

  it("prüft gespeicherte Daten beim Lesen", async () => {
    const database = createDatabase();
    const repository = createTextboxRepository(database);
    await database.textboxSessions.put({
      ...makeSession("kaputt", 1),
      updatedAt: "kein-datum",
    });
    await expect(repository.getOpen(text.id)).rejects.toThrow();
    await expect(repository.listByText(text.id)).rejects.toThrow();
  });
});

describe("Backup mit Textbox-Einheiten", () => {
  it("sichert und stellt wieder her (Rundlauf)", async () => {
    const source = createDatabase();
    const target = createDatabase();
    const repository = createTextboxRepository(source);
    const done = makeSession("fertig", 4);
    const open = makeSession("offen", 1, "TXT-002");
    await repository.complete(done);
    await repository.saveRound(open);

    const exported = await exportPersonalLearningBackup(source, t1);
    expect(exported.data.textboxSessions).toHaveLength(2);
    const serialized = await serializePersonalLearningBackupFromDatabase(
      source,
      t1,
    );
    const result = await restorePersonalLearningBackupText(serialized, target);
    expect(result.conflicts).toEqual([]);
    expect(result.added).toBe(3); // zwei Einheiten, ein Lernereignis
    expect(await createTextboxRepository(target).listCompleted()).toEqual([
      done,
    ]);
    expect(await createTextboxRepository(target).getOpen("TXT-002")).toEqual(
      open,
    );
    expect(
      (await restorePersonalLearningBackup(exported, target)).unchanged,
    ).toBe(3);
  });

  it("lädt ältere Sicherungen ohne Textbox-Feld", async () => {
    const backup = createPersonalLearningBackup({
      learningEvents: [],
      learningBoxDecks: [],
      learningBoxCards: [],
      learningWordProgress: [],
      typingProgress: [],
    });
    const { textboxSessions: _omitted, ...data } = backup.data;
    void _omitted;
    const target = createDatabase();
    const result = await restorePersonalLearningBackup(
      { ...backup, data },
      target,
    );
    expect(result).toMatchObject({ added: 0, conflicts: [] });
    // Auch das Altformat (nur Stapel und Karten) liefert ein leeres Textbox-Feld.
    await restorePersonalLearningBackup({ decks: [], cards: [] }, target);
  });

  it("führt zusammen: abgeschlossen vor laufend, sonst neueres updatedAt", async () => {
    const target = createDatabase();
    const open = makeSession("a", 1);
    const done = makeSession("a", 4);
    const backupWith = (session: TextboxSession) =>
      createPersonalLearningBackup({
        learningEvents: [],
        learningBoxDecks: [],
        learningBoxCards: [],
        learningWordProgress: [],
        typingProgress: [],
        textboxSessions: [session],
      });
    await target.textboxSessions.put(open);

    // Abgeschlossen ersetzt laufend.
    expect(
      (await restorePersonalLearningBackup(backupWith(done), target)).updated,
    ).toBe(1);
    expect((await target.textboxSessions.get("a"))?.status).toBe(
      "abgeschlossen",
    );
    // Laufend ersetzt nie abgeschlossen.
    expect(
      (await restorePersonalLearningBackup(backupWith(open), target)).conflicts,
    ).toEqual([]);
    expect((await target.textboxSessions.get("a"))?.status).toBe(
      "abgeschlossen",
    );

    // Zwei laufende: das neuere updatedAt gewinnt.
    await target.textboxSessions.put({ ...open, id: "b" });
    const newer = { ...open, id: "b", updatedAt: "2026-10-09T08:00:00.000Z" };
    await restorePersonalLearningBackup(backupWith(newer), target);
    expect((await target.textboxSessions.get("b"))?.updatedAt).toBe(
      newer.updatedAt,
    );
    await restorePersonalLearningBackup(
      backupWith({ ...open, id: "b" }),
      target,
    );
    expect((await target.textboxSessions.get("b"))?.updatedAt).toBe(
      newer.updatedAt,
    );
  });

  it("meldet einen Konflikt bei zwei abgeschlossenen Einheiten mit anderem Inhalt", async () => {
    const target = createDatabase();
    const done = makeSession("c", 4);
    await target.textboxSessions.put(done);
    const other = { ...done, finalPercent: 12 };
    const result = await restorePersonalLearningBackup(
      createPersonalLearningBackup({
        learningEvents: [],
        learningBoxDecks: [],
        learningBoxCards: [],
        learningWordProgress: [],
        typingProgress: [],
        textboxSessions: [other],
      }),
      target,
    );
    expect(result.conflicts).toEqual([
      { collection: "textboxSessions", id: "c" },
    ]);
    expect(await target.textboxSessions.get("c")).toEqual(done);
  });
});

describe("Sehr lange Eingaben", () => {
  const hard = TEXTBOX_TEXTS.find((t) => t.difficulty === "schwer")!;

  it("lassen sich vollständig abschließen und speichern", async () => {
    const database = createDatabase();
    const repository = createTextboxRepository(database);
    let state = startRun(hard, "lang");
    for (let round = 1; round <= 4; round += 1) {
      state = finishMemorize(state, 1);
      const gaps = buildBlankingPlan(hard, state.seed)[round - 1]!.size;
      state = submitRound(
        state,
        hard,
        round === 4
          ? hard.text.replace(/\s+/g, "") + "x".repeat(4000)
          : Array.from({ length: gaps }, () => "g".repeat(300)),
        1,
      );
      for (const word of state.rounds.at(-1)!.words) {
        expect(Array.from(word.actual ?? "").length).toBeLessThanOrEqual(100);
      }
      state = nextRound(state);
    }
    const session = sessionFromRun(state, hard, { startedAt: t0, now: t1 });
    expect(session.status).toBe("abgeschlossen");
    await repository.complete(session);
    expect(await repository.listCompleted()).toEqual([session]);
    expect(await database.learningEvents.count()).toBe(1);
  });
});
