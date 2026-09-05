export type QuizQuestion = {
  id: string;
  sentence: string;
  answer: string;
  options: string[];
};

export type QuizCard = QuizQuestion & {
  vocabularyId: string;
};

export type QuizFeedback = "correct" | "incorrect" | null;

export type PreparedRound = {
  id: string;
  cards: QuizCard[];
  attemptsRemaining: number;
};
