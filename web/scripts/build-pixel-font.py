"""Convert the game's MIT pixelfx bitmap glyphs to a web TrueType font.

Optional source build: python -m pip install fonttools pillow
Then run this file from any directory. npm uses the committed TTF directly.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

root = Path(__file__).resolve().parents[2]
xml = ET.parse(root / 'assets/fuentes/pixel.xml').getroot()
atlas = Image.open(root / 'assets/fuentes/pixel.png').convert('RGBA')
common = xml.find('common').attrib
base = int(common['base'])
unit = 128
height = int(common['lineHeight'])
fb = FontBuilder(height * unit, isTTF=True)
glyphs = {'.notdef': TTGlyphPen(None).glyph()}
metrics = {'.notdef': (8 * unit, 0)}
cmap = {}
for node in xml.find('chars'):
    a = {k: int(v) for k, v in node.attrib.items()}
    name = 'uni%04X' % a['id']
    pen = TTGlyphPen(None)
    for row in range(a['height']):
        for col in range(a['width']):
            if atlas.getpixel((a['x'] + col, a['y'] + row))[3] < 128:
                continue
            x = (a['xoffset'] + col) * unit
            y = (base - a['yoffset'] - row) * unit
            pen.moveTo((x, y - unit)); pen.lineTo((x, y))
            pen.lineTo((x + unit, y)); pen.lineTo((x + unit, y - unit)); pen.closePath()
    glyphs[name] = pen.glyph()
    metrics[name] = (a['xadvance'] * unit, a['xoffset'] * unit)
    cmap[a['id']] = name
fb.setupGlyphOrder(list(glyphs))
fb.setupCharacterMap(cmap)
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=base * unit, descent=-(height - base) * unit)
fb.setupNameTable({
    'familyName': 'Marsception Pixel', 'styleName': 'Regular',
    'uniqueFontIdentifier': 'MarsceptionPixel-MIT-pixelfx-mini',
    'fullName': 'Marsception Pixel', 'psName': 'MarsceptionPixel',
    'version': 'Version 1.0',
    'licenseDescription': 'Derived from the game pixel bitmap atlas. pixelfx mini font, MIT License. Copyright 2026 Patch and Hugo Duprez.',
})
fb.setupOS2(sTypoAscender=base * unit, sTypoDescender=-(height-base)*unit, usWinAscent=height*unit, usWinDescent=4*unit)
fb.setupPost()
fb.setupMaxp()
target = root / 'web/src/assets/marsception-pixel.ttf'
fb.save(target)
print('Generated', target.name, 'with', len(cmap), 'glyphs')
