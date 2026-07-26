import { useCallback, useState } from "react";

import { quizCards } from "./quiz-cards";
import type { QuizFeedback } from "./quiz.types";

type QuizPhase = "preparing" | "active" | "complete" | "failed";

export function useQuizRound() {
  const [phase, setPhase] = useState<QuizPhase>("preparing");
  const [queue, setQueue] = useState(quizCards);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [firstAttemptedIds, setFirstAttemptedIds] = useState<number[]>([]);
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [lives, setLives] = useState(3);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const activeCard = queue[0];
  const feedback: QuizFeedback = selectedAnswer
    ? selectedAnswer === activeCard?.answer
      ? "correct"
      : "incorrect"
    : null;

  const begin = useCallback(() => {
    setPhase("active");
  }, []);

  function restart() {
    setQueue(quizCards);
    setCompletedIds([]);
    setFirstAttemptedIds([]);
    setFirstAttemptCorrect(0);
    setMistakes(0);
    setLives(3);
    setSelectedAnswer(null);
    setPhase("preparing");
  }

  function chooseAnswer(answer: string) {
    if (selectedAnswer || !activeCard) return;

    const isCorrect = answer === activeCard.answer;
    const isFirstAttempt = !firstAttemptedIds.includes(activeCard.id);
    setSelectedAnswer(answer);

    if (isFirstAttempt) {
      setFirstAttemptedIds((ids) => [...ids, activeCard.id]);
      if (isCorrect) setFirstAttemptCorrect((count) => count + 1);
    }

    window.setTimeout(() => {
      if (isCorrect) {
        const nextCompleted = [...completedIds, activeCard.id];
        setCompletedIds(nextCompleted);
        setQueue((cards) => cards.slice(1));
        setSelectedAnswer(null);
        if (nextCompleted.length === quizCards.length) setPhase("complete");
        return;
      }

      const nextLives = lives - 1;
      setMistakes((count) => count + 1);
      setLives(nextLives);
      setSelectedAnswer(null);

      if (nextLives === 0) {
        setPhase("failed");
      } else {
        setQueue((cards) => [...cards.slice(1), cards[0]]);
      }
    }, 820);
  }

  return {
    phase,
    activeCard,
    completedCount: completedIds.length,
    totalCount: quizCards.length,
    lives,
    mistakes,
    firstAttemptAccuracy: Math.round(
      (firstAttemptCorrect / quizCards.length) * 100,
    ),
    selectedAnswer,
    feedback,
    begin,
    restart,
    chooseAnswer,
  };
}
