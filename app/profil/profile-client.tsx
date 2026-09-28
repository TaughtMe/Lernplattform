"use client";

import { useRef, useState } from "react";
import { ANIMALS, animalName, type AnimalId } from "@/src/domain/animals";
import { HOUSES, houseById, type HouseId } from "@/src/domain/houses";
import { decodeEnrollment } from "@/src/domain/enrollment";
import { exportArea, importArea } from "@/src/storage/local-store";
import { Animal } from "../components/animal";
import { Icon } from "../components/icons";
import { QrScanner, qrScanSupported } from "../components/qr-scanner";
import { ThemeToggle } from "../components/theme-toggle";
import { usePersonal } from "../hooks/use-personal";

/** Profil: Tier tauschen, Haus, Datensicherung als Datei (Konzept 14). */
export function ProfileClient() {
  const { profile, setProfile } = usePersonal();
  const [message, setMessage] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [scan, setScan] = useState(false);
  const enroll = (raw: string) => {
    const e = decodeEnrollment(raw);
    if (!e) { setJoinMsg("Das ist kein Klassen-Code."); return; }
    setProfile({ ...profile, classId: e.c, className: e.n, house: e.h });
    setJoinMsg(`Du bist jetzt in ${e.n}, Haus ${houseById(e.h).name}.`);
    setScan(false); setJoinCode("");
  };
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const data = { format: "lernraum-personal", version: 1, exportedAt: new Date().toISOString(), data: exportArea("personal") };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lernraum-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Sicherung gespeichert. Bewahre die Datei gut auf – sie enthält deinen Lernstand.");
  };

  const restore = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.format !== "lernraum-personal" || typeof parsed.data !== "object") throw new Error("format");
      importArea("personal", parsed.data);
      setMessage("Lernstand wiederhergestellt.");
    } catch {
      setMessage("Diese Datei ist keine gültige Lernraum-Sicherung.");
    }
  };

  return (
    <main className="page page-wide" style={{ maxWidth: 900 }}>
      <div className="between">
        <h1 className="h-page">Profil</h1>
        <ThemeToggle />
      </div>

      <section className="card card-pad stack" style={{ alignItems: "center" }}>
        <Animal id={profile.animal} size={140} />
        <p style={{ fontSize: 21, fontWeight: 700 }}>{animalName(profile.animal)}</p>
        <p className="small muted center">Dein Tier ist dein Name im Raum. Es verrät nichts über dich.</p>
      </section>

      <section className="stack">
        <h2 className="label">Tier tauschen</h2>
        <div className="picker">
          {(Object.keys(ANIMALS) as AnimalId[]).map((id) => (
            <button key={id} type="button" aria-pressed={profile.animal === id} aria-label={ANIMALS[id]} title={ANIMALS[id]} onClick={() => setProfile({ ...profile, animal: id })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/animals/${id}.svg`} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </section>

      <section className="card card-pad stack">
        <h2 className="h-section">Klasse beitreten</h2>
        <p className="small muted">Aktuell: <strong>{profile.className}</strong>. Scanne den Einschreibe-Code deiner Lehrkraft. Es wird kein Name übertragen.</p>
        {scan && qrScanSupported() ? <QrScanner onCode={enroll} /> : null}
        <form className="row wrap" onSubmit={(e) => { e.preventDefault(); enroll(joinCode); }}>
          {qrScanSupported() ? <button type="button" className="btn btn-green btn-sm" onClick={() => setScan((s) => !s)}><Icon name="camera" size={18} />{scan ? "Kamera aus" : "Code scannen"}</button> : null}
          <input className="input grow" style={{ minWidth: 180 }} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="oder Code einfügen (LRK1:…)" aria-label="Klassen-Code" />
          <button type="submit" className="btn btn-ghost btn-sm">Beitreten</button>
        </form>
        {joinMsg ? <p className="notice" role="status">{joinMsg}</p> : null}
      </section>

      <section className="stack">
        <h2 className="label">Mein Haus</h2>
        <div className="grid2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
          {HOUSES.map((h) => (
            <button key={h.id} type="button" className="select-card" aria-pressed={profile.house === h.id} onClick={() => setProfile({ ...profile, house: h.id as HouseId })}>
              <span className="row"><Animal id={h.animal} size={36} label={false} /><strong>{h.name}</strong></span>
            </button>
          ))}
        </div>
        <p className="tiny muted">Normalerweise teilt die Lehrkraft das Haus beim Einschreiben zu.</p>
      </section>

      <section className="card card-pad stack">
        <h2 className="h-section">Deine Daten</h2>
        <p className="small muted">Dein Lernstand liegt nur auf diesem Gerät. Mit einer Sicherungsdatei kannst du ihn auf ein anderes Gerät mitnehmen.</p>
        <div className="row wrap">
          <button type="button" className="btn btn-primary btn-sm" onClick={download}><Icon name="download" size={18} />Sicherung herunterladen</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Sicherung einspielen</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = ""; }} />
        </div>
        {message ? <p className="notice" role="status">{message}</p> : null}
      </section>
    </main>
  );
}
