// True Birthday certificate: node tools/certificate/make.mjs "Name" YYYY-MM-DD out.pdf [issued YYYY-MM-DD]
// Renders an A4 PDF with Playwright. Uses the same engine as sol28.co.uk.
import { toIFC, WEEKDAYS, MONTH_NAMES } from '../../src/engine.js'
import { createRequire } from 'module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { readFileSync } from 'fs'
const b64 = f => readFileSync(f).toString('base64')

const [name, iso, out = 'certificate.pdf', issuedIso] = process.argv.slice(2)
if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) { console.error('usage: make.mjs "Name" YYYY-MM-DD out.pdf'); process.exit(1) }
const [y, m, d] = iso.split('-').map(Number)
const born = new Date(y, m - 1, d, 12)
if (born.getMonth() !== m - 1) { console.error('not a real date'); process.exit(1) }
const ifc = toIFC(born)
const gWeekday = born.toLocaleDateString('en-GB', { weekday: 'long' })
const issued = issuedIso ? new Date(issuedIso + 'T12:00') : new Date()
const fmt = x => `${x.getDate()} ${MONTH_NAMES[x.getMonth()]} ${x.getFullYear()}`
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const F = '/usr/share/fonts/truetype/crosextra/', I = '/usr/share/fonts/opentype/inter/'
let main, line, grid = ''
if (ifc.special) {
  main = `<div class="big">${ifc.special}</div>`
  line = ifc.special === 'Year Day'
    ? 'Year Day is the last day of every Sol year. It belongs to no month and no week, so it has no weekday at all: a day that is yours alone.'
    : 'Leap Day comes once every four years, after 28 June. Like Year Day, it sits outside every month and every week.'
} else {
  main = `<div class="wd">${ifc.weekday}</div><div class="big">${ifc.day} ${ifc.month}</div>`
  line = `In Sol, the calendar of thirteen months of exactly 28 days, the ${ifc.day}${['th','st','nd','rd'][(ifc.day%10<4 && ![11,12,13].includes(ifc.day)) ? ifc.day%10 : 0]} of ${ifc.month} falls on a ${ifc.weekday} every year. This is your birthday's weekday for life.`
  let cells = WEEKDAYS.map(w => `<div class="h">${w[0]}</div>`).join('')
  for (let i = 1; i <= 28; i++) cells += `<div class="c${i === ifc.day ? ' on' : ''}">${i}</div>`
  grid = `<div class="grid-wrap"><div class="gm">${ifc.month}</div><div class="grid">${cells}</div></div>`
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Cal;src:url(data:font/ttf;base64,${b64(F+'Caladea-Regular.ttf')})}
@font-face{font-family:Cal;font-weight:700;src:url(data:font/ttf;base64,${b64(F+'Caladea-Bold.ttf')})}
@font-face{font-family:Cal;font-style:italic;src:url(data:font/ttf;base64,${b64(F+'Caladea-Italic.ttf')})}
@font-face{font-family:Int;src:url(data:font/otf;base64,${b64(I+'Inter-Medium.otf')})}
@font-face{font-family:Int;font-weight:700;src:url(data:font/otf;base64,${b64(I+'Inter-Bold.otf')})}
@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;width:210mm;height:297mm;background:#FBF7EC;color:#1A1A2E;font-family:Cal,serif}
.frame{position:absolute;inset:12mm;border:2.2mm solid #1A1A2E}
.inner{position:absolute;inset:16mm;border:0.6mm solid #D4A017;padding:16mm 14mm;text-align:center;display:flex;flex-direction:column;align-items:center}
.brand{font-family:Int;font-weight:700;letter-spacing:6mm;font-size:12pt;color:#B8890F;margin-left:6mm}
h1{font-weight:400;font-size:32pt;margin:10mm 0 0;letter-spacing:.5pt}
.rule{width:40mm;height:.6mm;background:#D4A017;margin:7mm auto}
.lead{font-family:Int;font-size:10.5pt;letter-spacing:2pt;text-transform:uppercase;color:#55556E}
.name{font-size:34pt;font-style:italic;margin:4mm 0 3mm;max-width:150mm;line-height:1.1}
.born{font-size:14pt;color:#33334A}
.wd{font-family:Int;font-weight:700;font-size:13pt;letter-spacing:3pt;text-transform:uppercase;color:#B8890F;margin-top:5mm}
.big{font-weight:700;font-size:44pt;margin:1mm 0 2mm}
.line{font-size:12.5pt;line-height:1.55;max-width:140mm;color:#33334A}
.grid-wrap{margin-top:12mm}
.gm{font-family:Int;font-weight:700;font-size:9pt;letter-spacing:2pt;text-transform:uppercase;margin-bottom:2.5mm}
.grid{display:grid;grid-template-columns:repeat(7,12mm);gap:1.6mm;justify-content:center;font-family:Int;font-size:10.5pt}
.h{color:#B8890F;font-weight:700}
.c{height:10mm;line-height:10mm;border:.3mm solid #D9D3C2;color:#55556E}
.c.on{background:#1A1A2E;color:#FBF7EC;border-color:#1A1A2E;font-weight:700}
.foot{margin-top:auto;font-family:Int;font-size:9pt;color:#55556E;letter-spacing:.5pt;line-height:1.7}
.foot b{color:#1A1A2E}
.tf{font-style:italic;font-size:15pt;color:#1A1A2E;margin-top:2mm;font-family:Cal}
</style></head><body><div class="frame"></div><div class="inner">
<div class="brand">SOL</div>
<h1>Certificate of True Birthday</h1>
<div class="rule"></div>
<div class="lead">This certifies that</div>
<div class="name">${esc(name)}</div>
<div class="born">born on ${gWeekday} ${fmt(born)}</div>
<div class="rule"></div>
<div class="lead">has a True Birthday of</div>
${main}
<div class="line">${line}</div>
${grid}
<div class="foot">Issued ${fmt(issued)} · <b>sol28.co.uk</b><div class="tf">Time, fixed.</div></div>
</div></body></html>`

const b = await chromium.launch()
const p = await b.newPage()
await p.setContent(html, { waitUntil: 'load' })
await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true })
await b.close()
console.log(out, ifc.special || `${ifc.weekday} ${ifc.day} ${ifc.month}`)
