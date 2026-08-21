"use client";

import { useMemo, useState } from "react";
import { createTeacherService, type TeacherService } from "../../../src/klasse/klasse-service.ts";
import { createIndexedDbRepositoryFactory } from "../../../src/storage/indexeddb-repository.ts";
import { useIsClient } from "../use-is-client.ts";
import { DashboardApp } from "../laufdiktat/dashboard-app.tsx";
import { TeacherPinGate } from "./teacher-pin-gate.tsx";
import { Klassenbriefkasten } from "./klassenbriefkasten.tsx";

export function LehrerBereich() {
  const isClient = useIsClient();
  const service = useMemo<TeacherService | null>(() => (isClient ? createTeacherService(createIndexedDbRepositoryFactory()) : null), [isClient]);
  const [unlocked, setUnlocked] = useState(false);

  if (!service) {
    return (
      <div className="lehrer-bereich">
        <p>Lade …</p>
      </div>
    );
  }

  if (!unlocked) {
    return <TeacherPinGate service={service} onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div className="lehrer-bereich">
      <Klassenbriefkasten service={service} />
      <hr className="lehrer-bereich__divider" />
      <DashboardApp />
    </div>
  );
}
