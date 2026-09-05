import { RotateCcw, Send, Trophy } from "lucide-react";

import styles from "@/app/_features/quiz/round-result.module.css";
import trialStyles from "./trial-quiz-result.module.css";

type TrialQuizResultProps = {
  success: boolean;
  accuracy: number;
  mistakes: number;
  completed: number;
  total: number;
  telegramUrl: string;
  onRestart: () => void;
};

export function TrialQuizResult({
  success,
  accuracy,
  mistakes,
  completed,
  total,
  telegramUrl,
  onRestart,
}: TrialQuizResultProps) {
  return (
    <div
      className={`${styles.screen} ${
        success ? styles.success : styles.failure
      }`}
    >
      <div className={styles.resultMark}>
        {success ? (
          <Trophy aria-hidden="true" />
        ) : (
          <RotateCcw aria-hidden="true" />
        )}
      </div>
      <p className={styles.eyebrow}>
        {success ? "Nicely done" : "That one was tough"}
      </p>
      <h1>{success ? "Trial complete" : "Trial finished"}</h1>
      <p className={styles.supportingCopy}>
        {success
          ? "Keep learning these words in Pomněnka."
          : "All three lives are gone. Keep learning in Pomněnka."}
      </p>
      <div className={styles.stats}>
        <article>
          <strong>{success ? `${accuracy}%` : `${completed}/${total}`}</strong>
          <span>{success ? "first-try accuracy" : "words completed"}</span>
        </article>
        <article>
          <strong>{mistakes}</strong>
          <span>{mistakes === 1 ? "mistake" : "mistakes"}</span>
        </article>
      </div>
      <div className={styles.actions}>
        <a
          className={`${styles.primaryButton} ${trialStyles.telegramLink}`}
          href={telegramUrl}
        >
          <Send aria-hidden="true" />
          Continue in Telegram
        </a>
        <button
          className={`${styles.secondaryButton} ${trialStyles.retryButton}`}
          onClick={onRestart}
        >
          <RotateCcw aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}
