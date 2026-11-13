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
import { bankHolidays } from "../src/payday.js"

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
.tag{font-size:12px;letter-spacing:4px;color:var(--gold);font-weight:700;text-decoration:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;margin:14px 0}
.gold{border-color:var(--gold);background:rgba(212,160,23,.06)}
.big{font-family:Georgia,serif;font-size:30px;color:var(--white);font-weight:700}.big span{color:var(--gold)}
.muted{color:var(--muted);font-size:14px}.btn{display:block;text-align:center;background:var(--gold);color:var(--navy);font-weight:700;letter-spacing:1px;padding:13px;border-radius:8px;text-decoration:none;margin-top:12px}
table{width:100%;border-collapse:collapse;font-size:15px}td,th{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--muted);font-size:13px;letter-spacing:1px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}.grid a{display:block;padding:6px 8px;background:var(--card);border-radius:6px;text-decoration:none;font-size:14px}
.tl{border-left:2px solid var(--gold);margin-left:8px;padding-left:18px}.tl .card{position:relative}.tl .card:before{content:"";position:absolute;left:-27px;top:24px;width:14px;height:14px;border-radius:50%;background:var(--gold)}
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
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)}</script><script defer src="/_vercel/insights/script.js"></script>
</head><body><main>
<a class="tag" href="/">SOL</a>
${body}
<nav class="foot"><a href="/?go=birthday">Find your True Birthday</a><a href="/dates">Every date</a><a href="/months">The 13 months</a><a href="/lost-days">Lost Days</a><a href="/ethiopia">Ethiopia</a><a href="/calendar">Sol in your calendar</a><a href="/garden">Gardening</a><a href="/birds">Birdwatching</a><a href="/routine">Routine and autism</a><a href="/payday">Payday Calendar</a><a href="/facts">Facts</a><a href="/teachers">For teachers</a><a href="/about">About</a><a href="/embed">Put Sol on your site</a><a href="/?go=privacy">Privacy</a></nav>
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
  {
    const body = `<h1>Friday the 13th can't happen in Sol</h1>
<p class="muted">13 November 2026 is a Friday the 13th, the third this year. Here's why the calendar Sol is built on had thirteen of them a year, and Sol has none.</p>
<div class="card"><h2>Cotsworth's calendar: one every month</h2><p>Moses Cotsworth's International Fixed Calendar has thirteen months of exactly 28 days. Every month started on a Sunday, so Sunday the 1st, Sunday the 8th, and then Friday the 13th. Every month. Thirteen a year.</p></div>
<div class="card"><h2>Our calendar: one to three a year</h2><p>Months of 28 to 31 days push the weekdays around, so the 13th wanders. Every year has at least one Friday the 13th and never more than three: 2026 has three (February, March, November), 2027 has one (August), 2028 has one (October). Over the calendar's full 400-year cycle the 13th falls on a Friday 688 times, more often than on any other weekday.</p></div>
<div class="card"><h2>Sol: none, ever</h2><p>Sol keeps Cotsworth's thirteen months of 28 days but starts the week on Monday, as the international standard ISO 8601 does. One day's shift: the 13th of every month is a Saturday, every year. Fridays fall on the 5th, 12th, 19th and 26th.</p></div>
<div class="card"><h2>The fear is younger than you think</h2><p>The first clear record of Friday the 13th as unlucky is from 1869, in Henry Sutherland Edwards's biography of the composer Rossini, who died on Friday 13 November 1868. The story that it began with the arrest of the Knights Templar in 1307 has no support in any document from the time.</p></div>
<a class="btn" href="/?go=birthday">COUNT THE FRIDAY THE 13THS YOU'VE LIVED THROUGH</a>
<p class="muted">Sources: <a href="https://earthsky.org/human-world/13-month-calendar-would-mean-13-friday-the-13ths" target="_blank" rel="noopener">EarthSky (2021)</a> · <a href="https://gizmodo.com/why-people-think-friday-the-13th-is-unlucky-1306401570" target="_blank" rel="noopener">Gizmodo</a> · <a href="https://theweek.com/culture-life/behind-the-myth-of-friday-the-13th" target="_blank" rel="noopener">The Week</a> · <a href="https://gutenberg.org/ebooks/45705" target="_blank" rel="noopener">Edwards, The Life of Rossini (1869)</a>. The 400-year count is our own calculation.</p>`
    write("friday13.html", page({ path: "/friday13", title: "Friday the 13th can't happen in Sol — Sol", description: "The 13-month calendar had a Friday the 13th every month. Sol starts the week on Monday, so it has none. Count the ones you've lived through.", body, image: "friday13" }))
    urls.push("/friday13")
  }
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

