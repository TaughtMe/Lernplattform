import type { Metadata } from "next";
import { CLASS_MODULE_LABELS } from "../../../src/domain/class-workspace";
import { demoClass } from "../../../src/domain/demo-class";
import { ClassOverview } from "../class-overview";

export const metadata: Metadata = { title: demoClass.name };

export default function ClassPage() {
  return (
    <ClassOverview
      teacherName={demoClass.teacherName}
      className={demoClass.name}
      intro="Die Klasse ergänzt deinen persönlichen Lernraum um bereitgestellte Inhalte und gemeinsame Unterrichtsrunden. Sie führt keinen zweiten Lernstand."
      modules={demoClass.enabledModules.map(
        (module) => CLASS_MODULE_LABELS[module],
      )}
    />
  );
}
