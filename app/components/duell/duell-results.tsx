"use client";

import { useEffect, useRef, useState } from "react";
import { getDuellResults, type DuellResultRow } from "../../../src/duell/duell-api.ts";
import { adoptDuellWords, findAdoptableWords } from "../../../src/duell/duell-vocab-bridge.ts";
import type { DuellWord } from "../../../src/duell/duell-content.ts";
import type { DuellRoundResult } from "../../../src/duell/duell-scoring.ts";
import type { LernBoxService } from "../../../src/domain/lernbox-service.ts";
import type { VocabularyItemV1, VocabularyStackV1 } from "../../../src/domain/learning-bundle.ts";
import type { JoinedDuellIdentity } from "./duell-app.tsx";

const POLL_INTERVAL_MS = 2500;
const NEW_STACK_VALUE = "__neu__";

type Props = {
  identity: JoinedDuellIdentity;
  content: DuellWord[];
  round: DuellRoundResult;
  ownItems: VocabularyItemV1[];
  service: LernBoxService;
  onLeave: () => void;
};

export function DuellResults({ identity, content, round, ownItems, service, onLeave }: Props) {
  const [results, setResults] = useState<DuellResultRow[]>([]);
  const [stacks, setStacks] = useState<VocabularyStackV1[]>([]);
  const [selectedStack, setSelectedStack] = useState<string>(NEW_STACK_VALUE);
  const [newStackTitle, setNewStackTitle] = useState("Duell-Wörter");
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [adopted, setAdopted] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const cancelledRef = useRef(false);

  const adoptable = findAdoptableWords(content, ownItems);

  useEffect(() => {
    cancelledRef.current = false;

    async function poll() {
      try {
        const rows = await getDuellResults(identity.duellId, identity.participantToken);
        if (!cancelledRef.current) setResults(rows);
      } catch {
        // transient network hiccup — the next tick tries again
      }
    }

    void poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(timer);
    };
  }, [identity.duellId, identity.participantToken]);

  useEffect(() => {
    service.listStacks().then(setStacks).catch(() => {});
  }, [service]);

  function toggleWord(itemId: string) {
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function handleAdopt() {
    const chosen = adoptable.filter((word) => selectedWordIds.has(word.itemId));
    if (chosen.length === 0) return;
    setAdopting(true);
    try {
      let stackId = selectedStack;
      if (stackId === NEW_STACK_VALUE) {
        const stack = await service.createStack(newStackTitle.trim() || "Duell-Wörter");
        stackId = stack.id;
      }
      await adoptDuellWords(service, chosen, stackId);
      setAdopted(true);
    } finally {
      setAdopting(false);
    }
  }

  return (
    <div className="duell-results">
      <p className="duell-results__own-score">
        {round.correctCount} / {round.totalCount} richtig ({round.accuracy}%)
      </p>

      <table className="duell-results__table">
        <thead>
          <tr><th>Platz</th><th>Name</th><th>Genauigkeit</th><th>Zeit</th></tr>
        </thead>
        <tbody>
          {results.map((row, position) => (
            <tr key={row.joinOrder} className={row.alias === identity.alias ? "duell-results__row--own" : undefined}>
              <td>{position + 1}</td>
              <td>{row.alias}</td>
              <td>{row.accuracy}%</td>
              <td>{(row.totalTimeMs / 1000).toFixed(1)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
      {results.length < 2 && <p className="duell-lobby__hint">Noch nicht alle haben abgegeben — die Liste aktualisiert sich von selbst.</p>}

      {adoptable.length > 0 && !adopted && (
        <div className="duell-results__adopt">
          <h3>Neue Wörter übernehmen?</h3>
          <p>Diese Wörter kanntest du noch nicht — übernimm sie freiwillig in deine LernBox:</p>
          <ul className="duell-results__adopt-list">
            {adoptable.map((word) => (
              <li key={word.itemId}>
                <label>
                  <input type="checkbox" checked={selectedWordIds.has(word.itemId)} onChange={() => toggleWord(word.itemId)} />
                  {word.prompt} → {word.answer}
                </label>
              </li>
            ))}
          </ul>

          <label htmlFor="duell-adopt-stack">Stapel</label>
          <select id="duell-adopt-stack" value={selectedStack} onChange={(event) => setSelectedStack(event.target.value)}>
            <option value={NEW_STACK_VALUE}>Neuer Stapel …</option>
            {stacks.map((stack) => (
              <option key={stack.id} value={stack.id}>{stack.title}</option>
            ))}
          </select>
          {selectedStack === NEW_STACK_VALUE && (
            <input value={newStackTitle} onChange={(event) => setNewStackTitle(event.target.value)} placeholder="Name des neuen Stapels" maxLength={80} />
          )}

          <button className="button button--primary" type="button" onClick={handleAdopt} disabled={adopting || selectedWordIds.size === 0}>
            {adopting ? "Übernehme …" : "Ausgewählte Wörter übernehmen"}
          </button>
        </div>
      )}
      {adopted && <p>Wörter wurden übernommen.</p>}

      <button className="button button--quiet" type="button" onClick={onLeave}>Zurück zum Start</button>
    </div>
  );
}
