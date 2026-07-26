import styles from "./vocabulary-screen.module.css";

export function VocabularyEmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className={styles.emptyState}>
      <p>{title}</p>
      <span>{text}</span>
    </div>
  );
}
