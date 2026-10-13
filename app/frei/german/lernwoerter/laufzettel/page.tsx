import type { Metadata } from "next";
import { WordStoreWorksheet } from "../../../../components/word-store-worksheet";
import { StudentPage } from "../../../../ui/shell/student-page";

export const metadata: Metadata = { title: "Laufzettel Wortspeicher" };

export default function WordStoreWorksheetPage() {
  return (
    <StudentPage activePath="/frei/german/lernwoerter/laufzettel">
      <WordStoreWorksheet />
    </StudentPage>
  );
}
