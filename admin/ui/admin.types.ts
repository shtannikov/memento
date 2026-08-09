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
  lastQuizCompletedAt: string | null;
  speakingCompleted: number;
  lastSpeakingCompletedAt: string | null;
  quizAttemptsToday: number;
  speakingAttemptsToday: number;
};

export type ResetLimitsResult = {
  quizAttemptsReset: number;
  speakingAttemptsReset: number;
};
