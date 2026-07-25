import { Sparkles } from "lucide-react";

import buttonStyles from "@/components/ui/buttons.module.css";

import styles from "./home-screen.module.css";

type HomeScreenProps = {
  learningCount: number;
  learnedCount: number;
  onStartRound: () => void;
  onOpenVocabulary: () => void;
};

export function HomeScreen({
  learningCount,
  learnedCount,
  onStartRound,
  onOpenVocabulary,
}: HomeScreenProps) {
  return (
    <div className={styles.screen}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Memento</p>
        <h1>Ready to learn?</h1>
        <p>
          {learningCount} words active <span>·</span> {learnedCount} mastered
        </p>
      </header>

      <div className={styles.content}>
        <div className={styles.statGrid}>
          <article className={styles.statCard}>
            <p className={styles.cardLabel}>Learning</p>
            <strong>{learningCount}</strong>
            <span>active words</span>
          </article>
          <article className={`${styles.statCard} ${styles.learnedCard}`}>
            <p className={styles.cardLabel}>Learned</p>
            <strong>{learnedCount}</strong>
            <span>permanently done</span>
          </article>
        </div>

        <article className={styles.roundCard}>
          <p className={styles.cardLabel}>Last round</p>
          <p>No rounds yet — start your first one below.</p>
        </article>

        <div className={styles.actions}>
          <button className={buttonStyles.primary} onClick={onStartRound}>
            <Sparkles aria-hidden="true" />
            Start round
          </button>
          <button
            className={buttonStyles.secondary}
            onClick={onOpenVocabulary}
          >
            Manage vocabulary
          </button>
        </div>
      </div>
    </div>
  );
}
