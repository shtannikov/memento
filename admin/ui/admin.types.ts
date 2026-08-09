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
  quizFailuresTotal: number;
  quizFailuresToday: number;
  lastQuizCompletedAt: string | null;
  speakingCompleted: number;
  speakingFailuresTotal: number;
  speakingFailuresToday: number;
  lastSpeakingCompletedAt: string | null;
  quizAttemptsToday: number;
  speakingAttemptsToday: number;
};

export type ResetLimitsResult = {
  quizAttemptsReset: number;
  speakingAttemptsReset: number;
};
