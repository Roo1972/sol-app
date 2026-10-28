// Writes static, search-friendly pages into dist/ after the app is built:
//   /date/<day>-<month>  — 366 pages, one per Gregorian date
//   /month/<sol-month>   — 13 pages, one per Sol month
//   /dates, /months      — hub pages
//   /lost-days           — the seven times days vanished
//   sitemap.xml, robots.txt
// Every fact used here must have a Verified row in the Sol Claim Registry.

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

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
nav.foot{margin-top:32px;font-size:14px;color:var(--muted);display:flex;flex-wrap:wrap;gap:14px}`

function page({ path, title, description, body }) {
  return `<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}"><meta property="og:type" content="website"><meta property="og:site_name" content="Sol">
<meta name="theme-color" content="#1A1A2E"><link rel="icon" href="/icon-192.png"><link rel="manifest" href="/manifest.json">
<style>${css}</style>
</head><body><main>
<a class="tag" href="/">SOL</a>
${body}
<nav class="foot"><a href="/?go=birthday">Find your True Birthday</a><a href="/dates">Every date</a><a href="/months">The 13 months</a><a href="/lost-days">Lost Days</a><a href="/garden">Gardening</a><a href="/?go=privacy">Privacy</a></nav>
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
    write(`date/${slug(d, m)}.html`, page({ path, title: `${g} in the 13-month calendar — Sol date and weekday`, description: desc, body }))
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

// ── Lost Days
{
  const events = [
    ["46 BC", "The 445-day year", "To pull the Roman calendar back into line with the seasons before his reform began, Julius Caesar stretched one year to 445 days. Romans called it the Year of Confusion.", "https://en.wikipedia.org/wiki/46_BC"],
    ["1582", "Ten days deleted", "Pope Gregory XIII's reform made Thursday 4 October followed by Friday 15 October in Spain, Portugal, the Italian states and Poland–Lithuania. France followed that December.", "https://en.wikipedia.org/wiki/Adoption_of_the_Gregorian_calendar"],
    ["1712", "Sweden's 30 February", "Sweden had tried to drift into the new calendar gradually, then abandoned the plan. Returning to the old calendar needed one extra day, so 1712 had a 30 February.", "https://en.wikipedia.org/wiki/List_of_adoption_dates_of_the_Gregorian_calendar_by_country"],
    ["1752", "Britain loses 11 days", "Wednesday 2 September was followed by Thursday 14 September. The tax year was stretched by 11 days to protect revenue, which is why it now starts on 6 April.", "https://theconversation.com/why-the-uk-tax-year-starts-on-april-6-57247"],
    ["1872", "Japan jumps to January", "Japan left its traditional calendar on the 2nd day of the 12th month of 1872; the next day became 1 January 1873.", "https://en.wikipedia.org/wiki/List_of_adoption_dates_of_the_Gregorian_calendar_by_country"],
    ["1918", "Russia skips 13 days", "31 January 1918 was followed by 14 February.", "https://en.wikipedia.org/wiki/List_of_adoption_dates_of_the_Gregorian_calendar_by_country"],
    ["1923", "Greece, the last in Europe", "15 February 1923 was followed by 1 March, completing Europe's switch more than 340 years after it began.", "https://en.wikipedia.org/wiki/List_of_adoption_dates_of_the_Gregorian_calendar_by_country"],
  ]
  let body = `<h1>Lost Days</h1><p>Seven times the calendar simply skipped — or added — days. Each one was a fix for a system that drifts. Sol is built so it never needs another.</p><div class="tl">`
  for (const [yr, t, txt, src] of events) body += `<div class="card"><div class="muted">${yr}</div><h2>${t}</h2><p>${txt}</p><p class="muted"><a href="${src}" rel="noopener">Source</a></p></div>`
  body += `</div><a class="btn" href="/?go=birthday">FIND YOUR TRUE BIRTHDAY</a>`
  write("lost-days.html", page({ path: "/lost-days", title: "Lost Days: seven times the calendar skipped — Sol", description: "From Caesar's 445-day year to Greece's 1923 switch: the seven times whole days vanished from the calendar.", body }))
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
const hm = h => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}m`
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

// ── Sitemap and robots
const today = new Date().toISOString().slice(0, 10)
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`)
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`)
console.log(`Wrote ${urls.length - 1} pages + sitemap`)
