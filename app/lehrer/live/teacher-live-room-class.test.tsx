import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classSealFingerprint } from "../../../src/domain/class-seal";
import { LOCAL_DATA_AREAS } from "../../../src/storage/local-data-boundaries";
import {
  createTeacherClassRepository,
  createTeacherProfileRepository,
} from "../../../src/storage/teacher-class-settings";
import { TeacherLiveRoom } from "./teacher-live-room";

const mocks = vi.hoisted(() => ({ openLiveRoom: vi.fn() }));

vi.mock("../../../src/integrations/laufdiktat/live-room-client", () => {
  const channel = {
    on: () => channel,
    subscribe: () => channel,
    track: async () => "ok",
    send: async () => "ok",
    presenceState: () => ({}),
    state: "joined",
  };
  return {
    getLiveRoomClient: () => ({
      channel: () => channel,
      removeChannel: async () => "ok",
      realtime: { connect: () => undefined },
    }),
  };
});

vi.mock("../../../src/integrations/laufdiktat/room-api", async (original) => ({
  ...(await original<object>()),
  openLiveRoom: mocks.openLiveRoom,
  getLiveRoomParticipants: async () => [],
  getLiveRoomStudents: async () => [],
  getLiveRoomState: async () => null,
  saveTeacherLiveRoom: () => undefined,
  readTeacherLiveRoom: () => null,
  clearTeacherLiveRoom: () => undefined,
}));

const classId = "123e4567-e89b-42d3-a456-426614174001";

async function openSettings() {
  const user = userEvent.setup();
  render(
    <TeacherLiveRoom
      liveRoomConfig={{ url: "https://x.test", publishableKey: "key" }}
    />,
  );
  const source = await screen.findByRole("textbox", { name: "Text" });
  await waitFor(() =>
    expect(
      source.closest("[data-hydrated]")?.getAttribute("data-hydrated"),
    ).toBe("true"),
  );
  await user.type(source, "Der Schulweg ist kurz.");
  await user.click(screen.getByRole("button", { name: "Weiter zu Modus" }));
  return user;
}

beforeEach(async () => {
  mocks.openLiveRoom.mockReset().mockResolvedValue({
    roomId: "room-1",
    code: "4829",
    accessToken: "token",
  });
  const classes = createTeacherClassRepository();
  await classes.put({
    id: classId,
    name: "Klasse 7b",
    teacherName: "Frau Test",
    schoolYear: "2026/27",
    enabledModules: ["vocabulary"],
    createdAt: "2026-08-25T10:00:00.000Z",
    updatedAt: "2026-08-25T10:00:00.000Z",
  });
});

afterEach(async () => {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(LOCAL_DATA_AREAS.teacher);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
});

describe("Raumstart mit Klassenwahl", () => {
  it("setzt nur den Stempelabdruck der gewählten Klasse in die Raumkonfiguration", async () => {
    const user = await openSettings();
    await user.selectOptions(
      await screen.findByRole("combobox", { name: /Klasse \(optional\)/ }),
      "Klasse 7b",
    );
    // Ältere Klassen erhalten ihren Stempel beim ersten Bedarf.
    const seal = await waitFor(async () => {
      const [stored] = await createTeacherClassRepository().list();
      expect(stored?.seal).toBeDefined();
      return stored!.seal!;
    });
    await user.click(screen.getByRole("button", { name: "Raum öffnen" }));
    await waitFor(() => expect(mocks.openLiveRoom).toHaveBeenCalledTimes(1));
    const config = mocks.openLiveRoom.mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(config["classSeal"]).toBe(
      await classSealFingerprint(seal.publicKey),
    );
    // Weder Klassen-ID noch Name oder Schlüssel gelangen in den Raum.
    expect(JSON.stringify(config)).not.toMatch(
      /Klasse 7b|123e4567|privateJwk|"d":/,
    );
  });

  it("lässt ohne Klassenwahl keinen Stempel in den Raum", async () => {
    const user = await openSettings();
    await screen.findByRole("combobox", { name: /Klasse \(optional\)/ });
    await user.click(screen.getByRole("button", { name: "Raum öffnen" }));
    await waitFor(() => expect(mocks.openLiveRoom).toHaveBeenCalledTimes(1));
    expect(mocks.openLiveRoom.mock.calls[0]![1]).not.toHaveProperty(
      "classSeal",
    );
  });

  it("merkt sich die zuletzt gewählte Klasse in den Lehrer-Einstellungen", async () => {
    await createTeacherProfileRepository().put({
      id: "local-teacher",
      displayName: "Frau Test",
      school: "",
      email: "",
      subjects: [],
      updatedAt: "2026-08-25T10:00:00.000Z",
    });
    const user = await openSettings();
    await user.selectOptions(
      await screen.findByRole("combobox", { name: /Klasse \(optional\)/ }),
      "Klasse 7b",
    );
    await waitFor(async () =>
      expect(
        (await createTeacherProfileRepository().get())?.lastLiveClassId,
      ).toBe(classId),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: /Klasse \(optional\)/ }),
      "Keine Klasse",
    );
    await waitFor(async () =>
      expect(
        (await createTeacherProfileRepository().get())?.lastLiveClassId,
      ).toBeUndefined(),
    );
  });
});
