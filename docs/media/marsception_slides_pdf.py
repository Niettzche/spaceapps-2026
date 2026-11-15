"""PDF fallback for runtimes where Artifact Tool's PDF font module is absent.

The editable source is marsception_slides.pptx. Run the .mjs builder first,
then: python docs/media/marsception_slides_pdf.py <workspace>/work/slides
"""
from pathlib import Path
import sys
import os
import shutil
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.utils import ImageReader

root = Path(__file__).resolve().parents[2]
workspace = Path(os.environ.get('SLIDES_WORKSPACE', str(root.parent)))
build = Path(sys.argv[1]) if len(sys.argv) > 1 else workspace / 'work/slides'
out = workspace / 'outputs/marsception_slides.pdf'
out.parent.mkdir(exist_ok=True)
pdf = Canvas(str(out), pagesize=(960, 540), pageCompression=1)
pdf.setTitle('MARSCEPTION - Earth analogs for the Moon and Mars')
pdf.setAuthor('MARSCEPTION team')
pdf.setSubject('Seven-slide English Space Apps submission. Original illustrative game art; source details in the editable presentation notes.')
for number in range(1, 8):
    pdf.drawImage(ImageReader(str(build / f'slide-{number}.png')), 0, 0, width=960, height=540)
    pdf.showPage()
pdf.save()
shutil.copyfile(out, root / 'docs/media/marsception_slides.pdf')
shutil.copyfile(out, root / 'web/public/media/marsception_slides.pdf')
print('PDF created: exactly seven pages; editable text remains in the PPTX source')
