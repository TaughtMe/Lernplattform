import type { Metadata } from "next";
import { TeacherLiveRoom } from "../../components/teacher-live-room";
import { TeacherCockpitShell } from "../../components/teacher-cockpit-shell";

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
