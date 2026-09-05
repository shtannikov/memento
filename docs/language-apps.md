# Language apps

Memento runs one product entry point per learning language while sharing this
repository, Vercel project, and Supabase projects. English uses `/` and the
existing bot under the product name Memento. Czech uses `/cz` and its own bot
under the product name Pomněnka. There is no language selector or user
whitelist: possession/discovery of a bot is the access boundary.

The product identifier for Czech is always `cz`. The standards-based locale
inside the Czech language pack is `cs-CZ`; it must not be used in routes,
database app IDs, or environment-variable names.

## Environment variables

Keep the existing English variables and add these server-only variables to each
Vercel environment that should expose the Czech app:

- `TELEGRAM_CZ_BOT_TOKEN`
- `TELEGRAM_CZ_WEBHOOK_SECRET`
- `TELEGRAM_CZ_BOT_USERNAME` for Preview public links

Preview variables must contain the Czech Stage bot credentials. Production
variables must contain the Czech Production bot credentials. Never reuse a bot
token or webhook secret across Stage and Production.

Languages with a public website also declare an optional `site` block in their
language manifest. It is the single source of truth for the custom hostname,
Production bot username, Preview bot-username variable, landing cover, and
optional public Trial rewrite. The shared proxy, metadata, landing, unknown-page
fallback, and Telegram links discover that block through the language registry;
do not add hostname- or product-specific branches elsewhere.

On a Vercel Preview, inspect a configured public site with `?site=<app-id>`.
The selector is ignored in Production, where the hostname selects the language.

## Register and provision a language

Register the app ID in the target Supabase project before deploying code that
uses it. Use the authenticated Supabase app or the Supabase SQL editor and run:

```sql
insert into memento.language_apps (app_id)
values ('cz')
on conflict (app_id) do nothing;

select app_id
from memento.language_apps
where app_id = 'cz';
```

Run the insert and verification against Stage first, then against Production
immediately before release. English and Czech are seeded by the catalog
migration, so this data-only registration path is mainly for future languages.
Do not retrieve Vercel Sensitive variables into a local admin script, and do not
add a public registration endpoint or automatic deployment hook. Adding an ID
must not alter table constraints or replace core database functions.

Create the bot in BotFather, choose a random webhook secret, and store both
values as Vercel Sensitive variables. Copy the Stage values separately into
the matching secrets in GitHub's `Stage` environment; the workflow never reads
Vercel Sensitive variables. After every successful Vercel Preview deployment,
`.github/workflows/stage-telegram.yml` runs `npm run stage:telegram` and updates
and verifies each Stage bot's webhook and default `App` menu-button URL.

The script deliberately accepts only a Vercel Preview URL and Stage credentials.
Production bot provisioning remains an external release prerequisite owned by
the operator. Telegram's profile-level Main Mini App (`Launch app`) URL has no
official Bot API method and must still be changed manually in BotFather if it is
enabled; the automated default menu button is the setting equivalent to
BotFather's `/setmenubutton`.

## Adding another language

Create `src/app/_languages/<app-id>/index.ts` with the product name, language
manifest, bot env names, routes, starter vocabulary, generation prompt, and
grader. If the language has a public domain, include its `site` block and web
cover as well. Put its live cases beside it in
`src/app/_languages/<app-id>/evals.ts`, then add the language manifest once to
`src/app/_languages/registry.ts`. The eval loader, dynamic Mini App page,
webhook, and public-site routing consume the language registry automatically.

Register the new ID in the Stage catalog before deploying its application code,
and in Production immediately before the Production release. Do not create a
migration merely to add a language. A schema migration is appropriate only when
the shared storage shape or behavior changes for every language.

Do not make the existing prompts into a universal interpolated prompt. Follow
`.agents/skills/add-language/SKILL.md` for the complete rollout.
