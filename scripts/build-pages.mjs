// Writes static, search-friendly pages into dist/ after the app is built:
//   /date/<day>-<month>  — 366 pages, one per Gregorian date
//   /month/<sol-month>   — 13 pages, one per Sol month
//   /dates, /months      — hub pages
//   /lost-days           — the seven times days vanished
//   sitemap.xml, robots.txt
// Every fact used here must have a Verified row in the Sol Claim Registry.

import { mkdirSync, writeFileSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { toEthiopian, ETH_MONTHS, toIFC } from "../src/engine.js"

const OUT = "dist"
const SITE = "https://sol28.co.uk"

// ── Engine (same rules as the app: Monday week start, Leap Day after June 28, Year Day at the end)
const SOL_MONTHS = ["January","February","March","April","May","June","Sol","July","August","September","October","November","December"]
const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
const G_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const isLeap = y => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)
const doyOf = (y, m, d) => Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 1)) / 86400000) + 1
function toSol(y, m, d) {
  const n = doyOf(y, m, d), leap = isLeap(y)
  if (n === (leap ? 366 : 365)) return { special: "Year Day" }
  if (leap && n === 169) return { special: "Leap Day" }
  const adj = leap && n > 169 ? n - 1 : n
  const mn = Math.ceil(adj / 28), md = ((adj - 1) % 28) + 1
  return { month: SOL_MONTHS[mn - 1], monthNum: mn, day: md, weekday: WEEKDAYS[(md - 1) % 7] }
}
const label = s => s.special ? s.special : `${s.weekday} ${s.day} ${s.month}`
// Key of the shareable card for a Sol date (public/og/<key>.jpg, /b/<key>)
const solKey = s => s.special ? s.special.toLowerCase().replace(" ", "-") : `${s.month.toLowerCase()}-${s.day}`
const ordinal = n => n + ((n % 100 > 10 && n % 100 < 14) ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"))
const slug = (d, m) => `${d}-${G_MONTHS[m].toLowerCase()}`
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const ORD_YEAR = 2027, LEAP_YEAR = 2028

// ── Verified facts tied to particular dates (Claim Registry / sourced 28 Oct 2026)
const DATE_FACTS = {
  "1-0": "Every Sol year begins on a Monday. The next time 1 January falls on a Monday in the ordinary calendar is 2029.",
  "5-3": "In 1753 the British tax year began on 5 April instead of 25 March, so that no tax was lost when 11 days were dropped from 1752.",
  "6-3": "The UK personal tax year starts on 6 April. It moved there in 1800, after the 1752 calendar change had first pushed it to 5 April.",
  "2-8": "On 2 September 1752 Britain went to bed on a Wednesday and woke on Thursday 14 September. Eleven dates never happened.",
  "14-8": "Thursday 14 September 1752 followed Wednesday 2 September in Britain, as the country switched to the Gregorian calendar.",
  "4-9": "Thursday 4 October 1582 was followed by Friday 15 October in Spain, Portugal, the Italian states and Poland–Lithuania.",
  "15-9": "Friday 15 October 1582 was the first day of the Gregorian calendar. The day before had been Thursday 4 October.",
  "31-0": "In Russia, 31 January 1918 was followed by 14 February, as the country moved to the Gregorian calendar.",
  "14-1": "Russia's first day on the Gregorian calendar was 14 February 1918. The day before was 31 January.",
  "15-1": "Greece was the last European country to switch: 15 February 1923 was followed by 1 March.",
  "17-1": "Sweden finally switched in 1753: 17 February was followed by 1 March.",
  "1-2": "1 March is a jumping-off date in calendar history: Greece reached it straight from 15 February in 1923, and Sweden from 17 February in 1753.",
  "29-1": "29 February exists only in leap years. In Sol, the extra day sits instead after 28 June as Leap Day, outside every week.",
  "17-5": "In a leap year, 17 June is Sol's Leap Day: it belongs to no week and no month.",
  "31-11": "31 December is Sol's Year Day: the one day each year that belongs to no week and no month.",
}

// ── Page shell
const css = `:root{--navy:#1A1A2E;--card:#22223A;--line:#34344F;--gold:#D4A017;--text:#D6D3C9;--white:#F2EEE3;--muted:#9A98AE}
*{box-sizing:border-box}body{margin:0;background:var(--navy);color:var(--text);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:640px;margin:0 auto;padding:24px 16px 48px}a{color:var(--gold)}
h1,h2{font-family:Georgia,"Times New Roman",serif;color:var(--white);line-height:1.25}h1{font-size:30px;margin:8px 0 4px}h2{font-size:21px;margin:0 0 10px}
.tag{font-size:11px;letter-spacing:4px;color:var(--gold);font-weight:700;text-decoration:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;margin:14px 0}
.gold{border-color:var(--gold);background:rgba(212,160,23,.06)}
.big{font-family:Georgia,serif;font-size:30px;color:var(--white);font-weight:700}.big span{color:var(--gold)}
.muted{color:var(--muted);font-size:14px}.btn{display:block;text-align:center;background:var(--gold);color:var(--navy);font-weight:700;letter-spacing:1px;padding:13px;border-radius:8px;text-decoration:none;margin-top:12px}
table{width:100%;border-collapse:collapse;font-size:15px}td,th{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--muted);font-size:12px;letter-spacing:1px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}.grid a{display:block;padding:6px 8px;background:var(--card);border-radius:6px;text-decoration:none;font-size:14px}
.tl{border-left:2px solid var(--gold);margin-left:8px;padding-left:18px}.tl .card{position:relative}.tl .card:before{content:"";position:absolute;left:-27px;top:24px;width:14px;height:14px;border-radius:50%;background:var(--gold)}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:4px}.top .home{font-size:14px;font-weight:600;text-decoration:none;padding:10px 0;min-height:44px;display:inline-flex;align-items:center}.top .home:hover,.top .home:focus-visible{text-decoration:underline}
a:focus-visible,button:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:4px}
nav.foot{margin-top:32px;font-size:14px;color:var(--muted);display:flex;flex-wrap:wrap;gap:14px}`

function page({ path, title, description, body, image = "default", noindex = false, head = "" }) {
  return `<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}"><meta property="og:type" content="website"><meta property="og:site_name" content="Sol">
<meta property="og:image" content="${SITE}/og/${image}.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">${noindex ? '<meta name="robots" content="noindex">' : ""}${head}
<meta name="theme-color" content="#1A1A2E"><link rel="icon" href="/icon-192.png"><link rel="manifest" href="/manifest.json">
<style>${css}</style>
<script src="/va.js"></script><script defer src="/_vercel/insights/script.js"></script>
</head><body><main>
<header class="top"><a class="tag" href="/" aria-label="Sol home">SOL</a><a class="home" href="/">← Home</a></header>
${body}
<nav class="foot" aria-label="More from Sol"><a href="/">Home</a><a href="/?go=birthday">Find your True Birthday</a><a href="/dates">Every date</a><a href="/months">The 13 months</a><a href="/lost-days">Lost Days</a><a href="/ethiopia">Ethiopia</a><a href="/calendar">Sol in your calendar</a><a href="/garden">Gardening</a><a href="/birds">Birdwatching</a><a href="/routine">Routine chart</a><a href="/?go=privacy">Privacy</a></nav>
<p class="muted">Sol — Time, fixed.</p>
</main></body></html>`
}

function write(rel, html) {
  const file = join(OUT, rel)
  mkdirSync(join(file, ".."), { recursive: true })
  writeFileSync(file, html)
}

const urls = ["/", "/dates", "/months", "/lost-days"]

// ── Date pages
for (let m = 0; m < 12; m++) {
  const days = new Date(Date.UTC(LEAP_YEAR, m + 1, 0)).getUTCDate()
  for (let d = 1; d <= days; d++) {
    const g = `${d} ${G_MONTHS[m]}`
    const leapOnly = m === 1 && d === 29
    const ord = leapOnly ? null : toSol(ORD_YEAR, m, d)
    const lp = toSol(LEAP_YEAR, m, d)
    const differs = ord && label(ord) !== label(lp)
    const main = ord || lp
    const head = main.special ? `<div class="big"><span>${main.special}</span></div>` : `<div class="big">${main.weekday} <span>${main.day} ${main.month}</span></div>`
    const fact = DATE_FACTS[`${d}-${m}`]
    const path = `/date/${slug(d, m)}`
    const desc = leapOnly
      ? `29 February in the 13-month calendar: in Sol it is ${label(lp)}. See any date's permanent Sol date and weekday.`
      : `${g} in the 13-month calendar is ${label(ord)} in Sol${differs ? ` (${label(lp)} in a leap year)` : ""}. Same weekday every year.`
    const body = `
<h1>${g} in the 13-month calendar</h1>
<p class="muted">Sol is a calendar of 13 months of exactly 28 days, plus Year Day. Every date falls on the same weekday every year.</p>
<div class="card gold">
<div class="muted">${leapOnly ? "IN A LEAP YEAR (SUCH AS 2028)" : `IN AN ORDINARY YEAR (SUCH AS ${ORD_YEAR})`}</div>
${head}
${main.special ? `<p>${main.special === "Year Day" ? "The one day each year that belongs to no month and no week." : "The extra day that belongs to no month and no week, once every four years."}</p>` : `<p>The ${ordinal(main.day)} of ${main.month} is always a ${main.weekday} in Sol — this year, next year and every year.</p>`}
${differs ? `<p class="muted">In a leap year (such as ${LEAP_YEAR}) ${g} is <strong>${label(lp)}</strong>${lp.special ? "" : ", because 29 February comes first"}.</p>` : ""}
<a class="btn" href="/?go=birthday">FIND YOUR OWN TRUE BIRTHDAY</a>
</div>
${fact ? `<div class="card"><h2>On this date</h2><p>${fact}</p><p class="muted">Checked against the Sol Claim Registry.</p></div>` : ""}
<div class="card"><h2>Why this never changes</h2><p>13 months × 28 days is 364 days: exactly 52 weeks. Year Day — and, in leap years, Leap Day — sits outside the week, so the calendar starts on the same weekday every year. In Sol every month begins on a Monday, and the 13th is always a Saturday — Friday the 13th can never happen.</p></div>
<p class="muted">${d > 1 || m > 0 ? `<a href="/date/${m === 0 && d === 1 ? "" : (d > 1 ? slug(d - 1, m) : slug(new Date(Date.UTC(LEAP_YEAR, m, 0)).getUTCDate(), m - 1))}">← previous date</a> · ` : ""}${!(m === 11 && d === 31) ? `<a href="/date/${d < days ? slug(d + 1, m) : slug(1, m + 1)}">next date →</a>` : ""}</p>`
    write(`date/${slug(d, m)}.html`, page({ path, title: `${g} in the 13-month calendar — Sol date and weekday`, description: desc, body, image: solKey(main) }))
    urls.push(path)
  }
}

// ── Dates hub
{
  let body = `<h1>Every date in Sol</h1><p class="muted">Choose any date to see its permanent Sol date and weekday.</p>`
  for (let m = 0; m < 12; m++) {
    const days = new Date(Date.UTC(LEAP_YEAR, m + 1, 0)).getUTCDate()
    body += `<h2>${G_MONTHS[m]}</h2><div class="grid">`
    for (let d = 1; d <= days; d++) body += `<a href="/date/${slug(d, m)}">${d} ${G_MONTHS[m].slice(0, 3)}</a>`
    body += `</div>`
  }
  write("dates.html", page({ path: "/dates", title: "Every date in the 13-month calendar — Sol", description: "Look up any date in Sol, the 13-month calendar of 28-day months: its Sol date and the weekday it falls on every year.", body }))
}

// ── Month pages
const monthSlug = n => SOL_MONTHS[n].toLowerCase()
for (let n = 0; n < 13; n++) {
  let rows = ""
  for (let day = 1; day <= 28; day++) {
    const ordDoy = n * 28 + day
    const gd = new Date(Date.UTC(ORD_YEAR, 0, ordDoy))
    rows += `<tr><td>${day}</td><td>${WEEKDAYS[(day - 1) % 7]}</td><td><a href="/date/${slug(gd.getUTCDate(), gd.getUTCMonth())}">${gd.getUTCDate()} ${G_MONTHS[gd.getUTCMonth()]}</a></td></tr>`
  }
  const first = new Date(Date.UTC(ORD_YEAR, 0, n * 28 + 1)), last = new Date(Date.UTC(ORD_YEAR, 0, n * 28 + 28))
  const span = `${first.getUTCDate()} ${G_MONTHS[first.getUTCMonth()]} – ${last.getUTCDate()} ${G_MONTHS[last.getUTCMonth()]}`
  const path = `/month/${monthSlug(n)}`
  const intro = n === 6
    ? "Sol is the extra month that makes 13: month 7 of 13, placed between June and July, around the summer solstice. Its name is Latin for 'sun'."
    : `${SOL_MONTHS[n]} is month ${n + 1} of 13 in Sol.`
  const body = `<h1>${n === 6 ? "Sol, the 13th month" : `${SOL_MONTHS[n]} in Sol`}</h1>
<p>${intro} Like every Sol month it has exactly 28 days, starts on a Monday and ends on a Sunday.</p>
<div class="card gold"><div class="muted">IN AN ORDINARY YEAR</div><div class="big"><span>${span}</span></div>
${n >= 2 && n <= 5 ? `<p class="muted">In a leap year, dates from 29 February onward run one day earlier in the ordinary calendar.</p>` : ""}
${n === 5 ? `<p class="muted">In a leap year, Leap Day follows 28 June and belongs to no week.</p>` : ""}
${n === 12 ? `<p class="muted">Year Day follows 28 December and belongs to no week.</p>` : ""}</div>
<div class="card"><table><thead><tr><th>SOL DAY</th><th>WEEKDAY</th><th>ORDINARY CALENDAR</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="muted">${n > 0 ? `<a href="/month/${monthSlug(n - 1)}">← ${SOL_MONTHS[n - 1]}</a> · ` : ""}${n < 12 ? `<a href="/month/${monthSlug(n + 1)}">${SOL_MONTHS[n + 1]} →</a>` : ""}</p>`
  write(`month/${monthSlug(n)}.html`, page({ path, title: `${SOL_MONTHS[n]} in the 13-month calendar — Sol`, description: `${SOL_MONTHS[n]} in Sol runs ${span} in an ordinary year: 28 days, Monday to Sunday, four exact weeks.`, body }))
  urls.push(path)
}
{
  let body = `<h1>The 13 months of Sol</h1><p class="muted">Thirteen months of exactly 28 days, plus Year Day. Every month starts on a Monday.</p><div class="grid">`
  for (let n = 0; n < 13; n++) body += `<a href="/month/${monthSlug(n)}">${n + 1}. ${SOL_MONTHS[n]}</a>`
  body += `</div>`
  write("months.html", page({ path: "/months", title: "The 13 months of Sol — the 28-day month calendar", description: "Sol's 13 months of 28 days, each starting on a Monday, with the ordinary-calendar dates for every day.", body }))
}

// ── Share pages: /b/<sol-date>. What a shared True Birthday link points at, so the preview shows that person's card.
// A Sol date never changes, so these work for every year. Not indexed; people land on the app.
{
  const keys = [{ special: "Year Day" }, { special: "Leap Day" }]
  for (let mn = 1; mn <= 13; mn++) for (let day = 1; day <= 28; day++) keys.push({ month: SOL_MONTHS[mn - 1], day, weekday: WEEKDAYS[(day - 1) % 7] })
  for (const s of keys) {
    const k = solKey(s), to = `/?sb=${k}`
    const title = `My True Birthday is ${label(s)} — Sol`
    const description = s.special ? `Born on ${s.special}: a day outside every week and month. Find your own True Birthday in Sol, the 13-month calendar.` : `The same day of the week, every year, for life. Find your own True Birthday in Sol, the 13-month calendar.`
    write(`b/${k}.html`, page({ path: `/b/${k}`, title, description, image: k, noindex: true,
      head: `<meta http-equiv="refresh" content="0;url=${to}">`,
      body: `<h1>${esc(title)}</h1><a class="btn" href="${to}">FIND YOUR OWN TRUE BIRTHDAY</a>` }))
  }
}

// ── Lost Days
{
  const events = [
    ["46 BC", "The 445-day year", "To pull the Roman calendar back into line with the seasons before his reform began, Julius Caesar added two extra months to one year. The Roman writer Censorinus put its length at 445 days; Macrobius gives 443. Either way, the longest year on record.", "https://ircps.org/wp-content/uploads/2021/04/2007-10-04_Hannah.pdf"],
    ["1582", "Ten days deleted", "Pope Gregory XIII's reform made Thursday 4 October followed by Friday 15 October in Spain, Portugal, the Italian states and Poland–Lithuania. France followed that December.", "https://www.tondering.dk/claus/cal/gregorian.php"],
    ["1712", "Sweden's 30 February", "Sweden had tried to drift into the new calendar gradually, then abandoned the plan. Returning to the old calendar needed one extra day, so 1712 had a 30 February.", "https://tondering.dk/article/en/calendar/60-30feb.php"],
    ["1752", "Britain loses 11 days", "Wednesday 2 September was followed by Thursday 14 September. The tax year was stretched by 11 days to protect revenue, which is why it now starts on 6 April.", "https://theconversation.com/why-the-uk-tax-year-starts-on-april-6-57247"],
    ["1872", "Japan jumps to January", "Japan left its traditional calendar on the 2nd day of the 12th month of 1872; the next day became 1 January 1873.", "https://history.state.gov/historicaldocuments/frus1873p1v1/d251"],
    ["1918", "Russia skips 13 days", "31 January 1918 was followed by 14 February.", "https://seventeenmoments.web.illinois.edu/1917-2/new-letters-and-dates/"],
    ["1923", "Greece, the last in Europe", "15 February 1923 was followed by 1 March, completing Europe's switch more than 340 years after it began.", "https://www.tondering.dk/claus/cal/gregorian.php"],
  ]
  let body = `<h1>Lost Days</h1><p>Seven times the calendar simply skipped — or added — days. Each one was a fix for a system that drifts. Sol is built so it never needs another.</p><div class="tl">`
  for (const [yr, t, txt, src] of events) body += `<div class="card"><div class="muted">${yr}</div><h2>${t}</h2><p>${txt}</p><p class="muted"><a href="${src}" target="_blank" rel="noopener">Source</a></p></div>`
  body += `</div><h2 style="margin-top:2.5rem">And the year that never was</h2><div class="tl"><div class="card"><div class="muted">1 BC → AD 1</div><h2>There is no year 0</h2><p>No days vanished here — a number did. When the 6th-century scholar Dionysius Exiguus began counting years from the birth of Christ, he started at AD 1, and 1 BC sits directly before it. With no year 0, the first century ran from AD 1 to AD 100, which is why the third millennium began on 1 January 2001, not 2000. Astronomers quietly put the missing zero back: in their numbering, year 0 is 1 BC.</p><p class="muted"><a href="https://www.scientificamerican.com/article/when-is-the-beginning-of" target="_blank" rel="noopener">Source</a> · <a href="https://eclipse.gsfc.nasa.gov/SEhelp/dates.html" target="_blank" rel="noopener">Source</a></p></div></div><a class="btn" href="/?go=birthday">FIND YOUR TRUE BIRTHDAY</a>`
  write("lost-days.html", page({ path: "/lost-days", title: "Lost Days: seven times the calendar skipped — Sol", description: "From Caesar's 445-day year to Greece's 1923 switch: the seven times whole days vanished from the calendar — and the year 0 that never existed.", body }))
}

// ── Ethiopia: the country already living on 13 months. Sources: FCDO blog (2015), WHO Africa (2019).
{
  const now = toEthiopian(new Date())
  const rows = ETH_MONTHS.map((m, i) => `<tr><td>${i + 1}</td><td>${m}</td><td>${i < 12 ? "30 days" : "5 days (6 in a leap year)"}</td></tr>`).join("")
  const body = `
<h1>In Ethiopia, it's ${now.year}.</h1>
<p>Sol isn't the only 13-month calendar. Ethiopia lives by one today — and it's seven or eight years behind the rest of the world.</p>
<p>This is no museum piece. It is the official calendar of a country of more than 130 million people (<a href="https://data.worldbank.org/indicator/SP.POP.TOTL?locations=ET" target="_blank" rel="noopener">World Bank, 2025</a>), the second most populous in Africa: proof that a 13-month year can run a modern nation.</p>
<div class="card gold"><div class="muted">TODAY IN ETHIOPIA</div><div class="big" id="eth-today">${now.day} <span>${now.monthName} ${now.year}</span></div><p class="muted" id="eth-note">Worked out for today's date in the ordinary calendar.</p></div>
<div class="card"><h2>Twelve months of 30 days — and one of five</h2>
<p>The Ethiopian year has 13 months. The first twelve each have exactly 30 days. The thirteenth, Pagume, has just five — or six in a leap year — to make up the year.</p>
<table><thead><tr><th>#</th><th>MONTH</th><th>LENGTH</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="card"><h2>Why it's ${now.year} there</h2>
<p>Ethiopia counts its years from a different starting point, and its year begins in September, not January. New Year — Enkutatash — falls on 11 September, or on 12 September in the year before a leap year in the ordinary calendar. From New Year until 31 December, Ethiopia is seven years behind; from 1 January until New Year, it's eight.</p></div>
<div class="card"><h2>Sol and Ethiopia, side by side</h2>
<table><thead><tr><th></th><th>SOL</th><th>ETHIOPIA</th></tr></thead><tbody>
<tr><td>Months</td><td>13</td><td>13</td></tr>
<tr><td>Month length</td><td>28 days, every month</td><td>30 days, plus Pagume of 5 or 6</td></tr>
<tr><td>Weeks per month</td><td>Exactly 4</td><td>4 and a bit</td></tr>
<tr><td>Spare days</td><td>Year Day (and Leap Day) sit outside the week</td><td>Gathered into Pagume</td></tr>
<tr><td>Same weekday every year?</td><td>Yes</td><td>No</td></tr>
<tr><td>New Year</td><td>1 January — always a Monday</td><td>11 or 12 September</td></tr>
</tbody></table>
<p>Both split the year into 13. Ethiopia gives each month 30 days and keeps the leftovers in a short final month. Sol gives each month 28 days — four exact weeks — and takes the leftover day out of the week altogether. That's why in Sol every date keeps its weekday for ever.</p></div>
<div class="card"><h2>Convert a date</h2><label class="muted" for="eth-in">ORDINARY DATE</label><br><input id="eth-in" type="date" style="font-size:16px;padding:8px;margin:6px 0 10px;border-radius:6px;border:1px solid var(--line);background:var(--navy);color:var(--white)">
<div class="big" id="eth-out"></div></div>
<a class="btn" href="/?go=birthday">NOW FIND YOUR SOL BIRTHDAY</a>
<p class="muted">Sources: <a href="https://blogs.fcdo.gov.uk/gregdorey/2015/09/11/enkuan-aderesachihu-happy-new-year" target="_blank" rel="noopener">UK Foreign Office, British Embassy Addis Ababa (2015)</a> · <a href="https://www.afro.who.int/pt/node/11715" target="_blank" rel="noopener">World Health Organization, Africa (2019)</a>. Dates are calculated with the standard Ethiopian calendar arithmetic and checked against both.</p>
<script src="/js/ethiopia.js" defer></script>`
  mkdirSync(join(OUT, "js"), { recursive: true }); writeFileSync(join(OUT, "js/ethiopia.js"), `(function(){var M=${JSON.stringify(ETH_MONTHS)},E=1724221;function j(y,m,d){return E-1+365*(y-1)+Math.floor(y/4)+30*(m-1)+d}
function eth(dt){var n=Math.floor(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate())/864e5)+2440588,y=Math.floor((4*(n-E)+1463)/1461),m=Math.floor((n-j(y,1,1))/30)+1;return{d:n-j(y,m,1)+1,m:M[m-1],y:y}}
var t=eth(new Date());document.getElementById("eth-today").innerHTML=t.d+" <span>"+t.m+" "+t.y+"</span>";
var i=document.getElementById("eth-in"),o=document.getElementById("eth-out");i.value=new Date().toISOString().slice(0,10);
function show(){if(!i.value)return;var p=i.value.split("-"),r=eth(new Date(+p[0],p[1]-1,+p[2],12));o.innerHTML=r.d+" <span>"+r.m+" "+r.y+"</span>"}i.addEventListener("input",show);show()})()`)
  write("ethiopia.html", page({ path: "/ethiopia", title: `In Ethiopia it's ${now.year}: the 13-month calendar already in use — Sol`, description: "Ethiopia lives by a 13-month calendar: twelve months of 30 days and a thirteenth of five or six. See today's Ethiopian date and how it compares with Sol.", body }))
  urls.push("/ethiopia")
}

// ── Calendar feed: /sol.ics — one all-day entry per day with its Sol date, subscribed to from phones and laptops
{
  const pad = n => String(n).padStart(2, "0")
  const ymd = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"
  const start = new Date(); start.setDate(start.getDate() - 31)
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sol//sol28.co.uk//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Sol dates", "X-WR-CALDESC:Today's date in Sol\\, the 13-month calendar. sol28.co.uk", "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:P1D", "X-PUBLISHED-TTL:P1D"]
  for (let i = 0; i < 365 * 3 + 31; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12)
    const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12)
    const r = toIFC(d)
    const summary = r.special ? `Sol: ${r.special}` : `Sol ${r.day} ${r.month}${r.day === 1 ? " — new month" : ""}${r.day === 13 ? " (never a Friday)" : ""}`
    lines.push("BEGIN:VEVENT", `UID:sol-${ymd(d)}@sol28.co.uk`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(d)}`, `DTEND;VALUE=DATE:${ymd(n)}`,
      `SUMMARY:${summary}`, "TRANSP:TRANSPARENT", "URL:https://sol28.co.uk/", "END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  writeFileSync(join(OUT, "sol.ics"), lines.join("\r\n") + "\r\n")

  const feed = "sol28.co.uk/sol.ics"
  const body = `
<h1>Put Sol in your calendar</h1>
<p>Add the Sol calendar once and today's Sol date appears in your own calendar every day — on your phone, your laptop, everywhere. It updates itself.</p>
<div class="card gold">
<a class="btn" href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent("webcal://" + feed)}" target="_blank" rel="noopener">ADD TO GOOGLE CALENDAR</a>
<a class="btn" href="webcal://${feed}" style="margin-top:10px">ADD TO APPLE CALENDAR (IPHONE, MAC)</a>
<a class="btn" href="https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent("https://" + feed)}&name=Sol%20dates" target="_blank" rel="noopener" style="margin-top:10px">ADD TO OUTLOOK</a>
</div>
<div class="card"><h2>What you'll see</h2><p>One small all-day note each day, such as <strong>Sol 21 October</strong>. On the 1st of each Sol month it says so; on the 13th it reminds you it's never a Friday. Year Day and Leap Day are marked when they come.</p><p class="muted">The entries are marked as free time, so they never block your diary.</p></div>
<div class="card"><h2>Another calendar app?</h2><p>Most calendar apps can subscribe to a web calendar. Use this address:</p><p><code style="word-break:break-all;color:var(--gold)">https://${feed}</code></p></div>
<div class="card"><h2>Changed your mind?</h2><p>Remove "Sol dates" from your calendar app's list of calendars, like any other subscription. Nothing is stored about you — the feed is the same file for everyone.</p></div>
<a class="btn" href="/?go=birthday">FIND YOUR TRUE BIRTHDAY</a>`
  write("calendar.html", page({ path: "/calendar", title: "Put Sol in your calendar — today's Sol date, every day", description: "Subscribe once and today's date in Sol, the 13-month calendar, appears in Google, Apple or Outlook calendar every day.", body }))
  urls.push("/calendar")
}

// ── Gardening by Sol month (Liverpool / NW England)
// Day length is calculated, not looked up: sunrise-to-sunset at 53.41°N, including refraction.
function dayLength(doy, lat = 53.41) {
  const g = 2 * Math.PI / 365 * (doy - 1)
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const phi = lat * Math.PI / 180, h0 = -0.833 * Math.PI / 180
  const cosw = (Math.sin(h0) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl))
  return 2 * Math.acos(Math.max(-1, Math.min(1, cosw))) * 180 / Math.PI / 15
}
const hm = h => { const t = Math.round(h * 60); return `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, "0")}m` }
const GARDEN = [
  { sow: "Indoors only, with heat and light: chillies and early tomatoes, peppers and aubergines. Microgreens on a windowsill.", harvest: "Very little. Forced rhubarb kept in the dark; winter lettuce under cover.", jobs: "Prune apple and pear trees while dormant. Plant bare-root trees, hedges and roses if the ground isn't frozen. Insulate cold frames and wrap pots against freezing. Clean and sharpen tools; plan your crop rotation." },
  { sow: "Indoors: more tomatoes, peppers and aubergines. Broad beans in pots and sweet peas in root trainers. Early lettuce under cover.", harvest: "Snowdrops and crocuses appear; rhubarb crowns start to push.", jobs: "Finish bare-root planting before buds break. Prune wisteria back to two or three buds. Cut back ornamental grasses and mulch beds with compost. Keep fleece handy for cold snaps." },
  { sow: "Outdoors once the soil warms: broad beans, peas, onion sets and shallots, chitted early potatoes, radish, spinach and beetroot. Carrots under a cloche.", harvest: "Daffodils and early spring bulbs flower; blossom opens on early fruit trees.", jobs: "Spring clean-up: cut back dead stems and edge the beds. Divide perennials. First lawn mow on a high cut. Fleece fruit blossom when frost is forecast; watch for slugs." },
  { sow: "The main sowing month outdoors: peas, beans, carrots, parsnips, beetroot, turnips and brassicas. Courgettes, squash and sweetcorn indoors.", harvest: "Early radish and lettuce; tulips, bluebells and cherry blossom.", jobs: "Harden off seedlings in a cold frame for 7–10 days. Net brassicas against pigeons. Thin direct-sown rows, hoe weekly and support peas." },
  { sow: "Succession-sow lettuce, radish and spinach every two to three weeks. Sow tender crops outdoors only once the risk of frost has passed.", harvest: "Broad beans flowering, early peas podding, first strawberries.", jobs: "Watch the forecast: late frosts can still catch tender plants, so keep fleece ready. Stake tall plants. Deadhead spring bulbs but leave the leaves." },
  { sow: "Runner and French beans, courgettes and squash outdoors once frosts are over. Succession lettuce, rocket and spring onions. Autumn and winter brassicas.", harvest: "First broad beans, early potatoes, peas, strawberries and gooseberries. Roses and sweet peas in flower.", jobs: "Plant out tomatoes and other tender plants. The 'Chelsea chop' of late-flowering perennials falls around now. Net soft fruit against birds; start the potato blight watch." },
  { sow: "Succession sowings for autumn: lettuce, spinach, radish, spring onions, turnips and fennel. Winter salads under cover.", harvest: "Peak season begins: courgettes, beans, soft fruit. The longest days of the year fall in this month.", jobs: "Water deeply and mulch to hold moisture. Pinch out tomato side-shoots and feed tomatoes weekly. Check for aphids and blight." },
  { sow: "Fast crops only: lettuce, radish, rocket, spring onions. Spring cabbage for next year.", harvest: "Harvest peak: beans, tomatoes, courgettes, cucumbers, early plums.", jobs: "Summer-prune wisteria. Prune summer-fruiting raspberries after harvest. Pick courgettes daily before they turn into marrows. Watch for blight in warm, humid weather." },
  { sow: "Green manures on cleared beds. Winter lettuce under cover. Start planting daffodils.", harvest: "Apples, pears, plums, blackberries; squash and pumpkins maturing.", jobs: "Store or preserve the surplus. Clear spent crops. Divide bearded irises. Bring tender pots under cover on cold nights." },
  { sow: "Plant garlic and overwintering onion sets. Overwintering broad beans and peas. Spring bulbs.", harvest: "Late apples and pears, squash and pumpkins, root vegetables.", jobs: "Collect fallen leaves for leaf mould. Divide perennials. Aerate and feed the lawn. Move tender plants under cover before the first hard frost." },
  { sow: "Finish planting garlic. Tulip bulbs. Sweet peas in a cold frame for early flowers.", harvest: "Parsnips, kale, chard, leeks; Brussels sprouts forming.", jobs: "Lift dahlia tubers once frost blackens the foliage. Lag outdoor taps and drain hoses. Clear spent crops and compost them. The bare-root planting season begins." },
  { sow: "Broad beans in pots under cover. Microgreens on the windowsill.", harvest: "Winter greens: kale, chard, leeks, sprouts, parsnips, celeriac.", jobs: "Winter-prune apples and pears (not plums or cherries). Plant bare-root stock. Check stored fruit and vegetables for rot. Clean and oil tools." },
  { sow: "Rest. Indoor tomatoes and peppers only if you have heat and light.", harvest: "Forced rhubarb, winter salads under cover; mahonia and winter jasmine in flower.", jobs: "Prune apple and pear trees. Keep bird baths free of ice. Review the year and order next year's seed." },
]
{
  let body = `<h1>The gardening year in Sol</h1>
