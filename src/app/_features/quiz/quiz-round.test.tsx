import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("QuizRound", () => {
  beforeEach(() => {
    mockedUseQuizRound.mockReset();
  });

  afterEach(() => {
    globalThis.Telegram = undefined;
  });

  it("uses Telegram's native back button to return to vocabulary", async () => {
    const round = errorRound("DAILY_GENERATION_LIMIT");
    const onExit = vi.fn();
    const show = vi.fn();
    const hide = vi.fn();
    const offClick = vi.fn();
    let handleBack: (() => void) | undefined;
    globalThis.Telegram = {
      WebApp: {
        initData: "signed",
        ready: vi.fn(),
        expand: vi.fn(),
        BackButton: {
          show,
          hide,
          onClick: vi.fn((callback) => {
            handleBack = callback;
          }),
          offClick,
        },
      },
    };
    mockedUseQuizRound.mockReturnValue(round);

    const { unmount } = render(
      <QuizRound
        initData="telegram-data"
        onVocabularyChanged={vi.fn()}
        onExit={onExit}
      />,
    );

    expect(show).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Vocabulary" }),
    ).not.toBeInTheDocument();

    handleBack?.();
    await waitFor(() => {
      expect(round.abandon).toHaveBeenCalledOnce();
      expect(onExit).toHaveBeenCalledOnce();
    });

    unmount();
    expect(offClick).toHaveBeenCalledWith(handleBack);
    expect(hide).toHaveBeenCalledOnce();
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
