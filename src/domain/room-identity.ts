import * as z from "zod";
import { animalTokenSchema, type AnimalToken } from "./learner-profile";

export const roomCodeSchema = z.string().regex(/^\d{4}$/);
export const roomReentryTokenSchema = z.string().regex(/^[0-9a-f]{48}$/);
export const roomAnimalTokenSchema = animalTokenSchema.nullable();

export type RoomAnimalToken = z.infer<typeof roomAnimalTokenSchema>;

export const roomJoinPayloadSchema = z
  .object({
    animalToken: roomAnimalTokenSchema,
    reentryToken: roomReentryTokenSchema,
  })
  .strict();

export type RoomJoinPayload = z.infer<typeof roomJoinPayloadSchema>;

export function createRoomReentryToken(
  randomValues: (bytes: Uint8Array) => Uint8Array = (bytes) =>
    globalThis.crypto.getRandomValues(bytes),
) {
  const bytes = randomValues(new Uint8Array(24));
  if (bytes.length !== 24) {
    throw new Error("Die Raumkennung konnte nicht sicher erzeugt werden.");
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function createRoomJoinPayload(
  animalToken: AnimalToken | null,
  reentryToken = createRoomReentryToken(),
): RoomJoinPayload {
  return roomJoinPayloadSchema.parse({ animalToken, reentryToken });
}

export function roomIdentityStorageKey(code: string) {
  return `lernraum-live-room-identity:${roomCodeSchema.parse(code)}`;
}
