"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { contentKindOf } from "../../src/domain/teacher-content-summary";
import type { TeacherContentPackage } from "../../src/domain/teacher-content-library";
import {
  buildWordListPackage,
  readWordListText,
  WORD_LIST_MAX_WORDS,
  WORD_LIST_TITLE_MAX,
  wordListSource,
} from "../../src/domain/word-list-package";
import {
  createTransferLink,
  publishTransferPayload,
  WORD_LIST_TRANSFER_PATH,
} from "../../src/integrations/content-transfer/content-transfer-client";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import { createTeacherContentLibraryRepository } from "../../src/storage/teacher-class-settings";
import {
  forgetTransfers,
  rememberTransfer,
  transferKindOf,
  transferTimeLeft,
} from "../lehrer/material/active-transfers";
import { manageStyles as m } from "../views/lehrer/manage-parts";
import {
  LiveTransfers,
  PackageList,
  TransferLayout,
  WordListEditor,
  type SaveState,
} from "../views/lehrer/transfer-screen";
import { cx } from "../views/parts/parts";
import {
  formatTransferCode,
  LiveTransferQr,
  shortDate,
  type TransferClock,
} from "./teacher-transfer-shared";

/** Wartezeit nach der letzten Änderung, bevor die Liste gespeichert wird. */
const SAVE_DELAY = 600;
const NEW_TITLE = "Neue Lernwortliste";
const LOCALE = "de-DE";
const HINT =
  "Schüler öffnen die Lernwerkstatt und scannen den Code oder geben ihn ein. Danach sehen sie die Wörter und speichern sie als Wortbox.";

/** Die Liste im Editor; `id` fehlt, solange sie noch nie gespeichert wurde. */
type Draft = {
  id: string | null;
  revision: number;
  title: string;
  /** Der Text im Feld, so wie getippt. */
  text: string;
  existing?: TeacherContentPackage | undefined;
};

function draftOf(entry: TeacherContentPackage): Draft {
  return {
    id: entry.id,
    revision: entry.revision,
    title: entry.title,
    text: entry.source,
    existing: entry,
  };
}

const emptyDraft = (): Draft => ({
  id: null,
  revision: 0,
  title: NEW_TITLE,
  text: "",
});

/** Titel und mindestens ein Wort, nicht mehr als erlaubt. */
function problemOf(draft: Draft) {
  const reading = readWordListText(draft.text);
  const title = draft.title.trim();
  return {
    reading,
    ok:
      title.length > 0 &&
      title.length <= WORD_LIST_TITLE_MAX &&
      reading.words.length > 0 &&
      reading.surplus === 0,
  };
}

function noteOf(draft: Draft) {
  const { reading } = problemOf(draft);
  if (reading.surplus > 0) {
    return `Das sind zu viele Wörter. Eine Liste hat höchstens ${WORD_LIST_MAX_WORDS} Wörter. Teile sie in zwei Listen.`;
  }
  if (reading.ignored > 0) {
    return `${reading.ignored} Einträge werden nicht mitgegeben: doppelt, zu lang oder mit nicht erlaubten Zeichen.`;
  }
  return undefined;
}

/**
 * Lernwortlisten (D4): Titel und Wörter anlegen, lokal speichern und über die
 * verschlüsselte Übertragung freigeben. Das Kind bekommt daraus eine Wortbox im
 * Wortspeicher. Gespeichert wird als Ablageart „wordlist“ (ein Wort je Zeile),
 * damit die Liste mit dem Geräteabgleich und der Sicherung mitreist.
 */
