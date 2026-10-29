"""Draft KDP paperback cover: 6x9 trim, white paper, spine from page count, 0.125in bleed."""
import os, sys
from weasyprint import HTML
HERE = os.path.dirname(os.path.abspath(__file__))
pages = int(sys.argv[1]) if len(sys.argv) > 1 else 124
PAPER = 0.002252  # KDP white paper, inches per page
spine = round(pages * PAPER, 4)
B = 0.125
W = B + 6 + spine + 6 + B
H = 9 + 2 * B
fonts = open(os.path.join(HERE, 'book.css')).read().split(':root')[0]
months = [('September', 'septem', 'VII', 9), ('October', 'octo', 'VIII', 10), ('November', 'novem', 'IX', 11), ('December', 'decem', 'X', 12)]
rows = ''.join(f'<div class="m{" hot" if p == 10 else ""}"><span class="nm">{nm}</span><span class="lat">{lat} · {rn}</span><span class="pos">{p}th month</span></div>'
               for nm, lat, rn, p in months)
html = f'''<!doctype html><html><head><meta charset="utf-8"><style>{fonts}
@page{{size:{W}in {H}in;margin:0}}
:root{{--navy:#1A1A2E;--gold:#D4A017;--ivory:#F2EEE3;--muted:#9A98AE}}
body{{margin:0;width:{W}in;height:{H}in;background:var(--navy);color:var(--ivory);font-family:'EBG',serif;position:relative;overflow:hidden}}
.panel{{position:absolute;top:0;height:{H}in}}
.back{{left:0;width:{B + 6}in}}
.spine{{left:{B + 6}in;width:{spine}in;border-left:0.5pt solid rgba(212,160,23,.35);border-right:0.5pt solid rgba(212,160,23,.35)}}
.front{{left:{B + 6 + spine}in;width:{6 + B}in}}
/* front: safe area 0.25in inside trim */
.f-in{{position:absolute;left:0.55in;right:{B + 0.55}in;top:{B + 0.7}in;bottom:{B + 0.6}in}}
.kicker{{font-size:9.2pt;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}}
.title{{font-size:56pt;line-height:56pt;font-weight:600;margin-top:.35in;letter-spacing:.005em}}
.sub{{font-style:italic;font-size:15pt;color:var(--gold);margin-top:.22in;line-height:19pt}}
.months{{margin-top:.7in;border-top:0.6pt solid rgba(242,238,227,.25)}}
.m{{display:flex;align-items:baseline;border-bottom:0.6pt solid rgba(242,238,227,.25);padding:11pt 0;color:rgba(242,238,227,.45)}}
.m .nm{{font-size:19pt;width:2.3in}}.m .lat{{font-size:11pt;font-style:italic;width:1.35in}}.m .pos{{font-size:10pt;letter-spacing:.12em;text-transform:uppercase;margin-left:auto}}
.m.hot{{color:var(--ivory)}}.m.hot .lat{{color:var(--gold)}}
.author{{position:absolute;bottom:0;left:0;font-size:15pt;letter-spacing:.24em;text-transform:uppercase}}
.mark{{position:absolute;bottom:4pt;right:0;font-size:10pt;letter-spacing:.14em;color:var(--gold)}}
/* spine */
.s-txt{{position:absolute;left:50%;top:50%;width:8in;transform:translate(-50%,-50%) rotate(90deg);text-align:center;white-space:nowrap;font-size:{min(9, round(spine * 72 - 10, 1))}pt;letter-spacing:.18em;text-transform:uppercase}}
.s-txt b{{font-weight:600}}.s-txt span{{color:var(--gold);margin:0 .5em}}
/* back */
.b-in{{position:absolute;left:{B + 0.55}in;right:0.6in;top:{B + 0.75}in}}
.b-hook{{font-size:21pt;line-height:25pt;font-weight:600}}
.b-hook em{{color:var(--gold);font-style:normal}}
.b-p{{font-size:11.5pt;line-height:15.5pt;margin-top:12pt;color:rgba(242,238,227,.9)}}
.b-p.it{{font-style:italic;color:var(--gold)}}
.b-foot{{position:absolute;left:{B + 0.55}in;bottom:{B + 0.55}in;font-size:10pt;letter-spacing:.12em;color:var(--muted)}}
.b-foot b{{color:var(--ivory);font-weight:500}}
.barcode{{display:none}}
</style></head><body>
<div class="panel back"><div class="b-in">
<div class="b-hook">October means eight.<br><em>It is the tenth month.</em></div>
<p class="b-p">Britain deleted eleven days in 1752, and your tax year still starts on 6 April because of it. February is short because Romans thought even numbers unlucky. The Ethiopian calendar has thirteen months and runs seven or eight years behind ours.</p>
<p class="b-p">Stephen Rooney spent thirty-five years designing head-up displays for fighter aircraft, where every number on the glass had to be exactly right. Then he looked properly at the calendar.</p>
<p class="b-p"><i>Still Ruled by Rome</i> is the story of the calendar you live by: who built it, who tried to replace it, and why nobody did. From Caesar’s 445-day year to the Soviet week with no shared weekend, and the company that kept its books in thirteen equal periods for sixty-one years.</p>
<p class="b-p it">Every claim sourced. Every myth labelled.</p>
</div>
<div class="b-foot"><b>History</b> · Calendars · Ideas<br><br>sol28.co.uk · Time, fixed.</div>
<div class="barcode"></div>
</div>
<div class="panel spine"><div class="s-txt"><b>Still Ruled by Rome</b><span>·</span>Stephen Rooney</div></div>
<div class="panel front"><div class="f-in">
<div class="kicker">How an empire set the calendar you live by</div>
<div class="title">Still Ruled<br>by Rome</div>
<div class="months">{rows}</div>
<div class="sub">Four months have carried the wrong numbers for two thousand years.</div>
<div class="author">Stephen Rooney</div>
<div class="mark">SOL</div>
</div></div>
</body></html>'''
open(os.path.join(HERE, 'cover.html'), 'w').write(html)
HTML(string=html, base_url=HERE).write_pdf(os.path.join(HERE, 'Still_Ruled_by_Rome_cover_DRAFT.pdf'))
print(f'pages {pages} spine {spine}in full {W:.4f} x {H}in')
