"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createStudentClassService, type ClassMembershipV1, type StudentClassService } from "../../../src/klasse/klasse-service.ts";
import { createIndexedDbRepositoryFactory } from "../../../src/storage/indexeddb-repository.ts";
import { useIsClient } from "../use-is-client.ts";
import { QrScannerOverlay } from "../laufdiktat/qr-scanner-overlay.tsx";
import { SubmissionQrOverlay } from "./submission-qr-overlay.tsx";

export function MeineKlasseApp() {
  const isClient = useIsClient();
  const service = useMemo<StudentClassService | null>(
    () => (isClient ? createStudentClassService(createIndexedDbRepositoryFactory()) : null),
    [isClient],
  );

  const [memberships, setMemberships] = useState<ClassMembershipV1[]>([]);
  const [scanning, setScanning] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [turnusCodeByMembership, setTurnusCodeByMembership] = useState<Record<string, string>>({});
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [submissionCode, setSubmissionCode] = useState<string | null>(null);

  const refresh = useCallback((svc: StudentClassService) => {
    svc.listMemberships().then(setMemberships);
  }, []);

  useEffect(() => {
    if (service) refresh(service);
  }, [service, refresh]);

  if (!service) {
    return (
      <div className="meine-klasse">
        <p>Lade …</p>
      </div>
    );
  }

  async function handleScanResult(text: string) {
    setScanning(false);
    const membership = await service!.enroll(text);
    if (!membership) {
      setEnrollError("Dieser Code konnte nicht gelesen werden.");
      return;
    }
    setEnrollError(null);
    refresh(service!);
  }

  async function handleGenerate(event: FormEvent, membershipId: string) {
    event.preventDefault();
    const code = (turnusCodeByMembership[membershipId] ?? "").trim().toUpperCase();
    if (!code) return;
    const result = await service!.generateSubmissionCode(membershipId, code);
    if (!result) {
      setGenerateError("Konnte keinen Leistungsbrief erzeugen — bist du in dieser Klasse eingeschrieben?");
      return;
    }
    setGenerateError(null);
    setSubmissionCode(result);
  }

  return (
    <div className="meine-klasse">
      <button className="button button--primary" type="button" onClick={() => setScanning(true)}>
        Einschreibungscode scannen
      </button>
      {enrollError && <p role="alert" className="meine-klasse__error">{enrollError}</p>}

      <ul className="meine-klasse__list">
        {memberships.map((membership) => (
          <li key={membership.id} className="meine-klasse__membership">
            <div className="meine-klasse__membership-info">
              <strong>{membership.className}</strong>
              <span>{membership.alias}</span>
            </div>
            <form className="meine-klasse__turnus-form" onSubmit={(e) => handleGenerate(e, membership.id)}>
              <input
                value={turnusCodeByMembership[membership.id] ?? ""}
                onChange={(e) => setTurnusCodeByMembership((prev) => ({ ...prev, [membership.id]: e.target.value }))}
                placeholder="Turnus-Code"
                maxLength={6}
                required
              />
              <button className="button button--secondary" type="submit">Leistungsbrief erzeugen</button>
            </form>
          </li>
        ))}
        {memberships.length === 0 && <li className="meine-klasse__empty">Noch in keiner Klasse eingeschrieben.</li>}
      </ul>
      {generateError && <p role="alert" className="meine-klasse__error">{generateError}</p>}

      {scanning && <QrScannerOverlay onResult={handleScanResult} onClose={() => setScanning(false)} />}
      {submissionCode && <SubmissionQrOverlay code={submissionCode} onClose={() => setSubmissionCode(null)} />}
    </div>
  );
}
