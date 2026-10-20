"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  pickerLocale,
  VOCABULARY_LANGUAGES,
} from "../../src/domain/running-dictation";
import { buildTeacherVocabularyBundle } from "../../src/domain/teacher-content-transfer";
import {
  createTeacherContentLibraryFile,
  parseTeacherContentLibraryFile,
  type TeacherContentPackage,
} from "../../src/domain/teacher-content-library";
import {
  createTransferLink,
  publishLearningBundle,
} from "../../src/integrations/content-transfer/content-transfer-client";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import { contentKindOf } from "../../src/domain/teacher-content-summary";
import { createTeacherContentLibraryRepository } from "../../src/storage/teacher-class-settings";
import {
  forgetTransfers,
  readActiveTransfers,
  rememberTransfer,
  transferTimeLeft,
  type ActiveTransfer,
} from "../lehrer/material/active-transfers";
import { cx } from "../views/parts/parts";
import { manageStyles as m, ManagePage } from "../views/lehrer/manage-parts";
import {
  LiveTransfers,
  PackageEditor,
  PackageList,
  TransferBig,
  TransferLayout,
  TransferResult,
  type SaveState,
} from "../views/lehrer/transfer-screen";
import {
  completePairs,
  rowsFromSource,
  sourceFromRows,
  swapRows,
  type VocabularyRowValue,
} from "../views/lehrer/vocabulary-rows";

/** Wartezeit nach der letzten Änderung, bevor das Paket gespeichert wird. */
const SAVE_DELAY = 600;
const NEW_TITLE = "Neues Vokabelpaket";
const DEFAULT_LEFT = "en-GB";
const DEFAULT_RIGHT = "de-DE";

function formatTransferCode(value: string) {
  return value.match(/.{1,4}/g)?.join(" ") ?? value;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });

/** Das Paket im Editor; `id` fehlt, solange es noch nie gespeichert wurde. */
type Draft = {
  id: string | null;
  revision: number;
  title: string;
  rows: VocabularyRowValue[];
  left: string;
  right: string;
  existing?: TeacherContentPackage | undefined;
};

function draftOf(entry: TeacherContentPackage): Draft {
  return {
    id: entry.id,
    revision: entry.revision,
    title: entry.title,
    rows: rowsFromSource(entry.source),
    left: pickerLocale(entry.promptLocale, DEFAULT_LEFT),
    right: pickerLocale(entry.answerLocale, DEFAULT_RIGHT),
    existing: entry,
  };
}

const emptyDraft = (): Draft => ({
  id: null,
  revision: 0,
  title: NEW_TITLE,
  rows: [],
  left: DEFAULT_LEFT,
  right: DEFAULT_RIGHT,
});

const canSave = (draft: Draft) =>
  draft.title.trim().length > 0 && completePairs(draft.rows) > 0;

/**
 * Freigabe an Schüler (Lehrerbereich v2, 17b): Vokabelpakete der Ablage
 * bearbeiten, lokal speichern (beim Tippen) und verschlüsselt für höchstens
 * 24 Stunden freigeben. Texte und Mathe bleiben in der Ablage.
 */
