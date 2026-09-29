import { ModulePlaceholder } from "../../components/module-placeholder";

export default function Page() {
  return (
    <ModulePlaceholder
      activePath="/lernen/material"
      eyebrow="Du entscheidest"
      title="Fach auswählen"
      description="Hier wählst du später Thema, Übungsart und Schwierigkeit selbst. Ergebnisse bleiben persönlich und werden nicht automatisch mit einer Klasse geteilt."
      status="Persönlicher Bereich"
    />
  );
}
