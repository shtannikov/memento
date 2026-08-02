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

function copyWithLegacyApi(command: string) {
  const textarea = document.createElement("textarea");
  textarea.value = command;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function ChatCommand({ children }: { children: string }) {
  function copyCommand() {
    if (!navigator.clipboard?.writeText) {
      copyWithLegacyApi(children);
      return;
    }

    void navigator.clipboard
      .writeText(children)
      .catch(() => copyWithLegacyApi(children));
  }

  return (
    <button
      type="button"
      className={styles.command}
      aria-label={`Copy ${children} command`}
      onClick={copyCommand}
    >
      <code>{children}</code>
    </button>
  );
}
