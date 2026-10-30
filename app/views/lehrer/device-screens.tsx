"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  TEACHER_DEVICE_LABELS,
  type TeacherDeviceType,
} from "../../../src/domain/teacher-device";
import {
  PIN_LENGTH,
  PIN_LOCK_NOTICE,
  PIN_LOCKOUT_MS,
  describePinWait,
  sanitizePinInput,
} from "../../../src/domain/teacher-lock";
import { Button, ButtonLink, Notice } from "../../ui/primitives";

/**
 * Ansichten für Gerätetyp und Sperre des Lehrerbereichs (Befund B-009, Regeln
 * D3-1 bis D3-4). Reine Darstellung: Zustand und Aktionen kommen über Props.
 */

/** Seite mit einer Karte in der Mitte, wie beim Gastmodus-Hinweis. */
function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <main className="ui ui-page ui-guest-page">
      <div className="ui-card ui-card--pop ui-card--pad ui-stack">
        {children}
      </div>
    </main>
  );
}

// ---------- Auswahl ----------

const OPTION_HINT: Record<TeacherDeviceType, string> = {
  own: "Klassen, Schülerlisten, Aufgaben und Material sind hier erreichbar. Du kannst später eine PIN-Sperre einrichten.",
  board:
    "Nur Material und Räume. Klassen, Schüler, Aufgaben, Abgaben und Datenexport bleiben gesperrt, und der Abgleich bringt keine Personendaten auf das Gerät.",
};

/** Beim ersten Öffnen des Lehrerbereichs: Wem gehört dieses Gerät? */
export function DeviceChooser({
  onChoose,
}: {
  onChoose: (type: TeacherDeviceType) => void;
}) {
  const hintId = useId();
  return (
    <CenteredCard>
      <h1 className="ui-h-page">Welches Gerät ist das?</h1>
      <p className="ui-small" id={hintId}>
        Das fragen wir einmal. Wo Kinder mitbedienen können, schützt die Wahl
        „Tafel“ die Daten deiner Klassen. Du kannst sie später in den
        Einstellungen ändern.
      </p>
      <div className="ui-stack" role="group" aria-describedby={hintId}>
        {(["own", "board"] as const).map((type) => {
          const optionHint = `${hintId}-${type}`;
          return (
            <div key={type} className="ui-stack">
              <Button
                block
                variant={type === "own" ? "primary" : "soft"}
                aria-describedby={optionHint}
                onClick={() => onChoose(type)}
              >
                {TEACHER_DEVICE_LABELS[type]}
              </Button>
              <p className="ui-small ui-muted" id={optionHint}>
                {OPTION_HINT[type]}
              </p>
            </div>
          );
        })}
      </div>
    </CenteredCard>
  );
}

// ---------- Personendaten löschen ----------

export type PersonalDataSummary = {
  classes: number;
  students: number;
  assignments: number;
  submissions: number;
};

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** „2 Klassen, 31 Schüler, 4 Aufgaben“ – nur, was vorhanden ist. */
export function describePersonalData(data: PersonalDataSummary): string {
  const parts = [
    data.classes ? plural(data.classes, "Klasse", "Klassen") : "",
    data.students ? plural(data.students, "Schüler", "Schüler") : "",
    data.assignments ? plural(data.assignments, "Aufgabe", "Aufgaben") : "",
    data.submissions ? plural(data.submissions, "Abgabe", "Abgaben") : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Einstellungen und Profil";
}

/** Angebot beim Wechsel auf die Tafel: Personendaten von diesem Gerät löschen. */
export function PersonalDataOffer({
  data,
  busy = false,
  error = "",
  onDelete,
  onKeep,
}: {
  data: PersonalDataSummary;
  busy?: boolean;
  error?: string;
  onDelete: () => void;
  onKeep: () => void;
}) {
  const titleId = useId();
  return (
    <section className="ui-stack" role="group" aria-labelledby={titleId}>
      <h2 className="ui-h-page" id={titleId}>
        Personendaten von diesem Gerät löschen?
      </h2>
      <p className="ui-small">
        Auf diesem Gerät liegen noch: {describePersonalData(data)}. Auf einer
        Tafel gibt es nur Material. Das Material bleibt in jedem Fall erhalten.
        Ist ein Abgleich eingerichtet, bleiben die Daten in der Cloud und auf
        deinen anderen Geräten bestehen; sonst sind sie danach weg.
      </p>
      {error ? (
        <Notice tone="bad" role="alert">
          {error}
        </Notice>
      ) : null}
      <div className="ui-row ui-wrap">
        <Button variant="bad" disabled={busy} onClick={onDelete}>
          Personendaten löschen
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onKeep}>
          Behalten (bleiben gesperrt)
        </Button>
      </div>
    </section>
  );
}

/** Ganze Seite für das Angebot, solange es offen ist. */
export function PersonalDataOfferPage(
  props: Parameters<typeof PersonalDataOffer>[0],
) {
  return (
    <CenteredCard>
      <PersonalDataOffer {...props} />
    </CenteredCard>
  );
}

