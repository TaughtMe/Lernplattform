import type { Metadata } from "next";
import Link from "next/link";
import { StudentContentTransfer } from "../../components/student-content-transfer";
import { StudentPage } from "../../ui/shell/student-page";
import { Icon, type IconName } from "../../ui/icons";
import { PageHeader } from "../../ui/primitives";

const WORKSHOP_OPTIONS: ReadonlyArray<{
  href: string;
  label: string;
  icon: IconName;
}> = [
  { href: "/lernen/faecher/mathematik", label: "Mathematik", icon: "math" },
  { href: "/frei/german/laufdiktat", label: "Meine Laufdiktate", icon: "run" },
  { href: "/frei/typing", label: "Tippen", icon: "keyboard" },
  { href: "/lernbox", label: "Vokabeln", icon: "cards" },
];

export const metadata: Metadata = { title: "Lernwerkstatt" };

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const transferConfig = url && publishableKey ? { url, publishableKey } : null;

  return (
    <StudentPage activePath="/lernen/material">
      <div className="ui-page">
        <PageHeader title="Lernwerkstatt">Wähle eine Übung.</PageHeader>
        <nav className="ui-workshop" aria-label="Lernwerkstatt">
          {WORKSHOP_OPTIONS.map((option) => (
            <Link href={option.href} key={option.href}>
              <Icon name={option.icon} size={26} />
              <span>{option.label}</span>
            </Link>
          ))}
        </nav>
        <StudentContentTransfer transferConfig={transferConfig} />
      </div>
    </StudentPage>
  );
}
