#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
SIZES = [16, 32, 48, 128]

BG = (21, 23, 28, 255)
MOON = (122, 162, 255, 255)

def make(size):

    s = size * 8
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(s * 0.22)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=BG)

    moon = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    md = ImageDraw.Draw(moon)
    cx, cy, r = s * 0.46, s * 0.5, s * 0.30
    md.ellipse([cx - r, cy - r, cx + r, cy + r], fill=MOON)

    ox, oy, orr = s * 0.60, s * 0.42, s * 0.30
    cut = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cut)
    cd.ellipse([ox - orr, oy - orr, ox + orr, oy + orr], fill=(255, 255, 255, 255))

    r2, g2, b2, a2 = moon.split()
    cut_a = cut.split()[3]
    from PIL import ImageChops
    a2 = ImageChops.subtract(a2, cut_a)
    moon = Image.merge("RGBA", (r2, g2, b2, a2))

    img = Image.alpha_composite(img, moon)
    img = img.resize((size, size), Image.LANCZOS)
    path = os.path.join(OUT, f"icon-{size}.png")
    img.save(path)
    print("wrote", os.path.relpath(path))

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for sz in SIZES:
        make(sz)
