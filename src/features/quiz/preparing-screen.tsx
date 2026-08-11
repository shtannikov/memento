import { ArrowLeft } from "lucide-react";
import { Fragment } from "react";

import styles from "./quiz-shared.module.css";

type PreparingScreenProps = {
  onCancel?: () => void;
  title?: string;
  supportingCopy?: string;
  animatedEllipsis?: boolean;
  error?: string;
  onRetry?: () => void;
  status?: boolean;
};

export function PreparingScreen({
  onCancel,
  title = "Preparing your quiz",
  supportingCopy = "Turning your words into questions.",
  animatedEllipsis = true,
  error,
  onRetry,
  status = false,
}: PreparingScreenProps) {
  return (
    <div
      className={styles.centerScreen}
      role={status ? "status" : undefined}
      aria-live={status ? "polite" : undefined}
    >
      {onCancel && (
        <button className={styles.backButton} onClick={onCancel}>
          <ArrowLeft aria-hidden="true" />
          Vocabulary
        </button>
      )}
      <h1 aria-label={animatedEllipsis ? `${title}...` : undefined}>
        {title}
        {animatedEllipsis && (
          <span className={styles.animatedDots} aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        )}
      </h1>
      <p className={styles.supportingCopy}>
        {error
          ? error.split("\n").map((line, index) => (
              <Fragment key={`${index}-${line}`}>
                {index > 0 && <br />}
                {line}
              </Fragment>
            ))
          : supportingCopy}
      </p>
      {onRetry && (
        <button className={styles.primaryButton} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
