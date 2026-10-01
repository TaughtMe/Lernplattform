"use client";

import { useAreaVisible } from "../release/release-context";
import { useThemeToggle } from "../ui/theme";
import { useLearnerProfile } from "../ui/use-learner-profile";
import { HomeScreen } from "../views/lernen/home-screen";
import { weekStates } from "./dashboard-data";
import { useLearnerDashboard } from "./use-learner-dashboard";

/** Lernen-Startseite (Design 3a/3b): verbindet Lernstand und Ansicht. */
export function LearnerHome() {
  const snapshot = useLearnerDashboard();
  const profile = useLearnerProfile();
  const { theme, toggleTheme } = useThemeToggle();
  // Serie, Abzeichen und Duell nur mit Freigabe (Entscheidung 47).
  const motivation = useAreaVisible("motivation");
  const duel = useAreaVisible("duell");

  const primary = snapshot.recommendations[0];
  const dueOpen = snapshot.recommendations
    .filter((item) => item.reason === "due" || item.reason === "error")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <HomeScreen
      title={
        snapshot.className
          ? `Klasse ${snapshot.className.replace(/^Klasse\s+/i, "")}`
          : "Lernraum"
      }
      animal={profile?.animal ?? null}
      theme={theme}
      onToggleTheme={toggleTheme}
      // Tagesziel und „Heute fällig“ zählen dieselben Aufgaben.
      done={snapshot.completedToday}
      target={snapshot.completedToday + dueOpen}
      continueHref={primary?.route ?? "/ueben"}
      week={weekStates(snapshot.activeDays)}
      due={{
        done: snapshot.completedToday,
        total: snapshot.completedToday + dueOpen,
      }}
      difficult={snapshot.difficult}
      practiceHref={snapshot.difficult[0]?.route ?? null}
      streakDays={
        motivation && snapshot.streak > 0 ? snapshot.streak : undefined
      }
      duelHref={duel ? "/duell" : undefined}
    />
  );
}
