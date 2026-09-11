import type { Metadata } from "next";
import { ModulePlaceholder } from "../components/module-placeholder";
export const metadata: Metadata = { title: "Duell" };
export default function Page() {
  return (
    <ModulePlaceholder
      eyebrow="Gemeinsam üben"
      title="Duell"
      description="Fordere später Mitschüler:innen mit gemeinsamem Wortschatz heraus – ohne Fehler öffentlich bloßzustellen."
      status="Für eine spätere Ausbaustufe vorgesehen"
    />
  );
}
