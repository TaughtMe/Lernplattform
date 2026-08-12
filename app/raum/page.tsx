import type { Metadata } from "next";
import { ModulePlaceholder } from "../components/module-placeholder";
export const metadata: Metadata = { title: "Raum beitreten" };
export default function Page() {
  return (
    <ModulePlaceholder
      eyebrow="Unterrichtsraum"
      title="Raum beitreten"
      description="Der Raumcode-Einstieg ist vorbereitet. Paketabruf und Laufdiktat werden über eine stabile Inhalts-Schnittstelle ergänzt."
      status="Laufdiktat wird separat weiterentwickelt"
    />
  );
}
