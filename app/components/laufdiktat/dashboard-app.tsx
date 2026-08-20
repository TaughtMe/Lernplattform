"use client";

import { useRef, useState, type FormEvent } from "react";
import { isSupabaseConfigured } from "../../../src/laufdiktat/supabase-client.ts";
import { useDashboardRoom, type DashboardStep } from "../../../src/laufdiktat/use-dashboard-room.ts";
import { computeStars } from "../../../src/laufdiktat/scoring.ts";
import type { WordItem } from "../../../src/laufdiktat/types.ts";

function wordsFromText(text: string): WordItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, i) => ({ id: `w-${i}`, kind: "text", targetWord: line }));
}

export function DashboardApp() {
  if (!isSupabaseConfigured) {
    return (
      <div className="dashboard-app">
        <p>Live-Räume sind noch nicht eingerichtet.</p>
        <p className="dashboard-app__hint">
          Lege ein Supabase-Projekt an, wende die Migrationen unter <code>supabase/migrations/</code> an und trage
          <code> NEXT_PUBLIC_SUPABASE_URL</code> sowie <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in deine
          <code> .env</code> ein (siehe docs/architecture.md).
        </p>
      </div>
    );
  }
  return <DashboardRoom />;
}

function DashboardRoom() {
  const [words, setWords] = useState<WordItem[]>([]);
  const [shuffleWords, setShuffleWords] = useState(false);
  const [currentStep, setCurrentStepState] = useState<DashboardStep>("IMPORT");
  const stepRef = useRef<DashboardStep>("IMPORT");
  const setCurrentStep = (step: DashboardStep) => {
    stepRef.current = step;
    setCurrentStepState(step);
  };

  const {
    roomCode,
    openLobbyError,
    results,
    connectedStudents,
    registeredStudents,
    connectionWarning,
    liveProgress,
    handleOpenLobby,
    handleStartSession,
    handleEndSession,
    handleRemoveStudent,
  } = useDashboardRoom({ stepRef, setCurrentStep, words, shuffleWords, clearWords: () => setWords([]) });

  function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("wordlist") ?? "");
    const parsed = wordsFromText(text);
    if (parsed.length === 0) return;
    setWords(parsed);
    void handleOpenLobby(parsed);
  }

  return (
    <div className="dashboard-app">
      {connectionWarning && <p className="dashboard-app__message" role="status">Verbindung wackelt gerade.</p>}
      {openLobbyError && <p className="dashboard-app__message" role="alert">{openLobbyError}</p>}

      {currentStep === "IMPORT" && (
        <form onSubmit={handleImport} className="dashboard-app__import">
          <label htmlFor="wordlist">Wortliste (ein Wort oder Satz pro Zeile)</label>
          <textarea id="wordlist" name="wordlist" rows={10} placeholder={"Baum\nHaus\nSchule"} required />
          <label className="dashboard-app__checkbox">
            <input type="checkbox" checked={shuffleWords} onChange={(event) => setShuffleWords(event.target.checked)} />
            Reihenfolge pro Schüler mischen
          </label>
          <button className="button button--primary" type="submit">Raum öffnen</button>
        </form>
      )}

      {currentStep === "LOBBY" && (
        <div className="dashboard-app__lobby">
          <p className="dashboard-app__code">Raumcode: <strong>{roomCode}</strong></p>
          <p>{words.length} Wörter · {connectedStudents.length} verbunden</p>
          <ul className="dashboard-app__students">
            {registeredStudents.map((name) => (
              <li key={name} className={connectedStudents.includes(name) ? "is-online" : "is-offline"}>
                <span>{connectedStudents.includes(name) ? "●" : "○"} {name}</span>
                <button type="button" onClick={() => handleRemoveStudent(name)} aria-label={`${name} entfernen`}>×</button>
              </li>
            ))}
            {registeredStudents.length === 0 && <li className="dashboard-app__empty">Noch niemand beigetreten.</li>}
          </ul>
          <button className="button button--primary" type="button" onClick={handleStartSession} disabled={connectedStudents.length === 0}>
            Diktat starten
          </button>
        </div>
      )}

      {currentStep === "LIVE" && (
        <div className="dashboard-app__live">
          <p className="dashboard-app__code">Raumcode: <strong>{roomCode}</strong></p>
          <ul className="dashboard-app__students">
            {registeredStudents.map((name) => (
              <li key={name} className={connectedStudents.includes(name) ? "is-online" : "is-offline"}>
                {connectedStudents.includes(name) ? "●" : "○"} {name} · Wort {(liveProgress[name] ?? 0) + 1} von {words.length}
              </li>
            ))}
          </ul>
          {results.length > 0 && (
            <>
              <h3>Fertig</h3>
              <ul className="dashboard-app__results">
                {results.map((r) => (
                  <li key={r.name}>
                    {r.name}: {"★".repeat(computeStars(r.errors, words.length))} ({r.errors} Fehler)
                  </li>
                ))}
              </ul>
            </>
          )}
          <button className="button button--quiet" type="button" onClick={handleEndSession}>Raum beenden</button>
        </div>
      )}
    </div>
  );
}
