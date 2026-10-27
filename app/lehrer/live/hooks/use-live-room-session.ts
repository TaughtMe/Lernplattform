"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type Dispatch,
} from "react";
import { type LiveRoomConfig } from "../../../../src/integrations/laufdiktat/live-room-client";
import {
  roomTimeline,
  roomTimeState,
} from "../../../../src/integrations/laufdiktat/room-limits";
import {
  clearTeacherLiveRoom,
  endLiveRoom,
  getLiveRoomParticipants,
  getLiveRoomState,
  getLiveRoomStudents,
  openLiveRoom,
  readTeacherLiveRoom,
  removeLiveRoomParticipant,
  saveTeacherLiveRoom,
  updateLiveSession,
  type LiveRoomParticipant,
  type LiveRoomState,
  type LiveRoomStudent,
  type OpenedLiveRoom,
} from "../../../../src/integrations/laufdiktat/room-api";
import {
  parseLiveSession,
  type LiveSession,
} from "../../../../src/integrations/laufdiktat/live-session";
import type {
  buildTeacherRoomConfig,
  TeacherGameMode,
} from "../../../../src/integrations/laufdiktat/teacher-session";
import {
  buildTeacherResultCsv,
  csvParticipantLabel,
  resultNamesFor,
} from "../../../../src/integrations/laufdiktat/teacher-results";
import type { ParticipantStatus } from "../../../views/laufdiktat/teacher-dictation-screen";
import type { LiveFlowAction, Stage } from "../teacher-live-flow";
import {
  participantAnimal,
  participantLabel,
  participantStatus,
} from "../lib/participant-display";

/** Wie oft die Uhr für die Raumfristen nachgesehen wird. */
const ROOM_CLOCK_INTERVAL_MS = 15_000;

function nowIso(clock: () => number) {
  return new Date(clock()).toISOString();
}
function isOnline(participant: LiveRoomParticipant) {
  return Boolean(
    participant.lastSeenAt &&
    Date.now() - new Date(participant.lastSeenAt).getTime() < 45_000,
  );
}

type LiveRoomSessionInput = {
  hydrated: boolean;
  liveRoomConfig: LiveRoomConfig | null;
  /** Uhr in Millisekunden; die Tests setzen eine eigene, ohne zu warten. */
  clock: () => number;
  stage: Stage;
  roomClosed: boolean;
  dispatchFlow: Dispatch<LiveFlowAction>;
  /** Holt Inhalt und Optionen eines wiederaufgenommenen Raums in den Editor. */
  applyRestoredContent: (restored: LiveSession) => void;
  setError: (message: string) => void;
  /** Raumeinstellungen, die beim Öffnen und Starten an den Server gehen. */
  roomConfig: ReturnType<typeof buildTeacherRoomConfig>;
  /** Anzahl der Aufgaben; ohne Aufgabe öffnet sich kein Raum. */
  wordCount: number;
  gameMode: TeacherGameMode;
  /**
   * Legt den Inhalt in der Ablage ab: beim Öffnen der Lobby ohne, beim Start
   * der Sitzung mit Durchführung (`markUsed`). Erst dann wandert er ins Archiv;
   * eine abgebrochene Lobby lässt ihn unter „Vorbereitet“.
   */
  storeContent: (markUsed: boolean) => Promise<unknown>;
};

/**
 * Der offene Raum der Lehrkraft: Raum, Teilnehmende, Schüler, Abfrage, Uhr,
 * Zeitstatus, Öffnen, Starten, Beenden, Schließen und Aufräumen.
 */
