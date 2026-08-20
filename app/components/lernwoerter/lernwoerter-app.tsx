"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createLernwortService, type DueLernwort, type LernwortListStats, type LernwortService } from "../../../src/domain/lernwort-service.ts";
import { scoreBlockAnswers } from "../../../src/domain/lernwort.ts";
import type { LernwortItemV1, LernwortListV1 } from "../../../src/domain/learning-bundle.ts";
import { createIndexedDbRepositoryFactory } from "../../../src/storage/indexeddb-repository.ts";
import { useIsClient } from "../use-is-client.ts";
import { WordPractice } from "./word-practice.tsx";
import { BlockPractice } from "./block-practice.tsx";

type View = { mode: "overview" } | { mode: "list"; listId: string } | { mode: "practice-words" } | { mode: "practice-blocks" };

export function LernwoerterApp() {
  const isClient = useIsClient();
  const service = useMemo<LernwortService | null>(
    () => (isClient ? createLernwortService(createIndexedDbRepositoryFactory()) : null),
    [isClient],
  );

  const [lists, setLists] = useState<LernwortListV1[]>([]);
  const [stats, setStats] = useState<Record<string, LernwortListStats>>({});
  const [items, setItems] = useState<LernwortItemV1[]>([]);
  const [itemStages, setItemStages] = useState<Record<string, { stage: number; box: number }>>({});
  const [view, setView] = useState<View>({ mode: "overview" });
  const [queue, setQueue] = useState<DueLernwort[]>([]);
  const [blockPool, setBlockPool] = useState<DueLernwort[]>([]);
  const [practiceLabel, setPracticeLabel] = useState("Fällige Wörter üben");
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshLists = useCallback((svc: LernwortService) => {
    svc.listLists().then(setLists);
    svc.listStats().then(setStats);
  }, []);

  useEffect(() => {
    if (service) refreshLists(service);
  }, [service, refreshLists]);

  const refreshItems = useCallback((svc: LernwortService, listId: string) => {
    svc.listItems(listId).then((loaded) => {
      setItems(loaded);
      Promise.all(loaded.map((item) => svc.getProgress(item.id).then((p) => [item.id, { stage: p.stage, box: p.box }] as const))).then(
        (pairs) => setItemStages(Object.fromEntries(pairs)),
      );
    });
  }, []);

  useEffect(() => {
    if (!service || view.mode !== "list") return;
    refreshItems(service, view.listId);
  }, [service, view, refreshItems]);

  if (!service) {
    return (
      <div className="lernbox-app">
        <p>Lade deinen Lernstand …</p>
      </div>
    );
  }

  function handleCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const title = String(new FormData(formEl).get("title") ?? "");
    service!
      .createList(title)
      .then((list) => {
        formEl.reset();
        refreshLists(service!);
        setView({ mode: "list", listId: list.id });
      })
      .catch((error: Error) => setMessage(error.message));
  }

  function handleDeleteList(listId: string) {
    service!.deleteList(listId).then(() => {
      refreshLists(service!);
      setView({ mode: "overview" });
    });
  }

  function handleAddWord(listId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const word = String(form.get("word") ?? "");
    const tagsRaw = String(form.get("phenomenon") ?? "");
    const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    service!
      .addLernwort(listId, word, tags)
      .then((item) => {
        formEl.reset();
        if (!item) {
          setMessage("Dieses Wort gibt es in dieser Liste schon.");
        } else {
          setMessage(null);
          refreshItems(service!, listId);
          refreshLists(service!);
        }
      })
      .catch((error: Error) => setMessage(error.message));
  }

  function handleRemoveWord(listId: string, itemId: string) {
    service!.removeLernwort(listId, itemId).then(() => {
      refreshItems(service!, listId);
      refreshLists(service!);
    });
  }

  function startWordPractice() {
    service!.dueQueue().then((due) => {
      const single = due.filter((entry) => entry.progress.stage < 5);
      if (single.length === 0) {
        setMessage("Aktuell ist nichts fällig.");
        return;
      }
      setQueue(single);
      setPracticeLabel("Fällige Wörter üben");
      setMessage(null);
      setView({ mode: "practice-words" });
    });
  }

  function startErrorPractice() {
    service!.errorQueue().then((due) => {
      if (due.length === 0) {
        setMessage("Aktuell gibt es nichts zu wiederholen — kein Wort steht auf Box 1.");
        return;
      }
      setQueue(due.filter((entry) => entry.progress.stage < 5));
      setBlockPool(due.filter((entry) => entry.progress.stage === 5));
      setPracticeLabel("Meine Fehler üben");
      setMessage(null);
      if (due.some((entry) => entry.progress.stage < 5)) {
        setView({ mode: "practice-words" });
      } else {
        setView({ mode: "practice-blocks" });
      }
    });
  }

  function startBlockPractice() {
    service!.dueQueue().then((due) => {
      const blocks = due.filter((entry) => entry.progress.stage === 5);
      if (blocks.length === 0) {
        setMessage("Aktuell ist kein Wort in Stufe 5 fällig.");
        return;
      }
      setBlockPool(blocks);
      setMessage(null);
      setView({ mode: "practice-blocks" });
    });
  }

  function handleAnswer(entry: DueLernwort, result: Parameters<LernwortService["recordResult"]>[1]) {
    service!.recordResult(entry.item, result).then(() => refreshLists(service!));
  }

  function handleBlockAnswer(blockItems: LernwortItemV1[], typedAnswers: string[]) {
    const scored = scoreBlockAnswers(blockItems.map((item) => item.targetWord), typedAnswers);
    return service!.recordBlockResult(blockItems, typedAnswers).then(() => {
      refreshLists(service!);
      return scored;
    });
  }

  function finishPractice() {
    setView({ mode: "overview" });
    refreshLists(service!);
  }

  function handleExport() {
    service!.exportBundle().then((bundle) => {
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lernraum-lernwoerter-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((text) => JSON.parse(text))
      .then((data) => service!.importBundle(data))
      .then(({ importedItems, importedLists }) => {
        setMessage(`Import fertig: ${importedItems} Lernwörter, ${importedLists} Listen neu übernommen.`);
        refreshLists(service!);
      })
      .catch(() => setMessage("Diese Datei konnte nicht gelesen werden."))
      .finally(() => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  }

  return (
    <div className="lernbox-app">
      {message && (
        <p className="lernbox-app__message" role="status">
          {message}
        </p>
      )}

      <div className="lernbox-app__toolbar">
        <button className="button button--primary" type="button" onClick={startWordPractice}>Fällige Wörter üben</button>
        <button className="button button--secondary" type="button" onClick={startBlockPractice}>Wortblöcke üben (Stufe 5)</button>
        <button className="button button--secondary" type="button" onClick={startErrorPractice}>Meine Fehler jetzt üben</button>
        <button className="button button--quiet" type="button" onClick={handleExport}>Als Datei sichern</button>
        <button className="button button--quiet" type="button" onClick={() => fileInputRef.current?.click()}>Sicherung wiederherstellen</button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
      </div>

      {view.mode === "practice-words" && (
        <>
          <p className="lernbox-app__practice-label">{practiceLabel}</p>
          <WordPractice queue={queue} onAnswer={handleAnswer} onFinish={finishPractice} />
        </>
      )}

      {view.mode === "practice-blocks" && (
        <>
          <p className="lernbox-app__practice-label">{practiceLabel}</p>
          <BlockPractice pool={blockPool} onBlockAnswer={handleBlockAnswer} onFinish={finishPractice} />
        </>
      )}

      {view.mode !== "practice-words" && view.mode !== "practice-blocks" && (
        <div className="lernbox-app__layout">
          <section className="stack-list" aria-label="Lernwort-Listen">
            <h2>Meine Listen</h2>
            <form onSubmit={handleCreateList} className="stack-list__new">
              <input name="title" placeholder="Neue Liste, z. B. Doppelkonsonant" required />
              <button className="button button--secondary" type="submit">Anlegen</button>
            </form>
            <ul>
              {lists.map((list) => {
                const listStats = stats[list.id];
                return (
                  <li key={list.id}>
                    <button
                      className={`stack-list__item${view.mode === "list" && view.listId === list.id ? " stack-list__item--active" : ""}`}
                      type="button"
                      onClick={() => setView({ mode: "list", listId: list.id })}
                    >
                      <span className="stack-list__title">
                        {list.title} <span>({list.itemIds.length})</span>
                      </span>
                      {listStats && (listStats.dueCount > 0 || listStats.strugglingCount > 0) && (
                        <span className="stack-list__badges">
                          {listStats.dueCount > 0 && <span className="stack-list__badge stack-list__badge--due">{listStats.dueCount} fällig</span>}
                          {listStats.strugglingCount > 0 && (
                            <span className="stack-list__badge stack-list__badge--struggling">{listStats.strugglingCount} auf Box 1</span>
                          )}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {lists.length === 0 && <li className="stack-list__empty">Noch keine Liste angelegt.</li>}
            </ul>
          </section>

          {view.mode === "list" && (
            <section className="stack-detail" aria-label="Lernwörter in der Liste">
              <div className="stack-detail__heading">
                <h2>{lists.find((l) => l.id === view.listId)?.title}</h2>
                <button className="button button--quiet" type="button" onClick={() => handleDeleteList(view.listId)}>Liste löschen</button>
              </div>
              <form onSubmit={(event) => handleAddWord(view.listId, event)} className="stack-detail__new">
                <input name="word" placeholder="Lernwort" required />
                <input name="phenomenon" placeholder="Rechtschreibphänomen (optional, mit Komma trennen)" />
                <button className="button button--secondary" type="submit">Lernwort hinzufügen</button>
              </form>
              <ul className="stack-detail__items">
                {items.map((item) => {
                  const progress = itemStages[item.id];
                  return (
                    <li key={item.id}>
                      <span>
                        {item.targetWord}
                        {item.phenomenonTags.length > 0 && <span className="lernwort-card__tags"> · {item.phenomenonTags.join(", ")}</span>}
                      </span>
                      {progress && (
                        <span className={`stack-detail__box stack-detail__box--${progress.box}`}>
                          Stufe {progress.stage} · Box {progress.box}
                        </span>
                      )}
                      <button type="button" onClick={() => handleRemoveWord(view.listId, item.id)} aria-label={`${item.targetWord} entfernen`}>
                        ×
                      </button>
                    </li>
                  );
                })}
                {items.length === 0 && <li className="stack-detail__empty">Noch keine Lernwörter in dieser Liste.</li>}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
