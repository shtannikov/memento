# Memento story campaign generator

This folder generates the reusable 1080×1920 marketing slides for Memento.
Copy and layout live in JSON, while `generate.py` owns the shared visual system.

## Generate the English campaign

```sh
python3 -m pip install -r marketing/story-campaign/requirements.txt
python3 marketing/story-campaign/generate.py marketing/story-campaign/campaigns/en.json --platform telegram
```

The full-size slides, lightweight previews, contact sheet, and Telegram-only
`chat-cover.jpg` are written to `marketing/story-campaign/output/en/telegram/`.
The chat cover is 1280×720 (16:9), with a 640×360 preview for quick inspection;
its companion description is written to `chat-copy.txt` for direct reuse.

The platform argument is required so the intended header treatment is always
explicit:

```sh
# Omits the Memento logo/wordmark because Telegram already supplies app context.
python3 marketing/story-campaign/generate.py marketing/story-campaign/campaigns/en.json --platform telegram

# Keeps the Memento logo/wordmark for standalone social posts.
python3 marketing/story-campaign/generate.py marketing/story-campaign/campaigns/en.json --platform instagram
python3 marketing/story-campaign/generate.py marketing/story-campaign/campaigns/en.json --platform linkedin
```

## Make a change

- Edit wording, screenshot placement, or colors in `campaigns/en.json`.
- Replace screenshots in `assets/` while keeping the same filenames, or update
  the filenames in the campaign JSON.
- Set `crop_top` to `0` to preserve the iOS status bar, or raise it when a
  campaign intentionally needs to remove system chrome.
- `bezel` controls the dark phone frame around each screenshot.
- `palette` controls the shared dark-blue background and accent colors.
- `platforms` controls platform-specific treatment such as whether the brand
  header is shown and whether an additional chat image is generated.
- The official full-resolution logo lives at `assets/logo.png`. Its campaign
  presentation is controlled by `brand.logo_mask`; use `circle` for the current
  lockup or `none` to preserve the square artwork.

## Add Czech later

Duplicate `campaigns/en.json` as `campaigns/cs.json`, set `id` and `locale` to
`cs`, translate the copy, and point at Czech screenshots. The same generator
will write each platform campaign beneath `output/cs/<platform>/` without
changing the layouts.
