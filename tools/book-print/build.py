"""Build the 6x9 KDP print interior for Still Ruled by Rome from the Google Docs JSON."""
import json, re, html, os, sys
import segno

HERE = os.path.dirname(os.path.abspath(__file__))
FIGS = os.path.abspath(os.path.join(HERE, '..', 'book', 'figs', 'out'))
doc = json.load(open(os.path.join(HERE, 'doc.json')))['content']['tabs'][0]['documentTab']
body = doc['body']['content']
inl = doc['inlineObjects']

WORDS = {'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5, 'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10,
         'ELEVEN': 11, 'TWELVE': 12, 'THIRTEEN': 13, 'FOURTEEN': 14, 'FIFTEEN': 15, 'SIXTEEN': 16, 'SEVENTEEN': 17,
         'EIGHTEEN': 18, 'NINETEEN': 19}


def runs_html(p):
    out = []
    for e in p['elements']:
        if 'textRun' in e:
            t = e['textRun']['content'].replace('\n', '').replace('\u000b', ' ')
            if not t:
                continue
            s = e['textRun'].get('textStyle', {})
            h = html.escape(t)
            if s.get('italic'):
                h = f'<i>{h}</i>'
            if s.get('bold'):
                h = f'<b>{h}</b>'
            out.append(h)
    return ''.join(out)


def typog(h):
    # straight quotes -> curly (outside tags); apostrophes
    parts = re.split(r'(<[^>]+>)', h)
    res = []
    for part in parts:
        if part.startswith('<'):
            res.append(part)
            continue
        s = html.unescape(part)
        s = re.sub(r"(^|[\s(\[—–/])'", r"\1‘", s)
        s = s.replace("'", "’")
        s = re.sub(r'(^|[\s(\[—–/])"', r'\1“', s)
        s = s.replace('"', '”')
        res.append(html.escape(s, quote=False))
    return ''.join(res)


paras = []
for el in body:
    if 'paragraph' not in el:
        continue
    p = el['paragraph']
    ps = p['paragraphStyle']
    text = ''.join(e.get('textRun', {}).get('content', '') for e in p['elements']).strip()
    img = [e['inlineObjectElement']['inlineObjectId'] for e in p['elements'] if 'inlineObjectElement' in e]
    runs = [e['textRun'] for e in p['elements'] if 'textRun' in e and e['textRun']['content'].strip()]
    fs = {r.get('textStyle', {}).get('fontSize', {}).get('magnitude') for r in runs}
    allbold = bool(runs) and all(r.get('textStyle', {}).get('bold') for r in runs)
    paras.append(dict(text=text, html=typog(runs_html(p)), img=img, al=ps.get('alignment'),
                      ind=ps.get('indentStart', {}).get('magnitude'), fs=fs, bold=allbold))

start = next(i for i, x in enumerate(paras) if x['text'] == 'PREFACE')
P = paras[start:]

out = []          # body html
toc = []          # (kind, label, title, id)
sec = 0
i = 0
after_head = True
cur_kind = None
cur_label = ''


def qr_svg(url, ident):
    q = segno.make(url, error='m')
    path = os.path.join(HERE, 'qr', f'{ident}.svg')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    q.save(path, scale=4, border=0, dark='#000000')
    return f'qr/{ident}.svg'


