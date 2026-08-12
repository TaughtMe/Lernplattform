"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CLASS_MODULE_LABELS,
  type ClassModule,
} from "../../src/domain/class-workspace";
import { demoClass } from "../../src/domain/demo-class";
import {
  createTeacherAssignmentDraft,
  markAssignmentReady,
  type AssignmentPlacement,
  type TeacherAssignmentDraft,
} from "../../src/domain/teacher-assignment";
import { createTeacherAssignmentRepository } from "../../src/storage/teacher-assignments";
import {
  createTeacherClassSettingsRepository,
  TEACHER_CLASS_SETTINGS_UPDATED_EVENT,
} from "../../src/storage/teacher-class-settings";

const placementLabels: Record<AssignmentPlacement, string> = {
  today: "Heute üben",
  assignments: "Aufgaben",
};

function createLocalAssignmentId() {
  return `assignment-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

export function TeacherAssignmentManager() {
  const repository = useMemo(() => createTeacherAssignmentRepository(), []);
  const settingsRepository = useMemo(
    () => createTeacherClassSettingsRepository(),
    [],
  );
  const [assignments, setAssignments] = useState<TeacherAssignmentDraft[]>([]);
  const [enabledModules, setEnabledModules] = useState<ClassModule[]>([
    ...demoClass.enabledModules,
  ]);
  const [module, setModule] = useState<ClassModule>("vocabulary");
  const [placement, setPlacement] =
    useState<AssignmentPlacement>("assignments");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    repository
      .listForClass(demoClass.id)
      .then((stored) => {
        if (active) setAssignments(stored);
      })
      .catch(() => {
        if (active)
          setMessage("Aufgabenentwürfe konnten nicht geladen werden.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    let active = true;

    settingsRepository
      .get(demoClass.id)
      .then((settings) => {
        if (!active || !settings) return;
        setEnabledModules(settings.enabledModules);
        setModule((current) =>
          settings.enabledModules.includes(current)
            ? current
            : (settings.enabledModules[0] ?? current),
        );
      })
      .catch(() => undefined);

    function updateModules(event: Event) {
      const detail = (
        event as CustomEvent<{
          classId: string;
          enabledModules: ClassModule[];
        }>
      ).detail;
      if (detail.classId !== demoClass.id) return;
      setEnabledModules(detail.enabledModules);
      setModule((current) =>
        detail.enabledModules.includes(current)
          ? current
          : (detail.enabledModules[0] ?? current),
      );
    }

    window.addEventListener(
      TEACHER_CLASS_SETTINGS_UPDATED_EVENT,
      updateModules,
    );
    return () => {
      active = false;
      window.removeEventListener(
        TEACHER_CLASS_SETTINGS_UPDATED_EVENT,
        updateModules,
      );
    };
  }, [settingsRepository]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const now = new Date().toISOString();
      const draft = createTeacherAssignmentDraft({
        id: createLocalAssignmentId(),
        classId: demoClass.id,
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        module: String(formData.get("module") ?? module) as ClassModule,
        placement: String(
          formData.get("placement") ?? placement,
        ) as AssignmentPlacement,
        dueLabel: String(formData.get("dueLabel") ?? ""),
        now,
      });
      await repository.put(draft);
      setAssignments((current) => [draft, ...current]);
      form.reset();
      setModule(enabledModules[0] ?? "vocabulary");
      setPlacement("assignments");
      setMessage("Entwurf gespeichert.");
    } catch {
      setMessage("Bitte gib einen Titel und eine kurze Beschreibung ein.");
    }
  }

  async function setReady(assignment: TeacherAssignmentDraft) {
    try {
      const ready = markAssignmentReady(assignment, new Date().toISOString());
      await repository.put(ready);
      setAssignments((current) =>
        current.map((item) => (item.id === ready.id ? ready : item)),
      );
      setMessage(`„${ready.title}“ ist zur Veröffentlichung vorbereitet.`);
    } catch {
      setMessage("Der Entwurf konnte nicht aktualisiert werden.");
    }
  }

  async function remove(id: string) {
    try {
      await repository.remove(id);
      setAssignments((current) => current.filter((item) => item.id !== id));
      setMessage("Entwurf gelöscht.");
    } catch {
      setMessage("Der Entwurf konnte nicht gelöscht werden.");
    }
  }

  return (
    <section
      className="assignment-manager"
      aria-labelledby="assignment-manager-title"
    >
      <div className="assignment-manager__heading">
        <div>
          <p className="eyebrow">Unterricht planen</p>
          <h2 id="assignment-manager-title">Aufgabe anlegen</h2>
        </div>
        <span>Für {demoClass.name}</span>
      </div>

      <div className="assignment-manager__layout">
        <form className="assignment-form" onSubmit={submit} noValidate>
          <label htmlFor="assignment-title">Titel</label>
          <input
            id="assignment-title"
            name="title"
            placeholder="z. B. School words · Teil 2"
          />

          <label htmlFor="assignment-description">Kurze Arbeitsanweisung</label>
          <textarea
            id="assignment-description"
            name="description"
            placeholder="Was sollen die Schüler bearbeiten?"
            rows={3}
          />

          <div className="assignment-form__row">
            <div>
              <label htmlFor="assignment-module">Modul</label>
              <select
                id="assignment-module"
                name="module"
                value={module}
                onChange={(event) =>
                  setModule(event.target.value as ClassModule)
                }
              >
                {enabledModules.map((item) => (
                  <option value={item} key={item}>
                    {CLASS_MODULE_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assignment-placement">Erscheint unter</label>
              <select
                id="assignment-placement"
                name="placement"
                value={placement}
                onChange={(event) =>
                  setPlacement(event.target.value as AssignmentPlacement)
                }
              >
                <option value="assignments">Aufgaben</option>
                <option value="today">Heute üben</option>
              </select>
            </div>
          </div>

          <label htmlFor="assignment-due">
            Termin oder Hinweis <span>optional</span>
          </label>
          <input
            id="assignment-due"
            name="dueLabel"
            placeholder="z. B. bis Freitag"
          />

          {message && (
            <p
              className={
                message.includes("Bitte") || message.includes("nicht")
                  ? "form-message"
                  : "form-message form-message--success"
              }
              aria-live="polite"
            >
              {message}
            </p>
          )}
          <button className="button button--primary" disabled={loading}>
            Als Entwurf speichern
          </button>
        </form>

        <section className="draft-list" aria-labelledby="draft-list-title">
          <div className="draft-list__heading">
            <h3 id="draft-list-title">Entwürfe</h3>
            <span>{assignments.length}</span>
          </div>
          {loading ? (
            <p>Entwürfe werden geladen …</p>
          ) : assignments.length === 0 ? (
            <div className="draft-empty">
              <strong>Noch keine Entwürfe</strong>
              <p>Neue Aufgaben erscheinen nach dem Speichern hier.</p>
            </div>
          ) : (
            <div className="draft-items">
              {assignments.map((assignment) => (
                <article className="draft-item" key={assignment.id}>
                  <div>
                    <span
                      className={`draft-status draft-status--${assignment.status}`}
                    >
                      {assignment.status === "draft" ? "Entwurf" : "Bereit"}
                    </span>
                    <span>{placementLabels[assignment.placement]}</span>
                  </div>
                  <h4>{assignment.title}</h4>
                  <p>
                    {CLASS_MODULE_LABELS[assignment.module]} ·{" "}
                    {assignment.description}
                  </p>
                  {assignment.dueLabel && <small>{assignment.dueLabel}</small>}
                  <div className="draft-item__actions">
                    {assignment.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => setReady(assignment)}
                      >
                        Zur Veröffentlichung vorbereiten
                      </button>
                    )}
                    <button type="button" onClick={() => remove(assignment.id)}>
                      Löschen
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
