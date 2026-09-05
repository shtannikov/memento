import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CZECH_LANGUAGE } from "@/app/_languages/cz";
import { LanguageLanding } from "./language-landing";

describe("LanguageLanding", () => {
  it("explains the product and offers both public entry points", () => {
    render(
      <LanguageLanding
        language={CZECH_LANGUAGE}
        telegramUrl="https://t.me/pomnenkastagebot"
        trialUrl="/trial"
      />,
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
