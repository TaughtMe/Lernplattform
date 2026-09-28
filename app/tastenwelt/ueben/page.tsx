import type { Metadata } from "next";
import { Suspense } from "react";
import { StudentShell } from "../../components/student-shell";
import { UebenClient } from "./ueben-client";

export const metadata: Metadata = { title: "Tastenwelt · Übung" };

export default function Page() {
  return (
    <StudentShell hideTabbar>
      <Suspense fallback={<main className="page"><p className="h-fun">Tastenwelt</p></main>}>
        <UebenClient />
      </Suspense>
    </StudentShell>
  );
}
