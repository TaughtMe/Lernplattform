"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ReleaseAreaId } from "../../../src/domain/release";
import { useRelease } from "../../release/release-context";
import { AnimalImage } from "../animal";
import { Icon, type IconName } from "../icons";
import { ThemeButton } from "../theme-button";
import { useLearnerProfile } from "../use-learner-profile";

type NavItem = {
  href: string;
  label: string;
  area: ReleaseAreaId;
  icon?: IconName;
  /** Weitere Routen-Präfixe, die zu diesem Eintrag gehören. */
  also?: readonly string[];
};

/** Hauptnavigation nach Design 3a/2b. */
const MAIN_NAV: readonly NavItem[] = [
  {
    href: "/lernen",
    label: "Lernen",
    icon: "learn",
    area: "lernen",
    also: ["/lernbox", "/frei", "/klasse"],
  },
  { href: "/raum", label: "Raum", icon: "room", area: "raum" },
  { href: "/duell", label: "Duell", icon: "duel", area: "duell" },
  { href: "/haus", label: "Haus", icon: "house", area: "motivation" },
];

/** Lernbereiche innerhalb von „Lernen“. */
const LEARN_NAV: readonly NavItem[] = [
  { href: "/lernen", label: "Heute", area: "lernen" },
  { href: "/lernbox", label: "LernBox", area: "lernbox" },
  {
    href: "/frei/german/lernwoerter",
    label: "Wortspeicher",
    area: "wortspeicher",
    also: ["/frei/german", "/lernen/faecher/deutsch"],
  },
  { href: "/frei/typing", label: "Tastenwelt", area: "tastenwelt" },
  { href: "/frei/mathematics", label: "Kopfrechnen", area: "mathe" },
  {
    href: "/frei/german/laufdiktat",
    label: "Laufdiktat",
    area: "laufdiktat-frei",
  },
  {
    href: "/lernen/klasse",
    label: "Klasse",
    area: "lernen",
    also: ["/klasse"],
  },
  { href: "/lernen/fortschritt", label: "Fortschritt", area: "lernen" },
];

function matchLength(item: NavItem, path: string) {
  let best = -1;
  for (const route of [item.href, ...(item.also ?? [])]) {
    const exact = route === "/lernen";
    const hit = exact
      ? path === route
      : path === route || path.startsWith(`${route}/`);
    if (hit && route.length > best) best = route.length;
  }
  return best;
}

function activeItem(items: readonly NavItem[], path: string) {
  let best: NavItem | null = null;
  let length = -1;
  for (const item of items) {
    const current = matchLength(item, path);
    if (current > length) {
      best = item;
      length = current;
    }
  }
  return best;
}

function ProfileLink({ size }: { size: number }) {
  const profile = useLearnerProfile();
  const label = profile?.animal
    ? `Profil und Einstellungen, Tier ${profile.animal}`
    : "Profil und Einstellungen";
  return (
    <Link
      href="/lernen/einstellungen"
      className="ui-shell__profile"
      aria-label={label}
      title="Profil"
    >
      <AnimalImage animal={profile?.animal ?? null} size={size} />
    </Link>
  );
}

/**
 * Rahmen für alle Schülerseiten: dunkle Leiste (Desktop), Kopfzeile und
 * Tab-Leiste (mobil). Nicht freigegebene Bereiche erscheinen nicht; bei
 * weniger als zwei Bereichen entfällt die Navigation.
 */
export function StudentShell({
  activePath,
  children,
}: {
  activePath: string;
  children: ReactNode;
}) {
  const visibility = useRelease();
  const mainItems = MAIN_NAV.filter((item) => visibility[item.area]);
  const learnItems = LEARN_NAV.filter((item) => visibility[item.area]);
  const activeMain = activeItem(mainItems, activePath);
  const activeLearn = activeItem(learnItems, activePath);
  const showNav = mainItems.length >= 2;
  const showLearnNav = activeMain?.area === "lernen" && learnItems.length >= 2;
  const profileVisible = visibility.lernen;

  const navLinks = (className: string) =>
    mainItems.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={className}
        aria-current={item === activeMain ? "page" : undefined}
      >
        <Icon name={item.icon ?? "learn"} size={20} />
        <span>{item.label}</span>
      </Link>
    ));

  return (
    <div className="ui ui-shell">
      <aside className="ui-shell__rail ui-on-dark" aria-label="Lernraum">
        <Link href="/" className="ui-shell__logo" aria-label="Lernraum Start">
          L
        </Link>
        {showNav ? (
          <nav className="ui-shell__rail-nav" aria-label="Lernraum-Bereiche">
            {navLinks("ui-shell__rail-link")}
          </nav>
        ) : null}
        <div className="ui-shell__rail-foot">
          {profileVisible ? <ProfileLink size={30} /> : null}
          <ThemeButton className="ui-shell__rail-theme" />
        </div>
      </aside>

      <div className="ui-shell__body">
        <header className="ui-shell__topbar">
          <Link href="/" className="ui-shell__brand">
            Lernraum
          </Link>
          <div className="ui-row" style={{ gap: 8 }}>
            <ThemeButton />
            {profileVisible ? <ProfileLink size={30} /> : null}
          </div>
        </header>

        {showLearnNav ? (
          <nav className="ui-shell__subnav" aria-label="Lernbereiche">
            {learnItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item === activeLearn ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <main className="ui-shell__main">{children}</main>

        {showNav ? (
          <nav className="ui-shell__tabbar" aria-label="Lernraum-Bereiche">
            {navLinks("ui-shell__tab")}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
