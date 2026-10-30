"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { TeacherDeviceType } from "../../src/domain/teacher-device";
import {
  pinAttemptsLeft,
  pinWaitMs,
  recordWrongPin,
  resetPinAttempts,
} from "../../src/domain/teacher-lock";
import { verifyPin } from "../../src/integrations/crypto/pin";
import {
  clearPinVerifier,
  markUnlocked,
  parsePinAttempts,
  pinAttemptsSnapshot,
  readPinAttempts,
  readPinVerifier,
  savePinAttempts,
  subscribePinVerifier,
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

const serverSnapshot = () => null;

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
  // Falsche Eingaben und Wartezeit liegen lokal (Regel D3-4): Neuladen hebt sie nicht auf.
  const rawAttempts = useSyncExternalStore(
    subscribePinVerifier,
    () => pinAttemptsSnapshot(),
    serverSnapshot,
  );
  const attempts = useMemo(() => parsePinAttempts(rawAttempts), [rawAttempts]);
  const [now, setNow] = useState(Date.now);
  const waitMs = pinWaitMs(attempts, now);

  // Die Restzeit läuft sekundengenau mit und endet mit der Wartezeit.
  useEffect(() => {
    if (attempts.lockedUntil === null) return undefined;
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = window.setInterval(() => {
      refresh();
      if (pinWaitMs(attempts, Date.now()) === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempts]);

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
    // Frisch aus dem Speicher lesen: Ein zweiter Tab darf die Wartezeit nicht umgehen.
    if (pinWaitMs(readPinAttempts(), Date.now()) > 0) {
      setNow(Date.now());
      return;
    }
    setBusy(true);
    setError("");
    const verifier = readPinVerifier();
    const ok = verifier ? await verifyPin(pin, verifier) : false;
    if (ok) {
      savePinAttempts(resetPinAttempts());
      markUnlocked(Date.now());
    } else {
      const next = recordWrongPin(readPinAttempts(), Date.now());
      savePinAttempts(next);
      const left = pinAttemptsLeft(next);
      // Die fünfte falsche Eingabe zeigt die Wartezeit statt dieser Meldung.
      setError(
        next.lockedUntil !== null
          ? ""
          : left <= 2
            ? `Die PIN stimmt nicht. Noch ${left === 1 ? "1 Versuch" : `${left} Versuche`}.`
            : "Die PIN stimmt nicht.",
      );
    }
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
      // Vor dem Hydrieren kennt nur das Gerät den Gerätetyp: Der Server rendert
      // die Seite versteckt, sichtbar wird sie erst, wenn die Pforte entschieden
      // hat. Personendaten liegen ohnehin nur auf dem Gerät.
      return <div hidden>{children}</div>;
    case "choose":
      return <DeviceChooser onChoose={(type) => void choose(type)} />;
    case "board-block":
      return <BoardBlock />;
    case "locked":
      return (
        <PinLockScreen
          busy={busy}
          error={error}
          waitMs={waitMs}
          onSubmit={(pin) => void unlock(pin)}
          onForgot={() => void forgot()}
        />
      );
  }
}