// ── "You are here" marker for month-by-month pages
mkdirSync(join(OUT, "js"), { recursive: true })
writeFileSync(join(OUT, "js/nowmonth.js"), `(function(){try{var t=new Date(),y=t.getFullYear(),L=(y%4===0&&(y%100!==0||y%400===0));
var n=Math.round((Date.UTC(y,t.getMonth(),t.getDate())-Date.UTC(y,0,1))/864e5)+1;if(n===(L?366:365))return;var a=L&&n>169?n-1:n,m=Math.ceil(a/28)-1,d=(a-1)%28+1;
var el=document.querySelector('[data-m="'+m+'"]');if(!el)return;var p=document.createElement("div");p.className="muted";p.style.color="#D4A017";p.style.fontWeight="700";
p.textContent="YOU ARE HERE: DAY "+d+" OF 28";el.insertBefore(p,el.firstChild);el.style.borderColor="#D4A017";}catch(e){}})();`)

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
<p class="muted">Day lengths are calculated for 53.4°N, sunrise to sunset. Timings shift with your local weather, so treat each month as a guide and check your own frost dates. For detailed advice, the Royal Horticultural Society is the place to go.</p>
<div class="card gold"><h2>The fortnightly sowing rule</h2><p>Lettuce, radish, rocket and spinach crop best sown little and often, every two weeks. On the ordinary calendar "every two weeks" drifts through the month. In Sol it never moves: <strong>sow on Saturday the 6th and Saturday the 20th</strong>, every month, all year. That is 26 sowings, on dates you never have to look up.</p><p class="muted">Feeding every week? Every Saturday is the 6th, 13th, 20th or 27th. Every four weeks? The same date each month.</p></div>
<div class="card"><h2>Frost in the North West</h2><p>The Met Office notes that frost can occur well into late spring, and that further north the average last frost often runs into May. Cities are a little kinder: the urban heat island effect makes frost less likely in built-up areas than in the countryside around them. A Liverpool back garden may plant out a little earlier than a garden on the hills. <a href="https://www.metoffice.gov.uk/blog/2026/why-frost-can-still-occur-in-late-spring" target="_blank" rel="noopener">Met Office</a></p></div>`
  for (let n = 0; n < 13; n++) {
    const first = new Date(Date.UTC(ORD_YEAR, 0, n * 28 + 1)), last = new Date(Date.UTC(ORD_YEAR, 0, n * 28 + 28))
    const span = `${first.getUTCDate()} ${G_MONTHS[first.getUTCMonth()].slice(0, 3)} – ${last.getUTCDate()} ${G_MONTHS[last.getUTCMonth()].slice(0, 3)}`
    const a = dayLength(n * 28 + 1), b = dayLength(n * 28 + 28)
    const g = GARDEN[n]
    body += `<div class="card${n === 6 ? " gold" : ""}" id="${monthSlug(n)}" data-m="${n}"><div class="muted">MONTH ${n + 1} · ${span} · DAYLIGHT ${hm(a)} → ${hm(b)}</div>
<h2>${SOL_MONTHS[n]}</h2>
<p><strong>Sow and plant.</strong> ${g.sow}</p><p><strong>In season.</strong> ${g.harvest}</p><p><strong>Jobs.</strong> ${g.jobs}</p></div>`
  }
  body += `<div class="card"><h2>Year Day</h2><p>The day outside every week and month: no sowing, no jobs. Walk the garden and note what worked.</p></div>
<div class="card"><h2>Keep a garden record</h2><p>Note the Sol date of your first sowing, first flower and first frost each year. A Sol date is also the day of the year (the 10th of Sol May is day 122), so years line up without a table. The Woodland Trust's <a href="https://naturescalendar.woodlandtrust.org.uk/" target="_blank" rel="noopener">Nature's Calendar</a> collects first-flowering and first-leaf records from gardeners to track how the seasons are shifting.</p></div>
<a class="btn" href="/?go=birthday">FIND YOUR TRUE BIRTHDAY</a><script src="/js/nowmonth.js" defer></script>`
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
    bgbwInfo: "https://www.rspb.org.uk/whats-happening/big-garden-birdwatch/info",
    february: "https://www.rspb.org.uk/birds-and-wildlife/natures-calendar/natures-calendar-february",
    febExpert: "https://www.rspb.org.uk/birds-and-wildlife/ask-an-rspb-expert/february",
    cuckoo: "https://www.rspb.org.uk/birds-and-wildlife/cuckoo",
    octExpert: "https://www.rspb.org.uk/birds-and-wildlife/ask-an-rspb-expert/october",
  }
  const BIRDS = [
    [0, "The RSPB's Big Garden Birdwatch runs over a weekend in late January: one hour counting the birds in one spot.", S.bgbw, "Late January falls at the end of Sol January or the start of Sol February."],
    [1, "National Nest Box Week runs from 14 February every year, a reminder that a nest box is one of the easiest ways to help birds.", S.february, "14 February is always Wednesday 17 February in Sol, so the week starts on the same Sol date every year."],
    [1, "Many garden birds are already choosing nest sites and even building. Grey herons start breeding from around February, with chicks hatching in March and April.", S.febExpert, ""],
    [2, "Chiffchaffs return in early March, wheatears arrive in growing numbers through March, and the first swallows appear from early March.", S.arrivals, ""],
    [3, "Lesser whitethroats usually begin to return in April.", S.arrivals, ""],
    [4, "The dawn chorus is at its peak in early May, loudest just before and after sunrise. International Dawn Chorus Day is the first Sunday in May. Swifts return in May, nightjars arrive, and Arctic terns come up from the Antarctic in late April and May.", S.chorus, "Sol May runs 23 April – 20 May in an ordinary year, so it holds the whole peak."],
    [4, "Cuckoos arrive in spring and lay their eggs from late April through June, in the nests of other birds.", S.cuckoo, ""],
    [5, "Cuckoos are still laying, in other birds' nests. Listen for them now: from late June they start to leave.", S.cuckoo, ""],
    [6, "Cuckoos usually begin leaving the UK from late June.", S.cuckoo, "Sol's own month, 18 June – 15 July, is when the cuckoo's short summer starts to end."],
    [7, "Most cuckoos have gone by August.", S.cuckoo, ""],
    [8, "Swifts prepare to leave for Africa, and young swifts make their first journey south.", S.august, ""],
    [9, "Some swallows and house martins are still nesting into September, so the last chicks may not fledge until September or October. Late birds are normal.", S.octExpert, ""],
    [9, "Redwings and fieldfares arrive for the winter in October.", S.october, "October begins in the last week of Sol September and runs on into Sol October."],
    [10, "Redwings and fieldfares are arriving for the winter.", S.october, ""],
    [11, "Swallows and house martins have been recorded in November and later, and a few swallows now try to stay the winter. The RSPB links this to warmer winters.", S.octExpert, ""],
    [12, "Registration for the next Big Garden Birdwatch opens in December.", S.bgbwInfo, "The RSPB has announced that registration for the 2027 Birdwatch opens on 9 December. In Sol that is Sunday 7 December."],
  ]
  let body = `<h1>The birding year in Sol</h1>