export function TeacherWordListTransfer({
  transferConfig,
  clock,
}: {
  transferConfig: LiveRoomConfig | null;
  clock: TransferClock;
}) {
  const { transfers, setTransfers, now, setNow } = clock;
  const library = useMemo(() => createTeacherContentLibraryRepository(), []);
  const [packages, setPackages] = useState<TeacherContentPackage[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [save, setSave] = useState<SaveState>("unsaved");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [big, setBig] = useState(false);
  const pending = useRef<number | null>(null);
  // Der neueste Stand für verzögertes Speichern und Freigeben.
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  });

  const lists = useMemo(
    () =>
      packages
        .filter((entry) => contentKindOf(entry) === "wordlist")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [packages],
  );

  useEffect(() => {
    let active = true;
    library
      .list()
      .then((stored) => {
        if (!active) return;
        setPackages(stored);
        const first = stored
          .filter((entry) => contentKindOf(entry) === "wordlist")
          .sort((left, right) =>
            right.updatedAt.localeCompare(left.updatedAt),
          )[0];
        if (first) {
          setDraft(draftOf(first));
          setSave("saved");
        }
      })
      .catch(() =>
        setError(
          "Die lokale Lehrkraftbibliothek konnte nicht geöffnet werden.",
        ),
      );
    return () => {
      active = false;
    };
  }, [library]);

  const store = useCallback(
    async (value: Draft, revision = value.revision) => {
      const time = new Date().toISOString();
      const id = value.id ?? `teacher-package-${crypto.randomUUID()}`;
      const existing = value.existing;
      const entry: TeacherContentPackage = {
        id,
        revision,
        title: value.title.trim(),
        source: wordListSource(readWordListText(value.text).words),
        promptLocale: LOCALE,
        answerLocale: LOCALE,
        createdAt: existing?.createdAt ?? time,
        updatedAt: time,
        kind: "wordlist",
        // Klassenzuordnung bleibt erhalten.
        ...(existing?.classIds ? { classIds: existing.classIds } : {}),
      };
      await library.put(entry);
      setPackages(await library.list());
      // Nur übernehmen, wenn inzwischen keine andere Liste geöffnet wurde.
      setDraft((current) =>
        current.id === value.id
          ? { ...current, id, revision, existing: entry }
          : current,
      );
      window.dispatchEvent(new Event("teacher-data-changed"));
      return entry;
    },
    [library],
  );

  const flush = useCallback(async () => {
    if (pending.current === null) return;
    window.clearTimeout(pending.current);
    pending.current = null;
    const value = latest.current;
    if (!problemOf(value).ok) return;
    try {
      await store(value);
      setSave("saved");
    } catch {
      setError("Die Liste konnte nicht lokal gespeichert werden.");
    }
  }, [store]);

  // Beim Verlassen der Seite wird eine wartende Änderung noch gespeichert.
  useEffect(() => () => void flush(), [flush]);

  function edit(change: Partial<Draft>) {
    const next = { ...latest.current, ...change };
    latest.current = next;
    setDraft(next);
    setConfirmDelete(false);
    if (pending.current !== null) window.clearTimeout(pending.current);
    pending.current = null;
    if (!problemOf(next).ok) {
      setSave("unsaved");
      return;
    }
    setSave("saving");
    pending.current = window.setTimeout(() => {
      pending.current = null;
      void store(latest.current)
        .then(() => {
          if (pending.current === null) setSave("saved");
        })
        .catch(() => {
          setSave("unsaved");
          setError("Die Liste konnte nicht lokal gespeichert werden.");
        });
    }, SAVE_DELAY);
  }

  async function open(next: Draft, message: string) {
    await flush();
    setDraft(next);
    latest.current = next;
    setSave(next.id ? "saved" : "unsaved");
    setError("");
    setConfirmDelete(false);
    setNotice(message);
  }

  function pick(id: string) {
    const entry = lists.find((item) => item.id === id);
    if (entry) void open(draftOf(entry), "");
  }

  async function removeCurrent() {
    const { id, title } = latest.current;
    setConfirmDelete(false);
    if (!id) return;
    try {
      await library.remove(id);
      const remaining = await library.list();
      setPackages(remaining);
      setTransfers(forgetTransfers(id, Date.now()));
      const next = remaining
        .filter((entry) => contentKindOf(entry) === "wordlist")
        .sort((left, right) =>
          right.updatedAt.localeCompare(left.updatedAt),
        )[0];
      const draftNext = next ? draftOf(next) : emptyDraft();
      setDraft(draftNext);
      latest.current = draftNext;
      setSave(next ? "saved" : "unsaved");
      setNotice(`„${title}“ wurde aus der lokalen Bibliothek gelöscht.`);
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setError("Die Liste konnte nicht gelöscht werden.");
    }
  }

  async function publish() {
    setError("");
    setNotice("");
    if (!transferConfig) {
      setError("Die Inhaltsübertragung ist noch nicht konfiguriert.");
      return;
    }
    if (pending.current !== null) {
      window.clearTimeout(pending.current);
      pending.current = null;
    }
    const value = latest.current;
    setBusy(true);
    try {
      const id = value.id ?? `teacher-package-${crypto.randomUUID()}`;
      const withId = { ...value, id };
      latest.current = withId;
      setDraft(withId);
      const revision = value.revision + 1;
      const payload = buildWordListPackage({
        id,
        revision,
        title: value.title,
        text: value.text,
      });
      const result = await publishTransferPayload(
        getLiveRoomClient(transferConfig),
        payload,
      );
      const time = Date.now();
      setTransfers(
        rememberTransfer(
          {
            packageId: id,
            title: payload.title,
            pairs: payload.words.length,
            kind: "wordlist",
            code: result.manualTransferCode,
            publishedAt: new Date(time).toISOString(),
            expiresAt: result.expiresAt,
          },
          time,
        ),
      );
      setNow(time);
      try {
        await store(withId, revision);
        setSave("saved");
      } catch {
        setNotice(
          "Die Freigabe ist gültig, konnte aber nicht zusätzlich lokal gespeichert werden.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Die Liste konnte nicht veröffentlicht werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  const mine = transfers.filter(
    (entry) => transferKindOf(entry) === "wordlist",
  );
  const live = mine.find(({ packageId }) => packageId === draft.id);
  const items = lists.map((entry) => {
    const share = mine.find(({ packageId }) => packageId === entry.id);
    const words = entry.source.split(/\r?\n/).filter((line) => line.trim());
    return {
      id: entry.id,
      title: entry.title,
      meta: `${words.length} Wörter · geändert ${shortDate(entry.updatedAt)}`,
      live: share ? transferTimeLeft(share, now).short : undefined,
    };
  });
  // Eine neue, noch nie gespeicherte Liste steht oben.
  const listed = draft.id
    ? items
    : [
        {
          id: "",
          title: draft.title.trim() || NEW_TITLE,
          meta: "noch nicht gespeichert",
          live: undefined,
        },
        ...items,
      ];
  const qrValue =
    live && typeof window !== "undefined"
      ? createTransferLink(
          window.location.origin,
          live.code,
          WORD_LIST_TRANSFER_PATH,
        )
      : "";
  const { reading, ok } = problemOf(draft);

  return (
    <TransferLayout
      side={
        <>
          <PackageList
            items={listed}
            selectedId={draft.id ?? ""}
            heading="Lernwortlisten"
            newLabel="Neue Lernwortliste"
            showLibrary={false}
            onPick={pick}
            onNew={() =>
              void open(
                emptyDraft(),
                "Neue, noch nicht gespeicherte Liste geöffnet.",
              )
            }
          />
          <LiveTransfers
            items={mine.map((entry) => {
              const time = transferTimeLeft(entry, now);
              return {
                id: entry.packageId,
                title: entry.title,
                meta: `${entry.pairs} Wörter · Code ${formatTransferCode(entry.code).slice(0, 4)} …`,
                left: `${time.short} · ${time.until}`,
                fraction: time.fraction,
              };
            })}
            actionLabel="QR zeigen"
            onAction={pick}
          />
        </>
      }
    >
      <WordListEditor
        title={draft.title}
        text={draft.text}
        count={reading.words.length}
        maxWords={WORD_LIST_MAX_WORDS}
        titleMax={WORD_LIST_TITLE_MAX}
        note={noteOf(draft)}
        save={save}
        live={Boolean(live)}
        busy={busy}
        shareDisabled={!ok}
        onTitle={(title) => edit({ title })}
        onText={(text) => edit({ text })}
        onShare={() => void publish()}
        onDelete={draft.id ? () => setConfirmDelete(true) : undefined}
      />
      {confirmDelete ? (
        <div
          className={cx(m.notice, m.noticeBad)}
          role="alertdialog"
          aria-label="Liste löschen"
        >
          <p className={m.noticeText}>
            „{draft.title}“ aus der lokalen Bibliothek löschen? Eine laufende
            Freigabe bleibt bis zu ihrem Ablauf gültig.
          </p>
          <span className={m.actions}>
            <button
              type="button"
              className={cx(m.soft, m.danger)}
              onClick={() => void removeCurrent()}
            >
              Löschen
            </button>
            <button
              type="button"
              className={m.soft}
              onClick={() => setConfirmDelete(false)}
            >
              Abbrechen
            </button>
          </span>
        </div>
      ) : null}
      {notice ? (
        <p className={m.notice} role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className={cx(m.notice, m.noticeBad)} role="alert">
          {error}
        </p>
      ) : null}
      {live && qrValue ? (
        <LiveTransferQr
          live={live}
          now={now}
          link={qrValue}
          qrLabel="QR-Code für die verschlüsselte Lernwortliste"
          hint={HINT}
          big={big}
          onBig={setBig}
        />
      ) : null}
    </TransferLayout>
  );
}
