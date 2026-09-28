import type { Metadata } from "next";
import { Suspense } from "react";
import { StudentShell } from "../components/student-shell";
import { LernBoxClient } from "./lernbox-client";

export const metadata: Metadata = { title: "Lernen · Vokabeln" };

export default function Page() {
  return (
    <StudentShell>
      <Suspense fallback={<main className="page"><h1 className="h-page">Lernen</h1></main>}>
        <LernBoxClient />
      </Suspense>
    </StudentShell>
  );
}
