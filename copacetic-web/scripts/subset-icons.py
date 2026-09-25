"""Cut the Tabler Icons 2.47.0 webfont down to the icons the site uses.

Reads every ti-* class from dist/ (run `npm run build` first; this needs the
full-font build), then writes public/fonts/tabler-icons.woff2 and
public/fonts/tabler-icons.min.css. Needs: pip install fonttools brotli
Run again whenever a page starts using a new icon (the build tells you).

Note: on Linux, FreeType auto-hints this unhinted font using the whole glyph
set, so the subset can snap some icons by up to 1px there. macOS, Windows and
iOS render it identically; the 778 KB -> 10 KB saving is worth that.
"""
import re, pathlib
from fontTools import subset

root = pathlib.Path(__file__).resolve().parent.parent
vendor = root / 'vendor/tabler-icons-2.47.0'
css = (vendor / 'tabler-icons.min.css').read_text()
used = set()
for f in list((root / 'dist').rglob('*.html')) + list((root / 'dist').rglob('*.js')):
    used |= set(re.findall(r'\bti-([a-z0-9-]+)', f.read_text()))
used.discard('icons')
# Footer social icons, shown once their URLs are set in site.config.mjs.
used |= {'brand-linkedin', 'brand-google'}
rules = dict(re.findall(r'\.ti-([a-z0-9-]+):before\{content:"\\([0-9a-f]+)"\}', css))
missing = sorted(used - rules.keys())
if missing:
    raise SystemExit(f'not in Tabler 2.47.0: {missing}')
codepoints = sorted(int(rules[n], 16) for n in used)

opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = []; opts.name_IDs = ['*']
font = subset.load_font(str(vendor / 'tabler-icons.woff2'), opts)
s = subset.Subsetter(opts); s.populate(unicodes=codepoints); s.subset(font)
out = root / 'public/fonts'
subset.save_font(font, str(out / 'tabler-icons.woff2'), opts)

head = css[:css.index('.ti-')]  # banner, @font-face and the base .ti rule
body = ''.join(f'.ti-{n}:before{{content:"\\{rules[n]}"}}' for n in sorted(used))
(out / 'tabler-icons.min.css').write_text(head + body + '\n')
print(f'{len(used)} icons, {(out / "tabler-icons.woff2").stat().st_size} bytes')
