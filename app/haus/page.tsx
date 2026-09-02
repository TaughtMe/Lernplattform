import type { Metadata } from "next";
import { ModulePlaceholder } from "../components/module-placeholder";
export const metadata: Metadata = { title: "Mein Haus" };
export default function Page() {
  return (
    <ModulePlaceholder
      eyebrow="Gemeinsame Ziele"
      title="Mein Haus"
      description="Hier werden später Teamerfolge, persönliche Entwicklung und gemeinsame Lernziele sichtbar."
      status="Für eine spätere Ausbaustufe vorgesehen"
    />
  );
}
