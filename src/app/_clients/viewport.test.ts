import { describe, expect, it } from "vitest";

import { isVirtualKeyboardOpen } from "./viewport";

describe("isVirtualKeyboardOpen", () => {
  it("detects a focused keyboard from viewport height loss", () => {
    expect(
      isVirtualKeyboardOpen({
        baselineHeight: 844,
        viewportHeight: 520,
        editableFocused: true,
        keyboardWasOpen: false,
      }),
    ).toBe(true);
  });

  it("stays closed for small viewport changes or without editable focus", () => {
    expect(
      isVirtualKeyboardOpen({
        baselineHeight: 844,
        viewportHeight: 780,
        editableFocused: true,
        keyboardWasOpen: false,
      }),
    ).toBe(false);
    expect(
      isVirtualKeyboardOpen({
        baselineHeight: 844,
        viewportHeight: 520,
        editableFocused: false,
        keyboardWasOpen: false,
      }),
    ).toBe(false);
  });

  it("stays open after blur until the viewport height is restored", () => {
    expect(
      isVirtualKeyboardOpen({
        baselineHeight: 844,
        viewportHeight: 520,
        editableFocused: false,
        keyboardWasOpen: true,
      }),
    ).toBe(true);
    expect(
      isVirtualKeyboardOpen({
        baselineHeight: 844,
        viewportHeight: 780,
        editableFocused: false,
        keyboardWasOpen: true,
      }),
    ).toBe(true);
    expect(
      isVirtualKeyboardOpen({
        baselineHeight: 844,
        viewportHeight: 840,
        editableFocused: false,
        keyboardWasOpen: true,
      }),
    ).toBe(false);
  });
});
