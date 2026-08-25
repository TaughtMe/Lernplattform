import type { Metadata } from "next";
import { StudentHome } from "../components/student-home";

export const metadata: Metadata = { title: "Mein Lernraum" };

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const transferConfig = url && publishableKey ? { url, publishableKey } : null;
  return <StudentHome transferConfig={transferConfig} />;
}
