import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PreparingScreen } from "./preparing-screen";
import { QuizScreen } from "./quiz-screen";
import { RoundResult } from "./round-result";

describe("quiz UI", () => {
  it("animates the preparing-screen ellipsis", () => {
    render(<PreparingScreen onCancel={vi.fn()} />);

    const heading = screen.getByRole("heading", {
      name: "Preparing your quiz...",
    });
    expect(heading).toBeVisible();

    const ellipsis = heading.querySelector("[aria-hidden='true']");
    expect(ellipsis).toHaveTextContent("...");
    expect(ellipsis?.children).toHaveLength(3);
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
    expect(
      screen.getByText("Great work — you completed the whole quiz."),
    ).toBeVisible();
  });

  it("keeps failed-quiz copy concise", () => {
    render(
      <RoundResult
        success={false}
        accuracy={0}
        mistakes={3}
        completed={1}
        total={10}
        onRestart={vi.fn()}
        onVocabulary={vi.fn()}
      />,
    );

    expect(screen.getByText("All three lives are gone.")).toBeVisible();
    expect(
      screen.queryByText(/learning progress is unchanged/i),
    ).not.toBeInTheDocument();
  });

  it("removes focus from the previous card when moving on", () => {
    const firstCard = {
      id: "card-1",
      vocabularyId: "phrase-1",
      sentence: "Let’s ___ the meeting.",
      answer: "wrap up",
      options: ["wrap up", "take into account"],
    };
    const { rerender } = render(
      <QuizScreen
        card={firstCard}
        completed={0}
        total={2}
        lives={3}
        feedback={null}
        selectedAnswer={null}
        onAnswer={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    screen.getByRole("button", { name: /wrap up/i }).focus();
    expect(screen.getByRole("button", { name: /wrap up/i })).toHaveFocus();

    rerender(
      <QuizScreen
        card={{
          ...firstCard,
          id: "card-2",
          sentence: "We should ___ every risk.",
          answer: "take into account",
        }}
        completed={1}
        total={2}
        lives={3}
        feedback={null}
        selectedAnswer={null}
        onAnswer={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(document.activeElement).toBe(document.body);
  });
});
