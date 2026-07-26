import { ArrowLeft } from "lucide-react";

import styles from "./quiz-shared.module.css";

type PreparingScreenProps = {
  onCancel: () => void;
  title?: string;
  animatedEllipsis?: boolean;
  error?: string;
  onRetry?: () => void;
};

export function PreparingScreen({
  onCancel,
  title = "Preparing your quiz",
  animatedEllipsis = true,
  error,
  onRetry,
}: PreparingScreenProps) {
  return (
    <div className={styles.centerScreen}>
      <button className={styles.backButton} onClick={onCancel}>
        <ArrowLeft aria-hidden="true" />
        Vocabulary
      </button>
      <h1 aria-label={animatedEllipsis ? `${title}...` : undefined}>
        {title}
        {animatedEllipsis && (
          <span className={styles.animatedDots} aria-hidden="true">
            ...
          </span>
        )}
      </h1>
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
