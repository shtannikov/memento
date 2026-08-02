import { useRef, useState } from "react";
import dynamic from "next/dynamic";

import { AddPhraseDialog } from "./add-phrase-dialog";
import { VocabularyCard } from "./vocabulary-card";
import { VocabularyEmptyState } from "./vocabulary-empty-state";
import { VocabularyHeader } from "./vocabulary-header";
import {
  CloseIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
} from "./vocabulary-icons";
import styles from "./vocabulary-screen.module.css";
import { VocabularyTabs } from "./vocabulary-tabs";
import type {
  NewVocabularyItem,
  VocabularyItem,
  VocabularyStatus,
} from "./vocabulary.types";

type VocabularyScreenProps = {
  learning: VocabularyItem[];
  practicing: VocabularyItem[];
  learned: VocabularyItem[];
  speakingEnabled: boolean;
  onAdd: (item: NewVocabularyItem) => void;
  onRemove: (item: VocabularyItem) => void;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => void;
  onReorderPracticing: (items: VocabularyItem[]) => void;
  reordering?: boolean;
  onStartQuiz: () => void;
};

const PracticingQueue = dynamic(() =>
  import("./practicing-queue").then((module) => module.PracticingQueue),
);

export function VocabularyScreen({
  learning,
  practicing,
  learned,
  speakingEnabled,
  onAdd,
  onRemove,
  onChangeStatus,
  onReorderPracticing,
  reordering = false,
  onStartQuiz,
}: VocabularyScreenProps) {
  const [activeTab, setActiveTab] =
    useState<VocabularyStatus>("learning");
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const visibleItems =
    activeTab === "learning"
      ? learning
      : activeTab === "practicing"
        ? practicing
        : learned;
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredItems = normalizedQuery
    ? visibleItems.filter(
        (item) =>
          item.term.toLocaleLowerCase().includes(normalizedQuery) ||
          item.definition
            .toLocaleLowerCase()
            .includes(normalizedQuery),
      )
    : visibleItems;

  function removeItem(item: VocabularyItem) {
    if (
      globalThis.confirm(
        `Delete “${item.term}” from your vocabulary?`,
      )
    ) {
      onRemove(item);
    }
  }

  function changeTab(tab: VocabularyStatus) {
    setActiveTab(tab);
    setSearchQuery("");
  }

  function clearSearch() {
    setSearchQuery("");
    searchInputRef.current?.focus();
  }

  return (
    <>
      <div className={styles.screen}>
        <VocabularyHeader
          learningCount={learning.length}
          practicingCount={practicing.length}
          learnedCount={learned.length}
          speakingEnabled={speakingEnabled}
        />

        <div
          className={
            activeTab === "learning"
              ? `${styles.content} ${styles.contentWithActions}`
              : styles.content
          }
        >
          <VocabularyTabs
            activeTab={activeTab}
            onChange={changeTab}
            speakingEnabled={speakingEnabled}
          />
          <div className={styles.search}>
            <SearchIcon />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search phrases"
              aria-label="Search phrases"
              autoComplete="off"
              spellCheck={false}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.searchClear}
                aria-label="Clear search"
                onClick={clearSearch}
              >
                <CloseIcon />
              </button>
            )}
          </div>
          <section
            id={`${activeTab}-panel`}
            role="tabpanel"
            aria-label={
              activeTab === "learning"
                ? "Learning"
                : activeTab === "practicing"
                  ? "Practicing"
                  : "Learned"
            }
            className={styles.list}
          >
            {activeTab === "practicing" &&
            !normalizedQuery &&
            practicing.length > 0 ? (
              <PracticingQueue
                items={practicing}
                reordering={reordering}
                onReorder={onReorderPracticing}
                onRestore={(item) => onChangeStatus(item, "learning")}
                onDelete={removeItem}
              />
            ) : (
              filteredItems.map((item) => (
                <VocabularyCard
                  key={item.id}
                  item={item}
                  speakingEnabled={speakingEnabled}
                  onLearn={() =>
                    onChangeStatus(
                      item,
                      speakingEnabled ? "practicing" : "learned",
                    )
                  }
                  onRestore={() =>
                    onChangeStatus(
                      item,
                      item.status === "practicing"
                        ? "learning"
                        : speakingEnabled
                          ? "practicing"
                          : "learning",
                    )
                  }
                  onDelete={() => removeItem(item)}
                />
              ))
            )}
            {filteredItems.length === 0 && (
              <VocabularyEmptyState
                title={
                  normalizedQuery
                    ? "No matches found"
                    : activeTab === "learning"
                    ? "Nothing to learn yet"
                    : activeTab === "practicing"
                      ? "Nothing to practice yet"
                      : "No learned phrases yet"
                }
                text={
                  normalizedQuery
                    ? "Try a different word or definition."
                    : activeTab === "learning"
                    ? "Add a phrase to start your list."
                    : activeTab === "practicing"
                      ? "Keep practicing in quizzes, or tap Done on a Learning phrase when it feels ready."
                      : "Phrases used correctly three times will appear here."
                }
              />
            )}
          </section>
        </div>

        {activeTab === "learning" && (
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
        )}
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
