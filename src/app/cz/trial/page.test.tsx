import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TrialPage, { metadata } from "./page";

describe("Czech quiz page", () => {
  it("opens a quiz without Telegram initialization", () => {
    const view = render(<TrialPage />);
    const page = within(view.container);

    expect(page.getByText("Choose the best answer")).toBeVisible();
    expect(page.getByLabelText("3 lives remaining")).toBeVisible();
    expect(page.getByText("1 of 10")).toBeVisible();
  });

  it("has standalone quiz metadata", () => {
    expect(metadata).toMatchObject({
      title: "Czech Quiz | Pomněnka",
      description: "Try a Czech quiz with Pomněnka.",
    });
  });
});
