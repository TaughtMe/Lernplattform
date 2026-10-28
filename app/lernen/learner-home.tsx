"use client";

import {
  RestoreBackupCloud,
  StorageProtectionNotice,
} from "../components/storage-protection";
import {
  firstContactAreas,
  hasLearnedNothing,
  homeMainAction,
} from "../../src/domain/first-contact";
import { profileAvatar } from "../../src/domain/learner-profile";
import { useAreaVisible, useRelease } from "../release/release-context";
import { useThemeToggle } from "../ui/theme";
import { useLearnerProfile } from "../ui/use-learner-profile";
import { HomeScreen } from "../views/lernen/home-screen";
import { planModuleHref, weekStates } from "./dashboard-data";
import { useLearnerDashboard } from "./use-learner-dashboard";

/** Lernen-Startseite (Design 3a/3b): verbindet Lernstand und Ansicht. */
export function LearnerHome() {
  const snapshot = useLearnerDashboard();
  const profile = useLearnerProfile();
  const { theme, toggleTheme } = useThemeToggle();
  // Serie, Abzeichen und Duell nur mit Freigabe (Entscheidung 47).
  const motivation = useAreaVisible("motivation");
  const duel = useAreaVisible("duell");
  const visibility = useRelease();

  // „Weiterlernen“ führt in das Modul des ersten offenen Portionselements (bei
  // Klassenaufgaben direkt zu deren Übungsseite); ist die Portion erledigt oder
  // leer, bleibt die erste Empfehlung.
  const { plan } = snapshot;
  // Erstkontakt: ein Kind ohne Lernstand sieht Karten für die Kernbereiche,
  // „Loslegen“ führt in den ersten sichtbaren Bereich (Befund C-003).
  const firstContact =
    snapshot.loaded &&
    hasLearnedNothing({
      hasLearningState: snapshot.hasLearningState,
      planTotal: plan.total,
      className: snapshot.className,
    });
  const areas = firstContactAreas(visibility);
  const nextRoute =
    plan.firstOpenRoute ??
    (plan.firstOpenModule
      ? planModuleHref(plan.firstOpenModule)
      : snapshot.recommendations[0]?.route);
  const continueHref = firstContact
    ? (areas[0]?.href ?? "/ueben")
    : (nextRoute ?? "/ueben");
  // Bis der Lernstand geladen ist, steht die neutrale Beschriftung da.
  const mainLabel = snapshot.loaded
    ? homeMainAction({
        firstContact,
        hasNextStep: nextRoute !== undefined,
        planTotal: plan.total,
      })
    : "Loslegen";

  return (
    <HomeScreen
      title={
        snapshot.className
          ? `Klasse ${snapshot.className.replace(/^Klasse\s+/i, "")}`
          : "Lernraum"
      }
      animal={profileAvatar(profile)}
      theme={theme}
      onToggleTheme={toggleTheme}
      // Tagesziel und „Heute dran“ zählen dieselben Portionselemente; freies
      // Üben und Rückstand ändern das Ziel nicht.
      done={plan.done}
      target={plan.total}
      continueHref={continueHref}
      mainLabel={mainLabel}
      firstContact={firstContact ? { areas } : undefined}
      week={weekStates(snapshot.activeDays)}
      due={{ done: plan.done, total: plan.total }}
      difficult={snapshot.difficult}
      practiceHref={snapshot.difficult[0]?.route ?? null}
      streakDays={
        motivation && snapshot.streak > 0 ? snapshot.streak : undefined
      }
      duelHref={duel ? "/duell" : undefined}
      notice={
        <StorageProtectionNotice hasLearningState={snapshot.hasLearningState} />
      }
      headAction={
        <RestoreBackupCloud hasLearningState={snapshot.hasLearningState} />
      }
    />
  );
}
