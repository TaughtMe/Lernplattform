"""Erzeugt alle Lernraum-Logovarianten (SVG) aus der Symbol-Geometrie.

Aufruf: python3 build_brand.py <ausgabeordner> [pfad/zu/fredoka-latin-wght-normal.woff2]
Benötigt: pip install fonttools brotli
"""
import math, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

FONT = sys.argv[2] if len(sys.argv) > 2 else "node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2"
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

DARK, GOLD, CORAL, GREEN, CREAM = "#211f1b", "#e0a526", "#d9654a", "#4f9a7e", "#f7f4ee"

def f(n):
    s = f"{n:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s

# ---------- Wortmarke aus Fredoka (SemiBold) als Pfade ----------
font = TTFont(FONT)
font = instancer.instantiateVariableFont(font, {"wght": 600})
gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font["head"].unitsPerEm
def word_path(text, cap_h, tracking=0.012):
    # skaliert so, dass die Großbuchstaben-Höhe (L) = cap_h ist
    bp = BoundsPen(gs); gs[cmap[ord("L")]].draw(bp)
    s = cap_h / (bp.bounds[3] - bp.bounds[1]); x = 0; parts = []
    for ch in text:
        g = gs[cmap[ord(ch)]]
        sp = SVGPathPen(gs, ntos=f)
        g.draw(TransformPen(sp, (s, 0, 0, -s, x, 0)))
        parts.append(sp.getCommands())
        x += g.width * s + tracking * upm * s
    return " ".join(p for p in parts if p), x - tracking * upm * s

# ---------- Symbol ----------
ROT, CX, CY = -8, 102, 48
def rot(x, y):
    a = math.radians(ROT); dx, dy = x - CX, y - CY
    return CX + dx * math.cos(a) - dy * math.sin(a), CY + dx * math.sin(a) + dy * math.cos(a)
def P(x, y): X, Y = rot(x, y); return f"{f(X)} {f(Y)}"

def bubble(dots=True, tail=True):
    d = (f"M{P(88,22)}L{P(108,22)}A18 18 0 0 1 {P(126,40)}L{P(126,56)}A18 18 0 0 1 {P(108,74)}"
         f"L{P(101.23,74)}L{P(86,92)}L{P(83.23,74)}L{P(88,74)}A18 18 0 0 1 {P(70,56)}L{P(70,40)}A18 18 0 0 1 {P(88,22)}Z")
    if dots:
        for cx in (84, 98, 112):
            x, y = rot(cx, 48)
            d += f"M{f(x-4.5)} {f(y)}A4.5 4.5 0 1 0 {f(x+4.5)} {f(y)}A4.5 4.5 0 1 0 {f(x-4.5)} {f(y)}Z"
    return d

STONES = dict(
    square="M80 102H112A10 10 0 0 1 122 112V144A10 10 0 0 1 112 154H80A10 10 0 0 1 70 144V112A10 10 0 0 1 80 102Z",
    quarter="M70 174A8 8 0 0 1 78 166H114A8 8 0 0 1 122 174V218H96A26 26 0 0 1 70 192Z",
    arch="M134 218V192A26 26 0 0 1 186 192V218Z",
)
def symbol_body(c_bub=DARK, c=(GOLD, CORAL, GREEN), dots=True):
    return (f'<path fill="{c_bub}" fill-rule="evenodd" d="{bubble(dots)}"/>'
            f'<path fill="{c[0]}" d="{STONES["square"]}"/>'
            f'<path fill="{c[1]}" d="{STONES["quarter"]}"/>'
            f'<path fill="{c[2]}" d="{STONES["arch"]}"/>')