<p>Every Sol month is four identical weeks, so a note you make in week 2 of Sol May lines up day for day with week 2 of Sol May next year. Birders' records become directly comparable, year on year.</p>
<p class="muted">Every timing below is taken from the RSPB's own pages, linked beside it. Timings are typical: birds arrive early and leave late every year, and that variation is exactly what is worth recording.</p>
<div class="card gold"><h2>Why birders like a fixed calendar</h2><p>A Sol date is also the day of the year. The 10th of Sol May is day 122: four whole months of 28 days, plus 10. On the ordinary calendar you would need a table to work that out.</p><p>Scientists who study the timing of the seasons (phenology) count in days of the year for exactly this reason: it makes one spring comparable with the next. The Woodland Trust's <a href="https://naturescalendar.woodlandtrust.org.uk/what-we-record-and-why/species-we-record/birds/swallow/first-recorded/" target="_blank" rel="noopener">Nature's Calendar</a> asks volunteers to record the first swallow they see each spring, to track how early or late they arrive. In Sol your record and the day count are the same number.</p></div>`
  for (let n = 0; n < 13; n++) {
    const items = BIRDS.filter(b => b[0] === n)
    if (!items.length) continue
    const slug = monthSlug(n)
    const first = new Date(Date.UTC(ORD_YEAR, 0, n * 28 + 1)), last = new Date(Date.UTC(ORD_YEAR, 0, n * 28 + 28))
    const span = `${first.getUTCDate()} ${G_MONTHS[first.getUTCMonth()].slice(0, 3)} – ${last.getUTCDate()} ${G_MONTHS[last.getUTCMonth()].slice(0, 3)}`
    body += `<div class="card${n === 4 ? " gold" : ""}" id="${slug}" data-m="${n}"><div class="muted">MONTH ${n + 1} · ${span}</div><h2>${SOL_MONTHS[n]}</h2>`
    for (const [, txt, src, note] of items) body += `<p>${txt} <a href="${src}" target="_blank" rel="noopener">RSPB</a></p>${note ? `<p class="muted">${note}</p>` : ""}`
    body += `</div>`
  }
  body += `<div class="card"><h2>Keep a Sol bird diary</h2><p>Print the <a href="/routine">same-every-month chart</a> and note first sightings by Sol date. Next year, the same square is the same point in the season.</p><p>Worth recording: first chiffchaff, first swallow, first swift, first cuckoo heard, last swallow seen, first redwing. Add your sightings to <a href="https://naturescalendar.woodlandtrust.org.uk/" target="_blank" rel="noopener">Nature's Calendar</a> too, so they help the science.</p><p class="muted">In leap years, add one to the day count for dates after Leap Day, as you would on the ordinary calendar.</p></div>
