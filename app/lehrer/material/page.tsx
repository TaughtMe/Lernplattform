import type { Metadata } from "next";
import { TeacherContentTransfer } from "../../components/teacher-content-transfer";

export const metadata: Metadata = { title: "Material" };

export default function Page() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const liveRoomConfig = url && publishableKey ? { url, publishableKey } : null;

  return (
    <div className="ui-page">
      <TeacherContentTransfer transferConfig={liveRoomConfig} />
    </div>
  );
}
