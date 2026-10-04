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
import { QrCodeScanner } from "../ui/qr-scanner";
import { Icon } from "../ui/icons";
import { Button, ButtonLink } from "../ui/primitives";

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
  onImported,
}: {
  transferConfig: LiveRoomConfig | null;
  onImported?: () => void;
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
    onImported?.();
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
    <form
      className="ui-card ui-card--pop ui-card--pad ui-stack"
      aria-labelledby="student-transfer-title"
      onSubmit={retrieveByCode}
    >
      <div>
        <p className="ui-eyebrow">Von deiner Lehrkraft</p>
        <h2 id="student-transfer-title" className="ui-h-section">
          Vokabelpaket übernehmen
        </h2>
        <p className="ui-small ui-muted">
          Scanne den Paket-QR-Code oder gib den sicheren Transfercode ein. Das
          Paket wird nur auf diesem Gerät entschlüsselt.
        </p>
      </div>
      <label className="ui-labeled" htmlFor="student-transfer-code">
        Transfercode
      </label>
      <div className="ui-row">
        <input
          id="student-transfer-code"
          className="ui-input ui-grow"
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
      </div>
      <Button type="submit" variant="green" disabled={busy}>
        {busy ? "Übernimmt …" : "Übernehmen"}
      </Button>
      {error ? (
        <p className="ui-notice ui-notice--bad" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <div className="ui-notice ui-notice--good ui-stack" role="status">
          <strong>{success.title} wurde übernommen.</strong>
          <span className="ui-small">
            {success.added} neu · {success.reused} bereits vorhanden
          </span>
          <ButtonLink href="/lernbox" variant="ghost" size="sm">
            In der LernBox öffnen <Icon name="arrow" size={16} />
          </ButtonLink>
        </div>
      ) : null}
    </form>
  );
}
