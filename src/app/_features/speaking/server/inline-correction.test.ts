// @vitest-environment node

import { describe, expect, it } from "vitest";

import { formatInlineCorrection } from "./inline-correction";

describe("formatInlineCorrection", () => {
  it("keeps shared words and marks only the changed words", () => {
    expect(
      formatInlineCorrection(
        "I took it into account",
        "I have taken it into account",
      ),
    ).toBe("I <s>took</s> <b>have taken</b> it into account");
  });

  it("escapes learner text before adding Telegram HTML", () => {
    expect(formatInlineCorrection("A &value B", "A safe B")).toBe(
      "A &amp;<s>value</s> <b>safe</b> B",
    );
  });

  it("keeps a word inserted before the first original word separated", () => {
    expect(formatInlineCorrection("Long", "A long")).toBe(
      "<b>A</b> long",
    );
    expect(formatInlineCorrection("Leg hurts", "Your leg hurts")).toBe(
      "<b>Your</b> leg hurts",
    );
  });
});
