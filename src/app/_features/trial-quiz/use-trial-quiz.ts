"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { randomizeQuizCards } from "@/app/_features/quiz/domain/quiz-options";
import {
  recordAnswer,
  ROUND_LIVES,
  type RoundProgress,
} from "@/app/_features/quiz/domain/round";
import type { QuizFeedback } from "@/app/_features/quiz/quiz.types";
import type { TrialQuizCard } from "./trial-quiz.types";

export type TrialQuizPhase = "active" | "complete" | "failed";

const FEEDBACK_DELAY_MS = 700;

export function useTrialQuiz(cards: TrialQuizCard[]) {
  const attempt = useRef(0);
  const [phase, setPhase] = useState<TrialQuizPhase>("active");
  const [progress, setProgress] = useState(() => createProgress(cards, 0));
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  const activeCard = progress.queue[0];
  const feedback: QuizFeedback = selectedAnswer
    ? selectedAnswer === activeCard?.answer
      ? "correct"
      : "incorrect"
    : null;

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimer.current === null) return;
    window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null;
  }, []);

  useEffect(() => clearFeedbackTimer, [clearFeedbackTimer]);

  function chooseAnswer(answer: string) {
    if (selectedAnswer || !activeCard || phase !== "active") return;

    const correct = answer === activeCard.answer;
    setSelectedAnswer(answer);
    feedbackTimer.current = window.setTimeout(() => {
      feedbackTimer.current = null;
      const next = recordAnswer(progress, correct);
      setProgress(next);
      setSelectedAnswer(null);
      if (next.lives === 0) setPhase("failed");
      else if (next.queue.length === 0) setPhase("complete");
    }, FEEDBACK_DELAY_MS);
  }

  function restart() {
    clearFeedbackTimer();
    attempt.current += 1;
    setProgress(createProgress(cards, attempt.current));
    setSelectedAnswer(null);
    setPhase("active");
  }

  const correctFirstAttempts = Object.values(progress.firstAttempts).filter(
    Boolean,
  ).length;

  return {
    phase,
    activeCard,
    completedCount: progress.completedIds.length,
    totalCount: cards.length,
    lives: progress.lives,
    mistakes: progress.mistakes,
    firstAttemptAccuracy:
      cards.length === 0
        ? 0
        : Math.round((correctFirstAttempts / cards.length) * 100),
    feedback,
    selectedAnswer,
    chooseAnswer,
    restart,
  };
}

function createProgress(
  cards: TrialQuizCard[],
  attempt: number,
): RoundProgress<TrialQuizCard> {
  return {
    queue: randomizeQuizCards(cards, createTrialRandomIndex(cards, attempt)),
    completedIds: [],
    firstAttempts: {},
    lives: ROUND_LIVES,
    mistakes: 0,
  };
}

export function createTrialRandomIndex(
  cards: TrialQuizCard[],
  attempt: number,
): (maxExclusive: number) => number {
  let state = hash(`${cards.map((card) => card.id).join("|")}:${attempt}`);

  return (maxExclusive) => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state % maxExclusive;
  };
}

function hash(value: string): number {
  let result = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    result = Math.imul(result ^ value.charCodeAt(index), 16_777_619);
  }
  return result >>> 0;
}
