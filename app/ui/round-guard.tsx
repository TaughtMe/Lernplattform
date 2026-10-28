"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RoundLeaveDialog } from "../views/shell/round-leave-dialog";

/**
 * Rundenschutz (Befund C-001): Solange ein Modul „Runde läuft“ meldet, fragen
 * Logo, untere Leiste, Profil und jede andere Verknüpfung innerhalb der App
 * sowie die Zurück-Geste des Browsers nach, bevor die Runde verlassen wird.
 * Das Modul verwaltet nur seine Runde (`useRoundGuard`); Rückfrage, Verlauf
 * und Fokus liegen hier an einer Stelle.
 *
 * - Pro Runde gibt es einen eigenen Eintrag im Browser-Verlauf (`pushState`),
 *   damit die Zurück-Geste zuerst die Runde und nicht das Modul verlässt.
 * - Kein `beforeunload`-Dialog: Beim Neuladen oder Schließen deckt der
 *   Zwischenstand der Module die Runde ab.
 * - Ohne Provider (Tests, Lehrerbereich) tut der Hook nichts und das Modul
 *   verlässt die Runde sofort.
 */
type RoundEntry = {
  id: string;
  /** Hält das Modul einen Zwischenstand? Bestimmt den Text der Rückfrage. */
  resumable: boolean;
  onLeave: () => void;
};

type Request = {
  opener: HTMLElement | null;
  /** Text der Rückfrage: Hält das Modul einen Zwischenstand? */
  resumable: boolean;
} & ({ cause: "button" | "back" } | { cause: "link"; href: string });

type RoundGuardApi = {
  register: (entry: RoundEntry) => () => void;
  /** Öffnet die Rückfrage für den eigenen Knopf des Moduls; `false`, wenn keine Runde gemeldet ist. */
  ask: () => boolean;
};

const RoundGuardContext = createContext<RoundGuardApi | null>(null);

/** Merkmal des Verlaufseintrags, den eine Runde anlegt. */
const HISTORY_KEY = "lernraumRunde";
/** So lange wartet der Rundenschutz auf das `popstate` seines eigenen `history.back()`. */
const BACK_WAIT_MS = 400;

function historyMarker(): unknown {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null
    ? (state as Record<string, unknown>)[HISTORY_KEY]
    : undefined;
}

function activeElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement &&
    document.activeElement !== document.body
    ? document.activeElement
    : null;
}

/** Eine Verknüpfung, die innerhalb der App die Seite wechselt (sonst `null`). */
function internalNavigation(
  event: MouseEvent,
): { href: string; anchor: HTMLAnchorElement } | null {
  if (event.button !== 0 || event.defaultPrevented) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const target = event.target instanceof Element ? event.target : null;
  const anchor = target?.closest<HTMLAnchorElement>("a[href]") ?? null;
  if (!anchor || anchor.hasAttribute("download")) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // Gleiche Seite (auch nur ein anderer Anker): kein Verlassen der Runde.
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    return null;
  }
  return { href: `${url.pathname}${url.search}${url.hash}`, anchor };
}

