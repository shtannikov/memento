import type { Metadata } from "next";

import styles from "@/app/page.module.css";
import { currentTrial } from "@/app/_features/trial-quiz/content/current-trial";
import { trialTelegramUrl } from "@/app/_features/trial-quiz/server/trial-telegram";
import { TrialQuiz } from "@/app/_features/trial-quiz/trial-quiz";

export const metadata: Metadata = {
  title: "Czech Quiz | Pomněnka",
  description: "Try a Czech quiz with Pomněnka.",
};

export default function TrialPage() {
  return (
    <main className={styles.canvas}>
      <section className={styles.mobileShell}>
        <TrialQuiz
          manifest={currentTrial}
          telegramUrl={trialTelegramUrl()}
        />
      </section>
    </main>
  );
}
