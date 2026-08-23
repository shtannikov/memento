import { Check, Heart, X } from "lucide-react";

import styles from "./quiz-screen.module.css";
import type { QuizCard, QuizFeedback } from "./quiz.types";

type QuizScreenProps = {
  card: QuizCard;
  completed: number;
  total: number;
  lives: number;
  feedback: QuizFeedback;
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
  onExit: () => void;
};

export function QuizScreen({
  card,
  completed,
  total,
  lives,
  feedback,
  selectedAnswer,
  onAnswer,
  onExit,
}: QuizScreenProps) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button
          className={styles.iconButton}
          onClick={onExit}
          aria-label="Leave quiz"
        >
          <X aria-hidden="true" />
        </button>
        <div className={styles.progress}>
          <div className={styles.progressCopy}>
            <span>
              {completed + 1} of {total}
            </span>
            <span>{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className={styles.progressTrack}>
            <span
              style={{ width: `${((completed + 0.25) / total) * 100}%` }}
            />
          </div>
        </div>
        <div className={styles.lives} aria-label={`${lives} lives remaining`}>
          {[0, 1, 2].map((life) => (
            <Heart
              key={life}
              aria-hidden="true"
              className={life < lives ? styles.fullHeart : undefined}
            />
          ))}
        </div>
      </header>

      <div
        className={
          feedback === "incorrect"
            ? `${styles.content} ${styles.shake}`
            : styles.content
        }
      >
        <p className={styles.eyebrow}>Choose the best answer</p>
        <h1 className={styles.sentence}>{card.sentence}</h1>
        <div className={styles.options} key={card.id}>
          {card.options.map((option, index) => {
            const isSelected = option === selectedAnswer;
            const feedbackClass =
              isSelected && feedback ? styles[feedback] : "";

            return (
              <button
                key={option}
                className={`${styles.option} ${feedbackClass}`}
                onClick={(event) => {
                  if (event.detail > 0) event.currentTarget.blur();
                  onAnswer(option);
                }}
                disabled={Boolean(selectedAnswer)}
              >
                <span className={styles.optionIndex}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option.toLocaleLowerCase()}</span>
                {isSelected && feedback === "correct" && (
                  <Check aria-hidden="true" />
                )}
                {isSelected && feedback === "incorrect" && (
                  <X aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
        <p
          className={`${styles.feedbackLabel} ${
            feedback ? styles[feedback] : ""
          }`}
        >
          {feedback === "correct"
            ? "Correct — moving on"
            : feedback === "incorrect"
              ? "Not quite — you’ll see this one again"
              : "One answer fits the sentence best."}
        </p>
      </div>
    </div>
  );
}
