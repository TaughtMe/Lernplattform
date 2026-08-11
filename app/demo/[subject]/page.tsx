import type { Metadata } from "next";
import { ModulePlaceholder } from "../../components/module-placeholder";
export const metadata: Metadata = { title: "Demo-Lerngruppe" };
export default function Page() { return <ModulePlaceholder eyebrow="Öffentliche Demo" title="So fühlt sich eine Lerngruppe an" description="Die Demo enthält ausschließlich fiktive Inhalte. Echte Klassen und persönliche Lernstände sind nie öffentlich sichtbar." status="Demo-Inhalte folgen mit dem Vokabel-Kern" />; }
