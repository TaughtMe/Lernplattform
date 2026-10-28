"use client";
import {
  WORD_STORE_FULL_NOTICE,
  summarizeSavedWords,
} from "../../src/integrations/laufdiktat/word-store-transfer";
import { useLiveProgressDelivery } from "../raum/use-live-progress-delivery";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { extractJoinCode, normalizeJoinCode } from "../../src/domain/join-code";
import { type LiveRoomConfig } from "../../src/integrations/laufdiktat/live-room-client";
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
import { placementRulesFor } from "../../src/domain/live-vocabulary-placement";
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
import { useHydrated } from "../ui/use-hydrated";
import { forgetActiveRoom, rememberActiveRoom } from "./room-activity";
import { useLiveSessionGuards } from "../raum/use-live-session-guards";
import { useLiveWordStoreTransfer } from "../raum/use-live-word-store-transfer";
import { useLiveVocabularyTransfer } from "../raum/use-live-vocabulary-transfer";
import {
  getLiveRoomActivity,
  sendLiveRoomAttack,
} from "../../src/integrations/laufdiktat/room-activity-api";
import { useWritingRelief } from "../raum/use-writing-relief";

import { LIVE_APP_VERSION } from "../../src/app-version";
import { LiveVersionNotice } from "./live-version-notice";
import { Icon } from "../ui/icons";

/** So oft prüft ein Schülergerät, ob der Raum vom Server geschlossen wurde. */
const ROOM_POLL_MS = 2_000;

type View = "join" | "connecting" | "lobby" | "starting" | "game" | "ended";
type AttackType = "ink" | "flicker";

type LiveRoomJoinProps = {
  initialCode?: string;
  liveRoomConfig: LiveRoomConfig | null;
};

