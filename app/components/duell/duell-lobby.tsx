"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  getDuellState,
  listDuellCandidatePools,
  listDuellParticipants,
  submitDuellCandidates,
  submitDuellContent,
  type DuellParticipantRow,
} from "../../../src/duell/duell-api.ts";
import { assembleDuellContent, type DuellWord } from "../../../src/duell/duell-content.ts";
import { buildDuellCandidates, fromRemoteDuellCandidates, toRemoteDuellCandidates } from "../../../src/duell/duell-vocab-bridge.ts";
import type { LernBoxService } from "../../../src/domain/lernbox-service.ts";
import type { JoinedDuellIdentity } from "./duell-app.tsx";

const POLL_INTERVAL_MS = 2500;

type Props = {
  identity: JoinedDuellIdentity;
  service: LernBoxService;
  onLive: (content: DuellWord[]) => void;
  onLeave: () => void;
};

export function DuellLobby({ identity, service, onLive, onLeave }: Props) {
  const [participants, setParticipants] = useState<DuellParticipantRow[]>([]);
  const [poolCount, setPoolCount] = useState(0);
  const [showQr, setShowQr] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedOwnPool = useRef(false);
  const liveHandled = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function submitOwnPool() {
      if (submittedOwnPool.current) return;
      submittedOwnPool.current = true;
      try {
        const candidates = await buildDuellCandidates(service);
        await submitDuellCandidates(identity.duellId, identity.participantToken, toRemoteDuellCandidates(candidates));
      } catch {
        submittedOwnPool.current = false; // retry on next poll tick if this failed
      }
    }

    async function poll() {
      try {
        const [state, list, pools] = await Promise.all([
          getDuellState(identity.duellId, identity.participantToken),
          listDuellParticipants(identity.duellId, identity.participantToken),
          listDuellCandidatePools(identity.duellId, identity.participantToken),
        ]);
        if (cancelled) return;
        setParticipants(list);
        setPoolCount(pools.length);
        if (state?.status === "live" && state.content && !liveHandled.current) {
          liveHandled.current = true;
          onLive(state.content);
        }
      } catch {
        // transient network hiccup — the next tick tries again
      }
    }

    void submitOwnPool();
    void poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.duellId, identity.participantToken]);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const pools = await listDuellCandidatePools(identity.duellId, identity.participantToken);
      const ordered = [...pools].sort((a, b) => a.joinOrder - b.joinOrder);
      const participantCandidates = ordered.map((pool) => fromRemoteDuellCandidates(pool.candidates));
      const content = assembleDuellContent(identity.art, participantCandidates, identity.duellId, identity.roundSize);
      if (content.length === 0) {
        setError("Noch keine Wörter verfügbar — bitte kurz warten, bis die LernBox geladen ist.");
        setStarting(false);
        return;
      }
      await submitDuellContent(identity.duellId, identity.participantToken, content);
      liveHandled.current = true;
      onLive(content);
    } catch {
      setError("Duell konnte nicht gestartet werden. Prüfe deine Internetverbindung.");
      setStarting(false);
    }
  }

  const isCreator = identity.joinOrder === 0;
  const canStart = identity.art === "wechselduell" ? poolCount >= 2 : poolCount >= 1;

  return (
    <div className="duell-lobby">
      <div className="duell-lobby__code-row">
        <div className="duell-lobby__code">{identity.code}</div>
        <button type="button" className="button button--quiet" onClick={() => setShowQr(true)}>QR-Code zeigen</button>
      </div>

      <p className="duell-lobby__hint">Teile diesen Code, damit andere beitreten können.</p>

      <ul className="duell-lobby__participants">
        {participants.map((participant) => (
          <li key={participant.joinOrder}>
            {participant.alias}
            {participant.joinOrder === 0 && <span className="duell-lobby__creator-badge">Ersteller:in</span>}
          </li>
        ))}
      </ul>

      {error && <p role="alert" className="duell-start__error">{error}</p>}

      {isCreator ? (
        <>
          <button className="button button--primary" type="button" onClick={handleStart} disabled={starting || !canStart}>
            {starting ? "Starte …" : "Duell starten"}
          </button>
          {!canStart && <p className="duell-lobby__hint">Wechselduell braucht mindestens eine weitere Person in der Lobby.</p>}
        </>
      ) : (
        <p className="duell-lobby__hint">Warte, bis die Ersteller:in das Duell startet …</p>
      )}

      <button className="button button--quiet" type="button" onClick={onLeave}>Verlassen</button>

      {showQr && (
        <div className="qr-overlay" role="dialog" aria-modal="true" aria-label="QR-Code für den Duell-Beitritt">
          <button type="button" className="qr-overlay__backdrop" onClick={() => setShowQr(false)} aria-label="Schließen" />
          <div className="qr-overlay__panel">
            <div className="qr-overlay__heading">
              <h3>Duell {identity.code}</h3>
              <button type="button" onClick={() => setShowQr(false)} aria-label="Schließen"><X className="qr-overlay__icon" /></button>
            </div>
            <div className="qr-overlay__code">
              <QRCodeSVG value={`${window.location.origin}/duell?code=${identity.code}`} size={280} level="H" />
            </div>
            <p className="qr-overlay__hint">Neben den QR-Code tippen zum Schließen.</p>
          </div>
        </div>
      )}
    </div>
  );
}
