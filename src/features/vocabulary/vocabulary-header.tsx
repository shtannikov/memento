import styles from "./vocabulary-screen.module.css";

function VocabularyTotal({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone?: "practicing" | "learned";
}) {
  return (
    <div className={styles.total}>
      <p className={tone ? styles[`${tone}Total`] : undefined}>
        {count}
      </p>
      <span>{label}</span>
    </div>
  );
}

export function VocabularyHeader({
  learningCount,
  practicingCount,
  learnedCount,
  speakingEnabled,
}: {
  learningCount: number;
  practicingCount: number;
  learnedCount: number;
  speakingEnabled: boolean;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerRow}>
        <h1>Vocabulary</h1>
        <div className={styles.totals} aria-label="Vocabulary totals">
          <VocabularyTotal count={learningCount} label="learning" />
          <div className={styles.totalDivider} />
          {speakingEnabled && (
            <>
              <VocabularyTotal
                count={practicingCount}
                label="practicing"
                tone="practicing"
              />
              <div className={styles.totalDivider} />
            </>
          )}
          <VocabularyTotal count={learnedCount} label="learned" tone="learned" />
        </div>
      </div>
    </header>
  );
}
