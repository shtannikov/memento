#!/usr/bin/env python3
"""Generate reusable Memento campaign artwork from JSON."""

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
REGULAR_FONT_CANDIDATES = (
    Path("/System/Library/Fonts/SFNS.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("DejaVuSans.ttf"),
)
BOLD_FONT_CANDIDATES = (
    Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("DejaVuSans-Bold.ttf"),
)


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


def palette_color(palette: dict[str, str], value: str) -> tuple[int, int, int]:
    return color(palette.get(value, value))


def font(size: int, bold: bool = False, weight: str | None = None) -> ImageFont.FreeTypeFont:
    if weight:
        for path in REGULAR_FONT_CANDIDATES:
            try:
                text_font = ImageFont.truetype(str(path), size=size)
                text_font.set_variation_by_name(weight.encode("ascii"))
                return text_font
            except (AttributeError, OSError, ValueError):
                continue
    use_bold_fallback = bold or weight in {"Semibold", "Bold", "Heavy", "Black"}
    candidates = BOLD_FONT_CANDIDATES if use_bold_fallback else REGULAR_FONT_CANDIDATES
    for path in candidates:
        try:
            return ImageFont.truetype(str(path), size=size)
        except OSError:
            continue
    style = "bold" if bold else "regular"
    raise RuntimeError(f"Could not find a supported {style} campaign font")


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
    return Image.fromarray(np.clip(base + grain, 0, 255).astype(np.uint8)).convert("RGBA")


def make_chat_background(
    seed: int,
    palette: dict[str, str],
    width: int,
    height: int,
    background: dict[str, Any] | None = None,
) -> Image.Image:
    """Render the landscape gradient used by Telegram's bot-description image."""
    background = background or {}
    top = np.array(
        palette_color(palette, background.get("top", "top")),
        dtype=np.float32,
    )[None, None, :]
    bottom = np.array(
        palette_color(palette, background.get("bottom", "bottom")),
        dtype=np.float32,
    )[None, None, :]
    y = np.linspace(0, 1, height, dtype=np.float32)[:, None, None]
    base = top * (1 - y) + bottom * y
    base = np.repeat(base, width, axis=1)

    yy, xx = np.mgrid[0:height, 0:width]
    glow_specs = background.get("glows")
    if glow_specs:
        glows = tuple(
            (
                round(width * glow["x"]),
                round(height * glow["y"]),
                round(width * glow["radius"]),
                palette_color(palette, glow["color"]),
                glow["strength"],
            )
            for glow in glow_specs
        )
    else:
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
    return Image.fromarray(np.clip(base + grain, 0, 255).astype(np.uint8)).convert("RGBA")


def draw_text(
    canvas: Image.Image,
    position: tuple[int, int],
    copy: str,
    size: int,
    fill: tuple[int, int, int, int],
    spacing: int = 4,
    bold: bool = False,
    weight: str | None = None,
) -> None:
    ImageDraw.Draw(canvas).multiline_text(
        position,
        copy,
        font=font(size, bold=bold, weight=weight),
        fill=fill,
        spacing=spacing,
    )


def draw_highlighted_multiline_text(
    canvas: Image.Image,
    position: tuple[int, int],
    copy: str,
    size: int,
    fill: tuple[int, int, int, int],
    highlight: str,
    highlight_fill: tuple[int, int, int, int],
    spacing: int = 4,
    bold: bool = False,
) -> None:
    draw = ImageDraw.Draw(canvas)
    text_font = font(size, bold=bold)
    sample_bounds = draw.textbbox((0, 0), "Ag", font=text_font)
    line_advance = sample_bounds[3] - sample_bounds[1] + spacing
    x, y = position
    for line in copy.splitlines():
        prefix, found, suffix = line.partition(highlight)
        draw.text((x, y), prefix, font=text_font, fill=fill)
        cursor_x = x + round(draw.textlength(prefix, font=text_font))
        if found:
            draw.text((cursor_x, y), found, font=text_font, fill=highlight_fill)
            cursor_x += round(draw.textlength(found, font=text_font))
        draw.text((cursor_x, y), suffix, font=text_font, fill=fill)
        y += line_advance


def draw_centered_text(
    canvas: Image.Image,
    center_x: int,
    top: int,
    copy: str,
    size: int,
    fill: tuple[int, int, int, int],
    bold: bool = False,
) -> None:
    text_font = font(size, bold=bold)
    bounds = ImageDraw.Draw(canvas).textbbox((0, 0), copy, font=text_font)
    draw_text(
        canvas,
        (round(center_x - (bounds[2] - bounds[0]) / 2), top),
        copy,
        size,
        fill,
        bold=bold,
    )


def draw_tracked_text(
    canvas: Image.Image,
    position: tuple[int, int],
    copy: str,
    size: int,
    fill: tuple[int, int, int, int],
    tracking: int,
    bold: bool = False,
    weight: str | None = None,
) -> None:
    draw = ImageDraw.Draw(canvas)
    x, y = position
    text_font = font(size, bold=bold, weight=weight)
    for character in copy:
        draw.text((x, y), character, font=text_font, fill=fill)
        bounds = draw.textbbox((0, 0), character, font=text_font)
        x += bounds[2] - bounds[0] + tracking


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
    elif mask_style == "feather":
        inset = round(render_size * 0.07)
        mask = Image.new("L", logo.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (inset, inset, render_size - inset, render_size - inset),
            radius=round(render_size * 0.16),
            fill=255,
        )
        mask = mask.filter(ImageFilter.GaussianBlur(round(render_size * 0.065)))
        logo.putalpha(mask)
    elif mask_style == "cutout":
        pixels = np.asarray(logo.convert("RGB"), dtype=np.float32)
        luminance = pixels @ np.array((0.2126, 0.7152, 0.0722), dtype=np.float32)
        highlight = np.maximum(pixels.max(axis=2) - 115, 0) * 0.15
        signal = luminance + highlight
        matte = np.clip((signal - 14) / 52, 0, 1)
        matte = matte * matte * (3 - 2 * matte)
        mask = Image.fromarray(np.round(matte * 255).astype(np.uint8))
        mask = mask.filter(ImageFilter.GaussianBlur(max(round(render_size * 0.006), 1)))
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


def rotated_phone_frame(
    path: Path,
    width: int,
    crop_top: int,
    angle: float = 0,
    crop_height: int | None = None,
    radius: int = 64,
    bezel: int = 12,
    supersample: int = 4,
) -> Image.Image:
    """Render rotated phone edges at high resolution to avoid stair-stepping."""
    if not angle:
        return phone_frame(path, width, crop_top, crop_height, radius, bezel)
    card = phone_frame(
        path,
        width=width * supersample,
        crop_top=crop_top,
        crop_height=crop_height * supersample if crop_height is not None else None,
        radius=radius * supersample,
        bezel=bezel * supersample,
    )
    card = card.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    return card.resize(
        (round(card.width / supersample), round(card.height / supersample)),
        Image.Resampling.LANCZOS,
    )


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
        card = rotated_phone_frame(
            asset_root / item["screenshot"],
            width=item["width"],
            crop_top=item.get("crop_top", 0),
            angle=item.get("angle", 0),
            radius=item.get("radius", 44),
            bezel=item.get("bezel", 8),
        )
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
        card = rotated_phone_frame(
            asset_root / item["screenshot"],
            width=item["width"],
            crop_top=item.get("crop_top", 0),
            angle=item.get("angle", 0),
            crop_height=item.get("crop_height"),
            radius=item.get("radius", 38),
            bezel=item.get("bezel", 8),
        )
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


def draw_flag(canvas: Image.Image, country: str, position: tuple[int, int], size: int) -> None:
    flag = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(flag)
    if country == "us":
        draw.rectangle((0, 0, size, size), fill=(255, 255, 255, 255))
        stripe_height = max(round(size / 7), 1)
        for index in range(0, 7, 2):
            top = index * stripe_height
            draw.rectangle((0, top, size, min(top + stripe_height, size)), fill=(220, 52, 66, 255))
        draw.rectangle((0, 0, round(size * 0.5), round(size * 0.53)), fill=(34, 62, 132, 255))
        for row in range(3):
            for column in range(3):
                star_x = round(size * (0.09 + column * 0.15))
                star_y = round(size * (0.09 + row * 0.15))
                draw.ellipse((star_x, star_y, star_x + 1, star_y + 1), fill=(255, 255, 255, 255))
    elif country == "cz":
        draw.rectangle((0, 0, size, size // 2), fill=(255, 255, 255, 255))
        draw.rectangle((0, size // 2, size, size), fill=(215, 40, 54, 255))
        draw.polygon(((0, 0), (round(size * 0.58), size // 2), (0, size)), fill=(31, 67, 144, 255))
    else:
        raise ValueError(f"Unsupported flag: {country}")

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    flag.putalpha(mask)
    canvas.alpha_composite(flag, position)
    ImageDraw.Draw(canvas).ellipse(
        (position[0], position[1], position[0] + size - 1, position[1] + size - 1),
        outline=(111, 200, 255, 205),
        width=1,
    )


def draw_language_chip(
    canvas: Image.Image,
    chip: dict[str, Any],
    accent: tuple[int, int, int],
    top: int,
    height: int,
) -> None:
    x = chip["x"]
    width = chip["width"]
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (x, top, x + width, top + height),
        radius=10,
        fill=(5, 22, 67, 175),
        outline=(*accent, 225),
        width=2,
    )
    flag_name = chip.get("flag")
    text_x = x + 15
    if flag_name:
        flag_size = chip.get("flag_size", 26)
        flag_top = top + (height - flag_size) // 2
        draw_flag(canvas, flag_name, (x + 12, flag_top), flag_size)
        text_x = x + 48
    draw_text(
        canvas,
        (text_x, top + chip.get("text_top", 11)),
        chip["label"],
        chip.get("size", 16),
        (255, 255, 255, 245),
    )


def draw_platform_mark(
    canvas: Image.Image,
    position: tuple[int, int],
    size: int,
    palette: dict[str, str],
) -> None:
    x, y = position
    accent = color(palette["accent"])
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (x, y, x + size, y + size),
        radius=10,
        fill=(*color(palette["middle"]), 210),
        outline=(*accent, 230),
        width=2,
    )
    center_x = x + size // 2
    cube_top = y + round(size * 0.2)
    cube_center = y + round(size * 0.49)
    cube_bottom = y + round(size * 0.82)
    left = x + round(size * 0.23)
    right = x + round(size * 0.77)
    left_bottom = y + round(size * 0.65)
    right_bottom = left_bottom
    outline = tuple(min(channel + 70, 255) for channel in accent)
    left_fill = tuple(round(channel * 0.48) for channel in accent)
    right_fill = tuple(round(channel * 0.72) for channel in accent)
    draw.polygon(
        ((center_x, cube_top), (right, y + round(size * 0.36)), (center_x, cube_center), (left, y + round(size * 0.36))),
        fill=(*accent, 255),
    )
    draw.polygon(
        ((left, y + round(size * 0.36)), (center_x, cube_center), (center_x, cube_bottom), (left, left_bottom)),
        fill=(*left_fill, 255),
    )
    draw.polygon(
        ((center_x, cube_center), (right, y + round(size * 0.36)), (right, right_bottom), (center_x, cube_bottom)),
        fill=(*right_fill, 255),
    )
    draw.line(
        (
            center_x, cube_top,
            right, y + round(size * 0.36),
            right, right_bottom,
            center_x, cube_bottom,
            left, left_bottom,
            left, y + round(size * 0.36),
            center_x, cube_top,
        ),
        fill=(*outline, 245),
        width=1,
        joint="curve",
    )
    draw.line(
        (
            left, y + round(size * 0.36),
            center_x, cube_center,
            right, y + round(size * 0.36),
            center_x, cube_center,
            center_x, cube_bottom,
        ),
        fill=(*outline, 245),
        width=1,
    )


def render_feature_image(
    feature: dict[str, Any],
    output_dir: Path,
    asset_root: Path,
    config: dict[str, Any],
) -> Path:
    width = feature.get("width", 1280)
    height = feature.get("height", 640)
    palette = config["palette"]
    accent = color(palette["accent"])
    canvas = make_chat_background(
        feature.get("seed", 811),
        palette,
        width,
        height,
        feature.get("background"),
    )

    brand = feature["brand"]
    logo = supplied_logo(
        asset_root / config["brand"]["logo"],
        brand.get("logo_size", 116),
        brand.get("logo_mask", "none"),
    )
    canvas.alpha_composite(logo, (brand["x"], brand["top"]))
    draw_tracked_text(
        canvas,
        (brand["wordmark_x"], brand["wordmark_top"]),
        config["brand"]["name"].upper(),
        brand.get("wordmark_size", 34),
        (255, 255, 255, 250),
        brand.get("tracking", 6),
        bold=True,
        weight=brand.get("wordmark_weight"),
    )

    copy = feature["copy"]
    draw_text(
        canvas,
        (copy["x"], copy["top"]),
        copy["headline"],
        copy.get("size", 48),
        (255, 255, 255, 255),
        spacing=copy.get("spacing", -3),
        bold=True,
        weight=copy.get("weight"),
    )
    draw_text(
        canvas,
        (copy["x"], copy["accent_top"]),
        copy["accent_line"],
        copy.get("accent_size", copy.get("size", 48)),
        (*color(copy.get("accent", palette["accent"])), 255),
        spacing=copy.get("spacing", -3),
        bold=True,
        weight=copy.get("accent_weight", copy.get("weight")),
    )
    draw_text(
        canvas,
        (copy["x"] + copy.get("support_indent", 2), copy["support_top"]),
        copy["support"],
        copy.get("support_size", 25),
        (255, 255, 255, 230),
        spacing=copy.get("support_spacing", 7),
    )

    rendered_features: list[tuple[dict[str, Any], Image.Image, float]] = []
    for item in feature["features"]:
        angle = item.get("angle", 0)
        card = rotated_phone_frame(
            asset_root / item["screenshot"],
            width=item["width"],
            crop_top=item.get("crop_top", 0),
            angle=angle,
            crop_height=item.get("crop_height"),
            radius=item.get("radius", 34),
            bezel=item.get("bezel", 7),
        )
        rendered_features.append((item, card, angle))

    for item, card, _angle in rendered_features:
        paste_with_shadow(
            canvas,
            card,
            (item["x"], item["top"]),
            blur=item.get("shadow_blur", 22),
            offset_y=item.get("shadow_offset_y", 16),
        )

    labels = feature.get("labels")
    if labels:
        fan_left = min(item["x"] for item, _card, _angle in rendered_features)
        fan_right = max(item["x"] + card.width for item, card, _angle in rendered_features)
        labels_copy = labels.get("separator", " • ").join(
            item["label"] for item, _card, _angle in rendered_features
        )
        draw_centered_text(
            canvas,
            labels.get("center_x", round((fan_left + fan_right) / 2)),
            labels.get("top", 34),
            labels_copy,
            labels.get("size", 21),
            (*color(labels.get("color", palette["accent"])), 255),
            bold=labels.get("bold", True),
        )

    footer = feature.get("footer")
    if footer:
        mark_size = footer.get("mark_size", 58)
        copy_size = footer.get("copy_size", 18)
        copy_spacing = footer.get("copy_spacing", 4)
        copy_bold = footer.get("copy_bold", False)
        copy_gap = footer.get("copy_gap", 18)
        chip_top = footer.get("chip_top", footer["top"] + 10)
        chip_height = footer.get("chip_height", 42)
        chip_x = footer.get("chips_x")
        chip_gap = footer.get("chip_gap", 0)
        chips = footer.get("chips", [])
        copy_bounds = ImageDraw.Draw(canvas).multiline_textbbox(
            (0, 0),
            footer["copy"],
            font=font(copy_size, bold=copy_bold),
            spacing=copy_spacing,
        )
        copy_width = copy_bounds[2] - copy_bounds[0]
        platform_width = mark_size + copy_gap + copy_width
        platform_x = footer["x"]

        if footer.get("layout") == "space-between" and chips:
            content_width = platform_width + sum(chip["width"] for chip in chips)
            available_width = footer["right"] - footer["x"]
            chip_gap = (available_width - content_width) / len(chips)
            chip_x = platform_x + platform_width + chip_gap
        elif footer.get("layout") == "split" and chips:
            chip_gap = footer.get("chip_gap", 24)
            chips_width = sum(chip["width"] for chip in chips)
            chips_width += chip_gap * (len(chips) - 1)
            chip_x = footer["right"] - chips_width
        elif footer.get("layout") == "centered" and chips:
            chip_gap = footer.get("chip_gap", 24)
            group_gap = footer.get("group_gap", 32)
            chips_width = sum(chip["width"] for chip in chips)
            chips_width += chip_gap * (len(chips) - 1)
            content_width = platform_width + group_gap + chips_width
            platform_x = round(footer.get("center_x", width / 2) - content_width / 2)
            chip_x = platform_x + platform_width + group_gap

        divider_top = footer.get("divider_top")
        if divider_top is not None:
            divider = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            ImageDraw.Draw(divider).line(
                (footer["x"], divider_top, footer["right"], divider_top),
                fill=(*accent, footer.get("divider_alpha", 90)),
                width=footer.get("divider_width", 1),
            )
            canvas.alpha_composite(divider)
        draw_platform_mark(canvas, (platform_x, footer["top"]), mark_size, palette)
        copy_position = (
            platform_x + mark_size + copy_gap,
            footer["top"] + footer.get("copy_top", 8),
        )
        copy_accent = footer.get("copy_accent")
        if copy_accent:
            draw_highlighted_multiline_text(
                canvas,
                copy_position,
                footer["copy"],
                copy_size,
                (255, 255, 255, 232),
                copy_accent,
                (*color(footer.get("copy_accent_color", palette["accent"])), 255),
                spacing=copy_spacing,
                bold=copy_bold,
            )
        else:
            draw_text(
                canvas,
                copy_position,
                footer["copy"],
                copy_size,
                (255, 255, 255, 232),
                spacing=copy_spacing,
                bold=copy_bold,
            )
        for chip in chips:
            positioned_chip = {**chip, "x": round(chip_x)} if chip_x is not None else chip
            draw_language_chip(canvas, positioned_chip, accent, chip_top, chip_height)
            if chip_x is not None:
                chip_x += chip["width"] + chip_gap

    filename = feature.get("filename", "feature-cover.jpg")
    destination = output_dir / filename
    canvas.convert("RGB").save(destination, quality=95, subsampling=0, optimize=True)
    preview_width = feature.get("preview_width", width // 2)
    preview_height = round(height * preview_width / width)
    preview = canvas.convert("RGB").resize((preview_width, preview_height), Image.Resampling.LANCZOS)
    preview.save(output_dir / f"{Path(filename).stem}-preview.jpg", quality=87, optimize=True)
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

    if platform_config.get("render_slides", True):
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

    feature_image = platform_config.get("feature_image")
    if feature_image:
        paths.append(render_feature_image(feature_image, output_dir, asset_root, config))

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
