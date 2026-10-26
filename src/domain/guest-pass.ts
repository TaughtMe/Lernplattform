import * as z from "zod";
import {
  base64UrlSchema,
  classSealFingerprint,
  signWithClassSeal,
  verifyWithClassSeal,
  type ClassSeal,
} from "./class-seal";

/**
 * Gast-Pass für geteilte Geräte (Befunde B-009, B-010): Die Lehrkraft zeigt
 * einen QR-Code, das Gerät wird für diese Unterrichtsnutzung zum Gastgerät und
 * löscht die Schülerdaten danach. Der Pass trägt eine ECDSA-Signatur des
 * Klassenstempels (siehe `class-seal.ts`), kanonisch serialisiert wie die
 * Freigabe zur Schreiberleichterung.
 *
 * Grenze: Das Gerät prüft Signatur und Zeitfenster. Kennt es die Klasse nicht
 * (keine Einschreibung auf dem Gerät), belegt die Signatur nur, dass der Pass
 * unverfälscht und nicht abgelaufen ist, nicht, dass er von der echten
 * Lehrkraft stammt: Wer einen eigenen Schlüssel erzeugt, kann einen
 * gültigen Pass ausstellen. Der Schaden bleibt klein, denn ein Gastmodus löscht
 * nur Daten auf dem eigenen Gerät und nimmt nichts von anderen. Kennt das Gerät
 * den Abdruck der Klasse, muss der Schlüssel dazu passen.
 */

/** Ein Pass gilt höchstens 90 Minuten. */
export const GUEST_PASS_MAX_MS = 90 * 60_000;
/** Abweichung der Geräteuhr, die beim Beginn der Gültigkeit toleriert wird. */
export const GUEST_PASS_CLOCK_SKEW_MS = 5 * 60_000;

export const guestPassPayloadSchema = z
  .object({
    v: z.literal(1),
    kind: z.literal("guest"),
    classId: z.string().uuid(),
    issuedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    publicKey: base64UrlSchema,
  })
  .strict();
export type GuestPassPayload = z.infer<typeof guestPassPayloadSchema>;

export const guestPassSchema = z
  .object({
    payload: guestPassPayloadSchema,
    signature: base64UrlSchema,
  })
  .strict();
export type GuestPass = z.infer<typeof guestPassSchema>;

/** Feste Feldreihenfolge, damit die Signatur stabil bleibt. */
export function canonicalGuestPassPayload(payload: GuestPassPayload) {
  return JSON.stringify([
    payload.v,
    payload.kind,
    payload.classId,
    payload.issuedAt,
    payload.expiresAt,
    payload.publicKey,
  ]);
}

/** Stellt einen Pass aus, der ab `now` 90 Minuten gilt. */
export async function createGuestPass(
  seal: ClassSeal,
  classId: string,
  now: Date,
): Promise<GuestPass> {
  const payload = guestPassPayloadSchema.parse({
    v: 1,
    kind: "guest",
    classId,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + GUEST_PASS_MAX_MS).toISOString(),
    publicKey: seal.publicKey,
  });
  return {
    payload,
    signature: await signWithClassSeal(
      seal.privateJwk,
      canonicalGuestPassPayload(payload),
    ),
  };
}

export type GuestPassFailure =
  | "format"
  | "laufzeit"
  | "signatur"
  | "andere-klasse"
  | "zu-frueh"
  | "abgelaufen";

export type GuestPassCheck =
  | { ok: true; classId: string; expiresAt: Date }
  | { ok: false; reason: GuestPassFailure };

/**
 * Prüft einen Pass auf diesem Gerät: Signatur gültig, `now` zwischen
 * `issuedAt − 5 min` und `expiresAt`, Laufzeit höchstens 90 Minuten. Mit
 * `knownFingerprint` (Abdruck des Klassenschlüssels aus einer Einschreibung)
 * muss der Schlüssel des Passes dazu passen.
 */
