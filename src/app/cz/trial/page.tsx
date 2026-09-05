import type { Metadata } from "next";
import { headers } from "next/headers";

import styles from "@/app/page.module.css";
import { currentTrial } from "@/app/_features/trial-quiz/content/current-trial";
import { trialTelegramUrl } from "@/app/_features/trial-quiz/server/trial-telegram";
import { TrialQuiz } from "@/app/_features/trial-quiz/trial-quiz";
import {
  POMNENKA_SITE,
  POMNENKA_SITE_HEADER,
} from "@/app/site-routing";

export const defaultMetadata: Metadata = {
  title: "Czech Quiz | Pomněnka",
  description: "Try this week’s Czech vocabulary quiz.",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();

  if (requestHeaders.get(POMNENKA_SITE_HEADER) === POMNENKA_SITE) {
    return {
      ...defaultMetadata,
      title: "Pomněnka",
      icons: { icon: "/pomnenka-icon.png" },
    };
  }

  return defaultMetadata;
}

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
