"use client";

import { useState, type ReactNode } from "react";
import type { TeacherDeviceType } from "../../src/domain/teacher-device";
import { verifyPin } from "../../src/integrations/crypto/pin";
import {
  clearPinVerifier,
  markUnlocked,
  readPinVerifier,
} from "../../src/storage/teacher-lock";
import type { TeacherAccess } from "../ui/shell/use-teacher-access";
import {
  BoardBlock,
  DeviceChooser,
  PersonalDataOfferPage,
  PinLockScreen,
  type PersonalDataSummary,
} from "../views/lehrer/device-screens";
import {
  applyDeviceType,
  deletePersonalDataOnDevice,
} from "./teacher-device-actions";

/**
 * Pforte des Lehrerbereichs (Befund B-009, Regeln D3-1, D3-2, D3-4): zeigt statt
 * der Seite die Wahl des Gerätetyps, den Sperrblock der Tafel oder die
 * PIN-Abfrage. Was gerade gilt, entscheidet `useTeacherAccess`; hier hängen nur
 * Speicher und Aktionen an den Ansichten.
 */
export function TeacherDeviceGate({
  access,
  children,
}: {
  access: TeacherAccess;
  children: ReactNode;
}) {
  const [offer, setOffer] = useState<PersonalDataSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(type: TeacherDeviceType) {
    const result = await applyDeviceType(type);
    setOffer(result.offer);
  }

  async function deleteData() {
    setBusy(true);
    setError("");
    try {
      await deletePersonalDataOnDevice();
      setOffer(null);
    } catch {
      setError("Die Personendaten konnten nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  async function unlock(pin: string) {
    setBusy(true);
    setError("");
    const verifier = readPinVerifier();
    const ok = verifier ? await verifyPin(pin, verifier) : false;
    if (ok) markUnlocked(Date.now());
    else setError("Die PIN stimmt nicht.");
    setBusy(false);
  }

  /** „PIN vergessen“: Personendaten löschen, dann die Sperre aufheben. */
  async function forgot() {
    setBusy(true);
    setError("");
    try {
      await deletePersonalDataOnDevice();
      clearPinVerifier();
    } catch {
      setError("Die Personendaten konnten nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  if (offer && access.device === "board") {
    return (
      <PersonalDataOfferPage
        data={offer}
        busy={busy}
        error={error}
        onDelete={() => void deleteData()}
        onKeep={() => setOffer(null)}
      />
    );
  }
  switch (access.phase) {
    case "open":
      return <>{children}</>;
    case "loading":
      return null;
    case "choose":
      return <DeviceChooser onChoose={(type) => void choose(type)} />;
    case "board-block":
      return <BoardBlock />;
    case "locked":
      return (
        <PinLockScreen
          busy={busy}
          error={error}
          onSubmit={(pin) => void unlock(pin)}
          onForgot={() => void forgot()}
        />
      );
  }
}
