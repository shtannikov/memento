#!/usr/bin/env python3
"""Generate reusable 1080×1920 Memento social story artwork from JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


WIDTH = 1080
HEIGHT = 1920
ROOT = Path(__file__).resolve().parent
FONT_PATH = Path("/System/Library/Fonts/SFNS.ttf")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", type=Path, help="Campaign JSON file")
    parser.add_argument("--platform", required=True, help="Target platform configured by the campaign")
    parser.add_argument("--output", type=Path, help="Override the output directory")
    return parser.parse_args()


def load_config(path: Path) -> dict[str, Any]:
    config = json.loads(path.read_text(encoding="utf-8"))
    required = {"id", "brand", "palette", "platforms", "slides"}
    missing = sorted(required - config.keys())
    if missing:
        raise ValueError(f"Missing campaign fields: {', '.join(missing)}")
    if not config["slides"]:
        raise ValueError("A campaign must contain at least one slide")
    return config


def color(value: str) -> tuple[int, int, int]:
    value = value.removeprefix("#")
    if len(value) != 6:
        raise ValueError(f"Expected a six-digit hex color, got {value!r}")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size=size)


def make_background(seed: int, palette: dict[str, str]) -> Image.Image:
    top = np.array(color(palette["top"]), dtype=np.float32)[None, None, :]
    middle = np.array(color(palette["middle"]), dtype=np.float32)[None, None, :]
    bottom = np.array(color(palette["bottom"]), dtype=np.float32)[None, None, :]

    y = np.linspace(0, 1, HEIGHT, dtype=np.float32)[:, None, None]
    first_mix = np.minimum(y * 2, 1)
    second_mix = np.maximum((y - 0.5) * 2, 0)
    base = top * (1 - first_mix) + middle * first_mix
    base = base * (1 - second_mix) + bottom * second_mix
    base = np.repeat(base, WIDTH, axis=1)

    yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH]
    primary = color(palette["glow_primary"])
    secondary = color(palette["glow_secondary"])
    glows = (
        (840, 230, 720, primary, 0.56),
        (90, 1210, 850, secondary, 0.32),
    )
    for center_x, center_y, radius, glow_color, strength in glows:
        distance = np.sqrt((xx - center_x) ** 2 + (yy - center_y) ** 2) / radius
        amount = np.clip(1 - distance, 0, 1) ** 1.8 * strength
        base = base * (1 - amount[..., None]) + np.array(glow_color) * amount[..., None]

    rng = np.random.default_rng(seed)
    grain = rng.normal(0, 6.5, (HEIGHT, WIDTH, 1)).astype(np.float32)
    return Image.fromarray(np.clip(base + grain, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def make_chat_background(
    seed: int,
    palette: dict[str, str],
    width: int,
    height: int,
) -> Image.Image:
    """Render the landscape gradient used by Telegram's bot-description image."""
    top = np.array(color(palette["top"]), dtype=np.float32)[None, None, :]
    bottom = np.array(color(palette["bottom"]), dtype=np.float32)[None, None, :]
    y = np.linspace(0, 1, height, dtype=np.float32)[:, None, None]
    base = top * (1 - y) + bottom * y
    base = np.repeat(base, width, axis=1)

    yy, xx = np.mgrid[0:height, 0:width]
    glows = (
        (round(width * 0.77), round(height * 0.16), round(width * 0.62), color(palette["glow_primary"]), 0.62),
        (round(width * 0.15), round(height * 0.78), round(width * 0.54), color(palette["glow_secondary"]), 0.28),
    )
    for center_x, center_y, radius, glow_color, strength in glows:
        distance = np.sqrt((xx - center_x) ** 2 + (yy - center_y) ** 2) / radius
        amount = np.clip(1 - distance, 0, 1) ** 1.8 * strength
        base = base * (1 - amount[..., None]) + np.array(glow_color) * amount[..., None]

    rng = np.random.default_rng(seed)
    grain = rng.normal(0, 5.5, (height, width, 1)).astype(np.float32)
    return Image.fromarray(np.clip(base + grain, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def draw_text(
    canvas: Image.Image,
    position: tuple[int, int],
    copy: str,
    size: int,
    fill: tuple[int, int, int, int],
    spacing: int = 4,
) -> None:
    ImageDraw.Draw(canvas).multiline_text(
        position,
        copy,
        font=font(size),
        fill=fill,
        spacing=spacing,
    )


def generated_logo(size: int) -> Image.Image:
    """Render a crisp approximation of the stacked-card Memento mark."""
    scale = 4
    large_size = size * scale
    logo = Image.new("RGBA", (large_size, large_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(logo)
    draw.ellipse(
        (3 * scale, 3 * scale, large_size - 3 * scale, large_size - 3 * scale),
        fill=(5, 22, 91, 255),
        outline=(35, 113, 255, 255),
        width=2 * scale,
    )

    cards = (
        ((14, 14, 42, 49), (12, 50, 151, 255), (63, 132, 255, 255)),
        ((19, 16, 47, 52), (15, 66, 190, 255), (78, 151, 255, 255)),
        ((24, 18, 52, 54), (19, 91, 230, 255), (112, 177, 255, 255)),
    )
    for bounds, fill, outline in cards:
        draw.rounded_rectangle(
            tuple(value * scale for value in bounds),
            radius=6 * scale,
            fill=fill,
            outline=outline,
            width=1 * scale,
        )

    draw.line(
        tuple((value * scale for point in ((31, 37), (37, 43), (47, 30)) for value in point)),
        fill=(255, 255, 255, 255),
        width=3 * scale,
        joint="curve",
    )
    return logo.resize((size, size), Image.Resampling.LANCZOS)


def supplied_logo(path: Path, size: int, mask_style: str | None) -> Image.Image:
    render_size = size * 4
    logo = ImageOps.fit(
        Image.open(path).convert("RGBA"),
        (render_size, render_size),
        method=Image.Resampling.LANCZOS,
    )
    if mask_style == "circle":
        mask = Image.new("L", logo.size, 0)
        ImageDraw.Draw(mask).ellipse((0, 0, render_size - 1, render_size - 1), fill=255)
        logo.putalpha(mask)
    elif mask_style not in (None, "none"):
        raise ValueError(f"Unsupported logo mask: {mask_style}")
    return logo.resize((size, size), Image.Resampling.LANCZOS)


def draw_brand(canvas: Image.Image, config: dict[str, Any], asset_root: Path) -> None:
    logo_name = config["brand"].get("logo")
    if logo_name:
        logo = supplied_logo(
            asset_root / logo_name,
            72,
            config["brand"].get("logo_mask"),
        )
    else:
        logo = generated_logo(72)
    canvas.alpha_composite(logo, (70, 72))
    draw_text(canvas, (154, 91), config["brand"]["name"].upper(), 34, (255, 255, 255, 205))


def prepare_screenshot(path: Path, crop_top: int) -> Image.Image:
    screenshot = Image.open(path).convert("RGB")
    if crop_top < 0 or crop_top >= screenshot.height:
        raise ValueError(f"Invalid crop_top={crop_top} for {path}")
    return screenshot.crop((0, crop_top, screenshot.width, screenshot.height))


def phone_frame(
    path: Path,
    width: int,
    crop_top: int,
    crop_height: int | None = None,
    radius: int = 64,
    bezel: int = 12,
) -> Image.Image:
    screenshot = prepare_screenshot(path, crop_top)
    inner_width = width - bezel * 2
    if inner_width <= 0:
        raise ValueError(f"Phone width {width} is too small for bezel {bezel}")
    scale = inner_width / screenshot.width
    screenshot = screenshot.resize(
        (inner_width, round(screenshot.height * scale)),
        Image.Resampling.LANCZOS,
    )
    if crop_height is not None:
        inner_height = max(crop_height - bezel * 2, 1)
        screenshot = screenshot.crop((0, 0, inner_width, min(inner_height, screenshot.height)))

    outer_size = (width, screenshot.height + bezel * 2)
    outer_mask = Image.new("L", outer_size, 0)
    ImageDraw.Draw(outer_mask).rounded_rectangle(
        (0, 0, outer_size[0] - 1, outer_size[1] - 1),
        radius=radius,
        fill=255,
    )
    phone = Image.new("RGBA", outer_size, (2, 6, 19, 255))
    phone.putalpha(outer_mask)

    screen_mask = Image.new("L", screenshot.size, 0)
    ImageDraw.Draw(screen_mask).rounded_rectangle(
        (0, 0, screenshot.width - 1, screenshot.height - 1),
        radius=max(radius - bezel, 1),
        fill=255,
    )
    phone.paste(screenshot.convert("RGBA"), (bezel, bezel), screen_mask)
    return phone


def paste_with_shadow(
    canvas: Image.Image,
    card: Image.Image,
    position: tuple[int, int],
    blur: int = 34,
    offset_y: int = 24,
) -> None:
    x, y = position
    shadow_mask = Image.new("L", canvas.size, 0)
    shadow_mask.paste(card.getchannel("A"), (x, y + offset_y))
    shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(blur)).point(lambda value: round(value * 0.46))
    shadow = Image.new("RGBA", canvas.size, (0, 5, 28, 0))
    shadow.putalpha(shadow_mask)
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(card, (x, y))


def draw_standard_slide(
    canvas: Image.Image,
    slide: dict[str, Any],
    asset_root: Path,
    accent: tuple[int, int, int],
) -> None:
    image = slide["image"]
    card = phone_frame(
        asset_root / slide["screenshot"],
        width=image["width"],
        crop_top=image.get("crop_top", 0),
        crop_height=image.get("crop_height"),
        radius=image.get("radius", 64),
        bezel=image.get("bezel", 12),
    )
    x = image.get("x", (WIDTH - card.width) // 2)
    paste_with_shadow(
        canvas,
        card,
        (x, image["top"]),
    )

    copy = slide["copy"]
    draw_text(
        canvas,
        (copy.get("x", 76), copy["top"]),
        copy["headline"],
        copy.get("size", 112),
        (255, 255, 255, 255),
        spacing=copy.get("spacing", -3),
    )
    support = copy.get("support")
    if support:
        draw_text(
            canvas,
            (copy.get("support_x", 80), copy["support_top"]),
            support,
            copy.get("support_size", 42),
            (*accent, 220),
        )


def draw_finale_slide(
    canvas: Image.Image,
    slide: dict[str, Any],
    asset_root: Path,
    accent: tuple[int, int, int],
) -> None:
    copy = slide["copy"]
    draw_text(canvas, (76, copy["top"]), copy["headline"], copy.get("size", 140), (255, 255, 255, 255), -10)
    draw_text(canvas, (76, copy["accent_top"]), copy["accent_line"], copy.get("size", 140), (*accent, 255), -10)
    draw_text(canvas, (82, copy["support_top"]), copy["support"], 42, (255, 255, 255, 190))

    for item in slide["fan"]:
        card = phone_frame(
            asset_root / item["screenshot"],
            width=item["width"],
            crop_top=item.get("crop_top", 0),
            radius=item.get("radius", 44),
            bezel=item.get("bezel", 8),
        )
        angle = item.get("angle", 0)
        if angle:
            card = card.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
        position = (item["x"], item["top"])
        paste_with_shadow(canvas, card, position, blur=30, offset_y=22)


def render_chat_image(
    chat: dict[str, Any],
    output_dir: Path,
    asset_root: Path,
    palette: dict[str, str],
) -> Path:
    width = chat.get("width", 1280)
    height = chat.get("height", 720)
    canvas = make_chat_background(709, palette, width, height)

    for item in chat["fan"]:
        card = phone_frame(
            asset_root / item["screenshot"],
            width=item["width"],
            crop_top=item.get("crop_top", 0),
            crop_height=item.get("crop_height"),
            radius=item.get("radius", 38),
            bezel=item.get("bezel", 8),
        )
        angle = item.get("angle", 0)
        if angle:
            card = card.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
        paste_with_shadow(
            canvas,
            card,
            (item["x"], item["top"]),
            blur=item.get("shadow_blur", 26),
            offset_y=item.get("shadow_offset_y", 18),
        )

    copy = chat.get("copy")
    if copy:
        draw_text(
            canvas,
            (copy["x"], copy["top"]),
            copy["headline"],
            copy.get("size", 68),
            (255, 255, 255, 255),
            spacing=copy.get("spacing", -3),
        )
        draw_text(
            canvas,
            (copy.get("support_x", copy["x"] + 4), copy["support_top"]),
            copy["support"],
            copy.get("support_size", 36),
            (*color(palette["accent"]), 235),
        )

    filename = chat.get("filename", "chat-cover.jpg")
    destination = output_dir / filename
    canvas.convert("RGB").save(destination, quality=94, subsampling=0, optimize=True)
    preview = canvas.convert("RGB").resize((640, 360), Image.Resampling.LANCZOS)
    preview.save(output_dir / f"{Path(filename).stem}-preview.jpg", quality=86, optimize=True)
    return destination


def render_campaign(config: dict[str, Any], output_dir: Path, platform: str) -> list[Path]:
    if platform not in config["platforms"]:
        available = ", ".join(sorted(config["platforms"]))
        raise ValueError(f"Unknown platform {platform!r}. Available platforms: {available}")
    platform_config = config["platforms"][platform]
    output_dir.mkdir(parents=True, exist_ok=True)
    asset_root = ROOT / config.get("assets_dir", "assets")
    accent = color(config["palette"]["accent"])
    rendered: list[Image.Image] = []
    paths: list[Path] = []

    for index, slide in enumerate(config["slides"], start=1):
        canvas = make_background(index * 101, config["palette"])
        if platform_config.get("show_brand", True):
            draw_brand(canvas, config, asset_root)
        if slide["layout"] == "finale":
            draw_finale_slide(canvas, slide, asset_root, accent)
        else:
            draw_standard_slide(canvas, slide, asset_root, accent)

        destination = output_dir / f"{index:02d}.jpg"
        canvas.convert("RGB").save(destination, quality=93, subsampling=0, optimize=True)
        preview = canvas.convert("RGB").resize((540, 960), Image.Resampling.LANCZOS)
        preview.save(output_dir / f"{index:02d}-preview.jpg", quality=80, optimize=True)
        rendered.append(canvas)
        paths.append(destination)

    contact = Image.new("RGB", (294 * len(rendered) + 24, 528), (5, 10, 24))
    for index, canvas in enumerate(rendered):
        thumbnail = canvas.convert("RGB").resize((270, 480), Image.Resampling.LANCZOS)
        contact.paste(thumbnail, (24 + index * 294, 24))
    contact.save(output_dir / "contact-sheet.jpg", quality=91, optimize=True)

    chat = platform_config.get("chat_image")
    if chat:
        paths.append(render_chat_image(chat, output_dir, asset_root, config["palette"]))
    chat_copy = platform_config.get("chat_copy")
    if chat_copy:
        copy = f'{chat_copy["headline"]}\n{chat_copy["body"]}\n'
        (output_dir / "chat-copy.txt").write_text(copy, encoding="utf-8")
    return paths


def main() -> None:
    args = parse_args()
    config_path = args.config.resolve()
    config = load_config(config_path)
    output_dir = args.output.resolve() if args.output else ROOT / "output" / config["id"] / args.platform
    paths = render_campaign(config, output_dir, args.platform)
    print(f"Generated {len(paths)} campaign images in {output_dir}")


if __name__ == "__main__":
    main()
