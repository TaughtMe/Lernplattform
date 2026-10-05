import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTeacherContentLibraryRepository,
  TeacherClassDatabase,
} from "../../storage/teacher-class-settings";
import { createSyncController, type SyncSnapshot } from "./controller";
import { createCredentialStore } from "./credentials";
import { SYNC_FILE_V2, readEnvelopeHeader } from "./envelope";
import { DEFAULT_SYNC_SCOPE } from "./model";
import { createFakeEnv } from "./testing/fake-env";
import { createFakeWebDav, type FakeWebDav } from "./testing/fake-webdav";

const connection = {
  url: "https://cloud.example/dav",
  username: "lea",
  password: "app-passwort",
};
const PASSWORD = "pferd-batterie-klammer";

const closers: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

const material = (id: string, title: string) => ({
  id,
  revision: 1,
  title,
  source: "Hund;dog",
  promptLocale: "de",
  answerLocale: "en",
  createdAt: "2026-09-02T08:00:00.000Z",
  updatedAt: new Date().toISOString(),
});

function device(server: FakeWebDav) {
  const database = new TeacherClassDatabase(`ctl-${crypto.randomUUID()}`);
  const credentials = createCredentialStore(`ctl-cred-${crypto.randomUUID()}`);
  const fake = createFakeEnv();
  const onData = vi.fn();
  const controller = createSyncController({
    database,
    credentials,
    env: fake.env,
    fetcher: server.fetcher,
    iterations: 1000,
    onData,
  });
  closers.push(async () => {
    controller.stop();
    database.close();
    await database.delete();
    credentials.close();
    await credentials.delete();
  });
  return {
    database,
    credentials,
    controller,
    fake,
    onData,
    library: createTeacherContentLibraryRepository(database),
  };
}

const options = (name: string, extra: Record<string, unknown> = {}) => ({
  provider: "webdav" as const,
  scope: { ...DEFAULT_SYNC_SCOPE },
  deviceName: name,
  webdav: connection,
  ...extra,
});

