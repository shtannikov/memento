export type QuizCard = {
  id: string;
  vocabularyId: string;
  sentence: string;
  answer: string;
  options: string[];
};

export type QuizFeedback = "correct" | "incorrect" | null;

export type PreparedRound = {
  id: string;
  cards: QuizCard[];
  attemptsRemaining: number;
};
