"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { LiveRoomConfig } from "../../../src/integrations/laufdiktat/live-room-client";
import { BackgroundRoomPresence } from "../../components/background-room-presence";
import { ButtonLink } from "../primitives";
import { SiteFooter } from "../site-footer";
import { useGuestMode } from "../use-guest-mode";
import { areaOf } from "./areas";
import { FullscreenContext, type FullscreenMode } from "./fullscreen";
import { StudentShell } from "./student-shell";
import { TeacherShell } from "./teacher-shell";

/** Auf einem Gastgerät bleiben die Lehrerseiten zu (Gastmodus, G-6). */
function GuestTeacherBlock() {
  return (
    <main className="ui ui-page ui-guest-page">
      <div className="ui-card ui-card--pop ui-card--pad ui-stack">
        <h1 className="ui-h-page">Im Gastmodus nicht verfügbar</h1>
        <p className="ui-small">
          Der Lehrerbereich ist auf einem Gastgerät gesperrt.
        </p>
        <ButtonLink href="/lernen">Zum Lernraum</ButtonLink>
      </div>
    </main>
  );
}

/**
 * Rahmen für Schüler- und Lehrerbereich. Er sitzt im Root-Layout und bleibt
 * beim Seitenwechsel stehen; nur der Inhalt wechselt. So wird die
 * Seitenleiste nicht bei jedem Klick neu aufgebaut.
 */
export function AreaFrame({
  liveRoomConfig = null,
  children,
}: {
  liveRoomConfig?: LiveRoomConfig | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [fullscreen, setFullscreen] = useState<FullscreenMode>(false);
  const area = areaOf(pathname);
  const guest = useGuestMode();
  return (
    <FullscreenContext.Provider value={setFullscreen}>
      {area === "student" ? (
        <BackgroundRoomPresence
          liveRoomConfig={liveRoomConfig}
          enabled={!pathname.startsWith("/raum")}
        />
      ) : null}
      {area === "student" ? (
        <StudentShell
          activePath={pathname}
          hideNav={fullscreen === "all" ? true : fullscreen}
          footer={fullscreen === "all" ? null : <SiteFooter compact />}
        >
          {children}
        </StudentShell>
      ) : area === "teacher" ? (
        guest ? (
          <GuestTeacherBlock />
        ) : (
          <TeacherShell pathname={pathname}>{children}</TeacherShell>
        )
      ) : (
        children
      )}
    </FullscreenContext.Provider>
  );
}
