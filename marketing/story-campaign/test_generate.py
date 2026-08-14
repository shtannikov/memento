from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("story_campaign_generate", ROOT / "generate.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Could not load the story campaign generator")
generate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generate)


class GithubFeatureImageTest(unittest.TestCase):
    def test_github_renders_only_social_preview(self) -> None:
        config = generate.load_config(ROOT / "campaigns" / "en.json")
        feature_image = config["platforms"]["github"]["feature_image"]
        features = feature_image["features"]

        self.assertIn("•", feature_image["labels"]["separator"])
        self.assertLessEqual(
            feature_image["footer"]["copy_size"],
            feature_image["labels"]["size"],
        )
        self.assertFalse(feature_image["footer"]["copy_bold"])
        self.assertEqual(feature_image["footer"]["layout"], "centered")
        self.assertEqual(feature_image["footer"]["copy_accent"], "30 minutes")
        self.assertGreaterEqual(feature_image["brand"]["logo_size"], 140)
        self.assertGreater(feature_image["footer"]["x"], 52)
        self.assertLess(feature_image["footer"]["right"], 1228)
        self.assertLess(feature_image["footer"]["divider_top"], feature_image["footer"]["top"])
        for left, right in zip(features, features[1:]):
            self.assertLess(right["x"], left["x"] + left["width"])

        logo = generate.supplied_logo(ROOT / "assets" / "logo.png", 120, "cutout")
        alpha = logo.getchannel("A")
        self.assertLess(alpha.getpixel((0, 0)), 10)
        self.assertGreater(alpha.getpixel((60, 60)), 240)

        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory)
            paths = generate.render_campaign(config, output, "github")

            self.assertEqual([path.name for path in paths], ["github-social-preview.jpg"])
            self.assertFalse((output / "01.jpg").exists())
            self.assertFalse((output / "contact-sheet.jpg").exists())
            with Image.open(paths[0]) as rendered:
                self.assertEqual(rendered.size, (1280, 640))
            with Image.open(output / "github-social-preview-preview.jpg") as preview:
                self.assertEqual(preview.size, (640, 320))


if __name__ == "__main__":
    unittest.main()