<p>Thirteen months of exactly four weeks fit the garden better than twelve uneven ones: the same weekday for the same job, every month. This guide is written for Liverpool and North West England.</p>
<p class="muted">Day lengths are calculated for 53.4°N, sunrise to sunset. Timings shift with your local weather, so treat each month as a guide and check your own frost dates. For detailed advice, the Royal Horticultural Society is the place to go.</p>`
  for (let n = 0; n < 13; n++) {
    const first = new Date(Date.UTC(ORD_YEAR, 0, n * 28 + 1)), last = new Date(Date.UTC(ORD_YEAR, 0, n * 28 + 28))
    const span = `${first.getUTCDate()} ${G_MONTHS[first.getUTCMonth()].slice(0, 3)} – ${last.getUTCDate()} ${G_MONTHS[last.getUTCMonth()].slice(0, 3)}`
    const a = dayLength(n * 28 + 1), b = dayLength(n * 28 + 28)
    const g = GARDEN[n]
    body += `<div class="card${n === 6 ? " gold" : ""}" id="${monthSlug(n)}"><div class="muted">MONTH ${n + 1} · ${span} · DAYLIGHT ${hm(a)} → ${hm(b)}</div>
<h2>${SOL_MONTHS[n]}</h2>
<p><strong>Sow and plant.</strong> ${g.sow}</p><p><strong>In season.</strong> ${g.harvest}</p><p><strong>Jobs.</strong> ${g.jobs}</p></div>`
  }
  body += `<div class="card"><h2>Year Day</h2><p>The day outside every week and month: no sowing, no jobs. Walk the garden and note what worked.</p></div>
