"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { TeacherDeviceType } from "../../src/domain/teacher-device";
import {
  clearPinVerifier,
  parsePinVerifier,
  pinVerifierSnapshot,
  subscribePinVerifier,
} from "../../src/storage/teacher-lock";
import { useAreaVisible } from "../release/release-context";
import { useTeacherDevice } from "../ui/use-teacher-device";
import { SettingsGroup } from "../views/lehrer/settings-screen";
import {
  DeviceSettingsCard,
  type PersonalDataSummary,
} from "../views/lehrer/device-screens";
import {
  applyDeviceType,
  deletePersonalDataOnDevice,
  savePin,
} from "./teacher-device-actions";

const serverSnapshot = () => null;

/**
 * Gruppe „Dieses Gerät“ der Lehrer-Einstellungen: Gerätetyp ändern (D3-1) und
 * PIN-Sperre einrichten (D3-4). Nur sichtbar, solange der Bereich
 * `lehrer-geraet` freigegeben ist.
 */
export function TeacherDeviceSettings() {
  const visible = useAreaVisible("lehrer-geraet");
  const device = useTeacherDevice();
  const rawPin = useSyncExternalStore(
    subscribePinVerifier,
    () => pinVerifierSnapshot(),
    serverSnapshot,
  );
  const pinSet = useMemo(() => parsePinVerifier(rawPin) !== null, [rawPin]);
  const [offer, setOffer] = useState<PersonalDataSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  if (!visible) return null;

  async function change(type: TeacherDeviceType) {
    if (type === device?.type) return;
    const result = await applyDeviceType(type);
    setOffer(result.offer);
    setError("");
    setMessage(
      type === "board"
        ? "Dieses Gerät ist jetzt eine Tafel. Die PIN-Sperre ist aufgehoben."
        : "Dieses Gerät ist jetzt dein eigenes Gerät.",
    );
  }

  async function deleteData() {
    setBusy(true);
    setError("");
    try {
      await deletePersonalDataOnDevice();
      setOffer(null);
      setMessage("Die Personendaten wurden von diesem Gerät gelöscht.");
    } catch {
      setError("Die Personendaten konnten nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsGroup
      id="geraet"
      title="Dieses Gerät"
      hint="Eigenes Gerät oder Tafel, dazu eine PIN-Sperre für Klassen und Schüler."
    >
      <DeviceSettingsCard
        device={device?.type ?? null}
        pinSet={pinSet}
        offer={offer}
        offerBusy={busy}
        offerError={error}
        message={message}
        onChangeDevice={(type) => void change(type)}
        onDeleteData={() => void deleteData()}
        onKeepData={() => setOffer(null)}
        onSavePin={async (pin) => {
          const failure = await savePin(pin);
          if (!failure) setMessage("Die PIN-Sperre ist eingerichtet.");
          return failure;
        }}
        onRemovePin={() => {
          clearPinVerifier();
          setMessage("Die PIN-Sperre ist ausgeschaltet.");
        }}
      />
    </SettingsGroup>
  );
}
