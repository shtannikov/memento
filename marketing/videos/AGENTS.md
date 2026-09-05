# Vocabulary video agent instructions

Use this workflow whenever the user asks Codex to create or update a video under this directory.

1. Treat `<language-id>/<episode-id>` as the production selector. Read the matching language `config.json`, `object-image-prompt.md`, and `episode-request.md`, plus `SPEC.md`.
2. Keep language IDs aligned with `src/app/_languages/registry.ts`. Never substitute a locale for the product ID: Czech is `cz`, while its locale is `cs-CZ`.
3. Put topics and vocabulary only in committed `episodes/<language-id>/<episode-id>.json` manifests. Keep the Remotion source language-neutral.
4. **Vocabulary approval gate:** propose the exact five terms and their order, with enough meaning context to catch ambiguity. Validate spelling, diacritics, meaning, and visual recognizability, then stop. Do not create or change the manifest or generate any media until the user explicitly approves the terms and order.
5. After vocabulary approval, classify each term before writing its visual prompt. Prefer an isolated object only when it unambiguously represents the term. A short, exact English label is allowed when it materially removes ambiguity, but decorative or target-language answer text is not. For actions, processes, interactions, or concepts that cannot be represented by one unambiguous object, ask the user for a reference image and stop; do not generate that scene until the reference is supplied.
6. Create or update the manifest and run `npm run prompts -- <selector>`. For each item, use the image-generation skill and its built-in image tool once per requested asset or variant. Inspect every result—including exact text and faithfulness to references—and save it under the ignored episode `candidates/` directory. Do not generate speech, copy candidates into the final `images/` directory, preview, or render yet.
7. **Image approval gate:** show the five candidates in their approved word order, report the exact prompt and candidate path for each, then stop. The user must explicitly approve every image or request replacements. Generate and show replacements until all five selections are explicitly approved.
8. Only after image approval, copy the selected candidates to `images/<slug>.png`. Never overwrite a previously approved asset without explicit authorization.
9. Run `npm run voice -- <selector>` to generate missing word WAV files. Use `--force` only when replacement was requested. Question WAV files are committed language-pack assets and may be replaced only through the explicit `voice:question` command and native review.
10. Run `npm run validate -- <selector>`, preview when useful, then run `npm run render -- <selector>`. Inspect the final video for dimensions, duration, text, image clarity, timing, and sound.
11. Report the manifest path, final prompt for every generated image, selected generated asset paths, image-generation mode, and MP4 path.
12. Keep generated inputs and output after rendering. Run `npm run clean -- <selector>` only when the user explicitly requests cleanup.

For a new video language, follow the repository add-language skill. Keep its prompts and QA independent. Do not claim public readiness without fluent review. Video support alone must not mutate Supabase, Telegram, or deployment configuration.
