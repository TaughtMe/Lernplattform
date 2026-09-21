import type { Metadata } from "next";
import Link from "next/link";
import { StudentContentTransfer } from "../../components/student-content-transfer";
import { StudentDashboardShell } from "../../components/student-dashboard-shell";
import {
  BookOpenIcon,
  KeyboardIcon,
  LiveLessonIcon,
  SparklesIcon,
} from "../../components/ui-icons";

const WORKSHOP_OPTIONS = [
  {
    href: "/lernen/faecher/mathematik",
    label: "Mathematik",
    icon: SparklesIcon,
  },
  {
    href: "/frei/german/laufdiktat",
    label: "Meine Laufdiktate",
    icon: LiveLessonIcon,
  },
  { href: "/frei/typing", label: "Tippen", icon: KeyboardIcon },
  { href: "/lernbox", label: "Vokabeln", icon: BookOpenIcon },
] as const;

export const metadata: Metadata = { title: "Lernwerkstatt" };

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const transferConfig = url && publishableKey ? { url, publishableKey } : null;

  return (
    <StudentDashboardShell activePath="/lernen/material">
      <div className="student-dashboard__page">
        <header>
          <h1>Lernwerkstatt</h1>
          <p>Wähle eine Übung.</p>
        </header>
        <div className="student-workshop-grid" aria-label="Lernwerkstatt">
          {WORKSHOP_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Link href={option.href} key={option.href}>
                <Icon aria-hidden="true" />
                <span>{option.label}</span>
              </Link>
            );
          })}
        </div>
        <StudentContentTransfer transferConfig={transferConfig} />
      </div>
    </StudentDashboardShell>
  );
}
