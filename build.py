#!/usr/bin/env python3
"""Build the public In Good Hands page (index.html) from the design files in src/.

The design canvas keeps the page as .dc.html files. This script:
  - lifts each file's <helmet> styles and font links into one <head>,
  - stores each file's markup in a <template> and its logic in a script block,
  - points every /_blob/<id> picture at images/<id>.<ext>,
  - adds the small runtime (runtime/dc-standalone.js + morphdom) that brings it to life,
  - sets the Formspree address that sign-ups and feedback are sent to.

Usage:  python3 build.py      (writes index.html next to this file)
"""
import os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
ENTRY = 'Main'
COMPONENTS = ['Main', 'Demo']
FORM_URL = 'https://formspree.io/f/xkjgbozd'
SITE_TITLE = 'In Good Hands — Clarity & Assurance for the Bereaved'
SITE_DESC = ('A website helping families in Singapore before, during and after a loss, '
             'with a real person to step in whenever you\'d like.')


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def parse(name):
    s = read(os.path.join(SRC, name + '.dc.html'))
    xdc = re.search(r'<x-dc>(.*)</x-dc>', s, re.S).group(1)
    helmet = re.search(r'<helmet>(.*?)</helmet>', xdc, re.S)
    head = helmet.group(1) if helmet else ''
    body = xdc[:helmet.start()] + xdc[helmet.end():] if helmet else xdc
    logic = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', s, re.S).group(1)
    links = re.findall(r'<link[^>]+>', head)
    styles = re.findall(r'<style>(.*?)</style>', head, re.S)
    return {'links': links, 'styles': styles, 'body': body.strip(), 'logic': logic}


def blob_map():
    """/_blob/<id> -> images/<file> for every picture saved in images/."""
    m = {}
    d = os.path.join(ROOT, 'images')
    if os.path.isdir(d):
        for fn in os.listdir(d):
            stem = fn.rsplit('.', 1)[0]
            m[stem] = 'images/' + fn
    return m


def main():
    parts = {n: parse(n) for n in COMPONENTS}
    blobs = blob_map()
    missing = set()

    def fix(text):
        def rep(mo):
            bid = mo.group(1)
            if bid in blobs:
                return blobs[bid]
            missing.add(bid)
            return mo.group(0)
        return re.sub(r'/_blob/([0-9a-f]{32})', rep, text)

    links, seen = [], set()
    for n in COMPONENTS:
        for l in parts[n]['links']:
            if l not in seen:
                seen.add(l); links.append(l)
    css = '\n'.join(fix(st) for n in COMPONENTS for st in parts[n]['styles'])
    templates = '\n'.join('<template data-dc="%s">\n%s\n</template>' % (n, fix(parts[n]['body'])) for n in COMPONENTS)
    logic = '\n'.join('<script type="text/x-dc-logic" data-dc="%s">%s</script>' % (n, parts[n]['logic']) for n in COMPONENTS)
    for n in COMPONENTS:
        if '</script' in parts[n]['logic'].lower():
            sys.exit('logic of %s contains </script>' % n)
    morph = read(os.path.join(ROOT, 'runtime', 'morphdom-umd.min.js'))
    runtime = read(os.path.join(ROOT, 'runtime', 'dc-standalone.js'))
    icon = blobs.get('40af16fc804e95b14913b9f18ed00442', '')
    og = blobs.get('6b2dcae06b386386c7a5b2d03693b12f', '')

    html = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
{og}{icon}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{links}
<style>
{css}
</style>
</head>
<body>
<!-- Built from the design files in src/ by build.py. Edit those, then run: python3 build.py -->
<div id="dc-root" data-entry="{entry}"></div>
<noscript><p style="padding:24px;color:#FFE6CC;font-family:sans-serif">In Good Hands needs JavaScript to show this page.</p></noscript>
{templates}
{logic}
<script>window.IGH_FORM_URL = {form!r};</script>
<script>{morph}</script>
<script>{runtime}</script>
</body>
</html>
'''.format(title=SITE_TITLE, desc=SITE_DESC.replace('"', '&quot;'),
           og=('<meta property="og:image" content="%s">\n' % og) if og else '',
           icon=('<link rel="icon" href="%s">\n' % icon) if icon else '',
           links='\n'.join(l for l in links if 'preconnect' not in l),
           css=css, entry=ENTRY, templates=templates, logic=logic,
           form=FORM_URL, morph=morph, runtime=runtime)
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('index.html written (%d KB)' % (len(html) // 1024))
    if missing:
        print('Pictures still missing from images/:', ', '.join(sorted(missing)))


if __name__ == '__main__':
    main()