export function RoundGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const entry = useRef<RoundEntry | null>(null);
  const requestRef = useRef<Request | null>(null);
  const [request, setRequestState] = useState<Request | null>(null);
  /** `popstate`-Ereignisse, die der Rundenschutz mit eigenem `history.back()` auslöst. */
  const ignorePops = useRef(0);
  const cleanupTimer = useRef(0);
  /** Anker der Adresse beim letzten Ereignis: Ein Sprung zu einem Anker ist keine Zurück-Geste. */
  const lastHash = useRef("");

  const setRequest = useCallback((next: Request | null) => {
    requestRef.current = next;
    setRequestState(next);
  }, []);

  const pushEntry = useCallback((id: string) => {
    window.history.pushState({ [HISTORY_KEY]: id }, "", window.location.href);
  }, []);

  /** Nimmt den Verlaufseintrag der Runde zurück und wartet kurz auf das Ereignis. */
  const popEntry = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (historyMarker() === undefined) return resolve();
        ignorePops.current += 1;
        const done = () => {
          window.removeEventListener("popstate", done);
          window.clearTimeout(timer);
          resolve();
        };
        const timer = window.setTimeout(() => {
          ignorePops.current = Math.max(0, ignorePops.current - 1);
          done();
        }, BACK_WAIT_MS);
        window.addEventListener("popstate", done);
        window.history.back();
      }),
    [],
  );

  const register = useCallback(
    (next: RoundEntry) => {
      window.clearTimeout(cleanupTimer.current);
      entry.current = next;
      lastHash.current = window.location.hash;
      // Ein übrig gebliebener Eintrag (Neuladen mitten in der Runde) wird
      // wiederverwendet statt gestapelt.
      if (historyMarker() === undefined) pushEntry(next.id);
      else
        window.history.replaceState(
          { [HISTORY_KEY]: next.id },
          "",
          window.location.href,
        );
      return () => {
        if (entry.current === next) entry.current = null;
        // Verschwindet das Modul, solange die Frage offen ist, geht auch sie.
        setRequest(null);
        // Verzögert, damit ein sofortiges erneutes Melden (Strict Mode, Wechsel
        // zwischen zwei Runden) den Eintrag behält.
        window.clearTimeout(cleanupTimer.current);
        cleanupTimer.current = window.setTimeout(() => {
          if (entry.current === null) void popEntry();
        }, 0);
      };
    },
    [popEntry, pushEntry, setRequest],
  );

  const ask = useCallback(() => {
    if (!entry.current) return false;
    setRequest({
      cause: "button",
      opener: activeElement(),
      resumable: entry.current.resumable,
    });
    return true;
  }, [setRequest]);

  const api = useMemo<RoundGuardApi>(
    () => ({ register, ask }),
    [register, ask],
  );

  // Verknüpfungen: Logo, Leiste, Profil und alles andere innerhalb der App.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!entry.current || requestRef.current) return;
      const link = internalNavigation(event);
      if (!link) return;
      // Vor React und vor `next/link`: Die Seite wechselt erst nach der Antwort.
      event.preventDefault();
      event.stopPropagation();
      setRequest({
        cause: "link",
        href: link.href,
        opener: link.anchor,
        resumable: entry.current.resumable,
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [setRequest]);

  // Zurück-Geste: Der Eintrag der Runde ist verbraucht, die Seite bleibt stehen.
  useEffect(() => {
    const onPop = () => {
      // Ein Sprung zu einem Anker (z. B. „Zum Inhalt“) löst auch `popstate` aus.
      const hash = window.location.hash;
      const hashChanged = hash !== lastHash.current;
      lastHash.current = hash;
      if (hashChanged) return;
      if (ignorePops.current > 0) {
        ignorePops.current -= 1;
        return;
      }
      const current = entry.current;
      if (!current || requestRef.current) return;
      // Vorwärts auf den eigenen Eintrag zurück: nichts zu fragen.
      if (historyMarker() === current.id) return;
      setRequest({
        cause: "back",
        opener: activeElement(),
        resumable: current.resumable,
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setRequest]);

  useEffect(() => () => window.clearTimeout(cleanupTimer.current), []);

  function stay() {
    const asked = requestRef.current;
    const current = entry.current;
    setRequest(null);
    if (!asked || !current) return;
    // Nach der Zurück-Geste fehlt der Eintrag: Er kommt wieder hinzu.
    if (asked.cause === "back" && historyMarker() !== current.id) {
      pushEntry(current.id);
    }
    // Der Fokus geht an die Stelle zurück, von der die Frage kam.
    const opener = asked.opener;
    if (opener?.isConnected) opener.focus();
  }

  function leave() {
    const asked = requestRef.current;
    const current = entry.current;
    setRequest(null);
    if (!asked) return;
    if (asked.cause === "link") {
      // Erst den Eintrag der Runde zurücknehmen, dann wechseln: kein toter Schritt im Verlauf.
      void popEntry().then(() => router.push(asked.href));
    } else {
      current?.onLeave();
    }
  }

  return (
    <RoundGuardContext.Provider value={api}>
      {children}
      <RoundLeaveDialog
        open={request !== null}
        resumable={request?.resumable ?? true}
        onStay={stay}
        onLeave={leave}
      />
    </RoundGuardContext.Provider>
  );
}

/**
 * Meldet dem Rundenschutz, dass im Modul eine Runde läuft (`active`). Die
 * Rückgabe ist die Funktion für den eigenen „Runde beenden“-Knopf des Moduls:
 * Sie fragt nach und ruft nach „Beenden“ `onLeave` auf; ohne laufende Runde
 * ruft sie `onLeave` sofort auf.
 *
 * `onLeave` verlässt nur die Runde im Modul (und lässt den Zwischenstand
 * stehen). Dieselbe Funktion nutzt der Rundenschutz nach der Zurück-Geste.
 */
export function useRoundGuard({
  active,
  onLeave,
  resumable = true,
}: {
  active: boolean;
  onLeave: () => void;
  resumable?: boolean;
}): () => void {
  const guard = useContext(RoundGuardContext);
  const leave = useRef(onLeave);
  useEffect(() => {
    leave.current = onLeave;
  });
  useEffect(() => {
    if (!guard || !active) return;
    return guard.register({
      id: crypto.randomUUID(),
      resumable,
      onLeave: () => leave.current(),
    });
  }, [guard, active, resumable]);
  return useCallback(() => {
    if (guard && active && guard.ask()) return;
    leave.current();
  }, [guard, active]);
}
