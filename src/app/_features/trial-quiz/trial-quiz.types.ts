import type { AppId } from "@/app/app-config";
import type { QuizQuestion } from "@/app/_features/quiz/quiz.types";

export type TrialQuizSource = {
  episodeId: string;
  itemSlug: string;
};

export type TrialQuizCard = QuizQuestion & {
  source: TrialQuizSource;
};

export type TrialQuizManifest = {
  id: string;
  languageId: AppId;
  episodeIds: string[];
  cards: TrialQuizCard[];
};
