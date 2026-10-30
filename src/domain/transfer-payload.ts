/**
 * Was die verschlüsselte Inhaltsübertragung trägt: ein Vokabelpaket
 * (`schemaVersion` „1.0.0“) oder eine Lernwortliste („1.1.0“). Wer ein Paket
 * auspackt, prüft hier. Eine unbekannte Version wird mit einem verständlichen
 * Satz abgelehnt, nie halb gelesen.
 */
import {
  LEARNING_BUNDLE_VERSION,
  parseLearningBundleV1,
  type LearningBundleV1,
} from "./learning-bundle";
import {
  parseWordListPackage,
  WORD_LIST_PACKAGE_VERSION,
  type WordListPackageV1,
} from "./word-list-package";

export type TransferPayload = LearningBundleV1 | WordListPackageV1;

/** Verständliche Ablehnung; die Meldung ist für Kinder und Lehrkräfte gedacht. */
export class TransferPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransferPayloadError";
  }
}

export const UNKNOWN_VERSION_MESSAGE =
  "Dieses Paket ist neuer als deine App. Lade die Seite neu oder aktualisiere die App.";
export const DAMAGED_PAYLOAD_MESSAGE =
  "Das Paket ist beschädigt oder zu groß. Bitte deine Lehrkraft, es neu freizugeben.";

export const isWordListPackage = (
  payload: TransferPayload,
): payload is WordListPackageV1 =>
  payload.schemaVersion === WORD_LIST_PACKAGE_VERSION;

/** Versionen, die diese App auspacken kann (auch für die Spalte `schema_version`). */
export const SUPPORTED_TRANSFER_VERSIONS: readonly string[] = [
  LEARNING_BUNDLE_VERSION,
  WORD_LIST_PACKAGE_VERSION,
];

export function parseTransferPayload(value: unknown): TransferPayload {
  const version =
    typeof value === "object" && value !== null && "schemaVersion" in value
      ? value.schemaVersion
      : undefined;
  if (!SUPPORTED_TRANSFER_VERSIONS.includes(version as string)) {
    throw new TransferPayloadError(UNKNOWN_VERSION_MESSAGE);
  }
  try {
    return version === WORD_LIST_PACKAGE_VERSION
      ? parseWordListPackage(value)
      : parseLearningBundleV1(value);
  } catch {
    throw new TransferPayloadError(DAMAGED_PAYLOAD_MESSAGE);
  }
}
