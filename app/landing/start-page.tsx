"use client";

import { useEffect, useState } from "react";
import { profileAvatar } from "../../src/domain/learner-profile";
import { extractJoinCode, normalizeJoinCode } from "../../src/domain/join-code";
import { learnerProfileRepository } from "../../src/storage/learner-profile";
import { useHydrated } from "../ui/use-hydrated";
import { InstallButton } from "./install-button";
import { QrCodeScanner } from "../ui/qr-scanner";
import { useGuestMode } from "../ui/use-guest-mode";
import { useLearnerProfile } from "../ui/use-learner-profile";
import { LandingScreen } from "../views/start/landing-screen";

function openRoom(code: string) {
  window.location.assign(`/raum?code=${encodeURIComponent(code)}`);
}

/**
 * Startseite (Design 2a): Das Tier führt in den eigenen Lernraum, der
 * Raumcode öffnet nach der vierten Ziffer das Laufdiktat.
 */
export function StartPage() {
  const hydrated = useHydrated();
  const profile = useLearnerProfile();
  // Auf einem Gastgerät führt kein Weg in den Lehrerbereich.
  const guest = useGuestMode();
  const [code, setCode] = useState("");

  // Beim ersten Besuch wird ein zufälliges Tier gespeichert (Entscheidung 47).
  useEffect(() => {
    if (hydrated && !profile) learnerProfileRepository.ensure();
  }, [hydrated, profile]);

  return (
    <LandingScreen
      animal={profileAvatar(profile)}
      code={code}
      teacherHref={guest ? null : "/lehrer"}
      enterHref="/lernen"
      showLegal
      onCodeChange={(value) => {
        const next = normalizeJoinCode(value).slice(0, 4);
        setCode(next);
        if (/^\d{4}$/.test(next)) openRoom(next);
      }}
      renderInstall={(className) => <InstallButton className={className} />}
      renderScan={(className) => (
        <QrCodeScanner
          buttonClassName={className}
          iconSize={30}
          iconStrokeWidth={1.8}
          onResult={(value) => {
            const scanned = extractJoinCode(value);
            if (scanned) openRoom(scanned);
          }}
        />
      )}
    />
  );
}
