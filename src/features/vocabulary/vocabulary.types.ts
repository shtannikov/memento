export type VocabularyStatus = "learning" | "practicing" | "learned";

export type VocabularyItem = {
  id: string;
  term: string;
  definition: string;
  status: VocabularyStatus;
  consecutiveCorrect?: number;
  correctUses?: number;
  practiceRank?: number;
};

export type NewVocabularyItem = Pick<VocabularyItem, "term" | "definition">;

export type VocabularyData = {
  learning: VocabularyItem[];
  practicing: VocabularyItem[];
  learned: VocabularyItem[];
};
