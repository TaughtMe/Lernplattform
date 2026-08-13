import type { Metadata } from "next";
import Link from "next/link";
import { TeacherClassConfigurator } from "../components/teacher-class-configurator";
import { TeacherLiveRoom } from "../components/teacher-live-room";

export const metadata: Metadata = { title: "Lehrerbereich" };

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const liveRoomConfig = url && publishableKey ? { url, publishableKey } : null;
  return (
    <main className="teacher-shell">
      <header className="teacher-topbar">
        <Link className="brand" href="/" aria-label="Lernraum Startseite">
          <span className="brand__mark" aria-hidden="true">
            L
          </span>
          <span>Lernraum</span>
        </Link>
        <span>Lehrerbereich · Prototyp</span>
      </header>
      <TeacherLiveRoom liveRoomConfig={liveRoomConfig} />
      <TeacherClassConfigurator />
    </main>
  );
}
