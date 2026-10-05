"""Rebuild public/index.html from the dashboard source and nights.json.
Run from the repository root:  python3 src/build.py
"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(here, f), encoding='utf-8').read()
head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="robots" content="noindex"><style>body{margin:0}img{max-width:100%}</style></head><body>'
        '<title>Kozo Night Audit Report Dashboard</title>\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,650&family=Figtree:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">\n')
nights = json.loads(rd('nights.json'))
body = rd('body.html').replace('{{LOGO}}', rd('logo.datauri.txt').strip()) \
    .replace('{{DATA}}', json.dumps(nights, ensure_ascii=False).replace('</', '<\\/'))
foot = ('\n<p id="signin" style="text-align:center;margin:0 0 24px;color:#9AABBA;font:13px Figtree,system-ui,sans-serif">'
        '<span id="whoami"></span> <a href="/logout" style="color:#9AABBA">Sign out</a></p>'
        '<script>fetch("/me").then(r=>r.ok?r.json():null).then(j=>{if(j&&j.name)'
        'document.getElementById("whoami").textContent="Signed in as "+j.name+" ·"}).catch(()=>{})</script></body></html>')
out = os.path.join(here, '..', 'public', 'index.html')
open(out, 'w', encoding='utf-8').write(head + '<style>' + rd('style.css') + rd('extra.css') + '</style>\n' + body + foot)
print('Built public/index.html with', len(nights), 'nights')
