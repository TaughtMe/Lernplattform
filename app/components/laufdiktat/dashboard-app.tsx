"use client";

import { useRef, useState, type FormEvent } from "react";
import { isSupabaseConfigured } from "../../../src/laufdiktat/supabase-client.ts";
import { useDashboardRoom, type DashboardStep } from "../../../src/laufdiktat/use-dashboard-room.ts";
import { computeStars } from "../../../src/laufdiktat/scoring.ts";
import { generateMathLines, generateGapMathWords, type MathOp } from "../../../src/laufdiktat/math-tasks.ts";
import { generateLatexMathWords, parseLatexMathLines, type LatexTaskKind } from "../../../src/laufdiktat/latex-math.ts";
import { wordsFromText, wordsFromMathLines, wordsFromVocabLines } from "../../../src/laufdiktat/word-import.ts";
import type { BattleOptions, GameMode, WordItem } from "../../../src/laufdiktat/types.ts";
import { RoomQrOverlay } from "./room-qr-overlay.tsx";

const MATH_OPS: Array<{ op: MathOp; label: string }> = [
  { op: "+", label: "+" },
  { op: "-", label: "−" },
  { op: "*", label: "·" },
  { op: "/", label: ":" },
];

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
  const [contentType, setContentType] = useState<"text" | "math" | "vocabulary">("text");
  const [mathTab, setMathTab] = useState<"generator" | "manual" | "latex">("generator");
  const [mathOps, setMathOps] = useState<MathOp[]>(["+", "-"]);
  const [mathMin, setMathMin] = useState(0);
  const [mathMax, setMathMax] = useState(20);
  const [mathCount, setMathCount] = useState(10);
  const [mathGapMode, setMathGapMode] = useState(false);
  const [latexKinds, setLatexKinds] = useState<LatexTaskKind[]>(["fraction"]);
  const [latexCount, setLatexCount] = useState(10);

  const [gameMode, setGameMode] = useState<GameMode>("LAUFDIKTAT");
  const [battleOptions, setBattleOptions] = useState<BattleOptions>({ ink: true, flicker: true });
  const [uebungMaxAttempts, setUebungMaxAttempts] = useState(3);
  const [stationMode, setStationMode] = useState(false);
  const [stationCount, setStationCount] = useState(24);
  const [shuffleWords, setShuffleWords] = useState(false);
  const [showStars, setShowStars] = useState(true);
  const [strictTypingMode, setStrictTypingMode] = useState(true);
  const [showQr, setShowQr] = useState(false);

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
    stationStates,
    handleOpenLobby,
    handleStartSession,
    handleEndSession,
    handleRemoveStudent,
  } = useDashboardRoom({
    stepRef,
    setCurrentStep,
    words,
    gameMode,
    battleOptions,
    stationMode,
    stationCount,
    uebungMaxAttempts,
    showStars,
    shuffleWords,
    strictTypingMode,
    clearWords: () => setWords([]),
  });

  function handleImportText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("wordlist") ?? "");
    const parsed = wordsFromText(text);
    if (parsed.length === 0) return;
    setWords(parsed);
    setCurrentStep("SETTINGS");
  }

  function handleImportVocab(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("vocablist") ?? "");
    const parsed = wordsFromVocabLines(text);
    if (parsed.length === 0) return;
    setWords(parsed);
    setCurrentStep("SETTINGS");
  }

  function handleImportMathManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("mathlist") ?? "");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed = wordsFromMathLines(lines);
    if (parsed.length === 0) return;
    setWords(parsed);
    setCurrentStep("SETTINGS");
  }

  function handleGenerateMath() {
    const genOptions = {
      ops: mathOps,
      minValue: mathMin,
      maxValue: mathMax,
      count: mathCount,
      allowNegativeResults: false,
      excludeZeroOperand: false,
      excludeZeroResult: false,
      multiplicationTables: [],
    };
    const parsed = mathGapMode ? generateGapMathWords(genOptions) : wordsFromMathLines(generateMathLines(genOptions));
    if (parsed.length === 0) return;
    setWords(parsed);
    setCurrentStep("SETTINGS");
  }

  function toggleMathOp(op: MathOp) {
    setMathOps((prev) => (prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]));
  }

  function toggleLatexKind(kind: LatexTaskKind) {
    setLatexKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]));
  }

  function handleGenerateLatex() {
    const parsed = generateLatexMathWords({ kinds: latexKinds, count: latexCount });
    if (parsed.length === 0) return;
    setWords(parsed);
    setCurrentStep("SETTINGS");
  }

  function handleImportLatexManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("latexlist") ?? "");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed = parseLatexMathLines(lines);
    if (parsed.length === 0) return;
    setWords(parsed);
    setCurrentStep("SETTINGS");
  }

  return (
    <div className="dashboard-app">
      {connectionWarning && <p className="dashboard-app__message" role="status">Verbindung wackelt gerade.</p>}
      {openLobbyError && <p className="dashboard-app__message" role="alert">{openLobbyError}</p>}

      {currentStep === "IMPORT" && (
        <div className="dashboard-app__import">
          <div className="dashboard-app__tabs">
            <button type="button" className={contentType === "text" ? "is-active" : ""} onClick={() => setContentType("text")}>Text</button>
            <button type="button" className={contentType === "vocabulary" ? "is-active" : ""} onClick={() => setContentType("vocabulary")}>Vokabeln</button>
            <button type="button" className={contentType === "math" ? "is-active" : ""} onClick={() => setContentType("math")}>Mathe</button>
          </div>

          {contentType === "text" && (
            <form onSubmit={handleImportText}>
              <label htmlFor="wordlist">Wortliste (ein Wort oder Satz pro Zeile)</label>
              <textarea id="wordlist" name="wordlist" rows={10} placeholder={"Baum\nHaus\nSchule"} required />
              <button className="button button--primary" type="submit">Weiter</button>
            </form>
          )}

          {contentType === "vocabulary" && (
            <form onSubmit={handleImportVocab}>
              <label htmlFor="vocablist">Vokabeln (eine pro Zeile: „Wort = Übersetzung“, mehrere Übersetzungen mit „/“ trennen)</label>
              <textarea id="vocablist" name="vocablist" rows={10} placeholder={"the house = das Haus\nthe car = das Auto/der Wagen"} required />
              <p className="dashboard-app__hint">Diese Vokabeln lassen sich nach der Runde direkt in die LernBox der Schüler übernehmen.</p>
              <button className="button button--primary" type="submit">Weiter</button>
            </form>
          )}

          {contentType === "math" && (
            <>
              <div className="dashboard-app__tabs dashboard-app__tabs--sub">
                <button type="button" className={mathTab === "generator" ? "is-active" : ""} onClick={() => setMathTab("generator")}>Generator</button>
                <button type="button" className={mathTab === "manual" ? "is-active" : ""} onClick={() => setMathTab("manual")}>Manuell</button>
                <button type="button" className={mathTab === "latex" ? "is-active" : ""} onClick={() => setMathTab("latex")}>Brüche, Wurzeln, Potenzen</button>
              </div>

              {mathTab === "generator" && (
                <div className="dashboard-app__math-generator">
                  <div className="dashboard-app__op-picker">
                    {MATH_OPS.map(({ op, label }) => (
                      <label key={op}>
                        <input type="checkbox" checked={mathOps.includes(op)} onChange={() => toggleMathOp(op)} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <label>
                    Von
                    <input type="number" value={mathMin} onChange={(e) => setMathMin(Number(e.target.value))} />
                  </label>
                  <label>
                    Bis
                    <input type="number" value={mathMax} onChange={(e) => setMathMax(Number(e.target.value))} />
                  </label>
                  <label>
                    Anzahl Aufgaben
                    <input type="number" min={1} max={100} value={mathCount} onChange={(e) => setMathCount(Number(e.target.value))} />
                  </label>
                  <label className="dashboard-app__checkbox">
                    <input type="checkbox" checked={mathGapMode} onChange={(e) => setMathGapMode(e.target.checked)} />
                    Lückenaufgaben (z. B. „4 + ␣ = 7“ statt „4 + 3 = ␣“)
                  </label>
                  <button className="button button--primary" type="button" onClick={handleGenerateMath} disabled={mathOps.length === 0}>
                    Aufgaben erzeugen
                  </button>
                </div>
              )}

              {mathTab === "manual" && (
                <form onSubmit={handleImportMathManual}>
                  <label htmlFor="mathlist">Aufgaben (eine pro Zeile, z. B. „4 + 4“, „12 − 5“, „6 · 7“, „20 : 4“)</label>
                  <textarea id="mathlist" name="mathlist" rows={10} placeholder={"4 + 4\n12 − 5"} required />
                  <button className="button button--primary" type="submit">Weiter</button>
                </form>
              )}

              {mathTab === "latex" && (
                <>
                  <div className="dashboard-app__math-generator">
                    <div className="dashboard-app__op-picker">
                      <label>
                        <input type="checkbox" checked={latexKinds.includes("fraction")} onChange={() => toggleLatexKind("fraction")} />
                        Brüche
                      </label>
                      <label>
                        <input type="checkbox" checked={latexKinds.includes("root")} onChange={() => toggleLatexKind("root")} />
                        Wurzeln
                      </label>
                      <label>
                        <input type="checkbox" checked={latexKinds.includes("power")} onChange={() => toggleLatexKind("power")} />
                        Potenzen
                      </label>
                    </div>
                    <label>
                      Anzahl Aufgaben
                      <input type="number" min={1} max={100} value={latexCount} onChange={(e) => setLatexCount(Number(e.target.value))} />
                    </label>
                    <button className="button button--primary" type="button" onClick={handleGenerateLatex} disabled={latexKinds.length === 0}>
                      Aufgaben erzeugen
                    </button>
                  </div>
                  <form onSubmit={handleImportLatexManual}>
                    <label htmlFor="latexlist">
                      Oder manuell (eine pro Zeile: Brüche „1/2 + 1/3“, Wurzeln „sqrt(16)“, Potenzen „3^2“)
                    </label>
                    <textarea id="latexlist" name="latexlist" rows={6} placeholder={"1/2 + 1/3\nsqrt(16)\n3^2"} required />
                    <button className="button button--primary" type="submit">Weiter</button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      )}

      {currentStep === "SETTINGS" && (
        <div className="dashboard-app__settings">
          <p>{words.length} Aufgaben bereit.</p>

          <fieldset>
            <legend>Modus</legend>
            {(["LAUFDIKTAT", "UEBUNG", "BATTLE"] as GameMode[]).map((mode) => (
              <label key={mode} className="dashboard-app__radio">
                <input type="radio" name="gameMode" checked={gameMode === mode} onChange={() => setGameMode(mode)} />
                {mode === "LAUFDIKTAT" ? "Laufdiktat" : mode === "UEBUNG" ? "Freies Üben" : "Battle"}
              </label>
            ))}
          </fieldset>

          {gameMode === "UEBUNG" && (
            <label className="dashboard-app__field">
              Fehlversuche bis zum Abtippen
              <input type="number" min={1} max={10} value={uebungMaxAttempts} onChange={(e) => setUebungMaxAttempts(Number(e.target.value))} />
            </label>
          )}

          {gameMode === "BATTLE" && (
            <fieldset>
              <legend>Angriffsarten</legend>
              <label className="dashboard-app__checkbox">
                <input type="checkbox" checked={battleOptions.ink} onChange={(e) => setBattleOptions((prev) => ({ ...prev, ink: e.target.checked }))} />
                Tinte
              </label>
              <label className="dashboard-app__checkbox">
                <input type="checkbox" checked={battleOptions.flicker} onChange={(e) => setBattleOptions((prev) => ({ ...prev, flicker: e.target.checked }))} />
                Flimmern
              </label>
            </fieldset>
          )}

          <label className="dashboard-app__checkbox">
            <input type="checkbox" checked={stationMode} onChange={(e) => setStationMode(e.target.checked)} />
            Stationsmodus (Tablets an Stationen statt eigener Schülergeräte)
          </label>
          {stationMode && (
            <label className="dashboard-app__field">
              Anzahl Stationen
              <input type="number" min={1} max={200} value={stationCount} onChange={(e) => setStationCount(Number(e.target.value))} />
            </label>
          )}

          {!stationMode && (
            <label className="dashboard-app__checkbox">
              <input type="checkbox" checked={shuffleWords} onChange={(e) => setShuffleWords(e.target.checked)} />
              Reihenfolge pro Schüler mischen
            </label>
          )}
          <label className="dashboard-app__checkbox">
            <input type="checkbox" checked={showStars} onChange={(e) => setShowStars(e.target.checked)} />
            Sterne am Ende zeigen
          </label>
          <label className="dashboard-app__checkbox">
            <input type="checkbox" checked={strictTypingMode} onChange={(e) => setStrictTypingMode(e.target.checked)} />
            Strenger Eingabemodus (kein Einfügen/Autokorrektur)
          </label>

          <div className="dashboard-app__actions">
            <button className="button button--quiet" type="button" onClick={() => setCurrentStep("IMPORT")}>Zurück</button>
            <button className="button button--primary" type="button" onClick={() => void handleOpenLobby(words)}>Raum öffnen</button>
          </div>
        </div>
      )}

      {currentStep === "LOBBY" && (
        <div className="dashboard-app__lobby">
          <p className="dashboard-app__code">
            Raumcode: <strong>{roomCode}</strong>
            <button type="button" className="button button--quiet dashboard-app__qr-button" onClick={() => setShowQr(true)}>QR-Code zeigen</button>
          </p>
          <p>{words.length} Aufgaben · {connectedStudents.length} verbunden</p>
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
            {gameMode === "LAUFDIKTAT" ? "Diktat starten" : gameMode === "UEBUNG" ? "Übung starten" : "Battle starten"}
          </button>
        </div>
      )}

      {currentStep === "LIVE" && (
        <div className="dashboard-app__live">
          <p className="dashboard-app__code">Raumcode: <strong>{roomCode}</strong></p>

          {stationMode ? (
            <ul className="dashboard-app__students">
              {Array.from({ length: stationCount }, (_, i) => i + 1).map((station) => {
                const state = stationStates.get(station);
                return (
                  <li key={station} className={state ? (state.finished ? "is-online" : "is-offline") : "is-offline"}>
                    Station {station} · {state ? `Wort ${state.currentIndex + 1} von ${words.length}${state.finished ? " · fertig" : ""}` : "noch nicht gestartet"}
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="dashboard-app__students">
              {registeredStudents.map((name) => (
                <li key={name} className={connectedStudents.includes(name) ? "is-online" : "is-offline"}>
                  {connectedStudents.includes(name) ? "●" : "○"} {name} · Wort {(liveProgress[name] ?? 0) + 1} von {words.length}
                </li>
              ))}
            </ul>
          )}

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

      {showQr && roomCode && <RoomQrOverlay roomCode={roomCode} onClose={() => setShowQr(false)} />}
    </div>
  );
}
