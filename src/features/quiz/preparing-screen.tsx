import { ArrowLeft, Sparkles } from "lucide-react";

import styles from "./quiz-shared.module.css";

type PreparingScreenProps = {
  onCancel: () => void;
};

export function PreparingScreen({ onCancel }: PreparingScreenProps) {
  return (
    <div className={styles.centerScreen}>
      <button className={styles.backButton} onClick={onCancel}>
        <ArrowLeft aria-hidden="true" />
        Home
      </button>
      <div className={styles.preparingMark}>
        <Sparkles aria-hidden="true" />
      </div>
      <p className={styles.eyebrow}>Fresh questions</p>
      <h1>
        Preparing your round
        <span className={styles.animatedDots}>…</span>
      </h1>
      <p className={styles.supportingCopy}>
        We’re turning your words into a focused three-card warm-up.
      </p>
    </div>
  );
}
