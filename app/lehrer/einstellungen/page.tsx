import type { Metadata } from "next";
import { CloudSyncSetup } from "../../components/cloud-sync-setup";
import {
  TeacherDataPanel,
  TeacherProfilePanel,
} from "../../components/teacher-workspace-manager";
import { ManagePage } from "../../views/lehrer/manage-parts";
import { SettingsGroups } from "../../views/lehrer/settings-screen";

export const metadata: Metadata = { title: "Einstellungen" };

/** Einstellungen nach Lehrerbereich v2 (17a): Profil, Abgleich, Daten. */
export default function Page() {
  return (
    <ManagePage
      title="Einstellungen"
      lead="Alles bleibt auf diesem Gerät, solange kein Abgleich eingerichtet ist."
    >
      <SettingsGroups>
        <TeacherProfilePanel />
        <CloudSyncSetup />
        <TeacherDataPanel />
      </SettingsGroups>
    </ManagePage>
  );
}
