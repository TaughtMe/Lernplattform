import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTeacherLiveRoom,
  endLiveRoom,
  getLiveProgress,
  getLiveRoomParticipants,
  getLiveRoomState,
  getLiveRoomStudents,
  joinLiveRoom,
  openLiveRoom,
  readLiveRoomIdentity,
  readTeacherLiveRoom,
  removeLiveRoomParticipant,
  saveLiveProgress,
  saveLiveRoomIdentity,
  saveTeacherLiveRoom,
  touchLiveParticipant,
  updateLiveSession,
} from "./room-api";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("./live-room-client", () => ({ getLiveRoomClient: () => ({ rpc }) }));
const config = { url: "http://localhost", publishableKey: "public-test-key" };
const roomId = "11111111-1111-4111-8111-111111111111";
const identity = {
  roomId,
  sessionId: "session",
  studentName: "Mia",
  participantToken: "a".repeat(48),
};
const row = {
  current_index: 0,
  peeks: 2,
  attempts: 3,
  errors: 1,
  finished: true,
  duration_ms: 12000,
  word_errors: { house: 1 },
  station_number: null,
};
const room = { roomId, accessToken: "a".repeat(32) };
const rejected = { data: null, error: { message: "Token abgelehnt" } };
beforeEach(() => {
  rpc.mockReset();
  sessionStorage.clear();
});
describe("validated room API", () => {
  it("restores error details and duration", async () => {
    rpc.mockResolvedValue({ data: [row], error: null });
    await expect(getLiveProgress(config, identity)).resolves.toMatchObject({
      wordErrors: { house: 1 },
      durationMs: 12000,
      finished: true,
    });
  });
  it("distinguishes absent rows from malformed data", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getLiveProgress(config, identity)).resolves.toBeNull();
    rpc.mockResolvedValueOnce({
      data: [{ ...row, current_index: -1 }],
      error: null,
    });
    await expect(getLiveProgress(config, identity)).rejects.toThrow();
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      getLiveRoomStudents(config, { roomId, accessToken: "a".repeat(32) }),
    ).rejects.toThrow();
  });
  it("does not treat empty teacher or join capabilities as success", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(openLiveRoom(config, {})).rejects.toThrow();
    await expect(joinLiveRoom(config, "1234", "Mia")).resolves.toBeNull();
  });
  it("sends only the animal enum and room reentry token for a new join", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          room_id: roomId,
          station_mode: false,
          status: "lobby",
          assigned_student_key: "participant-opaque",
          participant_token: "b".repeat(48),
          animal_token: "Fuchs",
          animal_number: 2,
        },
      ],
      error: null,
    });
    await expect(
      joinLiveRoom(config, "1234", {
        animalToken: "Fuchs",
        participantToken: "a".repeat(48),
      }),
    ).resolves.toMatchObject({
      studentName: "participant-opaque",
      animalToken: "Fuchs",
      animalNumber: 2,
    });
    expect(rpc).toHaveBeenCalledWith("join_room_secure", {
      p_code: "1234",
      p_student_key: "Fuchs",
      p_participant_token: "a".repeat(48),
    });
  });
  it("keeps the reentry identity in the current tab and room scope", () => {
    saveLiveRoomIdentity({
      code: "1234",
      name: "participant-opaque",
      participantToken: "a".repeat(48),
      animalToken: "Fuchs",
    });
    expect(readLiveRoomIdentity("1234")).toMatchObject({
      participantToken: "a".repeat(48),
      animalToken: "Fuchs",
    });
    expect(readLiveRoomIdentity("5678")).toBeNull();

    // A newly opened tab has separate sessionStorage and no reentry identity.
    sessionStorage.clear();
    expect(readLiveRoomIdentity("1234")).toBeNull();
  });
  it("validates stored capabilities and preserves valid identities", () => {
    const room = { roomId, code: "1234", accessToken: "a".repeat(32) };
    saveTeacherLiveRoom(room);
    expect(readTeacherLiveRoom()).toEqual(room);
    const student = {
      code: "1234",
      name: "Mia",
      participantToken: identity.participantToken,
    };
    saveLiveRoomIdentity(student);
    expect(readLiveRoomIdentity("1234")).toMatchObject({
      ...student,
      animalToken: null,
      participantKey: "Mia",
    });
    expect(readLiveRoomIdentity("5678")).toBeNull();
    sessionStorage.setItem(
      "lernraum-live-room-identity",
      JSON.stringify({ ...student, participantToken: 42 }),
    );
    sessionStorage.removeItem("lernraum-live-room-identity:1234");
    sessionStorage.setItem(
      "lernraum-teacher-live-room",
      '{"roomId":true,"code":1234,"accessToken":true}',
    );
    expect(readLiveRoomIdentity("1234")).toBeNull();
    expect(readTeacherLiveRoom()).toBeNull();
  });
});

