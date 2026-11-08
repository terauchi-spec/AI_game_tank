"""Compile 32x32 collision silhouettes from the deployed WebP alpha channels.

Run from the repository root after replacing a jungle sprite. This only reads
images; it writes JS collision data and does not modify the image assets.
"""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
masks = {}
for path in sorted((root / 'assets/jungle').glob('*.webp')):
    image = Image.open(path).convert('RGBA')
    width, height = image.size
    alpha = image.getchannel('A')
    rows = []
    for row in range(32):
        bits = 0
        for col in range(32):
            x0, x1 = col * width // 32, (col + 1) * width // 32
            y0, y1 = row * height // 32, (row + 1) * height // 32
            opaque = sum(alpha.getpixel((x, y)) >= 128
                         for y in range(y0, y1) for x in range(x0, x1))
            if opaque >= (x1 - x0) * (y1 - y0) * .45:
                bits |= 1 << col
        rows.append(bits)
    masks[path.stem] = rows
(root / 'js/jungle-hit-masks.js').write_text(
    '// Generated from deployed sprite alpha; see tests/helpers/build-jungle-hit-masks.py.\n'
    + 'const JUNGLE_HIT_MASKS=' + json.dumps(masks, separators=(',', ':')) + ';\n')
