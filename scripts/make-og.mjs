// Makes the link-preview cards in public/og/ (run by hand, not at deploy; the results are committed).
// A Sol date never changes, so one card per Sol date works for every year, for ever.
//   node scripts/make-og.mjs <folder containing @fontsource/gelasio and @fontsource/inter>
import { createRequire } from "node:module"
const { chromium } = createRequire(import.meta.url)("playwright") // pre-installed globally; not a site dependency
import { mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { IFC_MONTHS, WEEKDAYS } from "../src/engine.js"

const FONTS = resolve(process.argv[2] || "node_modules")
const OUT = "public/og"
mkdirSync(OUT, { recursive: true })

const font = (fam, file, w, s = "normal") =>
  `@font-face{font-family:${fam};src:url(data:font/woff2;base64,${readFileSync(join(FONTS, "@fontsource", fam.toLowerCase(), "files", file)).toString("base64")});font-weight:${w};font-style:${s}}`
const css = `
${font("Gelasio", "gelasio-latin-400-normal.woff2", 400)}${font("Gelasio", "gelasio-latin-700-normal.woff2", 700)}${font("Gelasio", "gelasio-latin-400-italic.woff2", 400, "italic")}
${font("Inter", "inter-latin-400-normal.woff2", 400)}${font("Inter", "inter-latin-600-normal.woff2", 600)}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#1A1A2E;color:#F4F1E8;font-family:Inter;position:relative;overflow:hidden}
.glow{position:absolute;right:-160px;top:-120px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(212,160,23,.30),rgba(212,160,23,0) 68%)}
.ring{position:absolute;right:90px;top:115px;width:400px;height:400px;border-radius:50%;border:3px solid #D4A017;display:flex;align-items:center;justify-content:center;flex-direction:column}
.ring .n{font-family:Gelasio;font-weight:700;font-size:150px;line-height:1;color:#D4A017}
.ring .m{font-family:Gelasio;font-size:40px;color:#F4F1E8;margin-top:8px}
.ring .s{font-family:Gelasio;font-weight:700;font-size:62px;line-height:1.1;color:#D4A017;text-align:center}
.l{position:absolute;left:80px;top:72px;width:600px}
.tag{font-weight:600;letter-spacing:.5em;color:#D4A017;font-size:24px}
.k{font-size:30px;color:#B8B5C8;margin-top:56px}
.h{font-family:Gelasio;font-weight:700;font-size:70px;line-height:1.08;margin-top:14px}
.h span{color:#D4A017}
.sub{font-family:Gelasio;font-style:italic;font-size:32px;color:#D9D6CC;margin-top:26px;line-height:1.3}
.f{position:absolute;left:80px;bottom:60px;font-size:28px;color:#B8B5C8}
.f b{color:#D4A017;font-weight:600}`

const html = inner => `<!doctype html><html><head><style>${css}</style></head><body><div class="glow"></div>${inner}</body></html>`

function card(key) {
  if (key === "default") return html(`
<div class="l"><div class="tag">SOL</div>
<div class="h" style="margin-top:44px">Your birthday,<br><span>the same weekday</span><br>every year.</div>
<div class="sub">13 months of 28 days. Time, fixed.</div></div>
<div class="ring"><div class="n">28</div><div class="m">× 13</div></div>
<div class="f">Find your True Birthday at <b>sol28.co.uk</b></div>`)
  if (key === "year-day" || key === "leap-day") {
    const name = key === "year-day" ? "Year Day" : "Leap Day"
    return html(`
<div class="l"><div class="tag">SOL</div>
<div class="k">My True Birthday is</div>
<div class="h"><span>${name}</span></div>
<div class="sub">${key === "year-day" ? "The one day each year that belongs<br>to no week and no month." : "The day that comes once every four years<br>and belongs to no week and no month."}</div></div>
<div class="ring"><div class="s">${name.replace(" ", "<br>")}</div></div>
<div class="f">What's yours? <b>sol28.co.uk</b></div>`)
  }
  const [m, d] = key.split(/-(?=\d+$)/)
  const mi = IFC_MONTHS.findIndex(x => x.toLowerCase() === m)
  const day = Number(d), wd = WEEKDAYS[(day - 1) % 7]
  return html(`
<div class="l"><div class="tag">SOL</div>
<div class="k">My True Birthday is</div>
<div class="h">${wd}<br><span>${day} ${IFC_MONTHS[mi]}</span></div>
<div class="sub">The same day of the week.<br>Every year. For life.</div></div>
<div class="ring"><div class="n">${day}</div><div class="m">${IFC_MONTHS[mi]}</div></div>
<div class="f">What's yours? <b>sol28.co.uk</b></div>`)
}

const keys = ["default", "year-day", "leap-day"]
for (const m of IFC_MONTHS) for (let d = 1; d <= 28; d++) keys.push(`${m.toLowerCase()}-${d}`)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const k of keys) {
  await page.setContent(card(k), { waitUntil: "load" })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: join(OUT, `${k}.jpg`), type: "jpeg", quality: 72 })
}
await browser.close()
console.log(`Wrote ${keys.length} cards to ${OUT}/`)
