import { animalTokenFromDisplayName } from "../../../../src/domain/learner-profile";
import type { LiveRoomParticipant } from "../../../../src/integrations/laufdiktat/room-api";
import type { ParticipantStatus } from "../../../views/laufdiktat/teacher-dictation-screen";

/** Anzeigename eines anonymen Raumschlüssels: Tier und Nummer. */
export function participantLabel(
  participants: LiveRoomParticipant[],
  key: string | null | undefined,
) {
  const participant = participants.find((item) => item.studentName === key);
  if (participant?.animalToken)
    return participant.animalNumber > 1
      ? `${participant.animalToken} ${participant.animalNumber}`
      : participant.animalToken;
  if (!key) return "Unbekannt";
  return key.startsWith("participant-") ? "Ohne Tier" : key;
}

/**
 * Tier eines Raumschlüssels für die Bildanzeige. Ältere Raumdienste liefern
 * kein eigenes Tierfeld, sondern den Tiernamen als Schlüssel („Fuchs 2“).
 */
export function participantAnimal(
  participants: LiveRoomParticipant[],
  key: string | null | undefined,
) {
  const participant = participants.find((item) => item.studentName === key);
  if (participant?.animalToken) return participant.animalToken;
  return key ? animalTokenFromDisplayName(key) : null;
}

/** Im Raum, übt allein weiter (Raumseite verlassen) oder nicht verbunden. */
export function participantStatus(
  practicingNames: string[],
  connectedNames: string[],
  name: string,
): ParticipantStatus {
  if (practicingNames.includes(name)) return "practice";
  if (connectedNames.includes(name)) return "online";
  return "offline";
}
