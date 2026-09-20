import type { Metadata } from "next";
import Link from "next/link";
import { StudentContentTransfer } from "../../components/student-content-transfer";
import { StudentDashboardShell } from "../../components/student-dashboard-shell";
import { SubjectIcon } from "../../components/subject-icon";
import { ArrowRightIcon } from "../../components/ui-icons";
import { PERSONAL_SUBJECTS } from "../../../src/domain/personal-learning-space";

export const metadata: Metadata = { title: "Frei üben" };

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const transferConfig = url && publishableKey ? { url, publishableKey } : null;

  return (
    <StudentDashboardShell activePath="/lernen/material">
      <div className="student-dashboard__page">
        <header>
          <p className="eyebrow">Persönlich üben</p>
          <h1>Frei üben</h1>
          <p>Wähle ein Fach und starte direkt.</p>
        </header>
        <div className="personal-subject-grid">
          {PERSONAL_SUBJECTS.map((subject) => (
            <Link href={subject.hubRoute} key={subject.id}>
              <span className="personal-subject-grid__icon" aria-hidden="true">
                <SubjectIcon subject={subject.id} />
              </span>
              <h2>{subject.label}</h2>
              <p>{subject.description}</p>
              <strong>
                Fach öffnen <ArrowRightIcon aria-hidden="true" />
              </strong>
            </Link>
          ))}
        </div>
        <StudentContentTransfer transferConfig={transferConfig} />
      </div>
    </StudentDashboardShell>
  );
}
