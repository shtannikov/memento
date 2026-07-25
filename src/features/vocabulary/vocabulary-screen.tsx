import { useState } from "react";

import { AddPhraseDialog } from "./add-phrase-dialog";
import { VocabularyCard } from "./vocabulary-card";
import { VocabularyEmptyState } from "./vocabulary-empty-state";
import { VocabularyHeader } from "./vocabulary-header";
import { PlayIcon, PlusIcon } from "./vocabulary-icons";
import styles from "./vocabulary-screen.module.css";
import { VocabularyTabs } from "./vocabulary-tabs";
import type {
  NewVocabularyItem,
  VocabularyItem,
  VocabularyStatus,
} from "./vocabulary.types";

type VocabularyScreenProps = {
  learning: VocabularyItem[];
  learned: VocabularyItem[];
  onAdd: (item: NewVocabularyItem) => void;
  onRemove: (item: VocabularyItem) => void;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => void;
  onStartQuiz: () => void;
};

export function VocabularyScreen({
  learning,
  learned,
  onAdd,
  onRemove,
  onChangeStatus,
  onStartQuiz,
}: VocabularyScreenProps) {
  const [activeTab, setActiveTab] =
    useState<VocabularyStatus>("learning");
  const [addOpen, setAddOpen] = useState(false);
  const visibleItems = activeTab === "learning" ? learning : learned;

  function removeItem(item: VocabularyItem) {
    if (
      globalThis.confirm(
        `Delete “${item.term}” from your vocabulary?`,
      )
    ) {
      onRemove(item);
    }
  }

  return (
    <>
      <div className={styles.screen}>
        <VocabularyHeader
          learningCount={learning.length}
          learnedCount={learned.length}
        />

        <div className={styles.content}>
          <VocabularyTabs
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          <section
            id={`${activeTab}-panel`}
            role="tabpanel"
            aria-label={
              activeTab === "learning" ? "Learning" : "Learned"
            }
            className={styles.list}
          >
            {visibleItems.map((item) => (
              <VocabularyCard
                key={item.id}
                item={item}
                onLearn={() => onChangeStatus(item, "learned")}
                onRestore={() => {
                  onChangeStatus(item, "learning");
                  setActiveTab("learning");
                }}
                onDelete={() => removeItem(item)}
              />
            ))}
            {visibleItems.length === 0 && (
              <VocabularyEmptyState
                title={
                  activeTab === "learning"
                    ? "Nothing to learn yet"
                    : "No learned words yet"
                }
                text={
                  activeTab === "learning"
                    ? "Add a phrase to start your list."
                    : "Phrases you master will appear here."
                }
              />
            )}
          </section>
        </div>

        <div className={styles.floatingActions}>
          <button
            className={styles.floatingButton}
            onClick={() => setAddOpen(true)}
          >
            <PlusIcon />
            Add phrase
          </button>
          <button
            className={styles.floatingButton}
            onClick={onStartQuiz}
          >
            <PlayIcon />
            Start quiz
          </button>
        </div>
      </div>

      <AddPhraseDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(item) => {
          onAdd(item);
          setActiveTab("learning");
        }}
      />
    </>
  );
}
