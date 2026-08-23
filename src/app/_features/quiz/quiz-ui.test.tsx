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

  it("normalizes only the initial letter when the blank starts the sentence", () => {
    const onAnswer = vi.fn();
    render(
      <QuizScreen
        card={{
          id: "card-1",
          vocabularyId: "phrase-1",
          sentence: "___ the meeting before lunch.",
          answer: "wrap Up near New York",
          options: ["wrap Up near New York", "take NASA into Account"],
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

    const option = screen.getByRole("button", {
      name: /wrap up near new york/i,
    });
    expect(option).toHaveTextContent("Wrap Up near New York");
    expect(
      screen.getByRole("button", { name: /take nasa into account/i }),
    ).toHaveTextContent("Take NASA into Account");

    fireEvent.click(option);
    expect(onAnswer).toHaveBeenCalledWith("wrap Up near New York");
  });

  it("preserves option casing when the blank is inside the sentence", () => {
    render(
      <QuizScreen
        card={{
          id: "card-2",
          vocabularyId: "phrase-2",
          sentence: "I visited ___ last spring.",
          answer: "New York",
          options: ["New York", "the NASA museum"],
        }}
        completed={0}
        total={1}
        lives={3}
        feedback={null}
        selectedAnswer={null}
        onAnswer={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "A New York" }),
    ).toHaveTextContent("New York");
    expect(
      screen.getByRole("button", { name: "B the NASA museum" }),
    ).toHaveTextContent("the NASA museum");
  });

  it("renders the sentence as selectable read-only text", () => {
    render(
      <QuizScreen
        card={{
          id: "selectable-card",
          vocabularyId: "selectable-phrase",
          sentence: "Select this unfamiliar word.",
          answer: "word",
          options: ["word"],
        }}
        completed={0}
        total={1}
        lives={3}
        feedback={null}
        selectedAnswer={null}
        onAnswer={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    const sentence = screen.getByDisplayValue(
      "Select this unfamiliar word.",
    );
    expect(sentence).toHaveAccessibleName("Quiz sentence");
    expect(sentence).toHaveAttribute("readonly");
    expect(sentence).toHaveValue("Select this unfamiliar word.");

    const selectableSentence = sentence as HTMLTextAreaElement;
    selectableSentence.setSelectionRange(12, 22);
    expect(selectableSentence.selectionStart).toBe(12);
    expect(selectableSentence.selectionEnd).toBe(22);
  });

  it("fits the quiz to its viewport and keeps sentence selection enabled on iOS", () => {
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
    expect(quizStyles).toContain(
      "ellipse 19rem 15rem at 50% 64%,\n      rgb(124 36 248 / 11%),",
    );
    const screenRule = quizStyles.match(/\.screen \{[\s\S]*?\}/)?.[0];
    expect(screenRule).not.toContain("user-select");
    expect(quizStyles).toContain(
      ".content {\n  display: flex;\n  min-height: 0;\n  flex: 1 1 auto;",
    );
    expect(quizStyles).toContain("flex-direction: column;\n  overflow-y: auto;");
    expect(quizStyles).toContain(
      ".sentence {\n  all: unset;\n  display: block;\n  width: 100%;",
    );
    expect(quizStyles).toContain("margin: 15px 0 34px;");
    expect(quizStyles).toContain("-webkit-tap-highlight-color: transparent;");
    expect(quizStyles).toContain("-webkit-touch-callout: default;");
    expect(quizStyles).toContain("-webkit-user-select: text;\n  user-select: text;");
    expect(quizStyles).toContain(
      ".sentence:focus,\n.sentence:focus-visible {\n  outline: none;\n  box-shadow: none;",
    );
    expect(quizStyles).toContain(
      ".header,\n.eyebrow,\n.options,\n.feedbackLabel {\n  -webkit-user-select: none;\n  user-select: none;",
    );
  });
});
