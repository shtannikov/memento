import { describe, expect, it } from "vitest";

import { isVirtualKeyboardOpen } from "./viewport";

describe("isVirtualKeyboardOpen", () => {
  it("detects a focused keyboard from viewport height loss", () => {
    expect(
      isVirtualKeyboardOpen({
        baselineHeight: 844,
        viewportHeight: 520,
        editableFocused: true,
      }),
    ).toBe(true);
  });

  it("stays closed for small viewport changes or without editable focus", () => {
    expect(
      isVirtualKeyboardOpen({
        baselineHeight: 844,
        viewportHeight: 780,
        editableFocused: true,
      }),
    ).toBe(false);
    expect(
      isVirtualKeyboardOpen({
        baselineHeight: 844,
        viewportHeight: 520,
        editableFocused: false,
      }),
    ).toBe(false);
  });
});
