import type { Metadata } from "next";
import { CloudSyncSetup } from "../../components/cloud-sync-setup";
import { TeacherDeviceSettings } from "../../components/teacher-device-settings";
import {
  TeacherDataPanel,
  TeacherProfilePanel,
} from "../../components/teacher-workspace-manager";
import { ManagePage } from "../../views/lehrer/manage-parts";
import { SettingsGroups } from "../../views/lehrer/settings-screen";

export const metadata: Metadata = { title: "Einstellungen" };

/** Einstellungen nach Lehrerbereich v2 (17a): Profil, Gerät, Abgleich, Daten. */
export default function Page() {
  return (
    <ManagePage
      title="Einstellungen"
      lead="Alles bleibt auf diesem Gerät, solange kein Abgleich eingerichtet ist."
    >
      <SettingsGroups>
        <TeacherProfilePanel />
        <TeacherDeviceSettings />
        <CloudSyncSetup />
        <TeacherDataPanel />
      </SettingsGroups>
    </ManagePage>
  );
}
