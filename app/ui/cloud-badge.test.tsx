import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CloudBadge } from "./cloud-badge";
import {
  cloudBadgeAnnouncement,
  cloudBadgeIcon,
  cloudBadgeText,
  effectiveStatus,
  formatAgo,
  type CloudBadgeModel,
  type CloudBadgeStatus,
} from "./cloud-badge-model";

const NOW = Date.parse("2026-10-05T10:00:30.000Z");
const at = (secondsAgo: number) =>
  new Date(NOW - secondsAgo * 1000).toISOString();

const model = (over: Partial<CloudBadgeModel> = {}): CloudBadgeModel => ({
  status: "idle",
  revision: 128,
  lastSyncedAt: at(5),
  writer: { name: "Tafel 2b", at: at(9) },
  pending: 0,
  conflicts: 0,
  error: null,
  providerLabel: "OneDrive",
  deviceName: "Laptop",
  devices: [
    { id: "d1", name: "Laptop", revision: 128, seenAt: at(5), current: true },
    {
      id: "d2",
      name: "Tafel 2b",
      revision: 127,
      seenAt: at(70),
      current: false,
    },
  ],
  encrypted: true,
  ...over,
});

describe("cloud badge texts", () => {
  it("describes every state in German", () => {
    const text = (
      status: CloudBadgeStatus,
      over: Partial<CloudBadgeModel> = {},
    ) => cloudBadgeText(model({ status, ...over }), NOW);
    expect(text("idle")).toBe("Abgeglichen · Stand 128 · vor 5 s");
    expect(text("syncing")).toBe("Wird abgeglichen …");
    expect(text("pending", { pending: 1 })).toBe("1 Änderung wartet");
    expect(text("pending", { pending: 3 })).toBe("3 Änderungen warten");
    expect(text("offline")).toBe("Offline · Änderungen werden später gesendet");
    expect(text("conflict", { conflicts: 1 })).toBe("1 Konflikt zu prüfen");
    expect(text("conflict", { conflicts: 2 })).toBe("2 Konflikte zu prüfen");
    expect(text("locked")).toBe("Passwort nötig");
    expect(text("reauth")).toBe("Bei OneDrive neu anmelden");
    expect(text("error", { error: "Server weg" })).toBe("Server weg");
    expect(text("error", { error: " " })).toBe(
      "Der Abgleich ist fehlgeschlagen.",
    );
  });

  it("gives every state its own icon so it never relies on colour", () => {
    const statuses: CloudBadgeStatus[] = [
      "idle",
      "syncing",
      "pending",
      "offline",
      "conflict",
      "locked",
      "reauth",
      "error",
    ];
    expect(new Set(statuses.map(cloudBadgeIcon)).size).toBe(statuses.length);
  });

  it("formats elapsed time compactly", () => {
    expect(formatAgo(null, NOW)).toBe("noch nie");
    expect(formatAgo("kaputt", NOW)).toBe("noch nie");
    expect(formatAgo(at(2), NOW)).toBe("gerade eben");
    expect(formatAgo(at(42), NOW)).toBe("vor 42 s");
    expect(formatAgo(at(5 * 60), NOW)).toBe("vor 5 min");
    expect(formatAgo(at(3 * 3600), NOW)).toBe("vor 3 h");
    expect(formatAgo(at(3 * 86400), NOW)).toBe("vor 3 d");
  });

  it("shows waiting changes even when the last round succeeded", () => {
    expect(effectiveStatus("idle", 2)).toBe("pending");
    expect(effectiveStatus("idle", 0)).toBe("idle");
    expect(effectiveStatus("error", 2)).toBe("error");
  });

  it("announces only states that need attention and the recovery", () => {
    const say = (previous: CloudBadgeStatus | null, status: CloudBadgeStatus) =>
      cloudBadgeAnnouncement(
        previous,
        model({ status, conflicts: 2, error: "Fehler X" }),
        NOW,
      );
    expect(say("idle", "idle")).toBeNull();
    expect(say("idle", "syncing")).toBeNull();
    expect(say("syncing", "idle")).toBeNull();
    expect(say(null, "idle")).toBeNull();
    expect(say("idle", "error")).toBe("Cloud-Abgleich: Fehler X");
    expect(say("idle", "conflict")).toBe(
      "Cloud-Abgleich: 2 Konflikte zu prüfen",
    );
    expect(say("idle", "locked")).toBe("Cloud-Abgleich: Passwort nötig");
    expect(say("error", "idle")).toBe("Cloud-Abgleich wieder in Ordnung.");
    expect(say("offline", "idle")).toBeNull();
  });
});