// ---------- Sperrblock der Tafel ----------

/** Auf der Tafel bleiben die Bereiche mit Personendaten zu (D3-2). */
export function BoardBlock() {
  return (
    <CenteredCard>
      <h1 className="ui-h-page">Im Tafelmodus nicht verfügbar</h1>
      <p className="ui-small">
        Dieses Gerät ist als Tafel eingerichtet. Klassen und Schülerlisten,
        Einschreibe- und Gast-QR, Aufgaben und Abgaben sowie der Datenexport
        sind hier gesperrt. Material und Räume stehen zur Verfügung.
      </p>
      <div className="ui-row ui-wrap">
        <ButtonLink href="/lehrer/material">Zum Material</ButtonLink>
        <ButtonLink variant="ghost" href="/lehrer/einstellungen">
          Gerätetyp ändern
        </ButtonLink>
      </div>
    </CenteredCard>
  );
}

// ---------- PIN-Abfrage ----------

/** Eine Zeile für die PIN: nur Ziffern, nie sichtbar. */
function PinField({
  label,
  value,
  onChange,
  focusOnMount = false,
  invalid = false,
  disabled = false,
  describedBy,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  focusOnMount?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  // Der Sperrbildschirm setzt den Fokus selbst (kein `focusOnMount`-Attribut).
  useEffect(() => {
    if (focusOnMount) input.current?.focus();
  }, [focusOnMount]);
  return (
    <label className="ui-labeled">
      {label}
      <input
        ref={input}
        className="ui-input"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={PIN_LENGTH}
        pattern="[0-9]*"
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        {...(describedBy ? { "aria-describedby": describedBy } : {})}
        onChange={(event) => onChange(sanitizePinInput(event.target.value))}
      />
    </label>
  );
}

/**
 * Sperrbildschirm: PIN eingeben oder, bei vergessener PIN, die Sperre aufheben.
 * Nach zu vielen falschen Eingaben (`waitMs` > 0) ist die Eingabe für die
 * Restzeit gesperrt; „PIN vergessen“ bleibt möglich.
 */
export function PinLockScreen({
  busy = false,
  error = "",
  waitMs = 0,
  onSubmit,
  onForgot,
}: {
  busy?: boolean;
  error?: string;
  /** Restzeit der Wartezeit nach falschen Eingaben in Millisekunden; 0 = frei. */
  waitMs?: number;
  onSubmit: (pin: string) => void;
  /** Sperre aufheben; löscht die Personendaten dieses Geräts. */
  onForgot: () => void;
}) {
  const [pin, setPin] = useState("");
  const [forgot, setForgot] = useState(false);
  const errorId = useId();
  const waiting = waitMs > 0;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (waiting) return;
    onSubmit(pin);
    setPin("");
  };
  return (
    <CenteredCard>
      <h1 className="ui-h-page">Lehrerbereich gesperrt</h1>
      {forgot ? (
        <section className="ui-stack" role="group" aria-label="PIN vergessen">
          <p className="ui-small">
            Wer die PIN vergessen hat, kann die Sperre aufheben. Dabei werden
            die Personendaten auf diesem Gerät gelöscht: Klassen, Schüler,
            Aufgaben und Abgaben. Das Material bleibt erhalten. Ist ein Abgleich
            eingerichtet, kommen die Daten von dort zurück.
          </p>
          <div className="ui-row ui-wrap">
            <Button variant="bad" disabled={busy} onClick={onForgot}>
              Sperre aufheben und Personendaten löschen
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setForgot(false)}
            >
              Abbrechen
            </Button>
          </div>
        </section>
      ) : (
        <form className="ui-stack" onSubmit={submit}>
          <p className="ui-small">
            Klassen, Schüler und Aufgaben sind mit einer PIN geschützt.
          </p>
          <PinField
            label={`PIN (${PIN_LENGTH} Ziffern)`}
            value={pin}
            onChange={setPin}
            focusOnMount
            disabled={waiting}
            invalid={Boolean(error) || waiting}
            {...(error || waiting ? { describedBy: errorId } : {})}
          />
          {waiting ? (
            <div id={errorId}>
              {/* Die Meldung steht einmal im Alert; die Restzeit läuft ohne Ansage mit. */}
              <Notice tone="bad" role="alert">
                Zu viele falsche PINs. Die Eingabe ist für{" "}
                {describePinWait(PIN_LOCKOUT_MS)} gesperrt.
              </Notice>
              <p className="ui-small">
                Wieder möglich in {describePinWait(waitMs)}.
              </p>
            </div>
          ) : error ? (
            <Notice tone="bad" role="alert" id={errorId}>
              {error}
            </Notice>
          ) : null}
          <div className="ui-row ui-wrap">
            <Button
              type="submit"
              disabled={busy || waiting || pin.length !== PIN_LENGTH}
            >
              Entsperren
            </Button>
            <Button variant="link" onClick={() => setForgot(true)}>
              PIN vergessen
            </Button>
            <ButtonLink variant="ghost" href="/lehrer/material">
              Zum Material
            </ButtonLink>
          </div>
          <p className="ui-small ui-muted">{PIN_LOCK_NOTICE}</p>
        </form>
      )}
    </CenteredCard>
  );
}

