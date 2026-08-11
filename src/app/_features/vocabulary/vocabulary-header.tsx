import styles from "./vocabulary-screen.module.css";
import type { VocabularyStatus } from "./vocabulary.types";

function VocabularyTotal({
  count,
  label,
  tone,
  status,
  active,
  onSelect,
}: {
  count: number;
  label: string;
  tone?: "practicing" | "learned";
  status: VocabularyStatus;
  active: boolean;
  onSelect: (status: VocabularyStatus) => void;
}) {
  return (
    <button
      type="button"
      className={styles.total}
      aria-label={`Show ${label} phrases (${count})`}
      aria-pressed={active}
      onClick={() => onSelect(status)}
    >
      <span
        className={`${styles.totalCount}${tone ? ` ${styles[`${tone}Total`]}` : ""}`}
      >
        {count}
      </span>
      <span className={styles.totalLabel}>{label}</span>
    </button>
  );
}

export function VocabularyHeader({
  learningCount,
  practicingCount,
  learnedCount,
  speakingEnabled,
  activeTab,
  onTabChange,
}: {
  learningCount: number;
  practicingCount: number;
  learnedCount: number;
  speakingEnabled: boolean;
  activeTab: VocabularyStatus;
  onTabChange: (tab: VocabularyStatus) => void;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerRow}>
        <h1>Vocabulary</h1>
        <div className={styles.totals} aria-label="Vocabulary totals">
          <VocabularyTotal
            count={learningCount}
            label="learning"
            status="learning"
            active={activeTab === "learning"}
            onSelect={onTabChange}
          />
          <div className={styles.totalDivider} />
          {speakingEnabled && (
            <>
              <VocabularyTotal
                count={practicingCount}
                label="practicing"
                tone="practicing"
                status="practicing"
                active={activeTab === "practicing"}
                onSelect={onTabChange}
              />
              <div className={styles.totalDivider} />
            </>
          )}
          <VocabularyTotal
            count={learnedCount}
            label="learned"
            tone="learned"
            status="learned"
            active={activeTab === "learned"}
            onSelect={onTabChange}
          />
        </div>
      </div>
    </header>
  );
}
