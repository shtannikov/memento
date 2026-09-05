"use client";

import { QuizScreen } from "@/app/_features/quiz/quiz-screen";
import type { TrialQuizManifest } from "./trial-quiz.types";
import { TrialQuizResult } from "./trial-quiz-result";
import { useTrialQuiz } from "./use-trial-quiz";

type TrialQuizProps = {
  manifest: TrialQuizManifest;
  telegramUrl: string;
};

export function TrialQuiz({ manifest, telegramUrl }: TrialQuizProps) {
  const trial = useTrialQuiz(manifest.cards);

  if (trial.phase === "complete" || trial.phase === "failed") {
    return (
      <TrialQuizResult
        success={trial.phase === "complete"}
        accuracy={trial.firstAttemptAccuracy}
        mistakes={trial.mistakes}
        completed={trial.completedCount}
        total={trial.totalCount}
        telegramUrl={telegramUrl}
        onRestart={trial.restart}
      />
    );
  }

  if (!trial.activeCard) return null;

  return (
    <QuizScreen
      card={trial.activeCard}
      completed={trial.completedCount}
      total={trial.totalCount}
      lives={trial.lives}
      feedback={trial.feedback}
      selectedAnswer={trial.selectedAnswer}
      onAnswer={trial.chooseAnswer}
    />
  );
}
