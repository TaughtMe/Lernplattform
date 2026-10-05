import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { createCredentialStore, type CredentialStore } from "./credentials";
import { createSyncKey } from "./envelope";
import { createSyncTarget } from "./target";

const stores: CredentialStore[] = [];
afterEach(async () => {
  await Promise.all(
    stores.splice(0).map(async (store) => {
      store.close();
      await store.delete();
    }),
  );
});

const fresh = () => {
  const store = createCredentialStore(`creds-${crypto.randomUUID()}`);
  stores.push(store);
  return store;
};

const connection = {
  url: "https://cloud.example/dav",
  username: "lea",
  password: "app-passwort",
};

describe("credential store", () => {
  it("remembers the non-extractable key across reloads", async () => {
    const store = fresh();
    expect(await store.loadKey()).toBeNull();
    const key = await createSyncKey("pferd-batterie-klammer", 1000);
    await store.saveKey(key);
    const loaded = await store.loadKey();
    expect(loaded?.key.extractable).toBe(false);
    expect(loaded?.encryption.salt).toBe(key.encryption.salt);
    await store.clearKey();
    expect(await store.loadKey()).toBeNull();
  });

  it("keeps the WebDAV password in plain text only without encryption", async () => {
    const store = fresh();
    await store.saveWebDav({ ...connection, folder: "Lernraum" });
    expect(await store.loadWebDav()).toEqual({
      ...connection,
      folder: "Lernraum",
    });
    expect(await store.loadWebDav(null)).toMatchObject({
      password: "app-passwort",
    });
  });

  it("encrypts the WebDAV password with the remembered key", async () => {
    const store = fresh();
    const key = await createSyncKey("pferd-batterie-klammer", 1000);
    await store.saveWebDav(connection, key.key);
    expect(await store.loadWebDav(key.key)).toEqual(connection);
    await expect(store.loadWebDav()).rejects.toMatchObject({ code: "locked" });
    const other = await createSyncKey("anderes-passwort-12", 1000);
    await expect(store.loadWebDav(other.key)).rejects.toMatchObject({
      code: "locked",
    });
    await store.clear();
    expect(await store.loadWebDav()).toBeNull();
  });
});

describe("createSyncTarget", () => {
  it("builds a WebDAV target from stored credentials", async () => {
    const store = fresh();
    await expect(createSyncTarget("webdav", store)).rejects.toMatchObject({
      code: "not-configured",
    });
    await store.saveWebDav(connection);
    const calls: string[] = [];
    const target = await createSyncTarget("webdav", store, null, (async (
      url: string | URL | Request,
    ) => {
      calls.push(String(url));
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch);
    expect(target.provider).toBe("webdav");
    await target.stat("x.json");
    expect(calls[0]).toBe("https://cloud.example/dav/Lernraum/x.json");
  });

  it("asks for a new sign-in when OneDrive has no valid token", async () => {
    window.localStorage.clear();
    await expect(createSyncTarget("onedrive", fresh())).rejects.toMatchObject({
      code: "reauth",
    });
  });

  it("builds drive targets from a stored token", async () => {
    window.localStorage.setItem(
      "lernraum:cloud-sync:tokens",
      JSON.stringify({
        onedrive: {
          accessToken: "t1",
          refreshToken: null,
          expiresAt: Date.now() + 3_600_000,
        },
        "google-drive": {
          accessToken: "t2",
          refreshToken: null,
          expiresAt: Date.now() + 3_600_000,
        },
      }),
    );
    expect((await createSyncTarget("onedrive", fresh())).provider).toBe(
      "onedrive",
    );
    expect((await createSyncTarget("google-drive", fresh())).provider).toBe(
      "google-drive",
    );
    window.localStorage.clear();
  });
});
