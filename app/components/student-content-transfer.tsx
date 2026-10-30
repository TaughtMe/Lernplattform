"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  isWordListPackage,
  type TransferPayload,
} from "../../src/domain/transfer-payload";
import type { WordListPackageV1 } from "../../src/domain/word-list-package";
import {
  extractTransferCode,
  normalizeTransferCode,
  parseTransferQrPayload,
  retrieveTransferByCode,
  retrieveTransferByQr,
} from "../../src/integrations/content-transfer/content-transfer-client";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import {
  createLearningBoxRepository,
  createWordBoxRepository,
} from "../../src/storage/personal-learning-events";
import { QrCodeScanner } from "../ui/qr-scanner";
import { Icon } from "../ui/icons";
import { Button, ButtonLink } from "../ui/primitives";

function displayTransferCode(value: string) {
  return value.match(/.{1,4}/g)?.join(" ") ?? value;
}

/** Die Übernahme einer Lernwortliste in den Wortspeicher. */
type WordListOutcome = {
  title: string;
  /** Die Wortbox gab es schon (dieselbe Liste wurde früher übernommen). */
  existed: boolean;
  added: number;
};

/**
 * Hier übernimmt das Kind, was die Lehrkraft freigegeben hat: ein Vokabelpaket
 * kommt in die LernBox, eine Lernwortliste nach Bestätigung als Wortbox in den
 * Wortspeicher. Der Link der Lehrkraft (`#code=`) füllt das Feld vor.
 */
export function StudentContentTransfer({
  transferConfig,
  onImported,
}: {
  transferConfig: LiveRoomConfig | null;
  onImported?: () => void;
}) {
  const repository = useMemo(() => createLearningBoxRepository(), []);
  const wordBoxes = useMemo(() => createWordBoxRepository(), []);
  const [code, setCode] = useState("");
  const [list, setList] = useState<WordListPackageV1>();
  const [listOutcome, setListOutcome] = useState<WordListOutcome>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    title: string;
    added: number;
    reused: number;
  }>();

  useEffect(() => {
    // QR-Link der Lehrkraft: #code=<Transfercode> füllt das Feld vor.
    const linked = extractTransferCode(window.location.href);
    if (!linked) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Adresse erst nach dem Laden lesen
    setCode(linked);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }, []);

  async function saveList() {
    if (!list) return;
    setError("");
    try {
      const result = await wordBoxes.importWordList({
        packageId: list.id,
        title: list.title,
        words: list.words,
      });
      setListOutcome({
        title: result.box.title,
        existed: result.existed,
        added: result.added,
      });
      setList(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Die Wörter konnten nicht gespeichert werden.",
      );
    }
  }

  async function ingest(payload: TransferPayload) {
    setCode("");
    if (isWordListPackage(payload)) {
      // Nichts wird gespeichert, bevor das Kind es bestätigt.
      setList(payload);
      return;
    }
    const bundle = payload;
    const title = bundle.stacks[0]?.title ?? "Von der Lehrkraft";
    const result = await repository.ingestBundle({
      bundle,
      title,
      source: { kind: "teacher", sourceId: bundle.id },
    });
    setSuccess({ title, added: result.added, reused: result.reused });
    onImported?.();
  }

  async function retrieveByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(undefined);
    setList(undefined);
    setListOutcome(undefined);
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
        await retrieveTransferByCode(getLiveRoomClient(transferConfig), code),
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

  function retrieveByScan(value: string) {
    // Legacy-QR mit Token-Paket wird direkt abgerufen; sonst füllt der Scan nur das Feld.
    if (value.startsWith("lernraum:transfer:")) return void retrieveByQr(value);
    setSuccess(undefined);
    setList(undefined);
    setListOutcome(undefined);
    const scanned = extractTransferCode(value);
    if (!scanned) {
      setError("Der QR-Code enthält keinen gültigen Transfercode.");
      return;
    }
    setError("");
    setCode(scanned);
  }

  async function retrieveByQr(value: string) {
    setError("");
    setSuccess(undefined);
    setList(undefined);
    setListOutcome(undefined);
    if (!transferConfig) {
      setError("Die Inhaltsübertragung ist noch nicht konfiguriert.");
      return;
    }
    setBusy(true);
    try {
      await ingest(
        await retrieveTransferByQr(
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
          Vokabeln oder Wörter übernehmen
        </h2>
        <p className="ui-small ui-muted">
          Scanne den QR-Code oder gib den Transfercode ein. Vokabeln kommen in
          die LernBox, Lernwörter in den Wortspeicher. Das Paket wird nur auf
          diesem Gerät entschlüsselt.
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
        <QrCodeScanner onResult={retrieveByScan} />
      </div>
      <Button type="submit" variant="green" disabled={busy}>
        {busy ? "Übernimmt …" : "Übernehmen"}
      </Button>
      {error ? (
        <p className="ui-notice ui-notice--bad" role="alert">
          {error}
        </p>
      ) : null}
      {list ? (
        <div
          className="ui-notice ui-stack"
          role="group"
          aria-label="Lernwörter"
        >
          <strong>{list.title}</strong>
          <span className="ui-small">
            {list.words.length === 1 ? "1 Wort" : `${list.words.length} Wörter`}{" "}
            von deiner Lehrkraft:
          </span>
          <p className="ui-small" aria-label="Die Wörter">
            {list.words.join(", ")}
          </p>
          <div className="ui-row">
            <Button
              type="button"
              variant="green"
              onClick={() => void saveList()}
            >
              In eine Wortbox speichern
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setList(undefined)}
            >
              Nicht speichern
            </Button>
          </div>
        </div>
      ) : null}
      {listOutcome ? (
        <div className="ui-notice ui-notice--good ui-stack" role="status">
          <strong>
            {listOutcome.existed && listOutcome.added === 0
              ? "Diese Wörter hast du schon."
              : `Die Wortbox ${listOutcome.title} ist da.`}
          </strong>
          <span className="ui-small">
            {listOutcome.existed
              ? listOutcome.added === 0
                ? `Die Wortbox ${listOutcome.title} gibt es schon. Es kam nichts doppelt dazu.`
                : listOutcome.added === 1
                  ? "1 neues Wort ist dazugekommen."
                  : `${listOutcome.added} neue Wörter sind dazugekommen.`
              : `${listOutcome.added} Wörter sind im Wortspeicher.`}
          </span>
          <ButtonLink href="/frei/german/lernwoerter" variant="ghost" size="sm">
            Im Wortspeicher öffnen <Icon name="arrow" size={16} />
          </ButtonLink>
        </div>
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
