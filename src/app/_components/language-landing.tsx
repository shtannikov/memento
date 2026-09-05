import Image from "next/image";
import Link from "next/link";

import type { SiteLanguage } from "@/app/_languages/registry";
import styles from "./language-landing.module.css";

type LanguageLandingProps = {
  homeUrl?: string;
  language: SiteLanguage;
  telegramUrl: string;
  trialUrl?: string;
};

export function LanguageLanding({
  homeUrl = "/",
  language,
  telegramUrl,
  trialUrl,
}: LanguageLandingProps) {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link
          className={styles.brand}
          href={homeUrl}
          aria-label={`${language.appName} home`}
        >
          <Image
            className={styles.logo}
            src="/icon.svg"
            alt=""
            width={44}
            height={44}
          />
          <span>{language.appName}</span>
        </Link>
        <a className={styles.navCta} href={telegramUrl}>
          Open in Telegram
        </a>
      </nav>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <h1>Meet {language.appName}.</h1>
          <p>
            Add {language.targetLanguage} words and phrases, practice them with
            quick quizzes, and track your progress 🚀
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryCta} href={telegramUrl}>
              Open in Telegram
            </a>
            {trialUrl && (
              <Link className={styles.secondaryCta} href={trialUrl}>
                Try a quiz
              </Link>
            )}
          </div>
        </div>

        <div className={styles.visual}>
          <Image
            className={styles.cover}
            src={language.site.coverImage}
            alt={`${language.appName} vocabulary list and ${language.targetLanguage} quiz`}
            width={1280}
            height={720}
            priority
            sizes="(max-width: 800px) calc(100vw - 32px), 58vw"
          />
        </div>
      </section>

      <section className={styles.closing}>
        <p>Start practising with {language.appName}.</p>
        <a className={styles.primaryCta} href={telegramUrl}>
          Open in Telegram
        </a>
      </section>
    </main>
  );
}
