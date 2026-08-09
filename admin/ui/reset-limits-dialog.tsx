import * as Dialog from "@radix-ui/react-dialog";

import { getAdminApp } from "@admin/config/apps";
import type { AdminUserAppRow } from "./admin.types";
import styles from "./admin.module.css";

export function ResetLimitsDialog({
  row,
  pending,
  onCancel,
  onConfirm,
}: {
  row: AdminUserAppRow;
  pending: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || `User ${row.telegramUserId}`;
  const app = getAdminApp(row.appId);
  return (
    <Dialog.Root open onOpenChange={(open) => !open && !pending && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.backdrop} />
        <Dialog.Content className={styles.dialog}>
          <Dialog.Title>Reset today’s limits?</Dialog.Title>
          <Dialog.Description>
            {name} · {row.appId.toUpperCase()} · Telegram ID {row.telegramUserId}
          </Dialog.Description>
          <dl className={styles.confirmationStats}>
            <div><dt>Quiz</dt><dd>{row.quizAttemptsToday} / 5</dd></div>
            <div><dt>Speaking</dt><dd>{app.speakingEnabled ? `${row.speakingAttemptsToday} / 5` : "—"}</dd></div>
          </dl>
          <p className={styles.dialogNote}>Words, rounds, speaking lessons, and progress will stay unchanged.</p>
          <div className={styles.dialogActions}>
            <Dialog.Close asChild>
              <button className={styles.secondaryButton} disabled={pending}>Cancel</button>
            </Dialog.Close>
            <button className={styles.dangerButton} disabled={pending} onClick={onConfirm}>
              {pending ? "Resetting…" : "Reset limits"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
