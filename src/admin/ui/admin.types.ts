export type AdminUserAppRow = {
  telegramUserId: number;
  appId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  joinedAt: string;
  lastUsedAt: string;
  vocabularyTotal: number;
  vocabularyLearning: number;
  vocabularyPracticing: number;
  vocabularyLearned: number;
  quizzesCompleted: number;
  quizzesCompletedToday: number;
  lastQuizCompletedAt: string | null;
  speakingCompleted: number;
  speakingCompletedToday: number;
  lastSpeakingCompletedAt: string | null;
  quizGenerationsToday: number;
  speakingGenerationsToday: number;
};

export type ResetLimitsResult = {
  quizAttemptsReset: number;
  speakingAttemptsReset: number;
};
