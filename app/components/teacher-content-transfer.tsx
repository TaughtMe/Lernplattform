"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  pickerLocale,
  VOCABULARY_LANGUAGES,
} from "../../src/domain/running-dictation";
import { buildTeacherVocabularyBundle } from "../../src/domain/teacher-content-transfer";
import {
  createTeacherContentLibraryFile,
  parseTeacherContentLibraryFile,
  type TeacherContentPackage,
} from "../../src/domain/teacher-content-library";
import {
  createTransferLink,
  publishTransferPayload,
} from "../../src/integrations/content-transfer/content-transfer-client";
import {
  getLiveRoomClient,
  type LiveRoomConfig,
} from "../../src/integrations/laufdiktat/live-room-client";
import {
  contentKindOf,
  UNASSIGNED,
} from "../../src/domain/teacher-content-summary";
import { createTeacherContentLibraryRepository } from "../../src/storage/teacher-class-settings";
import {
  forgetTransfers,
  rememberTransfer,
  transferKindOf,
  transferTimeLeft,
} from "../lehrer/material/active-transfers";
import { cx } from "../views/parts/parts";
import {
  formatTransferCode,
  LiveTransferQr,
  shortDate,
  useTransferClock,
  type TransferClock,
} from "./teacher-transfer-shared";
import { VocabularyPreview } from "./teacher-vocabulary-preview";
import { TeacherWordListTransfer } from "./teacher-word-list-transfer";
import { manageStyles as m, ManagePage } from "../views/lehrer/manage-parts";
import {
  KindSwitch,
  LiveTransfers,
  PackageList,
  TransferLayout,
} from "../views/lehrer/transfer-screen";
import { completePairs, rowsFromSource } from "../views/lehrer/vocabulary-rows";

const NEW_HREF = "/lehrer/live?neu=vocabulary";
const DEFAULT_LEFT = "en-GB";
const DEFAULT_RIGHT = "de-DE";

/**
 * „Bearbeiten“ im Live-Raum-Editor. Die Klasse kommt aus dem Paket selbst:
 * Ohne `klasse=` nähme der Editor die zuletzt genutzte Live-Klasse und
 * ordnete das Paket beim Speichern zusätzlich ihr zu. Ohne Klasse gilt
 * „ohne“ (Nicht zugeordnet), dann bleibt die Zuordnung leer.
 */
const editHref = (entry: Pick<TeacherContentPackage, "id" | "classIds">) =>
  `/lehrer/live?inhalt=${encodeURIComponent(entry.id)}&schritt=inhalt&klasse=${encodeURIComponent(
    entry.classIds?.[0] ?? UNASSIGNED,
  )}`;

const languageLabel = (locale: string) =>
  VOCABULARY_LANGUAGES.find((language) => language.locale === locale)?.label ??
  locale;

type Kind = "vocabulary" | "wordlist";

/**
 * Freigabe an Schüler (Lehrerbereich v2, 17b): Vokabelpakete und Lernwortlisten
 * der Ablage bearbeiten, lokal speichern (beim Tippen) und verschlüsselt für
 * höchstens 24 Stunden freigeben. Texte und Mathe bleiben in der Ablage.
 */
