"use client";

import { QRCodeSVG } from "qrcode.react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { buildTeacherVocabularyBundle } from "../../src/domain/teacher-content-transfer";
import {
  createTeacherContentLibraryFile,
  parseTeacherContentLibraryFile,
  type TeacherContentPackage,
} from "../../src/domain/teacher-content-library";
import {
  publishLearningBundle,
  serializeTransferQrPayload,
  type PublishedContentTransfer,
} from "../../src/integrations/content-transfer/content-transfer-client";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import { createTeacherContentLibraryRepository } from "../../src/storage/teacher-class-settings";

const DEFAULT_VOCABULARY =
  "school;Schule\nclassroom;Klassenzimmer\nlibrary;Bibliothek";

function formatTransferCode(value: string) {
  return value.match(/.{1,4}/g)?.join(" ") ?? value;
}

export function TeacherContentTransfer({
  transferConfig,
}: {
  transferConfig: LiveRoomConfig | null;
}) {
  const [title, setTitle] = useState("Englisch · Unterrichtspaket");
  const [source, setSource] = useState(DEFAULT_VOCABULARY);
  const [published, setPublished] = useState<PublishedContentTransfer | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [libraryNotice, setLibraryNotice] = useState("");
  const [packages, setPackages] = useState<TeacherContentPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const bundleId = useRef<string | null>(null);
  const revision = useRef(0);
  const library = useMemo(() => createTeacherContentLibraryRepository(), []);
  const importInput = useRef<HTMLInputElement>(null);
  const pairs = useMemo(
    () =>
      source
        .split(/\r?\n/)
        .filter((line) => line.includes(";") || line.includes("\t")).length,
    [source],
  );

  useEffect(() => {
    void library
      .list()
      .then(setPackages)
      .catch(() => {
        setError(
          "Die lokale Lehrkraftbibliothek konnte nicht geöffnet werden.",
        );
      });
  }, [library]);

  async function refreshLibrary() {
    const stored = await library.list();
    setPackages(stored);
    return stored;
  }

  function currentPackage(existing?: TeacherContentPackage) {
    const now = new Date().toISOString();
    bundleId.current ??= `teacher-package-${crypto.randomUUID()}`;
    return {
      id: bundleId.current,
      revision: revision.current,
      title: title.trim(),
      source,
      promptLocale: existing?.promptLocale ?? "en",
      answerLocale: existing?.answerLocale ?? "de",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } satisfies TeacherContentPackage;
  }

  async function saveToLibrary() {
    setError("");
    setLibraryNotice("");
    try {
      const existing = bundleId.current
        ? await library.get(bundleId.current)
        : undefined;
      const entry = currentPackage(existing);
      await library.put(entry);
      await refreshLibrary();
      setSelectedPackageId(entry.id);
      setLibraryNotice(`„${entry.title}“ wurde lokal gespeichert.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Das Paket konnte nicht lokal gespeichert werden.",
      );
    }
  }

  function loadPackage(entry: TeacherContentPackage) {
    bundleId.current = entry.id;
    revision.current = entry.revision;
    setTitle(entry.title);
    setSource(entry.source);
    setSelectedPackageId(entry.id);
    setPublished(null);
    setError("");
    setLibraryNotice(`„${entry.title}“ ist zur Bearbeitung geöffnet.`);
  }

  function startNewPackage() {
    bundleId.current = null;
    revision.current = 0;
    setTitle("Neues Vokabelpaket");
    setSource("");
    setSelectedPackageId("");
    setPublished(null);
    setError("");
    setLibraryNotice("Neues, noch nicht gespeichertes Paket geöffnet.");
  }

  async function removeSelectedPackage() {
    if (!selectedPackageId) return;
    const selected = packages.find(({ id }) => id === selectedPackageId);
    await library.remove(selectedPackageId);
    const remaining = await refreshLibrary();
    setSelectedPackageId("");
    if (bundleId.current === selectedPackageId) startNewPackage();
    setLibraryNotice(
      selected
        ? `„${selected.title}“ wurde aus der lokalen Bibliothek gelöscht.`
        : `Paket gelöscht. ${remaining.length} Pakete verbleiben.`,
    );
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
    setLibraryNotice(`${packages.length} Pakete wurden als Datei exportiert.`);
  }

  async function importLibrary(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const imported = parseTeacherContentLibraryFile(
        JSON.parse(await file.text()),
      );
      await library.putMany(imported.packages);
      await refreshLibrary();
      setLibraryNotice(
        `${imported.packages.length} Pakete wurden geprüft und lokal übernommen.`,
      );
    } catch {
      setError(
        "Die Datei ist keine gültige Lernraum-Lehrkraftbibliothek der Version 1.",
      );
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!transferConfig) {
      setError("Die Inhaltsübertragung ist noch nicht konfiguriert.");
      return;
    }
    setBusy(true);
    try {
      bundleId.current ??= `teacher-package-${crypto.randomUUID()}`;
      const nextRevision = revision.current + 1;
      const bundle = buildTeacherVocabularyBundle({
        id: bundleId.current,
        revision: nextRevision,
        title,
        source,
      });
      const result = await publishLearningBundle(
        getLiveRoomClient(transferConfig),
        bundle,
      );
      revision.current = nextRevision;
      setPublished(result);
      try {
        await library.put(
          currentPackage(await library.get(bundleId.current as string)),
        );
        await refreshLibrary();
      } catch {
        setLibraryNotice(
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

  return (
    <section
      className="teacher-transfer"
      aria-labelledby="teacher-transfer-title"
    >
      <div className="teacher-transfer__heading">
        <div>
          <p className="eyebrow">Temporäre Inhaltsübertragung</p>
          <h1 id="teacher-transfer-title">Vokabelpaket freigeben</h1>
          <p>
            Das Paket wird auf diesem Gerät verschlüsselt und nach spätestens 24
            Stunden automatisch gelöscht.
          </p>
        </div>
        <span className="teacher-local-note">{pairs} Vokabelpaare</span>
      </div>

      <section
        className="teacher-library"
        aria-labelledby="teacher-library-title"
      >
        <div>
          <p className="eyebrow">Nur auf diesem Gerät</p>
          <h2 id="teacher-library-title">Lehrkraftbibliothek</h2>
          <p>
            Pakete lokal vorbereiten, später erneut öffnen oder als geprüfte
            Datei sichern und wiederherstellen.
          </p>
        </div>
        <div className="teacher-library__controls">
          <label>
            Gespeichertes Paket
            <select
              value={selectedPackageId}
              onChange={(event) => setSelectedPackageId(event.target.value)}
            >
              <option value="">
                {packages.length ? "Paket auswählen" : "Noch keine Pakete"}
              </option>
              {packages.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title} · Stand {entry.revision}
                </option>
              ))}
            </select>
          </label>
          <div className="teacher-library__actions">
            <button
              type="button"
              className="button button--secondary"
              disabled={!selectedPackageId}
              onClick={() => {
                const entry = packages.find(
                  ({ id }) => id === selectedPackageId,
                );
                if (entry) loadPackage(entry);
              }}
            >
              Öffnen
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={startNewPackage}
            >
              Neu
            </button>
            <button
              type="button"
              className="button button--secondary"
              disabled={!selectedPackageId}
              onClick={() => void removeSelectedPackage()}
            >
              Löschen
            </button>
          </div>
          <div className="teacher-library__actions">
            <button
              type="button"
              className="button button--secondary"
              disabled={!packages.length}
              onClick={exportLibrary}
            >
              Bibliothek exportieren
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => importInput.current?.click()}
            >
              Bibliothek importieren
            </button>
            <input
              ref={importInput}
              hidden
              type="file"
              accept="application/json,.json"
              aria-label="Datei mit Lehrkraftbibliothek auswählen"
              onChange={(event) => void importLibrary(event)}
            />
          </div>
        </div>
      </section>

      <form className="teacher-transfer__form" onSubmit={publish}>
        <label>
          Titel des Pakets
          <input
            value={title}
            maxLength={300}
            onChange={(event) => {
              setTitle(event.target.value);
              setPublished(null);
            }}
          />
        </label>
        <label>
          Vokabelpaare – Semikolon oder Tab
          <textarea
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPublished(null);
            }}
          />
        </label>
        <button
          type="submit"
          className="button button--primary"
          disabled={busy || !title.trim() || pairs === 0}
        >
          {busy ? "Wird verschlüsselt …" : "Paket verschlüsselt freigeben"}
        </button>
        <button
          type="button"
          className="button button--secondary"
          disabled={!title.trim() || pairs === 0}
          onClick={() => void saveToLibrary()}
        >
          Lokal speichern
        </button>
      </form>

      {libraryNotice ? <p role="status">{libraryNotice}</p> : null}

      {error ? (
        <p className="teacher-live__error" role="alert">
          {error}
        </p>
      ) : null}

      {published ? (
        <section className="teacher-transfer__result" aria-live="polite">
          <div>
            <p className="eyebrow">Bereit zum Übernehmen</p>
            <h2>QR-Code scannen</h2>
            <QRCodeSVG
              value={serializeTransferQrPayload(published.qrPayload)}
              size={220}
              level="H"
              marginSize={2}
              aria-label="QR-Code für das verschlüsselte Vokabelpaket"
            />
          </div>
          <div className="teacher-transfer__manual-code">
            <span>oder sicheren Transfercode eingeben</span>
            <strong>{formatTransferCode(published.manualTransferCode)}</strong>
            <small>
              Gültig bis {new Date(published.expiresAt).toLocaleString("de-DE")}
            </small>
          </div>
        </section>
      ) : null}
    </section>
  );
}
