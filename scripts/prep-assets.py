"""Derives web assets from brand/ and reference/. Run: python -I scripts/prep-assets.py
Source of truth: brand/LOGO WAVE PNG...png (RGBA, colortype 6, pure-black transparent region) ->
resized in PREMULTIPLIED space so black RGB under alpha=0 never bleeds into edges."""
from PIL import Image
import numpy as np, json
src = Image.open('brand/LOGO WAVE PNG...png').convert('RGBA')
a = np.array(src).astype(np.float64)
ys, xs = np.where(a[..., 3] > 8)
pad = 24
box = (max(xs.min()-pad,0), max(ys.min()-pad,0), min(xs.max()+pad,a.shape[1]-1), min(ys.max()+pad,a.shape[0]-1))
w, h = box[2]-box[0], box[3]-box[1]; s = max(w, h)
sq = np.zeros((s, s, 4)); ox, oy = (s-w)//2, (s-h)//2
sq[oy:oy+h, ox:ox+w] = a[box[1]:box[3], box[0]:box[2]]

def resize_premul(arr, n):
    al = arr[..., 3:4]/255.0
    pm = np.concatenate([arr[..., :3]*al, arr[..., 3:4]], axis=2).astype(np.float32)
    ch = [np.array(Image.fromarray(pm[..., i], 'F').resize((n, n), Image.LANCZOS)) for i in range(4)]
    pm = np.stack(ch, axis=2)
    al = np.clip(pm[..., 3:4], 0, 255)/255.0
    rgb = np.where(al > 1e-4, pm[..., :3]/np.maximum(al, 1e-4), 0)
    return np.clip(np.concatenate([rgb, al*255], axis=2), 0, 255).round().astype(np.uint8)

for n in (512, 192):
    Image.fromarray(resize_premul(sq, n), 'RGBA').save(f'src/assets/wave-logo-{n}.png', optimize=True)
# favicon: trace real 32x32 premultiplied pixel grid -> merged horizontal runs
g = resize_premul(sq, 32)
def hexc(p): return '#%02x%02x%02x' % tuple(int(v)//8*8 + 4 for v in p[:3])
rects = []
for y in range(32):
    x = 0
    while x < 32:
        p = g[y, x]
        if p[3] < 96: x += 1; continue
        c = hexc(p); x0 = x
        while x < 32 and g[y, x, 3] >= 96 and hexc(g[y, x]) == c: x += 1
        rects.append(f'<rect x="{x0}" y="{y}" width="{x-x0}" height="1" fill="{c}"/>')
open('src/assets/favicon.svg', 'w').write('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">' + ''.join(rects) + '</svg>')
print('favicon rects', len(rects))
# banner (reference/ art used as hero backdrop)
Image.open('reference/SAMPUL WAVE JPG.jpg.jpeg').convert('RGB').save('src/assets/banner.jpg', quality=84, optimize=True, progressive=True)
# sample red button for palette
o = np.array(Image.open('brand/LOGO WAVE PNG.png').convert('RGB'))
r = o[1100:1170, 610:690].reshape(-1, 3); m = r[(r[:, 0] > 200) & (r[:, 1] < 40)]
from collections import Counter
print('red', ['#%02x%02x%02x' % k for k, _ in Counter(map(tuple, m)).most_common(2)])
