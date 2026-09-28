"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { parseVocabularyPairs, sectionsToWords, splitSections, type SplitMode, type WordItem } from "@/src/domain/dictation";
import { writeValue } from "@/src/storage/local-store";
import { randomId } from "@/src/storage/personal";
import { resultsCsv, TEACHER_KEYS, topErrors, type SessionResult } from "@/src/storage/teacher";
import { Animal } from "../../components/animal";
import { Icon, type IconName } from "../../components/icons";
import { QrCode } from "../../components/qr-code";
import { ThemeToggle } from "../../components/theme-toggle";
import { APP_VERSION, type GameMode, type RoomConfig } from "../../lib/room-api";
import { useContents } from "../inhalte-client";
import { TeacherShell, useTeacherClasses } from "../teacher-shell";
import { useTeacherRoom } from "./use-teacher-room";

type Step = "import" | "settings" | "lobby" | "live";
type Mode = GameMode | "STATION";
const STEPS: [Step, string][] = [["import", "Diktat"], ["settings", "Modus"], ["lobby", "Lobby"], ["live", "Live"]];
const TITLES = ["Wortliste vorbereiten", "Modus und Optionen", "Lobby", "Live-Sitzung"];
const NEXT = ["Weiter zu Modus", "Raum öffnen", "Sitzung starten", "Sitzung beenden"];
const MODES: { id: Mode; t: string; sub: string; ic: IconName; steps: string[] }[] = [
  { id: "LAUFDIKTAT", t: "Laufdiktat", sub: "Mit zwei Fingern einprägen, dann tippen", ic: "run", steps: ["Abschnitt einprägen", "Zum Schreibfeld wechseln", "Eingabe prüfen"] },
  { id: "UEBUNG", t: "Freie Übung", sub: "Vorlesen und gestufte Buchstaben-Hilfe", ic: "ear", steps: ["Abschnitt anhören", "Eintippen", "Bei Fehler Buchstaben-Hilfe"] },
  { id: "BATTLE", t: "Battle", sub: "Gegeneinander tippen, mit Störangriffen", ic: "duel", steps: ["Alle starten gleichzeitig", "Abtippen, Angriffe einsetzen", "Wer zuerst fertig ist, gewinnt"] },
  { id: "STATION", t: "Stationen", sub: "Ohne eigenes Gerät, an nummerierten Stationen", ic: "pin", steps: ["Zur Station laufen", "Abschnitt lesen und merken", "Am Platz aufschreiben"] },
];

interface Options { tts: boolean; shuffle: boolean; strict: boolean; stars: boolean; ink: boolean; flicker: boolean; stationCount: number; transfer: "alle" | "fehler" | "keine"; maxAttempts: number }

export function LaufdiktatTeacher() {
  return <TeacherShell title="Laufdiktat"><Wizard /></TeacherShell>;
}

