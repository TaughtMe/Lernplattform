import type { Metadata } from "next";
import { TeacherLiveRoom } from "./teacher-live-room";
import { TeacherShell } from "../../ui/shell/teacher-shell";

export const metadata: Metadata = { title: "Live-Unterricht" };

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const liveRoomConfig = url && publishableKey ? { url, publishableKey } : null;

  return (
    <TeacherShell active="live">
      <TeacherLiveRoom liveRoomConfig={liveRoomConfig} />
    </TeacherShell>
  );
}
