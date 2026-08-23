import { useEffect, useRef } from "react";

import { StatusScreen } from "@/app/_components/status-screen";
import { registerTelegramBackButton } from "@/app/_clients/telegram";
import { QuizScreen } from "./quiz-screen";
import { RoundResult } from "./round-result";
import { useQuizRound } from "./use-quiz-round";
import type { AppId } from "@/app/app-config";

type QuizRoundProps = {
  appId?: AppId;
  initData: string;
  onVocabularyChanged: () => Promise<void>;
  onExit: () => void;
};

export function QuizRound({
  appId = "en",
  initData,
  onVocabularyChanged,
  onExit,
}: QuizRoundProps) {
  const round = useQuizRound(initData, appId, onVocabularyChanged);
  const roundRef = useRef(round);
  const onExitRef = useRef(onExit);

  useEffect(() => {
    roundRef.current = round;
    onExitRef.current = onExit;
  }, [onExit, round]);

  useEffect(
    () =>
      registerTelegramBackButton(() => {
        void roundRef.current.abandon().finally(onExitRef.current);
      }),
    [],
  );

  if (round.phase === "preparing" || round.phase === "saving") {
    return (
      <StatusScreen
        title={
          round.phase === "saving"
            ? "Saving your progress"
            : "Preparing your quiz"
        }
        supportingCopy="Turning your words into questions."
        role="status"
      />
    );
  }

  if (round.phase === "error") {
    return (
      <StatusScreen
        title="Quiz unavailable"
        animatedEllipsis={false}
        supportingCopy={round.error ?? "Please try again."}
        onAction={
          round.errorCode === "DAILY_GENERATION_LIMIT"
            ? undefined
            : round.restart
        }
        actionLabel="Try again"
        role="alert"
      />
    );
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
    />
  );
}
