import Image from "next/image";
import Link from "next/link";

import styles from "./pomnenka-landing.module.css";

type PomnenkaLandingProps = {
  homeUrl?: string;
  telegramUrl: string;
  trialUrl?: string;
};

export function PomnenkaLanding({
  homeUrl = "/",
  telegramUrl,
  trialUrl = "/trial",
}: PomnenkaLandingProps) {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link className={styles.brand} href={homeUrl} aria-label="Pomněnka home">
          <Image className={styles.logo} src="/icon.svg" alt="" width={44} height={44} />
          <span>Pomněnka</span>
        </Link>
        <a className={styles.navCta} href={telegramUrl}>
          Open in Telegram
        </a>
      </nav>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <h1>Meet Pomněnka.</h1>
          <p>
            Add Czech words and phrases, practice them with quick quizzes, and
            track your progress 🚀
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryCta} href={telegramUrl}>
              Open in Telegram
            </a>
            <Link className={styles.secondaryCta} href={trialUrl}>
              Try a quiz
            </Link>
          </div>
        </div>

        <div className={styles.visual}>
          <Image
            className={styles.cover}
            src="/pomnenka/chat-cover.jpg"
            alt="Pomněnka vocabulary list and Czech quiz"
            width={1280}
            height={720}
            priority
            sizes="(max-width: 800px) calc(100vw - 32px), 58vw"
          />
        </div>
      </section>

      <section className={styles.closing}>
        <p>Start practising with Pomněnka.</p>
        <a className={styles.primaryCta} href={telegramUrl}>
          Open in Telegram
        </a>
      </section>
    </main>
  );
}
