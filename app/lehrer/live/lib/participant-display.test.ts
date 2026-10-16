import { describe, expect, it } from "vitest";
import type { LiveRoomParticipant } from "../../../../src/integrations/laufdiktat/room-api";
import {
  participantAnimal,
  participantLabel,
  participantStatus,
} from "./participant-display";

const participants = [
  {
    studentName: "p1",
    animalToken: "Fuchs",
    animalNumber: 1,
    lastSeenAt: null,
  },
  {
    studentName: "p2",
    animalToken: "Fuchs",
    animalNumber: 2,
    lastSeenAt: null,
  },
  { studentName: "p3", animalToken: null, animalNumber: 0, lastSeenAt: null },
] as LiveRoomParticipant[];

describe("Teilnehmeranzeige", () => {
  it("beschriftet mit Tier und ab 2 mit Nummer", () => {
    expect(participantLabel(participants, "p1")).toBe("Fuchs");
    expect(participantLabel(participants, "p2")).toBe("Fuchs 2");
  });

  it("fällt ohne Tier auf Name, „Ohne Tier“ oder „Unbekannt“ zurück", () => {
    expect(participantLabel(participants, "Mia")).toBe("Mia");
    expect(participantLabel(participants, "participant-1")).toBe("Ohne Tier");
    expect(participantLabel(participants, "p3")).toBe("p3");
    expect(participantLabel(participants, null)).toBe("Unbekannt");
    expect(participantLabel(participants, undefined)).toBe("Unbekannt");
  });

  it("liefert das Tier aus dem Feld oder aus dem Anzeigenamen", () => {
    expect(participantAnimal(participants, "p1")).toBe("Fuchs");
    expect(participantAnimal(participants, "Fuchs 2")).toBe("Fuchs");
    expect(participantAnimal(participants, "Mia")).toBeNull();
    expect(participantAnimal(participants, null)).toBeNull();
  });

  it("gibt dem Alleinüben Vorrang vor „online“", () => {
    expect(participantStatus(["a"], ["a", "b"], "a")).toBe("practice");
    expect(participantStatus(["a"], ["a", "b"], "b")).toBe("online");
    expect(participantStatus(["a"], ["a", "b"], "c")).toBe("offline");
  });
});
