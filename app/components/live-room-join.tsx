"use client";
import { useLiveProgressDelivery } from "./use-live-progress-delivery";

import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { extractJoinCode, normalizeJoinCode } from "../../src/domain/join-code";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import {
  getLiveProgress,
  getLiveRoomState,
  joinLiveRoom,
  readLiveRoomIdentity,
  saveLiveRoomIdentity,
  touchLiveParticipant,
  type LiveProgress,
  type JoinedLiveRoom,
} from "../../src/integrations/laufdiktat/room-api";
import {
  parseLiveSession,
  type LiveSession,
} from "../../src/integrations/laufdiktat/live-session";
import { readLiveTrace } from "../../src/integrations/laufdiktat/live-trace";
import { learnerProfileRepository } from "../../src/storage/learner-profile";
import { animalTokenFromDisplayName } from "../../src/domain/learner-profile";
import { AnimalImage } from "../ui/animal";
import { RoomFrame } from "../ui/room-frame";
import { useLearnerProfile } from "../ui/use-learner-profile";
import { useRelease } from "../release/release-context";
import { LiveRunningDictationGame } from "../raum/spiel/live-game";
import { QrCodeScanner } from "../ui/qr-scanner";
import { SegmentedRoomCode } from "./segmented-room-code";
import { useHydrated } from "./use-hydrated";
import {
  forgetActiveRoom,
  rememberActiveRoom,
  type RoomActivity,
} from "./room-activity";
import { useLiveSessionGuards } from "./use-live-session-guards";
import { useLiveVocabularyTransfer } from "./use-live-vocabulary-transfer";

import { LIVE_APP_VERSION } from "../../src/app-version";
import { LiveVersionNotice } from "./live-version-notice";
import { Icon } from "../ui/icons";

type View = "join" | "connecting" | "lobby" | "starting" | "game" | "ended";
type AttackType = "ink" | "flicker";

type LiveRoomJoinProps = {
  initialCode?: string;
  liveRoomConfig: LiveRoomConfig | null;
};

