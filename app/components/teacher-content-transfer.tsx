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
import { contentKindOf } from "../../src/domain/teacher-content-summary";
import { createTeacherContentLibraryRepository } from "../../src/storage/teacher-class-settings";
import { Icon } from "../ui/icons";
import { Button, Card, Pill } from "../ui/primitives";

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
  // Die Freigabe an Schüler überträgt nur Vokabelpakete; Texte und Mathe
  // bleiben in der Ablage, werden hier aber nicht angeboten.
  const vocabularyPackages = useMemo(
    () => packages.filter((entry) => contentKindOf(entry) === "vocabulary"),
    [packages],
  );
  const importInput = useRef<HTMLInputElement>(null);
  const sourceInput = useRef<HTMLTextAreaElement>(null);
  const sourceFileInput = useRef<HTMLInputElement>(null);
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
      // Klassenzuordnung und letzte Nutzung gehen beim Speichern nicht verloren.
      ...(existing?.classIds ? { classIds: existing.classIds } : {}),
      ...(existing?.lastUsedAt ? { lastUsedAt: existing.lastUsedAt } : {}),
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
      window.dispatchEvent(new Event("teacher-data-changed"));
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
    window.dispatchEvent(new Event("teacher-data-changed"));
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
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setError(
        "Die Datei ist keine gültige Lernraum-Lehrkraftbibliothek der Version 1.",
      );
    }
  }

  async function importVocabularyFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setLibraryNotice("");
    const importedSource = await file.text();
    setSource(importedSource);
    setPublished(null);
    const importedPairs = importedSource
      .split(/\r?\n/)
      .filter((line) => line.includes(";") || line.includes("\t")).length;
    if (importedPairs === 0) {
      setError(
        "Die Datei enthält noch keine erkennbaren Vokabelpaare. Trenne Vorder- und Rückseite mit Semikolon oder Tab.",
      );
      requestAnimationFrame(() => sourceInput.current?.focus());
      return;
    }
    setLibraryNotice(
      `${importedPairs} Vokabelpaare aus „${file.name}“ wurden übernommen.`,
    );
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
      className="ui-stack ui-transfer"
      aria-labelledby="teacher-transfer-title"
    >
      <div className="ui-between ui-wrap">
        <div className="ui-stack" style={{ ["--gap" as string]: "4px" }}>
          <p className="ui-eyebrow">Temporäre Inhaltsübertragung</p>
          <h1 id="teacher-transfer-title" className="ui-h-page">
            Vokabelpaket freigeben
          </h1>
          <p className="ui-small ui-muted">
            Das Paket wird auf diesem Gerät verschlüsselt und nach spätestens 24
            Stunden automatisch gelöscht.
          </p>
        </div>
        <Pill>{pairs} Vokabelpaare</Pill>
      </div>

      <div className="ui-cols ui-cols--wide-left">
        <form
          className="ui-card ui-card--pop ui-card--pad ui-stack"
          aria-label="Vokabelpaket"
          onSubmit={publish}
        >
          <label className="ui-labeled">
            Titel des Pakets
            <input
              className="ui-input"
              value={title}
              maxLength={300}
              onChange={(event) => {
                setTitle(event.target.value);
                setPublished(null);
              }}
            />
          </label>
          <label className="ui-labeled" htmlFor="teacher-vocabulary-source">
            Vokabelpaare
            <span className="ui-tiny ui-muted">
              Eine Zeile pro Paar, getrennt mit Semikolon oder Tab.
            </span>
          </label>
          <textarea
            id="teacher-vocabulary-source"
            className="ui-textarea"
            rows={9}
            ref={sourceInput}
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPublished(null);
            }}
          />
          <div
            className="ui-row ui-wrap"
            role="group"
            aria-label="Vokabelerfassung"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sourceInput.current?.focus()}
            >
              Vokabeln eingeben
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sourceFileInput.current?.click()}
            >
              <Icon name="upload" size={16} />
              Datei importieren
            </Button>
            <input
              ref={sourceFileInput}
              hidden
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              aria-label="Datei mit Vokabelpaaren auswählen"
              onChange={(event) => void importVocabularyFile(event)}
            />
          </div>
          <div className="ui-row ui-wrap" aria-label="Paketaktionen">
            <Button
              type="submit"
              disabled={busy || !title.trim() || pairs === 0}
            >
              {busy ? "Wird verschlüsselt …" : "Für Schüler freigeben"}
            </Button>
            <Button
              variant="soft"
              disabled={!title.trim() || pairs === 0}
              onClick={() => void saveToLibrary()}
            >
              Lokal speichern
            </Button>
          </div>
        </form>

        <Card
          look="soft"
          className="ui-stack"
          aria-labelledby="teacher-library-title"
        >
          <div>
            <p className="ui-eyebrow">Nur auf diesem Gerät</p>
            <h2 id="teacher-library-title" className="ui-h-section">
              Lehrkraftbibliothek
            </h2>
            <p className="ui-small ui-muted">
              Pakete lokal vorbereiten, später erneut öffnen oder als geprüfte
              Datei sichern und wiederherstellen.
            </p>
          </div>
          <label className="ui-labeled">
            Gespeichertes Paket
            <select
              className="ui-input"
              value={selectedPackageId}
              onChange={(event) => setSelectedPackageId(event.target.value)}
            >
              <option value="">
                {vocabularyPackages.length
                  ? "Paket auswählen"
                  : "Noch keine Pakete"}
              </option>
              {vocabularyPackages.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title} · Stand {entry.revision}
                </option>
              ))}
            </select>
          </label>
          <div className="ui-grid3">
            <Button
              variant="soft"
              size="sm"
              disabled={!selectedPackageId}
              onClick={() => {
                const entry = vocabularyPackages.find(
                  ({ id }) => id === selectedPackageId,
                );
                if (entry) loadPackage(entry);
              }}
            >
              Öffnen
            </Button>
            <Button variant="soft" size="sm" onClick={startNewPackage}>
              Neu
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!selectedPackageId}
              onClick={() => void removeSelectedPackage()}
            >
              Löschen
            </Button>
          </div>
          <div className="ui-grid2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!packages.length}
              onClick={exportLibrary}
            >
              Bibliothek exportieren
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => importInput.current?.click()}
            >
              Bibliothek importieren
            </Button>
            <input
              ref={importInput}
              hidden
              type="file"
              accept="application/json,.json"
              aria-label="Datei mit Lehrkraftbibliothek auswählen"
              onChange={(event) => void importLibrary(event)}
            />
          </div>
        </Card>
      </div>

      {libraryNotice ? (
        <p className="ui-notice" role="status">
          {libraryNotice}
        </p>
      ) : null}

      {error ? (
        <p className="ui-notice ui-notice--bad" role="alert">
          {error}
        </p>
      ) : null}

      {published ? (
        <section
          className="ui-card ui-card--dark ui-card--pad ui-on-dark ui-transfer__result"
          aria-labelledby="transfer-result-title"
          aria-live="polite"
        >
          <div className="ui-stack ui-center">
            <p className="ui-eyebrow">Bereit zum Übernehmen</p>
            <h2 id="transfer-result-title" className="ui-h-section">
              QR-Code scannen
            </h2>
            <div className="ui-qr-box">
              <QRCodeSVG
                value={serializeTransferQrPayload(published.qrPayload)}
                size={220}
                level="H"
                marginSize={2}
                aria-label="QR-Code für das verschlüsselte Vokabelpaket"
              />
            </div>
          </div>
          <div className="ui-stack ui-center">
            <span className="ui-small ui-muted">
              oder sicheren Transfercode eingeben
            </span>
            <strong className="ui-transfer__code">
              {formatTransferCode(published.manualTransferCode)}
            </strong>
            <span className="ui-tiny ui-muted">
              Gültig bis {new Date(published.expiresAt).toLocaleString("de-DE")}
            </span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