describe("Raum-Aufrufe der Lehrkraft", () => {
  it("öffnet einen Raum und gibt Raum-ID, Code und Token zurück", async () => {
    rpc.mockResolvedValue({
      data: [{ room_id: roomId, code: "4711", access_token: "t".repeat(32) }],
      error: null,
    });
    await expect(openLiveRoom(config, { words: [] })).resolves.toEqual({
      roomId,
      code: "4711",
      accessToken: "t".repeat(32),
    });
    expect(rpc).toHaveBeenCalledWith("open_room_secure", {
      p_config: { words: [] },
    });
  });

  it("meldet einen abgelehnten Token beim Öffnen, Beenden und Entfernen", async () => {
    rpc.mockResolvedValue(rejected);
    await expect(openLiveRoom(config, {})).rejects.toThrow("Token abgelehnt");
    await expect(endLiveRoom(config, room)).rejects.toThrow("Token abgelehnt");
    await expect(
      removeLiveRoomParticipant(config, room, "Fuchs"),
    ).rejects.toThrow("Token abgelehnt");
    await expect(getLiveRoomParticipants(config, room)).rejects.toThrow(
      "Token abgelehnt",
    );
    await expect(getLiveRoomStudents(config, room)).rejects.toThrow(
      "Token abgelehnt",
    );
  });

  it("beendet einen Raum mit Raum-ID und Token", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await endLiveRoom(config, room);
    expect(rpc).toHaveBeenCalledWith("end_room_secure", {
      p_room_id: roomId,
      p_access_token: room.accessToken,
    });
  });

  it("entfernt einen Teilnehmer über seinen Schlüssel", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await removeLiveRoomParticipant(config, room, "Fuchs");
    expect(rpc).toHaveBeenCalledWith("remove_room_participant_secure", {
      p_room_id: roomId,
      p_access_token: room.accessToken,
      p_student_key: "Fuchs",
    });
  });

  it("ruft Teilnehmer ab und füllt fehlende Tierangaben auf", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          student_key: "Fuchs 2",
          animal_token: "Fuchs",
          animal_number: 2,
          last_seen_at: "2026-10-13T08:00:00+00:00",
        },
        { student_key: "Gast", last_seen_at: null },
      ],
      error: null,
    });
    await expect(getLiveRoomParticipants(config, room)).resolves.toEqual([
      {
        studentName: "Fuchs 2",
        animalToken: "Fuchs",
        animalNumber: 2,
        lastSeenAt: "2026-10-13T08:00:00+00:00",
      },
      {
        studentName: "Gast",
        animalToken: null,
        animalNumber: 0,
        lastSeenAt: null,
      },
    ]);
  });

  it("ruft Schülerstände ab und ersetzt fehlende Felder durch Standardwerte", async () => {
    rpc.mockResolvedValue({
      data: [
        { ...row, student_key: "Mia", app_version: "1.2.3", station_number: 4 },
        {
          current_index: 1,
          peeks: 0,
          attempts: 0,
          errors: 0,
          finished: false,
          student_key: "Leo",
          app_version: null,
        },
      ],
      error: null,
    });
    const [mia, leo] = await getLiveRoomStudents(config, room);
    expect(mia).toMatchObject({
      studentName: "Mia",
      stationNumber: 4,
      durationMs: 12000,
      wordErrors: { house: 1 },
      appVersion: "1.2.3",
    });
    expect(leo).toMatchObject({
      studentName: "Leo",
      stationNumber: null,
      durationMs: undefined,
      wordErrors: {},
      appVersion: null,
    });
  });

  it("wiederholt das Aktualisieren der Sitzung einmal und gibt dann auf", async () => {
    vi.useFakeTimers();
    try {
      rpc.mockResolvedValueOnce(rejected).mockResolvedValueOnce({
        data: null,
        error: null,
      });
      const retried = updateLiveSession(config, room, "session", { a: 1 });
      await vi.advanceTimersByTimeAsync(400);
      await expect(retried).resolves.toBeUndefined();
      expect(rpc).toHaveBeenCalledTimes(2);

      rpc.mockReset();
      rpc.mockResolvedValue(rejected);
      const failed = updateLiveSession(config, room, "session", {});
      const assertion = expect(failed).rejects.toThrow("Token abgelehnt");
      await vi.advanceTimersByTimeAsync(400);
      await assertion;
      expect(rpc).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("merkt sich den Lehrkraft-Raum nur im Sitzungsspeicher und löscht ihn", () => {
    const stored = { ...room, code: "4711" };
    saveTeacherLiveRoom({ ...stored, openedAt: "2026-10-13T08:00:00.000Z" });
    expect(readTeacherLiveRoom()).toEqual({
      ...stored,
      openedAt: "2026-10-13T08:00:00.000Z",
    });
    clearTeacherLiveRoom();
    expect(readTeacherLiveRoom()).toBeNull();
  });

  it("übersteht gesperrten Sitzungsspeicher", () => {
    const blocked = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("gesperrt");
      });
    const reading = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("gesperrt");
      });
    const removing = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("gesperrt");
      });
    try {
      expect(() =>
        saveTeacherLiveRoom({ ...room, code: "4711" }),
      ).not.toThrow();
      expect(() => clearTeacherLiveRoom()).not.toThrow();
      expect(readTeacherLiveRoom()).toBeNull();
      expect(readLiveRoomIdentity("4711")).toBeNull();
    } finally {
      blocked.mockRestore();
      reading.mockRestore();
      removing.mockRestore();
    }
  });
});

