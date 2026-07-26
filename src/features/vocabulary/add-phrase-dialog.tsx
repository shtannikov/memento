import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import styles from "./add-phrase-dialog.module.css";
import type { NewVocabularyItem } from "./vocabulary.types";

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
  const addOverlayRef = useRef<HTMLDivElement>(null);
  const addDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const viewport = globalThis.visualViewport;
    let animationFrame = 0;

    function syncVisualViewport() {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const offsetTop = viewport?.offsetTop ?? 0;
        const offsetLeft = viewport?.offsetLeft ?? 0;
        const width = viewport?.width ?? globalThis.innerWidth;
        const height = viewport?.height ?? globalThis.innerHeight;
        const overlay = addOverlayRef.current;
        const dialog = addDialogRef.current;

        if (overlay) {
          overlay.style.top = `${offsetTop}px`;
          overlay.style.left = `${offsetLeft}px`;
          overlay.style.width = `${width}px`;
          overlay.style.height = `${height}px`;
        }

        if (dialog) {
          dialog.style.top = `${offsetTop + height / 2}px`;
          dialog.style.left = `${offsetLeft + width / 2}px`;
          dialog.style.maxHeight = `${Math.max(0, height - 40)}px`;
        }
      });
    }

    syncVisualViewport();
    viewport?.addEventListener("resize", syncVisualViewport);
    viewport?.addEventListener("scroll", syncVisualViewport);
    globalThis.addEventListener("resize", syncVisualViewport);

    return () => {
      cancelAnimationFrame(animationFrame);
      viewport?.removeEventListener("resize", syncVisualViewport);
      viewport?.removeEventListener("scroll", syncVisualViewport);
      globalThis.removeEventListener("resize", syncVisualViewport);
    };
  }, [open]);

  function changeAddOpen(open: boolean) {
    if (!open) {
      setTerm("");
      setDefinition("");
    }
    onOpenChange(open);
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
    <Dialog.Root open={open} onOpenChange={changeAddOpen}>
      <Dialog.Portal>
        <Dialog.Overlay ref={addOverlayRef} className={styles.overlay} />
        <Dialog.Content
          ref={addDialogRef}
          className={styles.addDialog}
          aria-describedby={undefined}
        >
          <Dialog.Title className={styles.addTitle}>
            Add new word
          </Dialog.Title>
          <form className={styles.form} onSubmit={submitVocabulary}>
            <label>
              <span>Word or phrase</span>
              <input
                autoFocus
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="e.g. to be in charge of sth"
                maxLength={200}
                required
              />
            </label>
            <label>
              <span>Definition</span>
              <input
                value={definition}
                onChange={(event) => setDefinition(event.target.value)}
                placeholder="e.g. to have responsibility for sth"
                maxLength={500}
                required
              />
            </label>
            <button
              className={styles.submitButton}
              type="submit"
              disabled={!term.trim() || !definition.trim()}
            >
              Add to vocabulary
            </button>
          </form>
          <Dialog.Close
            className={styles.iconButton}
            aria-label="Close add word dialog"
          >
            <X aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
