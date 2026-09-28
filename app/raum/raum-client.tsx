"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { animalName } from "@/src/domain/animals";
import { buildHint, checkAnswer, seededShuffle, wrongWords, type WordItem } from "@/src/domain/dictation";
import { newLearningProgress } from "@/src/domain/leitner";
import { writeValue } from "@/src/storage/local-store";
import { addWordsFromDictation, KEYS, recordActivity, type Deck } from "@/src/storage/personal";
import { Animal } from "../components/animal";
import { RoomCodeInput } from "../components/code-input";
import { BoltIcon, Icon, InkIcon, ShieldIcon } from "../components/icons";
import { ThemeToggle } from "../components/theme-toggle";
import { usePersonal } from "../hooks/use-personal";
import { getMyProgress, upsertProgress } from "../lib/room-api";
import { speak } from "../lib/speak";
import { useStudentRoom, type AttackType } from "./use-student-room";

type Step = "hold" | "read" | "write" | "done";

function stars(errors: number, count: number): number {
  if (count <= 0 || errors <= 0) return 3;
  const rate = errors / count;
  return rate <= 0.25 ? 2 : 1;
}

/** Schüler im Raum (Design 5a/5b): Beitreten, Lobby, Laufdiktat/Übung/Battle/Stationen. */
export function RaumClient() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params?.get("code") ?? null;
  const { profile } = usePersonal();
  const name = animalName(profile.animal);

  if (!code) {
    return (
      <main className="page" style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <div className="between"><h1 className="h-page">Raum beitreten</h1><ThemeToggle /></div>
        <div className="card card-pad stack" style={{ alignItems: "center" }}>
          <Animal id={profile.animal} size={120} />
          <p className="center muted small">Du trittst als <strong>{name}</strong> bei. Deine Lehrkraft sieht nur dein Tier.</p>
        </div>
        <span className="eyebrow">Raumcode</span>
        <RoomCodeInput onComplete={(c) => router.push(`/raum?code=${c}`)} />
        <p className="small muted center">Den vierstelligen Code findest du an der Tafel oder als QR-Code.</p>
      </main>
    );
  }
  return <RoomSession code={code} animal={profile.animal} name={name} />;
}