describe("CloudBadge", () => {
  it("names the state for screen readers and the tooltip", () => {
    render(<CloudBadge model={model()} now={NOW} />);
    const button = screen.getByRole("button", { name: /Cloud-Abgleich/ });
    expect(button).toHaveAccessibleName(
      "Cloud-Abgleich: Abgeglichen · Stand 128 · vor 5 s",
    );
    expect(button).toHaveAttribute(
      "title",
      expect.stringContaining("Stand 128"),
    );
    expect(button).toHaveAttribute("data-status", "idle");
  });

  it("opens the status menu with version, writer and device list", async () => {
    const user = userEvent.setup();
    render(<CloudBadge model={model()} now={NOW} />);
    await user.click(screen.getByRole("button", { name: /Cloud-Abgleich/ }));
    const dialog = screen.getByRole("dialog", { name: "Cloud-Abgleich" });
    expect(
      within(dialog).getByText(
        /Stand 128 · zuletzt geschrieben von „Tafel 2b“ vor 9 s/,
      ),
    ).toBeVisible();
    expect(within(dialog).getByText(/OneDrive · verschlüsselt/)).toBeVisible();
    const devices = within(dialog).getByRole("list");
    expect(within(devices).getAllByRole("listitem")).toHaveLength(2);
    expect(within(devices).getByText("Laptop (dieses Gerät)")).toBeVisible();
    expect(within(devices).getByText(/Stand 127 · vor 1 min/)).toBeVisible();
  });

  it("starts a sync from the menu and disables the button while running", async () => {
    const user = userEvent.setup();
    const onSyncNow = vi.fn();
    const { rerender } = render(
      <CloudBadge model={model()} actions={{ onSyncNow }} now={NOW} />,
    );
    await user.click(screen.getByRole("button", { name: /Cloud-Abgleich/ }));
    await user.click(screen.getByRole("button", { name: "Jetzt abgleichen" }));
    expect(onSyncNow).toHaveBeenCalledTimes(1);
    rerender(
      <CloudBadge
        model={model({ status: "syncing" })}
        actions={{ onSyncNow }}
        now={NOW}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Jetzt abgleichen" }),
    ).toBeDisabled();
  });

  it("shows the conflict count and leads to the conflict dialog", async () => {
    const user = userEvent.setup();
    const onOpenConflicts = vi.fn();
    render(
      <CloudBadge
        model={model({ status: "conflict", conflicts: 2 })}
        actions={{ onOpenConflicts, settingsHref: "/lehrer/einstellungen" }}
        now={NOW}
      />,
    );
    expect(screen.getByText("2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Cloud-Abgleich/ }));
    expect(screen.getByRole("link", { name: "Einstellungen" })).toHaveAttribute(
      "href",
      "/lehrer/einstellungen",
    );
    await user.click(
      screen.getByRole("button", { name: "2 Konflikte ansehen" }),
    );
    expect(onOpenConflicts).toHaveBeenCalledTimes(1);
  });

  it("singular conflict button text and no device section without devices", async () => {
    const user = userEvent.setup();
    render(
      <CloudBadge
        model={model({
          status: "conflict",
          conflicts: 1,
          devices: [],
          writer: null,
        })}
        actions={{ onOpenConflicts: () => undefined }}
        now={NOW}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Cloud-Abgleich/ }));
    expect(
      screen.getByRole("button", { name: "Konflikt ansehen" }),
    ).toBeVisible();
    expect(screen.queryByText("Geräte")).not.toBeInTheDocument();
  });

  it("announces a failure and the recovery, but not routine rounds", async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<CloudBadge model={model()} now={NOW} />);
      const region = screen.getByRole("status");
      await act(async () => vi.advanceTimersByTimeAsync(10));
      expect(region).toHaveTextContent("");
      rerender(<CloudBadge model={model({ status: "syncing" })} now={NOW} />);
      await act(async () => vi.advanceTimersByTimeAsync(10));
      expect(region).toHaveTextContent("");
      rerender(
        <CloudBadge
          model={model({ status: "error", error: "Server weg" })}
          now={NOW}
        />,
      );
      await act(async () => vi.advanceTimersByTimeAsync(10));
      expect(region).toHaveTextContent("Cloud-Abgleich: Server weg");
      rerender(<CloudBadge model={model()} now={NOW} />);
      await act(async () => vi.advanceTimersByTimeAsync(10));
      expect(region).toHaveTextContent("Cloud-Abgleich wieder in Ordnung.");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps time current without an explicit clock", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(NOW);
      render(<CloudBadge model={model({ lastSyncedAt: at(5) })} />);
      expect(
        screen.getByRole("button", { name: /vor 5 s/ }),
      ).toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(20_000));
      expect(
        screen.getByRole("button", { name: /vor 25 s/ }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
