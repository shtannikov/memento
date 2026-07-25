import styles from "./vocabulary-screen.module.css";

function VocabularyTotal({
  count,
  label,
  learned = false,
}: {
  count: number;
  label: string;
  learned?: boolean;
}) {
  return (
    <div className={styles.total}>
      <p className={learned ? styles.learnedTotal : undefined}>
        {count}
      </p>
      <span>{label}</span>
    </div>
  );
}

export function VocabularyHeader({
  learningCount,
  learnedCount,
}: {
  learningCount: number;
  learnedCount: number;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}>Your</p>
          <h1>Vocabulary</h1>
        </div>
        <div className={styles.totals} aria-label="Vocabulary totals">
          <VocabularyTotal count={learningCount} label="learning" />
          <div className={styles.totalDivider} />
          <VocabularyTotal count={learnedCount} label="Learned" learned />
        </div>
      </div>
    </header>
  );
}
