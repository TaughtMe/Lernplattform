import type { Metadata } from "next";
import { DuellApp } from "../components/duell/duell-app";
export const metadata: Metadata = { title: "Duell" };
export default function Page() {
  return <DuellApp />;
}
