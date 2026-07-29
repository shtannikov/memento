import { useRef } from "react";

import styles from "./vocabulary-screen.module.css";

export type LearningLanguage = {
  id: string;
  code: string;
  label: string;
};

function VocabularyTotal({
  count,
  label,
  learned = false,
}: {
  count: number;
  label: string;
  learned?: boolean;
}) {
  return (
    <div className={styles.total}>
      <p className={learned ? styles.learnedTotal : undefined}>
        {count}
      </p>
      <span>{label}</span>
    </div>
  );
}

export function VocabularyHeader({
  learningCount,
  learnedCount,
  languages,
  activeLanguageId,
  onLanguageChange,
}: {
  learningCount: number;
  learnedCount: number;
  languages?: LearningLanguage[];
  activeLanguageId?: string;
  onLanguageChange?: (languageId: string) => void;
}) {
  const languageMenuRef = useRef<HTMLDetailsElement>(null);
  const activeLanguage = languages?.find(
    (language) => language.id === activeLanguageId,
  );

  return (
    <header className={styles.header}>
      <div className={styles.headerRow}>
        <div className={styles.headerTitle}>
          <h1>Vocabulary</h1>
          {activeLanguage && languages && onLanguageChange && (
            <details
              ref={languageMenuRef}
              className={styles.languageSelector}
            >
              <summary
                aria-label={`Change learning language. Current language: ${activeLanguage.label}`}
              >
                <span className={styles.languageCode}>
                  {activeLanguage.code}
                </span>
                <span
                  className={styles.languageChevron}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </summary>
              <div
                className={styles.languageMenu}
                aria-label="Learning language"
              >
                <p>Learning language</p>
                {languages.map((language) => {
                  const selected = language.id === activeLanguage.id;

                  return (
                    <button
                      key={language.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        onLanguageChange(language.id);
                        languageMenuRef.current?.removeAttribute(
                          "open",
                        );
                      }}
                    >
                      <span className={styles.languageCode}>
                        {language.code}
                      </span>
                      <span>{language.label}</span>
                      {selected && (
                        <span
                          className={styles.languageCheck}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </details>
          )}
        </div>
        <div className={styles.totals} aria-label="Vocabulary totals">
          <VocabularyTotal count={learningCount} label="learning" />
          <div className={styles.totalDivider} />
          <VocabularyTotal count={learnedCount} label="Learned" learned />
        </div>
      </div>
    </header>
  );
}