<a class="btn" href="/?go=birthday">FIND YOUR TRUE BIRTHDAY</a>`
  body += `<script src="/js/nowmonth.js" defer></script>`
  write("birds.html", page({ path: "/birds", title: "The birding year in 13 months — Sol", description: "Spring arrivals, the dawn chorus peak and winter visitors placed in Sol's 13 four-week months, with every timing sourced from the RSPB.", body }))
  urls.push("/birds")
}

// Bank holidays in England and Wales with names, for the routine page's "Changes coming up" list.
const BH_NAMED = {}
for (let y = 2026; y <= 2031; y++) {
  const names = ["New Year's Day bank holiday", "Good Friday", "Easter Monday", "Early May bank holiday", "Spring bank holiday", "Summer bank holiday", "Christmas bank holiday", "Boxing Day bank holiday"]
  bankHolidays(y).forEach((k, i) => { const sub = (i === 0 && !k.endsWith("-01-01")) || (i === 6 && !k.endsWith("-12-25")) || (i === 7 && !k.endsWith("-12-26")); BH_NAMED[k] = names[i] + (sub ? " (substitute day)" : "") })
}

// ── Routine page (Autism vertical): one printable month that is the same every month
{
  const printCss = `<style>@media print{body{background:#fff!important;color:#000!important}.noprint,nav.foot,.tag{display:none!important}.card{background:#fff!important;border:1px solid #000!important;break-inside:avoid}h1,h2,.muted,td,th,p{color:#000!important}a{color:#000!important}main{max-width:none;padding:0}}
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
<div class="card"><h2>This month, with ordinary dates</h2><p class="muted">The world still runs on the ordinary calendar. This chart shows both: the Sol day in large type, and the ordinary date and weekday underneath. Print it to bridge the two.</p><div id="bridge"></div></div>
<div class="card noprint"><h2>Changes coming up</h2><p class="muted">Changes are easier when they are expected. These are the next fixed changes to the ordinary routine in England and Wales: clock changes and bank holidays.</p><div id="coming"></div>
<p class="muted">The National Autistic Society suggests visual supports such as timetables and calendars to help with change (<a href="https://www.autism.org.uk/advice-and-guidance/topics/communication/communication-tools/visual-supports" target="_blank" rel="noopener">NAS: visual supports</a>).</p></div>
<div class="card"><h2>A word about weekdays</h2><p>Sol has its own weekdays: the 1st of every Sol month is a Monday. Today's ordinary weekday will usually be different. If two different weekdays would be confusing, use Sol as a 28-day pattern (day 1 to day 28) and keep the ordinary weekdays for school, work and appointments. The charts on this page show both, so nothing has to be worked out in your head.</p></div>
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
(function(){try{var M=${JSON.stringify(SOL_MONTHS)},W=${JSON.stringify(WEEKDAYS)},BH=${JSON.stringify(BH_NAMED)};
var DS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],MS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function lp(y){return y%4===0&&(y%100!==0||y%400===0)}
function sol(dt){var y=dt.getFullYear(),L=lp(y),n=Math.round((Date.UTC(y,dt.getMonth(),dt.getDate())-Date.UTC(y,0,1))/864e5)+1;if(n===(L?366:365))return"Year Day";if(L&&n===169)return"Leap Day";var a=L&&n>169?n-1:n,m=Math.ceil(a/28),d=(a-1)%28+1;return W[(d-1)%7]+" "+d+" "+M[m-1]}
var t=new Date();t=new Date(t.getFullYear(),t.getMonth(),t.getDate());var y=t.getFullYear(),L=lp(y),n=Math.round((Date.UTC(y,t.getMonth(),t.getDate())-Date.UTC(y,0,1))/864e5)+1;
var a=L&&n>169?n-1:n;if(n===(L?366:365)||(L&&n===169))a=L&&n===169?168:364;var m=Math.ceil(a/28);
var h='<p style="font-family:Georgia,serif;font-size:20px;color:#F2EEE3;margin:0 0 8px">Sol '+M[m-1]+'</p><table class="cal"><thead><tr>'+W.map(function(w){return"<th>"+w.slice(0,3)+"</th>"}).join("")+"</tr></thead><tbody>";
for(var w=0;w<4;w++){h+="<tr>";for(var i=1;i<=7;i++){var d=w*7+i,base=(m-1)*28+d,dt=new Date(y,0,base+(L&&base>=169?1:0));var today=dt.getTime()===t.getTime();
h+='<td'+(d===13?' class="sat13"':"")+(today?' style="background:rgba(212,160,23,.18)"':"")+'>'+d+'<div style="font-family:system-ui,sans-serif;font-size:12px;color:#9A98AE;line-height:1.3">'+DS[dt.getDay()]+" "+dt.getDate()+" "+MS[dt.getMonth()]+"</div></td>"}h+="</tr>"}
document.getElementById("bridge").innerHTML=h+"</tbody></table>";
var ev=[];for(var yy=y;yy<=y+1;yy++){[2,9].forEach(function(mo){var e=new Date(yy,mo+1,0);e.setDate(e.getDate()-e.getDay());ev.push([e,mo===2?"Clocks go forward one hour (1am becomes 2am). Lighter evenings.":"Clocks go back one hour (2am becomes 1am). Darker evenings."])});ev.push([new Date(yy,11,31),"Year Day: the day outside every Sol week and month."]);if(lp(yy))ev.push([new Date(yy,5,17),"Leap Day: an extra day outside the Sol week."])}
Object.keys(BH).forEach(function(k){var p=k.split("-");ev.push([new Date(+p[0],+p[1]-1,+p[2]),BH[k]])});
ev=ev.filter(function(e){return e[0]>=t}).sort(function(p,q){return p[0]-q[0]}).slice(0,6);
document.getElementById("coming").innerHTML=ev.map(function(e){var dd=Math.round((e[0]-t)/864e5);return'<div style="padding:10px 0;border-bottom:1px solid #34344F"><div style="color:#F2EEE3;font-weight:700">'+e[0].toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})+'</div><div>'+e[1]+'</div><div class="muted">In Sol: '+sol(e[0])+" · "+(dd===0?"today":dd===1?"tomorrow":"in "+dd+" days")+"</div></div>"}).join("");
}catch(e){}})();
`)
  write("routine.html", page({ path: "/routine", title: "A calendar that doesn't change — printable Sol month", description: "Every Sol month is identical: 28 days, Monday to Sunday. Print one chart and use it all year.", body }))
  urls.push("/routine")
}

urls.push("/payday")

// ── About
write("about.html", page({ path: "/about", title: "About Sol — who makes it and why", description: "Sol is a 13-month calendar made by one person in Liverpool: 13 months of 28 days, every date on the same weekday, every year.",
  body: `<h1>About Sol</h1><p class="lead">A calendar where every month is the same four weeks, and your birthday never changes weekday.</p>
