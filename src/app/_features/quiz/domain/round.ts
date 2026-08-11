export const ROUND_SIZE = 10;
export const ROUND_LIVES = 3;
export const DAILY_GENERATION_LIMIT = 5;

export type RoundQueueCard = {
  id: string;
};

export type RoundProgress<T extends RoundQueueCard> = {
  queue: T[];
  completedIds: string[];
  firstAttempts: Record<string, boolean>;
  lives: number;
  mistakes: number;
};

export function recordAnswer<T extends RoundQueueCard>(
  progress: RoundProgress<T>,
  correct: boolean,
): RoundProgress<T> {
  const active = progress.queue[0];
  if (!active) return progress;

  const firstAttempts =
    active.id in progress.firstAttempts
      ? progress.firstAttempts
      : { ...progress.firstAttempts, [active.id]: correct };

  if (correct) {
    return {
      ...progress,
      queue: progress.queue.slice(1),
      completedIds: [...progress.completedIds, active.id],
      firstAttempts,
    };
  }

  const lives = progress.lives - 1;
  return {
    ...progress,
    queue: lives > 0 ? [...progress.queue.slice(1), active] : progress.queue,
    firstAttempts,
    lives,
    mistakes: progress.mistakes + 1,
  };
}
