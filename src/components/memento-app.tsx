"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CircleCheck,
  Heart,
  Home,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Screen = "home" | "vocabulary" | "preparing" | "quiz" | "complete" | "failed";
type VocabularyStatus = "learning" | "learned";

type VocabularyItem = {
  id: number;
  term: string;
  definition: string;
  status: VocabularyStatus;
  due?: "Due" | "Later";
};

type QuizCard = {
  id: number;
  sentence: string;
  answer: string;
  options: string[];
};

const starterVocabulary: VocabularyItem[] = [
  { id: 1, term: "reluctant", definition: "Unwilling and hesitant; disinclined to do something", status: "learning", due: "Due" },
  { id: 2, term: "meticulous", definition: "Showing great attention to detail or correctness", status: "learning", due: "Due" },
  { id: 3, term: "adamant", definition: "Refusing to be persuaded or to change one’s mind", status: "learning", due: "Later" },
  { id: 4, term: "eloquent", definition: "Fluent or persuasive in speaking or writing", status: "learning" },
  { id: 5, term: "ubiquitous", definition: "Present, appearing, or found everywhere", status: "learning", due: "Due" },
  { id: 6, term: "candid", definition: "Truthful and straightforward; frank", status: "learning", due: "Later" },
  { id: 7, term: "discern", definition: "To perceive or recognize something clearly", status: "learning" },
  { id: 8, term: "astute", definition: "Having a sharp ability to assess situations; shrewd", status: "learning", due: "Due" },
  { id: 9, term: "concise", definition: "Giving much information clearly in a few words", status: "learning", due: "Later" },
  { id: 10, term: "take into account", definition: "To consider something when making a decision", status: "learning" },
  { id: 11, term: "prevalent", definition: "Widespread in a particular area or at a particular time", status: "learning", due: "Due" },
  { id: 12, term: "ambiguous", definition: "Open to more than one interpretation; not having one obvious meaning", status: "learning" },
  { id: 13, term: "pragmatic", definition: "Dealing with things sensibly and realistically", status: "learning", due: "Later" },
  { id: 14, term: "elusive", definition: "Difficult to find, catch, or achieve", status: "learning" },
  { id: 15, term: "nuanced", definition: "Characterized by subtle distinctions or differences", status: "learning", due: "Due" },
  { id: 16, term: "resilient", definition: "Able to recover quickly from difficulty", status: "learned" },
  { id: 17, term: "plausible", definition: "Seeming reasonable or probable", status: "learned" },
  { id: 18, term: "subtle", definition: "Delicate or precise as to be difficult to analyze", status: "learned" },
  { id: 19, term: "coherent", definition: "Logical and consistent", status: "learned" },
  { id: 20, term: "versatile", definition: "Able to adapt to many different functions", status: "learned" },
  { id: 21, term: "profound", definition: "Very great or intense; showing deep insight", status: "learned" },
  { id: 22, term: "vivid", definition: "Producing powerful feelings or clear images", status: "learned" },
  { id: 23, term: "foster", definition: "To encourage the development of something", status: "learned" },
  { id: 24, term: "diligent", definition: "Showing care and conscientiousness in work", status: "learned" },
  { id: 25, term: "compelling", definition: "Evoking interest or attention convincingly", status: "learned" },
];

const quizCards: QuizCard[] = [
  {
    id: 1,
    sentence: "Maya was ___ to speak before she had checked every detail.",
    answer: "reluctant",
    options: ["reluctant", "eloquent", "prevalent", "candid"],
  },
  {
    id: 2,
    sentence: "His ___ notes made the complicated process easy to repeat.",
    answer: "meticulous",
    options: ["ambiguous", "meticulous", "elusive", "pragmatic"],
  },
  {
    id: 3,
    sentence: "A good forecast must ___ both local data and long-term trends.",
    answer: "take into account",
    options: ["discern", "remain adamant", "take into account", "be ubiquitous"],
  },
];

