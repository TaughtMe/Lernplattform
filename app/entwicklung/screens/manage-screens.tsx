"use client";

import { useState, type ReactNode } from "react";
import { VOCABULARY_LANGUAGES } from "../../../src/domain/running-dictation";
import {
  DEMO_DEVICES,
  DEMO_LIVE,
  DEMO_MANAGE,
  DEMO_PACKAGES,
  DEMO_ROWS,
  DEMO_PROFILE,
  DEMO_PROVIDERS,
  DEMO_SCOPE,
  DEMO_STATS,
  DEMO_SYNC_STAND,
} from "../../views/lehrer/manage-demo";
import { manageStyles as m, ManagePage } from "../../views/lehrer/manage-parts";
import {
  DeviceDataCard,
  EncryptionSwitch,
  ProfileCard,
  ProviderPicker,
  SettingsGroup,
  SettingsGroups,
  SyncAlert,
  SyncDevices,
  SyncOff,
  SyncScopeChips,
  SyncStatusRow,
} from "../../views/lehrer/settings-screen";
import { TeacherFrame } from "../../views/lehrer/teacher-frame";
import {
  LiveTransfers,
  PackageEditor,
  PackageList,
  TransferLayout,
} from "../../views/lehrer/transfer-screen";
import {
  swapRows,
  type VocabularyRowValue,
} from "../../views/lehrer/vocabulary-rows";
import type { Theme } from "../../views/parts/parts";

/** Die Verwalten-Seiten 17a–c mit Beispieldaten der Vorlage. */
export function renderManageScreen(screen: string, theme: Theme): ReactNode {
  if (screen === "17a") {
    return (
      <ManageFrame theme={theme} active="settings">
        <SettingsDemo />
      </ManageFrame>
    );
  }
  if (screen === "17b") {
    return (
      <ManageFrame theme={theme} active="material">
        <TransferDemo />
      </ManageFrame>
    );
  }
  return null;
}

/** Lehrer-Leiste nach v2 mit Klasse 7b (10 Schüler) und „Verwalten“. */
function ManageFrame({
  theme,
  active,
  children,
}: {
  theme: Theme;
  active: string;
  children: ReactNode;
}) {
  const [currentTheme, setTheme] = useState<Theme>(theme);
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div data-theme={currentTheme} style={{ display: "contents" }}>
      <TeacherFrame
        layout="page"
        eyebrow="Verwalten"
        title={DEMO_MANAGE.find((item) => item.id === active)?.label ?? ""}
        theme={currentTheme}
        classes={[
          {
            id: "7b",
            name: "Klasse 7b",
            sub: "2026/27",
            count: 10,
            href: "#",
            active: true,
          },
        ]}
        classesOpen={false}
        areas={[
          {
            id: "start",
            label: "Start",
            icon: "home",
            href: "#",
            active: false,
          },
        ]}
        manage={DEMO_MANAGE.map((item) => ({
          id: item.id,
          label: item.label,
          icon: "gear",
          href: "#",
          active: item.id === active,
        }))}
        profile={{ initials: "TB", name: "T. Bryson", sub: "Zur Startseite" }}
        navOpen={navOpen}
        onNavOpen={() => setNavOpen(true)}
        onNavClose={() => setNavOpen(false)}
        onToggleTheme={() =>
          setTheme((value) => (value === "dark" ? "light" : "dark"))
        }
      >
        {children}
      </TeacherFrame>
    </div>
  );
}

/** 17a: OneDrive aktiv, Anmeldung abgelaufen, Verschlüsselung aus. */
function SettingsDemo() {
  const [profile, setProfile] = useState(DEMO_PROFILE);
  const [encrypted, setEncrypted] = useState(false);
  return (
    <ManagePage
      title="Einstellungen"
      lead="Alles bleibt auf diesem Gerät, solange kein Abgleich eingerichtet ist."
    >
      <SettingsGroups>
        <SettingsGroup
          title="Profil"
          hint="Name und Schule erscheinen auf QR-Bögen und in neuen Klassen."
        >
          <ProfileCard
            values={profile}
            onChange={(field, value) =>
              setProfile((current) => ({ ...current, [field]: value }))
            }
          />
        </SettingsGroup>
        <SettingsGroup
          title="Geräte abgleichen"
          hint="Klassen, Material und Ergebnisse zwischen deinen Lehrergeräten."
        >
          <div className={m.card}>
            <SyncAlert
              text="Die Anmeldung bei OneDrive ist abgelaufen."
              actionLabel="Neu anmelden"
            />
            <ProviderPicker options={DEMO_PROVIDERS} value="onedrive" />
            <SyncStatusRow name="OneDrive" sub={DEMO_SYNC_STAND}>
              <button type="button" className={m.green}>
                Jetzt abgleichen
              </button>
            </SyncStatusRow>
            <SyncDevices devices={DEMO_DEVICES} onRename={() => {}} />
            <SyncScopeChips labels={DEMO_SCOPE} />
            <EncryptionSwitch
              on={encrypted}
              hint={
                encrypted
                  ? "An. Ohne Passwort lassen sich die Daten in der Cloud nicht mehr lesen."
                  : "Aus. Die Daten sind nur durch dein Cloud-Konto geschützt."
              }
              onToggle={() => setEncrypted((value) => !value)}
            />
            <SyncOff />
          </div>
        </SettingsGroup>
        <SettingsGroup
          title="Daten auf diesem Gerät"
          hint="Sicherung als Datei, ganz ohne Konto."
        >
          <DeviceDataCard stats={DEMO_STATS} />
        </SettingsGroup>
      </SettingsGroups>
    </ManagePage>
  );
}

/** 17b: „Unit 3 School“ geöffnet, „Les couleurs“ ist freigegeben. */
function TransferDemo() {
  const [selected, setSelected] = useState("a");
  const [title, setTitle] = useState("Englisch · Unit 3 School");
  const [langs, setLangs] = useState({ left: "en-GB", right: "de-DE" });
  const [rows, setRows] = useState<VocabularyRowValue[]>(
    DEMO_ROWS.map((row) => ({ ...row })),
  );
  return (
    <ManagePage
      title="Freigabe an Schüler"
      lead="Vokabelpakete per QR-Code auf die Geräte der Schüler geben. Verschlüsselt und nach 24 Stunden gelöscht."
    >
      <TransferLayout
        side={
          <>
            <PackageList
              items={DEMO_PACKAGES}
              selectedId={selected}
              onPick={setSelected}
            />
            <LiveTransfers items={DEMO_LIVE} actionLabel="QR zeigen" />
          </>
        }
      >
        <PackageEditor
          title={title}
          languages={VOCABULARY_LANGUAGES}
          left={langs.left}
          right={langs.right}
          rows={rows}
          save="saved"
          live={false}
          onTitle={setTitle}
          onLeft={(left) => setLangs((value) => ({ ...value, left }))}
          onRight={(right) => setLangs((value) => ({ ...value, right }))}
          onSwap={() => {
            setLangs((value) => ({ left: value.right, right: value.left }));
            setRows((value) => swapRows(value));
          }}
          onRows={setRows}
          onDelete={() => {}}
        />
      </TransferLayout>
    </ManagePage>
  );
}
