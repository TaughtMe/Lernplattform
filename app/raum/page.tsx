import type { Metadata } from "next";
import { LiveRoomJoin } from "../components/live-room-join";
import { StudentDashboardShell } from "../components/student-dashboard-shell";
export const metadata: Metadata = { title: "Raum beitreten" };
type PageProps = {
  searchParams: Promise<{ code?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const liveRoomConfig = url && publishableKey ? { url, publishableKey } : null;
  return (
    <StudentDashboardShell activePath="/lernen">
      <LiveRoomJoin initialCode={code ?? ""} liveRoomConfig={liveRoomConfig} />
    </StudentDashboardShell>
  );
}
