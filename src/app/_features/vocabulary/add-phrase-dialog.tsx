import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import styles from "./add-phrase-dialog.module.css";
import {
  APP_BACKGROUND,
  DIALOG_BACKDROP_SOLID,
  setTelegramColor,
} from "@/app/_clients/telegram";
import type { NewVocabularyItem } from "./vocabulary.types";
import {
  ChatCommand,
  ChatCommandHint,
} from "./chat-command-hint";
import {
  DEFINITION_MAX_LENGTH,
  TERM_MAX_LENGTH,
} from "@/app/_features/vocabulary/domain/vocabulary";

type AddPhraseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: NewVocabularyItem) => void;
};

export function AddPhraseDialog({
  open,
  onOpenChange,
  onAdd,
}: AddPhraseDialogProps) {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const addDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const root = document.documentElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousDialogBackgroundHeight = root.style.getPropertyValue(
      "--dialog-background-height",
    );
    const wasDialogOpen = root.classList.contains("dialog-open");
    document.body.style.overflow = "hidden";
    root.classList.add("dialog-open");
    setTelegramColor(DIALOG_BACKDROP_SOLID);

    const viewport = globalThis.visualViewport;
    const backgroundHeight = Math.max(
      globalThis.innerHeight,
      (viewport?.offsetTop ?? 0) + (viewport?.height ?? 0),
    );
    root.style.setProperty(
      "--dialog-background-height",
      `${backgroundHeight}px`,
    );

    function syncVisualViewport() {
      const offsetTop = viewport?.offsetTop ?? 0;
      const offsetLeft = viewport?.offsetLeft ?? 0;
      const width = viewport?.width ?? globalThis.innerWidth;
      const height = viewport?.height ?? globalThis.innerHeight;
      const dialog = addDialogRef.current;

      if (dialog) {
        dialog.style.setProperty("--dialog-viewport-top", `${offsetTop}px`);
        dialog.style.setProperty(
          "--dialog-viewport-center-x",
          `${offsetLeft + width / 2}px`,
        );
        dialog.style.setProperty(
          "--dialog-viewport-center-y",
          `${offsetTop + height / 2}px`,
        );
        dialog.style.setProperty("--dialog-viewport-height", `${height}px`);
      }
    }

    const initialAnimationFrame = requestAnimationFrame(syncVisualViewport);
    viewport?.addEventListener("resize", syncVisualViewport);
    viewport?.addEventListener("scroll", syncVisualViewport);
    globalThis.addEventListener("resize", syncVisualViewport);

    return () => {
      cancelAnimationFrame(initialAnimationFrame);
      viewport?.removeEventListener("resize", syncVisualViewport);
      viewport?.removeEventListener("scroll", syncVisualViewport);
      globalThis.removeEventListener("resize", syncVisualViewport);
      document.body.style.overflow = previousBodyOverflow;
      if (previousDialogBackgroundHeight) {
        root.style.setProperty(
          "--dialog-background-height",
          previousDialogBackgroundHeight,
        );
      } else {
        root.style.removeProperty("--dialog-background-height");
      }
      root.classList.toggle("dialog-open", wasDialogOpen);
      setTelegramColor(APP_BACKGROUND);
    };
  }, [open]);

  function closeAddDialog() {
    setTerm("");
    setDefinition("");
    onOpenChange(false);
  }

  function submitVocabulary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTerm = term.trim();
    const trimmedDefinition = definition.trim();
    if (!trimmedTerm || !trimmedDefinition) return;

    onAdd({ term: trimmedTerm, definition: trimmedDefinition });
    setTerm("");
    setDefinition("");
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          ref={addDialogRef}
          className={styles.addDialog}
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className={styles.addTitle}>
            Add new word
          </Dialog.Title>
          <form className={styles.form} onSubmit={submitVocabulary}>
            <div className={styles.field}>
              <div className={styles.fieldHeader}>
                <label htmlFor="add-phrase-term">Word or phrase</label>
                <span
                  id="add-phrase-term-count"
                  className={
                    term.length === TERM_MAX_LENGTH
                      ? styles.limitReached
                      : styles.characterCount
                  }
                >
                  {term.length} / {TERM_MAX_LENGTH}
                </span>
              </div>
              <input
                id="add-phrase-term"
                aria-describedby="add-phrase-term-count"
                autoFocus
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="e.g. to be in charge of sth"
                maxLength={TERM_MAX_LENGTH}
                required
              />
            </div>
            <div className={styles.field}>
              <div className={styles.fieldHeader}>
                <label htmlFor="add-phrase-definition">Definition</label>
                <span
                  id="add-phrase-definition-count"
                  className={
                    definition.length === DEFINITION_MAX_LENGTH
                      ? styles.limitReached
                      : styles.characterCount
                  }
                >
                  {definition.length} / {DEFINITION_MAX_LENGTH}
                </span>
              </div>
              <input
                id="add-phrase-definition"
                aria-describedby="add-phrase-definition-count"
                value={definition}
                onChange={(event) => setDefinition(event.target.value)}
                placeholder="e.g. to have responsibility for sth"
                maxLength={DEFINITION_MAX_LENGTH}
                required
              />
            </div>
            <button
              className={styles.submitButton}
              type="submit"
              disabled={!term.trim() || !definition.trim()}
            >
              Add to vocabulary
            </button>
          </form>
          <div className={styles.importHint}>
            <ChatCommandHint>
              Want to add several phrases? Send <ChatCommand>/import</ChatCommand>{" "}
              in the chat to add them all at once.
            </ChatCommandHint>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Close add word dialog"
            onClick={closeAddDialog}
          >
            <X aria-hidden="true" />
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
