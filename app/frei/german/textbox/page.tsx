import type { Metadata } from "next";
import { TextboxApp } from "../../../components/textbox-app";
import { StudentPage } from "../../../ui/shell/student-page";

export const metadata: Metadata = { title: "Textbox" };

export default function TextboxPage() {
  return (
    <StudentPage activePath="/frei/german/textbox">
      <TextboxApp />
    </StudentPage>
  );
}
