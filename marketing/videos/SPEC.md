# Vocabulary quiz video specification

## Format

- Vertical 9:16, 1080×1920 pixels.
- 30 frames per second.
- Five items per episode.
- 180 frames / six seconds per item; 900 frames / 30 seconds total.
- MP4 using H.264 at CRF 18.
- No background music.

All target-language strings and speech settings come from the selected language pack. The composition must not contain language-specific copy.

## Six-second item sequence

| Frame | Event |
|---:|---|
| 0 | New scene, object, localized series label, localized question, and item number appear. |
| 8 | The language-specific question recording begins. |
| 51 | Countdown shows 3 and the first tick plays. |
| 81 | Countdown shows 2 and the second tick plays. |
| 111 | Countdown shows 1 and the third tick plays. |
| 141 | Countdown disappears, the answer appears, and the answer ding plays. |
| 143 | The exact target term is pronounced, after the answer cue has begun. |
| 180 | The next item begins immediately. |

The answer contains only `term` from the manifest. It has no article, gender marker, translation, label, or explanatory text unless those characters are part of the term itself.

## Layout

- Header: `top: 120`, horizontal inset 80. Language-specific series label on the left and `n / 5` on the right, kept below common short-video platform overlays.
- Question: `top: 210`, horizontal inset 80, centered, 88 px, weight 900.
- Object card: `top: 455`, horizontal inset 100, height 760, white background, rounded corners and soft shadow.
- Response zone: countdown and answer share a vertical center at `y: 1480`.
- Timer: 300 px outer circle and 250 px inner circle, clockwise progress.
- Answer: 180 px high block, horizontal inset 70, accent color, with a short underline and pop animation.

Each item supplies a distinct accent color and very pale related background. Primary text remains `#17212b`. Images must be unambiguous, photorealistic transparent cutouts or compact scenes. English text may appear only when it is explicitly required to disambiguate the concept.

## Content rules

- Use five distinct, common terms that a learner can recognize from an unambiguous image.
- Store exact target-language spelling, including diacritics, in `term`.
- Put the intended physical meaning in `visualPrompt`; disambiguate polysemous terms explicitly.
- Prefer an isolated object for concrete concepts. Use a compact scene for actions, processes, interactions, and concepts that do not have one unambiguous object; require a user-supplied reference before generating a difficult scene.
- Permit short English text only when it is necessary to distinguish the intended object or meaning. Specify the exact text in `visualPrompt`; do not include the target-language answer or unrelated readable text.
- Use safe lowercase kebab-case IDs and slugs. Slugs must be unique within an episode.
- Do not put topic or vocabulary data in React or workflow code.
- Have a fluent speaker verify spelling, meaning, and pronunciation for every new language and episode.

## Acceptance checklist

- The exact five terms and their order received explicit user approval before any media was generated.
- All five selected images received explicit user approval before speech or video generation began.
- The language ID matches the Memento application registry and remains distinct from its locale.
- The language pack has localized label/question text, a reviewed question WAV, voice configuration, and both prompt files.
- The manifest has exactly five valid items and all ten generated item assets exist.
- Every image is recognizable without revealing its target-language term. Any visible English label is explicitly requested and necessary to disambiguate the intended answer.
- Question speech ends before the countdown; each answer recording stays inside its six-second scene.
- The final file is 1080×1920, 30 fps, 30 seconds, H.264, and contains audible speech and sound effects.
