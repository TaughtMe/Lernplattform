import type { Metadata } from "next";
import { InhalteClient } from "./inhalte-client";

export const metadata: Metadata = { title: "Lehrerbereich" };

export default function Page() {
  return <InhalteClient />;
}
