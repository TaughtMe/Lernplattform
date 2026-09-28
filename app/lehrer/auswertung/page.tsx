import type { Metadata } from "next";
import { Suspense } from "react";
import { AuswertungClient } from "./auswertung-client";

export const metadata: Metadata = { title: "Auswertung" };

export default function Page() {
  return <Suspense fallback={null}><AuswertungClient /></Suspense>;
}
