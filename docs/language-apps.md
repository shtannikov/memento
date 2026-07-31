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

## Provision a bot

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

Add the app ID to `src/lib/domain/app.ts`, provide a dedicated starter list and
prompt/grader pack, add a page and webhook route, extend the database app-ID
checks with a migration, and add language-specific live eval cases. Do not make
the English or Czech prompts into a universal interpolated prompt.
