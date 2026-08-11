import type { Metadata } from "next";
import { ModulePlaceholder } from "../components/module-placeholder";
export const metadata: Metadata = { title: "Lehrerbereich" };
export default function Page() { return <ModulePlaceholder eyebrow="Geschützter Arbeitsbereich" title="Lehrer-Login" description="Das Lehrer-Cockpit erhält eine eigene Authentifizierung und bleibt technisch vom Schülerbereich getrennt." status="Authentifizierungsentscheidung noch offen" />; }