describe("Raum-Aufrufe der Schüler", () => {
  it("liest den Raumzustand mit Teilnehmer- oder Lehrkraft-Token", async () => {
    rpc.mockResolvedValue({
      data: [{ status: "live", session_id: "s1", config: { words: ["a"] } }],
      error: null,
    });
    await expect(
      getLiveRoomState(config, roomId, { participantToken: "p".repeat(48) }),
    ).resolves.toEqual({
      status: "live",
      sessionId: "s1",
      config: { words: ["a"] },
    });
    expect(rpc).toHaveBeenLastCalledWith("get_room_state_secure", {
      p_room_id: roomId,
      p_participant_token: "p".repeat(48),
      p_access_token: null,
    });

    await getLiveRoomState(config, roomId, { accessToken: room.accessToken });
    expect(rpc).toHaveBeenLastCalledWith("get_room_state_secure", {
      p_room_id: roomId,
      p_participant_token: null,
      p_access_token: room.accessToken,
    });
  });

  it("unterscheidet fehlenden Raum, Fehler und ungültige Antwort", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(getLiveRoomState(config, roomId, {})).resolves.toBeNull();
    rpc.mockResolvedValueOnce(rejected);
    await expect(getLiveRoomState(config, roomId, {})).rejects.toThrow(
      "Token abgelehnt",
    );
    rpc.mockResolvedValueOnce({ data: [{ status: "kaputt" }], error: null });
    await expect(getLiveRoomState(config, roomId, {})).rejects.toThrow();
  });

  it("speichert Fortschritt unter dem Namen oder der Stationsnummer", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const progress = {
      currentIndex: 3,
      peeks: 1,
      attempts: 4,
      errors: 2,
      finished: false,
    };
    await saveLiveProgress(config, identity, progress);
    expect(rpc).toHaveBeenLastCalledWith(
      "upsert_progress_secure",
      expect.objectContaining({
        p_student_key: "Mia",
        p_current_index: 3,
        p_duration_ms: null,
        p_word_errors: null,
        p_station_number: null,
      }),
    );

    await saveLiveProgress(config, identity, {
      ...progress,
      stationNumber: 7,
      durationMs: 5000,
      wordErrors: { Haus: 2 },
    });
    expect(rpc).toHaveBeenLastCalledWith(
      "upsert_progress_secure",
      expect.objectContaining({
        p_student_key: "station-7",
        p_station_number: 7,
        p_duration_ms: 5000,
        p_word_errors: { Haus: 2 },
      }),
    );
  });

  it("meldet abgelehnte Fortschritts- und Lebenszeichen-Aufrufe", async () => {
    rpc.mockResolvedValue(rejected);
    await expect(
      saveLiveProgress(config, identity, {
        currentIndex: 0,
        peeks: 0,
        attempts: 0,
        errors: 0,
        finished: false,
      }),
    ).rejects.toThrow("Token abgelehnt");
    await expect(getLiveProgress(config, identity)).rejects.toThrow(
      "Token abgelehnt",
    );
    await expect(
      touchLiveParticipant(config, roomId, identity.participantToken),
    ).rejects.toThrow("Token abgelehnt");
  });

  it("liest gespeicherten Fortschritt einer Station", async () => {
    rpc.mockResolvedValue({
      data: [{ ...row, station_number: 3 }],
      error: null,
    });
    await expect(getLiveProgress(config, identity)).resolves.toMatchObject({
      stationNumber: 3,
    });
  });

  it("sendet ein Lebenszeichen mit Raum-ID und Teilnehmer-Token", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await touchLiveParticipant(config, roomId, identity.participantToken);
    expect(rpc).toHaveBeenCalledWith("touch_participant_activity_secure", {
      p_activity: "room",
      p_room_id: roomId,
      p_participant_token: identity.participantToken,
    });
  });

  it("wiederholt den Beitritt einmal nach einem Fehler", async () => {
    vi.useFakeTimers();
    try {
      rpc.mockResolvedValueOnce(rejected).mockResolvedValueOnce({
        data: [],
        error: null,
      });
      const joined = joinLiveRoom(config, "1234", "Mia");
      await vi.advanceTimersByTimeAsync(400);
      await expect(joined).resolves.toBeNull();
      expect(rpc).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
