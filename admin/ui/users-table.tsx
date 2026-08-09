import type { AdminUserAppRow } from "./admin.types";
import { UserAppRow } from "./user-app-row";
import styles from "./admin.module.css";

export function UsersTable({
  rows,
  expandedKey,
  onToggle,
  onReset,
}: {
  rows: AdminUserAppRow[];
  expandedKey: string | null;
  onToggle(key: string): void;
  onReset(row: AdminUserAppRow): void;
}) {
  if (rows.length === 0) {
    return <p className={styles.empty}>No users have opened a learning app yet.</p>;
  }
  return (
    <section className={styles.table} aria-label="Users by app">
      {rows.map((row) => {
        const key = `${row.telegramUserId}:${row.appId}`;
        return (
          <UserAppRow
            key={key}
            row={row}
            expanded={expandedKey === key}
            onToggle={() => onToggle(key)}
            onReset={() => onReset(row)}
          />
        );
      })}
    </section>
  );
}
