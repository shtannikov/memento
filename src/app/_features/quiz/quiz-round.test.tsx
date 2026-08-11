import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuizRound } from "./quiz-round";
import { useQuizRound } from "./use-quiz-round";

vi.mock("./use-quiz-round", () => ({
  useQuizRound: vi.fn(),
}));

const mockedUseQuizRound = vi.mocked(useQuizRound);

function errorRound(errorCode: string | null) {
  return {
    phase: "error" as const,
    activeCard: {
      id: "card-1",
      vocabularyId: "word-1",
      sentence: "The meeting is about to ___.",
      answer: "wrap up",
      options: ["wrap up"],
    },
    completedCount: 0,
    totalCount: 0,
    lives: 3,
    mistakes: 0,
    firstAttemptAccuracy: 0,
    selectedAnswer: null,
    feedback: null,
    error:
      "You’ve used today’s five quiz generations.\nTry again tomorrow.",
    errorCode,
    restart: vi.fn(),
    chooseAnswer: vi.fn(),
    abandon: vi.fn().mockResolvedValue(undefined),
  };
}

describe("QuizRound errors", () => {
  beforeEach(() => {
    mockedUseQuizRound.mockReset();
  });

  it("does not offer retry after the daily generation limit", () => {
    mockedUseQuizRound.mockReturnValue(
      errorRound("DAILY_GENERATION_LIMIT"),
    );

    render(
      <QuizRound
        initData="telegram-data"
        onVocabularyChanged={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    const message = document.querySelector("p");
    if (!message) throw new Error("Expected an error message.");
    expect(message.querySelector("br")).toBeInTheDocument();
    expect(message).toHaveTextContent(
      "You’ve used today’s five quiz generations.Try again tomorrow.",
    );
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("keeps retry available for recoverable preparation errors", () => {
    const round = errorRound("OPENAI_UNAVAILABLE");
    round.error = "Couldn’t prepare this quiz.";
    mockedUseQuizRound.mockReturnValue(round);

    render(
      <QuizRound
        initData="telegram-data"
        onVocabularyChanged={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeVisible();
  });
});
