import { Icon, type IconName } from "../ui/icons";

const SUBJECT_ICONS: Record<string, IconName> = {
  german: "text",
  mathematics: "math",
  vocabulary: "cards",
};

export function SubjectIcon({ subject }: { subject: string }) {
  return <Icon name={SUBJECT_ICONS[subject] ?? "keyboard"} size={22} />;
}
