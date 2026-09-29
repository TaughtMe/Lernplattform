import type { Metadata } from "next";
import { AdaptiveProgressPanel } from "../../components/adaptive-progress-panel";
import { StudentPage } from "../../ui/shell/student-page";
import { PageHeader } from "../../ui/primitives";

export const metadata: Metadata = { title: "Mein Fortschritt" };

export default function Page() {
  return (
    <StudentPage activePath="/lernen/fortschritt">
      <div className="ui-page">
        <PageHeader eyebrow="Deine Entwicklung" title="Mein Fortschritt">
          Was du geübt und Schritt für Schritt verbessert hast.
        </PageHeader>
        <AdaptiveProgressPanel />
      </div>
    </StudentPage>
  );
}
