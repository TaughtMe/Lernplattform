"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { classSealFingerprint } from "../../src/domain/class-seal";
import {
  guestPassMessage,
  parseGuestPassLink,
  verifyGuestPass,
  type GuestPass,
} from "../../src/domain/guest-pass";
import { learnerProfileRepository } from "../../src/storage/learner-profile";
import {
  isGuestModeExpired,
  readGuestMode,
  startGuestMode,
} from "../../src/storage/guest-mode";
import { hasDeviceLearningState } from "../../src/storage/learning-state";
import { PersonalLearningDatabase } from "../../src/storage/personal-learning-events";
import { StudentClassesDatabase } from "../../src/storage/student-classes";
import { Button, ButtonLink, Notice } from "../ui/primitives";

/** Zeit und Ziel sind austauschbar, damit Komponententests nichts umleiten. */
export type GuestEntryEnvironment = {
  now: () => Date;
  open: (href: string) => void;
};

const defaultEnvironment: GuestEntryEnvironment = {
  now: () => new Date(),
  open: (href) => window.location.assign(href),
};

type View =
  | { kind: "pruefen" }
  | { kind: "ohne-code" }
  | { kind: "fehler"; message: string }
  | { kind: "bestaetigen"; classId: string }
  | { kind: "laeuft" };

const BACKUP_HREF = "/lernen/einstellungen#backup-title";

/**
 * Abdruck des Klassenschlüssels, falls das Gerät die Klasse aus einer
 * Einschreibung kennt; sonst `undefined` (siehe Grenze in `guest-pass.ts`).
 */
async function knownFingerprint(
  classId: string,
  memberships: StudentClassesDatabase,
) {
  try {
    const known = await memberships.memberships
      .where("classId")
      .equals(classId)
      .toArray();
    const key = known.find((entry) => entry.sealPublicKey)?.sealPublicKey;
    return key ? await classSealFingerprint(key) : undefined;
  } catch {
    return undefined;
  }
}

function stripFragment() {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
}

/** Ansicht ohne Logik: Meldung, Bestätigung oder Hinweis. */
export function GuestEntryView({
  view,
  onStart,
}: {
  view: View;
  onStart: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (view.kind !== "pruefen") heading.current?.focus();
  }, [view.kind]);

  return (
    <main className="ui ui-page ui-guest-page">
      <section
        className="ui-card ui-card--pop ui-card--pad ui-stack"
        aria-labelledby="guest-title"
      >
        <p className="ui-eyebrow">Geteiltes Gerät</p>
        <h1 id="guest-title" className="ui-h-page" tabIndex={-1} ref={heading}>
          Gastmodus
        </h1>
        {view.kind === "pruefen" ? (
          <p className="ui-small ui-muted" role="status">
            Der Gast-Code wird geprüft …
          </p>
        ) : null}
        {view.kind === "ohne-code" ? (
          <>
            <p className="ui-small" role="status">
              Hier fehlt der Gast-Code. Scanne den QR-Code deiner Lehrkraft mit
              der Kamera.
            </p>
            <ButtonLink href="/" variant="ghost">
              Zur Startseite
            </ButtonLink>
          </>
        ) : null}
        {view.kind === "fehler" ? (
          <>
            <Notice tone="bad" role="alert">
              {view.message}
            </Notice>
            <ButtonLink href="/" variant="ghost">
              Zur Startseite
            </ButtonLink>
          </>
        ) : null}
        {view.kind === "laeuft" ? (
          <>
            <p className="ui-small" role="status">
              Dieses Gerät ist schon im Gastmodus. Beende ihn zuerst, wenn ein
              neues Kind übernimmt.
            </p>
            <ButtonLink href="/lernen">Weiter zum Lernraum</ButtonLink>
          </>
        ) : null}
        {view.kind === "bestaetigen" ? (
          <>
            <p className="ui-small" role="status">
              Auf diesem Gerät ist schon ein Lernstand gespeichert. Im Gastmodus
              wird er am Ende gelöscht.
            </p>
            <div className="ui-stack">
              <ButtonLink href={BACKUP_HREF} variant="soft" block>
                Erst Sicherung erstellen
              </ButtonLink>
              <Button variant="bad" block onClick={onStart}>
                Gastmodus starten
              </Button>
              <ButtonLink href="/" variant="ghost" block>
                Abbrechen
              </ButtonLink>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

/**
 * Einstieg über den Gast-QR der Lehrkraft (`/gast#code=…`): prüft den Code auf
 * diesem Gerät, fragt bei vorhandenem Lernstand nach und startet den Gastmodus.
 * Bei abgelaufenem oder ungültigem Code passiert nichts außer der Meldung.
 */
export function GuestEntry({
  environment = defaultEnvironment,
}: {
  environment?: GuestEntryEnvironment;
}) {
  const [view, setView] = useState<View>({ kind: "pruefen" });

  const begin = useCallback(
    (classId: string) => {
      if (!startGuestMode(classId, environment.now())) {
        setView({
          kind: "fehler",
          message:
            "Der Gastmodus konnte nicht gestartet werden. Auf diesem Gerät ist das Speichern gesperrt.",
        });
        return;
      }
      stripFragment();
      environment.open("/lernen");
    },
    [environment],
  );

  useEffect(() => {
    let current = true;
    const show = (next: View) => {
      if (current) setView(next);
    };
    async function check() {
      if (!window.location.hash) return show({ kind: "ohne-code" });
      let pass: GuestPass;
      try {
        pass = parseGuestPassLink(window.location.hash);
      } catch {
        return show({ kind: "fehler", message: guestPassMessage("format") });
      }
      const classes = new StudentClassesDatabase();
      const personal = new PersonalLearningDatabase();
      try {
        const fingerprint = await knownFingerprint(
          pass.payload.classId,
          classes,
        );
        const result = await verifyGuestPass(
          pass,
          environment.now(),
          fingerprint,
        );
        if (!result.ok) {
          stripFragment();
          return show({
            kind: "fehler",
            message: guestPassMessage(result.reason),
          });
        }
        const running = readGuestMode();
        if (running && !isGuestModeExpired(running, environment.now())) {
          return show({ kind: "laeuft" });
        }
        let hasState = true;
        try {
          hasState = await hasDeviceLearningState({
            personal,
            classes,
            profile: learnerProfileRepository.read(),
          });
        } catch {
          // Lässt sich der Lernstand nicht prüfen, fragen wir vorsichtshalber nach.
        }
        if (!current) return;
        if (hasState) {
          return show({ kind: "bestaetigen", classId: result.classId });
        }
        begin(result.classId);
      } finally {
        classes.close();
        personal.close();
      }
    }
    void check();
    return () => {
      current = false;
    };
  }, [begin, environment]);

  return (
    <GuestEntryView
      view={view}
      onStart={() => {
        if (view.kind === "bestaetigen") begin(view.classId);
      }}
    />
  );
}
