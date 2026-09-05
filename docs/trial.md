# Trial quiz

The Czech TikTok funnel is available at `/cz/trial`. It is deliberately
separate from the Telegram-only application at `/cz`: Trial never reads
Telegram `initData`, calls an API, generates content, or saves progress.

## Publish a weekly Trial

1. Finish and approve seven video episode manifests under
   `marketing/videos/episodes/cz/`. Together they must contain 35 unique words.
2. Add an immutable module under
   `src/app/_features/trial-quiz/content/cz/`. Its `TrialQuizManifest` must
   reference all seven episodes and contain the fixed ten pre-generated cards.
3. Include at least one card from every episode. Every card needs one `___`,
   four unique options, exactly one copy of its answer, and a valid episode/item
   source reference.
4. Point `content/current-trial.ts` at the reviewed weekly module. This import
   is the only activation switch; its Production deployment changes the Trial
   behind the permanent `/cz/trial` URL.
5. Run `npm run ci`. The build imports and validates the active manifest, so an
   invalid or incomplete week cannot be deployed.

ChatGPT may draft the ten cards during this editorial workflow. The reviewed
text is committed in the weekly module, and no model is called for visitors.

## Telegram destination

The final Trial screen opens the Czech bot chat with the `tiktok_trial` start
payload. Production defaults to `pomnenkaxbot`. Vercel Preview must define
`TELEGRAM_CZ_BOT_USERNAME` with the Stage bot username; the build fails instead
of silently sending Stage visitors to Production.
