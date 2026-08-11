import { StatusScreen } from "@/ui/status-screen";
import { QuizScreen } from "./quiz-screen";
import { RoundResult } from "./round-result";
import { useQuizRound } from "./use-quiz-round";
import type { AppId } from "@/lib/domain/app";

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

  function leaveRound() {
    void round.abandon().finally(onExit);
  }

  if (round.phase === "preparing" || round.phase === "saving") {
    return (
      <StatusScreen
        onBack={leaveRound}
        backLabel="Vocabulary"
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
        onBack={leaveRound}
        backLabel="Vocabulary"
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
      onExit={leaveRound}
    />
  );
}
