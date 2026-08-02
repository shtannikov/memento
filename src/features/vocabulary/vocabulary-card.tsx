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
}: {
  item: VocabularyItem;
  onLearn: () => void;
  onRestore: () => void;
  onDelete: () => void;
  speakingEnabled: boolean;
}) {
  const isLearned = item.status === "learned";
  const isLearning = item.status === "learning";

  return (
    <article className={styles.wordCard}>
      {isLearned && (
        <div className={styles.learnedAccent} aria-hidden="true" />
      )}
      <div className={styles.wordCopy}>
        <h2 title={item.term}>{item.term}</h2>
        <p title={item.definition}>{item.definition}</p>
        {item.status === "practicing" && (
          <span className={styles.practiceProgress}>
            {item.correctUses ?? 0}/3 correct uses
          </span>
        )}
      </div>
      <div className={styles.wordActions}>
        {isLearned ? (
          <IconButton
            label={`Move ${item.term} back to ${speakingEnabled ? "practicing" : "learning"}`}
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
