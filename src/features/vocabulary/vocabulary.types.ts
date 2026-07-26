export type VocabularyStatus = "learning" | "learned";

export type VocabularyItem = {
  id: string;
  term: string;
  definition: string;
  status: VocabularyStatus;
};

export type NewVocabularyItem = Pick<VocabularyItem, "term" | "definition">;

export type VocabularyData = {
  learning: VocabularyItem[];
  learned: VocabularyItem[];
};
