import type { Metadata } from "next";
import { StudentAssignments } from "../../components/student-assignments";
import { StudentPage } from "../../ui/shell/student-page";
import { PageHeader } from "../../ui/primitives";

export const metadata: Metadata = { title: "Meine Aufgaben" };

export default function Page() {
  return (
    <StudentPage activePath="/lernen/aufgaben">
      <div className="ui-page">
        <PageHeader eyebrow="Von deiner Lehrkraft" title="Meine Aufgaben">
          Übernimm einen Auftrag und arbeite ihn in Ruhe ab.
        </PageHeader>
        <StudentAssignments />
      </div>
    </StudentPage>
  );
}