while i < len(P):
    x = P[i]
    t = x['text']
    if not t and not x['img']:
        i += 1
        continue
    # PART divider
    m = re.match(r'PART (\w+) — (.+)', t)
    if m and x['bold']:
        sec += 1
        pid = f's{sec}'
        out.append(f'<section class="part" id="{pid}"><div class="part-label">Part {m.group(1).title()}</div>'
                   f'<div class="part-title">{typog(html.escape(m.group(2).title().replace(" And ", " and ")))}</div></section>')
        toc.append(('part', f'Part {m.group(1).title()}', m.group(2).title().replace(' And ', ' and '), pid))
        i += 1
        continue
    # Chapter-type opener: label (bold, centred, 10pt) then title then optional subtitle
    if x['al'] == 'CENTER' and x['bold'] and 10 in x['fs'] and t.isupper():
        label = t
        title = P[i + 1]['text']
        j = i + 2
        sub = ''
        if j < len(P) and P[j]['al'] == 'CENTER' and not P[j]['bold'] and (11 in P[j]['fs']) and P[j]['text']:
            sub = P[j]['html']
            j += 1
        sec += 1
        cid = f's{sec}'
        if label.startswith('CHAPTER '):
            n = WORDS[label.split()[1]]
            lab_disp = f'Chapter {n}'
            kind = 'chapter'
        elif label.startswith('INTERLUDE'):
            lab_disp = 'Interlude ' + label.split()[1]
            kind = 'interlude'
        elif label.startswith('APPENDIX'):
            lab_disp = 'Appendix ' + label.split()[1]
            kind = 'back'
        elif label == 'NOTES AND SOURCES':
            lab_disp = 'Notes and Sources'
            kind = 'back'
        else:
            lab_disp = label.title().replace("'S", "'s")
            kind = 'front' if label == 'PREFACE' else 'back'
        lab_disp = typog(html.escape(lab_disp))
        title_h = typog(html.escape(title))
        cur_kind = kind
        cls = 'opener notes-open' if label == 'NOTES AND SOURCES' else 'opener'
        run_title = title if label != 'NOTES AND SOURCES' else 'Notes and Sources'
        out.append(f'<section class="{cls}" id="{cid}" data-run="{html.escape(run_title)}">'
                   f'<div class="ch-label">{lab_disp}</div><h1 class="ch-title">{title_h}</h1>'
                   + (f'<div class="ch-sub">{sub}</div>' if sub else '') + '</section>')
        toc.append((kind, lab_disp, title if label != 'NOTES AND SOURCES' else '', cid))
        after_head = True
        i = j
        continue
    # Figure
    if x['img']:
        obj = inl[x['img'][0]]['inlineObjectProperties']['embeddedObject']['imageProperties']
        name = obj['sourceUri'].rsplit('/', 1)[1]
        cap = P[i + 1]['text'] if i + 1 < len(P) and P[i + 1]['text'].startswith('Figure ') else ''
        out.append(f'<figure><img src="{FIGS}/{name}" alt=""><figcaption>{html.escape(cap)}</figcaption></figure>')
        i += 2 if cap else 1
        continue
    # Sources line with QR
    m = re.match(r'Sources for this (chapter|section): (sol28\.co\.uk/notes/(\S+))', t)
    if m:
        url = 'https://' + m.group(2)
        svg = qr_svg(url, m.group(3))
        out.append(f'<div class="srcline"><img class="qr" src="{svg}" alt=""><div class="srctext">'
                   f'<span class="sc">Sources</span> for this {m.group(1)}, with live links:<br>'
                   f'<span class="url">{m.group(2)}</span></div></div>')
        i += 1
        continue
    # scene break
    if re.fullmatch(r'[·\s]+', t):
        out.append('<div class="scene">·  ·  ·</div>')
        after_head = True
        i += 1
        continue
    if t == 'END':
        out.append('<div class="end">End</div>')
        i += 1
        continue
    if t in ('Sol', 'Time, fixed.', 'sol28.co.uk') and i > len(P) - 4:
        i += 1
        continue  # colophon handled separately
    # pull line / epigraph-ish (centred 13pt)
    if x['al'] == 'CENTER' and 13 in x['fs']:
        out.append(f'<p class="pull">{x["html"]}</p>')
        after_head = True
        i += 1
        continue
    # notes section subheading (bold, indented 14, 11pt) and entries
    if x['ind'] == 14 and x['bold']:
        out.append(f'<h3 class="note-head">{x["html"]}</h3>')
        i += 1
        continue
    if x['ind'] == 14:
        out.append(f'<p class="note">{x["html"]}</p>')
        i += 1
        continue
    if x['al'] == 'CENTER' and x['bold'] and 20 in x['fs']:
        # notes title/glossary title handled; notes subtitle
        out.append(f'<p class="notes-sub">{x["html"]}</p>')
        i += 1
        continue
    if x['al'] == 'START' and 11 in x['fs'] and not x['bold']:
        out.append(f'<p class="notes-intro">{x["html"]}</p>')
        after_head = True
        i += 1
        continue
    # subheads
    if x['bold'] and len(t) < 60 and not t.endswith('.'):
        out.append(f'<h3>{x["html"]}</h3>')
        after_head = True
        i += 1
        continue
    if x['ind'] == 12:
        out.append(f'<p class="myth">{x["html"]}</p>')
        i += 1
        continue
    if x['html'].startswith('<b>'):
        out.append(f'<p class="entry">{x["html"]}</p>')
        after_head = False
        i += 1
        continue
    cls = ' class="first"' if after_head else ''
    out.append(f'<p{cls}>{x["html"]}</p>')
    after_head = False
    i += 1

