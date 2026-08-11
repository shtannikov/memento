export type SchedulingState = {
  repetitions: number;
  consecutiveCorrect: number;
  intervalDays: number;
  easeFactor: number;
};

export type SchedulingUpdate = SchedulingState & {
  learned: boolean;
};

export const INITIAL_SCHEDULING_STATE: SchedulingState = {
  repetitions: 0,
  consecutiveCorrect: 0,
  intervalDays: 0,
  easeFactor: 2.5,
};

export function applyFirstAttemptResult(
  state: SchedulingState,
  correct: boolean,
): SchedulingUpdate {
  if (!correct) {
    return {
      repetitions: 0,
      consecutiveCorrect: 0,
      intervalDays: 1,
      easeFactor: Math.max(1.3, roundEase(state.easeFactor - 0.2)),
      learned: false,
    };
  }

  const repetitions = state.repetitions + 1;
  const consecutiveCorrect = state.consecutiveCorrect + 1;
  const easeFactor = Math.max(1.3, roundEase(state.easeFactor + 0.1));
  const intervalDays =
    repetitions === 1
      ? 1
      : repetitions === 2
        ? 6
        : Math.max(1, Math.round(state.intervalDays * easeFactor));

  return {
    repetitions,
    consecutiveCorrect,
    intervalDays,
    easeFactor,
    learned: consecutiveCorrect >= 3 && intervalDays >= 14,
  };
}

function roundEase(value: number): number {
  return Math.round(value * 100) / 100;
}
