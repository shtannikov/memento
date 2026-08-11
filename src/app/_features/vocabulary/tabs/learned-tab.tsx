import type { VocabularyItem } from "../vocabulary.types";
import {
  VocabularyItemList,
  VocabularyTabPage,
  type ChangeVocabularyStatus,
  type VocabularyItemHandler,
} from "./vocabulary-tab-page";

export function LearnedTab({
  items,
  speakingEnabled,
  searchQuery,
  onSearchChange,
  disabled,
  onChangeStatus,
  onDelete,
}: {
  items: VocabularyItem[];
  speakingEnabled: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  disabled: boolean;
  onChangeStatus: ChangeVocabularyStatus;
  onDelete: VocabularyItemHandler;
}) {
  return (
    <VocabularyTabPage
      status="learned"
      label="Learned"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
    >
      <VocabularyItemList
        items={items}
        searchQuery={searchQuery}
        emptyTitle="No learned phrases yet"
        emptyText="Phrases used correctly three times will appear here."
        speakingEnabled={speakingEnabled}
        disabled={disabled}
        onRestore={(item) =>
          onChangeStatus(item, speakingEnabled ? "practicing" : "learning")
        }
        onDelete={onDelete}
      />
    </VocabularyTabPage>
  );
}