function savedWordsSentence(words: readonly string[]) {
  const { shown, more } = summarizeSavedWords(words);
  const quoted = shown.map((word) => `„${word}“`);
  const list =
    quoted.length > 1
      ? `${quoted.slice(0, -1).join(", ")} und ${quoted[quoted.length - 1]}`
      : quoted.join("");
  const total = shown.length + more;
  return `${list}${more > 0 ? ` und ${more} weitere` : ""} ${total === 1 ? "liegt" : "liegen"} jetzt in deinem Wortspeicher.`;
}

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
  // Die beendete Runde als Zustand: Die Schreiberleichterung wird danach geprüft.
  const [endedSession, setEndedSession] = useState<LiveSession | null>(null);
  const vocabularyTransfer = useLiveVocabularyTransfer();
  const wordStoreTransfer = useLiveWordStoreTransfer();
  const [initialProgress, setInitialProgress] = useState<LiveProgress | null>(
    null,
  );
  const [roster, setRoster] = useState<Record<string, number>>({});
  const [peers, setPeers] = useState<
    Record<string, { label: string; animal: string | null }>
  >({});
  const [incomingAttack, setIncomingAttack] = useState<{
    id: number;
    type: AttackType;
    from: string;
  } | null>(null);

  useEffect(() => {
    if (!room || !liveRoomConfig) return;
    const activeRoom = room;
    const activeConfig = liveRoomConfig;
    let cancelled = false;
    let loading = false;
    let ended = false;
    let loadedSession: string | null = null;
    let lastAttackId = 0;

    async function poll() {
      if (
        cancelled ||
        ended ||
        loading ||
        document.visibilityState !== "visible"
      )
        return;
      loading = true;
      try {
        const state = await getLiveRoomState(activeConfig, activeRoom.roomId, {
          participantToken: activeRoom.participantToken,
        });
        if (cancelled) return;
        if (!state || state.status === "ended") {
          ended = true;
          setEndedSession(lastSessionRef.current);
          lastSessionRef.current = null;
          setSession(null);
          setView("ended");
          return;
        }
        if (state.status === "live" && state.sessionId) {
          if (loadedSession !== state.sessionId) {
            const nextSession = parseLiveSession(
              state.config,
              state.sessionId,
              code + ":" + activeRoom.studentName + ":" + state.sessionId,
            );
            const required = nextSession["appVersion"];
            if (typeof required === "string" && required !== LIVE_APP_VERSION) {
              setRequiredVersion(required);
              return;
            }
            const progress = await getLiveProgress(activeConfig, {
              roomId: activeRoom.roomId,
              sessionId: state.sessionId,
              participantToken: activeRoom.participantToken,
              studentName: activeRoom.studentName,
            });
            if (cancelled) return;
            setRequiredVersion(null);
            setInitialProgress(progress);
            lastSessionRef.current = nextSession;
            setSession(nextSession);
            setView("game");
            loadedSession = state.sessionId;
            lastAttackId = 0;
            setIncomingAttack(null);
          }
          const activity = await getLiveRoomActivity(
            activeConfig,
            activeRoom,
            state.sessionId,
            lastAttackId,
          );
          if (cancelled) return;
          setRoster(
            Object.fromEntries(
              activity.peers.map((peer) => [peer.key, peer.index]),
            ),
          );
          setPeers(
            Object.fromEntries(
              activity.peers.map((peer) => [
                peer.key,
                {
                  label: peer.animal
                    ? peer.animal + (peer.number > 1 ? " " + peer.number : "")
                    : "Mitspieler",
                  animal: peer.animal,
                },
              ]),
            ),
          );
          const attack = activity.attacks.at(-1);
          if (attack) {
            lastAttackId = attack.id;
            setIncomingAttack(attack);
          }
        }
        setConnectionWarning("");
      } catch {
        if (!cancelled)
          setConnectionWarning(
            "Die Sitzungsdaten konnten gerade nicht sicher geladen werden.",
          );
      } finally {
        loading = false;
      }
    }
    void poll();
    const interval = window.setInterval(() => void poll(), ROOM_POLL_MS);
    const onVisible = () => void poll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [code, liveRoomConfig, room]);

  useEffect(() => {
    if (!room || !liveRoomConfig || view === "ended") return;
    const activeRoom = room;
    const activeConfig = liveRoomConfig;
    let cancelled = false;
    const beat = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      // Solange die Raumseite offen ist, läuft die 45-Minuten-Frist neu.
      rememberActiveRoom(code, activeRoom.studentName, activeRoom);
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
  }, [code, liveRoomConfig, room, view]);

  // Runde beendet: nicht mehr als „übt weiter“ melden.
  useEffect(() => {
    if (view === "ended") forgetActiveRoom();
  }, [view]);

  // Vorzeitiges Ende: Vokabeln genauso übernehmen, nicht erreichte als „unseen“.
  const { transfer: transferVocabulary } = vocabularyTransfer;
  const { transfer: transferWordStore } = wordStoreTransfer;
  useEffect(() => {
    if (view !== "ended" || !endedSession) return;
    transferWordStore(
      endedSession,
      readLiveTrace(endedSession.sessionId) ?? {
        currentIndex: 0,
        finished: false,
        wordErrors: {},
        wordHelps: {},
      },
    );
  }, [view, endedSession, transferWordStore]);
  const endedRelief = useWritingRelief(endedSession?.classSeal);
  useEffect(() => {
    if (view !== "ended" || !endedSession || endedRelief === undefined) return;
    transferVocabulary(
      endedSession,
      readLiveTrace(endedSession.sessionId) ?? {
        currentIndex: 0,
        finished: false,
        wordErrors: {},
        wordHelps: {},
        wordTolerated: {},
      },
      placementRulesFor(endedRelief),
    );
  }, [view, endedSession, endedRelief, transferVocabulary]);

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
    async (to: string, type: AttackType) => {
      if (!room || !liveRoomConfig || !session) return false;
      try {
        return await sendLiveRoomAttack(
          liveRoomConfig,
          room,
          session.sessionId,
          to,
          type,
        );
      } catch {
        setConnectionWarning(
          "Der Angriff konnte nicht gesendet werden. Bitte versuche es erneut.",
        );
        return false;
      }
    },
    [room, liveRoomConfig, session],
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
        setError("Raumcode ungültig oder abgelaufen.");
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
      setError("Keine Verbindung zum Raum. Frag deine Lehrkraft.");
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
        peers={peers}
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
          {wordStoreTransfer.result.status === "success" ? (
            <p className="ui-notice ui-notice--good" role="status">
              {savedWordsSentence(wordStoreTransfer.result.added)}
              {wordStoreTransfer.result.full
                ? ` ${WORD_STORE_FULL_NOTICE}`
                : ""}
            </p>
          ) : null}
          {wordStoreTransfer.result.status === "error" ? (
            <p className="ui-notice" role="status">
              {wordStoreTransfer.result.notice}
            </p>
          ) : null}
          {wordStoreTransfer.result.status === "success" &&
          visibility.wortspeicher ? (
            <Link
              className="ui-btn ui-btn--primary ui-btn--block"
              href="/frei/german/lernwoerter"
            >
              Im Wortspeicher üben
            </Link>
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
