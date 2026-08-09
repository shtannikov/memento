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
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed user";
  const app = getAdminApp(row.appId);
  return (
    <Dialog.Root open onOpenChange={(open) => !open && !pending && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.backdrop} />
        <Dialog.Content className={styles.dialog}>
          <Dialog.Title>Reset today’s limits?</Dialog.Title>
          <p>{name} · {app.name}</p>
          <dl className={styles.confirmationStats}>
            <div><dt>Quiz</dt><dd>{row.quizAttemptsToday} / 5</dd></div>
            <div><dt>Speaking</dt><dd>{app.speakingEnabled ? `${row.speakingAttemptsToday} / 5` : "—"}</dd></div>
          </dl>
          <Dialog.Description className={styles.dialogNote}>
            Resetting limits doesn’t delete data.
          </Dialog.Description>
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
