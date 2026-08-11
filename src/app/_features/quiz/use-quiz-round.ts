import { useCallback, useEffect, useRef, useState } from "react";

import {
  completeRound,
  failRound,
  prepareRound,
} from "@/app/_client/api";
import { ClientError } from "@/app/_client/telegram";
import { ROUND_LIVES } from "@/app/_features/quiz/domain/round";
import type { AppId } from "@/app/app-config";
import type { QuizCard, QuizFeedback } from "./quiz.types";

type QuizPhase =
  | "preparing"
  | "active"
  | "saving"
  | "complete"
  | "failed"
  | "error";

export function useQuizRound(
  initData: string,
  appId: AppId,
  onVocabularyChanged: () => Promise<void>,
) {
  const [phase, setPhase] = useState<QuizPhase>("preparing");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [retryRoundId, setRetryRoundId] = useState<string | null>(null);
  const [cards, setCards] = useState<QuizCard[]>([]);
  const [queue, setQueue] = useState<QuizCard[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [firstAttempts, setFirstAttempts] = useState<
    Record<string, boolean>
  >({});
  const [mistakes, setMistakes] = useState(0);
  const [lives, setLives] = useState(ROUND_LIVES);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const started = useRef(false);
  const feedbackTimer = useRef<number | null>(null);

  const start = useCallback(
    async (retryId?: string) => {
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current);
        feedbackTimer.current = null;
      }
      setPhase("preparing");
      setError(null);
      setErrorCode(null);
      setSelectedAnswer(null);
      setCompletedIds([]);
      setFirstAttempts({});
      setMistakes(0);
      setLives(ROUND_LIVES);
      try {
        const round = await prepareRound(initData, appId, retryId);
        setRoundId(round.id);
        setRetryRoundId(null);
        setCards(round.cards);
        setQueue(round.cards);
        setPhase("active");
      } catch (caught) {
        setErrorCode(
          caught instanceof ClientError ? caught.code : null,
        );
        setError(
          caught instanceof Error
            ? caught.message
            : "Couldn’t prepare this quiz.",
        );
        if (caught instanceof ClientError && caught.retryRoundId) {
          setRetryRoundId(caught.retryRoundId);
        }
        setPhase("error");
      }
    },
    [appId, initData],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  useEffect(
    () => () => {
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current);
      }
    },
    [],
  );

  const activeCard = queue[0];
  const feedback: QuizFeedback = selectedAnswer
    ? selectedAnswer === activeCard?.answer
      ? "correct"
      : "incorrect"
    : null;

  function restart() {
    const retryId =
      phase === "complete" ? undefined : retryRoundId ?? roundId ?? undefined;
    void start(retryId);
  }

  function chooseAnswer(answer: string) {
    if (selectedAnswer || !activeCard || !roundId) return;

    const isCorrect = answer === activeCard.answer;
    const isFirstAttempt = !(activeCard.id in firstAttempts);
    const nextFirstAttempts = isFirstAttempt
      ? { ...firstAttempts, [activeCard.id]: isCorrect }
      : firstAttempts;
    setFirstAttempts(nextFirstAttempts);
    setSelectedAnswer(answer);

    feedbackTimer.current = window.setTimeout(() => {
      feedbackTimer.current = null;
      if (isCorrect) {
        const nextCompleted = [...completedIds, activeCard.id];
        const remaining = queue.slice(1);
        setCompletedIds(nextCompleted);
        setQueue(remaining);
        setSelectedAnswer(null);
        if (remaining.length === 0) {
          setPhase("saving");
          const results = cards.map((card) => ({
            vocabularyId: card.vocabularyId,
            correct: nextFirstAttempts[card.id],
          }));
          void completeRound(initData, appId, roundId, results, mistakes)
            .then(onVocabularyChanged)
            .then(() => setPhase("complete"))
            .catch((caught) => {
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Couldn’t save your quiz.",
              );
              setPhase("error");
            });
        }
        return;
      }

      const nextLives = lives - 1;
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setLives(nextLives);
      setSelectedAnswer(null);

      if (nextLives === 0) {
        void failRound(initData, appId, roundId);
        setRetryRoundId(roundId);
        setPhase("failed");
      } else {
        setQueue((current) => [...current.slice(1), current[0]]);
      }
    }, 820);
  }

  async function abandon(): Promise<void> {
    if (roundId && ["preparing", "active", "saving"].includes(phase)) {
      await failRound(initData, appId, roundId).catch(() => undefined);
    }
  }

  const firstAttemptCorrect = Object.values(firstAttempts).filter(
    Boolean,
  ).length;

  return {
    phase,
    activeCard,
    completedCount: completedIds.length,
    totalCount: cards.length,
    lives,
    mistakes,
    firstAttemptAccuracy: cards.length
      ? Math.round((firstAttemptCorrect / cards.length) * 100)
      : 0,
    selectedAnswer,
    feedback,
    error,
    errorCode,
    restart,
    chooseAnswer,
    abandon,
  };
}
