"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  parseTransferQrPayload,
  retrieveLearningBundleByCode,
  retrieveLearningBundleByQr,
} from "../../src/integrations/content-transfer/content-transfer-client";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import { createLearningBoxRepository } from "../../src/storage/personal-learning-events";
import { QrCodeScanner } from "./qr-code-scanner";

function normalizeTransferCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 24);
}

function displayTransferCode(value: string) {
  return value.match(/.{1,4}/g)?.join(" ") ?? value;
}

export function StudentContentTransfer({
  transferConfig,
}: {
  transferConfig: LiveRoomConfig | null;
}) {
  const repository = useMemo(() => createLearningBoxRepository(), []);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    title: string;
    added: number;
    reused: number;
  }>();

  async function ingest(
    bundle: Awaited<ReturnType<typeof retrieveLearningBundleByCode>>,
  ) {
    const title = bundle.stacks[0]?.title ?? "Von der Lehrkraft";
    const result = await repository.ingestBundle({
      bundle,
      title,
      source: { kind: "teacher", sourceId: bundle.id },
    });
    setSuccess({ title, added: result.added, reused: result.reused });
    setCode("");
  }

  async function retrieveByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(undefined);
    if (!transferConfig) {
      setError("Die Inhaltsübertragung ist noch nicht konfiguriert.");
      return;
    }
    if (code.length !== 24) {
      setError("Bitte gib den vollständigen 24-stelligen Transfercode ein.");
      return;
    }
    setBusy(true);
    try {
      await ingest(
        await retrieveLearningBundleByCode(
          getLiveRoomClient(transferConfig),
          code,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Das Paket konnte nicht übernommen werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function retrieveByQr(value: string) {
    setError("");
    setSuccess(undefined);
    if (!transferConfig) {
      setError("Die Inhaltsübertragung ist noch nicht konfiguriert.");
      return;
    }
    setBusy(true);
    try {
      await ingest(
        await retrieveLearningBundleByQr(
          getLiveRoomClient(transferConfig),
          parseTransferQrPayload(value),
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Der QR-Code konnte nicht gelesen werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="student-transfer"
      aria-labelledby="student-transfer-title"
    >
      <div>
        <p className="eyebrow">Von deiner Lehrkraft</p>
        <h3 id="student-transfer-title">Vokabelpaket übernehmen</h3>
        <p>
          Scanne den Paket-QR-Code oder gib den sicheren Transfercode ein. Das
          Paket wird nur auf diesem Gerät entschlüsselt.
        </p>
      </div>
      <form onSubmit={retrieveByCode}>
        <label htmlFor="student-transfer-code">Transfercode</label>
        <div className="student-transfer__controls">
          <input
            id="student-transfer-code"
            value={displayTransferCode(code)}
            autoComplete="off"
            inputMode="text"
            placeholder="XXXX XXXX XXXX XXXX XXXX XXXX"
            aria-invalid={Boolean(error)}
            onChange={(event) =>
              setCode(normalizeTransferCode(event.target.value))
            }
          />
          <QrCodeScanner onResult={(value) => void retrieveByQr(value)} />
          <button className="button button--secondary" disabled={busy}>
            {busy ? "Übernimmt …" : "Übernehmen"}
          </button>
        </div>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {success ? (
        <div className="student-transfer__success" role="status">
          <strong>{success.title} wurde übernommen.</strong>
          <span>
            {success.added} neu · {success.reused} bereits vorhanden
          </span>
          <a href="/lernbox">In der LernBox öffnen →</a>
        </div>
      ) : null}
    </section>
  );
}
