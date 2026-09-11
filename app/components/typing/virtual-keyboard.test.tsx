import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VirtualKeyboard } from "./virtual-keyboard";

describe("VirtualKeyboard", () => {
  it("colors only the focus keys while always emphasizing the next key", () => {
    const { container } = render(
      <VirtualKeyboard nextChar="f" activeChars={["f", "j"]} />,
    );

    const activeKeys = container.querySelectorAll(
      ".virtual-keyboard__key.is-active",
    );
    expect(activeKeys).toHaveLength(2);
    expect(
      container.querySelectorAll(".virtual-keyboard__key.is-next"),
    ).toHaveLength(1);
    expect(
      container.querySelector('[style*="--key-width: 6.6"]'),
    ).not.toHaveClass("is-active");
  });
});
