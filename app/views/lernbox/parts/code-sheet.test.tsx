import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodeSheet } from "./code-sheet";
import type { LernBoxScreenProps } from "./types";

vi.mock("../../../ui/qr-scanner", () => ({
  QrCodeScanner: ({ onResult }: { onResult: (value: string) => void }) => (
    <>
      <button type="button" onClick={() => onResult("scan-ok")}>
        scan-ok
      </button>
      <button type="button" onClick={() => onResult("scan-bad")}>
        scan-bad
      </button>
    </>
  ),
}));

const CODE = "23456789ABCDEFGHJKLMNPQR";

function renderSheet(props: Partial<LernBoxScreenProps> = {}) {
  const base = {
    transfer: { busy: false, error: "", success: null },
    onReadTransferCode: (value: string) => (value === "scan-ok" ? CODE : null),
    ...props,
  } as unknown as LernBoxScreenProps;
  return render(<CodeSheet {...base} />);
}

describe("CodeSheet scan", () => {
  it("puts a scanned code into the code field", () => {
    renderSheet();
    fireEvent.click(screen.getByText("scan-ok"));
    expect((screen.getByLabelText("Code") as HTMLInputElement).value).toBe(
      "2345 6789 ABCD EFGH JKLM NPQR",
    );
  });

  it("shows an error for text without a code and keeps the field empty", () => {
    renderSheet();
    fireEvent.click(screen.getByText("scan-bad"));
    expect(screen.getByRole("alert").textContent).toContain("keinen gültigen");
    expect((screen.getByLabelText("Code") as HTMLInputElement).value).toBe("");
  });

  it("prefills the code from a link", () => {
    renderSheet();
    render(
      <CodeSheet
        {...({
          transfer: { busy: false, error: "", success: null },
          initialCode: CODE,
        } as unknown as LernBoxScreenProps)}
        initialCode={CODE}
      />,
    );
    expect(
      (screen.getAllByLabelText("Code")[1] as HTMLInputElement).value,
    ).toContain("2345");
  });
});
