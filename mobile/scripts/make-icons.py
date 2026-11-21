# Draws the MontrealHub app icons from the website's own app icon (public/icons/ppp-512.png, the same art the
# current store listing uses), so the native app keeps the icon people already know.
# Run from mobile/: python3 scripts/make-icons.py  (needs Pillow and npm install for the Anton font). Output in assets/.
from PIL import Image, ImageDraw, ImageFont
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ART = Image.open(os.path.join(ROOT, '..', 'public', 'icons', 'ppp-512.png')).convert('RGBA')
FONT = os.path.join(ROOT, 'node_modules/@expo-google-fonts/anton/400Regular/Anton_400Regular.ttf')
S = 1024

def out(name, img):
    img.save(os.path.join(ROOT, 'assets', name))

full = ART.resize((S, S), Image.LANCZOS)
out('icon.png', full.convert('RGB'))
# Android adaptive icon: the art full-bleed as the background layer (the launcher crops it), empty foreground.
out('adaptive-background.png', full.convert('RGB'))
out('adaptive-foreground.png', Image.new('RGBA', (S, S), (0, 0, 0, 0)))
# Android 13 themed icon: "PPP" in one colour inside the safe zone.
mono = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(mono)
font = ImageFont.truetype(FONT, int(S * 0.26))
box = d.textbbox((0, 0), 'PPP', font=font)
d.text(((S - (box[2] - box[0])) / 2 - box[0], (S - (box[3] - box[1])) / 2 - box[1]), 'PPP', font=font, fill=(255, 255, 255, 255))
out('adaptive-monochrome.png', mono)
# Splash: the icon as a rounded tile on the site's black.
splash = Image.new('RGBA', (S, S), (0, 0, 0, 0))
mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
splash.paste(full, (0, 0), mask)
out('splash-icon.png', splash)
out('favicon.png', full.convert('RGB').resize((48, 48), Image.LANCZOS))
print('ok')