<a class="btn" href="/?go=birthday">FIND YOUR TRUE BIRTHDAY</a>`
  write("garden.html", page({ path: "/garden", title: "The gardening year in 13 months — Sol", description: "What to sow, harvest and do in each of Sol's 13 four-week months, for Liverpool and North West England, with calculated day lengths.", body }))
  urls.push("/garden")
}

// ── Birdwatching page (RSPB vertical). Only timings the RSPB states on its own pages; sources listed on the page.
{
  const S = {
    arrivals: "https://www.rspb.org.uk/birds-and-wildlife/spring-arrivals",
    chorus: "https://www.rspb.org.uk/whats-happening/news/the-dawn-chorus-all-you-need-to-know-about-natures-big-show",
    august: "https://www.rspb.org.uk/birds-and-wildlife/the-year-in-nature/the-year-in-nature-august",
    october: "https://www.rspb.org.uk/birds-and-wildlife/birds-of-the-month/october-birds-of-the-month",
    bgbw: "https://www.rspb.org.uk/whats-happening/big-garden-birdwatch/faqs",
  }
  const BIRDS = [
    [0, "The RSPB's Big Garden Birdwatch runs over a weekend in late January: one hour counting the birds in one spot.", S.bgbw, "Late January falls at the end of Sol January or the start of Sol February."],
    [2, "Chiffchaffs return in early March, wheatears arrive in growing numbers through March, and the first swallows appear from early March.", S.arrivals, ""],
    [3, "Lesser whitethroats usually begin to return in April.", S.arrivals, ""],
    [4, "The dawn chorus is at its peak in early May, loudest just before and after sunrise. International Dawn Chorus Day is the first Sunday in May. Swifts return in May, nightjars arrive, and Arctic terns come up from the Antarctic in late April and May.", S.chorus, "Sol May runs 23 April – 20 May in an ordinary year, so it holds the whole peak."],
    [8, "Swifts prepare to leave for Africa, and young swifts make their first journey south.", S.august, ""],
    [9, "Redwings and fieldfares arrive for the winter in October.", S.october, "October begins in the last week of Sol September and runs on into Sol October."],
    [10, "Redwings and fieldfares are arriving for the winter.", S.october, ""],
  ]
  let body = `<h1>The birding year in Sol</h1>
