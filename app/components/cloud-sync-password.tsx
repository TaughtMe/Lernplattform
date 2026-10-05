"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "../ui/primitives";

export const MIN_PASSWORD_LENGTH = 12;

/**
 * Merkt das Passwort im Passwortmanager des Browsers, wo die Credential
 * Management API vorhanden ist (Chromium). Sonst greifen allein die
 * Formularregeln; das Speichern selbst entscheidet der Manager.
 */
export async function offerToStorePassword(
  id: string,
  password: string,
  name: string,
) {
  try {
    const Credential = (
      window as unknown as {
        PasswordCredential?: new (data: {
          id: string;
          password: string;
          name: string;
        }) => Credential;
      }
    ).PasswordCredential;
    if (Credential && navigator.credentials?.store) {
      await navigator.credentials.store(new Credential({ id, password, name }));
    }
  } catch {
    // Ohne Passwortmanager bleibt alles beim Alten.
  }
}

export type PasswordMode =
  /** Neues Passwort festlegen (zweimal). */
  | "create"
  /** Vorhandenes Passwort eingeben (zweites Gerät, Entsperren). */
  | "enter";

/**
 * Passwortformular für den Abgleich, so gebaut, dass Passwortmanager es
 * erkennen: echtes `<form>`, sichtbarer fester Benutzername, passende
 * `autocomplete`-Werte, Mindestlänge ohne Pflicht-Zeichenklassen, Einfügen
 * erlaubt. Nach Erfolg verschwindet das Formular (der Aufrufer wechselt den
 * Schritt), bei falschem Passwort bleibt es stehen.
 */
export function SyncPasswordForm({
  mode,
  account,
  submitLabel,
  onSubmit,
  extra,
}: {
  mode: PasswordMode;
  /** Beschriftung des Kontos, z. B. „lea@cloud.schule.de“. */
  account: string;
  submitLabel: string;
  /** Gibt eine Fehlermeldung zurück, sonst `undefined` bei Erfolg. */
  onSubmit: (password: string) => Promise<string | undefined>;
  /** Weitere Felder im selben Formular (z. B. WebDAV-Passwort). */
  extra?: React.ReactNode;
}) {
  const id = useId();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const creating = mode === "create";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (creating) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(
          `Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`,
        );
        return;
      }
      if (password !== repeat) {
        setError("Die beiden Passwörter sind nicht gleich.");
        return;
      }
    } else if (!password) {
      setError("Bitte das Passwort eingeben.");
      return;
    }
    setBusy(true);
    setError("");
    const problem = await onSubmit(password);
    setBusy(false);
    if (problem) setError(problem);
  }

  const type = visible ? "text" : "password";
  const username = `Lernraum-Abgleich · ${account}`;
  return (
    <form className="ui-stack" onSubmit={(event) => void submit(event)}>
      <label className="ui-labeled">
        Benutzername
        <input
          className="ui-input"
          name="username"
          type="text"
          autoComplete="username"
          readOnly
          value={username}
        />
      </label>
      <label className="ui-labeled">
        {creating ? "Neues Passwort" : "Passwort"}
        <input
          className="ui-input"
          name="password"
          type={type}
          autoComplete={creating ? "new-password" : "current-password"}
          minLength={creating ? MIN_PASSWORD_LENGTH : undefined}
          {...(creating ? { passwordrules: "minlength: 12;" } : {})}
          value={password}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {creating ? (
        <label className="ui-labeled">
          Passwort wiederholen
          <input
            className="ui-input"
            name="password-repeat"
            type={type}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
          />
        </label>
      ) : null}
      <label className="ui-row">
        <input
          type="checkbox"
          checked={visible}
          onChange={(event) => setVisible(event.target.checked)}
        />
        Passwort anzeigen
      </label>
      {extra}
      {error ? (
        <p id={`${id}-error`} className="ui-notice ui-notice--bad" role="alert">
          {error}
        </p>
      ) : null}
      <div className="ui-row ui-wrap">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
