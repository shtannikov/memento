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
          <small>{row.username ? `@${row.username}` : "No username"}</small>
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
          <div className={styles.profileMetrics}>
            <Metric label="Joined" value={formatDate(row.joinedAt)} />
            <Metric
              label="Vocabulary"
              value={`${row.vocabularyTotal} total`}
              note={`${row.vocabularyLearning} Learning · ${row.vocabularyPracticing} Practicing · ${row.vocabularyLearned} Learned`}
            />
          </div>
          <ActivityGroup
            title="Quizzes"
            total={String(row.quizzesCompleted)}
            today={`${row.quizAttemptsToday} / 5`}
          />
          <ActivityGroup
            title="Speaking"
            total={app.speakingEnabled ? String(row.speakingCompleted) : "—"}
            today={app.speakingEnabled ? `${row.speakingAttemptsToday} / 5` : "—"}
          />
          <button className={styles.resetButton} onClick={onReset}>Reset limits</button>
        </div>
      )}
    </article>
  );
}

function ActivityGroup({
  title,
  total,
  today,
}: {
  title: string;
  total: string;
  today: string;
}) {
  return (
    <section className={styles.activityGroup} aria-label={title}>
      <h3>{title}</h3>
      <div className={styles.activityMetrics}>
        <Metric label="Total" value={total} />
        <Metric label="Today" value={today} />
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  note,
  emphasize = true,
}: {
  label: string;
  value: string;
  note?: string;
  emphasize?: boolean;
}) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue} data-emphasized={emphasize}>{value}</span>
      {note && <small>{note}</small>}
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
