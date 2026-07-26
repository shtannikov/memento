import {
  RotateCcw,
  Trophy,
} from "lucide-react";

import { PlayIcon } from "@/features/vocabulary/vocabulary-icons";

import styles from "./round-result.module.css";

type RoundResultProps = {
  success: boolean;
  accuracy: number;
  mistakes: number;
  completed: number;
  total: number;
  onRestart: () => void;
  onVocabulary: () => void;
};

export function RoundResult({
  success,
  accuracy,
  mistakes,
  completed,
  total,
  onRestart,
  onVocabulary,
}: RoundResultProps) {
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
      <h1>{success ? "Quiz complete" : "Quiz failed"}</h1>
      <p className={styles.supportingCopy}>
        {success
          ? "Great work — you completed the whole quiz."
          : "All three lives are gone."}
      </p>
      <div className={styles.stats}>
        <article>
          <strong>{success ? `${accuracy}%` : `${completed}/${total}`}</strong>
          <span>
            {success ? "first-try accuracy" : "words completed"}
          </span>
        </article>
        <article>
          <strong>{mistakes}</strong>
          <span>{mistakes === 1 ? "mistake" : "mistakes"}</span>
        </article>
      </div>
      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={onRestart}>
          {success ? (
            <PlayIcon />
          ) : (
            <RotateCcw aria-hidden="true" />
          )}
          {success ? "Start another quiz" : "Start again"}
        </button>
        <button
          className={styles.secondaryButton}
          onClick={onVocabulary}
        >
          Back to Vocabulary
        </button>
      </div>
    </div>
  );
}
