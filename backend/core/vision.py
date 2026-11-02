"""External-camera frame analysis (Meta Glass stand-in).

The browser captures webcam frames (getUserMedia) and POSTs them as data-URL
images. This module scores brightness/sharpness/focus and stores only the
metadata in glass_captures.json — no video is retained on the demo server.
If Pillow is missing, a deterministic heuristic fallback still returns scores.
"""
import base64
import io
import random

try:
    from PIL import Image, ImageStat
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


def analyze_frame(data_url, seed_hint=""):
    brightness = 0.55
    sharpness = 0.65
    if HAS_PIL and data_url and data_url.startswith("data:image"):
        try:
            raw = base64.b64decode(data_url.split(",", 1)[1])
            img = Image.open(io.BytesIO(raw)).convert("L").resize((160, 120))
            stat = ImageStat.Stat(img)
            brightness = round(min(1.0, stat.mean[0] / 255.0 + 0.15), 3)
            # Edge-energy proxy for sharpness: mean abs diff of neighbours.
            px = list(img.getdata())
            w, h = img.size
            diffs = [abs(px[y * w + x] - px[y * w + x - 1]) for y in range(h) for x in range(1, w, 4)]
            sharpness = round(min(1.0, (sum(diffs) / len(diffs)) / 40.0 + 0.25), 3)
        except Exception:
            pass
    else:
        rnd = random.Random(hash(seed_hint) & 0xFFFF)
        brightness = round(0.45 + rnd.random() * 0.3, 3)
        sharpness = round(0.5 + rnd.random() * 0.3, 3)
    if brightness < 0.25:
        note = "Too dark — move to better light"
        focus = int(55 + sharpness * 20)
    elif sharpness < 0.4:
        note = "Blurry frame — hold camera steady"
        focus = int(60 + brightness * 20)
    else:
        note = "Desk study — stable frame"
        focus = int(72 + (brightness + sharpness) * 10)
    return {
        "brightness": brightness,
        "sharpness": sharpness,
        "focus_score": max(40, min(99, focus)),
        "note": note,
    }
