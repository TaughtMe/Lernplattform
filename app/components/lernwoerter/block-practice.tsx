"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { DueLernwort } from "../../../src/domain/lernwort-service.ts";

type Props = {
  pool: DueLernwort[];
  onBlockAnswer: (items: DueLernwort["item"][], typedAnswers: string[]) => Promise<boolean[]>;
  onFinish: () => void;
};

const BLOCK_SIZES = [1, 2, 3, 5];

type Phase = "pick" | "reveal" | "writing" | "done";

/**
 * Stufe 5: mehrere Wörter gleichzeitig ansehen, merken, dann ohne feste
 * Reihenfolge eintippen. Bewusst ein einzelner Block pro Aufruf — für einen
 * weiteren Block einfach erneut "Wortblöcke üben" öffnen, statt einer
 * eingebauten Warteschlangen-Logik über mehrere Blöcke hinweg.
 */
export function BlockPractice({ pool, onBlockAnswer, onFinish }: Props) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [blockItems, setBlockItems] = useState<DueLernwort["item"][]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<boolean[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "writing") inputRef.current?.focus();
  }, [phase, wordIndex]);

  const availableSizes = BLOCK_SIZES.filter((n) => n <= pool.length);

  if (pool.length === 0) {
    return (
      <div className="practice-card">
        <p>Aktuell ist kein Wort in Stufe 5 fällig.</p>
        <button className="button button--primary" type="button" onClick={onFinish}>Zurück zur Übersicht</button>
      </div>
    );
  }

  function startBlock(size: number) {
    setBlockItems(pool.slice(0, size).map((entry) => entry.item));
    setWordIndex(0);
    setAnswers([]);
    setResults(null);
    setPhase("reveal");
  }

  function submitWord(event: FormEvent) {
    event.preventDefault();
    const next = [...answers, inputValue];
    setInputValue("");
    if (wordIndex + 1 < blockItems.length) {
      setAnswers(next);
      setWordIndex((i) => i + 1);
      return;
    }
    onBlockAnswer(blockItems, next).then((scored) => {
      setResults(scored);
      setPhase("done");
    });
  }

  if (phase === "pick") {
    return (
      <div className="practice-card">
        <p className="practice-card__progress">Stufe 5 · Wortblock</p>
        <p className="practice-card__ask">Wie viele Wörter auf einmal?</p>
        <div className="lernwort-card__block-sizes">
          {availableSizes.map((size) => (
            <button key={size} className="button button--secondary" type="button" onClick={() => startBlock(size)}>
              {size} {size === 1 ? "Wort" : "Wörter"}
            </button>
          ))}
        </div>
        <button className="button button--quiet" type="button" onClick={onFinish}>Zurück zur Übersicht</button>
      </div>
    );
  }

  if (phase === "reveal") {
    return (
      <div className="practice-card">
        <p className="practice-card__progress">Stufe 5 · {blockItems.length} Wörter merken</p>
        <ul className="lernwort-card__block-words">
          {blockItems.map((item) => (
            <li key={item.id}>{item.targetWord}</li>
          ))}
        </ul>
        <button className="button button--secondary" type="button" onClick={() => setPhase("writing")}>Verdecken &amp; schreiben</button>
      </div>
    );
  }

  if (phase === "writing") {
    return (
      <form className="practice-card" onSubmit={submitWord}>
        <p className="practice-card__progress">Wort {wordIndex + 1} von {blockItems.length} · Reihenfolge ist egal</p>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          aria-label="Wort eingeben"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button className="button button--primary" type="submit">
          {wordIndex + 1 < blockItems.length ? "Weiter" : "Prüfen"}
        </button>
      </form>
    );
  }

  // phase === "done"
  const correctCount = results?.filter(Boolean).length ?? 0;
  return (
    <div className="practice-card">
      <p className="practice-card__progress">Stufe 5 · Ergebnis</p>
      <p className="practice-card__ask">{correctCount} von {blockItems.length} richtig</p>
      <ul className="lernwort-card__block-words">
        {blockItems.map((item, i) => (
          <li key={item.id} className={results?.[i] ? "lernwort-card__block-word--correct" : "lernwort-card__block-word--wrong"}>
            {item.targetWord}
          </li>
        ))}
      </ul>
      <button className="button button--primary" type="button" onClick={onFinish}>Zurück zur Übersicht</button>
    </div>
  );
}
