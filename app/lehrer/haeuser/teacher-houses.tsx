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
import { BeamerIcon } from "../../components/ui-icons";
import { useIsDark } from "../../haus/house-app";
import { Towers } from "../../haus/towers";
import "../../haus/house-ui.css";

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
      <section className="lr-house">
        <h1 className="lr-h1">Häuser</h1>
        <p className="lr-card">
          Lege zuerst unter{" "}
          <Link
            href="/lehrer/klassen"
            style={{ color: "var(--accent)", fontWeight: 700 }}
          >
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
      <section className="lr-house" style={{ minHeight: "80dvh" }}>
        <div className="lr-between">
          <h1 className="lr-h1">
            Häuser · {currentClass?.name} · Woche {week.slice(-2)}
          </h1>
          <button
            type="button"
            className="lr-btn lr-btn--ghost"
            onClick={() => setBeamer(false)}
          >
            Beamer-Ansicht schließen
          </button>
        </div>
        <div className="lr-card" style={{ padding: 24 }}>
          <Towers houses={towers} dark={dark} size="l" height={480} />
        </div>
      </section>
    );
  }

  return (
    <section className="lr-house" aria-labelledby="houses-title">
      <div className="lr-row" style={{ flexWrap: "wrap" }}>
        <div className="lr-stack lr-grow" style={{ gap: 2 }}>
          <h1 id="houses-title" className="lr-h1">
            Häuser{currentClass ? ` · ${currentClass.name}` : ""}
          </h1>
          <span className="lr-small lr-muted">
            Woche {week.slice(-2)} · Stand liegt nur auf diesem Gerät · keine
            Einzelrangliste
          </span>
        </div>
        {classes && classes.length > 1 ? (
          <label className="lr-row lr-small">
            Klasse
            <select
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
        <button
          type="button"
          className="lr-btn lr-btn--ghost"
          onClick={() => setBeamer(true)}
        >
          <BeamerIcon aria-hidden="true" />
          Beamer-Ansicht
        </button>
      </div>

      <div className="lr-house-grid">
        <div
          className="lr-card lr-stack"
          style={{ borderRadius: 26, padding: "20px 24px" }}
        >
          <div className="lr-between">
            <span className="lr-fun" style={{ fontSize: 19 }}>
              Stand der Häuser
            </span>
            {best && best.perHead > 0 ? (
              <span className="lr-pill lr-pill--good">Vorne: {best.name}</span>
            ) : null}
          </div>
          <Towers houses={towers} dark={dark} size="m" height={360} />
          {!delivered ? (
            <p className="lr-small lr-muted" style={{ margin: 0 }}>
              Noch keine Leistungsbriefe diese Woche. Schüler öffnen „Mein Haus“
              → „Leistungsbrief an Lehrkraft“.
            </p>
          ) : null}
        </div>
        <div className="lr-stack" style={{ gap: 14 }}>
          <div className="lr-card lr-card--dark lr-stack">
            <div className="lr-between">
              <span className="lr-fun" style={{ fontSize: 17 }}>
                Leistungsbriefe
              </span>
              <span className="lr-fun" style={{ color: "var(--nav-accent)" }}>
                {delivered} / {members.length || "?"}
              </span>
            </div>
            <div className="lr-scan" data-state={frame ?? undefined}>
              <QrCodeScanner
                continuous
                onResult={(value) => void handle(value)}
              />
            </div>
            <form
              className="lr-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (manual.trim()) {
                  void handle(manual.trim());
                  setManual("");
                }
              }}
            >
              <input
                className="lr-input"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Code einfügen (lernraum:house:…)"
                aria-label="Haus-Leistungsbrief einfügen"
              />
              <button
                type="submit"
                className="lr-btn lr-btn--gold"
                style={{ minHeight: 42 }}
              >
                Prüfen
              </button>
            </form>
          </div>
          <div className="lr-card lr-stack" style={{ gap: 8 }}>
            <span
              className="lr-tiny lr-muted"
              style={{ letterSpacing: ".1em", textTransform: "uppercase" }}
            >
              Zuletzt
            </span>
            {inbox.log.length ? (
              inbox.log.slice(0, 6).map((c, i) => (
                <div
                  key={`${c.at}-${i}`}
                  className="lr-row"
                  style={{ minHeight: 38 }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      flex: "none",
                      borderRadius: "50%",
                      background: `oklch(0.7 0.14 ${HOUSES.find((h) => h.name === c.house)?.hue ?? 70})`,
                    }}
                  />
                  <span className="lr-stack lr-grow" style={{ gap: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {c.alias}
                    </span>
                    <span
                      className="lr-tiny lr-muted"
                      style={{ fontWeight: 500 }}
                    >
                      {c.house} ·{" "}
                      {new Date(c.at).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <span
                    className={`lr-pill ${c.status === "neu" || c.status === "aktualisiert" ? "lr-pill--good" : "lr-pill--accent"}`}
                  >
                    {STATUS_TEXT[c.status]}
                  </span>
                </div>
              ))
            ) : (
              <p className="lr-small lr-muted" style={{ margin: 0 }}>
                Noch nichts gescannt.
              </p>
            )}
            {(inbox.log.length || delivered) && classId ? (
              <button
                type="button"
                className="lr-btn lr-btn--ghost"
                style={{ minHeight: 38, color: "var(--bad)" }}
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
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
