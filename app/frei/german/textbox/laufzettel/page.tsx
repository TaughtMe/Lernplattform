import type { Metadata } from "next";
import { TextboxWorksheet } from "../../../../components/textbox-worksheet";
import { StudentPage } from "../../../../ui/shell/student-page";

export const metadata: Metadata = { title: "Laufzettel Textbox" };

export default function TextboxWorksheetPage() {
  return (
    <StudentPage activePath="/frei/german/textbox/laufzettel">
      <TextboxWorksheet />
    </StudentPage>
  );
}
