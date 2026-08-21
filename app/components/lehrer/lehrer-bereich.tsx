"use client";

import { useEffect, useMemo, useState } from "react";
import { createTeacherService, type TeacherService } from "../../../src/klasse/klasse-service.ts";
import type { ClassV1 } from "../../../src/klasse/roster.ts";
import { createIndexedDbRepositoryFactory } from "../../../src/storage/indexeddb-repository.ts";
import { useIsClient } from "../use-is-client.ts";
import { DashboardApp } from "../laufdiktat/dashboard-app.tsx";
import { TeacherPinGate } from "./teacher-pin-gate.tsx";
import { Klassenbriefkasten } from "./klassenbriefkasten.tsx";
import { HausPunkte } from "./haus-punkte.tsx";

export function LehrerBereich() {
  const isClient = useIsClient();
  const service = useMemo<TeacherService | null>(() => (isClient ? createTeacherService(createIndexedDbRepositoryFactory()) : null), [isClient]);
  const [unlocked, setUnlocked] = useState(false);
  const [classes, setClasses] = useState<ClassV1[]>([]);

  useEffect(() => {
    if (service) service.listClasses().then(setClasses);
  }, [service]);

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

  async function handleAddClass(name: string): Promise<ClassV1> {
    const klasse = await service!.addClass(name);
    setClasses((prev) => [...prev, klasse]);
    return klasse;
  }

  return (
    <div className="lehrer-bereich">
      <Klassenbriefkasten service={service} classes={classes} onAddClass={handleAddClass} />
      <hr className="lehrer-bereich__divider" />
      <HausPunkte service={service} classes={classes} onAddClass={handleAddClass} />
      <hr className="lehrer-bereich__divider" />
      <DashboardApp />
    </div>
  );
}
