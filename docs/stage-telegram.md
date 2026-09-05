# Stage Telegram automation

`Configure Stage Telegram` runs after each successful Vercel Preview deployment
and points every Stage bot at that deployment. It updates and verifies:

- the Telegram webhook URL and secret;
- the default `App` menu button configured by BotFather `/setmenubutton`.

English uses the Preview root and `/api/telegram/webhook`. Czech uses `/cz` and
`/api/telegram/webhook/cz`. The script derives these paths and secret names from
the language registry. The separate admin bot has no webhook; the same script
sets and verifies its `App` menu button at `/admin`.

## One-time manual setup

1. In GitHub, open `shtannikov/memento` -> **Settings** -> **Environments** ->
   **Stage**.
2. Add these environment secrets using the Stage bots' values (never Production):
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
   `TELEGRAM_CZ_BOT_TOKEN`, `TELEGRAM_CZ_WEBHOOK_SECRET`, and
   `TELEGRAM_ADMIN_BOT_TOKEN`.
3. Use the same five Stage values for the corresponding Vercel **Preview**
   environment variables. Vercel and GitHub cannot copy Sensitive values from
   each other, so this duplication is manual.
4. Add `TELEGRAM_CZ_BOT_USERNAME` to the Vercel **Preview** environment using
   the Stage Czech bot's username without the leading `@`. The public
   `/cz/trial` result screen uses it for its Telegram link and refuses to fall
   back to the Production bot in a Preview build.
5. Make sure each webhook secret contains only `A-Z`, `a-z`, `0-9`, `_`, and
   `-`, and is at most 256 characters.
6. In Vercel, open the `memento` project -> **Settings** -> **Git** and make
   sure **repository_dispatch Events** is enabled for the connected GitHub
   repo. The older **deployment_status Events** integration is not used by this
   workflow and may be disabled.
7. Merge the workflow into `main`. GitHub only automatically handles later
   `repository_dispatch` events with a workflow present on the default branch.
8. For the first existing Preview, open **Actions** ->
   **Configure Stage Telegram** -> **Run workflow** and paste its exact
   `https://...vercel.app/` Preview URL. Later successful Preview deployments
   run it automatically.

Both the workflow definition and the script come from trusted `main`; Vercel
deployment metadata supplies only the successful Preview URL. A pull request
cannot change this workflow and immediately execute that changed definition
with Stage secrets.

## BotFather limitation

The default chat menu button is fully automated through Telegram's official
`setChatMenuButton` Bot API method. If a Stage bot also has a profile-level Main
Mini App with a separate **Launch app** button, Telegram only exposes that URL
through BotFather. Update it manually in **BotFather** -> **Bot Settings** ->
**Configure Mini App** whenever you want that separate button to follow a new
Preview URL.

Do not automate BotFather through a personal Telegram user session: it would
require storing account credentials/session state in CI and relies on an
interactive flow that Telegram does not expose as a supported bot API.
