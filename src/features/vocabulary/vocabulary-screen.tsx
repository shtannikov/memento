import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";

import { AddPhraseDialog } from "./add-phrase-dialog";
import {
  ChatCommand,
  ChatCommandHint,
} from "./chat-command-hint";
import { VocabularyCard } from "./vocabulary-card";
import { VocabularyEmptyState } from "./vocabulary-empty-state";
import { VocabularyHeader } from "./vocabulary-header";
import {
  CloseIcon,
  CheckIcon,
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
  onRemove: (
    item: VocabularyItem,
  ) => Promise<boolean | void> | boolean | void;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => Promise<boolean | void> | boolean | void;
  onReorderPracticing: (items: VocabularyItem[]) => void;
  mutating?: boolean;
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
  mutating = false,
  reordering = false,
  onStartQuiz,
}: VocabularyScreenProps) {
  const [activeTab, setActiveTab] =
    useState<VocabularyStatus>("learning");
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    },
    [],
  );

  function showToast(message: string) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message }));
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 1800);
  }

  async function removeConfirmedItem(item: VocabularyItem) {
    const succeeded = await onRemove(item);
    if (succeeded !== false) showToast("Removed");
  }

  function removeItem(item: VocabularyItem) {
    if (
      globalThis.confirm(
        `Delete “${item.term}” from your vocabulary?`,
      )
    ) {
      void removeConfirmedItem(item);
    }
  }

  async function changeItemStatus(
    item: VocabularyItem,
    status: VocabularyStatus,
  ) {
    const succeeded = await onChangeStatus(item, status);
    if (succeeded !== false) {
      showToast(
        status === "practicing"
          ? "Moved to Practicing"
          : status === "learning"
            ? "Moved to Learning"
            : "Moved to Learned",
      );
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
          <div
            className={`${styles.search} ${
              activeTab === "learning" ||
              (speakingEnabled && activeTab === "practicing")
                ? styles.searchBeforeHint
                : ""
            }`}
          >
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
          {activeTab === "learning" && (
            <div className={styles.progressHint}>
              <ChatCommandHint>
                A phrase moves to {speakingEnabled ? "Practicing" : "Learned"}{" "}
                after 3 completed quizzes.
              </ChatCommandHint>
            </div>
          )}
          {activeTab === "practicing" && (
            <div className={styles.progressHint}>
              <ChatCommandHint>
                Use a phrase correctly in three speaking tasks to move
                it to Learned. Send <ChatCommand>/speaking</ChatCommand>{" "}
                in the chat to get your speaking task.
              </ChatCommandHint>
            </div>
          )}
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
                reordering={reordering || mutating}
                onReorder={onReorderPracticing}
                onRestore={(item) =>
                  void changeItemStatus(item, "learning")
                }
                onDelete={removeItem}
              />
            ) : (
              filteredItems.map((item) => (
                <VocabularyCard
                  key={item.id}
                  item={item}
                  speakingEnabled={speakingEnabled}
                  disabled={mutating || reordering}
                  onLearn={() =>
                    void changeItemStatus(
                      item,
                      speakingEnabled ? "practicing" : "learned",
                    )
                  }
                  onRestore={() =>
                    void changeItemStatus(
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
              disabled={mutating}
              aria-busy={mutating}
              onClick={() => setAddOpen(true)}
            >
              <PlusIcon />
              Add phrase
            </button>
            <button
              className={styles.floatingButton}
              disabled={mutating || learning.length === 0}
              aria-busy={mutating}
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
      {toast &&
        createPortal(
          <div
            key={toast.id}
            className={styles.mutationToast}
            role="status"
            aria-live="polite"
          >
            <CheckIcon />
            <span>{toast.message}</span>
          </div>,
          document.body,
        )}
    </>
  );
}
