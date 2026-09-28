import type { Metadata } from "next";
import { Suspense } from "react";
import { LaufdiktatTeacher } from "./laufdiktat-client";

export const metadata: Metadata = { title: "Laufdiktat · Lehrkraft" };

export default function Page() {
  return <Suspense fallback={null}><LaufdiktatTeacher /></Suspense>;
}
