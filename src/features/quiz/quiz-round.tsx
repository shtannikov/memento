import { useEffect } from "react";

import { PreparingScreen } from "./preparing-screen";
import { QuizScreen } from "./quiz-screen";
import { RoundResult } from "./round-result";
import { useQuizRound } from "./use-quiz-round";

type QuizRoundProps = {
  onExit: () => void;
};

export function QuizRound({ onExit }: QuizRoundProps) {
  const round = useQuizRound();

  useEffect(() => {
    if (round.phase !== "preparing") return;

    const timer = window.setTimeout(round.begin, 1600);
    return () => window.clearTimeout(timer);
  }, [round.begin, round.phase]);

  if (round.phase === "preparing") {
    return <PreparingScreen onCancel={onExit} />;
  }

  if (round.phase === "complete") {
    return (
      <RoundResult
        success
        accuracy={round.firstAttemptAccuracy}
        mistakes={round.mistakes}
        completed={round.totalCount}
        total={round.totalCount}
        onRestart={round.restart}
        onVocabulary={onExit}
      />
    );
  }

  if (round.phase === "failed") {
    return (
      <RoundResult
        success={false}
        accuracy={0}
        mistakes={round.mistakes}
        completed={round.completedCount}
        total={round.totalCount}
        onRestart={round.restart}
        onVocabulary={onExit}
      />
    );
  }

  if (!round.activeCard) return null;

  return (
    <QuizScreen
      card={round.activeCard}
      completed={round.completedCount}
      total={round.totalCount}
      lives={round.lives}
      feedback={round.feedback}
      selectedAnswer={round.selectedAnswer}
      onAnswer={round.chooseAnswer}
      onExit={onExit}
    />
  );
}
