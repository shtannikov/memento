import { PreparingScreen } from "./preparing-screen";
import { QuizScreen } from "./quiz-screen";
import { RoundResult } from "./round-result";
import { useQuizRound } from "./use-quiz-round";

type QuizRoundProps = {
  initData: string;
  onVocabularyChanged: () => Promise<void>;
  onExit: () => void;
};

export function QuizRound({
  initData,
  onVocabularyChanged,
  onExit,
}: QuizRoundProps) {
  const round = useQuizRound(initData, onVocabularyChanged);

  function leaveRound() {
    void round.abandon().finally(onExit);
  }

  if (round.phase === "preparing" || round.phase === "saving") {
    return (
      <PreparingScreen
        onCancel={leaveRound}
        title={
          round.phase === "saving"
            ? "Saving your progress"
            : "Preparing your quiz"
        }
      />
    );
  }

  if (round.phase === "error") {
    return (
      <PreparingScreen
        onCancel={leaveRound}
        title="Quiz unavailable"
        animatedEllipsis={false}
        error={round.error ?? "Please try again."}
        onRetry={
          round.errorCode === "DAILY_GENERATION_LIMIT"
            ? undefined
            : round.restart
        }
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
