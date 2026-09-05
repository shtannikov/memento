import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PomnenkaLanding } from "./pomnenka-landing";

describe("PomnenkaLanding", () => {
  it("explains the product and offers both public entry points", () => {
    render(
      <PomnenkaLanding telegramUrl="https://t.me/pomnenkastagebot" />,
    );

    expect(
      screen.getByRole("heading", { name: "Meet Pomněnka." }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Add Czech words and phrases/)).toHaveTextContent(
      "Add Czech words and phrases, practice them with quick quizzes, and track your progress 🚀",
    );
    expect(screen.getAllByRole("link", { name: "Open in Telegram" })).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: "Open in Telegram" })[0]).toHaveAttribute(
      "href",
      "https://t.me/pomnenkastagebot",
    );
    expect(screen.getByRole("link", { name: "Try a quiz" })).toHaveAttribute(
      "href",
      "/trial",
    );
    expect(
      screen.getByAltText("Pomněnka vocabulary list and Czech quiz"),
    ).toBeInTheDocument();
  });
});
