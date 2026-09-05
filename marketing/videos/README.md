# Memento vocabulary videos

This standalone Remotion package produces 30-second vertical vocabulary quizzes. Its React composition is language-neutral: language copy and speech settings live in `languages/`, editorial episode data lives in `episodes/`, reusable runtime media is committed under `public/core/` and `public/languages/`, and disposable media is ignored under `public/generated/` and `renders/`.

## Install and use

Run commands from this directory:

```sh
npm install
npm run validate:all
npm run prompts -- cz/cafe
npm run voice -- cz/cafe
npm run validate -- cz/cafe
npm run studio -- cz/cafe
npm run render -- cz/cafe
```

`npm run prompts` prints the exact five image prompts Codex should use. Save selected PNGs as `public/generated/<language>/<episode>/images/<slug>.png`. Candidate iterations may stay under the adjacent `candidates/` directory. `npm run voice` keeps existing word recordings unless `--force` is passed.

Rendered videos are written to `renders/<language>/<episode>.mp4`. Generated media and renders remain available for iteration but are not committed. Delete one episode's artifacts explicitly with:

```sh
npm run clean -- cz/cafe
```

The clean command requires a validated, traversal-safe selector and never deletes all episodes at once.

## Create an episode with Codex

Paste or adapt the language's `episode-request.md` in Codex. Creation is an explicitly gated conversation:

1. Codex proposes the five words and their order, then waits for approval without generating media.
2. After word approval, Codex creates the manifest and generates image candidates. It shows all five and waits for explicit image approval; requested replacements remain in this step.
3. Only after every image is approved does Codex select the final images, generate speech, validate, preview or render, and report every artifact.

An existing episode follows the same gates when it is regenerated. Old generated assets are not treated as approval for a new run. The detailed agent contract is in `AGENTS.md`.

Episode manifests are committed even though their generated media is not. Every manifest contains exactly five items:

```json
{
  "id": "cafe",
  "languageId": "cz",
  "topic": "Kavárna",
  "items": [
    {
      "term": "káva",
      "slug": "kava",
      "visualPrompt": "a ceramic cup of freshly brewed coffee",
      "accent": "#EF476F",
      "pale": "#FFF0F3"
    }
  ]
}
```

`term` is displayed and pronounced verbatim. `visualPrompt` explains the intended physical subject in English so image generation does not depend on interpreting the target-language spelling.

## Add video support for another language

The application language must exist first. Use the same product app ID used by `src/app/_languages`; for example Czech is `cz`, while `cs-CZ` remains only the standards locale.

1. Add `languages/<app-id>/config.json` with localized labels and macOS TTS settings.
2. Write independent `object-image-prompt.md` and `episode-request.md` files; do not interpolate or automatically translate another language's linguistic instructions.
3. Create and commit its question recording with `npm run voice:question -- <app-id>`, then have a fluent speaker review it.
4. Add `episodes/<app-id>/<episode>.json`, generate the five word recordings and images, and render a full test episode.
5. Obtain native-language review before calling the language publicly ready.

Adding video support for an already registered app language does not change Supabase, Telegram, or the deployed application. Adding a new application language remains a separate rollout governed by the repository's add-language workflow.

## Verification

```sh
npm run ci
```

This runs TypeScript, unit tests, and validation of every committed language pack and episode manifest. Render readiness is checked separately with `npm run validate -- <language>/<episode>` because generated media is intentionally local.