describe("sync controller", () => {
  it("sets up two devices and carries a change over within one poll", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    const board = device(server);
    await home.library.put(material("m1", "Diktat"));
    const first = await home.controller.enable(options("Laptop"));
    expect(first).toMatchObject({
      enabled: true,
      status: "idle",
      revision: 1,
      deviceName: "Laptop",
    });
    const remote = await board.controller.inspectRemote("webdav", connection);
    expect(remote).toMatchObject({ exists: true });
    expect(remote.header?.encryption).toBeNull();
    await board.controller.enable(options("Tafel"));
    expect((await board.library.list()).map((m) => m.title)).toEqual([
      "Diktat",
    ]);
    expect(board.onData).toHaveBeenCalled();

    // Änderung auf dem Laptop: nach 2 s hochgeladen, die Tafel holt sie beim nächsten Takt.
    await home.library.put(material("m2", "Vokabeln"));
    home.controller.notifyChange();
    await home.fake.advance(2_500);
    await board.fake.advance(10_000);
    await vi.waitFor(async () =>
      expect((await board.library.list()).map((m) => m.title).sort()).toEqual([
        "Diktat",
        "Vokabeln",
      ]),
    );
    const snapshot = await board.controller.snapshot();
    expect(snapshot.devices.map((d) => d.name).sort()).toEqual([
      "Laptop",
      "Tafel",
    ]);
  });

  it("encrypts with a password that a second device must know", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    const board = device(server);
    await home.library.put(material("m1", "Geheim"));
    const snapshot = await home.controller.enable(
      options("Laptop", { password: PASSWORD }),
    );
    expect(snapshot.encrypted).toBe(true);
    const file = [...server.files.values()][0]?.body ?? "";
    expect(file).not.toContain("Geheim");
    expect(readEnvelopeHeader(file).encryption).not.toBeNull();
    await expect(
      board.controller.enable(options("Tafel")),
    ).rejects.toMatchObject({ code: "locked" });
    await expect(
      board.controller.enable(
        options("Tafel", { password: "falsch-falsch-1" }),
      ),
    ).rejects.toMatchObject({ code: "locked" });
    await board.controller.enable(options("Tafel", { password: PASSWORD }));
    expect((await board.library.list()).map((m) => m.title)).toEqual([
      "Geheim",
    ]);
  });

  it("stays locked after a restart without remembered key until unlocked", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    await home.library.put(material("m1", "Geheim"));
    await home.controller.enable(
      options("Laptop", { password: PASSWORD, remember: false }),
    );
    expect(await home.credentials.loadKey()).toBeNull();
    // Neustart: neuer Controller mit denselben Datenbanken.
    const restarted = createSyncController({
      database: home.database,
      credentials: home.credentials,
      env: createFakeEnv().env,
      fetcher: server.fetcher,
      iterations: 1000,
    });
    await restarted.resume();
    expect((await restarted.snapshot()).status).toBe("locked");
    await expect(restarted.unlock("falsch-falsch-1")).rejects.toMatchObject({
      code: "locked",
    });
    await restarted.unlock(PASSWORD);
    expect((await restarted.snapshot()).status).toBe("idle");
    restarted.stop();
  });

  it("resumes without a prompt when the key is remembered", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    await home.controller.enable(options("Laptop", { password: PASSWORD }));
    home.controller.stop();
    const restarted = createSyncController({
      database: home.database,
      credentials: home.credentials,
      env: createFakeEnv().env,
      fetcher: server.fetcher,
      iterations: 1000,
    });
    await restarted.resume();
    await vi.waitFor(async () =>
      expect((await restarted.snapshot()).status).toBe("idle"),
    );
    restarted.stop();
  });

  it("changes the password and locks devices that still use the old one", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    const board = device(server);
    await home.library.put(material("m1", "Eins"));
    await home.controller.enable(options("Laptop", { password: PASSWORD }));
    await board.controller.enable(options("Tafel", { password: PASSWORD }));
    const next = "neues-passwort-xyz1";
    await home.controller.setPassword(next);
    expect((await home.controller.snapshot()).status).toBe("idle");
    expect(
      readEnvelopeHeader([...server.files.values()][0]?.body ?? "").writtenBy
        .name,
    ).toBe("Laptop");
    await board.fake.advance(10_000);
    await vi.waitFor(async () =>
      expect((await board.controller.snapshot()).status).toBe("locked"),
    );
    await board.controller.unlock(next);
    expect((await board.controller.snapshot()).status).toBe("idle");
    // Ausschalten der Verschlüsselung.
    await home.controller.setPassword(null);
    expect([...server.files.values()][0]?.body).toContain("Eins");
    expect((await home.controller.snapshot()).encrypted).toBe(false);
  });

  it("unlocks a shared device after the password changed, with the WebDAV password", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    const board = device(server);
    await home.library.put(material("m1", "Eins"));
    await home.controller.enable(options("Laptop", { password: PASSWORD }));
    await board.controller.enable(
      options("Tafel", { password: PASSWORD, remember: false }),
    );
    await home.controller.setPassword("neues-passwort-xyz1");
    // Neustart der Tafel: kein Schlüssel im Speicher oder auf dem Gerät.
    const restarted = createSyncController({
      database: board.database,
      credentials: board.credentials,
      env: createFakeEnv().env,
      fetcher: server.fetcher,
      iterations: 1000,
    });
    await restarted.resume();
    expect((await restarted.snapshot()).status).toBe("locked");
    await expect(restarted.unlock("neues-passwort-xyz1")).rejects.toMatchObject(
      { code: "locked" },
    );
    await restarted.unlock("neues-passwort-xyz1", "app-passwort");
    expect((await restarted.snapshot()).status).toBe("idle");
    restarted.stop();
  });

  it("turns encryption on later and keeps the WebDAV password readable", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    await home.library.put(material("m1", "Eins"));
    await home.controller.enable(options("Laptop"));
    await home.controller.setPassword(PASSWORD);
    expect((await home.controller.snapshot()).encrypted).toBe(true);
    expect([...server.files.values()][0]?.body).not.toContain("Eins");
    expect(
      (
        await home.credentials.loadWebDav(
          (await home.credentials.loadKey())?.key,
        )
      )?.password,
    ).toBe("app-passwort");
  });

  it("reports going offline and recovers", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    await home.controller.enable(options("Laptop"));
    home.fake.emit("offline");
    await vi.waitFor(async () =>
      expect((await home.controller.snapshot()).status).toBe("offline"),
    );
    server.offline = true;
    await home.controller.syncNow();
    expect((await home.controller.snapshot()).status).toBe("offline");
    server.offline = false;
    await home.controller.syncNow();
    expect((await home.controller.snapshot()).status).toBe("idle");
  });

  it("lets the teacher decide a conflict and spreads the decision", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    const board = device(server);
    await home.library.put(material("m1", "Start"));
    await home.controller.enable(options("Laptop"));
    await board.controller.enable(options("Tafel"));
    await home.library.put(material("m1", "Von Laptop"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await board.library.put(material("m1", "Von Tafel"));
    await home.controller.syncNow();
    await board.controller.syncNow();
    const open = await board.controller.listConflicts();
    expect(open).toHaveLength(1);
    expect((await board.controller.snapshot()).status).toBe("conflict");
    await board.controller.resolveConflict(open[0]?.id as string, {
      type: "use-other",
    });
    expect((await board.library.get("m1"))?.title).toBe("Von Laptop");
    await board.controller.syncNow();
    await home.controller.syncNow();
    expect((await home.library.get("m1"))?.title).toBe("Von Laptop");
    expect(await home.controller.listConflicts()).toHaveLength(0);
    expect((await board.controller.snapshot()).openConflicts).toBe(0);
  });

  it("renames the device and tells subscribers", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    const seen: SyncSnapshot[] = [];
    const unsubscribe = home.controller.subscribe((s) => seen.push(s));
    await home.controller.enable(options("Laptop"));
    await home.controller.setDeviceName("Laptop zu Hause");
    await home.fake.advance(2_500);
    unsubscribe();
    expect(seen.length).toBeGreaterThan(1);
    await vi.waitFor(async () =>
      expect(
        (await home.controller.snapshot()).devices.map((d) => d.name),
      ).toEqual(["Laptop zu Hause"]),
    );
  });

  it("switches off on this device only or also removes the cloud file", async () => {
    const server = createFakeWebDav();
    const home = device(server);
    await home.controller.enable(options("Laptop"));
    await home.controller.disable();
    expect(server.files.size).toBe(1);
    expect(await home.credentials.loadWebDav()).toBeNull();
    expect((await home.controller.snapshot()).enabled).toBe(false);
    await home.controller.resume();
    expect((await home.controller.snapshot()).status).toBe("off");

    const second = device(server);
    await second.controller.enable(options("Tafel"));
    await second.controller.disable({ deleteRemote: true });
    expect(server.files.size).toBe(0);
    expect(server.requests.filter((r) => r.startsWith("DELETE"))).toHaveLength(
      1,
    );
    expect(SYNC_FILE_V2).toMatch(/v2/);
  });
});
