import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

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
import type { AddPhrasePlaceholders } from "@/app/_languages/types";

const DEFAULT_PLACEHOLDERS: AddPhrasePlaceholders = {
  term: "e.g. to be in charge of sth",
  definition: "e.g. to have responsibility for sth",
};

type AddPhraseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: NewVocabularyItem) => void;
  placeholders?: AddPhrasePlaceholders;
};

export function AddPhraseDialog({
  open,
  onOpenChange,
  onAdd,
  placeholders = DEFAULT_PLACEHOLDERS,
}: AddPhraseDialogProps) {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const definitionRef = useRef<HTMLInputElement>(null);

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

    const backgroundHeight = globalThis.innerHeight;
    root.style.setProperty(
      "--dialog-background-height",
      `${backgroundHeight}px`,
    );

    return () => {
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

  function focusWithoutViewportPan(
    event: ReactPointerEvent<HTMLInputElement>,
  ) {
    if (document.activeElement === event.currentTarget) return;

    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
  }

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

  function moveToDefinition(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    event.preventDefault();
    definitionRef.current?.focus({ preventScroll: true });
  }

  function splitPastedPhrase(event: ClipboardEvent<HTMLInputElement>) {
    const pastedText = event.clipboardData.getData("text");
    const separatorIndex = pastedText.indexOf(" — ");
    if (separatorIndex === -1) return;

    event.preventDefault();
    setTerm(
      pastedText.slice(0, separatorIndex).trim().slice(0, TERM_MAX_LENGTH),
    );
    setDefinition(
      pastedText
        .slice(separatorIndex + 3)
        .trim()
        .slice(0, DEFINITION_MAX_LENGTH),
    );
    definitionRef.current?.focus({ preventScroll: true });
  }

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
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
                onPointerDown={focusWithoutViewportPan}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={moveToDefinition}
                onPaste={splitPastedPhrase}
                enterKeyHint="next"
                placeholder={placeholders.term}
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
                ref={definitionRef}
                id="add-phrase-definition"
                aria-describedby="add-phrase-definition-count"
                onPointerDown={focusWithoutViewportPan}
                value={definition}
                onChange={(event) => setDefinition(event.target.value)}
                enterKeyHint="done"
                placeholder={placeholders.definition}
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
