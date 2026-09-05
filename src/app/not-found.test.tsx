import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicNotFound } from "./not-found";

const { requestHeaders } = vi.hoisted(() => ({
  requestHeaders: new Headers(),
}));

vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));
vi.mock("@/app/_features/trial-quiz/server/trial-telegram", () => ({
  pomnenkaTelegramUrl: () => "https://t.me/pomnenkastagebot",
}));

describe("PublicNotFound", () => {
  beforeEach(() => requestHeaders.delete("x-memento-site"));

  it("shows the Pomnenka landing for unknown Pomnenka paths", async () => {
    requestHeaders.set("x-memento-site", "pomnenka");
    render(await PublicNotFound());

    expect(
      screen.getByRole("heading", { name: "Meet Pomněnka." }),
    ).toBeInTheDocument();
  });

  it("keeps a neutral not-found page on other sites", async () => {
    render(await PublicNotFound());

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Admin/)).not.toBeInTheDocument();
  });
});
