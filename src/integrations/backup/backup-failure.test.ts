import * as z from "zod";
import { describe, expect, it } from "vitest";
import { backupFailureMessage } from "./backup-failure";
import { PersonalBackupStorageError } from "./personal-backup-storage";

const LEAD = "Die Sicherung konnte nicht erstellt werden.";

describe("Meldung bei fehlgeschlagener Sicherung", () => {
  it("nennt bei vollem Speicher den Grund und den nächsten Schritt", () => {
    expect(
      backupFailureMessage(
        LEAD,
        new DOMException("voll", "QuotaExceededError"),
      ),
    ).toBe(
      "Die Sicherung konnte nicht erstellt werden. Der Speicher auf diesem Gerät ist voll. Bitte sag deiner Lehrkraft Bescheid.",
    );
    expect(
      backupFailureMessage(
        LEAD,
        new PersonalBackupStorageError("quota-exceeded", "x"),
      ),
    ).toContain("Speicher");
  });

  it("zeigt bei Zod-Fehlern keinen englischen Text, sondern einen Grund", () => {
    const error = z
      .object({ a: z.string() })
      .strict()
      .safeParse({ b: 1 }).error;
    const message = backupFailureMessage(LEAD, error);
    expect(message).toContain("Ein Teil deiner Daten konnte nicht gelesen");
    expect(message).not.toMatch(/unrecognized|expected|invalid/i);
    expect(message).toMatch(/Lehrkraft Bescheid\.$/);
  });

  it("nennt den nächsten Schritt auch ohne bekannten Grund", () => {
    expect(backupFailureMessage(LEAD, new Error("irgendwas"))).toBe(
      "Die Sicherung konnte nicht erstellt werden. Bitte sag deiner Lehrkraft Bescheid.",
    );
    expect(backupFailureMessage(LEAD, "text")).toMatch(/Lehrkraft Bescheid\.$/);
  });

  it("übernimmt die Meldung einer neueren App-Version", () => {
    const message = backupFailureMessage(
      "Die Sicherung konnte nicht geladen werden.",
      new PersonalBackupStorageError(
        "newer-version",
        "Diese Sicherung stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.",
      ),
    );
    expect(message).toBe(
      "Die Sicherung konnte nicht geladen werden. Diese Sicherung stammt aus einer neueren App-Version. Bitte zuerst die App aktualisieren.",
    );
  });
});
