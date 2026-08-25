"use client";

import { QRCodeSVG } from "qrcode.react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { buildTeacherVocabularyBundle } from "../../src/domain/teacher-content-transfer";
import {
  publishLearningBundle,
  serializeTransferQrPayload,
  type PublishedContentTransfer,
} from "../../src/integrations/content-transfer/content-transfer-client";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";

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
  const bundleId = useRef<string | null>(null);
  const revision = useRef(0);
  const pairs = useMemo(
    () =>
      source
        .split(/\r?\n/)
        .filter((line) => line.includes(";") || line.includes("\t")).length,
    [source],
  );

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
      </form>

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
