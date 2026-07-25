export type VocabularyStatus = "learning" | "learned";

export type VocabularyItem = {
  id: number;
  term: string;
  definition: string;
  status: VocabularyStatus;
  due?: "Due" | "Later";
};

export type NewVocabularyItem = Pick<VocabularyItem, "term" | "definition">;
