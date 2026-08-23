import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { QuizScreen } from "./quiz-screen";
import { RoundResult } from "./round-result";

describe("quiz UI", () => {
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
      screen.getByText("Your vocabulary is getting stronger."),
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

    const selectedOption = screen.getByRole("button", {
      name: /wrap up/i,
    });
    selectedOption.focus();
    expect(selectedOption).toHaveFocus();
    fireEvent.click(selectedOption, { detail: 1 });
    expect(document.activeElement).toBe(document.body);

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

  it("shows every option in lowercase without changing its answer value", () => {
    const onAnswer = vi.fn();
    render(
      <QuizScreen
        card={{
          id: "card-1",
          vocabularyId: "phrase-1",
          sentence: "___ the meeting before lunch.",
          answer: "Wrap Up Now",
          options: ["Wrap Up Now", "Take Into Account"],
        }}
        completed={0}
        total={1}
        lives={3}
        feedback={null}
        selectedAnswer={null}
        onAnswer={onAnswer}
        onExit={vi.fn()}
      />,
    );

    const option = screen.getByRole("button", { name: /wrap up now/i });
    expect(option).toHaveTextContent("wrap up now");
    expect(option).not.toHaveTextContent("Wrap Up Now");

    fireEvent.click(option);
    expect(onAnswer).toHaveBeenCalledWith("Wrap Up Now");
  });

  it("fits the quiz to its viewport and only allows selecting the sentence", () => {
    const quizStyles = readFileSync(
      join(
        process.cwd(),
        "src/app/_features/quiz/quiz-screen.module.css",
      ),
      "utf8",
    );

    expect(quizStyles).toContain(
      ".screen {\n  display: flex;\n  height: 100%;\n  min-height: 0;",
    );
    expect(quizStyles).toContain("flex-direction: column;\n  overflow: hidden;");
    expect(quizStyles).toContain("background: var(--surface);\n  user-select: none;");
    expect(quizStyles).toContain(
      ".content {\n  display: flex;\n  min-height: 0;\n  flex: 1 1 auto;",
    );
    expect(quizStyles).toContain("flex-direction: column;\n  overflow-y: auto;");
    expect(quizStyles).toContain(
      ".sentence {\n  margin: 15px 0 34px;",
    );
    expect(quizStyles).toContain("-webkit-user-select: text;\n  user-select: text;");
  });
});
