import { ArrowLeft } from "lucide-react";

import styles from "./quiz-shared.module.css";

type PreparingScreenProps = {
  onCancel: () => void;
  title?: string;
  error?: string;
  onRetry?: () => void;
};

export function PreparingScreen({
  onCancel,
  title = "Preparing your quiz…",
  error,
  onRetry,
}: PreparingScreenProps) {
  return (
    <div className={styles.centerScreen}>
      <button className={styles.backButton} onClick={onCancel}>
        <ArrowLeft aria-hidden="true" />
        Vocabulary
      </button>
      <h1>{title}</h1>
      <p className={styles.supportingCopy}>
        {error ?? "Turning your words into questions."}
      </p>
      {onRetry && (
        <button className={styles.primaryButton} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
