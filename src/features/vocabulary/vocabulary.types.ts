export type VocabularyStatus = "learning" | "learned";

export type VocabularyItem = {
  id: number;
  term: string;
  definition: string;
  status: VocabularyStatus;
};

export type NewVocabularyItem = Pick<VocabularyItem, "term" | "definition">;
