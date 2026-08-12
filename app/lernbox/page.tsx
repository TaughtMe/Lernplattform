import type { Metadata } from "next";
import { ModulePlaceholder } from "../components/module-placeholder";
export const metadata: Metadata = { title: "Meine LernBox" };
export default function Page() {
  return (
    <ModulePlaceholder
      eyebrow="Dein persönlicher Lernstand"
      title="Meine LernBox"
      description="Vokabeln, Fälligkeiten und persönliche Fehlerübungen bekommen hier ein Zuhause – standardmäßig lokal auf deinem Gerät."
      status="LernBox wird separat weiterentwickelt"
    />
  );
}
