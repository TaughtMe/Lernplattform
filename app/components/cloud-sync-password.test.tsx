import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { offerToStorePassword, SyncPasswordForm } from "./cloud-sync-password";

const GOOD = "pferd-batterie-klammer";

describe("SyncPasswordForm for password managers", () => {
  it("is a real form with a fixed visible user name as anchor", () => {
    const { container } = render(
      <SyncPasswordForm
        mode="create"
        account="lea@cloud.schule.de"
        submitLabel="Festlegen"
        onSubmit={async () => undefined}
      />,
    );
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    const user = screen.getByLabelText("Benutzername");
    expect(user).toHaveValue("Lernraum-Abgleich · lea@cloud.schule.de");
    expect(user).toHaveAttribute("autocomplete", "username");
    expect(user).toHaveAttribute("readonly");
    expect(user).toBeVisible();
    expect(form?.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it("asks for a new password twice with managers' hints and no character rules", () => {
    render(
      <SyncPasswordForm
        mode="create"
        account="x"
        submitLabel="Festlegen"
        onSubmit={async () => undefined}
      />,
    );
    const first = screen.getByLabelText("Neues Passwort");
    expect(first).toHaveAttribute("autocomplete", "new-password");
    expect(first).toHaveAttribute("minlength", "12");
    expect(first).toHaveAttribute("passwordrules", "minlength: 12;");
    expect(first).not.toHaveAttribute("pattern");
    const repeat = screen.getByLabelText("Passwort wiederholen");
    expect(repeat).toHaveAttribute("autocomplete", "new-password");
    expect(first).not.toHaveAttribute("autocomplete", "off");
  });

  it("asks for one existing password when entering", () => {
    render(
      <SyncPasswordForm
        mode="enter"
        account="x"
        submitLabel="Entsperren"
        onSubmit={async () => undefined}
      />,
    );
    const field = screen.getByLabelText("Passwort");
    expect(field).toHaveAttribute("autocomplete", "current-password");
    expect(field).not.toHaveAttribute("minlength");
    expect(screen.queryByLabelText("Passwort wiederholen")).toBeNull();
  });

  it("checks length and repetition before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    render(
      <SyncPasswordForm
        mode="create"
        account="x"
        submitLabel="Festlegen"
        onSubmit={onSubmit}
      />,
    );
    await user.type(screen.getByLabelText("Neues Passwort"), "kurz");
    await user.click(screen.getByRole("button", { name: "Festlegen" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "mindestens 12 Zeichen",
    );
    await user.clear(screen.getByLabelText("Neues Passwort"));
    await user.type(screen.getByLabelText("Neues Passwort"), GOOD);
    await user.type(
      screen.getByLabelText("Passwort wiederholen"),
      "anders-anders-1",
    );
    await user.click(screen.getByRole("button", { name: "Festlegen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("nicht gleich");
    expect(onSubmit).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Passwort wiederholen"));
    await user.type(screen.getByLabelText("Passwort wiederholen"), GOOD);
    await user.click(screen.getByRole("button", { name: "Festlegen" }));
    expect(onSubmit).toHaveBeenCalledWith(GOOD);
  });

  it("allows pasting and shows the password on request", async () => {
    const user = userEvent.setup();
    render(
      <SyncPasswordForm
        mode="enter"
        account="x"
        submitLabel="Entsperren"
        onSubmit={async () => undefined}
      />,
    );
    const field = screen.getByLabelText("Passwort");
    expect(field).toHaveAttribute("type", "password");
    await user.click(field);
    await user.paste(GOOD);
    expect(field).toHaveValue(GOOD);
    await user.click(screen.getByLabelText("Passwort anzeigen"));
    expect(field).toHaveAttribute("type", "text");
  });

  it("keeps the form after a wrong password so none is saved by mistake", async () => {
    const user = userEvent.setup();
    render(
      <SyncPasswordForm
        mode="enter"
        account="x"
        submitLabel="Prüfen"
        onSubmit={async () => "Das Passwort passt nicht."}
      />,
    );
    await user.type(screen.getByLabelText("Passwort"), "falsch");
    await user.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("passt nicht");
    expect(screen.getByLabelText("Passwort")).toBeInTheDocument();
    expect(screen.getByLabelText("Passwort")).toHaveAccessibleDescription(
      "Das Passwort passt nicht.",
    );
  });

  it("requires some input when entering", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => undefined);
    render(
      <SyncPasswordForm
        mode="enter"
        account="x"
        submitLabel="Prüfen"
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(screen.getByRole("alert")).toHaveTextContent("eingeben");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders extra fields inside the same form", () => {
    const { container } = render(
      <SyncPasswordForm
        mode="enter"
        account="x"
        submitLabel="Prüfen"
        onSubmit={async () => undefined}
        extra={<input aria-label="Zusatz" />}
      />,
    );
    expect(
      container
        .querySelector("form")
        ?.contains(screen.getByLabelText("Zusatz")),
    ).toBe(true);
  });
});

describe("offerToStorePassword", () => {
  it("hands the credential to the browser where the API exists", async () => {
    const store = vi.fn(async () => undefined);
    class FakeCredential {
      constructor(readonly data: unknown) {}
    }
    Object.defineProperty(window, "PasswordCredential", {
      configurable: true,
      value: FakeCredential,
    });
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: { store },
    });
    await offerToStorePassword("Lernraum-Abgleich · x", GOOD, "Lernraum");
    expect(store).toHaveBeenCalledTimes(1);
    const [credential] = store.mock.calls[0] as unknown as [FakeCredential];
    expect(credential.data).toEqual({
      id: "Lernraum-Abgleich · x",
      password: GOOD,
      name: "Lernraum",
    });
  });

  it("does nothing without the API and survives a refusal", async () => {
    Reflect.deleteProperty(window, "PasswordCredential");
    await expect(offerToStorePassword("a", GOOD, "b")).resolves.toBeUndefined();
    Object.defineProperty(window, "PasswordCredential", {
      configurable: true,
      value: class {
        constructor() {
          throw new Error("verweigert");
        }
      },
    });
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: { store: vi.fn() },
    });
    await expect(offerToStorePassword("a", GOOD, "b")).resolves.toBeUndefined();
    Reflect.deleteProperty(window, "PasswordCredential");
  });
});