# ---------- front matter ----------
P_COPY = next(p['html'] for p in paras if p['text'].startswith('Every factual claim'))
tocrows = []
for kind, lab, title, cid in toc:
    if kind == 'part':
        tocrows.append(f'<li class="toc-part">{lab}<span class="toc-pt">{typog(html.escape(title))}</span></li>')
    else:
        disp = f'<span class="toc-lab">{lab}</span> {typog(html.escape(title))}' if title else f'{lab}'
        if kind in ('front', 'back'):
            disp = f'{lab}' + (f': {typog(html.escape(title))}' if title and kind == 'back' and lab.startswith('Appendix') else '')
            if lab.startswith('Preface'):
                disp = f'Preface: {typog(html.escape(title))}'
            if lab.startswith('Author'):
                disp = 'Author’s Note'
        tocrows.append(f'<li class="toc-{kind}"><a href="#{cid}">{disp}</a></li>')

front = f'''
<section class="fm halftitle"><div class="ht">Still Ruled by Rome</div></section>
<section class="fm blank"></section>
<section class="fm titlepage">
  <div class="tp-title">Still Ruled<br>by Rome</div>
  <div class="tp-sub">How an Empire Set the Calendar You Live By</div>
  <div class="tp-rule"></div>
  <div class="tp-author">Stephen Rooney</div>
  <div class="tp-pub">Project Sol · Liverpool</div>
</section>
<section class="fm copyright">
  <p><b>Still Ruled by Rome</b><br>How an Empire Set the Calendar You Live By</p>
  <p>First edition, 2027<br>Published by Project Sol, Liverpool</p>
  <p>© 2027 Stephen Rooney. All rights reserved. No part of this book may be reproduced without the written permission of the author, except for brief quotations in reviews.</p>
  <p>{P_COPY}</p>
  <p>Interludes I, II and III are imagined scenes, built on documented history. They are marked as such where they appear.</p>
  <p>The figures in this book were drawn for it. Sources for every chapter are listed in the Notes and Sources section and kept up to date at sol28.co.uk/notes.</p>
  <p>sol28.co.uk</p>
</section>
<section class="fm contents"><h2>Contents</h2><ul class="toc">{"".join(tocrows)}</ul></section>
'''

colophon = '''<section class="colophon"><div class="col-sol">Sol</div><div class="col-tag">Time, fixed.</div><div class="col-url">sol28.co.uk</div></section>'''

css = open(os.path.join(HERE, 'book.css')).read()
from weasyprint import HTML
def page(htmlbody, cls=''):
    return f"""<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Still Ruled by Rome</title>
<style>{css}</style></head><body class="{cls}">{htmlbody}</body></html>"""
main = HTML(string=page('<div class="mainmatter">' + ''.join(out) + '</div>' + colophon), base_url=HERE).render()
pnum = {}
for k, pg in enumerate(main.pages, 1):
    for a in pg.anchors:
        pnum.setdefault(a, k)
front_html = front
for a, n in pnum.items():
    front_html = front_html.replace(f'href="#{a}">', f'href="#{a}" data-p="{n}">')
fr = HTML(string=page(front_html, 'frontdoc'), base_url=HERE).render()
pad = len(fr.pages) % 2
if pad:
    fr = HTML(string=page(front_html + '<section class="fm blank"></section>', 'frontdoc'), base_url=HERE).render()
fr.write_pdf(os.path.join(HERE, '_front.pdf'))
main.write_pdf(os.path.join(HERE, '_main.pdf'))
from pypdf import PdfWriter, PdfReader
w = PdfWriter()
for f in ('_front.pdf', '_main.pdf'):
    for p in PdfReader(os.path.join(HERE, f)).pages:
        w.add_page(p)
w.add_metadata({'/Title': 'Still Ruled by Rome', '/Author': 'Stephen Rooney'})
w.write(os.path.join(HERE, 'Still_Ruled_by_Rome_6x9_interior.pdf'))
open(os.path.join(HERE, 'book.html'), 'w').write(page(front_html) + page(''.join(out)))
print('front', len(fr.pages), 'main', len(main.pages), 'total', len(fr.pages) + len(main.pages))
