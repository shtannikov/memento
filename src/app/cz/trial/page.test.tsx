import { render, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TrialPage, { defaultMetadata, generateMetadata } from "./page";

const { requestHeaders } = vi.hoisted(() => ({
  requestHeaders: new Headers(),
}));

vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

describe("Czech quiz page", () => {
  beforeEach(() => requestHeaders.delete("x-memento-site"));

  it("opens a quiz without Telegram initialization", () => {
    const view = render(<TrialPage />);
    const page = within(view.container);

    expect(page.getByText("Choose the best answer")).toBeVisible();
    expect(page.getByLabelText("3 lives remaining")).toBeVisible();
    expect(page.getByText("1 of 10")).toBeVisible();
  });

  it("has standalone quiz metadata", () => {
    expect(defaultMetadata).toMatchObject({ title: "Czech Quiz | Pomněnka" });
  });

  it("uses Pomnenka branding on its production domain", async () => {
    requestHeaders.set("x-memento-site", "pomnenka");

    await expect(generateMetadata()).resolves.toMatchObject({
      title: "Pomněnka",
      icons: { icon: "/pomnenka-icon.png" },
    });
  });
});