export function LiveRoomJoin({
  initialCode = "",
  liveRoomConfig,
}: LiveRoomJoinProps) {
  const hydrated = useHydrated();
  const profile = useLearnerProfile();
  const visibility = useRelease();
  const [code, setCode] = useState(() =>
    normalizeJoinCode(initialCode).replace(/\D/g, "").slice(0, 4),
  );
  const joinForm = useRef<HTMLFormElement>(null);
  const [requiredVersion, setRequiredVersion] = useState<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    let frame = 0;
    try {
      const pending = sessionStorage.getItem("lernraum-live-resume");
      if (pending && /^\d{4}$/.test(pending)) {
        if (pending !== code)
          frame = requestAnimationFrame(() => setCode(pending));
        else {
          sessionStorage.removeItem("lernraum-live-resume");
          joinForm.current?.requestSubmit();
        }
      }
    } catch {
      /* Manual rejoin stays available if storage is blocked. */
    }
    return () => cancelAnimationFrame(frame);
  }, [hydrated, code]);
  const [view, setView] = useState<View>("join");
  const [error, setError] = useState("");
  const [connectionWarning, setConnectionWarning] = useState("");
  const [room, setRoom] = useState<JoinedLiveRoom | null>(null);
  // Keep the screen awake from the moment a room is joined — including the
  // "warte auf die Lehrkraft" lobby wait, not just once the dictation is
  // actually running. A locked screen drops the Realtime connection and the
  // student silently disappears from the teacher's lobby.
  useLiveSessionGuards(
    Boolean(room) &&
      (view === "lobby" || view === "starting") &&
      !requiredVersion,
  );
  const [session, setSession] = useState<LiveSession | null>(null);
  // Letzte bekannte Runde: nach dem Ende wird `session` geleert, die Übernahme
  // der Vokabeln braucht sie aber noch.
  const lastSessionRef = useRef<LiveSession | null>(null);
  const endedSessionRef = useRef<LiveSession | null>(null);
  const vocabularyTransfer = useLiveVocabularyTransfer();
  const [initialProgress, setInitialProgress] = useState<LiveProgress | null>(
    null,
  );
  const [roster, setRoster] = useState<Record<string, number>>({});
  const [incomingAttack, setIncomingAttack] = useState<{
    id: number;
    type: AttackType;
    from: string;
  } | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Last progress payload sent for this student, kept so a "request-progress"
  // broadcast from a (re)joining classmate can be answered immediately
  // instead of waiting for the next natural progress update.
  const lastProgressBroadcastRef = useRef<{
    event: "student-progress" | "student-finished";
    payload: Record<string, unknown>;
  } | null>(null);
  useEffect(() => {
    if (!room || !liveRoomConfig) return;
    const activeRoom = room;
    const activeConfig = liveRoomConfig;

    const client = getLiveRoomClient(activeConfig);
    const channel = client.channel(`room-${code}`, {
      config: { presence: { key: activeRoom.studentName } },
    });
    channelRef.current = channel;

    async function syncAuthorizedRoomState() {
      try {
        const state = await getLiveRoomState(activeConfig, activeRoom.roomId, {
          participantToken: activeRoom.participantToken,
        });
        if (!state || state.status === "ended") {
          endedSessionRef.current = lastSessionRef.current;
          lastSessionRef.current = null;
          setSession(null);
          setView("ended");
          return;
        }
        if (state.status === "live" && state.sessionId) {
          const nextSession = parseLiveSession(
            state.config,
            state.sessionId,
            `${code}:${activeRoom.studentName}:${state.sessionId}`,
          );
          const progress = await getLiveProgress(activeConfig, {
            roomId: activeRoom.roomId,
            sessionId: state.sessionId,
            participantToken: activeRoom.participantToken,
            studentName: activeRoom.studentName,
          });
          const required = nextSession["appVersion"];
          if (typeof required === "string" && required !== LIVE_APP_VERSION) {
            setRequiredVersion(required);
            return;
          }
          setRequiredVersion(null);
          setInitialProgress(progress);
          lastSessionRef.current = nextSession;
          setSession(nextSession);
          setView("game");
        }
      } catch {
        setConnectionWarning(
          "Die Sitzungsdaten konnten gerade nicht sicher geladen werden.",
        );
      }
    }

    // Presence sign-in with acknowledgement check and retry: track() can
    // come back "timed out" or "rate limited". Without a retry the student
    // stays invisible in the teacher's lobby forever (channel connected, but
    // never present) while their own device shows the completely normal
    // waiting screen — the "18 angemeldet, 17 sichtbar" case from real
    // classroom use.
    async function trackPresence() {
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        // Channel was torn down and rebuilt in the meantime (unmount/re-run)
        // — the new channel's own SUBSCRIBED pass will take over instead.
        if (channelRef.current !== channel) return;
        const result = await channel.track({
          name: activeRoom.studentName,
          activity: "room" satisfies RoomActivity,
        });
        if (result === "ok") {
          setConnectionWarning("");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
      setConnectionWarning(
        "Du bist verbunden, aber noch nicht in der Teilnehmerliste sichtbar.",
      );
    }

    // Device wakes from standby / tab returns to the foreground: don't
    // passively wait for the automatic reconnect backoff, kick it directly.
    // If the channel is still joined, a fresh presence sign-in is enough; if
    // the socket dropped (screen lock), connect() speeds up the rebuild —
    // the following SUBSCRIBED event then re-tracks/resyncs as on first join.
    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (channel.state === "joined") {
        void trackPresence();
      } else {
        client.realtime.connect();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    channel
      // Drop disconnected classmates from the battle roster: it used to only
      // grow (broadcast-based), so a student who lost their connection stayed
      // selectable as an attack target forever, with the attack then landing
      // on nobody. Presence reflects the real connection state; if they come
      // back, their next student-progress broadcast re-adds them.
      .on("presence", { event: "sync" }, () => {
        const present = new Set(Object.keys(channel.presenceState()));
        setRoster((current) => {
          const entries = Object.entries(current).filter(([name]) =>
            present.has(name),
          );
          return entries.length === Object.keys(current).length
            ? current
            : Object.fromEntries(entries);
        });
      })
      .on("broadcast", { event: "session-start" }, () => {
        setView("starting");
        void syncAuthorizedRoomState();
      })
      .on("broadcast", { event: "session-ended" }, () => {
        void syncAuthorizedRoomState();
      })
      .on("broadcast", { event: "student-progress" }, ({ payload }) => {
        const update = payload as { name?: unknown; index?: unknown };
        if (typeof update.name !== "string" || typeof update.index !== "number")
          return;
        const name = update.name;
        const index = update.index;
        setRoster((current) => ({ ...current, [name]: index }));
      })
      .on("broadcast", { event: "student-finished" }, ({ payload }) => {
        const update = payload as { name?: unknown; currentIndex?: unknown };
        if (
          typeof update.name !== "string" ||
          typeof update.currentIndex !== "number"
        )
          return;
        const name = update.name;
        const index = update.currentIndex;
        setRoster((current) => ({
          ...current,
          [name]: index,
        }));
      })
      .on("broadcast", { event: "request-progress" }, () => {
        // A (re)joining classmate is asking for everyone's current state —
        // resend ours so their roster/battle view fills back in immediately
        // instead of waiting for our next natural progress update.
        if (lastProgressBroadcastRef.current) {
          void channel.send({
            type: "broadcast",
            ...lastProgressBroadcastRef.current,
          });
        }
      })
      .on("broadcast", { event: "attack" }, ({ payload }) => {
        const attack = payload as {
          to?: unknown;
          from?: unknown;
          type?: unknown;
        };
        if (
          attack.to !== activeRoom.studentName ||
          typeof attack.from !== "string" ||
          (attack.type !== "ink" && attack.type !== "flicker")
        )
          return;
        setIncomingAttack({
          id: Date.now(),
          from: attack.from,
          type: attack.type,
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await trackPresence();
          // Ask everyone else to resend their progress — harmless to send
          // again after a mere reconnect too, and it's how we fill in the
          // roster after losing and regaining the connection ourselves.
          await channel.send({
            type: "broadcast",
            event: "request-progress",
            payload: {},
          });
          await syncAuthorizedRoomState();
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnectionWarning(
            "Die Verbindung zur Unterrichtsrunde wurde unterbrochen.",
          );
        }
      });

    // The authorized HTTP state must also load when school networks block WebSockets.
    void syncAuthorizedRoomState();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      channelRef.current = null;
      void client.removeChannel(channel);
    };
  }, [code, liveRoomConfig, room]);

  useEffect(() => {
    if (!room || !liveRoomConfig) return;
    const activeRoom = room;
    const activeConfig = liveRoomConfig;
    let cancelled = false;
    const beat = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      // Solange die Raumseite offen ist, läuft die 45-Minuten-Frist neu.
      rememberActiveRoom(code, activeRoom.studentName);
      void touchLiveParticipant(
        activeConfig,
        activeRoom.roomId,
        activeRoom.participantToken,
      ).catch(() => undefined);
    };
    beat();
    const interval = window.setInterval(beat, 15_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [code, liveRoomConfig, room]);

  // Runde beendet: nicht mehr als „übt weiter“ melden.
  useEffect(() => {
    if (view === "ended") forgetActiveRoom();
  }, [view]);

  // Vorzeitiges Ende: Vokabeln genauso übernehmen, nicht erreichte als „unseen“.
  const { transfer: transferVocabulary } = vocabularyTransfer;
  useEffect(() => {
    const ended = endedSessionRef.current;
    if (view !== "ended" || !ended) return;
    transferVocabulary(
      ended,
      readLiveTrace(ended.sessionId) ?? {
        currentIndex: 0,
        finished: false,
        wordErrors: {},
        wordHelps: {},
      },
    );
  }, [view, transferVocabulary]);

  const {
    status: deliveryStatus,
    send: sendProgress,
    retry: retryProgress,
  } = useLiveProgressDelivery(
    liveRoomConfig,
    room?.roomId,
    room?.participantToken,
    room?.studentName,
    session?.sessionId,
  );
  const reportProgress = useCallback(
    (progress: LiveProgress) => {
      if (!liveRoomConfig || !room || !session) return;
      sendProgress(progress);
      const event = progress.finished
        ? ("student-finished" as const)
        : ("student-progress" as const);
      const payload = {
        name: progress.stationNumber
          ? `Station ${progress.stationNumber}`
          : room.studentName,
        index: progress.currentIndex,
        ...progress,
      };
      lastProgressBroadcastRef.current = { event, payload };
      void channelRef.current?.send({ type: "broadcast", event, payload });
    },
    [liveRoomConfig, room, session, sendProgress],
  );

  const loadProgress = useCallback(
    async (studentKey: string) => {
      if (!liveRoomConfig || !room || !session) return null;
      return getLiveProgress(liveRoomConfig, {
        roomId: room.roomId,
        sessionId: session.sessionId,
        participantToken: room.participantToken,
        studentName: studentKey,
      });
    },
    [liveRoomConfig, room, session],
  );

  const sendAttack = useCallback(
    (to: string, type: AttackType) => {
      if (!room || !channelRef.current) return false;
      void channelRef.current.send({
        type: "broadcast",
        event: "attack",
        payload: { from: room.studentName, to, type },
      });
      return true;
    },
    [room],
  );

  function handleScan(value: string) {
    const scanned = extractJoinCode(value).replace(/\D/g, "").slice(0, 4);
    setCode(scanned);
    setError("");
    if (/^\d{4}$/.test(scanned)) void joinCode(scanned);
  }

  const joinBusy = useRef(false);
  async function joinCode(rawCode: string) {
    if (joinBusy.current) return;
    const normalizedCode = rawCode.replace(/\D/g, "").slice(0, 4);
    if (!/^\d{4}$/.test(normalizedCode)) {
      setError("Bitte gib den vierstelligen Raumcode ein.");
      return;
    }
    if (!liveRoomConfig) {
      setError(
        "Live-Räume sind in dieser lokalen Vorschau noch nicht mit dem Laufdiktat-Raumdienst verbunden.",
      );
      return;
    }

    joinBusy.current = true;
    setView("connecting");
    setError("");
    try {
      const identity = readLiveRoomIdentity(normalizedCode);
      // Der Serverschlüssel ist anonym; das Tier kommt aus der gespeicherten Identität oder dem Profil.
      const animalToken = !identity
        ? learnerProfileRepository.ensure().animal
        : identity.animalToken !== undefined
          ? identity.animalToken
          : animalTokenFromDisplayName(identity.name);
      const joined = await joinLiveRoom(liveRoomConfig, normalizedCode, {
        animalToken,
        participantToken: identity?.participantToken,
      });
      if (!joined || joined.status === "ended") {
        setView("join");
        setError("Dieser Raum ist nicht verfügbar oder wurde bereits beendet.");
        return;
      }
      saveLiveRoomIdentity({
        code: normalizedCode,
        name: joined.studentName,
        participantToken: joined.participantToken,
        animalToken: joined.animalToken,
      });
      setCode(normalizedCode);
      setRoom(joined);
      setView(joined.status === "live" ? "starting" : "lobby");
    } catch {
      setView("join");
      setError("Der Raum konnte nicht erreicht werden. Bitte prüfe den Code.");
    } finally {
      joinBusy.current = false;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void joinCode(code);
  }

  const autoJoined = useRef(false);
  useEffect(() => {
    if (
      !hydrated ||
      !liveRoomConfig ||
      !/^\d{4}$/.test(initialCode) ||
      autoJoined.current
    )
      return;
    autoJoined.current = true;
    joinForm.current?.requestSubmit();
  }, [hydrated, initialCode, liveRoomConfig]);

  if (requiredVersion)
    return (
      <LiveVersionNotice
        key={requiredVersion}
        required={requiredVersion}
        code={code}
      />
    );

  // studentName ist ein anonymer Serverschlüssel; angezeigt wird nur das Tier.
  // Ältere Raumdienste liefern kein Tierfeld; dann gilt der Tiername im
  // Schlüssel oder das eigene Profiltier.
  const roomAnimal =
    room?.animalToken ??
    (room ? animalTokenFromDisplayName(room.studentName) : null);
  const lobbyName = room?.animalToken
    ? room.animalNumber > 1
      ? `${room.animalToken} ${room.animalNumber}`
      : room.animalToken
    : roomAnimal
      ? room!.studentName
      : null;
  const frameAnimal = roomAnimal ?? profile?.animal ?? null;

  if (view === "game" && room && session) {
    return (
      <LiveRunningDictationGame
        key={session.sessionId}
        code={code}
        studentName={room.studentName}
        displayName={lobbyName}
        animal={frameAnimal}
        session={session}
        connectionWarning={connectionWarning}
        deliveryStatus={deliveryStatus}
        onRetryProgress={retryProgress}
        initialProgress={initialProgress}
        onProgress={reportProgress}
        onLoadProgress={loadProgress}
        roster={roster}
        incomingAttack={incomingAttack}
        onSendAttack={sendAttack}
      />
    );
  }

  if (view === "lobby" || view === "starting") {
    return (
      <RoomFrame code={code} animal={frameAnimal} subtitle={lobbyName}>
        <section className="ui-card ui-room__card" aria-live="polite">
          <span className="ui-room__mark" aria-hidden="true">
            {view === "lobby" ? (
              <Icon name="check" size={28} />
            ) : (
              <Icon name="arrow" size={28} />
            )}
          </span>
          <AnimalImage
            animal={frameAnimal}
            size={120}
            className="ui-bob ui-room__animal"
          />
          <h1 className="ui-room__title">
            {view === "lobby"
              ? lobbyName
                ? `Du bist dabei, ${lobbyName}.`
                : "Du bist dabei."
              : "Das Laufdiktat startet."}
          </h1>
          <p className="ui-muted">
            {view === "lobby"
              ? "Warte kurz, bis die Lehrkraft die Runde startet."
              : "Die Übung wird im Lernraum vorbereitet."}
          </p>
          {connectionWarning ? (
            <p className="ui-notice" role="status">
              {connectionWarning}
            </p>
          ) : null}
        </section>
      </RoomFrame>
    );
  }

  if (view === "ended") {
    return (
      <RoomFrame code={code} animal={frameAnimal}>
        <section className="ui-card ui-room__card" aria-live="polite">
          <span className="ui-room__mark ui-room__mark--bad" aria-hidden="true">
            <Icon name="close" size={28} />
          </span>
          <h1 className="ui-room__title">Diese Runde ist beendet.</h1>
          <p className="ui-muted">
            Die Lehrkraft hat die Unterrichtsrunde geschlossen.
          </p>
          {vocabularyTransfer.notice ? (
            <p
              className={`ui-notice${vocabularyTransfer.status === "success" ? " ui-notice--good" : ""}`}
              role="status"
            >
              {vocabularyTransfer.notice}
            </p>
          ) : null}
          {vocabularyTransfer.status === "success" && visibility.lernen ? (
            <Link
              className="ui-btn ui-btn--primary ui-btn--block"
              href="/lernbox"
            >
              Zur LernBox
            </Link>
          ) : null}
          {visibility.lernen ? (
            <Link
              className="ui-btn ui-btn--primary ui-btn--block"
              href="/lernen"
            >
              Zum persönlichen Lernraum
            </Link>
          ) : (
            <Link className="ui-btn ui-btn--primary ui-btn--block" href="/">
              Zur Startseite
            </Link>
          )}
        </section>
      </RoomFrame>
    );
  }

  if (error) {
    return (
      <RoomFrame code={code} animal={frameAnimal}>
        <section
          className="ui-card ui-room__card"
          role="alert"
          aria-live="assertive"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- statische Illustration */}
          <img src="/face-expectation.svg" alt="" width={72} height={72} />
          <h1 className="ui-room__title">Ups, hier lief wohl etwas schief</h1>
          <p className="ui-muted">{error}</p>
          <button
            type="button"
            className="ui-btn ui-btn--primary ui-btn--block"
            onClick={() => setError("")}
          >
            <Icon name="back" size={18} /> Zur Code-Eingabe
          </button>
        </section>
      </RoomFrame>
    );
  }

  return (
    <RoomFrame code="" animal={frameAnimal}>
      <section
        className="ui-card ui-room__card ui-room__join"
        aria-labelledby="live-room-title"
        data-hydrated={hydrated ? "true" : "false"}
      >
        <h1 id="live-room-title" className="ui-room__title">
          Bereit für dein Laufdiktat?
        </h1>
        <p className="ui-muted">
          Gib den Raumcode deiner Lehrkraft ein oder scanne den QR-Code.
        </p>
        <form
          ref={joinForm}
          onSubmit={submit}
          noValidate
          className="ui-room-code"
        >
          <span id="live-room-code-label" className="ui-eyebrow">
            Raumcode
          </span>
          <div className="ui-row">
            <div className="ui-grow">
              <SegmentedRoomCode
                idPrefix="live-room"
                labelId="live-room-code-label"
                value={code}
                invalid={Boolean(error)}
                describedBy={undefined}
                className="ui-code"
                onChange={(value) => {
                  setCode(value);
                  setError("");
                }}
              />
            </div>
            <QrCodeScanner
              buttonClassName="ui-room-code__camera"
              onResult={handleScan}
            />
          </div>

          <button
            className="ui-btn ui-btn--primary ui-btn--block"
            type="submit"
            disabled={!hydrated || view === "connecting"}
          >
            {view === "connecting"
              ? "Verbindung wird aufgebaut …"
              : "Beitreten"}
          </button>
        </form>
      </section>
      <p className="ui-small ui-muted ui-center">
        <Link href="/impressum">Impressum</Link> ·{" "}
        <Link href="/datenschutz">Datenschutz</Link>
      </p>
    </RoomFrame>
  );
}
