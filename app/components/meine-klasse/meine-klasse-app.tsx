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
  const [qrCode, setQrCode] = useState<{ code: string; title: string } | null>(null);

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
    setQrCode({ code: result, title: "Leistungsbrief" });
  }

  async function handleGenerateRanking(membershipId: string) {
    const result = await service!.generateRankingCode(membershipId);
    if (!result) {
      setGenerateError("Konnte keinen Rankingbeitrag erzeugen — bist du in dieser Klasse eingeschrieben?");
      return;
    }
    setGenerateError(null);
    setQrCode({ code: result, title: "Rankingbeitrag" });
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
            <button className="button button--quiet" type="button" onClick={() => handleGenerateRanking(membership.id)}>
              Rankingbeitrag erzeugen
            </button>
          </li>
        ))}
        {memberships.length === 0 && <li className="meine-klasse__empty">Noch in keiner Klasse eingeschrieben.</li>}
      </ul>
      {generateError && <p role="alert" className="meine-klasse__error">{generateError}</p>}

      {scanning && <QrScannerOverlay onResult={handleScanResult} onClose={() => setScanning(false)} />}
      {qrCode && <SubmissionQrOverlay code={qrCode.code} title={qrCode.title} onClose={() => setQrCode(null)} />}
    </div>
  );
}
