export type QuizCard = {
  id: number;
  sentence: string;
  answer: string;
  options: string[];
};

export type QuizFeedback = "correct" | "incorrect" | null;
