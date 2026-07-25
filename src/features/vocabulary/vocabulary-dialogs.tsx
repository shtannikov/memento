import * as Dialog from "@radix-ui/react-dialog";
import { Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";

import buttonStyles from "@/components/ui/buttons.module.css";

import styles from "./vocabulary-dialogs.module.css";
import type {
  NewVocabularyItem,
  VocabularyItem,
} from "./vocabulary.types";

type VocabularyDialogsProps = {
  addOpen: boolean;
  pendingRemoval: VocabularyItem | null;
  onAddOpenChange: (open: boolean) => void;
  onPendingRemovalChange: (item: VocabularyItem | null) => void;
  onAdd: (item: NewVocabularyItem) => void;
  onRemove: (item: VocabularyItem) => void;
};

export function VocabularyDialogs({
  addOpen,
  pendingRemoval,
  onAddOpenChange,
  onPendingRemovalChange,
  onAdd,
  onRemove,
}: VocabularyDialogsProps) {
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");

  function submitVocabulary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTerm = term.trim();
    const trimmedDefinition = definition.trim();
    if (!trimmedTerm || !trimmedDefinition) return;

    onAdd({ term: trimmedTerm, definition: trimmedDefinition });
    setTerm("");
    setDefinition("");
    onAddOpenChange(false);
  }

  return (
    <>
      <Dialog.Root open={addOpen} onOpenChange={onAddOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            className={styles.sheet}
            aria-describedby="add-vocabulary-description"
          >
            <div className={styles.heading}>
              <div>
                <Dialog.Title>Add vocabulary</Dialog.Title>
                <Dialog.Description id="add-vocabulary-description">
                  Add a word or phrase to your next learning rounds.
                </Dialog.Description>
              </div>
              <Dialog.Close className={styles.iconButton} aria-label="Close">
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
            <form className={styles.form} onSubmit={submitVocabulary}>
              <label>
                <span>Word or phrase</span>
                <input
                  autoFocus
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="e.g. take into account"
                  required
                />
              </label>
              <label>
                <span>Definition</span>
                <textarea
                  value={definition}
                  onChange={(event) => setDefinition(event.target.value)}
                  placeholder="e.g. to consider something when making a decision"
                  required
                />
              </label>
              <button className={buttonStyles.primary} type="submit">
                Add to vocabulary
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(pendingRemoval)}
        onOpenChange={(open) => {
          if (!open) onPendingRemovalChange(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            className={styles.confirmDialog}
            aria-describedby="remove-description"
          >
            <div className={styles.dangerIcon}>
              <Trash2 aria-hidden="true" />
            </div>
            <Dialog.Title>
              Remove “{pendingRemoval?.term}”?
            </Dialog.Title>
            <Dialog.Description id="remove-description">
              This removes the item from your vocabulary and future rounds.
            </Dialog.Description>
            <div className={styles.confirmActions}>
              <Dialog.Close className={buttonStyles.secondary}>
                Cancel
              </Dialog.Close>
              <button
                className={buttonStyles.danger}
                onClick={() => {
                  if (pendingRemoval) onRemove(pendingRemoval);
                  onPendingRemovalChange(null);
                }}
              >
                Remove
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