// ---------- Einstellungen ----------

/** PIN festlegen: zweimal eingeben. Gibt eine Fehlermeldung zurück oder nichts. */
function PinSetupForm({
  onSave,
  onCancel,
  submitLabel,
}: {
  onSave: (pin: string) => Promise<string | undefined>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errorId = useId();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pin.length !== PIN_LENGTH) {
      setError(`Die PIN hat genau ${PIN_LENGTH} Ziffern.`);
      return;
    }
    if (pin !== again) {
      setError("Die beiden Eingaben passen nicht zusammen.");
      return;
    }
    setBusy(true);
    const failure = await onSave(pin);
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    setPin("");
    setAgain("");
    setError("");
  };
  return (
    <form className="ui-stack" onSubmit={(event) => void submit(event)}>
      <PinField
        label={`Neue PIN (${PIN_LENGTH} Ziffern)`}
        value={pin}
        onChange={setPin}
        invalid={Boolean(error)}
        {...(error ? { describedBy: errorId } : {})}
      />
      <PinField label="PIN wiederholen" value={again} onChange={setAgain} />
      {error ? (
        <Notice tone="bad" role="alert" id={errorId}>
          {error}
        </Notice>
      ) : null}
      <div className="ui-row ui-wrap">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            Abbrechen
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export type DeviceSettingsProps = {
  /** `null`: noch nicht gewählt (die Wahl erscheint dann beim Öffnen). */
  device: TeacherDeviceType | null;
  pinSet: boolean;
  /** Angebot nach dem Wechsel auf die Tafel, solange es offen ist. */
  offer?: PersonalDataSummary | null;
  offerBusy?: boolean;
  offerError?: string;
  /** Rückmeldung nach einer Aktion (Statuszeile). */
  message?: string;
  onChangeDevice: (type: TeacherDeviceType) => void;
  onDeleteData: () => void;
  onKeepData: () => void;
  onSavePin: (pin: string) => Promise<string | undefined>;
  onRemovePin: () => void;
};

/** Gruppe „Dieses Gerät“ der Lehrer-Einstellungen: Gerätetyp und PIN-Sperre. */
export function DeviceSettingsCard({
  device,
  pinSet,
  offer = null,
  offerBusy = false,
  offerError = "",
  message = "",
  onChangeDevice,
  onDeleteData,
  onKeepData,
  onSavePin,
  onRemovePin,
}: DeviceSettingsProps) {
  const name = useId();
  const [editingPin, setEditingPin] = useState(false);
  return (
    <div className="ui-card ui-card--pad ui-stack">
      <fieldset className="ui-checks">
        <legend>Gerätetyp</legend>
        {(["own", "board"] as const).map((type) => (
          <label key={type}>
            <input
              type="radio"
              name={name}
              checked={device === type}
              onChange={() => onChangeDevice(type)}
            />
            <span>
              {TEACHER_DEVICE_LABELS[type]}
              <span className="ui-small ui-muted"> · {OPTION_HINT[type]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {offer ? (
        <PersonalDataOffer
          data={offer}
          busy={offerBusy}
          error={offerError}
          onDelete={onDeleteData}
          onKeep={onKeepData}
        />
      ) : null}

      {device === "own" ? (
        <section className="ui-stack" aria-label="PIN-Sperre">
          <h3 className="ui-label">PIN-Sperre</h3>
          <p className="ui-small">
            Klassen, Aufgaben und diese Einstellungen verlangen nach dem Start
            und nach 15 Minuten ohne Nutzung die PIN.
          </p>
          <Notice>{PIN_LOCK_NOTICE}</Notice>
          {!pinSet || editingPin ? (
            <PinSetupForm
              submitLabel={pinSet ? "PIN ändern" : "PIN festlegen"}
              onSave={async (pin) => {
                const failure = await onSavePin(pin);
                if (!failure) setEditingPin(false);
                return failure;
              }}
              {...(pinSet ? { onCancel: () => setEditingPin(false) } : {})}
            />
          ) : (
            <div className="ui-row ui-wrap">
              <Button variant="soft" onClick={() => setEditingPin(true)}>
                PIN ändern
              </Button>
              <Button variant="ghost" onClick={onRemovePin}>
                Sperre ausschalten
              </Button>
            </div>
          )}
        </section>
      ) : device === "board" ? (
        <p className="ui-small ui-muted">
          Die PIN-Sperre gibt es nur auf „Mein Gerät“. Auf der Tafel liegen
          keine Personendaten.
        </p>
      ) : null}

      {message ? (
        <p className="ui-small" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
