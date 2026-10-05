import type { Metadata } from "next";
import { LearningBoxApp } from "../components/learning-box-app";

export const metadata: Metadata = { title: "Meine LernBox" };

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const transferConfig = url && publishableKey ? { url, publishableKey } : null;
  return <LearningBoxApp transferConfig={transferConfig} />;
}
