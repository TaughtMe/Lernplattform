import { parseClassWorkspace } from "./class-workspace";

export const demoClass = parseClassWorkspace({
  id: "klasse-7b",
  name: "Klasse 7b",
  teacherName: "Frau Sommer",
  schoolYear: "2026/27",
  enabledModules: ["vocabulary", "german", "mathematics", "typing"],
  todayPractice: [],
  assignments: [],
});
