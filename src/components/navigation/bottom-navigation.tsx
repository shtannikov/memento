import { BookOpen, Home } from "lucide-react";

import styles from "./bottom-navigation.module.css";

type NavigationDestination = "home" | "vocabulary";

type BottomNavigationProps = {
  activeDestination: NavigationDestination;
  onNavigate: (destination: NavigationDestination) => void;
};

export function BottomNavigation({
  activeDestination,
  onNavigate,
}: BottomNavigationProps) {
  return (
    <nav className={styles.navigation} aria-label="Primary navigation">
      <button
        className={
          activeDestination === "home"
            ? `${styles.item} ${styles.active}`
            : styles.item
        }
        onClick={() => onNavigate("home")}
      >
        <Home aria-hidden="true" />
        <span>Home</span>
      </button>
      <button
        className={
          activeDestination === "vocabulary"
            ? `${styles.item} ${styles.active}`
            : styles.item
        }
        onClick={() => onNavigate("vocabulary")}
      >
        <BookOpen aria-hidden="true" />
        <span>Vocabulary</span>
      </button>
    </nav>
  );
}
