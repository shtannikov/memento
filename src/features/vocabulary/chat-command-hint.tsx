import { Check, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  const [copied, setCopied] = useState(false);
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimeout.current) clearTimeout(resetTimeout.current);
    },
    [],
  );

  function showCopied() {
    setCopied(true);
    if (resetTimeout.current) clearTimeout(resetTimeout.current);
    resetTimeout.current = setTimeout(() => {
      setCopied(false);
      resetTimeout.current = null;
    }, 1500);
  }

  async function copyCommand() {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(children);
        showCopied();
        return;
      } catch {
        // Fall back for Telegram WebViews without Clipboard API access.
      }
    }

    copyWithLegacyApi(children);
    showCopied();
  }

  return (
    <>
      <button
        type="button"
        className={styles.command}
        aria-label={copied ? `${children} copied` : `Copy ${children} command`}
        data-copied={copied}
        onClick={() => void copyCommand()}
      >
        <code>{children}</code>
      </button>
      {copied &&
        createPortal(
          <div className={styles.copyToast} role="status" aria-live="polite">
            <Check aria-hidden="true" />
            <span>Copied</span>
          </div>,
          document.body,
        )}
    </>
  );
}
