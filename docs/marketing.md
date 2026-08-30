# Marketing

The `marketing/images/` project generates reusable 1080×1920 campaign
slides and wide social previews for Memento. Copy and layout live in JSON,
while `generate.py` owns the shared visual system.

## Generate the English campaign

```sh
python3 -m pip install -r marketing/images/requirements.txt
python3 marketing/images/generate.py marketing/images/campaigns/en.json --platform telegram
```

The full-size slides, lightweight previews, contact sheet, and Telegram-only
`chat-cover.jpg` are written to `marketing/images/output/en/telegram/`.
The chat cover is 1280×720 (16:9), with a 640×360 preview for quick inspection;
its companion description is written to `chat-copy.txt` for direct reuse.

## Generate the GitHub social preview

```sh
python3 marketing/images/generate.py marketing/images/campaigns/en.json --platform github
```

This writes `github-social-preview.jpg` at GitHub's 1280×640 social-preview
size and a 640×320 inspection preview to
`marketing/images/output/en/github/`. The GitHub platform intentionally
sets `render_slides` to `false`, so the command only emits the wide artwork.

The platform argument is required so the intended header treatment is always
explicit:

```sh
# Omits the Memento logo/wordmark because Telegram already supplies app context.
python3 marketing/images/generate.py marketing/images/campaigns/en.json --platform telegram

# Keeps the Memento logo/wordmark for standalone social posts.
python3 marketing/images/generate.py marketing/images/campaigns/en.json --platform instagram
python3 marketing/images/generate.py marketing/images/campaigns/en.json --platform linkedin

# Generates the standalone 1280×640 repository social preview.
python3 marketing/images/generate.py marketing/images/campaigns/en.json --platform github
```

## Make a change

- Edit wording, screenshot placement, or colors in
  `marketing/images/campaigns/en.json`.
- Replace screenshots in `marketing/images/assets/` while keeping the
  same filenames, or update the filenames in the campaign JSON.
- Set `crop_top` to `0` to preserve the iOS status bar, or raise it when a
  campaign intentionally needs to remove system chrome.
- `bezel` controls the dark phone frame around each screenshot.
- `palette` controls the shared dark-blue background and accent colors.
- `platforms` controls platform-specific treatment such as whether the brand
  header is shown, whether story slides are rendered, and whether an additional
  wide image is generated.
- The GitHub `feature_image` block controls its copy and geometry: phone
  screenshots, fan overlap, footer copy, and language chips. The feature labels
  share one baseline and use the configured `separator`. Colors intentionally
  come from the campaign's shared top-level `palette`, so the repository preview
  stays aligned with the other materials.
- The GitHub footer uses its own centered divider from `x` to `right`, separated
  from the content by `divider_top`. Its `centered` layout treats platform copy
  and the compact language group as one unit, independent of the screenshot fan
  above it. `copy_accent` highlights an important phrase without changing the
  rest of the footer typography.
- The GitHub `background` block repositions glows while referencing colors by
  shared palette key, keeping the cover visually consistent with other campaign
  materials.
- The official full-resolution logo lives at
  `marketing/images/assets/logo.png`. Its campaign presentation is
  controlled by `brand.logo_mask`; use `circle` for the story lockup, `cutout`
  for a transparent-background mark, `feather` to blend the square artwork into
  a wide background, or `none` to preserve the source image unchanged.

## Verify the generator

```sh
python3 -m unittest marketing/images/test_generate.py
```

The integration test confirms that the GitHub platform emits only the social
preview and that both generated files have the expected dimensions.

## Add Czech later

Duplicate `marketing/images/campaigns/en.json` as
`marketing/images/campaigns/cs.json`, set `id` and `locale` to `cs`,
translate the copy, and point at Czech screenshots. The same generator will
write each platform campaign beneath
`marketing/images/output/cs/<platform>/` without changing the layouts.
