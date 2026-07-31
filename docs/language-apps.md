# Language apps

Memento runs one product entry point per learning language while sharing this
repository, Vercel project, and Supabase projects. English uses `/` and the
existing bot. Czech uses `/cz` and its own bot. There is no language selector or
user whitelist: possession/discovery of a bot is the access boundary.

The product identifier for Czech is always `cz`. The standards-based locale
inside the Czech language pack is `cs-CZ`; it must not be used in routes,
database app IDs, or environment-variable names.

## Environment variables

Keep the existing English variables and add these server-only variables to each
Vercel environment that should expose the Czech app:

- `TELEGRAM_CZ_BOT_TOKEN`
- `TELEGRAM_CZ_WEBHOOK_SECRET`

Preview variables must contain the Czech Stage bot credentials. Production
variables must contain the Czech Production bot credentials. Never reuse a bot
token or webhook secret across Stage and Production.

## Register and provision a language

Register the app ID in the target Supabase project before deploying code that
uses it. Load that environment's `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, then
run:

```sh
npm run language:register -- --app cz
```

The command is idempotent and verifies the resulting row in
`memento.language_apps`. English and Czech are seeded by the catalog migration,
so this command is mainly the data-only registration path for future languages.
It replaces per-language schema migrations: adding an ID must not alter table
constraints or replace core database functions.

Create the bot in BotFather, choose a random webhook secret, set the two
environment variables locally without committing them, and run:

```sh
npm run telegram:configure -- --app cz --base-url https://preview.example.com
```

For Production, rerun the same command with the production credentials and
stable production origin. The command configures and verifies the webhook and
sets the Telegram `App` menu button to the correct language route. English can
be repaired the same way with `--app en`.

## Adding another language

Create `src/languages/<app-id>/index.ts` with the language manifest, bot env
names, routes, starter vocabulary, generation prompt, and grader. Put its live
cases beside it in `src/languages/<app-id>/evals.ts`, then add the language
manifest once to `src/languages/registry.ts`. The eval loader discovers its
cases by convention; the dynamic Mini App page, webhook route, and provisioning
script consume the language registry automatically.

Register the new ID in the Stage catalog before deploying its application code,
and in Production immediately before the Production release. Do not create a
migration merely to add a language. A schema migration is appropriate only when
the shared storage shape or behavior changes for every language.

Do not make the existing prompts into a universal interpolated prompt. Follow
`.agents/skills/add-memento-language/SKILL.md` for the complete rollout.
