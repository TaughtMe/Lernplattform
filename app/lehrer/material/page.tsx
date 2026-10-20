import type { Metadata } from "next";
import { TeacherContentTransfer } from "../../components/teacher-content-transfer";

export const metadata: Metadata = { title: "Freigabe an Schüler" };

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const liveRoomConfig = url && publishableKey ? { url, publishableKey } : null;

  return <TeacherContentTransfer transferConfig={liveRoomConfig} />;
}
