import type { Metadata } from "next";
import { ModulePlaceholder } from "../components/module-placeholder";
export const metadata: Metadata = { title: "Heute lernen" };
export default function Page() {
  return (
    <ModulePlaceholder
      eyebrow="Dein heutiger Lernweg"
      title="Heute lernen"
      description="Hier werden später fällige, schwierige und zuletzt fehlerhafte Inhalte zu einer ruhigen Tagesrunde gebündelt."
      status="Tagesauswahl wird vorbereitet"
    />
  );
}
