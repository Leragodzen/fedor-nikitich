"""Векторизация кабанчика с letterpress-макета.

Логотип приходил только картинкой: чёрная краска, вдавленная в кремовую
бумагу. Здесь она бинаризуется, контуры обводятся по границам пикселей,
упрощаются и сглаживаются в кубические кривые — на выходе чистый SVG.
"""
import math
import pathlib

from PIL import Image, ImageFilter

SRC = pathlib.Path("/Users/valeria/Desktop/федор-никитич/фото/логотип/логотип-основной.png")
OUT = pathlib.Path("/private/tmp/claude-501/-Users-valeria-Desktop------------/bab640b4-7354-4545-8af1-ac5a52581e73/scratchpad")

SCALE = 5          # апскейл перед обводкой — контуры получаются глаже
THRESHOLD = 118    # краска заметно темнее бумаги
MIN_AREA = 60      # мельче — это зерно бумаги
EPSILON = 1.6      # упрощение контура, в пикселях увеличенного изображения


def load_pig():
    im = Image.open(SRC).convert("L")
    w, h = im.size
    # кабанчик найден заранее: полоса 0.28–0.72 по ширине, 0.10–0.44 по высоте,
    # внутри неё компонента с bbox x220-486 y118-294
    ox, oy = int(w * 0.28), int(h * 0.10)
    box = (ox + 220 - 14, oy + 118 - 14, ox + 486 + 15, oy + 294 + 15)
    pig = im.crop(box)
    pig = pig.resize((pig.width * SCALE, pig.height * SCALE), Image.LANCZOS)
    # лёгкое размытие сглаживает пиксельную лесенку до обводки
    return pig.filter(ImageFilter.GaussianBlur(SCALE * 0.55))


def binarize(img):
    px = img.load()
    W, H = img.size
    grid = [[px[x, y] < THRESHOLD for y in range(H)] for x in range(W)]
    # выкидываем мелкий мусор от текстуры бумаги
    seen = [[False] * H for _ in range(W)]
    for sx in range(W):
        for sy in range(H):
            if seen[sx][sy] or not grid[sx][sy]:
                continue
            stack, pts = [(sx, sy)], []
            seen[sx][sy] = True
            while stack:
                x, y = stack.pop()
                pts.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and not seen[nx][ny] and grid[nx][ny]:
                        seen[nx][ny] = True
                        stack.append((nx, ny))
            if len(pts) < MIN_AREA:
                for x, y in pts:
                    grid[x][y] = False
    return grid, W, H


def contours(grid, W, H):
    """Границы между краской и бумагой, собранные в замкнутые петли."""
    edges = {}

    def add(a, b):
        edges.setdefault(a, []).append(b)
        edges.setdefault(b, []).append(a)

    for x in range(W):
        for y in range(H):
            if not grid[x][y]:
                continue
            if y == 0 or not grid[x][y - 1]:
                add((x, y), (x + 1, y))
            if y == H - 1 or not grid[x][y + 1]:
                add((x, y + 1), (x + 1, y + 1))
            if x == 0 or not grid[x - 1][y]:
                add((x, y), (x, y + 1))
            if x == W - 1 or not grid[x + 1][y]:
                add((x + 1, y), (x + 1, y + 1))

    used = set()
    loops = []
    for start in list(edges):
        for first in edges[start]:
            key = frozenset((start, first))
            if key in used:
                continue
            loop = [start]
            prev, cur = start, first
            used.add(key)
            while cur != start:
                loop.append(cur)
                nxt = None
                for cand in edges.get(cur, []):
                    k = frozenset((cur, cand))
                    if cand != prev and k not in used:
                        nxt = cand
                        break
                if nxt is None:
                    break
                used.add(frozenset((cur, nxt)))
                prev, cur = cur, nxt
            if len(loop) > 12:
                loops.append(loop)
    return loops


def area(poly):
    s = 0.0
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % len(poly)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def simplify(poly, eps):
    """Дуглас–Пекер по замкнутому контуру."""
    def rdp(pts):
        if len(pts) < 3:
            return pts
        x1, y1 = pts[0]
        x2, y2 = pts[-1]
        dmax, idx = 0.0, 0
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy) or 1e-9
        for i in range(1, len(pts) - 1):
            px_, py_ = pts[i]
            d = abs(dy * px_ - dx * py_ + x2 * y1 - y2 * x1) / norm
            if d > dmax:
                dmax, idx = d, i
        if dmax > eps:
            return rdp(pts[:idx + 1])[:-1] + rdp(pts[idx:])
        return [pts[0], pts[-1]]

    n = len(poly)
    half = n // 2
    a = rdp(poly[:half + 1])
    b = rdp(poly[half:] + [poly[0]])
    out = a[:-1] + b[:-1]
    return out


def to_bezier(poly, tension=0.22):
    """Замкнутый полигон → кубические кривые (Catmull–Rom)."""
    n = len(poly)
    if n < 3:
        return ""
    d = ["M%.1f %.1f" % poly[0]]
    for i in range(n):
        p0 = poly[(i - 1) % n]
        p1 = poly[i]
        p2 = poly[(i + 1) % n]
        p3 = poly[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) * tension, p1[1] + (p2[1] - p0[1]) * tension)
        c2 = (p2[0] - (p3[0] - p1[0]) * tension, p2[1] - (p3[1] - p1[1]) * tension)
        d.append("C%.1f %.1f %.1f %.1f %.1f %.1f" % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]))
    return " ".join(d) + "Z"


def main():
    img = load_pig()
    grid, W, H = binarize(img)
    loops = contours(grid, W, H)
    loops = [l for l in loops if area(l) > 120]
    loops.sort(key=area, reverse=True)
    print("контуров найдено:", len(loops))

    xs = [p[0] for l in loops for p in l]
    ys = [p[1] for l in loops for p in l]
    minx, miny, maxx, maxy = min(xs), min(ys), max(xs), max(ys)
    w, h = maxx - minx, maxy - miny
    k = 240.0 / w                       # приводим к удобной ширине viewBox

    paths = []
    for loop in loops:
        s = simplify(loop, EPSILON)
        s = [((x - minx) * k, (y - miny) * k) for x, y in s]
        if len(s) >= 3:
            paths.append(to_bezier(s))
        print(f"  контур: точек {len(loop):5} → {len(s):3}, площадь {area(loop):9.0f}")

    vb_w, vb_h = round(w * k, 1), round(h * k, 1)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w} {vb_h}">'
        f'<path fill="currentColor" fill-rule="evenodd" d="{" ".join(paths)}"/></svg>'
    )
    (OUT / "pig-traced.svg").write_text(svg)
    print("viewBox:", vb_w, vb_h, "| размер svg:", len(svg), "символов")


main()
