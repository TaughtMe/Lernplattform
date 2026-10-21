"use client";

import { StorageProtectionNotice } from "../components/storage-protection";
import { profileAvatar } from "../../src/domain/learner-profile";
import { useAreaVisible } from "../release/release-context";
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

  // „Weiterlernen“ führt in das Modul des ersten offenen Portionselements (bei
  // Klassenaufgaben direkt zu deren Übungsseite); ist die Portion erledigt oder
  // leer, bleibt die erste Empfehlung.
  const { plan } = snapshot;
  const continueHref =
    plan.firstOpenRoute ??
    (plan.firstOpenModule
      ? planModuleHref(plan.firstOpenModule)
      : (snapshot.recommendations[0]?.route ?? "/ueben"));

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
    />
  );
}