function RoomSession({ code, animal, name }: { code: string; animal: string; name: string }) {
  const [ink, setInk] = useState(0);
  const [flicker, setFlicker] = useState(0);
  const [shield, setShield] = useState(false);
  const shieldRef = useRef(false);
  useEffect(() => { shieldRef.current = shield; }, [shield]);
  const onAttack = useCallback((type: AttackType) => {
    if (shieldRef.current) { setShield(false); return; }
    if (type === "ink") setInk((n) => n + 1); else setFlicker((n) => n + 1);
  }, []);
  const room = useStudentRoom(code, name, onAttack);

  const header = (
    <div className="topbar">
      <Link href="/start" className="icon-btn square" aria-label="Laufdiktat verlassen" onClick={room.leave}><Icon name="back" size={18} strokeWidth={2.4} /></Link>
      <Animal id={animal} size={40} label={false} />
      <span className="stack grow" style={{ ["--gap" as string]: "0" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{room.config?.title ?? "Laufdiktat"} · Raum {code}</span>
        <span className="tiny muted">{room.me?.name ?? name}{room.config?.className ? ` · ${room.config.className}` : ""}{room.demo ? " · Demo ohne Server" : ""}</span>
      </span>
      <ThemeToggle />
    </div>
  );

  let body;
  if (room.phase === "joining") body = <Waiting animal={animal} title="Verbinde …" text={`Raum ${code} wird gesucht.`} />;
  else if (room.phase === "notfound") body = <Waiting animal={animal} title="Raum nicht gefunden" text="Prüfe den Code an der Tafel. Räume gelten nur, solange die Lehrkraft sie offen hat." action={<Link className="btn btn-primary" href="/raum">Anderen Code eingeben</Link>} />;
  else if (room.phase === "error") body = <Waiting animal={animal} title="Keine Verbindung" text={room.error || "Bitte Internetverbindung prüfen."} action={<button type="button" className="btn btn-primary" onClick={() => location.reload()}>Nochmal versuchen</button>} />;
  else if (room.phase === "lobby") body = <Waiting animal={animal} title="Du bist drin!" text="Warte, bis deine Lehrkraft die Sitzung startet." pulse />;
  else if (room.phase === "ended") body = <Waiting animal={animal} title="Sitzung beendet" text="Die Lehrkraft hat den Raum geschlossen." action={<Link className="btn btn-primary" href="/start" onClick={room.leave}>Zurück zum Lernraum</Link>} />;
  else if (room.config && room.sessionId && room.me) {
    body = room.config.stationMode
      ? <StationPlay key={room.sessionId} code={code} room={room as Required<typeof room>} />
      : <Play key={room.sessionId} animal={animal} room={room as Required<typeof room>} ink={ink} flicker={flicker} shield={shield} setShield={setShield} />;
  }

  return (
    <main className="page ld-page">
      {header}
      {room.connectionWarning ? <p className="notice bad small" role="status">Verbindung wackelt – dein Fortschritt wird nachgereicht.</p> : null}
      {body}
    </main>
  );
}

function Waiting({ animal, title, text, action, pulse }: { animal: string; title: string; text: string; action?: ReactNode; pulse?: boolean }) {
  return (
    <div className="stack center" style={{ alignItems: "center", margin: "auto 0", ["--gap" as string]: "14px" }}>
      <div className="animal-disc" style={{ width: 170, height: 170, boxShadow: "0 0 0 10px var(--gold)" }}><Animal id={animal} size={130} className={pulse ? "bob" : ""} /></div>
      <p style={{ fontSize: 22, fontWeight: 700 }}>{title}</p>
      <p className="muted small" style={{ maxWidth: 360 }}>{text}</p>
      {action}
    </div>
  );
}

type Room = ReturnType<typeof useStudentRoom>;

function Play({ animal, room, ink, flicker, shield, setShield }: { animal: string; room: Required<Room>; ink: number; flicker: number; shield: boolean; setShield: (v: boolean) => void }) {
  const { config, sessionId, me } = room as unknown as { config: NonNullable<Room["config"]>; sessionId: string; me: NonNullable<Room["me"]> };
  const mode = config.gameMode;
  const words = useMemo<WordItem[]>(() => (config.shuffleWords ? seededShuffle(config.words, `${sessionId}:${me.name}`) : config.words), [config, sessionId, me.name]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>(mode === "LAUFDIKTAT" ? "hold" : "write");
  const [input, setInput] = useState("");
  const [metrics, setMetrics] = useState({ peeks: 0, attempts: 0, errors: 0 });
  const [wrongCount, setWrongCount] = useState(0);
  const [shake, setShake] = useState(false);
  const [charge, setCharge] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const seen = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wordErrors = useRef<Record<string, number>>({});
  const [missed, setMissed] = useState<{ word: string; sentence: string }[]>([]);
  const [missedVocab, setMissedVocab] = useState<WordItem[]>([]);
  const started = useRef(0);
  useEffect(() => { started.current = Date.now(); }, []);
  useEffect(() => { if (step === "write") inputRef.current?.focus(); }, [step, index]);
  const saved = useRef(false);
  const current = words[index];
  const isMath = current?.kind === "math";
  const target = current?.targetWord ?? "";
  const shown = current?.prompt && current.kind !== "text" ? current.prompt : target;

  // Fortschritt nach Reload wiederherstellen.
  useEffect(() => {
    if (me.roomId === "demo") return;
    getMyProgress(me.roomId, sessionId, me.participantToken, me.name).then((p) => {
      if (!p) return;
      setMetrics({ peeks: p.peeks, attempts: p.attempts, errors: p.errors });
      if (p.finished) { setIndex(words.length); setStep("done"); } else setIndex(Math.min(p.currentIndex, words.length - 1));
    }).catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finished = step === "done";
  useEffect(() => {
    if (me.roomId === "demo") return;
    upsertProgress({ roomId: me.roomId, sessionId, participantToken: me.participantToken, studentKey: me.name, currentIndex: Math.min(index, words.length), ...metrics, finished,
      durationMs: finished ? Date.now() - started.current : undefined, wordErrors: finished ? wordErrors.current : undefined }).catch(() => undefined);
  }, [index, metrics, finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // Abschluss: Fehler an Wortspeicher/LernBox übergeben, Punkte gutschreiben.
  useEffect(() => {
    if (!finished || saved.current) return;
    saved.current = true;
    room.sendFinished({ name: me.name, errors: metrics.errors, peeks: metrics.peeks });
    recordActivity({ cards: words.length, points: Math.max(10, 40 - metrics.errors * 5) });
    if (config.transfer !== "keine") {
      addWordsFromDictation(missed);
      const allVocab = config.transfer === "alle" ? words.filter((w) => w.kind === "vocabulary") : [];
      if (missedVocab.length || allVocab.length) {
        const now = new Date();
        writeValue<Deck[]>("personal", KEYS.decks, (prev) => {
          const list = prev ?? [];
          const id = `ld-${sessionId}`;
          const existing = list.find((d) => d.id === id);
          const source = allVocab.length ? allVocab : missedVocab;
          const items = source.map((w) => ({ id: `${id}-${w.id}`, prompt: w.prompt ?? "", answer: w.targetWord, alternatives: w.acceptedAnswers }));
          const missedIds = missedVocab.map((w) => `${id}-${w.id}`);
          const deck: Deck = existing ?? { id, title: config.title ?? "Aus dem Laufdiktat", sub: "aus dem Laufdiktat", promptLabel: "Deutsch", answerLabel: "Fremdsprache", promptLang: words[0]?.promptLang ?? "de-DE", answerLang: words[0]?.answerLang ?? "en-GB", items: [], progress: {}, errorIds: [] };
          const merged = { ...deck, items: [...deck.items, ...items.filter((i) => !deck.items.some((x) => x.id === i.id))], progress: { ...Object.fromEntries(items.map((i) => [i.id, newLearningProgress(i.id, now)])), ...deck.progress }, errorIds: [...new Set([...deck.errorIds, ...missedIds])] };
          return existing ? list.map((d) => (d.id === id ? merged : d)) : [...list, merged];
        }, []);
      }
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    const n = index + 1;
    room.sendProgress(n);
    setInput(""); setWrongCount(0); seen.current = false;
    if (n >= words.length) { setIndex(words.length); setStep("done"); }
    else { setIndex(n); setStep(mode === "LAUFDIKTAT" ? "hold" : "write"); }
  };

  const submit = () => {
    if (!current || !input.trim()) return;
    setMetrics((m) => ({ ...m, attempts: m.attempts + 1 }));
    if (checkAnswer(current, input)) {
      setFlash("ok"); setTimeout(() => setFlash(null), 500);
      if (mode === "BATTLE") setCharge((c) => Math.min(100, c + 34));
      next();
      return;
    }
    setFlash("bad"); setTimeout(() => setFlash(null), 500);
    setShake(true); setTimeout(() => setShake(false), 450);
    setMetrics((m) => ({ ...m, errors: m.errors + 1 }));
    const key = current.kind === "vocabulary" ? `${current.prompt} → ${current.targetWord}` : current.prompt ?? current.targetWord;
    wordErrors.current[key] = (wordErrors.current[key] ?? 0) + 1;
    if (current.kind === "vocabulary") setMissedVocab((prev) => (prev.includes(current) ? prev : [...prev, current]));
    else if (current.kind !== "math") {
      const found = wrongWords(target, input);
      setMissed((prev) => [...prev, ...found.filter((w) => !prev.some((m) => m.word === w)).map((word) => ({ word, sentence: target }))]);
    }
    if (mode === "UEBUNG") setWrongCount((n) => n + 1);
    if (!(mode === "UEBUNG" && wrongCount + 1 >= config.uebungMaxAttempts)) setInput("");
  };

  const beginHold = (e?: TouchEvent) => {
    if (e && e.touches.length < 2) return;
    if (seen.current) setMetrics((m) => ({ ...m, peeks: m.peeks + 1 }));
    seen.current = true;
    setStep("read");
  };
  const endHold = () => setStep((s) => (s === "read" ? "write" : s));
  // Loslassen überall erkennen (die Fläche wird beim Aufdecken neu gerendert).
  useEffect(() => {
    if (step !== "read") return;
    const up = () => endHold();
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("mouseup", up); window.removeEventListener("touchend", up); window.removeEventListener("keyup", up); };
  }, [step]);

  const opponents = Object.entries(room.roster).sort((a, b) => b[1] - a[1]);
  const attack = (type: AttackType) => {
    if (charge < 100) return;
    const target = opponents[0]?.[0];
    if (target && room.sendAttack(target, type)) setCharge(0);
  };

  if (finished) {
    return (
      <div className="stack center" style={{ alignItems: "center", margin: "auto 0", ["--gap" as string]: "16px" }}>
        <div className="animal-disc" style={{ width: 160, height: 160, boxShadow: "0 0 0 10px var(--gold)" }}><Animal id={animal} size={120} /></div>
        {config.showStars ? <span style={{ fontSize: 30, letterSpacing: 4, color: "var(--gold)" }}>{"★".repeat(stars(metrics.errors, words.length))}{"☆".repeat(3 - stars(metrics.errors, words.length))}</span> : null}
        <p style={{ fontSize: 24, fontWeight: 700 }}>Alle {words.length} {words.length === 1 ? "Abschnitt" : "Abschnitte"} geschafft</p>
        <div className="grid3" style={{ width: "100%", maxWidth: 380, gap: 8 }}>
          {[[metrics.errors, "Fehler"], [metrics.peeks, "Spicker"], [`+${Math.max(10, 40 - metrics.errors * 5)}`, "Hauspunkte"]].map(([v, l]) => (
            <div key={String(l)} className="card" style={{ padding: 11 }}><p style={{ fontSize: 22, fontWeight: 800 }}>{v}</p><p className="tiny muted" style={{ fontWeight: 600 }}>{l}</p></div>
          ))}
        </div>
        {config.transfer !== "keine" && (missed.length || missedVocab.length) ? (
          <p className="small muted">{[...missed.map((m) => `„${m.word}"`), ...missedVocab.map((v) => `„${v.targetWord}"`)].slice(0, 4).join(", ")} {missed.length + missedVocab.length === 1 ? "liegt" : "liegen"} jetzt in deinem {missedVocab.length ? "Lernbereich" : "Wortspeicher"}.</p>
        ) : null}
        <div className="row wrap" style={{ justifyContent: "center" }}>
          {missedVocab.length ? <Link className="btn btn-ghost" href="/lernen?fehler=1">Meine Fehler jetzt üben</Link> : missed.length ? <Link className="btn btn-ghost" href="/lernen/wortspeicher">Zum Wortspeicher</Link> : null}
          <Link className="btn btn-primary" href="/start" onClick={room.leave}>Zurück zum Lernraum</Link>
        </div>
      </div>
    );
  }

  const progressBar = (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(words.length, 30)},1fr)`, gap: 4 }} aria-label={`Abschnitt ${index + 1} von ${words.length}`} role="progressbar" aria-valuenow={index + 1} aria-valuemax={words.length}>
      {words.slice(0, 30).map((w, i) => <span key={w.id} style={{ height: 6, borderRadius: 999, background: i < index ? "var(--green)" : i === index ? "var(--gold)" : "var(--surface2)" }} />)}
    </div>
  );

  const edge = (active: boolean) => <span className={`hold-edge ${active ? "active" : ""}`}><Icon name="hand" size={22} /><span>{active ? "halten" : "hier"}</span></span>;
  const label = isMath ? "Aufgabe" : current?.kind === "vocabulary" ? "Vokabel" : "Satz";

  return (
    <div className={`stack grow ${flicker ? "flicker" : ""}`} key={`f${flicker}`} style={{ position: "relative" }}>
      {ink ? <span className="ink-blot" key={`ink${ink}`} aria-hidden="true" /> : null}
      {progressBar}

      {mode === "BATTLE" ? (
        <div className="stack" style={{ alignItems: "center", ["--gap" as string]: "8px" }}>
          <div className="row" style={{ ["--gap" as string]: "12px" }}>
            {([["ink", "Tinte", <InkIcon key="i" />], ["flicker", "Flimmern", <BoltIcon key="b" />]] as const).map(([t, l, ic]) => (
              <div key={t} className="stack" style={{ alignItems: "center", ["--gap" as string]: "4px" }}>
                <button type="button" className={`charge-ring ${charge >= 100 ? "ready" : ""}`} style={{ borderColor: charge >= 100 ? (t === "ink" ? "#3b6fd1" : "#e0a83a") : undefined }} aria-label={`${l}-Angriff${opponents[0] ? ` auf ${opponents[0][0]}` : ""}`} disabled={charge < 100 || !opponents.length} onClick={() => attack(t)}>
                  <span className="ghost">{ic}</span><span className="fill" style={{ clipPath: `inset(${100 - charge}% 0 0 0)` }}>{ic}</span>
                </button>
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink2)" }}>{l}</span>
              </div>
            ))}
            <div className="stack" style={{ alignItems: "center", ["--gap" as string]: "4px" }}>
              <button type="button" className={`charge-ring ${charge >= 100 || shield ? "ready" : ""}`} style={{ borderColor: shield ? "var(--green)" : charge >= 100 ? "#c7674a" : undefined }} aria-label="Schild" disabled={charge < 100 || shield} onClick={() => { setShield(true); setCharge(0); }}>
                <span className="ghost"><ShieldIcon /></span><span className="fill" style={{ clipPath: `inset(${shield ? 0 : 100 - charge}% 0 0 0)` }}><ShieldIcon /></span>
              </button>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink2)" }}>{shield ? "aktiv" : "Schild"}</span>
            </div>
          </div>
          <div className="stack" style={{ width: 200, ["--gap" as string]: "5px" }}>
            <span className="tiny center muted" style={{ fontWeight: 700 }}>Ladung · {charge >= 100 ? "Aufgeladen" : `${charge} %`}</span>
            <div className={`bar ${charge >= 100 ? "green" : ""}`} style={{ height: 7 }}><span style={{ width: `${charge}%` }} /></div>
          </div>
          <span className="tiny muted">{opponents.length ? `Ziel: ${opponents[0][0]} (Abschnitt ${opponents[0][1] + 1})` : "Noch keine Mitspieler sichtbar"}</span>
        </div>
      ) : null}

      {/* Halte-Fläche (Zwei-Finger-Geste); Tastatur: Leertaste/Enter halten. */}
      {step === "hold" ? (
        <div className="ld-hold" onTouchStart={beginHold} onMouseDown={() => beginHold()} role="button" tabIndex={0} aria-label="Gedrückt halten, um den Abschnitt zu sehen" onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); beginHold(); } }} onKeyUp={endHold}>
          {edge(false)}
          <div className="ld-center card">
            <span style={{ display: "grid", placeItems: "center", width: 64, height: 64, borderRadius: "50%", background: "var(--accent-bg)", color: "var(--accent)" }}><Icon name="hand" size={30} /></span>
            <span className="ld-title">Mit zwei Fingern an beiden Rändern halten</span>
            <span className="small muted">Solange du hältst, siehst du {label} {index + 1}. Loslassen öffnet das Schreibfeld. Am Laptop: Maustaste oder Leertaste gedrückt halten.</span>
          </div>
          {edge(false)}
        </div>
      ) : null}

      {step === "read" ? (
        <div className="ld-hold" aria-live="polite">
          {edge(true)}
          <div className="ld-center card" style={{ border: "2px solid var(--accent)" }}>
            <span className="pill">{label} {index + 1} von {words.length}</span>
            <p className="ld-target">{shown}</p>
            <span className="small muted">Loslassen, um zu schreiben</span>
          </div>
          {edge(true)}
        </div>
      ) : null}

      {step === "write" ? (
        <form className="stack ld-write" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="between">
            <span style={{ fontSize: 16, fontWeight: 700 }}>{label} {index + 1} von {words.length} {mode === "LAUFDIKTAT" ? "schreiben" : ""}</span>
            <span className="pill">{mode === "LAUFDIKTAT" ? `Spicker ${metrics.peeks}` : `Fehler ${metrics.errors}`}</span>
          </div>
          {mode === "BATTLE" || (mode === "UEBUNG" && wrongCount >= config.uebungMaxAttempts) ? (
            <div className="card" style={{ padding: "14px 16px" }}>
              <p className="ld-chars">{[...shown].map((c, i) => <span key={i} style={{ color: i < input.length ? (input[i] === c ? "var(--good)" : "var(--bad)") : "var(--ink3)", boxShadow: i === input.length ? "inset 0 -3px 0 var(--accent)" : undefined }}>{c === " " ? " " : c}</span>)}</p>
            </div>
          ) : null}
          {(mode === "UEBUNG" || current?.kind !== "text") && mode !== "BATTLE" && mode !== "LAUFDIKTAT" ? (
            <div className="card row" style={{ padding: "12px 14px" }}>
              {current?.kind !== "text" ? <p className="grow" style={{ fontSize: 22, fontWeight: 800 }}>{current?.prompt}</p> : <p className="grow small muted">Hör zu und schreib den {label}.</p>}
              {config.isTtsEnabled && !isMath ? <button type="button" className="icon-btn square" aria-label="Vorlesen, zählt als Spicker" onClick={() => { speak(current?.kind === "vocabulary" ? current.prompt ?? target : target, current?.kind === "vocabulary" ? current.promptLang ?? "de-DE" : "de-DE"); setMetrics((m) => ({ ...m, peeks: m.peeks + 1 })); }}><Icon name="speaker" size={18} /></button> : null}
            </div>
          ) : null}
          {mode === "UEBUNG" && wrongCount > 0 && wrongCount < config.uebungMaxAttempts && !isMath ? <p className="notice" style={{ fontFamily: "ui-monospace,monospace", letterSpacing: 2 }}>{buildHint(target, wrongCount / config.uebungMaxAttempts)}</p> : null}
          <textarea
            className={`textarea ld-input ${shake ? "shake-x" : ""} ${flash === "bad" ? "bad" : flash === "ok" ? "ok" : ""}`}
            value={input}
            rows={isMath ? 1 : 3}
            inputMode={isMath ? "decimal" : "text"}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => { if (config.strictTypingMode) e.preventDefault(); }}
            onDrop={(e) => { if (config.strictTypingMode) e.preventDefault(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder={mode === "LAUFDIKTAT" ? "Tippe den Abschnitt aus dem Gedächtnis" : mode === "BATTLE" ? "Abtippen – schnell und genau" : "Hier schreiben"}
            autoComplete="off" autoCorrect="off" autoCapitalize="sentences" spellCheck={false} aria-label="Eingabe" ref={inputRef}
          />
          <div className="row" style={{ justifyContent: "center" }}>
            {mode === "LAUFDIKTAT" ? <button type="button" className="btn btn-ghost" onClick={() => setStep("hold")}>Nochmal ansehen</button> : null}
            <button type="submit" className="btn btn-primary btn-lg">Prüfen</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

/** Stationsmodus: geteiltes Gerät an einer Station, Schülernummer wählen, Abschnitt einprägen. */
function StationPlay({ code, room }: { code: string; room: Required<Room> }) {
  const { config, sessionId, me } = room as unknown as { config: NonNullable<Room["config"]>; sessionId: string; me: NonNullable<Room["me"]> };
  const [num, setNum] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [peeks, setPeeks] = useState(0);
  const [reading, setReading] = useState(false);
  const count = Math.max(1, config.stationCount || 20);
  const words = useMemo(() => (num && config.stationShuffle ? seededShuffle(config.words, `${code}:${sessionId}:${num}`) : config.words), [num, config, code, sessionId]);

  const send = (idx: number, p: number, finished: boolean) => {
    if (!num || me.roomId === "demo") return;
    upsertProgress({ roomId: me.roomId, sessionId, participantToken: me.participantToken, studentKey: me.name, stationNumber: num, currentIndex: idx, peeks: p, attempts: 0, errors: 0, finished }).catch(() => undefined);
  };

  useEffect(() => {
    if (!num || me.roomId === "demo") return;
    getMyProgress(me.roomId, sessionId, me.participantToken, `station-${num}`).then((p) => { setIndex(p?.currentIndex ?? 0); setPeeks(p?.peeks ?? 0); }).catch(() => { setIndex(0); setPeeks(0); });
  }, [num]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!num) {
    const cols = count <= 12 ? 3 : 4;
    return (
      <div className="stack grow">
        <div className="between"><span className="ld-title" style={{ fontSize: 20 }}>Welche Nummer bist du?</span><span className="small faint" style={{ fontWeight: 600 }}>{count} Schüler</span></div>
        <div className="ld-numgrid" style={{ ["--cols" as string]: cols }}>
          {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" className="num-tile" onClick={() => { setNum(n); setIndex(0); setPeeks(0); }}>{n}</button>
          ))}
        </div>
      </div>
    );
  }

  const w = words[Math.min(index, words.length - 1)];
  const last = index >= words.length - 1;
  return (
    <div className="stack grow">
      <div className="between"><span style={{ fontWeight: 700 }}>Nr. {num} · Abschnitt {index + 1} von {words.length}</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => setNum(null)}>Fertig, nächste Person</button></div>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Haltegeste am geteilten Stationsgerät */}
      <div className="ld-hold" onTouchStart={(e) => { if (e.touches.length >= 2) { setReading(true); setPeeks((p) => p + 1); } }} onMouseDown={() => { setReading(true); setPeeks((p) => p + 1); }} onTouchEnd={() => { setReading(false); send(index, peeks, last); }} onMouseUp={() => { setReading(false); send(index, peeks, last); }} onMouseLeave={() => setReading(false)}>
        <span className={`hold-edge ${reading ? "active" : ""}`}><Icon name="hand" size={22} /><span>{reading ? "halten" : "hier"}</span></span>
        <div className="ld-center card" style={reading ? { border: "2px solid var(--accent)" } : undefined}>
          {reading ? <p className="ld-target">{w.prompt && w.kind !== "text" ? w.prompt : w.targetWord}</p> : <><span className="ld-title">Mit zwei Fingern halten</span><span className="small muted">Einprägen, zum Platz laufen, aufschreiben – dann zurückkommen.</span></>}
        </div>
        <span className={`hold-edge ${reading ? "active" : ""}`}><Icon name="hand" size={22} /><span>{reading ? "halten" : "hier"}</span></span>
      </div>
      <div className="grid2">
        <button type="button" className="btn btn-ghost" disabled={index <= 0} onClick={() => setIndex((i) => i - 1)}>Zurück</button>
        <button type="button" className="btn btn-primary" disabled={last} onClick={() => { const n = index + 1; setIndex(n); send(n, peeks, n >= words.length - 1); }}>Nächster Abschnitt</button>
      </div>
    </div>
  );
}
