"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createLernBoxService, type AnswerResult, type DueEntry, type LernBoxService, type StackStats } from "../../../src/domain/lernbox-service";
import type { VocabularyItemV1, VocabularyStackV1, LearningProgressV1 } from "../../../src/domain/learning-bundle";
import { minBox } from "../../../src/domain/leitner";
import { createIndexedDbRepositoryFactory } from "../../../src/storage/indexeddb-repository";
import { PracticeSession } from "./practice-session";

type View = { mode: "overview" } | { mode: "stack"; stackId: string } | { mode: "practice" };

const noopSubscribe = () => () => {};

/**
 * IndexedDB only exists client-side. useSyncExternalStore (not useState+useEffect)
 * is the pattern React itself recommends here: it reports `false` during SSR and
 * during the client's hydration pass so the two match, then flips to `true` on the
 * next client render, once hydration is safely done — without a setState-in-effect.
 */
function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function LernBoxApp() {
  const isClient = useIsClient();
  const service = useMemo<LernBoxService | null>(
    () => (isClient ? createLernBoxService(createIndexedDbRepositoryFactory()) : null),
    [isClient],
  );
  const [stacks, setStacks] = useState<VocabularyStackV1[]>([]);
  const [stats, setStats] = useState<Record<string, StackStats>>({});
  const [items, setItems] = useState<VocabularyItemV1[]>([]);
  const [itemProgress, setItemProgress] = useState<Record<string, LearningProgressV1>>({});
  const [view, setView] = useState<View>({ mode: "overview" });
  const [queue, setQueue] = useState<DueEntry[]>([]);
  const [practiceLabel, setPracticeLabel] = useState("Vokabeln üben");
  const [message, setMessage] = useState<string | null>(null);
  const roundIdRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshStacks = useCallback((svc: LernBoxService) => {
    svc.listStacks().then(setStacks);
    svc.stackStats().then(setStats);
  }, []);

  useEffect(() => {
    if (service) refreshStacks(service);
  }, [service, refreshStacks]);

  const refreshItems = useCallback(
    (svc: LernBoxService, stackId: string) => {
      svc.listItems(stackId).then((loaded) => {
        setItems(loaded);
        Promise.all(loaded.map((item) => svc.getProgress(item.id).then((progress) => [item.id, progress] as const))).then((pairs) => {
          setItemProgress(Object.fromEntries(pairs));
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (!service || view.mode !== "stack") return;
    refreshItems(service, view.stackId);
  }, [service, view, refreshItems]);

  if (!service) {
    return (
      <div className="lernbox-app">
        <p>Lade deinen Lernstand …</p>
      </div>
    );
  }

  function handleCreateStack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const title = String(new FormData(formEl).get("title") ?? "");
    service!.createStack(title).then((stack) => {
      formEl.reset();
      refreshStacks(service!);
      setView({ mode: "stack", stackId: stack.id });
    }).catch((error: Error) => setMessage(error.message));
  }

  function handleDeleteStack(stackId: string) {
    service!.deleteStack(stackId).then(() => {
      refreshStacks(service!);
      setView({ mode: "overview" });
    });
  }

  function handleAddItem(stackId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const prompt = String(form.get("prompt") ?? "");
    const answer = String(form.get("answer") ?? "");
    service!.addVocabularyItem(stackId, prompt, answer).then((item) => {
      formEl.reset();
      if (!item) {
        setMessage("Diese Vokabel gibt es in diesem Stapel schon.");
      } else {
        setMessage(null);
        refreshItems(service!, stackId);
        refreshStacks(service!);
      }
    }).catch((error: Error) => setMessage(error.message));
  }

  function handleRemoveItem(stackId: string, itemId: string) {
    service!.removeVocabularyItem(stackId, itemId).then(() => {
      refreshItems(service!, stackId);
      refreshStacks(service!);
    });
  }

  function startPractice() {
    service!.dueQueue().then((due) => {
      if (due.length === 0) {
        setMessage("Aktuell ist nichts fällig.");
        return;
      }
      roundIdRef.current = crypto.randomUUID();
      setQueue(due);
      setPracticeLabel("Vokabeln üben");
      setMessage(null);
      setView({ mode: "practice" });
    });
  }

  function startErrorPractice() {
    service!.errorQueue().then((due) => {
      if (due.length === 0) {
        setMessage("Aktuell gibt es nichts zu wiederholen — kein Wort steht auf Box 1.");
        return;
      }
      roundIdRef.current = crypto.randomUUID();
      setQueue(due);
      setPracticeLabel("Meine Fehler üben");
      setMessage(null);
      setView({ mode: "practice" });
    });
  }

  function handleAnswer(entry: DueEntry, result: AnswerResult) {
    service!.recordAnswer(entry.item, entry.direction, roundIdRef.current, result).then(() => refreshStacks(service!));
  }

  function finishPractice() {
    setView({ mode: "overview" });
    refreshStacks(service!);
  }

  function handleExport() {
    service!.exportBundle().then((bundle) => {
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lernraum-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((text) => JSON.parse(text)).then((data) => service!.importBundle(data)).then(({ importedItems, importedStacks }) => {
      setMessage(`Import fertig: ${importedItems} Vokabeln, ${importedStacks} Stapel neu übernommen.`);
      refreshStacks(service!);
    }).catch(() => setMessage("Diese Datei konnte nicht gelesen werden.")).finally(() => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div className="lernbox-app">
      {message && <p className="lernbox-app__message" role="status">{message}</p>}

      <div className="lernbox-app__toolbar">
        <button className="button button--primary" type="button" onClick={startPractice}>Vokabeln üben</button>
        <button className="button button--secondary" type="button" onClick={startErrorPractice}>Meine Fehler jetzt üben</button>
        <button className="button button--quiet" type="button" onClick={handleExport}>Als Datei sichern</button>
        <button className="button button--quiet" type="button" onClick={() => fileInputRef.current?.click()}>Sicherung wiederherstellen</button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
      </div>

      {view.mode === "practice" && (
        <>
          <p className="lernbox-app__practice-label">{practiceLabel}</p>
          <PracticeSession queue={queue} onAnswer={handleAnswer} onFinish={finishPractice} />
        </>
      )}

      {view.mode !== "practice" && (
        <div className="lernbox-app__layout">
          <section className="stack-list" aria-label="Vokabelstapel">
            <h2>Meine Stapel</h2>
            <form onSubmit={handleCreateStack} className="stack-list__new">
              <input name="title" placeholder="Neuer Stapel, z. B. Englisch Unit 3" required />
              <button className="button button--secondary" type="submit">Anlegen</button>
            </form>
            <ul>
              {stacks.map((stack) => {
                const stackStats = stats[stack.id];
                return (
                  <li key={stack.id}>
                    <button
                      className={`stack-list__item${view.mode === "stack" && view.stackId === stack.id ? " stack-list__item--active" : ""}`}
                      type="button"
                      onClick={() => setView({ mode: "stack", stackId: stack.id })}
                    >
                      <span className="stack-list__title">{stack.title} <span>({stack.itemIds.length})</span></span>
                      {stackStats && (stackStats.dueCount > 0 || stackStats.strugglingCount > 0) && (
                        <span className="stack-list__badges">
                          {stackStats.dueCount > 0 && <span className="stack-list__badge stack-list__badge--due">{stackStats.dueCount} fällig</span>}
                          {stackStats.strugglingCount > 0 && <span className="stack-list__badge stack-list__badge--struggling">{stackStats.strugglingCount} auf Box 1</span>}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {stacks.length === 0 && <li className="stack-list__empty">Noch kein Stapel angelegt.</li>}
            </ul>
          </section>

          {view.mode === "stack" && (
            <section className="stack-detail" aria-label="Vokabeln im Stapel">
              <div className="stack-detail__heading">
                <h2>{stacks.find((s) => s.id === view.stackId)?.title}</h2>
                <button className="button button--quiet" type="button" onClick={() => handleDeleteStack(view.stackId)}>Stapel löschen</button>
              </div>
              <form onSubmit={(event) => handleAddItem(view.stackId, event)} className="stack-detail__new">
                <input name="prompt" placeholder="Wort" required />
                <input name="answer" placeholder="Übersetzung" required />
                <button className="button button--secondary" type="submit">Vokabel hinzufügen</button>
              </form>
              <ul className="stack-detail__items">
                {items.map((item) => {
                  const progress = itemProgress[item.id];
                  return (
                    <li key={item.id}>
                      <span>{item.prompt.text} → {item.answer.text}</span>
                      {progress && <span className={`stack-detail__box stack-detail__box--${minBox(progress)}`}>Box {minBox(progress)}</span>}
                      <button type="button" onClick={() => handleRemoveItem(view.stackId, item.id)} aria-label={`${item.prompt.text} entfernen`}>×</button>
                    </li>
                  );
                })}
                {items.length === 0 && <li className="stack-detail__empty">Noch keine Vokabeln in diesem Stapel.</li>}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