export async function verifyGuestPass(
  pass: unknown,
  now: Date,
  knownFingerprint?: string,
): Promise<GuestPassCheck> {
  const parsed = guestPassSchema.safeParse(pass);
  if (!parsed.success) return { ok: false, reason: "format" };
  const { payload, signature } = parsed.data;
  const issuedAt = Date.parse(payload.issuedAt);
  const expiresAt = Date.parse(payload.expiresAt);
  if (expiresAt <= issuedAt || expiresAt - issuedAt > GUEST_PASS_MAX_MS) {
    return { ok: false, reason: "laufzeit" };
  }
  const genuine = await verifyWithClassSeal(
    payload.publicKey,
    canonicalGuestPassPayload(payload),
    signature,
  );
  if (!genuine) return { ok: false, reason: "signatur" };
  if (knownFingerprint !== undefined) {
    const fingerprint = await classSealFingerprint(payload.publicKey).catch(
      () => "",
    );
    if (fingerprint !== knownFingerprint) {
      return { ok: false, reason: "andere-klasse" };
    }
  }
  const time = now.getTime();
  if (time < issuedAt - GUEST_PASS_CLOCK_SKEW_MS) {
    return { ok: false, reason: "zu-frueh" };
  }
  if (time > expiresAt) return { ok: false, reason: "abgelaufen" };
  return {
    ok: true,
    classId: payload.classId,
    expiresAt: new Date(expiresAt),
  };
}

/** Verständliche Meldung für ein Kind; mit dem Pass passiert dann nichts. */
export function guestPassMessage(reason: GuestPassFailure) {
  switch (reason) {
    case "abgelaufen":
      return "Der Gast-Code ist abgelaufen. Bitte frage deine Lehrkraft nach einem neuen.";
    case "zu-frueh":
      return "Die Uhr dieses Geräts geht falsch. Bitte stelle Datum und Uhrzeit richtig ein.";
    case "andere-klasse":
      return "Dieser Gast-Code gehört nicht zur Klasse auf diesem Gerät.";
    case "format":
      return "Der Gast-Code ist unvollständig. Bitte scanne ihn noch einmal.";
    default:
      return "Dieser Gast-Code ist nicht gültig. Bitte frage deine Lehrkraft nach einem neuen.";
  }
}

export const GUEST_PASS_PATH = "/gast";
const GUEST_PASS_FRAGMENT_KEY = "code";
const CODE_VERSION = "g1";

/**
 * Kurzform für den QR-Code: `g1.<classId>.<ausgestellt>.<bis>.<Schlüssel>.<Signatur>`
 * mit Zeiten als Millisekunden in Basis 36. Alle Teile sind URL-sicher; das hält
 * den QR-Code klein.
 */
export function createGuestPassCode(pass: GuestPass) {
  const { payload, signature } = guestPassSchema.parse(pass);
  return [
    CODE_VERSION,
    payload.classId,
    Date.parse(payload.issuedAt).toString(36),
    Date.parse(payload.expiresAt).toString(36),
    payload.publicKey,
    signature,
  ].join(".");
}

export function parseGuestPassCode(value: string): GuestPass {
  const [version, classId, issued, expires, publicKey, signature, ...rest] =
    value.trim().split(".");
  if (version !== CODE_VERSION || rest.length > 0 || !signature) {
    throw new Error("Kein gültiger Gast-Code.");
  }
  const toIso = (base36: string | undefined) => {
    if (!base36 || !/^[0-9a-z]{1,12}$/.test(base36)) {
      throw new Error("Kein gültiger Gast-Code.");
    }
    return new Date(Number.parseInt(base36, 36)).toISOString();
  };
  return guestPassSchema.parse({
    payload: {
      v: 1,
      kind: "guest",
      classId,
      issuedAt: toIso(issued),
      expiresAt: toIso(expires),
      publicKey,
    },
    signature,
  });
}

export function createGuestPassLink(origin: string, pass: GuestPass) {
  const url = new URL(GUEST_PASS_PATH, origin);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Der Gast-Code benötigt eine Lernraum-Webadresse.");
  }
  url.search = "";
  // Im Fragment, damit der Code nie an den Server geht.
  url.hash = `${GUEST_PASS_FRAGMENT_KEY}=${createGuestPassCode(pass)}`;
  return url.toString();
}

/** Liest den Pass aus einem Link oder aus dem Fragment (`#code=…`). */
export function parseGuestPassLink(value: string): GuestPass {
  const hash = value.includes("#")
    ? value.slice(value.indexOf("#") + 1)
    : value.replace(/^#/, "");
  const code = new URLSearchParams(hash).get(GUEST_PASS_FRAGMENT_KEY);
  if (!code) throw new Error("Der Link enthält keinen Gast-Code.");
  return parseGuestPassCode(code);
}
