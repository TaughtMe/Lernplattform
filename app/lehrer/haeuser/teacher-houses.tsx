"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type {
  ClassMember,
  TeacherClass,
} from "../../../src/domain/class-enrollment";
import {
  acceptHouseLetter,
  houseById,
  houseStandings,
  HOUSES,
  isoWeek,
  parseHouseLetterCode,
  verifyHouseLetter,
  type HouseInbox,
  type HouseScanStatus,
} from "../../../src/domain/houses";
import {
  clearHouseInbox,
  readHouseInbox,
  subscribeHouse,
  writeHouseInbox,
  type HouseScanLogEntry,
} from "../../../src/storage/house";
import { createTeacherClassRepository } from "../../../src/storage/teacher-class-settings";
import { QrCodeScanner } from "../../components/qr-code-scanner";
import { useIsDark } from "../../haus/house-app";
import { Towers } from "../../haus/towers";
import { Icon } from "../../ui/icons";
import { Button, Card, Pill } from "../../ui/primitives";

const STATUS_TEXT: Record<HouseScanStatus, string> = {
  neu: "übernommen",
  aktualisiert: "aktualisiert",
  doppelt: "schon da",
  veraltet: "älterer Stand",
  klassenfremd: "andere Klasse",
  unbekannt: "nicht eingeschrieben",
  ungueltig: "ungültig",
};
const EMPTY_INBOX: { letters: HouseInbox; log: HouseScanLogEntry[] } = {
  letters: {},
  log: [],
};

