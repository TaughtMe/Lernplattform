"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { TeacherService, ClassRankingEntry, HouseRankingEntry } from "../../../src/klasse/klasse-service.ts";
import type { ClassV1, StudentV1 } from "../../../src/klasse/roster.ts";
import type { HouseV1 } from "../../../src/klasse/haus.ts";
import type { RankingScanResult } from "../../../src/klasse/ranking-submission.ts";
import { playScanFeedback } from "../../../src/klasse/scan-feedback.ts";
import { ContinuousQrScannerOverlay, type ScanFeedback } from "./continuous-qr-scanner-overlay.tsx";

function feedbackFor(result: RankingScanResult): ScanFeedback {
  switch (result.status) {
    case "abgegeben":
      return { ok: true, label: `✓ ${result.alias} · Rankingbeitrag übernommen` };
    case "doppelt":
      return { ok: true, label: `${result.alias} · schon aktuell` };
    case "veraltet":
      return { ok: false, label: `${result.alias} · veralteter Stand` };
    case "ungueltig":
      return { ok: false, label: "Ungültiger Code" };
  }
}

interface Props {
  service: TeacherService;
  classes: ClassV1[];
  onAddClass: (name: string) => Promise<ClassV1>;
}

export function HausPunkte({ service, classes, onAddClass }: Props) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentV1[]>([]);
  const [houses, setHouses] = useState<HouseV1[]>([]);
  const [classRanking, setClassRanking] = useState<ClassRankingEntry[]>([]);
  const [houseRanking, setHouseRanking] = useState<HouseRankingEntry[]>([]);

  const [newClassName, setNewClassName] = useState("");
  const [newHouseName, setNewHouseName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);

  const refresh = useCallback(
    (classId: string) => {
      service.listStudents(classId).then(setStudents);
      service.listHouses(classId).then(setHouses);
      service.getClassRanking(classId).then(setClassRanking);
      service.getHouseRanking(classId).then(setHouseRanking);
    },
    [service],
  );

  const [lastLoadedClassId, setLastLoadedClassId] = useState<string | null | undefined>(undefined);
  if (selectedClassId !== lastLoadedClassId) {
    setLastLoadedClassId(selectedClassId);
    setStudents([]);
    setHouses([]);
    setClassRanking([]);
    setHouseRanking([]);
  }

  useEffect(() => {
    if (selectedClassId) refresh(selectedClassId);
  }, [selectedClassId, refresh]);

  async function handleAddClass(event: FormEvent) {
    event.preventDefault();
    const name = newClassName.trim();
    if (!name) return;
    const klasse = await onAddClass(name);
    setNewClassName("");
    setSelectedClassId(klasse.id);
  }

  async function handleAddHouse(event: FormEvent) {
    event.preventDefault();
    if (!selectedClassId) return;
    const name = newHouseName.trim();
    if (!name) return;
    await service.addHouse(selectedClassId, name);
    setNewHouseName("");
    refresh(selectedClassId);
  }

  async function handleAssignHouse(studentId: string, houseId: string) {
    await service.assignStudentHouse(studentId, houseId || undefined);
    if (selectedClassId) refresh(selectedClassId);
  }

  const handleScan = useCallback(
    (encoded: string) => {
      if (!selectedClassId) return;
      service.scanRanking(selectedClassId, encoded).then((result) => {
        const feedback = feedbackFor(result);
        setScanFeedback(feedback);
        playScanFeedback(feedback.ok);
        if (result.status === "abgegeben") refresh(selectedClassId);
      });
    },
    [service, selectedClassId, refresh],
  );

  const totalPoints = classRanking.reduce((sum, entry) => sum + entry.points, 0);

  return (
    <div className="haus-punkte">
      <h2>Häuser &amp; Punkte</h2>

      <div className="haus-punkte__class-picker">
        <label htmlFor="haus-class-select">Klasse</label>
        <select id="haus-class-select" value={selectedClassId ?? ""} onChange={(e) => setSelectedClassId(e.target.value || null)}>
          <option value="">— auswählen —</option>
          {classes.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
        <form className="haus-punkte__inline-form" onSubmit={handleAddClass}>
          <input value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Neue Klasse, z. B. 6b" required />
          <button className="button button--secondary" type="submit">Anlegen</button>
        </form>
      </div>

      {selectedClassId && (
        <>
          <section className="haus-punkte__section">
            <h3>Häuser</h3>
            <ul className="haus-punkte__house-list">
              {houses.map((house) => (
                <li key={house.id}>{house.name}</li>
              ))}
              {houses.length === 0 && <li className="haus-punkte__empty">Noch kein Haus angelegt.</li>}
            </ul>
            <form className="haus-punkte__inline-form" onSubmit={handleAddHouse}>
              <input value={newHouseName} onChange={(e) => setNewHouseName(e.target.value)} placeholder="Neues Haus, z. B. Feuer" required />
              <button className="button button--secondary" type="submit">Anlegen</button>
            </form>
          </section>

          <section className="haus-punkte__section">
            <h3>Schüler:innen zuordnen</h3>
            <ul className="haus-punkte__roster">
              {students.map((student) => (
                <li key={student.id}>
                  <span>{student.alias}</span>
                  <select value={student.houseId ?? ""} onChange={(e) => handleAssignHouse(student.id, e.target.value)}>
                    <option value="">— kein Haus —</option>
                    {houses.map((house) => (
                      <option key={house.id} value={house.id}>{house.name}</option>
                    ))}
                  </select>
                </li>
              ))}
              {students.length === 0 && <li className="haus-punkte__empty">Noch keine Schüler:innen in dieser Klasse.</li>}
            </ul>
          </section>

          <section className="haus-punkte__section">
            <div className="haus-punkte__section-heading">
              <h3>Haus-Rangliste</h3>
              <button className="button button--primary" type="button" onClick={() => { setScanFeedback(null); setScanning(true); }}>
                Rankingbeitrag scannen
              </button>
            </div>
            <p className="haus-punkte__total">{totalPoints} Punkte insgesamt in dieser Klasse</p>
            <ul className="haus-punkte__ranking">
              {[...houseRanking].sort((a, b) => b.points - a.points).map((entry) => (
                <li key={entry.house.id} className="haus-punkte__ranking-item">
                  <div className="haus-punkte__ranking-heading">
                    <strong>{entry.house.name}</strong>
                    <span>{entry.points} Punkte</span>
                  </div>
                  <ul className="haus-punkte__missions">
                    {entry.missions.map((mission) => {
                      const pct = Math.min(100, Math.round((mission.current / mission.target) * 100));
                      return (
                        <li key={mission.id} className={mission.completed ? "is-complete" : ""}>
                          <div className="haus-punkte__mission-heading">
                            <span>{mission.title}</span>
                            <span>{mission.current} / {mission.target}</span>
                          </div>
                          <div className="haus-punkte__mission-bar">
                            <div className="haus-punkte__mission-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
              {houseRanking.length === 0 && <li className="haus-punkte__empty">Noch keine Häuser angelegt.</li>}
            </ul>
          </section>
        </>
      )}

      {scanning && selectedClassId && (
        <ContinuousQrScannerOverlay
          onScan={handleScan}
          onClose={() => setScanning(false)}
          feedback={scanFeedback}
          statusLine={`${totalPoints} Punkte insgesamt`}
        />
      )}
    </div>
  );
}