/** Laufdiktat Lehrkraft (Design 5c/5d): Diktat → Modus → Lobby → Live. */
function Wizard() {
  const params = useSearchParams();
  const router = useRouter();
  const { active } = useTeacherClasses();
  const [contents, setContents] = useContents();
  const preset = contents.find((c) => c.id === params?.get("inhalt"));
  const [contentId, setContentId] = useState<string | null>(preset?.id ?? null);
  const [kind, setKind] = useState<"text" | "vocabulary" | "math">(preset?.kind ?? "text");
  const [source, setSource] = useState(preset?.source ?? "");
  const [split, setSplit] = useState<SplitMode>(preset?.split ?? "satz");
  const [title, setTitle] = useState(preset?.title ?? "");
  const [mathWords, setMathWords] = useState<WordItem[]>(preset?.kind === "math" ? preset.words : []);
  const [step, setStep] = useState<Step>("import");
  const [mode, setMode] = useState<Mode>("LAUFDIKTAT");
  const [sheet, setSheet] = useState(false);
  const [opt, setOpt] = useState<Options>({ tts: true, shuffle: true, strict: true, stars: true, ink: true, flicker: true, stationCount: 20, transfer: "fehler", maxAttempts: 3 });
  // Wiederhergestellter Raum (Reload) → direkt in den passenden Schritt.
  const room = useTeacherRoom(setStep);

  const pick = (id: string) => {
    const c = contents.find((x) => x.id === id);
    if (!c) return;
    setContentId(c.id); setKind(c.kind); setSource(c.source); setSplit(c.split); setTitle(c.title);
    if (c.kind === "math") setMathWords(c.words);
  };

  const words: WordItem[] = useMemo(() => (kind === "text" ? sectionsToWords(splitSections(source, split)) : kind === "vocabulary" ? parseVocabularyPairs(source) : mathWords), [kind, source, split, mathWords]);
  const si = STEPS.findIndex(([k]) => k === step);
  const cur = MODES.find((m) => m.id === mode)!;
  const joinUrl = room.room && typeof window !== "undefined" ? `${window.location.origin}/raum?code=${room.room.code}` : "";

  const config = (): RoomConfig => ({
    words, gameMode: mode === "STATION" ? "LAUFDIKTAT" : mode, battleOptions: { ink: opt.ink, flicker: opt.flicker }, stationMode: mode === "STATION", stationCount: opt.stationCount,
    isTtsEnabled: opt.tts, uebungMaxAttempts: opt.maxAttempts, showStars: opt.stars, shuffleWords: mode === "STATION" ? false : opt.shuffle, strictTypingMode: opt.strict,
    stationShuffle: mode === "STATION" ? opt.shuffle : false, appVersion: APP_VERSION, transfer: opt.transfer, title: title || "Laufdiktat", className: active.label,
  });

  const finish = async () => {
    const ok = await room.end();
    if (!ok) return;
    const result: SessionResult = { id: randomId(), contentId: contentId ?? "", classId: active.id, title: title || "Laufdiktat", mode: cur.t, date: new Date().toISOString(), total: words.length, rows: room.rows };
    writeValue<SessionResult[]>("teacher", TEACHER_KEYS.results, (prev) => [result, ...(prev ?? [])].slice(0, 100), []);
    if (contentId) setContents((prev) => prev.map((c) => (c.id === contentId ? { ...c, usedAt: new Date().toISOString() } : c)));
    room.reset();
    router.push(`/lehrer/auswertung?id=${result.id}`);
  };

  const nextStep = async () => {
    if (step === "import") {
      if (!words.length) return;
      // Neuen Text gleich ablegen, damit er wieder geöffnet werden kann.
      if (!contentId && source.trim()) {
        const id = randomId();
        setContents((prev) => [{ id, classId: active.id, kind, title: title || `Diktat vom ${new Date().toLocaleDateString("de-DE")}`, source, split, words, createdAt: new Date().toISOString() }, ...prev]);
        setContentId(id);
      }
      setStep("settings");
    } else if (step === "settings") {
      const r = room.room ?? (await room.open({ title, className: active.label }));
      if (r) setStep("lobby");
    } else if (step === "lobby") {
      if (await room.start(config())) setStep("live");
    } else {
      if (confirm("Sitzung beenden? Die Schüler sehen danach ihre Auswertung.")) await finish();
    }
  };

  const goTo = (s: Step) => {
    const idx = STEPS.findIndex(([k]) => k === s);
    if (idx <= si || (idx === 1 && words.length) || (idx === 2 && room.room) || (idx === 3 && room.status === "live")) setStep(s);
  };

  const options = (
    <div className="stack" style={{ ["--gap" as string]: "4px" }}>
      <span className="eyebrow">Optionen</span>
      {mode === "STATION" ? (
        <div className="between" style={{ minHeight: 48 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Anzahl Schülernummern</span>
          <span className="row" style={{ ["--gap" as string]: "8px" }}>
            <button type="button" className="icon-btn square" style={{ width: 36, height: 36 }} aria-label="Weniger" onClick={() => setOpt((o) => ({ ...o, stationCount: Math.max(2, o.stationCount - 1) }))}>−</button>
            <span style={{ width: 28, textAlign: "center", fontWeight: 800 }}>{opt.stationCount}</span>
            <button type="button" className="icon-btn square" style={{ width: 36, height: 36 }} aria-label="Mehr" onClick={() => setOpt((o) => ({ ...o, stationCount: Math.min(40, o.stationCount + 1) }))}>+</button>
          </span>
        </div>
      ) : null}
      {([
        ["tts", "Vorlesen erlauben", "Zählt als Spicker", mode !== "STATION"],
        ["shuffle", mode === "STATION" ? "Reihenfolge je Schülernummer mischen" : "Reihenfolge pro Schüler mischen", "", true],
        ["strict", "Nur getippte Eingaben", "Verhindert Einfügen und Autokorrektur", mode !== "STATION"],
        ["stars", "Sterne anzeigen", "", mode !== "STATION"],
        ["ink", "Tinten-Angriff", "", mode === "BATTLE"],
        ["flicker", "Flimmer-Angriff", "", mode === "BATTLE"],
      ] as const).filter((x) => x[3]).map(([k, l, h]) => (
        <button key={k} type="button" aria-pressed={opt[k]} onClick={() => setOpt((o) => ({ ...o, [k]: !o[k] }))} className="row" style={{ minHeight: 48, padding: "6px 0", border: 0, background: "transparent", textAlign: "left", ["--gap" as string]: "12px" }}>
          <span className="checkbox"><Icon name="check" size={14} strokeWidth={3} /></span>
          <span className="stack" style={{ ["--gap" as string]: "1px" }}><span style={{ fontSize: 14, fontWeight: 600 }}>{l}</span>{h ? <span className="tiny faint">{h}</span> : null}</span>
        </button>
      ))}
      <div className="stack" style={{ ["--gap" as string]: "6px", paddingTop: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>In den persönlichen Lernbereich übernehmen</span>
        <div className="seg">
          {(["alle", "fehler", "keine"] as const).map((t) => <button key={t} type="button" aria-pressed={opt.transfer === t} onClick={() => setOpt((o) => ({ ...o, transfer: t }))}>{t === "alle" ? "Alle" : t === "fehler" ? "Nur Fehler" : "Keine"}</button>)}
        </div>
        <span className="tiny faint">Wörter/Vokabeln landen dublettenfrei im Wortspeicher bzw. in der LernBox der Schüler – nur auf deren Gerät.</span>
      </div>
    </div>
  );

  const modeDetail = (
    <div className="stack">
      <div className="stack" style={{ ["--gap" as string]: "5px" }}><span style={{ fontSize: 20, fontWeight: 700 }}>{cur.t}</span><span className="small muted">{cur.sub}</span></div>
      <div className="stack" style={{ ["--gap" as string]: "9px" }}>
        <span className="eyebrow">Ablauf</span>
        {cur.steps.map((t, i) => <div key={t} className="row"><span style={{ display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: "50%", background: "var(--accent-bg)", color: "var(--accent)", fontSize: 12, fontWeight: 800 }}>{i + 1}</span><span style={{ fontSize: 14, fontWeight: 600 }}>{t}</span></div>)}
      </div>
      <div style={{ height: 1, background: "var(--line)" }} />
      {options}
    </div>
  );

  const finishedCount = room.rows.filter((r) => r.finished).length;
  const activeCount = room.present.size || room.rows.length;
  const totalPct = room.rows.length && words.length ? Math.round((room.rows.reduce((s, r) => s + Math.min(r.currentIndex, words.length), 0) / (room.rows.length * words.length)) * 100) : 0;
  const errors = topErrors(room.rows, 5);
  const joined = room.demo ? [...room.present] : [...new Set([...room.participants.map((p) => p.studentKey), ...room.present])];

  return (
    <div className="ldt">
      <header className="ldt-head">
        <Link href="/lehrer" className="icon-btn square" aria-label="Zurück zu Inhalte"><Icon name="back" size={18} strokeWidth={2.4} /></Link>
        <span className="stack grow" style={{ ["--gap" as string]: "0" }}>
          <span className="small muted">{active.label} · Laufdiktat · Schritt {si + 1} von 4</span>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em" }}>{TITLES[si]}</span>
        </span>
        <nav className="step-tabs" aria-label="Schritte">
          {STEPS.map(([k, l], i) => (
            <button key={k} type="button" className={`step-tab ${i === si ? "cur" : i < si ? "done" : ""}`} aria-current={i === si ? "step" : undefined} onClick={() => goTo(k)}><span className="n">{i + 1}</span>{l}</button>
          ))}
        </nav>
        <span className="desktop-only"><ThemeToggle /></span>
      </header>

      <main className="ldt-body">
        {room.demo ? <p className="notice small">Demo-Modus: Supabase ist nicht konfiguriert. Schüler werden simuliert. Für echte Räume <code>NEXT_PUBLIC_SUPABASE_URL</code> und <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> setzen (siehe README).</p> : null}
        {room.error ? <p className="notice bad small" role="alert">{room.error}</p> : null}

        {step === "import" ? (
          <div className="ldt-two">
            <div className="stack" style={{ flex: 1.1 }}>
              {contents.length ? (
                <label className="stack" style={{ ["--gap" as string]: "6px" }}><span className="label">Abgelegten Inhalt öffnen</span>
                  <select className="input" value={contentId ?? ""} onChange={(e) => (e.target.value ? pick(e.target.value) : (setContentId(null), setSource(""), setTitle("")))}>
                    <option value="">– neu eingeben –</option>
                    {contents.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </label>
              ) : null}
              <div className="row wrap" style={{ ["--gap" as string]: "6px" }}>
                {([["text", "Text"], ["vocabulary", "Vokabeln"], ["math", "Mathe"]] as const).map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => { setKind(k); setContentId(null); }} disabled={k === "math" && !mathWords.length}>{l}</button>)}
              </div>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel, z. B. Im Wald" aria-label="Titel" />
              {kind !== "math" ? <textarea className="textarea" rows={9} value={source} onChange={(e) => { setSource(e.target.value); setContentId(null); }} aria-label="Text" placeholder={kind === "text" ? "Der Hund bellt laut im Hof. Die Katze schläft auf dem Sofa." : "schon, bereits; already\nnoch nicht; not yet"} /> : <p className="small muted">Mathe-Aufgaben legst du unter „Inhalte“ mit dem Generator an.</p>}
              {kind === "text" ? (
                <div className="row wrap" style={{ ["--gap" as string]: "6px" }}>
                  <span className="label" style={{ marginRight: 4 }}>Teilen nach</span>
                  {(["satz", "zeile", "wort"] as const).map((s) => <button key={s} type="button" className="chip" aria-pressed={split === s} onClick={() => setSplit(s)}>{s[0].toUpperCase() + s.slice(1)}</button>)}
                  <label className="btn btn-ghost btn-xs" style={{ marginLeft: "auto", borderStyle: "dashed", color: "var(--accent)" }}>Datei importieren<input type="file" accept=".txt,text/plain" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setSource(await f.text()); setContentId(null); } e.target.value = ""; }} /></label>
                </div>
              ) : null}
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <span className="label">{words.length} Abschnitte · so sehen es die Schüler</span>
              <div className="list" style={{ maxHeight: 420, overflow: "auto" }}>
                {words.length ? words.map((w, i) => (
                  <div key={w.id} className="row" style={{ padding: "10px 13px" }}>
                    <span style={{ display: "grid", placeItems: "center", width: 26, height: 26, flex: "none", borderRadius: 8, background: "var(--surface2)", color: "var(--ink2)", fontSize: 12, fontWeight: 800 }}>{i + 1}</span>
                    <span className="grow" style={{ fontSize: 14, fontWeight: 600 }}>{w.prompt ? `${w.prompt} → ${w.targetWord}` : w.targetWord}</span>
                  </div>
                )) : <p className="empty" style={{ border: 0 }}>Text einfügen, um Abschnitte zu sehen.</p>}
              </div>
            </div>
          </div>
        ) : null}

        {step === "settings" ? (
          <div className="ldt-two" style={{ alignItems: "flex-start" }}>
            <div className="stack" style={{ flex: 1.1, ["--gap" as string]: "10px" }}>
              <span className="eyebrow">Spielmodus wählen</span>
              {MODES.map((m) => (
                <button key={m.id} type="button" className="mode-card" aria-pressed={mode === m.id} onClick={() => { setMode(m.id); if (window.innerWidth < 900) setSheet(true); }}>
                  <span className="sq"><Icon name={m.ic} size={22} /></span>
                  <span className="stack" style={{ ["--gap" as string]: "3px", minWidth: 0 }}><span style={{ fontSize: 15, fontWeight: 700 }}>{m.t}</span><span className="small muted">{m.sub}</span></span>
                  <span className="radio"><Icon name="check" size={14} strokeWidth={3} /></span>
                </button>
              ))}
            </div>
            <div className="card desktop-only" style={{ flex: 1, padding: "20px 22px", borderRadius: 20 }}>{modeDetail}</div>
          </div>
        ) : null}

        {step === "lobby" && room.room ? (
          <div className="ldt-two" style={{ alignItems: "flex-start" }}>
            <div className="stack" style={{ flex: 1.1 }}>
              <div className="card-dark ldt-code">
                <QrCode value={joinUrl} size={170} label={`QR-Code zum Beitreten, Raum ${room.room.code}`} />
                <div className="stack" style={{ ["--gap" as string]: "8px" }}>
                  <span className="eyebrow" style={{ color: "var(--nav-ink2)" }}>Raumcode</span>
                  <span className="code-tiles">{room.room.code.split("").map((c, i) => <span key={i}>{c}</span>)}</span>
                  <span className="small muted">{typeof window !== "undefined" ? window.location.host : "lernraum"} · Code eingeben oder scannen</span>
                </div>
              </div>
              <span className="small muted">{cur.t} · Schüler sehen gleich die Lobby, ab „Sitzung starten“ den ersten Abschnitt.</span>
              <button type="button" className="btn-link mobile-only" style={{ alignSelf: "flex-start" }} onClick={() => setSheet(true)}>{cur.t} · Optionen</button>
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <div className="between baseline"><span className="label">Beigetreten · {joined.length} von {active.count || "?"}</span><span className="row small" style={{ color: "var(--green)", fontWeight: 700, ["--gap" as string]: "6px" }}><span className="dot" style={{ background: "var(--green)" }} />wartet</span></div>
              <div className="grid2" style={{ gap: 8 }}>
                {joined.length ? joined.map((k) => {
                  const online = room.present.has(k);
                  return (
                    <div key={k} className="card row" style={{ padding: "10px 11px", borderRadius: 13, opacity: online ? 1 : 0.55 }}>
                      <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: "var(--surface2)" }}><Animal id={animalIdFor(k)} size={26} label={false} /></span>
                      <span className="truncate grow" style={{ fontSize: 13, fontWeight: 700 }}>{k}</span>
                      {!online && !room.demo ? <button type="button" className="icon-btn square" style={{ width: 28, height: 28 }} aria-label={`${k} entfernen`} onClick={() => void room.kick(k)}><Icon name="close" size={12} /></button> : null}
                    </div>
                  );
                }) : <p className="empty" style={{ gridColumn: "1 / -1" }}>Noch niemand da. Code an die Tafel!</p>}
              </div>
            </div>
          </div>
        ) : null}

        {step === "live" ? (
          <div className="stack" style={{ ["--gap" as string]: "14px" }}>
            <span className="row" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--green)", ["--gap" as string]: "7px" }}><span className="dot" style={{ background: "var(--green)" }} />Live · Raum {room.room?.code}</span>
            <div className="grid3" style={{ gap: 8 }}>
              {[["Aktiv", activeCount, "var(--gold)"], ["Fertig", finishedCount, "var(--green)"], ["Gesamt", `${totalPct} %`, "var(--ink3)"]].map(([l, v, c]) => (
                <div key={String(l)} className="card" style={{ padding: "12px 14px", borderRadius: 15 }}>
                  <span className="row" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink2)", ["--gap" as string]: "6px" }}><span className="dot" style={{ background: String(c) }} />{l}</span>
                  <p style={{ marginTop: 4, fontSize: 24, fontWeight: 800 }}>{v}</p>
                </div>
              ))}
            </div>
            <div className="ldt-live">
              <div className="stack" style={{ ["--gap" as string]: "10px" }}>
                <div className="between baseline">
                  <span className="label">{mode === "STATION" ? "Stationen" : "Schüler"}</span>
                  <button type="button" className="pill pill-good" style={{ border: 0, minHeight: 34, padding: "0 12px" }} onClick={() => downloadCsv({ id: "live", contentId: "", classId: active.id, title, mode: cur.t, date: new Date().toISOString(), total: words.length, rows: room.rows })}>Ergebnisse als CSV</button>
                </div>
                {mode === "STATION" ? (
                  <div className="ldt-stations">
                    {Array.from({ length: opt.stationCount }, (_, i) => i + 1).map((n) => {
                      const r = room.rows.find((x) => x.stationNumber === n);
                      const cls = r?.finished ? "done" : r ? "run" : "";
                      return <div key={n} className={`station-cell ${cls}`}><span style={{ fontSize: 22, fontWeight: 800 }}>{n}</span><span className="tiny" style={{ fontWeight: 700 }}>{r?.finished ? "Fertig" : r ? `${r.currentIndex + 1}/${words.length}` : "–"}</span></div>;
                    })}
                  </div>
                ) : (
                  <div className="ldt-kids">
                    {(room.rows.length ? room.rows : joined.map((k) => ({ studentKey: k, currentIndex: 0, errors: 0, finished: false }))).map((r) => (
                      <div key={r.studentKey} className="card stack" style={{ padding: "10px 11px", borderRadius: 13, ["--gap" as string]: "7px" }}>
                        <span className="row" style={{ ["--gap" as string]: "8px" }}><Animal id={animalIdFor(r.studentKey)} size={26} label={false} /><span className="truncate grow" style={{ fontSize: 12.5, fontWeight: 700 }}>{r.studentKey}</span></span>
                        <span className="row" style={{ ["--gap" as string]: "6px" }}>
                          {r.finished ? <span className="pill pill-good">Fertig</span> : <span className="bar grow" style={{ height: 5 }}><span style={{ width: `${Math.round((r.currentIndex / Math.max(1, words.length)) * 100)}%` }} /></span>}
                          {r.errors ? <span className="pill pill-bad">{r.errors}✕</span> : null}
                          <span className="tiny muted" style={{ marginLeft: "auto", fontWeight: 700 }}>{Math.min(r.currentIndex, words.length)}/{words.length}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card stack" style={{ padding: "14px 16px", borderRadius: 15, ["--gap" as string]: "10px" }}>
                <span className="eyebrow">Häufigste Fehler</span>
                {errors.length ? errors.map((e) => (
                  <div key={e.word} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) 1fr 22px", alignItems: "center", gap: 10 }}>
                    <span className="truncate" style={{ fontSize: 13.5, fontWeight: 700 }}>{e.word}</span>
                    <span className="bar bad" style={{ height: 6 }}><span style={{ width: `${(e.count / errors[0].count) * 100}%` }} /></span>
                    <span className="small muted" style={{ fontWeight: 700 }}>{e.count}</span>
                  </div>
                )) : <p className="small muted">Noch keine Fehler.</p>}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="ldt-foot">
        {si > 0 && step !== "live" ? <button type="button" className="btn btn-ghost" onClick={() => setStep(STEPS[si - 1][0])}><Icon name="back" size={16} strokeWidth={2.4} /><span className="desktop-only">Zurück</span></button> : null}
        <span className="small muted desktop-only">Alles wird automatisch unter „Abgelegt“ gespeichert.</span>
        <button type="button" className="btn btn-green" style={{ marginLeft: "auto", flex: "1 1 auto", maxWidth: 360 }} disabled={(step === "import" && !words.length) || room.status === "opening"} onClick={() => void nextStep()}>{room.status === "opening" ? "Öffne Raum …" : NEXT[si]}</button>
      </footer>

      {sheet ? (
        <>
          <button type="button" className="scrim" aria-label="Schließen" onClick={() => setSheet(false)} />
          <div className="sheet stack" role="dialog" aria-modal="true" aria-label={`${cur.t} · Optionen`}>
            <span className="grip" />
            {modeDetail}
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setSheet(false)}>Übernehmen</button>
          </div>
        </>
      ) : null}
    </div>
  );
}

const NAME_TO_ANIMAL: Record<string, string> = {};
function animalIdFor(name: string): string {
  if (NAME_TO_ANIMAL[name]) return NAME_TO_ANIMAL[name];
  const base = name.replace(/\s+\d+$/, "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/\s+/g, "_");
  const map: Record<string, string> = { phönix: "phoenix", phoenix: "phoenix", schaeferhund: "deutscher_schaeferhund", chamaeleon: "chameleon", strauss: "strauss", loewin: "loewin" };
  NAME_TO_ANIMAL[name] = map[base] ?? base;
  return NAME_TO_ANIMAL[name];
}

export function downloadCsv(result: SessionResult) {
  const url = URL.createObjectURL(new Blob([resultsCsv(result)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `laufdiktat-${(result.title || "ergebnis").replace(/[^\wäöüÄÖÜß-]+/g, "_")}-${result.date.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