/** Lehrkraft (Design 7c): Häuser für den Beamer, Haus-Leistungsbriefe im fortlaufenden Scanmodus. */
export function TeacherHouses() {
  const dark = useIsDark();
  const [classes, setClasses] = useState<TeacherClass[] | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [manual, setManual] = useState("");
  const [frame, setFrame] = useState<"ok" | "bad" | null>(null);
  const [beamer, setBeamer] = useState(false);
  const repository = useState(() => createTeacherClassRepository())[0];

  useEffect(() => {
    let cancelled = false;
    repository
      .list()
      .then((list) => {
        if (!cancelled) {
          setClasses(list);
          setClassId((id) => id ?? list[0]?.id ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setClasses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    repository
      .listMembers(classId)
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [classId, repository]);

  const inbox = useSyncExternalStore(
    subscribeHouse,
    () => (classId ? readHouseInbox(classId) : EMPTY_INBOX),
    () => EMPTY_INBOX,
  );

  const week = isoWeek(new Date());
  const standings = houseStandings(inbox.letters, week);
  const delivered = Object.values(inbox.letters).filter(
    (l) => l.week === week,
  ).length;
  const best = [...standings].sort((a, b) => b.perHead - a.perHead)[0];
  const towers = standings.map((h) => ({
    id: h.id,
    name: h.name,
    hue: h.hue,
    animal: h.animal,
    perHead: h.perHead,
    active: `${h.active} aktiv`,
  }));
  const currentClass = classes?.find((c) => c.id === classId) ?? null;

  const feedback = useCallback((ok: boolean) => {
    try {
      navigator.vibrate?.(ok ? 60 : [40, 40, 40]);
    } catch {
      /* ohne Vibration */
    }
    setFrame(ok ? "ok" : "bad");
    window.setTimeout(() => setFrame(null), 900);
  }, []);

  const handle = useCallback(
    async (raw: string) => {
      if (!classId) return;
      const at = new Date().toISOString();
      let entry: HouseScanLogEntry;
      try {
        const letter = parseHouseLetterCode(raw);
        const member = members.find((m) => m.id === letter.membershipId);
        if (letter.classId !== classId) {
          entry = {
            alias: "Unbekannt",
            house: houseById(letter.house).name,
            status: "klassenfremd",
            at,
          };
        } else if (!member) {
          entry = {
            alias: "Unbekannt",
            house: houseById(letter.house).name,
            status: "unbekannt",
            at,
          };
        } else if (!(await verifyHouseLetter(letter, member.enrollmentToken))) {
          entry = {
            alias: member.displayName,
            house: houseById(letter.house).name,
            status: "ungueltig",
            at,
          };
        } else {
          const current = readHouseInbox(classId).letters;
          const result = acceptHouseLetter(current, letter, classId);
          entry = {
            alias: member.displayName,
            house: houseById(letter.house).name,
            status: result.status,
            at,
          };
          writeHouseInbox(classId, result.inbox, entry);
          feedback(result.status === "neu" || result.status === "aktualisiert");
          return;
        }
      } catch {
        entry = {
          alias: "Unbekannter Code",
          house: "–",
          status: "ungueltig",
          at,
        };
      }
      writeHouseInbox(classId, readHouseInbox(classId).letters, entry);
      feedback(false);
    },
    [classId, members, feedback],
  );

  if (classes && classes.length === 0) {
    return (
      <section className="ui ui-page" aria-labelledby="houses-title">
        <h1 id="houses-title" className="ui-h-page">
          Häuser
        </h1>
        <p className="ui-notice">
          Lege zuerst unter{" "}
          <Link className="ui-house__link" href="/lehrer/klassen">
            Klassen
          </Link>{" "}
          eine Klasse an und schreibe die Schüler ein. Ihre Haus-Leistungsbriefe
          werden mit dem persönlichen Einschreibe-Schlüssel geprüft.
        </p>
      </section>
    );
  }

  if (beamer) {
    return (
      <section
        className="ui ui-page ui-dots"
        style={{ minHeight: "80dvh" }}
        aria-labelledby="houses-title"
      >
        <div className="ui-between ui-wrap">
          <h1 id="houses-title" className="ui-h-fun">
            Häuser · {currentClass?.name} · Woche {week.slice(-2)}
          </h1>
          <Button variant="ghost" onClick={() => setBeamer(false)}>
            Beamer-Ansicht schließen
          </Button>
        </div>
        <Card look="pop" style={{ padding: 24 }}>
          <Towers houses={towers} dark={dark} size="l" height={480} />
        </Card>
      </section>
    );
  }

  return (
    <section className="ui ui-page" aria-labelledby="houses-title">
      <div className="ui-row ui-wrap">
        <div
          className="ui-stack ui-grow"
          style={{ ["--gap" as string]: "2px" }}
        >
          <h1 id="houses-title" className="ui-h-page">
            Häuser{currentClass ? ` · ${currentClass.name}` : ""}
          </h1>
          <p className="ui-small ui-muted">
            Woche {week.slice(-2)} · Stand liegt nur auf diesem Gerät · keine
            Einzelrangliste
          </p>
        </div>
        {classes && classes.length > 1 ? (
          <label className="ui-row ui-label">
            Klasse
            <select
              className="ui-input"
              value={classId ?? ""}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button variant="ghost" onClick={() => setBeamer(true)}>
          <Icon name="beamer" size={20} />
          Beamer-Ansicht
        </Button>
      </div>

      <div className="ui-house__grid">
        <Card
          look="pop"
          className="ui-stack ui-dots"
          aria-labelledby="standing"
        >
          <div className="ui-between">
            <h2 id="standing" className="ui-h-section">
              Stand der Häuser
            </h2>
            {best && best.perHead > 0 ? (
              <Pill tone="good">Vorne: {best.name}</Pill>
            ) : null}
          </div>
          <Towers houses={towers} dark={dark} size="m" height={360} />
          {!delivered ? (
            <p className="ui-small ui-muted">
              Noch keine Leistungsbriefe diese Woche. Schüler öffnen „Mein Haus“
              → „Leistungsbrief an Lehrkraft“.
            </p>
          ) : null}
        </Card>
        <div className="ui-stack">
          <Card look="dark" className="ui-stack" aria-labelledby="letters">
            <div className="ui-between">
              <h2 id="letters" className="ui-h-section">
                Leistungsbriefe
              </h2>
              <span className="ui-fun" style={{ color: "var(--nav-accent)" }}>
                {delivered} / {members.length || "?"}
              </span>
            </div>
            <div className="ui-house__scan" data-state={frame ?? undefined}>
              <QrCodeScanner
                continuous
                onResult={(value) => void handle(value)}
              />
            </div>
            <form
              className="ui-row ui-on-dark"
              onSubmit={(e) => {
                e.preventDefault();
                if (manual.trim()) {
                  void handle(manual.trim());
                  setManual("");
                }
              }}
            >
              <input
                className="ui-input"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Code einfügen (lernraum:house:…)"
                aria-label="Haus-Leistungsbrief einfügen"
              />
              <Button type="submit" variant="gold" size="sm">
                Prüfen
              </Button>
            </form>
          </Card>
          <Card look="pop" className="ui-stack" aria-labelledby="recent">
            <h2 id="recent" className="ui-eyebrow">
              Zuletzt
            </h2>
            {inbox.log.length ? (
              inbox.log.slice(0, 6).map((c, i) => (
                <div key={`${c.at}-${i}`} className="ui-house__log">
                  <span
                    className="ui-house__dot"
                    style={{
                      background: `oklch(0.7 0.14 ${HOUSES.find((h) => h.name === c.house)?.hue ?? 70})`,
                    }}
                  />
                  <span className="ui-grow">
                    <strong className="ui-small">{c.alias}</strong>
                    <span
                      className="ui-tiny ui-muted"
                      style={{ display: "block" }}
                    >
                      {c.house} ·{" "}
                      {new Date(c.at).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <Pill
                    tone={
                      c.status === "neu" || c.status === "aktualisiert"
                        ? "good"
                        : "accent"
                    }
                  >
                    {STATUS_TEXT[c.status]}
                  </Pill>
                </div>
              ))
            ) : (
              <p className="ui-small ui-muted">Noch nichts gescannt.</p>
            )}
            {(inbox.log.length || delivered) && classId ? (
              <Button
                variant="bad"
                size="sm"
                onClick={() => {
                  if (
                    window.confirm(
                      "Abgabeprotokoll und Wochenstand dieser Klasse löschen?",
                    )
                  )
                    clearHouseInbox(classId);
                }}
              >
                Protokoll löschen
              </Button>
            ) : null}
          </Card>
        </div>
      </div>
    </section>
  );
}
