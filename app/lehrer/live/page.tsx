import type { Metadata } from "next";
import { TeacherCockpitShell } from "../../components/teacher-cockpit-shell";
import { TeacherLiveRoom } from "../../components/teacher-live-room";

export const metadata: Metadata = { title: "Live-Unterricht" };

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const liveRoomConfig = url && publishableKey ? { url, publishableKey } : null;

  return (
    <TeacherCockpitShell active="live">
      <TeacherLiveRoom liveRoomConfig={liveRoomConfig} />
    </TeacherCockpitShell>
  );
}
