import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VoiceSettingsBody, type VoiceLanguageView } from "./voice-settings";

const german: VoiceLanguageView = {
  code: "de",
  label: "Deutsch",
  voices: [
    { id: "anna", label: "Anna", description: "weiblich" },
    { id: "lukas", label: "Lukas", description: "männlich" },
  ],
  selected: "anna",
  status: "missing",
  progress: 0,
  sizeMb: 34,
  sampling: false,
};

describe("Einstellung Vorlesen", () => {
  it("wählt die Stimme je Sprache und spielt eine Probe", async () => {
    const onSelect = vi.fn();
    const onSample = vi.fn();
    const user = userEvent.setup();
    render(
      <VoiceSettingsBody
        languages={[german]}
        onSelect={onSelect}
        onSample={onSample}
      />,
    );
    await user.selectOptions(
      screen.getByLabelText("Stimme für Deutsch"),
      "lukas",
    );
    expect(onSelect).toHaveBeenCalledWith("de", "lukas");
    await user.click(
      screen.getByRole("button", { name: "Probe hören: Deutsch" }),
    );
    expect(onSample).toHaveBeenCalledWith("de");
  });

  it("zeigt Größe, Installation mit Fortschritt und Entfernen", async () => {
    const onInstall = vi.fn();
    const onRemove = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <VoiceSettingsBody
        languages={[german]}
        onInstall={onInstall}
        onRemove={onRemove}
      />,
    );
    expect(
      screen.getByText("Noch nicht auf diesem Gerät (etwa 34 MB)."),
    ).toHaveAttribute("aria-live", "polite");
    // Keine zusätzliche Rolle „status“ auf Einstellungsseiten.
    expect(screen.queryByRole("status")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Deutsch installieren" }),
    );
    expect(onInstall).toHaveBeenCalledWith("de");

    rerender(
      <VoiceSettingsBody
        languages={[{ ...german, status: "installing", progress: 0.42 }]}
        onInstall={onInstall}
      />,
    );
    expect(
      screen.getByRole("progressbar", { name: "Installation Deutsch" }),
    ).toHaveAttribute("value", "0.42");
    expect(screen.getByText("Wird installiert … 42 %")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Deutsch installieren" }),
    ).toBeDisabled();

    rerender(
      <VoiceSettingsBody
        languages={[{ ...german, status: "installed" }]}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText(/Funktioniert auch ohne Internet\./)).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Deutsch vom Gerät entfernen" }),
    );
    expect(onRemove).toHaveBeenCalledWith("de");
  });

  it("schaltet die Lernraum-Stimme aus und blendet die Stimmenwahl aus", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <VoiceSettingsBody languages={[german]} onToggle={onToggle} />,
    );
    const toggle = screen.getByRole("checkbox", {
      name: /Lernraum-Stimme verwenden/,
    });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(false);
    rerender(
      <VoiceSettingsBody
        enabled={false}
        languages={[german]}
        onToggle={onToggle}
      />,
    );
    expect(screen.queryByLabelText("Stimme für Deutsch")).toBeNull();
  });
});
