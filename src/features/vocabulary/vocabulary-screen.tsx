import * as Tabs from "@radix-ui/react-tabs";
import { Check, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { VocabularyDialogs } from "./vocabulary-dialogs";
import styles from "./vocabulary-screen.module.css";
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
  onStartQuiz: () => void;
};

export function VocabularyScreen({
  learning,
  learned,
  onAdd,
  onRemove,
  onStartQuiz,
}: VocabularyScreenProps) {
  const [activeTab, setActiveTab] =
    useState<VocabularyStatus>("learning");
  const [addOpen, setAddOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] =
    useState<VocabularyItem | null>(null);
  const visibleItems = activeTab === "learning" ? learning : learned;

  return (
    <>
      <div className={styles.screen}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Your collection</p>
          <h1>Vocabulary</h1>
          <Tabs.Root
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as VocabularyStatus)
            }
          >
            <Tabs.List
              className={styles.tabs}
              aria-label="Vocabulary sections"
            >
              <Tabs.Trigger value="learning">
                Learning <span>{learning.length}</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="learned">
                Learned <span>{learned.length}</span>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </header>

        <div className={styles.list}>
          {visibleItems.map((item) => (
            <article
              className={
                item.status === "learned"
                  ? `${styles.wordCard} ${styles.learnedWord}`
                  : styles.wordCard
              }
              key={item.id}
            >
              <div className={styles.wordCopy}>
                <div className={styles.wordTitle}>
                  <h2>{item.term}</h2>
                  {item.status === "learned" ? (
                    <span
                      className={`${styles.statusPill} ${styles.learned}`}
                    >
                      <Check aria-hidden="true" /> Learned
                    </span>
                  ) : item.due ? (
                    <span
                      className={`${styles.statusPill} ${
                        item.due === "Due" ? styles.due : styles.later
                      }`}
                    >
                      {item.due}
                    </span>
                  ) : null}
                </div>
                <p>{item.definition}</p>
              </div>
              {item.status === "learning" && (
                <button
                  className={styles.removeButton}
                  onClick={() => setPendingRemoval(item)}
                  aria-label={`Remove ${item.term}`}
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </article>
          ))}
        </div>

        <div className={styles.floatingActions}>
          <button
            className={`${styles.floatingButton} ${styles.addAction}`}
            onClick={() => setAddOpen(true)}
          >
            <Plus aria-hidden="true" />
            Add vocabulary
          </button>
          <button
            className={`${styles.floatingButton} ${styles.quizAction}`}
            onClick={onStartQuiz}
          >
            <Sparkles aria-hidden="true" />
            Start quiz
          </button>
        </div>
      </div>

      <VocabularyDialogs
        addOpen={addOpen}
        pendingRemoval={pendingRemoval}
        onAddOpenChange={setAddOpen}
        onPendingRemovalChange={setPendingRemoval}
        onAdd={(item) => {
          onAdd(item);
          setActiveTab("learning");
        }}
        onRemove={onRemove}
      />
    </>
  );
}
