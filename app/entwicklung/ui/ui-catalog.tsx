"use client";

import { useState } from "react";
import { SegmentedRoomCode } from "../../components/segmented-room-code";
import { ThemeToggle } from "../../components/theme-toggle";
import { AnimalImage } from "../../ui/animal";
import { Icon } from "../../ui/icons";
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Notice,
  Pill,
  ProgressBar,
  ProgressRing,
  Segmented,
  type ButtonVariant,
} from "../../ui/primitives";
import { Sheet } from "../../ui/sheet";

const VARIANTS: ButtonVariant[] = [
  "primary",
  "dark",
  "green",
  "gold",
  "ghost",
  "soft",
  "bad",
  "link",
];

export function UiCatalog() {
  const [mode, setMode] = useState<"write" | "oral">("write");
  const [code, setCode] = useState("48");
  const [sheet, setSheet] = useState(false);
  return (
    <main className="ui ui-dots" style={{ minHeight: "100dvh", padding: 24 }}>
      <div className="ui-stack" style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="ui-between">
          <h1 className="ui-h-page">Bausteine „Lernraum UI“</h1>
          <ThemeToggle />
        </div>

        <Card>
          <div className="ui-stack">
            <h2 className="ui-h-section">Knöpfe</h2>
            <div className="ui-row ui-wrap">
              {VARIANTS.map((variant) => (
                <Button key={variant} variant={variant}>
                  {variant}
                </Button>
              ))}
              <Button size="sm">klein</Button>
              <Button disabled>deaktiviert</Button>
              <IconButton label="Scannen" tone="green">
                <Icon name="camera" />
              </IconButton>
              <IconButton label="Dunkelmodus">
                <Icon name="moon" size={18} />
              </IconButton>
            </div>
          </div>
        </Card>

        <div className="ui-grid-auto">
          <Card look="pop">
            <div className="ui-stack">
              <h2 className="ui-h-section">Kleinteile</h2>
              <div className="ui-row ui-wrap">
                <Pill>neutral</Pill>
                <Pill tone="accent">4 fällig</Pill>
                <Pill tone="good">gewusst</Pill>
                <Pill tone="bad">3×falsch</Pill>
                <Pill tone="dark">12 Tage</Pill>
              </div>
              <ProgressBar value={18} max={24} label="Heute fällig" />
              <Segmented
                label="Modus"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "write", label: "Schreiben" },
                  { value: "oral", label: "Mündlich" },
                ]}
              />
            </div>
          </Card>
          <Card look="dark">
            <div className="ui-stack ui-on-dark" style={{ color: "inherit" }}>
              <h2 className="ui-h-section">Dunkle Fläche</h2>
              <p className="ui-muted">
                Navigation und Landing nutzen diese Tokens.
              </p>
              <span className="ui-label" id="catalog-code">
                Raumcode
              </span>
              <div className="ui-row">
                <div className="ui-grow">
                  <SegmentedRoomCode
                    idPrefix="catalog"
                    labelId="catalog-code"
                    value={code}
                    describedBy={undefined}
                    className="ui-code"
                    onChange={setCode}
                  />
                </div>
                <IconButton label="QR-Code scannen" tone="green">
                  <Icon name="camera" />
                </IconButton>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="ui-grid-auto" style={{ alignItems: "center" }}>
            <div
              className="ui-animal-stage"
              style={{ width: 200, height: 200 }}
            >
              <ProgressRing value={18} max={24} size={200} />
              <div
                className="ui-animal-disc"
                style={{ width: 164, height: 164 }}
              >
                <AnimalImage animal="Fuchs" size={132} label="Fuchs" />
              </div>
              <span className="ui-streak-badge">
                <Icon name="bolt" size={14} /> 12 Tage
              </span>
            </div>
            <div className="ui-stack">
              <p className="ui-h-fun">Fuchs</p>
              <Notice>Hinweis mit Akzentfläche.</Notice>
              <Notice tone="good">Richtig! Weiter geht’s.</Notice>
              <Notice tone="bad">
                Fast. Schau dir die markierten Buchstaben an.
              </Notice>
              <input
                className="ui-input"
                aria-label="Eingabe"
                placeholder="Eingabe"
              />
              <Button variant="ghost" onClick={() => setSheet(true)}>
                Blatt öffnen
              </Button>
            </div>
          </div>
        </Card>

        <EmptyState title="Noch keine Stapel">
          Leerzustand mit gestrichelter Kante.
        </EmptyState>
      </div>
      <Sheet
        open={sheet}
        title="Leistungsbrief"
        onClose={() => setSheet(false)}
      >
        <p className="ui-muted">Inhalt eines Blatts.</p>
        <Button block onClick={() => setSheet(false)}>
          Fertig
        </Button>
      </Sheet>
    </main>
  );
}