<div class="card"><h2>What it is</h2>
<p>Sol is the International Fixed Calendar: 13 months of 28 days, plus one Year Day that belongs to no week. In leap years there is a Leap Day too. Every month starts on a Monday and ends on a Sunday, so the 13th is always a Saturday and Friday the 13th cannot happen.</p>
<p>The design is not ours. Moses Cotsworth, who worked for the North Eastern Railway in York, proposed it in the early 1900s. It is in the public domain: nobody owns it. His version started the week on Sunday; Sol starts on Monday, the international standard today. Cotsworth named the thirteenth month, at midsummer, Sol. The name is his, not ours.</p></div>
<div class="card"><h2>Who makes it</h2>
<p>Sol is made by Stephen Rooney in Liverpool. He spent thirty-five years working on holographic head-up displays, the glass that puts flight data in a pilot's line of sight, for aircraft including the F-16 Fighting Falcon, the Eurofighter Typhoon and the F-22 Raptor.</p>
<p>That work is about showing someone exactly what they need at the moment they need it, with nothing left to work out. A calendar should do the same. The one we all use doesn't: you can't say what weekday a date falls on without looking it up.</p>
<p>There is no company behind Sol and no investors. It is one person, a website and a book.</p></div>
<div class="card"><h2>What we promise</h2>
<p><strong>We never repeat a myth as fact.</strong> Calendar history is full of good stories that turn out to be untrue. Everything here is checked against a source, and the sources for the book are published in full on the <a href="/notes">notes pages</a>. If you find a mistake, tell us and we will fix it.</p>
<p><strong>We don't sell your details.</strong> The birthday you type in stays on your device. See the <a href="/?go=privacy">privacy page</a>.</p>
<p><strong>We are not trying to abolish your calendar.</strong> Sol runs alongside the ordinary one. Use it for a habit, a budget or a birthday and see whether a year that repeats is easier to live in.</p></div>
<div class="card"><h2>Get in touch</h2>
<p>Email <a href="mailto:hello@sol28.co.uk">hello@sol28.co.uk</a>. On social media Sol is @sol28official.</p>
<p class="muted">Sol, Level One, Basecamp Liverpool, 49 Jamaica Street, Liverpool L1 0AH, United Kingdom. SOL28 is the subject of UK trade mark application UK00004474331.</p></div>
<a class="btn" href="/?go=birthday">FIND YOUR TRUE BIRTHDAY</a>` }))
urls.push("/about")

// ── Teachers: one free lesson with a printable worksheet
{
  const head = `<style>.ws{background:#fff;color:#1A1A2E;border-radius:12px;padding:24px;margin:14px 0}.ws h2,.ws h3{color:#1A1A2E;font-family:Georgia,serif}.ws ol li{margin:0 0 14px}.ws .box{border-bottom:1px solid #999;height:26px;margin-top:6px}
.cal7{border-collapse:collapse;width:100%;table-layout:fixed}.cal7 td,.cal7 th{border:1px solid #999;text-align:center;padding:6px 2px;font-family:Georgia,serif;color:#1A1A2E}
@media print{@page{size:A4;margin:12mm}body{background:#fff!important}main>*:not(.ws){display:none!important}.ws{padding:0;margin:0}.ws ol li{margin-bottom:6px}.ws .box{height:18px}.ws p{margin:4px 0}.ws h2{margin:0 0 6px}.cal7 td,.cal7 th{padding:3px 2px}.ws.answers{break-before:page}}</style>`
  const grid = `<table class="cal7"><tr>${WEEKDAYS.map(w => `<th>${w.slice(0, 3)}</th>`).join("")}</tr>${[0, 1, 2, 3].map(r => `<tr>${[1, 2, 3, 4, 5, 6, 7].map(i => `<td>${r * 7 + i}</td>`).join("")}</tr>`).join("")}</table>`
  const body = `<h1>For teachers: design a better calendar</h1><p class="lead">A free, ready-to-teach lesson. One hour, ages 9 to 14, no preparation beyond printing the worksheet.</p>
<div class="card"><h2>What pupils do</h2><p>They find out why their birthday lands on a different weekday every year, using division with remainders, then design a calendar where it never moves. Along the way they meet a real calendar used by a whole country, and a retail calendar that big shops use today.</p>
<p><strong>Maths practised:</strong> division with remainders, multiples of 7, multiplication, reasoning and explaining. <strong>Also good for:</strong> history (how calendars are made), debate and persuasive speaking.</p></div>
<div class="card"><h2>Lesson plan</h2>
<p><strong>Starter, 10 minutes.</strong> Ask: "What day of the week was your birthday this year? What will it be next year?" Pupils check on a calendar or phone. Most move on by one day; some by two. Why?</p>
<p><strong>Explain, 5 minutes.</strong> A year has 365 days. 365 ÷ 7 = 52 remainder 1. Fifty-two whole weeks fit, and one day is left over, so every date slides one weekday each year. In a leap year there are two left over.</p>
<p><strong>Design challenge, 20 minutes.</strong> "Design a calendar where every month holds whole weeks, so dates never change weekday." Pupils test month lengths. 30 days? Not a multiple of 7. 28 days is exactly four weeks, and 13 × 28 = 364, one short of a year. One spare day is left: what should happen to it? Groups decide and justify.</p>
<p><strong>Reveal, 10 minutes.</strong> This design is real. In the early 1900s Moses Cotsworth, who worked for the North Eastern Railway in York, proposed 13 months of 28 days plus one extra day belonging to no week. He called the extra month Sol. Then show:</p>
<ul><li>Ethiopia uses a calendar with 13 months today: twelve of 30 days, and a short thirteenth.</li><li>Many big retailers report on a 4-4-5 calendar: each quarter is 13 weeks, split 4, 4 and 5.</li><li>Kodak ran 13 equal 28-day accounting periods, 1928–1989; employees lived by the Gregorian calendar.</li></ul>
<p><strong>Plenary, 15 minutes.</strong> Debate: should we switch? For: birthdays and dates never change weekday; every month the same length. Against: 13 is a prime number, so the year no longer splits into halves or quarters of whole months; and some people object that a day outside the week breaks the seven-day cycle. Vote at the end.</p></div>
<div class="card"><h2>Extension ideas</h2><p>Use the <a href="/?go=birthday">True Birthday</a> tool to convert pupils' birthdays. Look up any date at <a href="/dates">every date</a>. Read short sourced answers on the <a href="/facts">facts pages</a>. For a maths-and-nature follow-up, the <a href="/birds">birding year</a> shows how scientists count days of the year.</p>
<p class="muted">Free to print and use in your classroom. We'd love to hear how it went, and what to improve: hello@sol28.co.uk.</p>
<button class="btn noprint" style="width:100%;border:0;cursor:pointer;font-size:14px" id="printws">PRINT THE WORKSHEET</button></div>
<div class="ws"><h2>Design a better calendar</h2><p>Name: ______________________</p>
<ol>
<li>A normal year has 365 days. How many whole weeks is that, and how many days are left over?<div class="box"></div></li>
<li>A leap year has 366 days. How many days are left over after the whole weeks?<div class="box"></div></li>
<li>Your birthday is on a Tuesday this year. There is no 29 February before your next birthday. What day will it be next year?<div class="box"></div></li>
<li>A calendar has 13 months of 28 days. How many days is that? How many days are left over in a normal year?<div class="box"></div></li>
<li>In this calendar every month starts on a Monday. Use the grid to answer: what weekday is the 13th? What weekday is the 25th?${grid}<div class="box"></div></li>
<li>Can Friday the 13th ever happen in this calendar? Explain why.<div class="box"></div><div class="box"></div></li>
<li>13 is a prime number. Why might that be a problem for a business that reports every quarter (every three months)?<div class="box"></div><div class="box"></div></li>
<li>Challenge: design your own calendar for 365 days. How many months? How long is each? What happens to any spare days?<div class="box"></div><div class="box"></div><div class="box"></div></li>
</ol><p style="font-size:12px;color:#555">sol28.co.uk · Time, fixed.</p></div>
<div class="ws answers"><h3>Answers for teachers</h3><ol>
<li>52 weeks, 1 day left over (365 = 52 × 7 + 1).</li><li>2 days left over (366 = 52 × 7 + 2).</li><li>Wednesday.</li><li>364 days; 1 day left over.</li><li>The 13th is a Saturday. The 25th is a Thursday.</li>
<li>No. Every 13th is a Saturday, in every month, every year.</li><li>Thirteen months can't be split into four equal quarters of whole months. Businesses that want equal quarters use 13 weeks instead (4 + 4 + 5 weeks).</li><li>Any reasoned answer. Look for months built from whole weeks and a clear rule for spare days.</li></ol></div>
<script src="/js/teachers.js" defer></script>`
  writeFileSync(join(OUT, "js/teachers.js"), `(function(){var b=document.getElementById("printws");if(b)b.addEventListener("click",function(){window.print()})})();`)
  write("teachers.html", page({ path: "/teachers", title: "Free calendar maths lesson: design a better calendar — Sol", description: "A free one-hour lesson for ages 9 to 14: why birthdays change weekday, division with remainders, and designing a 13-month calendar. Printable worksheet and answers.", body, head }))
  urls.push("/teachers")
}

// ── Fact pages: one checked fact per page, each with its source. Only facts marked safe in the project's claim rules go here.
{
  const FACTS = [
    { slug: "friday-the-13th", q: "Can Friday the 13th happen in a 13-month calendar?", a: "Not in Sol. The 13th is always a Saturday.",
      p: ["Every Sol month starts on a Monday and has exactly 28 days, so each date keeps the same weekday in every month of every year. The 13th always lands on a Saturday.", "Moses Cotsworth's original version started the week on Sunday. In his calendar the 13th fell on a Friday in all thirteen months: thirteen Friday the 13ths a year. Sol's Monday start removes every one of them."],
      src: "Arithmetic: 28 days is exactly four weeks. Monday start follows ISO 8601, the international standard for dates.", more: ["/friday13", "Friday the 13th in Sol"] },
    { slug: "kodak", q: "Did Kodak really use a 13-month calendar?", a: "Not quite. Kodak ran 13 equal 28-day accounting periods, 1928–1989.",
      p: ["Kodak ran 13 equal 28-day accounting periods, 1928–1989; employees lived by the Gregorian calendar.", "The periods were a tool for the company's books: every period the same length, so one could be compared fairly with the next. You will sometimes read that the whole company lived on a different calendar. As far as we can tell, day-to-day life at Kodak ran on ordinary dates, and the 13 periods were used for the accounts. We are still researching this, and will update this page if we learn more."],
      src: "Kodak's own period calendars for 1985 to 1990, and an Associated Press report of 11 September 1988 on the company's move to the ordinary calendar.", more: ["/notes", "Sources for the book"] },
    { slug: "retail-4-4-5", q: "Do big shops already use a different calendar?", a: "Yes. Many retailers report on a 4-4-5 calendar, not on ordinary months.",
      p: ["In a 4-4-5 calendar each quarter is three periods of four, four and five weeks. Every quarter is exactly 13 weeks and every period starts on the same weekday, so this year's trading can be compared with last year's week for week.", "The US National Retail Federation publishes a version, arranged 4-5-4. Walmart, Tesco and Marks & Spencer are among the retailers that use this kind of calendar, and accounting software from SAP, Oracle and QuickBooks supports it. The ordinary month is awkward enough that some of the largest businesses in the world don't use it to compare their trading."],
      src: "National Retail Federation 4-5-4 calendar; company annual reports; vendor documentation.", more: ["/payday", "The Payday Calendar"] },
    { slug: "ethiopia", q: "Does any country use 13 months today?", a: "Yes. Ethiopia's calendar has 13 months.",
      p: ["Ethiopia's calendar has twelve months of 30 days and a short thirteenth month. Its year count also runs seven or eight years behind the one used in most of the world.", "It is a different design from Sol, which has 13 months of 28 days. But it shows that a country can run on thirteen months without difficulty."],
      src: "The Ethiopian calendar as used in Ethiopia today.", more: ["/ethiopia", "Convert a date to the Ethiopian calendar"] },
    { slug: "igbo", q: "Was the 13 × 28 calendar invented more than once?", a: "Yes. The Igbo of Nigeria developed a 13 × 28 structure independently.",
      p: ["The traditional Igbo calendar divides the year into thirteen months of 28 days. It was developed in what is now Nigeria, with no connection to Cotsworth or to European calendar reform.", "When separate peoples arrive at the same structure, it suggests the structure follows from the arithmetic: 13 times 28 is 364, one day short of a year."],
      src: "The traditional Igbo calendar.", more: ["/months", "The 13 months of Sol"] },
    { slug: "month-and-moon", q: "Are the words month and moon related?", a: "Yes. Month, moon and measure share one ancient root.",
      p: ["Linguists trace moon, month, menses, measure, metre and meniscus back to a single Proto-Indo-European root, written *me-, to do with measuring.", "The Moon was the first clock most people had. The word for it and the word for measuring grew from the same place."],
      src: "Standard etymological dictionaries, under the Proto-Indo-European root *me-.", more: ["/?go=birthday", "See the Moon on the day you were born"] },
    { slug: "history-his-story", q: "Does history mean 'his story'?", a: "No. That is a false etymology.",
      p: ["History comes from the Greek historia, meaning inquiry. It has nothing to do with the English word his.", "It is a neat line and it gets repeated a great deal. It is also untrue, which is why it is on this page: Sol does not repeat a myth as fact, even a popular one."],
      src: "Greek historia, 'inquiry', in any standard etymological dictionary.", more: ["/about", "What Sol promises"] },
    { slug: "league-of-nations", q: "How many calendar reforms were proposed to the League of Nations?", a: "185 schemes.",
      p: ["In the 1920s the League of Nations set up a committee to look at reforming the calendar. It received 185 different schemes.", "You will sometimes read that one plan was judged the best of 130, or of 150. The contemporary report gives 185, so that is the number we use."],
      src: "Nature, 27 November 1926, reporting the League of Nations' 1926 report.", more: ["/notes", "Sources for the book"] },
    { slug: "who-named-sol", q: "Where does the month name Sol come from?", a: "Moses Cotsworth chose it himself.",
      p: ["Cotsworth's calendar needed a name for its extra month, placed at midsummer between June and July. He called it Sol, the Latin word for the Sun.", "So the name of this website is his, not ours. He proposed the calendar in the early 1900s and it is in the public domain."],
      src: "Finding aid to the Moses B. Cotsworth papers, University of British Columbia Library, Rare Books and Special Collections.", more: ["/about", "About Sol"] },
  ]
  const list = FACTS.map(f => `<a class="card" href="/facts/${f.slug}" style="display:block;text-decoration:none"><div class="muted">${esc(f.q)}</div><div class="big" style="font-size:20px">${esc(f.a)}</div></a>`).join("")
  write("facts.html", page({ path: "/facts", title: "Calendar facts, checked — Sol", description: "Short answers to calendar questions, each with its source. Kodak, Friday the 13th, Ethiopia's 13 months and more.",
    body: `<h1>Calendar facts, checked</h1><p class="lead">One question per page, a short answer and where it comes from. We never repeat a myth as fact.</p>${list}<a class="btn" href="/?go=birthday">FIND YOUR TRUE BIRTHDAY</a>` }))
  urls.push("/facts")
  for (const f of FACTS) {
    const others = FACTS.filter(o => o !== f).slice(0, 8).map(o => `<li><a href="/facts/${o.slug}">${esc(o.q)}</a></li>`).join("")
    const ld = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: `${f.a} ${f.p[0]}` } }] }).replace(/</g, "\\u003c")}</script>`
    write(`facts/${f.slug}.html`, page({ path: `/facts/${f.slug}`, title: `${f.q} — Sol`, description: `${f.a} ${f.p[0]}`.slice(0, 155), head: ld,
      body: `<p class="muted"><a href="/facts">All facts</a></p><h1>${esc(f.q)}</h1><div class="card gold"><div class="big" style="font-size:24px">${esc(f.a)}</div></div>${f.p.map(x => `<p>${esc(x)}</p>`).join("")}<p class="muted">Source: ${esc(f.src)}</p><a class="btn" href="${f.more[0]}">${esc(f.more[1].toUpperCase())}</a><div class="card"><h2>More facts</h2><ul>${others}</ul></div>` }))
    urls.push(`/facts/${f.slug}`)
  }
}

// ── Today in Sol badge (the only page other sites are allowed to frame; see vercel.json) and its instructions
{
  mkdirSync(join(OUT, "js"), { recursive: true })
  writeFileSync(join(OUT, "js/badge.js"), `(function(){try{var M=${JSON.stringify(SOL_MONTHS)},W=${JSON.stringify(WEEKDAYS)};var t=new Date(),y=t.getFullYear(),L=(y%4===0&&(y%100!==0||y%400===0));
var n=Math.round((Date.UTC(y,t.getMonth(),t.getDate())-Date.UTC(y,0,1))/864e5)+1,s;
if(n===(L?366:365))s="Year Day";else if(L&&n===169)s="Leap Day";else{var a=L&&n>169?n-1:n,m=Math.ceil(a/28),d=(a-1)%28+1;s=W[(d-1)%7]+" "+d+" "+M[m-1];}
document.getElementById("sol").textContent=s;
document.getElementById("greg").textContent=t.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"})+" on the ordinary calendar";}catch(e){}})();
`)
  write("badge.html", `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Today in the Sol calendar</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE}/embed">
<style>html,body{margin:0;height:100%}body{background:#1A1A2E;color:#D6D3C9;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;text-align:center}
a{display:block;padding:14px 16px;color:inherit;text-decoration:none;border:1px solid #D4A017;border-radius:12px;width:100%;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center}
.t{font-size:12px;letter-spacing:3px;color:#D4A017;font-weight:700}.d{font-family:Georgia,"Times New Roman",serif;font-size:24px;color:#F2EEE3;font-weight:700;margin:4px 0}.g{font-size:13px;color:#9A98AE}</style></head>
<body><a href="${SITE}/?go=birthday" target="_blank" rel="noopener"><div class="t">TODAY IN SOL</div><div class="d" id="sol">The 13-month calendar</div><div class="g" id="greg">sol28.co.uk</div></a><script src="/js/badge.js" defer></script></body></html>`)
  const code = `<iframe src="${SITE}/badge" title="Today in the Sol calendar" width="280" height="120" style="border:0;max-width:100%" loading="lazy"></iframe>`
  write("embed.html", page({ path: "/embed", title: "Put today's Sol date on your website", description: "A free badge showing today's date in the 13-month Sol calendar. Copy one line of code into any website or blog.",
    body: `<h1>Put today's Sol date on your site</h1><p class="lead">A small badge that shows today's date in the 13-month calendar. It updates itself every day. Free to use.</p>
<div class="card"><h2>What it looks like</h2><iframe src="/badge" title="Today in the Sol calendar" width="280" height="120" style="border:0;max-width:100%"></iframe></div>
<div class="card"><h2>The code</h2><p>Copy this one line and paste it into your page wherever you want the badge. In WordPress use a Custom HTML block; most other site builders have an Embed or Code block that does the same job.</p>
<textarea readonly rows="5" style="width:100%;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;background:var(--navy);color:var(--white);border:1px solid var(--line);border-radius:8px;padding:10px">${esc(code)}</textarea>
<p class="muted">The badge sets no cookies and collects nothing about your visitors. Tapping it opens sol28.co.uk in a new tab.</p></div>
<div class="card"><h2>Rather just link?</h2><p>A plain link to <a href="/">sol28.co.uk</a> is always welcome. If you run a school, club or blog and want something different, a larger size or a month view, email hello@sol28.co.uk.</p></div>` }))
  urls.push("/embed")
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
    body: `<a class="card gold" href="/shop" style="display:block;text-decoration:none"><div class="muted">THE BOOK</div><div class="big" style="font-size:22px">Still Ruled by Rome</div><p style="margin:6px 0 0">These are the sources. The story is in the book: how an empire set the calendar you live by. <span style="color:var(--gold);font-weight:700">Get the book →</span></p></a><h1>Sources and notes</h1><p class="lead">${esc(notes.book)}</p><p>${esc(notes.intro)}</p><ol class="plain">${idx}</ol>` }))
  for (const c of notes.chapters) {
    write(`notes/${c.n}.html`, page({ path: `/notes/${c.n}`, title: `${c.title} — sources — Sol`, description: `Sources and further reading for ${c.title} of Still Ruled by Rome.`,
      body: `<a class="card gold" href="/shop" style="display:block;text-decoration:none"><div class="muted">THE BOOK</div><div class="big" style="font-size:22px">Still Ruled by Rome</div><p style="margin:6px 0 0">These are the sources. The story is in the book: how an empire set the calendar you live by. <span style="color:var(--gold);font-weight:700">Get the book →</span></p></a><p class="muted"><a href="/notes">All chapters</a></p><h1>${esc(c.title)}</h1><p>${esc(notes.intro)}</p><ol>${c.sources.map(li).join("")}</ol>` }))
    urls.push(`/notes/${c.n}`)
  }
  urls.push("/notes")
  writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}${u}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`).join("\n")}\n</urlset>\n`)
}

// ── App tabs at their own addresses (/today, /convert, /terms …): serve the app shell there too,
// so links to these pages work when shared, bookmarked or opened fresh.
{
  const shell = readFileSync(join(OUT, "index.html"), "utf8")
  for (const p of ["today", "convert", "birthday", "history", "shop", "waitlist", "privacy", "terms", "payday", "certificate", "ig", "tt", "fb", "x", "yt"]) writeFileSync(join(OUT, `${p}.html`), shell)
}