def svg(vb, body, title, extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{extra}>\n  <title>{title}</title>\n  {body}\n</svg>\n')
def w(name, content):
    open(os.path.join(OUT, name), "w").write(content)


import re as _re
def shift_path(d, dx, dy):
    out = []
    for cmd, args in _re.findall(r"([MLHVAZ])([^MLHVAZ]*)", d):
        n = [float(v) for v in _re.findall(r"-?\d*\.?\d+", args)]
        if cmd in "ML": n = [n[0]+dx, n[1]+dy]
        elif cmd == "H": n = [n[0]+dx]
        elif cmd == "V": n = [n[0]+dy]
        elif cmd == "A":
            n = n[:5] + [n[5]+dx, n[6]+dy]
        out.append(cmd + " ".join(f(v) if i not in (3,4) or cmd!="A" else str(int(v)) for i, v in enumerate(n)))
    return "".join(out)

def shapes(dots=True, dx=0, dy=0):
    return [("bub", shift_path(bubble(dots), dx, dy)),
            ("sq", shift_path(STONES["square"], dx, dy)),
            ("qu", shift_path(STONES["quarter"], dx, dy)),
            ("ar", shift_path(STONES["arch"], dx, dy))]
def colored(shs, cols):
    EO = ' fill-rule="evenodd"'
    return "".join('<path fill="%s"%s d="%s"/>' % (cols[k], EO if k == "bub" else "", d) for k, d in shs)

FULL = dict(bub=DARK, sq=GOLD, qu=CORAL, ar=GREEN)
REV  = dict(bub=CREAM, sq=GOLD, qu=CORAL, ar=GREEN)
# Bounding Box (Näherung über Endpunkte + Kreisbögen-Sicherheitsrand)
BX0, BX1, BY0, BY1 = 69.02, 186, 21.24, 218
CXc, CYc = (BX0+BX1)/2, (BY0+BY1)/2

def sym_svg(cols, dots=True, title="Lernraum Symbol", bg=None):
    shs = shapes(dots, 128-CXc, 128-CYc)
    b = (f'<rect width="256" height="256" fill="{bg}"/>' if bg else "") + colored(shs, cols)
    return svg("0 0 256 256", b, title)

def mono(color, dots=True):
    return dict(bub=color, sq=color, qu=color, ar=color)

# Symbol-Varianten
w("symbol.svg", sym_svg(FULL))
w("symbol-reversed.svg", sym_svg(REV, title="Lernraum Symbol, für dunklen Grund"))
w("symbol-black.svg", sym_svg(mono("#000000"), title="Lernraum Symbol, schwarz"))
w("symbol-white.svg", sym_svg(mono("#ffffff"), title="Lernraum Symbol, weiß"))
# Kleinvariante: ohne Punkte, eng beschnitten
def small(cols, title="Lernraum Symbol, klein"):
    pad = 4
    shs = shapes(False, -BX0 + pad, -BY0 + pad)
    return svg(f"0 0 {f(BX1-BX0+2*pad)} {f(BY1-BY0+2*pad)}", colored(shs, cols), title)
w("symbol-small.svg", small(FULL))
w("symbol-small-reversed.svg", small(REV))

# Wortmarke
CAP = 104
path, wd = word_path("Lernraum", CAP)
def word_svg(color, title="Lernraum"):
    return svg(f"-2 -2 {f(wd+4)} {f(CAP+4)}", f'<path fill="{color}" transform="translate(0 {CAP})" d="{path}"/>', title)
w("wordmark.svg", word_svg(DARK)); w("wordmark-reversed.svg", word_svg(CREAM))
w("wordmark-black.svg", word_svg("#000000")); w("wordmark-white.svg", word_svg("#ffffff"))

# Lockups
def horizontal(cols, wcol, title):
    sw = BX1-BX0; sh = BY1-BY0; gap = 44
    shs = shapes(True, -BX0, -BY0)
    wy = sh  # Grundlinie = Unterkante der Steine
    body = colored(shs, cols) + f'<path fill="{wcol}" transform="translate({f(sw+gap)} {f(wy)})" d="{path}"/>'
    return svg(f"0 0 {f(sw+gap+wd)} {f(sh)}", body, title)
def stacked(cols, wcol, title):
    sw = BX1-BX0; sh = BY1-BY0; gap = 56; cap = 74
    p2, w2 = word_path("Lernraum", cap)
    W = max(sw, w2)
    shs = shapes(True, -BX0 + (W-sw)/2, -BY0)
    body = colored(shs, cols) + f'<path fill="{wcol}" transform="translate({f((W-w2)/2)} {f(sh+gap+cap)})" d="{p2}"/>'
    return svg(f"0 0 {f(W)} {f(sh+gap+cap)}", body, title)
w("logo-horizontal.svg", horizontal(FULL, DARK, "Lernraum"))
w("logo-horizontal-reversed.svg", horizontal(REV, CREAM, "Lernraum"))
w("logo-horizontal-black.svg", horizontal(mono("#000"), "#000", "Lernraum"))
w("logo-horizontal-white.svg", horizontal(mono("#fff"), "#fff", "Lernraum"))
w("logo-stacked.svg", stacked(FULL, DARK, "Lernraum"))
w("logo-stacked-reversed.svg", stacked(REV, CREAM, "Lernraum"))
w("logo-stacked-black.svg", stacked(mono("#000"), "#000", "Lernraum"))
w("logo-stacked-white.svg", stacked(mono("#fff"), "#fff", "Lernraum"))

# Icons: dunkle Kachel, Symbol ohne Punkte, Blase hell
def tile(size, rx, scale, title, dots=False):
    sw = (BX1-BX0)*scale; sh = (BY1-BY0)*scale
    shs = shapes(dots, -BX0, -BY0)
    inner = colored(shs, REV)
    tx, ty = (size-sw)/2 + size*0.02, (size-sh)/2
    body = (f'<rect width="{size}" height="{size}" rx="{rx}" fill="{DARK}"/>' if rx is not None else f'<rect width="{size}" height="{size}" fill="{DARK}"/>')
    body += f'<g transform="translate({f(tx)} {f(ty)}) scale({f(scale)})">{inner}</g>'
    return svg(f"0 0 {size} {size}", body, title)
w("app-icon.svg", tile(512, 112, 1.8, "Lernraum App-Icon"))
w("favicon.svg", tile(64, 14, 0.26, "Lernraum"))
w("icon-maskable.svg", tile(512, None, 1.45, "Lernraum App-Icon maskable"))
w("apple-touch-icon.svg", tile(180, None, 0.70, "Lernraum"))
print("ok")
