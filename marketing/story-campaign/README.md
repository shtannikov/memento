# Memento story campaign generator

This folder generates the reusable 1080×1920 marketing slides for Memento.
Copy and layout live in JSON, while `generate.py` owns the shared visual system.

## Generate the English campaign

```sh
python3 -m pip install -r marketing/story-campaign/requirements.txt
python3 marketing/story-campaign/generate.py marketing/story-campaign/campaigns/en.json
```

The full-size slides, lightweight previews, and a contact sheet are written to
`marketing/story-campaign/output/en/`.

## Make a change

- Edit wording, screenshot placement, or colors in `campaigns/en.json`.
- Replace screenshots in `assets/` while keeping the same filenames, or update
  the filenames in the campaign JSON.
- Set `crop_top` to `0` to preserve the iOS status bar, or raise it when a
  campaign intentionally needs to remove system chrome.
- `bezel` controls the dark phone frame around each screenshot.
- `palette` controls the shared dark-blue background and accent colors.
- The official full-resolution logo lives at `assets/logo.png`. Its campaign
  presentation is controlled by `brand.logo_mask`; use `circle` for the current
  lockup or `none` to preserve the square artwork.

## Add Czech later

Duplicate `campaigns/en.json` as `campaigns/cs.json`, set `id` and `locale` to
`cs`, translate the copy, and point at Czech screenshots. The same generator
will write the campaign to `output/cs/` without changing the layouts.
