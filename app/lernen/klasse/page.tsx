import type { Metadata } from "next";
import { StudentClassEnrollment } from "../../components/student-class-enrollment";
import { StudentPage } from "../../ui/shell/student-page";
import { PageHeader } from "../../ui/primitives";

export const metadata: Metadata = { title: "Meine Klasse" };

export default function Page() {
  return (
    <StudentPage activePath="/lernen/klasse">
      <div className="ui-page">
        <PageHeader eyebrow="Gemeinsam lernen" title="Meine Klasse">
          Scanne deinen persönlichen QR-Code oder gib den Klassencode deiner
          Lehrkraft ein.
        </PageHeader>
        <StudentClassEnrollment />
      </div>
    </StudentPage>
  );
}
