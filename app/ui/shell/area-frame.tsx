"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { LiveRoomConfig } from "../../../src/integrations/laufdiktat/live-room-client";
import { BackgroundRoomPresence } from "../../components/background-room-presence";
import { SiteFooter } from "../site-footer";
import { areaOf } from "./areas";
import { FullscreenContext } from "./fullscreen";
import { StudentShell } from "./student-shell";
import { TeacherShell } from "./teacher-shell";

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
  const [fullscreen, setFullscreen] = useState(false);
  const area = areaOf(pathname);
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
          hideNav={fullscreen}
          footer={fullscreen ? null : <SiteFooter compact />}
        >
          {children}
        </StudentShell>
      ) : area === "teacher" ? (
        <TeacherShell pathname={pathname}>{children}</TeacherShell>
      ) : (
        children
      )}
    </FullscreenContext.Provider>
  );
}
