import { Sparkles } from "lucide-react";

import buttonStyles from "@/components/ui/buttons.module.css";

import styles from "./home-screen.module.css";

type HomeScreenProps = {
  learningCount: number;
  learnedCount: number;
  onStartRound: () => void;
  onOpenVocabulary: (tab: "learning" | "learned") => void;
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
          <button
            className={styles.statCard}
            onClick={() => onOpenVocabulary("learning")}
          >
            <p className={styles.cardLabel}>Learning</p>
            <strong>{learningCount}</strong>
            <span>active words</span>
          </button>
          <button
            className={`${styles.statCard} ${styles.learnedCard}`}
            onClick={() => onOpenVocabulary("learned")}
          >
            <p className={styles.cardLabel}>Learned</p>
            <strong>{learnedCount}</strong>
            <span>permanently done</span>
          </button>
        </div>

        <article className={styles.roundCard}>
          <p className={styles.cardLabel}>Last round</p>
          <p>No rounds yet — start your first one below.</p>
        </article>

        <button className={buttonStyles.primary} onClick={onStartRound}>
          <Sparkles aria-hidden="true" />
          Start round
        </button>
      </div>
    </div>
  );
}