export function MementoApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [vocabulary, setVocabulary] = useState(starterVocabulary);
  const [activeTab, setActiveTab] = useState<VocabularyStatus>("learning");
  const [addOpen, setAddOpen] = useState(false);
  const [removeItem, setRemoveItem] = useState<VocabularyItem | null>(null);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [queue, setQueue] = useState(quizCards);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [firstAttemptedIds, setFirstAttemptedIds] = useState<number[]>([]);
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [lives, setLives] = useState(3);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const learning = useMemo(() => vocabulary.filter((item) => item.status === "learning"), [vocabulary]);
  const learned = useMemo(() => vocabulary.filter((item) => item.status === "learned"), [vocabulary]);
  const activeCard = queue[0];
  const feedback = selectedAnswer
    ? selectedAnswer === activeCard?.answer
      ? "correct"
      : "incorrect"
    : null;

  useEffect(() => {
    if (screen !== "preparing") return;
    const timer = window.setTimeout(() => setScreen("quiz"), 1600);
    return () => window.clearTimeout(timer);
  }, [screen]);

  function startRound() {
    setQueue(quizCards);
    setCompletedIds([]);
    setFirstAttemptedIds([]);
    setFirstAttemptCorrect(0);
    setMistakes(0);
    setLives(3);
    setSelectedAnswer(null);
    setScreen("preparing");
  }

  function chooseAnswer(answer: string) {
    if (selectedAnswer || !activeCard) return;

    const isCorrect = answer === activeCard.answer;
    const isFirstAttempt = !firstAttemptedIds.includes(activeCard.id);
    setSelectedAnswer(answer);

    if (isFirstAttempt) {
      setFirstAttemptedIds((ids) => [...ids, activeCard.id]);
      if (isCorrect) setFirstAttemptCorrect((count) => count + 1);
    }

    window.setTimeout(() => {
      if (isCorrect) {
        const nextCompleted = [...completedIds, activeCard.id];
        setCompletedIds(nextCompleted);
        setQueue((cards) => cards.slice(1));
        setSelectedAnswer(null);
        if (nextCompleted.length === quizCards.length) setScreen("complete");
        return;
      }

      const nextLives = lives - 1;
      setMistakes((count) => count + 1);
      setLives(nextLives);
      setSelectedAnswer(null);
      if (nextLives === 0) {
        setScreen("failed");
      } else {
        setQueue((cards) => [...cards.slice(1), cards[0]]);
      }
    }, 820);
  }

  function addVocabulary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!term.trim() || !definition.trim()) return;
    setVocabulary((items) => [
      {
        id: Date.now(),
        term: term.trim(),
        definition: definition.trim(),
        status: "learning",
        due: "Later",
      },
      ...items,
    ]);
    setTerm("");
    setDefinition("");
    setActiveTab("learning");
    setAddOpen(false);
  }

  function navigate(next: "home" | "vocabulary") {
    setScreen(next);
  }

  const showNavigation = screen === "home" || screen === "vocabulary";

  return (
    <main className="app-canvas">
      <section className="phone-shell" aria-live="polite">
        {screen === "home" && (
          <HomeScreen
            learningCount={learning.length}
            learnedCount={learned.length}
            onStart={startRound}
            onVocabulary={() => navigate("vocabulary")}
          />
        )}

        {screen === "vocabulary" && (
          <VocabularyScreen
            activeTab={activeTab}
            items={activeTab === "learning" ? learning : learned}
            learningCount={learning.length}
            learnedCount={learned.length}
            onTabChange={setActiveTab}
            onAdd={() => setAddOpen(true)}
            onRemove={setRemoveItem}
          />
        )}

        {screen === "preparing" && <PreparingScreen onCancel={() => navigate("home")} />}

        {screen === "quiz" && activeCard && (
          <QuizScreen
            card={activeCard}
            completed={completedIds.length}
            total={quizCards.length}
            lives={lives}
            feedback={feedback}
            selectedAnswer={selectedAnswer}
            onAnswer={chooseAnswer}
            onExit={() => navigate("home")}
          />
        )}

        {screen === "complete" && (
          <RoundResult
            success
            accuracy={Math.round((firstAttemptCorrect / quizCards.length) * 100)}
            mistakes={mistakes}
            completed={quizCards.length}
            total={quizCards.length}
            onRestart={startRound}
            onHome={() => navigate("home")}
          />
        )}

        {screen === "failed" && (
          <RoundResult
            success={false}
            accuracy={0}
            mistakes={mistakes}
            completed={completedIds.length}
            total={quizCards.length}
            onRestart={startRound}
            onHome={() => navigate("home")}
          />
        )}

        {showNavigation && (
          <nav className="bottom-nav" aria-label="Primary navigation">
            <button
              className={screen === "home" ? "nav-item is-active" : "nav-item"}
              onClick={() => navigate("home")}
            >
              <Home aria-hidden="true" />
              <span>Home</span>
            </button>
            <button
              className={screen === "vocabulary" ? "nav-item is-active" : "nav-item"}
              onClick={() => navigate("vocabulary")}
            >
              <BookOpen aria-hidden="true" />
              <span>Vocabulary</span>
            </button>
          </nav>
        )}
      </section>

      <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-sheet" aria-describedby="add-vocabulary-description">
            <div className="dialog-heading">
              <div>
                <Dialog.Title>Add vocabulary</Dialog.Title>
                <Dialog.Description id="add-vocabulary-description">
                  Add a word or phrase to your next learning rounds.
                </Dialog.Description>
              </div>
              <Dialog.Close className="icon-button" aria-label="Close">
                <X aria-hidden="true" />
              </Dialog.Close>
            </div>
            <form className="vocabulary-form" onSubmit={addVocabulary}>
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
              <button className="primary-button" type="submit">
                Add to vocabulary
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(removeItem)} onOpenChange={(open) => !open && setRemoveItem(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="confirm-dialog" aria-describedby="remove-description">
            <div className="danger-icon">
              <Trash2 aria-hidden="true" />
            </div>
            <Dialog.Title>Remove “{removeItem?.term}”?</Dialog.Title>
            <Dialog.Description id="remove-description">
              This removes the item from your vocabulary and future rounds.
            </Dialog.Description>
            <div className="confirm-actions">
              <Dialog.Close className="secondary-button">Cancel</Dialog.Close>
              <button
                className="danger-button"
                onClick={() => {
                  if (removeItem) {
                    setVocabulary((items) => items.filter((item) => item.id !== removeItem.id));
                  }
                  setRemoveItem(null);
                }}
              >
                Remove
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

function HomeScreen({
  learningCount,
  learnedCount,
  onStart,
  onVocabulary,
}: {
  learningCount: number;
  learnedCount: number;
  onStart: () => void;
  onVocabulary: () => void;
}) {
  return (
    <div className="screen home-screen">
      <header className="hero">
        <p className="eyebrow">Memento</p>
        <h1>Ready to learn?</h1>
        <p>
          {learningCount} words active <span>·</span> {learnedCount} mastered
        </p>
      </header>

      <div className="home-content">
        <div className="stat-grid">
          <article className="stat-card">
            <p className="card-label">Learning</p>
            <strong>{learningCount}</strong>
            <span>active words</span>
          </article>
          <article className="stat-card learned-card">
            <p className="card-label">Learned</p>
            <strong>{learnedCount}</strong>
            <span>permanently done</span>
          </article>
        </div>

        <article className="round-card">
          <p className="card-label">Last round</p>
          <p>No rounds yet — start your first one below.</p>
        </article>

        <div className="home-actions">
          <button className="primary-button" onClick={onStart}>
            <Sparkles aria-hidden="true" />
            Start round
          </button>
          <button className="secondary-button" onClick={onVocabulary}>
            Manage vocabulary
          </button>
        </div>
      </div>
    </div>
  );
}

function VocabularyScreen({
  activeTab,
  items,
  learningCount,
  learnedCount,
  onTabChange,
  onAdd,
  onRemove,
}: {
  activeTab: VocabularyStatus;
  items: VocabularyItem[];
  learningCount: number;
  learnedCount: number;
  onTabChange: (status: VocabularyStatus) => void;
  onAdd: () => void;
  onRemove: (item: VocabularyItem) => void;
}) {
  return (
    <div className="screen vocabulary-screen">
      <header className="vocabulary-header">
        <p className="eyebrow dark">Your collection</p>
        <h1>Vocabulary</h1>
        <Tabs.Root value={activeTab} onValueChange={(value) => onTabChange(value as VocabularyStatus)}>
          <Tabs.List className="tabs-list" aria-label="Vocabulary sections">
            <Tabs.Trigger value="learning">
              Learning <span>{learningCount}</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="learned">
              Learned <span>{learnedCount}</span>
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </header>

      <div className="vocabulary-list">
        {items.map((item) => (
          <article className={item.status === "learned" ? "word-card learned-word" : "word-card"} key={item.id}>
            <div className="word-copy">
              <div className="word-title">
                <h2>{item.term}</h2>
                {item.status === "learned" ? (
                  <span className="status-pill learned">
                    <Check aria-hidden="true" /> Learned
                  </span>
                ) : item.due ? (
                  <span className={`status-pill ${item.due.toLowerCase()}`}>{item.due}</span>
                ) : null}
              </div>
              <p>{item.definition}</p>
            </div>
            {item.status === "learning" && (
              <button className="remove-button" onClick={() => onRemove(item)} aria-label={`Remove ${item.term}`}>
                <X aria-hidden="true" />
              </button>
            )}
          </article>
        ))}
      </div>

      <button className="fab" onClick={onAdd} aria-label="Add vocabulary">
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}

function PreparingScreen({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="center-screen">
      <button className="back-button" onClick={onCancel}>
        <ArrowLeft aria-hidden="true" />
        Home
      </button>
      <div className="preparing-mark">
        <Sparkles aria-hidden="true" />
      </div>
      <p className="eyebrow dark">Fresh questions</p>
      <h1>Preparing your round<span className="animated-dots">…</span></h1>
      <p className="supporting-copy">We’re turning your words into a focused three-card warm-up.</p>
    </div>
  );
}

function QuizScreen({
  card,
  completed,
  total,
  lives,
  feedback,
  selectedAnswer,
  onAnswer,
  onExit,
}: {
  card: QuizCard;
  completed: number;
  total: number;
  lives: number;
  feedback: "correct" | "incorrect" | null;
  selectedAnswer: string | null;
  onAnswer: (answer: string) => void;
  onExit: () => void;
}) {
  return (
    <div className="screen quiz-screen">
      <header className="quiz-header">
        <button className="icon-button" onClick={onExit} aria-label="Leave round">
          <X aria-hidden="true" />
        </button>
        <div className="progress-wrap">
          <div className="progress-copy">
            <span>{completed + 1} of {total}</span>
            <span>{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${((completed + 0.25) / total) * 100}%` }} />
          </div>
        </div>
        <div className="lives" aria-label={`${lives} lives remaining`}>
          {[0, 1, 2].map((life) => (
            <Heart key={life} aria-hidden="true" className={life < lives ? "is-full" : ""} />
          ))}
        </div>
      </header>

      <div className={feedback === "incorrect" ? "quiz-content shake" : "quiz-content"}>
        <p className="eyebrow dark">Choose the best answer</p>
        <h1>{card.sentence}</h1>
        <div className="options">
          {card.options.map((option, index) => {
            const isSelected = option === selectedAnswer;
            const stateClass = isSelected && feedback ? ` ${feedback}` : "";
            return (
              <button
                key={option}
                className={`option-button${stateClass}`}
                onClick={() => onAnswer(option)}
                disabled={Boolean(selectedAnswer)}
              >
                <span className="option-index">{String.fromCharCode(65 + index)}</span>
                <span>{option}</span>
                {isSelected && feedback === "correct" && <Check aria-hidden="true" />}
                {isSelected && feedback === "incorrect" && <X aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <p className={`feedback-label ${feedback ?? ""}`}>
          {feedback === "correct" ? "Correct — moving on" : feedback === "incorrect" ? "Not quite — you’ll see this one again" : "One answer fits the sentence best."}
        </p>
      </div>
    </div>
  );
}

function RoundResult({
  success,
  accuracy,
  mistakes,
  completed,
  total,
  onRestart,
  onHome,
}: {
  success: boolean;
  accuracy: number;
  mistakes: number;
  completed: number;
  total: number;
  onRestart: () => void;
  onHome: () => void;
}) {
  return (
    <div className={`center-screen result-screen ${success ? "success" : "failure"}`}>
      <div className="result-mark">
        {success ? <Trophy aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
      </div>
      <p className="eyebrow dark">{success ? "Nicely done" : "That one was tough"}</p>
      <h1>{success ? "Round complete" : "Round failed"}</h1>
      <p className="supporting-copy">
        {success ? "Every word made it through the round." : "All three lives are gone. Your learning progress is unchanged."}
      </p>
      <div className="result-stats">
        <article>
          <strong>{success ? `${accuracy}%` : `${completed}/${total}`}</strong>
          <span>{success ? "first-try accuracy" : "words completed"}</span>
        </article>
        <article>
          <strong>{mistakes}</strong>
          <span>{mistakes === 1 ? "mistake" : "mistakes"}</span>
        </article>
      </div>
      <div className="result-actions">
        <button className="primary-button" onClick={onRestart}>
          {success ? <Sparkles aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
          {success ? "Start another round" : "Start again"}
        </button>
        <button className="secondary-button" onClick={onHome}>
          Back to Home
        </button>
      </div>
      {success && (
        <div className="saved-note">
          <CircleCheck aria-hidden="true" /> Round result ready to save
        </div>
      )}
    </div>
  );
}
