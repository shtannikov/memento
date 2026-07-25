import { ArrowLeft } from "lucide-react";

import styles from "./quiz-shared.module.css";

type PreparingScreenProps = {
  onCancel: () => void;
};

export function PreparingScreen({ onCancel }: PreparingScreenProps) {
  return (
    <div className={styles.centerScreen}>
      <button className={styles.backButton} onClick={onCancel}>
        <ArrowLeft aria-hidden="true" />
        Vocabulary
      </button>
      <h1>
        Preparing your quiz
        <span className={styles.animatedDots}>…</span>
      </h1>
      <p className={styles.supportingCopy}>
        Turning your words into questions.
      </p>
    </div>
  );
}