export function TeacherContentTransfer({
  transferConfig,
}: {
  transferConfig: LiveRoomConfig | null;
}) {
  const [kind, setKind] = useState<Kind>("vocabulary");
  const [listId, setListId] = useState<string | undefined>();
  const clock = useTransferClock();
  const library = useMemo(() => createTeacherContentLibraryRepository(), []);
  // „?paket=“ mit einer Lernwortliste öffnet gleich den Reiter „Lernwortlisten“.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("paket");
    if (!wanted) return;
    let active = true;
    void library
      .list()
      .then((stored) => {
        const entry = stored.find((item) => item.id === wanted);
        if (active && entry && contentKindOf(entry) === "wordlist") {
          setListId(wanted);
          setKind("wordlist");
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [library]);
  return (
    <ManagePage
      title="Freigabe an Schüler"
      lead="Vokabelpakete und Lernwortlisten per QR-Code auf die Geräte der Schüler geben. Verschlüsselt und nach 24 Stunden gelöscht."
    >
      <KindSwitch
        value={kind}
        options={[
          { value: "vocabulary", label: "Vokabelpakete" },
          { value: "wordlist", label: "Lernwortlisten" },
        ]}
        onChange={setKind}
      />
      {kind === "vocabulary" ? (
        <VocabularyTransfer transferConfig={transferConfig} clock={clock} />
      ) : (
        <TeacherWordListTransfer
          transferConfig={transferConfig}
          clock={clock}
          {...(listId ? { selectId: listId } : {})}
        />
      )}
    </ManagePage>
  );
}

function VocabularyTransfer({
  transferConfig,
  clock,
}: {
  transferConfig: LiveRoomConfig | null;
  clock: TransferClock;
}) {
  const { transfers, setTransfers, now, setNow } = clock;
  const router = useRouter();
  const library = useMemo(() => createTeacherContentLibraryRepository(), []);
  const [packages, setPackages] = useState<TeacherContentPackage[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [big, setBig] = useState(false);

  const vocabularyPackages = useMemo(
    () =>
      packages
        .filter((entry) => contentKindOf(entry) === "vocabulary")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [packages],
  );

  useEffect(() => {
    let active = true;
    library
      .list()
      .then((stored) => {
        if (!active) return;
        setPackages(stored);
        const vocabulary = stored
          .filter((entry) => contentKindOf(entry) === "vocabulary")
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
        // „An die Kinder geben“ aus der Ablage (K8-2) wählt das Paket vor.
        const wanted = new URLSearchParams(window.location.search).get("paket");
        const first =
          vocabulary.find((entry) => entry.id === wanted) ?? vocabulary[0];
        if (first) setSelectedId(first.id);
      })
      .catch(() =>
        setError(
          "Die lokale Lehrkraftbibliothek konnte nicht geöffnet werden.",
        ),
      );
    return () => {
      active = false;
    };
  }, [library]);

  const current = vocabularyPackages.find((entry) => entry.id === selectedId);
  const rows = useMemo(
    () => (current ? rowsFromSource(current.source) : []),
    [current],
  );

  function pick(id: string) {
    setSelectedId(id);
    setConfirmDelete(false);
    setNotice("");
    setError("");
  }

  async function removeCurrent() {
    setConfirmDelete(false);
    if (!current) return;
    try {
      await library.remove(current.id);
      const remaining = await library.list();
      setPackages(remaining);
      setTransfers(forgetTransfers(current.id, Date.now()));
      const next = remaining
        .filter((entry) => contentKindOf(entry) === "vocabulary")
        .sort((left, right) =>
          right.updatedAt.localeCompare(left.updatedAt),
        )[0];
      setSelectedId(next?.id ?? "");
      setNotice(
        `„${current.title}“ wurde aus der lokalen Bibliothek gelöscht.`,
      );
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setError("Das Paket konnte nicht gelöscht werden.");
    }
  }

  function exportLibrary() {
    const file = createTeacherContentLibraryFile(packages);
    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Lernraum-Lehrkraftbibliothek-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(`${packages.length} Pakete wurden als Datei exportiert.`);
  }

  async function importLibrary(file: File) {
    setError("");
    try {
      const imported = parseTeacherContentLibraryFile(
        JSON.parse(await file.text()),
      );
      await library.putMany(imported.packages);
      setPackages(await library.list());
      setNotice(
        `${imported.packages.length} Pakete wurden geprüft und lokal übernommen.`,
      );
      window.dispatchEvent(new Event("teacher-data-changed"));
    } catch {
      setError(
        "Die Datei ist keine gültige Lernraum-Lehrkraftbibliothek der Version 1.",
      );
    }
  }

  async function publish() {
    setError("");
    setNotice("");
    if (!current) return;
    if (!transferConfig) {
      setError("Die Inhaltsübertragung ist noch nicht konfiguriert.");
      return;
    }
    setBusy(true);
    try {
      const revision = current.revision + 1;
      const bundle = buildTeacherVocabularyBundle({
        id: current.id,
        revision,
        title: current.title,
        source: current.source,
        promptLocale: pickerLocale(current.promptLocale, DEFAULT_LEFT),
        answerLocale: pickerLocale(current.answerLocale, DEFAULT_RIGHT),
      });
      const result = await publishTransferPayload(
        getLiveRoomClient(transferConfig),
        bundle,
      );
      const time = Date.now();
      setTransfers(
        rememberTransfer(
          {
            packageId: current.id,
            title: current.title.trim(),
            pairs: completePairs(rows),
            code: result.manualTransferCode,
            publishedAt: new Date(time).toISOString(),
            expiresAt: result.expiresAt,
          },
          time,
        ),
      );
      setNow(time);
      try {
        // Nur die Fassung zählt hoch; Inhalt und Änderungsdatum bleiben.
        const saved = { ...current, revision };
        await library.put(saved);
        setPackages((all) =>
          all.map((entry) => (entry.id === saved.id ? saved : entry)),
        );
        window.dispatchEvent(new Event("teacher-data-changed"));
      } catch {
        setNotice(
          "Die Freigabe ist gültig, konnte aber nicht zusätzlich lokal gespeichert werden.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Das Paket konnte nicht veröffentlicht werden.",
      );
    } finally {
      setBusy(false);
    }
  }

  const mine = transfers.filter(
    (entry) => transferKindOf(entry) === "vocabulary",
  );
  const live = current
    ? mine.find(({ packageId }) => packageId === current.id)
    : undefined;
  const liveOf = (id: string) => mine.find(({ packageId }) => packageId === id);
  const items = vocabularyPackages.map((entry) => {
    const share = liveOf(entry.id);
    return {
      id: entry.id,
      title: entry.title,
      meta: `${completePairs(rowsFromSource(entry.source))} Paare · geändert ${shortDate(entry.updatedAt)}`,
      live: share ? transferTimeLeft(share, now).short : undefined,
    };
  });
  const qrValue =
    live && typeof window !== "undefined"
      ? createTransferLink(window.location.origin, live.code)
      : "";
  const pairs = completePairs(rows);

  return (
    <TransferLayout
      side={
        <>
          <PackageList
            items={items}
            selectedId={selectedId}
            onPick={pick}
            onNew={() => router.push(NEW_HREF)}
            onExport={exportLibrary}
            onImport={(file) => void importLibrary(file)}
          />
          <LiveTransfers
            items={mine.map((entry) => {
              const time = transferTimeLeft(entry, now);
              return {
                id: entry.packageId,
                title: entry.title,
                meta: `${entry.pairs} Paare · Code ${formatTransferCode(entry.code).slice(0, 4)} …`,
                left: `${time.short} · ${time.until}`,
                fraction: time.fraction,
              };
            })}
            actionLabel="QR zeigen"
            onAction={pick}
          />
        </>
      }
    >
      {current ? (
        <VocabularyPreview
          title={current.title}
          pairs={pairs}
          rows={rows}
          leftLabel={languageLabel(
            pickerLocale(current.promptLocale, DEFAULT_LEFT),
          )}
          rightLabel={languageLabel(
            pickerLocale(current.answerLocale, DEFAULT_RIGHT),
          )}
          editHref={editHref(current)}
          live={Boolean(live)}
          busy={busy}
          shareDisabled={pairs === 0}
          onShare={() => void publish()}
          onDelete={() => setConfirmDelete(true)}
        />
      ) : (
        <p className={m.notice}>
          Noch kein Vokabelpaket.{" "}
          <Link href={NEW_HREF}>Neues Vokabelpaket anlegen</Link>
        </p>
      )}
      {confirmDelete && current ? (
        <div
          className={cx(m.notice, m.noticeBad)}
          role="alertdialog"
          aria-label="Paket löschen"
        >
          <p className={m.noticeText}>
            „{current.title}“ aus der lokalen Bibliothek löschen? Eine laufende
            Freigabe bleibt bis zu ihrem Ablauf gültig.
          </p>
          <span className={m.actions}>
            <button
              type="button"
              className={cx(m.soft, m.danger)}
              onClick={() => void removeCurrent()}
            >
              Löschen
            </button>
            <button
              type="button"
              className={m.soft}
              onClick={() => setConfirmDelete(false)}
            >
              Abbrechen
            </button>
          </span>
        </div>
      ) : null}
      {notice ? (
        <p className={m.notice} role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className={cx(m.notice, m.noticeBad)} role="alert">
          {error}
        </p>
      ) : null}
      {live && qrValue ? (
        <LiveTransferQr
          live={live}
          now={now}
          link={qrValue}
          qrLabel="QR-Code für das verschlüsselte Vokabelpaket"
          big={big}
          onBig={setBig}
        />
      ) : null}
    </TransferLayout>
  );
}
