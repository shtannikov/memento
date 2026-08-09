import { getAdminApp } from "@admin/config/apps";
import type { AdminUserAppRow } from "./admin.types";
import styles from "./admin.module.css";

export function UserAppRow({
  row,
  expanded,
  onToggle,
  onReset,
}: {
  row: AdminUserAppRow;
  expanded: boolean;
  onToggle(): void;
  onReset(): void;
}) {
  const app = getAdminApp(row.appId);
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed user";
  return (
    <article className={styles.row} data-expanded={expanded}>
      <button className={styles.rowSummary} onClick={onToggle} aria-expanded={expanded}>
        <span className={styles.identity}>
          <strong>{name}</strong>
          <small>{row.username ? `@${row.username}` : `ID ${row.telegramUserId}`}</small>
        </span>
        <span className={styles.appBadge}>{app.name}</span>
        <span className={styles.lastUsed}>
          <small>Last used</small>
          {formatDate(row.lastUsedAt)}
        </span>
        <span className={styles.chevron} aria-hidden="true">⌄</span>
      </button>

      {expanded && (
        <div className={styles.details}>
          <Metric label="Telegram ID" value={String(row.telegramUserId)} />
          <Metric label="Joined" value={formatDate(row.joinedAt)} />
          <Metric
            label="Vocabulary"
            value={`${row.vocabularyTotal} total`}
            note={`${row.vocabularyLearning} Learning · ${row.vocabularyPracticing} Practicing · ${row.vocabularyLearned} Learned`}
          />
          <Metric
            label="Quizzes"
            value={`${row.quizzesCompleted} completed`}
            note={lastCompleted(row.lastQuizCompletedAt)}
          />
          <Metric
            label="Speaking"
            value={app.speakingEnabled ? `${row.speakingCompleted} completed` : "Not available"}
            note={app.speakingEnabled ? lastCompleted(row.lastSpeakingCompletedAt) : undefined}
          />
          <Metric label="Quiz today" value={`${row.quizAttemptsToday} / 5`} />
          <Metric
            label="Speaking today"
            value={app.speakingEnabled ? `${row.speakingAttemptsToday} / 5` : "—"}
          />
          <button className={styles.resetButton} onClick={onReset}>Reset limits</button>
        </div>
      )}
    </article>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

function lastCompleted(value: string | null): string {
  return value ? `Last ${formatDate(value)}` : "Never completed";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
