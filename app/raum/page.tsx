import type { Metadata } from "next";
import { Suspense } from "react";
import { StudentShell } from "../components/student-shell";
import { RaumClient } from "./raum-client";

export const metadata: Metadata = { title: "Raum beitreten" };

export default function Page() {
  return (
    <StudentShell>
      <Suspense fallback={<main className="page"><h1 className="h-page">Raum beitreten</h1></main>}>
        <RaumClient />
      </Suspense>
    </StudentShell>
  );
}
