export const PERSONAL_SUBJECTS = [
  {
    id: "german",
    label: "Deutsch",
    icon: "Aa",
    description:
      "Lernwörter und Rechtschreibstrategien Schritt für Schritt sichern.",
    hubRoute: "/lernen/faecher/deutsch",
    practiceRoute: "/frei/german/lernwoerter",
    practiceLabel: "Lernwörter frei üben",
    contentLabel: "Meine Lernwortlisten",
  },
  {
    id: "mathematics",
    label: "Mathematik",
    icon: "×",
    description:
      "Grundrechenarten und passende Aufgabenfamilien sicher automatisieren.",
    hubRoute: "/lernen/faecher/mathematik",
    practiceRoute: "/frei/mathematics",
    practiceLabel: "Kopfrechnen frei üben",
    contentLabel: "Meine Aufgabenfamilien",
  },
  {
    id: "vocabulary",
    label: "Vokabeln",
    icon: "ABC",
    description:
      "Eigene und übernommene Stapel mit einem gemeinsamen Lernstand lernen.",
    hubRoute: "/lernen/faecher/vokabeln",
    practiceRoute: "/lernbox",
    practiceLabel: "Vokabeln frei üben",
    contentLabel: "Meine Vokabelstapel",
  },
  {
    id: "typing",
    label: "Tastschreiben",
    icon: "⌨",
    description:
      "Genauigkeit und einen ruhigen Schreibrhythmus nachhaltig trainieren.",
    hubRoute: "/lernen/faecher/tastschreiben",
    practiceRoute: "/frei/typing",
    practiceLabel: "Tastschreiben frei üben",
    contentLabel: "Mein Schreibtraining",
  },
] as const;

export type PersonalSubject = (typeof PERSONAL_SUBJECTS)[number];
export type PersonalSubjectSlug =
  "deutsch" | "mathematik" | "vokabeln" | "tastschreiben";

export function findPersonalSubject(slug: string) {
  return PERSONAL_SUBJECTS.find((subject) =>
    subject.hubRoute.endsWith(`/${slug}`),
  );
}
