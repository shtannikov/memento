import { useRef, type ReactNode } from "react";

import { VocabularyCard } from "../vocabulary-card";
import { VocabularyEmptyState } from "../vocabulary-empty-state";
import { CloseIcon, SearchIcon } from "@/app/_components/icons";
import styles from "../vocabulary-screen.module.css";
import type { VocabularyItem, VocabularyStatus } from "../vocabulary.types";

export type ChangeVocabularyStatus = (
  item: VocabularyItem,
  status: VocabularyStatus,
) => void;

export type VocabularyItemHandler = (item: VocabularyItem) => void;

export function VocabularyTabPage({
  status,
  label,
  searchQuery,
  onSearchChange,
  hint,
  children,
}: {
  status: VocabularyStatus;
  label: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hint?: ReactNode;
  children: ReactNode;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  function clearSearch() {
    onSearchChange("");
    searchInputRef.current?.focus();
  }

  return (
    <div>
      <div
        className={`${styles.search} ${hint ? styles.searchBeforeHint : ""}`}
      >
        <SearchIcon />
        <input
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search phrases"
          aria-label="Search phrases"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
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
      {hint && <div className={styles.progressHint}>{hint}</div>}
      <section
        id={`${status}-panel`}
        role="tabpanel"
        aria-label={label}
        className={styles.list}
      >
        {children}
      </section>
    </div>
  );
}

export function VocabularyItemList({
  items,
  searchQuery,
  emptyTitle,
  emptyText,
  speakingEnabled,
  disabled,
  onLearn,
  onRestore,
  onDelete,
}: {
  items: VocabularyItem[];
  searchQuery: string;
  emptyTitle: string;
  emptyText: string;
  speakingEnabled: boolean;
  disabled: boolean;
  onLearn?: VocabularyItemHandler;
  onRestore?: VocabularyItemHandler;
  onDelete: VocabularyItemHandler;
}) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredItems = normalizedQuery
    ? items.filter(
        (item) =>
          item.term.toLocaleLowerCase().includes(normalizedQuery) ||
          item.definition.toLocaleLowerCase().includes(normalizedQuery),
      )
    : items;

  return (
    <>
      {filteredItems.map((item) => (
        <VocabularyCard
          key={item.id}
          item={item}
          speakingEnabled={speakingEnabled}
          disabled={disabled}
          onLearn={() => onLearn?.(item)}
          onRestore={() => onRestore?.(item)}
          onDelete={() => onDelete(item)}
        />
      ))}
      {filteredItems.length === 0 && (
        <VocabularyEmptyState
          title={normalizedQuery ? "No matches found" : emptyTitle}
          text={
            normalizedQuery
              ? "Try a different word or definition."
              : emptyText
          }
        />
      )}
    </>
  );
}
