import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

import styles from "./chat-command-hint.module.css";

export function ChatCommandHint({ children }: { children: ReactNode }) {
  return (
    <aside className={styles.hint}>
      <MessageCircle aria-hidden="true" />
      <p>{children}</p>
    </aside>
  );
}
