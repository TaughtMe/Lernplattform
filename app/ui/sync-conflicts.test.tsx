import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SyncConflict } from "../../src/integrations/cloud-sync/model";
import { SyncConflictList } from "./sync-conflicts";

const NOW = Date.parse("2026-10-05T10:00:00.000Z");
const hlc = (ms: number, device: string) =>
  `${String(ms).padStart(15, "0")}-00000-${device}`;

function conflict(over: Partial<SyncConflict> = {}): SyncConflict {
  return {
    id: "k1",
    kind: "changed",
    table: "contentPackages",
    recordId: "m1",
    label: "Material „Diktat“",
    kept: {
      hlc: hlc(NOW - 60_000, "d2"),
      device: "d2",
      data: { title: "Diktat Tafel", source: "gleich", updatedAt: "x" },
    },
    other: {
      hlc: hlc(NOW - 120_000, "d1"),
      device: "d1",
      data: { title: "Diktat Laptop", source: "gleich", updatedAt: "y" },
    },
    detectedAt: "2026-10-05T10:00:00.000Z",
    status: "open",
    ...over,
  };
}

const render_ = (
  conflicts: SyncConflict[],
  onResolve = vi.fn(),
  memberNames: Record<string, string> = {},
) =>
  render(
    <SyncConflictList
      conflicts={conflicts}
      now={NOW}
      deviceNames={{ d1: "Laptop", d2: "Tafel 2b" }}
      memberNames={memberNames}
      onResolve={onResolve}
    />,
  );

describe("SyncConflictList", () => {
  it("says so when nothing is open", () => {
    render_([]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Keine offenen Konflikte.",
    );
  });

  it("shows both versions side by side with device and time, only differing fields", () => {
    render_([conflict()]);
    const item = screen.getByRole("listitem", { name: "Material „Diktat“" });
    const kept = within(item).getByRole("region", { name: "Gilt vorläufig" });
    const other = within(item).getByRole("region", { name: "Andere Fassung" });
    expect(within(kept).getByText("Diktat Tafel")).toBeVisible();
    expect(within(kept).getByText(/Gerät „Tafel 2b“/)).toBeVisible();
    expect(within(kept).getByText(/vor 1 min/)).toBeVisible();
    expect(within(other).getByText("Diktat Laptop")).toBeVisible();
    expect(within(other).getByText(/Gerät „Laptop“/)).toBeVisible();
    expect(within(item).queryByText("gleich")).not.toBeInTheDocument();
  });

  it("offers keep, take the other and keep both for material", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    const entry = conflict();
    render_([entry], onResolve);
    await user.click(screen.getByRole("button", { name: "Diese behalten" }));
    await user.click(screen.getByRole("button", { name: "Andere behalten" }));
    await user.click(screen.getByRole("button", { name: "Beide behalten" }));
    expect(onResolve.mock.calls).toEqual([
      [entry, { type: "keep" }],
      [entry, { type: "use-other" }],
      [entry, { type: "keep-both" }],
    ]);
  });

  it("does not offer a copy for classes", () => {
    render_([conflict({ table: "classes", label: "Klasse 5b" })]);
    expect(
      screen.queryByRole("button", { name: "Beide behalten" }),
    ).not.toBeInTheDocument();
  });

  it("explains deleted-versus-changed and offers to delete after all", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    const entry = conflict({ kind: "deleted", other: null });
    render_([entry], onResolve);
    expect(screen.getByText(/Fassung vom Gerät „Tafel 2b“/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Doch löschen" }));
    await user.click(screen.getByRole("button", { name: "Behalten" }));
    expect(onResolve.mock.calls.map(([, choice]) => choice)).toEqual([
      { type: "delete" },
      { type: "keep" },
    ]);
  });

  it("offers merging duplicates but never for children", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    const duplicate = conflict({
      kind: "duplicate",
      table: "classes",
      recordId: "c1",
      otherRecordId: "c2",
      label: "Klasse 5b",
    });
    render_([duplicate], onResolve);
    await user.click(screen.getByRole("button", { name: "Zusammenlegen" }));
    await user.click(screen.getByRole("button", { name: "Zweite entfernen" }));
    await user.click(screen.getByRole("button", { name: "Erste entfernen" }));
    expect(onResolve.mock.calls.map(([, choice]) => choice)).toEqual([
      { type: "merge" },
      { type: "remove", id: "c2" },
      { type: "remove", id: "c1" },
    ]);
  });

  it("never offers to merge two children, whose enrolment keys differ", () => {
    render_([
      conflict({
        kind: "duplicate",
        table: "members",
        recordId: "k1",
        otherRecordId: "k2",
        label: "Kind Fuchs",
      }),
    ]);
    expect(
      screen.queryByRole("button", { name: "Zusammenlegen" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Beide behalten" }),
    ).toBeVisible();
  });

  it("names the children whose writing relief must be granted again", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render_(
      [
        conflict({
          kind: "seal",
          table: "classes",
          label: "Klasse 5b",
          other: null,
          affectedMemberIds: ["k1", "k9"],
        }),
      ],
      onResolve,
      { k1: "Fuchs" },
    );
    expect(
      screen.getByText(
        /Schreiberleichterungen für Klasse 5b müssen neu vergeben werden/,
      ),
    ).toBeVisible();
    expect(screen.getByText("Fuchs")).toBeVisible();
    expect(screen.getByText("Kind")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Verstanden" }));
    expect(onResolve).toHaveBeenCalledWith(expect.anything(), { type: "keep" });
  });

  it("copes with a seal conflict without affected children and unknown devices", () => {
    render(
      <SyncConflictList
        conflicts={[
          conflict({ kind: "seal", table: "classes", other: null }),
          conflict({ id: "k2" }),
        ]}
        now={NOW}
        onResolve={() => undefined}
      />,
    );
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Gerät „d2“/).length).toBeGreaterThan(0);
  });
});
