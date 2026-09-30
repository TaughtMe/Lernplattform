import type { Metadata } from "next";
import { TeacherClassConfigurator } from "../../components/teacher-class-configurator";

export const metadata: Metadata = { title: "Klassen" };

export default function Page() {
  return (
    <div className="ui-page">
      <TeacherClassConfigurator />
    </div>
  );
}
