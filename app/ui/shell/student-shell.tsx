"use client";

import { useEffect, useState, type ReactNode } from "react";
import { learnerProfileRepository } from "../../../src/storage/learner-profile";
import { useHydrated } from "../../components/use-hydrated";
import { useLearnerProfile } from "../use-learner-profile";
import type { ReleaseAreaId } from "../../../src/domain/release";
import { useRelease } from "../../release/release-context";
import { StudentFrame } from "../../views/shell/student-frame";
import type { IconName } from "../icons";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Sichtbar, wenn einer dieser Bereiche freigegeben ist. */
  areas: readonly ReleaseAreaId[];
  /** Weitere Routen-Präfixe, die zu diesem Eintrag gehören. */
  also?: readonly string[];
};

/**
 * Hauptnavigation (Design 3a/2b, Entscheidung 48): Lernen, Üben mit allen
 * Übungsbereichen, Raum sowie Duell und Haus, sobald sie freigegeben sind.
 */
const NAV: readonly NavItem[] = [
  {
    href: "/lernen",
    label: "Lernen",
    icon: "learn",
    areas: ["lernen"],
    also: ["/klasse"],
  },
  {
    href: "/ueben",
    label: "Üben",
    icon: "pencil",
    areas: [
      "lernbox",
      "wortspeicher",
      "tastenwelt",
      "mathe",
      "laufdiktat-frei",
      "textbox",
    ],
    also: ["/lernbox", "/frei"],
  },
  { href: "/raum", label: "Raum", icon: "room", areas: ["raum"] },
  { href: "/duell", label: "Duell", icon: "duel", areas: ["duell"] },
  { href: "/haus", label: "Haus", icon: "house", areas: ["motivation"] },
];

const PROFILE_HREF = "/lernen/einstellungen";

function matchLength(item: NavItem, path: string) {
  let best = -1;
  for (const route of [item.href, ...(item.also ?? [])]) {
    const hit = path === route || path.startsWith(`${route}/`);
    if (hit && route.length > best) best = route.length;
  }
  return best;
}

/** Rahmen für alle Schülerseiten; nicht freigegebene Bereiche erscheinen nicht. */
export function StudentShell({
  activePath,
  hideNav = false,
  footer,
  children,
}: {
  activePath: string;
  hideNav?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const visibility = useRelease();
  const hydrated = useHydrated();
  const profile = useLearnerProfile();
  // Ohne eigene Wahl bekommt das Kind ein zufälliges Tier (Entscheidung 47).
  useEffect(() => {
    if (hydrated && !profile) learnerProfileRepository.ensure();
  }, [hydrated, profile]);
  // Getippter Eintrag gilt sofort als aktiv, bis die neue Seite da ist; so
  // reagiert die Leiste auch bei langsamer Verbindung ohne Verzögerung.
  const [pending, setPending] = useState<{ href: string; from: string }>();
  const waiting = pending !== undefined && pending.from === activePath;
  const shownPath = waiting ? pending.href : activePath;
  const items = NAV.filter((item) => item.areas.some((a) => visibility[a]));
  const profileActive = shownPath.startsWith(PROFILE_HREF);
  let active: NavItem | null = null;
  let length = -1;
  for (const item of items) {
    const current = matchLength(item, shownPath);
    if (current > length) {
      active = item;
      length = current;
    }
  }
  return (
    <StudentFrame
      items={items.map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
        active: !profileActive && item === active,
      }))}
      profileHref={PROFILE_HREF}
      profileActive={profileActive}
      hideNav={hideNav}
      pending={waiting}
      onNavigate={(href) => {
        if (href === activePath) return;
        setPending({ href, from: activePath });
        // Bricht der Wechsel ab, verschwindet der Ladezustand von selbst.
        window.setTimeout(() => setPending(undefined), 8000);
      }}
      footer={footer}
    >
      {children}
    </StudentFrame>
  );
}