export function TeacherContentTransfer({
  transferConfig,
}: {
  transferConfig: LiveRoomConfig | null;
}) {
  const library = useMemo(() => createTeacherContentLibraryRepository(), []);
  const [packages, setPackages] = useState<TeacherContentPackage[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [save, setSave] = useState<SaveState>("unsaved");
  const [transfers, setTransfers] = useState<ActiveTransfer[]>([]);
  const [now, setNow] = useState(() => Date.now());
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

  const vocabularyPackages = useMemo(
    () =>
      packages
        .filter((entry) => contentKindOf(entry) === "vocabulary")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [packages],
  );

  // Laufende Freigaben und ihre Restzeit; die Uhr läuft halbminütlich.
  useEffect(() => {
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setTransfers(readActiveTransfers(time));
    };
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let active = true;
    library
      .list()
      .then((stored) => {
        if (!active) return;
        setPackages(stored);
        const first = stored
          .filter((entry) => contentKindOf(entry) === "vocabulary")
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
        source: sourceFromRows(value.rows),
        promptLocale: value.left,
        answerLocale: value.right,
        createdAt: existing?.createdAt ?? time,
        updatedAt: time,
        // Art, Klassenzuordnung und letzte Nutzung bleiben erhalten.
        ...(existing?.kind ? { kind: existing.kind } : {}),
        ...(existing?.classIds ? { classIds: existing.classIds } : {}),
        ...(existing?.lastUsedAt ? { lastUsedAt: existing.lastUsedAt } : {}),
      };
      await library.put(entry);
      setPackages(await library.list());
      // Nur übernehmen, wenn inzwischen kein anderes Paket geöffnet wurde.
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
    if (!canSave(value)) return;
    try {
      await store(value);
      setSave("saved");
    } catch {
      setError("Das Paket konnte nicht lokal gespeichert werden.");
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
    if (!canSave(next)) {
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
          setError("Das Paket konnte nicht lokal gespeichert werden.");
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
    const entry = vocabularyPackages.find((item) => item.id === id);
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
        .filter((entry) => contentKindOf(entry) === "vocabulary")
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
      setError("Das Paket konnte nicht gelöscht werden.");
    }
  }

  function exportLibrary() {
    const file = createTeacherContentLibraryFile(packages);
    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Lernraum-Lehrkraftbibliothek-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`${packages.length} Pakete wurden als Datei exportiert.`);
  }

  async function importLibrary(file: File) {
    setError("");
    try {
      const imported = parseTeacherContentLibraryFile(
        JSON.parse(await file.text()),
      );
      await library.putMany(imported.packages);
      setPackages(await library.list());
      setNotice(
        `${imported.packages.length} Pakete wurden geprüft und lokal übernommen.`,
      );
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setError(
        "Die Datei ist keine gültige Lernraum-Lehrkraftbibliothek der Version 1.",
      );
    }
  }

  async function importVocabularyFile(file: File) {
    setError("");
    setNotice("");
    const rows = rowsFromSource(await file.text());
    const pairs = completePairs(rows);
    if (pairs === 0) {
      setError(
        "Die Datei enthält noch keine erkennbaren Vokabelpaare. Trenne Vorder- und Rückseite mit Semikolon oder Tab.",
      );
      return;
    }
    edit({ rows });
    setNotice(`${pairs} Vokabelpaare aus „${file.name}“ wurden übernommen.`);
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
      const bundle = buildTeacherVocabularyBundle({
        id,
        revision,
        title: value.title,
        source: sourceFromRows(value.rows),
        promptLocale: value.left,
        answerLocale: value.right,
      });
      const result = await publishLearningBundle(
        getLiveRoomClient(transferConfig),
        bundle,
      );
      const time = Date.now();
      setTransfers(
        rememberTransfer(
          {
            packageId: id,
            title: value.title.trim(),
            pairs: completePairs(value.rows),
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
          : "Das Paket konnte nicht veröffentlicht werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  const live = transfers.find(({ packageId }) => packageId === draft.id);
  const liveOf = (id: string) =>
    transfers.find(({ packageId }) => packageId === id);
  const items = vocabularyPackages.map((entry) => {
    const share = liveOf(entry.id);
    return {
      id: entry.id,
      title: entry.title,
      meta: `${completePairs(rowsFromSource(entry.source))} Paare · geändert ${shortDate(entry.updatedAt)}`,
      live: share ? transferTimeLeft(share, now).short : undefined,
    };
  });
  // Ein neues, noch nie gespeichertes Paket steht oben in der Liste.
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
      ? createTransferLink(window.location.origin, live.code)
      : "";
  const liveTime = live ? transferTimeLeft(live, now) : null;

  return (
    <ManagePage
      title="Freigabe an Schüler"
      lead="Vokabelpakete per QR-Code auf die Geräte der Schüler geben. Verschlüsselt und nach 24 Stunden gelöscht."
    >
      <TransferLayout
        side={
          <>
            <PackageList
              items={listed}
              selectedId={draft.id ?? ""}
              onPick={pick}
              onNew={() =>
                void open(
                  emptyDraft(),
                  "Neues, noch nicht gespeichertes Paket geöffnet.",
                )
              }
              onExport={exportLibrary}
              onImport={(file) => void importLibrary(file)}
            />
            <LiveTransfers
              items={transfers.map((entry) => {
                const time = transferTimeLeft(entry, now);
                return {
                  id: entry.packageId,
                  title: entry.title,
                  meta: `${entry.pairs} Paare · Code ${formatTransferCode(entry.code).slice(0, 4)} …`,
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
        <PackageEditor
          title={draft.title}
          languages={VOCABULARY_LANGUAGES}
          left={draft.left}
          right={draft.right}
          rows={draft.rows}
          save={save}
          live={Boolean(live)}
          busy={busy}
          shareDisabled={!canSave(draft)}
          onTitle={(title) => edit({ title })}
          onLeft={(left) => edit({ left })}
          onRight={(right) => edit({ right })}
          onSwap={() =>
            edit({
              left: draft.right,
              right: draft.left,
              rows: swapRows(draft.rows),
            })
          }
          onRows={(rows) => edit({ rows })}
          onImportFile={(file) => void importVocabularyFile(file)}
          onShare={() => void publish()}
          onDelete={draft.id ? () => setConfirmDelete(true) : undefined}
        />
        {confirmDelete ? (
          <div
            className={cx(m.notice, m.noticeBad)}
            role="alertdialog"
            aria-label="Paket löschen"
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
        {live && liveTime && qrValue ? (
          <>
            <TransferResult
              qr={
                <QRCodeSVG
                  value={qrValue}
                  size={184}
                  level="M"
                  marginSize={0}
                  role="img"
                  aria-label="QR-Code für das verschlüsselte Vokabelpaket"
                />
              }
              status={`${liveTime.short} · ${liveTime.until}`}
              code={formatTransferCode(live.code)}
              onBig={() => setBig(true)}
            />
            <TransferBig
              open={big}
              title={live.title}
              code={formatTransferCode(live.code)}
              qr={
                <QRCodeSVG
                  value={qrValue}
                  size={460}
                  level="M"
                  marginSize={0}
                  role="img"
                  aria-label={`QR-Code für ${live.title}, groß`}
                />
              }
              onClose={() => setBig(false)}
            />
          </>
        ) : null}
      </TransferLayout>
    </ManagePage>
  );
}
