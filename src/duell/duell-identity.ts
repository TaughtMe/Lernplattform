// Merkt sich die Teilnehmer-Identität dieses Geräts für EIN Duell in
// sessionStorage (bewusst nicht localStorage — ein frischer Tab startet mit
// einer frischen Identität), unter dem vierstelligen Code als Schlüssel --
// genau wie ../laufdiktat/room-identity.ts: der Code ist beim erneuten
// Eintippen bekannt, die Duell-ID (erst nach dem Beitritt) noch nicht.
// Erlaubt einen manuellen Rejoin (z. B. nach Neuladen der Seite), ohne ein
// zweites Teilnehmer-Profil anzulegen.
const CODE_KEY = "duellCode";
const ALIAS_KEY = "duellAlias";
const TOKEN_KEY = "duellParticipantToken";

export interface DuellIdentity {
  alias: string;
  participantToken: string;
}

export function saveDuellIdentity(code: string, alias: string, participantToken: string): void {
  try {
    sessionStorage.setItem(CODE_KEY, code);
    sessionStorage.setItem(ALIAS_KEY, alias);
    sessionStorage.setItem(TOKEN_KEY, participantToken);
  } catch {
    // private browsing etc. — not fatal
  }
}

/** Liest die gemerkte Identität für genau diesen Duell-Code. */
export function readDuellIdentity(code: string): DuellIdentity | null {
  try {
    if (sessionStorage.getItem(CODE_KEY) !== code) return null;
    const alias = sessionStorage.getItem(ALIAS_KEY);
    const participantToken = sessionStorage.getItem(TOKEN_KEY);
    if (!alias || !participantToken) return null;
    return { alias, participantToken };
  } catch {
    return null;
  }
}

export function clearDuellIdentity(): void {
  try {
    sessionStorage.removeItem(CODE_KEY);
    sessionStorage.removeItem(ALIAS_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}
