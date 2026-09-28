"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

const NAV: { href: string; label: string; icon: IconName; match: string[] }[] = [
  { href: "/lernen", label: "Lernen", icon: "learn", match: ["/lernen", "/start", "/tastenwelt", "/profil"] },
  { href: "/raum", label: "Raum", icon: "room", match: ["/raum"] },
  { href: "/duell", label: "Duell", icon: "duel", match: ["/duell"] },
  { href: "/haus", label: "Haus", icon: "house", match: ["/haus"] },
];

/** Schülerbereich: schmale Leiste links (Tablet/Laptop), Tab-Leiste unten (Handy). */
export function StudentShell({ children, hideTabbar = false }: { children: ReactNode; hideTabbar?: boolean }) {
  const path = usePathname() ?? "";
  const active = (m: string[]) => m.some((p) => path === p || path.startsWith(p + "/"));
  return (
    <div className="app">
      <nav className="rail" aria-label="Hauptnavigation">
        <Link href="/start" className="logo" aria-label="Zum Dashboard">L</Link>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="nav" aria-current={active(n.match) ? "page" : undefined}>
            <Icon name={n.icon} size={23} />{n.label}
          </Link>
        ))}
        <Link href="/profil" className="rail-foot" aria-label="Profileinstellungen"><Icon name="gear" size={20} /></Link>
      </nav>
      <div className="app-main">
        {children}
        {hideTabbar ? null : (
          <nav className="tabbar" aria-label="Hauptnavigation">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.match) ? "page" : undefined}>
                <Icon name={n.icon} size={22} />{n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
