---
name: add-memento-language
description: Add another learning language to Memento as a separate Telegram bot and Mini App while sharing the repository, Vercel project, and Supabase projects. Use for requests to add, prototype beyond UI, provision, or release a new Memento language; for changes to app IDs, per-language prompts, graders, starter vocabulary, bot webhooks, language routes, database isolation, or language evals.
---

# Add a Memento Language

Implement each learning language as an independent product entry point inside
the shared deployment. Preserve English behavior and data throughout rollout.

## Establish the contract

Before editing, resolve these values from the request or state explicit
assumptions:

- product app ID used in routes, database rows, and env names;
- standards locale used only for linguistic operations;
- target-language name and Mini App route;
- Stage and Production bot ownership;
- fluent QA owner before public enablement.

Keep the product ID distinct from the locale when necessary. Czech is `cz` in
product identifiers and `cs-CZ` only as a locale. Never silently normalize one
into the other.

## Preserve the architecture

- Use one bot per learning language. Do not add a language selector, whitelist,
  feature flag, or import follow-up question unless the user changes the model.
- Derive app identity from the Mini App entry point and bot credentials. Never
  accept an unverified user-selected app ID as authorization.
- Share the repository, Vercel project, Supabase Stage/Production projects, and
  structural quiz schema.
- Isolate vocabulary, starter state, rounds, history, retries, and generation
  quota by `app_id`.
- Keep prompts, grader instructions, examples, starter vocabulary, and eval
  cases independent per language. Do not create a universal interpolated
  prompt.
- Keep UI chrome and Telegram command copy in English unless localization is
  explicitly requested.
- Do not add a language without a realistic quality-validation path. A private
  implementation may be prepared before native review, but do not claim it is
  ready for public release.

## Inspect before changing

Read the current implementations; file names may have evolved:

- `src/languages/registry.ts`
- `src/languages/types.ts`
- `src/languages/en/`
- `src/languages/cz/`
- `src/lib/server/openai.ts`
- `src/lib/server/vocabulary.ts`
- `src/lib/server/rounds.ts`
- `src/lib/server/telegram-route.ts`
- `src/app/api/telegram/webhook/`
- `evals/runner.ts`
- `scripts/configure-telegram-app.ts`
- `docs/language-apps.md`
- `supabase/migrations/`

Read the relevant local Next.js guide under `node_modules/next/dist/docs/`
before adding routes or changing framework APIs. Follow `AGENTS.md` for all
validation and deployment requirements.

## Implement in two release phases

### 1. Add the schema first

Create the migration with `npx supabase migration new <name>`.

- Extend every `app_id` check to include the new product ID.
- Preserve `en` defaults and all existing data.
- Add or update app-aware uniqueness and indexes only when required.
- Keep legacy English RPC signatures while adding app-aware overloads.
- Revoke access from `public`, `anon`, and `authenticated`; grant only the
  intended `service_role` access.
- Add a migration contract test.
- Publish this as its own draft PR. Require Stage migration success and inspect
  the resulting schema before continuing.

Merge the schema PR to Production before merging application code. Vercel and
database workflows deploy independently, so combining both phases can briefly
run new English code against an old schema.

### 2. Add the application

- Create `src/languages/<app-id>/index.ts` containing the complete language
  manifest: ID, locale, app/webhook paths, env-variable names, starters,
  native grammar rules and examples, generation prompt, and grader prompt.
- Add the definition once to `src/languages/registry.ts`. The shared dynamic
  Mini App page and webhook route must discover it from that registry; do not
  add language-specific Next.js route files.
- Thread the app ID through client requests, Telegram auth, vocabulary, rounds,
  history, completion/failure, and daily quota queries.
- Make Telegram `/import` and `/reset` target the current bot's app directly.
- Keep `scripts/configure-telegram-app.ts` registry-driven; do not add a
  language switch or duplicate its route/env configuration there.
- Update `AGENTS.md` and CI change detection when new prompt/starter paths are
  introduced.

Use `TELEGRAM_<APP_ID>_BOT_TOKEN` and
`TELEGRAM_<APP_ID>_WEBHOOK_SECRET` for non-English apps unless an existing
convention says otherwise. Never print or commit credentials.

## Add language-specific validation

- Add unit coverage for exact app-ID handling, independent bot token and
  webhook secret selection, direct Telegram import/reset routing, starters,
  prompt selection, and cross-app rejection.
- Add live eval cases beside the manifest in
  `src/languages/<app-id>/evals.ts` using production client methods. Export them
  as `EVAL_CASES`; `evals/loader.ts` discovers every registered language by
  convention, so do not add another central eval import. Cover the complete
  starter set, a smaller set, realistic morphology/grammar traps, multilingual
  definitions, and Russian definitions.
- Make eval assertions target-language-aware. Do not reuse an English-only
  character or grammar assertion for a language where it is invalid.
- Do not weaken the structural validator or grader to pass a new language.

Run:

```sh
npm run ci
npm run eval
```

After publishing, require Vercel `Ready` and HTTP 200 for both `/` and the new
language route. Run Supabase security and performance advisors after DDL; treat
service-role-only RLS-without-policy notices as intentional only after verifying
that table and function grants remain closed to client roles.

## Hand off the release

Report:

- schema PR and implementation PR, including merge order;
- current Preview URL and tested language route;
- English regression and new-language eval results;
- exact Stage/Production secrets still required;
- bot provisioning command;
- native QA or launch prerequisites that remain.