export function useLiveRoomSession({
  hydrated,
  liveRoomConfig,
  clock,
  stage,
  roomClosed,
  dispatchFlow,
  applyRestoredContent,
  setError,
  roomConfig,
  wordCount,
  gameMode,
  storeContent,
}: LiveRoomSessionInput) {
  const [room, setRoom] = useState<OpenedLiveRoom | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const roomRef = useRef<OpenedLiveRoom | null>(null);
  const closingRef = useRef(false);
  const [participants, setParticipants] = useState<LiveRoomParticipant[]>([]);
  const [students, setStudents] = useState<LiveRoomStudent[]>([]);
  const [connectionWarning, setConnectionWarning] = useState("");

  // Wird bei jedem Rendern aktualisiert, damit `refresh` stabil bleibt.
  const serverEndedRef = useRef<() => void>(() => undefined);

  const refresh = useCallback(async () => {
    if (!liveRoomConfig || !room) return;
    const [nextParticipants, nextStudents, state] = await Promise.all([
      getLiveRoomParticipants(liveRoomConfig, room),
      stage === "live"
        ? getLiveRoomStudents(liveRoomConfig, room)
        : Promise.resolve([]),
      // Der Server schließt Räume nach 120 Minuten; ein Fehler hier stört nicht.
      getLiveRoomState(liveRoomConfig, room.roomId, {
        accessToken: room.accessToken,
      }).catch(() => null),
    ]);
    if (roomRef.current?.roomId !== room.roomId) return;
    setParticipants(nextParticipants);
    if (stage === "live") setStudents(nextStudents);
    if (state?.status === "ended") serverEndedRef.current();
  }, [liveRoomConfig, room, stage]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const openedAt = room?.openedAt;
  const timeline = useMemo(
    () => (openedAt ? roomTimeline(new Date(openedAt)) : null),
    [openedAt],
  );
  const timeState = useMemo(
    () =>
      openedAt
        ? roomClosed
          ? "closed"
          : roomTimeState(new Date(openedAt), new Date(nowMs))
        : null,
    [nowMs, openedAt, roomClosed],
  );

  // Uhr für „Code gilt bis“ und die Schließfrist. Ein Wechsel zurück in den
  // Vordergrund (Gerät im Standby) prüft sofort.
  useEffect(() => {
    if (!room || roomClosed) return;
    const tick = () => setNowMs(clock());
    tick();
    const interval = window.setInterval(tick, ROOM_CLOCK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [clock, room, roomClosed]);

  // Zurücksetzen ohne Aufruf an den Server (Raum ist schon zu Ende).
  function resetRoomState() {
    clearTeacherLiveRoom();
    closingRef.current = false;
    setRoom(null);
    setParticipants([]);
    setStudents([]);
    dispatchFlow({ type: "roomEnded" });
  }

  // Der Raum ist zu Ende. Im Live-Schritt bleiben die letzten Ergebnisse
  // samt CSV-Export sichtbar; aus der Lobby geht es zurück zum Inhalt.
  async function finishClosedRoom() {
    if (!room) return;
    if (stage !== "live") {
      resetRoomState();
      setError("Der Raum wurde geschlossen. Du kannst einen neuen öffnen.");
      return;
    }
    if (liveRoomConfig) {
      try {
        const [nextParticipants, nextStudents] = await Promise.all([
          getLiveRoomParticipants(liveRoomConfig, room),
          getLiveRoomStudents(liveRoomConfig, room),
        ]);
        setParticipants(nextParticipants);
        setStudents(nextStudents);
      } catch {
        // Die zuletzt gezeigten Ergebnisse bleiben stehen.
      }
    }
    clearTeacherLiveRoom();
    dispatchFlow({ type: "roomClosed", hasRoom: true });
  }
  useEffect(() => {
    serverEndedRef.current = () => {
      if (closingRef.current) return;
      closingRef.current = true;
      void finishClosedRoom();
    };
  });

  // Nach 120 Minuten beendet dieses Gerät den Raum selbst, genau einmal.
  // Der Server-Job ist nur die Absicherung, falls das Gerät nicht offen ist.
  const closesAtMs = timeline?.closesAt.getTime() ?? null;
  const onClockClosesRoom = useEffectEvent(() => finishClosedRoom());
  useEffect(() => {
    if (!liveRoomConfig || !room || roomClosed || closesAtMs === null) return;
    if (nowMs < closesAtMs || closingRef.current) return;
    closingRef.current = true;
    void (async () => {
      try {
        await endLiveRoom(liveRoomConfig, room);
      } catch {
        // Der Server schließt den Raum spätestens beim nächsten Aufräumen.
      }
      await onClockClosesRoom();
    })();
  }, [closesAtMs, liveRoomConfig, nowMs, room, roomClosed]);

  // Wiederaufnahme: Ein noch offener Raum aus diesem Browser-Tab kommt samt
  // Inhalt und Optionen zurück. Sie hat Vorrang vor Adressen und Absicht.
  const markRestoreChecked = useEffectEvent(() =>
    dispatchFlow({ type: "restoreChecked" }),
  );
  const applyRestoredRoom = useEffectEvent(
    (
      stored: OpenedLiveRoom,
      state: LiveRoomState,
      restoreClock: () => number,
    ) => {
      applyRestoredContent(
        parseLiveSession(
          state.config,
          state.sessionId ?? "lobby",
          "teacher-restore",
        ),
      );
      // Ohne gemerkte Öffnungszeit (ältere Sitzung) zählt der Moment der Wiederaufnahme.
      setRoom({ ...stored, openedAt: stored.openedAt ?? nowIso(restoreClock) });
      dispatchFlow({ type: "restored", live: state.status === "live" });
    },
  );
  useEffect(() => {
    if (!hydrated || !liveRoomConfig || room) return;
    const stored = readTeacherLiveRoom();
    if (!stored) {
      markRestoreChecked();
      return;
    }
    getLiveRoomState(liveRoomConfig, stored.roomId, {
      accessToken: stored.accessToken,
    })
      .then((state) => {
        if (!state || state.status === "ended") {
          clearTeacherLiveRoom();
          markRestoreChecked();
          return;
        }
        applyRestoredRoom(stored, state, clock);
      })
      .catch(() => {
        clearTeacherLiveRoom();
        markRestoreChecked();
      });
  }, [clock, hydrated, liveRoomConfig, room]);

  useEffect(() => {
    if (!liveRoomConfig || !room || roomClosed) return;
    let cancelled = false;
    let loading = false;
    const poll = async () => {
      if (cancelled || loading || document.visibilityState !== "visible")
        return;
      loading = true;
      try {
        await refresh();
        if (!cancelled) setConnectionWarning("");
      } catch {
        if (!cancelled)
          setConnectionWarning(
            "Die Verbindung zum Klassenraum wurde unterbrochen.",
          );
      } finally {
        loading = false;
      }
    };
    const first = window.setTimeout(() => void poll(), 0);
    const interval = window.setInterval(
      () => void poll(),
      stage === "live" ? 3_000 : 8_000,
    );
    const onVisible = () => void poll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [liveRoomConfig, refresh, room, roomClosed, stage]);

  const registeredNames = participants.map(({ studentName }) => studentName);
  const connectedNames = Array.from(
    new Set([
      ...participants.filter(isOnline).map(({ studentName }) => studentName),
    ]),
  ).sort((a, b) => a.localeCompare(b, "de"));
  const allNames = Array.from(new Set([...registeredNames, ...connectedNames]));

  const practicingNames = participants
    .filter((p) => p.activity === "practice" && isOnline(p))
    .map((p) => p.studentName);

  function statusFor(name: string): ParticipantStatus {
    return participantStatus(practicingNames, connectedNames, name);
  }

  async function openLobby() {
    setError("");
    if (!liveRoomConfig) {
      setError(
        "Live-Räume sind lokal noch nicht konfiguriert. Das Dashboard ist vollständig vorbereitet; URL und Publishable Key verbinden wir anschließend.",
      );
      return;
    }
    if (!wordCount)
      return setError("Bitte gib mindestens eine gültige Aufgabe ein.");
    dispatchFlow({ type: "busy", busy: true });
    try {
      const opened = {
        ...(await openLiveRoom(liveRoomConfig, roomConfig)),
        openedAt: nowIso(clock),
      };
      saveTeacherLiveRoom(opened);
      closingRef.current = false;
      setRoom(opened);
      setNowMs(clock());
      dispatchFlow({ type: "lobbyOpened" });
      // Beim Öffnen der Lobby wird der Inhalt abgelegt, ohne die Lobby
      // aufzuhalten; ein Fehler hier stoppt den Raum nicht.
      void storeContent(false).catch(() =>
        setError(
          "Der Raum ist offen, aber der Inhalt konnte nicht gespeichert werden.",
        ),
      );
    } catch {
      setError(
        "Der Raum konnte nicht geöffnet werden. Bitte prüfe die Verbindung.",
      );
    } finally {
      dispatchFlow({ type: "busy", busy: false });
    }
  }

  async function startSession() {
    if (!liveRoomConfig || !room) return;
    dispatchFlow({ type: "busy", busy: true });
    try {
      await updateLiveSession(
        liveRoomConfig,
        room,
        crypto.randomUUID(),
        roomConfig,
      );
      setStudents([]);
      dispatchFlow({ type: "sessionStarted", hasRoom: true });
      // Die Runde läuft: Der Inhalt gilt als durchgeführt (Archiv).
      void storeContent(true).catch(() =>
        setError(
          "Die Sitzung läuft, aber der Inhalt konnte nicht als durchgeführt gespeichert werden.",
        ),
      );
    } catch {
      setError("Die Sitzung konnte nicht sicher gestartet werden.");
    } finally {
      dispatchFlow({ type: "busy", busy: false });
    }
  }

  async function endRoom() {
    if (!liveRoomConfig || !room) return;
    dispatchFlow({ type: "busy", busy: true });
    try {
      await endLiveRoom(liveRoomConfig, room);
      // Die Ergebnisse bleiben im geschlossenen Raum stehen; die CSV gibt es
      // nur auf ausdrücklichen Klick („Ergebnisse als CSV herunterladen“),
      // nie ungefragt auf einem geteilten Gerät.
      if (students.length > 0) {
        closingRef.current = true;
        await finishClosedRoom();
      } else resetRoomState();
    } catch {
      setError("Der Raum konnte nicht beendet werden.");
    } finally {
      dispatchFlow({ type: "busy", busy: false });
    }
  }

  function exportCsv() {
    const resultNames = resultNamesFor(gameMode, students, allNames);
    const blob = new Blob(
      [
        buildTeacherResultCsv(
          resultNames,
          students,
          wordCount,
          (name) => csvParticipantLabel(name, participants),
          roomConfig.words,
        ),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laufdiktat-ergebnisse-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function removeParticipant(name: string) {
    if (!liveRoomConfig || !room) return;
    await removeLiveRoomParticipant(liveRoomConfig, room, name);
    await refresh();
  }

  function labelFor(key: string | null | undefined) {
    return participantLabel(participants, key);
  }

  function animalFor(key: string | null | undefined) {
    return participantAnimal(participants, key);
  }

  return {
    room,
    connectedNames,
    openLobby,
    startSession,
    endRoom,
    resetRoomState,
    /** Felder, die `TeacherLiveModel` unverändert übernimmt. */
    model: {
      room,
      participants,
      students,
      connectionWarning,
      roomTimeline: timeline,
      roomTimeState: timeState,
      connectedNames,
      exportCsv,
      removeParticipant,
      labelFor,
      animalFor,
      statusFor,
    },
  };
}
