import styles from "./vocabulary-screen.module.css";
import type { VocabularyItem } from "./vocabulary.types";
import { CheckIcon, TrashIcon, UndoIcon } from "./vocabulary-icons";

function IconButton({
  label,
  tone,
  onClick,
  children,
}: {
  label: string;
  tone: "success" | "danger" | "restore";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`${styles.iconButton} ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

export function VocabularyCard({
  item,
  onLearn,
  onRestore,
  onDelete,
  speakingEnabled,
  leadingAction,
}: {
  item: VocabularyItem;
  onLearn: () => void;
  onRestore: () => void;
  onDelete: () => void;
  speakingEnabled: boolean;
  leadingAction?: React.ReactNode;
}) {
  const isLearned = item.status === "learned";
  const isLearning = item.status === "learning";
  const isPracticing = item.status === "practicing";

  return (
    <article className={styles.wordCard}>
      {isLearned && (
        <div className={styles.learnedAccent} aria-hidden="true" />
      )}
      {leadingAction}
      <div className={styles.wordCopy}>
        <h2 title={item.term}>{item.term}</h2>
        <p title={item.definition}>{item.definition}</p>
        {isLearning && !speakingEnabled && (
          <span className={styles.learningProgress}>
            {Math.min(item.consecutiveCorrect ?? 0, 3)}/3 correct answers
          </span>
        )}
      </div>
      <div className={styles.wordActions}>
        {isLearned || isPracticing ? (
          <IconButton
            label={`Move ${item.term} back to ${isPracticing || !speakingEnabled ? "learning" : "practicing"}`}
            tone="restore"
            onClick={onRestore}
          >
            <UndoIcon />
          </IconButton>
        ) : isLearning ? (
          <IconButton
            label={
              speakingEnabled
                ? `Move ${item.term} to practicing`
                : `Mark ${item.term} as learned`
            }
            tone="success"
            onClick={onLearn}
          >
            <CheckIcon />
          </IconButton>
        ) : null}
        <IconButton
          label={`Delete ${item.term}`}
          tone="danger"
          onClick={onDelete}
        >
          <TrashIcon />
        </IconButton>
      </div>
    </article>
  );
}
