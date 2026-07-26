import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PreparingScreen } from "./preparing-screen";
import { RoundResult } from "./round-result";

describe("quiz UI", () => {
  it("animates the preparing-screen ellipsis", () => {
    render(<PreparingScreen onCancel={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Preparing your quiz..." }),
    ).toBeVisible();
    expect(screen.getByText("...")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("reuses the home play icon for another successful quiz", () => {
    render(
      <RoundResult
        success
        accuracy={90}
        mistakes={1}
        completed={10}
        total={10}
        onRestart={vi.fn()}
        onVocabulary={vi.fn()}
      />,
    );

    const restart = screen.getByRole("button", {
      name: "Start another quiz",
    });
    expect(restart.querySelector("path")).toHaveAttribute(
      "d",
      "m8 5 11 7-11 7V5Z",
    );
  });
});
