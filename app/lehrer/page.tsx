import type { Metadata } from "next";
import Link from "next/link";
import { TeacherClassConfigurator } from "../components/teacher-class-configurator";

export const metadata: Metadata = { title: "Lehrerbereich" };

export default function Page() {
  return (
    <main className="teacher-shell">
      <header className="teacher-topbar">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <span>Lehrerbereich · Prototyp</span>
      </header>
      <TeacherClassConfigurator />
    </main>
  );
}