<p>Every Sol month is four identical weeks, so a note you make in week 2 of Sol May lines up day for day with week 2 of Sol May next year. Birders' records become directly comparable, year on year.</p>
<p class="muted">Every timing below is taken from the RSPB's own pages, linked beside it. Months without an entry are months we haven't yet sourced, not months without birds.</p>`
  for (let n = 0; n < 13; n++) {
    const items = BIRDS.filter(b => b[0] === n)
    if (!items.length) continue
    const first = new Date(Date.UTC(ORD_YEAR, 0, n * 28 + 1)), last = new Date(Date.UTC(ORD_YEAR, 0, n * 28 + 28))
    const span = `${first.getUTCDate()} ${G_MONTHS[first.getUTCMonth()].slice(0, 3)} – ${last.getUTCDate()} ${G_MONTHS[last.getUTCMonth()].slice(0, 3)}`
    body += `<div class="card${n === 4 ? " gold" : ""}"><div class="muted">MONTH ${n + 1} · ${span}</div><h2>${SOL_MONTHS[n]}</h2>`
    for (const [, txt, src, note] of items) body += `<p>${txt} <a href="${src}" target="_blank" rel="noopener">RSPB</a></p>${note ? `<p class="muted">${note}</p>` : ""}`
    body += `</div>`
  }
  body += `<div class="card"><h2>Keep a Sol bird diary</h2><p>Print the <a href="/routine">same-every-month chart</a> and note first sightings by Sol date. Next year, the same square is the same point in the season.</p></div>
