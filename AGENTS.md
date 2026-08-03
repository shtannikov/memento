<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Deployment workflow

- The app is deployed by the Vercel project `shtannikov/memento`.
- Treat each pull request's Vercel Preview deployment as that pull request's Stage environment. Use its dynamic Preview URL; there is intentionally no shared `staging` branch or permanent Stage URL.
- Every push to a pull request must produce a fresh Vercel Preview. Before handing off app work, confirm the latest Vercel check passes and share the current Preview URL.
- Every successful Vercel Preview deployment must trigger `.github/workflows/stage-telegram.yml`. Before handing off Stage app work, confirm that `Configure Stage Telegram` passed for the latest Preview; if the deployment event did not trigger it, run that workflow manually with the exact successful Preview URL. This workflow is Stage-only and must never receive a Production URL or Production bot credentials.
- `main` is the Vercel Production Branch. Vercel Git integration automatically deploys every push to `main` and updates the stable production aliases; do not add a duplicate CLI deployment to GitHub Actions.
- Keep `package-lock.json` committed. Never commit `.env*`, `.vercel/`, `node_modules/`, or `.next/`.
- Run `npm run lint` and `npm run build` before committing app changes.

## Main logic, tests, and evals

- When adding or releasing another learning language, use `.agents/skills/add-memento-language/SKILL.md` and follow its explicit authenticated Supabase catalog-registration rollout.

- Run `npm run ci` before committing changes to application logic. It includes lint, type-checking, coverage-gated unit tests, and the production build.
- Every workflow function and pure helper must have colocated `*.test.ts` coverage. New branches and failure modes require matching tests.
- OpenAI schemas, model configuration, and generation validation live in `src/lib/server/openai.ts`; each language's prompts, grader, starter vocabulary, manifest, and evals live together under `src/languages/<app-id>/` and are consumed by that production path.
- Any change to that OpenAI path or to starter vocabulary must update `evals/` and run `npm run eval` with the Stage OpenAI configuration.
- Evals must exercise production client methods, use realistic English and multilingual fixtures, and include Russian-definition coverage. Do not call the OpenAI SDK directly from eval cases.
- Do not weaken assertions, coverage thresholds, or eval graders to make CI pass. Fix the implementation or add a justified case-specific expectation.
- Stage and Production use separate Telegram bots. They share the existing Monolog Supabase Stage and Production projects, with all Memento objects isolated in the `memento` schema. Preview credentials must point at the Stage project and never at Production.
- GitHub's `Stage` environment must contain the four Stage-only Telegram secrets used by the post-deployment configuration workflow: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_CZ_BOT_TOKEN`, and `TELEGRAM_CZ_WEBHOOK_SECRET`. Do not copy Production bot credentials into GitHub Stage.
- Supabase migration history is shared with Monolog. Whenever Monolog adds a migration, add a matching comment-only baseline file under `supabase/migrations/` so Memento's migration history remains aligned without rerunning Monolog SQL.
- Required server-only Vercel variables are `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_CZ_BOT_TOKEN`, `TELEGRAM_CZ_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`, and `OPENAI_CHAT_MODEL`.
- GitHub Stage and Production environments require `OPENAI_API_KEY`, `SUPABASE_ACCESS_TOKEN`, and `SUPABASE_PROJECT_REF`. Set `OPENAI_CHAT_MODEL` to `gpt-5.6-luna`.