<a class="btn" href="/?go=birthday">FIND YOUR TRUE BIRTHDAY</a>`
  write("birds.html", page({ path: "/birds", title: "The birding year in 13 months — Sol", description: "Spring arrivals, the dawn chorus peak and winter visitors placed in Sol's 13 four-week months, with every timing sourced from the RSPB.", body }))
  urls.push("/birds")
}

// ── Routine page (Autism vertical): one printable month that is the same every month
{
  const printCss = `<style>@media print{body{background:#fff!important;color:#000!important}.noprint,nav.foot,.tag,.top{display:none!important}.card{background:#fff!important;border:1px solid #000!important;break-inside:avoid}h1,h2,.muted,td,th,p{color:#000!important}a{color:#000!important}main{max-width:none;padding:0}}
.cal{width:100%;border-collapse:collapse;table-layout:fixed}.cal th{text-align:center;color:var(--gold)}.cal td{height:64px;vertical-align:top;border:1px solid var(--line);font-family:Georgia,serif;font-size:15px;padding:4px 6px}
.cal td.sat13{border:2px solid var(--gold)}.lines td{height:40px;border-bottom:1px solid var(--line)}
button.pr{background:var(--gold);color:var(--navy);border:0;border-radius:8px;padding:13px;font-weight:700;letter-spacing:1px;width:100%;cursor:pointer;font-size:14px}</style>`
  let cal = `<table class="cal"><thead><tr>${WEEKDAYS.map(w => `<th>${w.slice(0, 3)}</th>`).join("")}</tr></thead><tbody>`
  for (let w = 0; w < 4; w++) cal += `<tr>${[1, 2, 3, 4, 5, 6, 7].map(i => { const d = w * 7 + i; return `<td${d === 13 ? ' class="sat13"' : ""}>${d}</td>` }).join("")}</tr>`
  cal += `</tbody></table>`
  const lines = `<table class="lines">${WEEKDAYS.map(w => `<tr><th style="width:110px">${w}</th><td></td></tr>`).join("")}</table>`
  const body = `${printCss}
<h1>A calendar that doesn't change</h1>
<p>In Sol every month is identical: 28 days, starting on a Monday and ending on a Sunday. The 13th is always a Saturday. Learn one month and you know all thirteen.</p>
<div class="card noprint"><h2>Why this might matter</h2>
<p>The National Autistic Society says many autistic people prefer knowing in advance what will happen, and that routines can help with planning, managing energy and reducing anxiety (<a href="https://www.autism.org.uk/advice-and-guidance/about-autism/preference-for-order-predictability-or-routine" target="_blank" rel="noopener">NAS guidance</a>).</p>
<p>The ordinary calendar keeps shifting: months run from 28 to 31 days, and the 1st lands on a different weekday each month. A Sol month never moves, so one chart can stay on the wall all year.</p>
<p class="muted">Sol isn't a support service and we make no claim that it suits everyone. If you're autistic, or support someone who is, we'd like to hear whether this is useful: hello@sol28.co.uk.</p></div>
<div class="card"><h2>Every Sol month</h2><p class="muted">The same grid for all 13 months. The 13th is outlined: always a Saturday.</p>${cal}</div>
<div class="card"><h2>My week</h2><p class="muted">Write a routine once; it lands on the same dates in every month.</p>${lines}</div>
<div class="card"><h2>The two days outside the week</h2>
<p><strong>Year Day</strong> comes after the 28th of December, on what the ordinary calendar calls 31 December. It belongs to no week and no month.</p>
<p><strong>Leap Day</strong> comes after the 28th of June in leap years — the next is 17 June 2028 in the ordinary calendar.</p>
<p class="muted">Both are known years in advance, so they can be marked on the chart long before they arrive.</p></div>
<p class="noprint" id="nowline"></p>
<button class="pr noprint" id="printbtn">PRINT THIS CHART</button>
<script src="/js/routine.js" defer></script>`
  mkdirSync(join(OUT, "js"), { recursive: true }); writeFileSync(join(OUT, "js/routine.js"), `
(function(){try{var M=${JSON.stringify(SOL_MONTHS)},W=${JSON.stringify(WEEKDAYS)};var t=new Date(),y=t.getFullYear(),L=(y%4===0&&(y%100!==0||y%400===0));
var n=Math.round((Date.UTC(y,t.getMonth(),t.getDate())-Date.UTC(y,0,1))/864e5)+1;var s;
if(n===(L?366:365))s="Today is Year Day.";else if(L&&n===169)s="Today is Leap Day.";else{var a=L&&n>169?n-1:n,m=Math.ceil(a/28),d=(a-1)%28+1;s="Today is "+W[(d-1)%7]+" "+d+" "+M[m-1]+" — day "+d+" on the chart above.";}
document.getElementById("nowline").textContent=s;var pb=document.getElementById("printbtn");if(pb)pb.addEventListener("click",function(){window.print()});}catch(e){}})();
`)
  write("routine.html", page({ path: "/routine", title: "A calendar that doesn't change — printable Sol month", description: "Every Sol month is identical: 28 days, Monday to Sunday. Print one chart and use it all year.", body }))
  urls.push("/routine")
}

// ── Sitemap and robots
const today = new Date().toISOString().slice(0, 10)
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`)
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`)
console.log(`Wrote ${urls.length - 1} pages + sitemap`)

// ── Book notes: /notes and /notes/<chapter> (linked from the end of every chapter of Still Ruled by Rome)
{
  const notes = JSON.parse(readFileSync(new URL("../src/notes.json", import.meta.url), "utf8"))
  const li = s => `<li>${esc(s.cite)}${s.url ? ` <a href="${esc(s.url)}" target="_blank" rel="noopener">Read it&nbsp;↗</a>` : ""}</li>`
  const idx = notes.chapters.map(c => `<li><a href="/notes/${c.n}">${esc(c.title)}</a></li>`).join("")
  write("notes.html", page({ path: "/notes", title: "Sources and notes — Still Ruled by Rome — Sol", description: "Sources and further reading for every chapter of Still Ruled by Rome, with links to the originals.",
    body: `<h1>Sources and notes</h1><p class="lead">${esc(notes.book)}</p><p>${esc(notes.intro)}</p><ol class="plain">${idx}</ol>` }))
  for (const c of notes.chapters) {
    write(`notes/${c.n}.html`, page({ path: `/notes/${c.n}`, title: `${c.title} — sources — Sol`, description: `Sources and further reading for ${c.title} of Still Ruled by Rome.`,
      body: `<p class="muted"><a href="/notes">All chapters</a></p><h1>${esc(c.title)}</h1><p>${esc(notes.intro)}</p><ol>${c.sources.map(li).join("")}</ol>` }))
    urls.push(`/notes/${c.n}`)
  }
  urls.push("/notes")
  writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}${u}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`).join("\n")}\n</urlset>\n`)
}
