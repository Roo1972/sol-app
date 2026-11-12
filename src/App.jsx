import React, { useState, useEffect } from 'react'
import { bookDatesFor } from './bookdates.js'
import { sunAngle, moonInfo, solarReturn } from './sky.js'
import { schedule, doubleMonths, extraPaydayPeriods, solRuns, toICS, key as dayKey } from './payday.js'
import { toEthiopian, IFC_MONTHS, WEEKDAYS, SHORT_WD, MONTH_NAMES, ordinal, fmtDate, countFriday13ths, daysUntil, isLeapYear, doy, toIFC } from './engine.js'

// ═══ IFC ENGINE (src/engine.js) ═══
function sharedBirthday() {
  try {
    const q = new URLSearchParams(window.location.search)
    // New links carry the Sol date itself (/b/<key> → ?sb=<key>), so leap-year births come out right.
    const sb = q.get("sb")
    if (sb) {
      if (sb === "year-day" || sb === "leap-day") { const special = sb === "year-day" ? "Year Day" : "Leap Day"; return { ifc: { month: special, monthNum: 0, day: 0, weekday: "Outside the week", special } } }
      const m = /^([a-z]+)-(\d{1,2})$/.exec(sb)
      const mi = m ? IFC_MONTHS.findIndex(x => x.toLowerCase() === m[1]) : -1
      const day = m ? Number(m[2]) : 0
      if (mi < 0 || day < 1 || day > 28) return null
      return { ifc: { month: IFC_MONTHS[mi], monthNum: mi + 1, day, weekday: WEEKDAYS[(day - 1) % 7], special: null } }
    }
    // Older links: ?bd=MM-DD (read as an ordinary year)
    const bd = q.get("bd")
    if (!bd || !/^\d{2}-\d{2}$/.test(bd)) return null
    const [mo, da] = bd.split("-").map(Number)
    const d = new Date(2027, mo - 1, da, 12)
    if (d.getMonth() !== mo - 1) return null
    return { ifc: toIFC(d) }
  } catch { return null }
}

// ═══ FACT OF THE DAY ═══
// Only claims marked VERIFIED (or registry-approved corrected wording) in the Sol Claim Registry,
// plus the project's canonical facts. Do not add a line here without a registry row.
const FACTS = [
  ["Fact", "September is named from the Latin for seven, but it's the ninth month. October, November and December are each two places out too."],
  ["Fact", "July and August were renamed, not added: Quintilis became Julius in 44 BC, and Sextilis became Augustus in 8 BC."],
  ["Myth", "The story that Augustus took a day from February for his own month is disputed. February's 28 days probably date to the reform of Numa Pompilius, centuries earlier."],
  ["Fact", "In 1582 Pope Gregory XIII's reform made Thursday 4 October followed by Friday 15 October. Ten dates never happened."],
  ["Fact", "Britain waited until 1752: Wednesday 2 September was followed by Thursday 14 September."],
  ["Fact", "The UK tax year starts on 6 April because of the 1752 calendar change — first moved to 5 April, then to 6 April in 1800."],
  ["Fact", "Sweden had a 30 February, in 1712, while undoing a botched switch between calendars."],
  ["Fact", "Russia switched calendars in 1918: 31 January was followed by 14 February."],
  ["Fact", "Japan adopted the Gregorian calendar at the start of 1873, jumping from early December straight to 1 January."],
  ["Fact", "To put the seasons back in place before his reform, Julius Caesar stretched 46 BC to about 445 days. Ancient writers disagree slightly: Censorinus says 445, Macrobius 443."],
  ["Fact", "In the early 1900s Moses Cotsworth proposed the International Fixed Calendar: 13 months of exactly 28 days."],
  ["Fact", "Cotsworth founded the International Fixed Calendar League in 1922 to campaign for 13 months."],
  ["Fact", "Kodak ran 13 equal 28-day accounting periods, 1928–1989; employees lived by the Gregorian calendar."],
  ["Fact", "Religious leaders objected to the 13-month calendar because Year Day sits outside the week and would break the weekly Sabbath cycle."],
  ["Fact", "In a 13-month calendar of 28-day months, every date falls on the same weekday every year."],
  ["Fact", "Year Day and Leap Day belong to no week at all — they have no weekday."],
  ["Fact", "In Sol the 13th of every month is a Saturday, so Friday the 13th can never happen."],
  ["Fact", "Cotsworth's original calendar began every month on a Sunday, so it had a Friday the 13th in all thirteen months. Sol shifted the week by one day and abolished it."],
  ["Fact", "Ethiopia uses a 13-month calendar today: twelve months of 30 days and a short thirteenth."],
  ["Fact", "The Igbo of Nigeria independently developed a calendar built on 13 months of 28 days."],
  ["Fact", "Moon, month, measure, metre and menses all trace back to one ancient root, *me-, to measure."],
  ["Myth", "'History' doesn't come from 'his story'. It comes from the Greek historia, meaning inquiry."],
  ["Myth", "'Hours' has nothing to do with the god Horus. It comes from the Greek hōra."],
  ["Fact", "Walmart and much of US retail plan their year on the 4-5-4 calendar: months of four, five and four weeks, so every quarter is exactly 13 weeks."],
  ["Fact", "The Ishango bone from the Congo, around 20,000 years old, may be one of the oldest calendar objects ever found."],
  ["Myth", "Railway gauge does not come from Roman chariot ruts. Snopes rates the story false; the similar width is coincidence."],
  ["Myth", "There's no evidence QWERTY was designed to slow typists down. Its patent never mentions jamming."],
  ["Myth", "'Salary' is related to the Latin for salt, but no ancient source says Roman soldiers were paid in salt."],
]
function factOfDay(date) {
  const start = Date.UTC(date.getFullYear(), 0, 0)
  const n = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000) + date.getFullYear() * 7
  return FACTS[n % FACTS.length]
}

// ═══ STYLES ═══
const G = "#D4A017", NAVY = "#1A1A2E", D = "#1A1A2E", BG = "#22223A", BD = "#34344F", T = "#D6D3C9", W = "#F2EEE3", M = "#9A98AE"
const SERIF = "Georgia, 'Times New Roman', serif"

const container = { background: D, minHeight: "100vh", fontFamily: "'Segoe UI','Helvetica Neue',sans-serif", color: T }
const wrap = { maxWidth: 540, margin: "0 auto", padding: "20px 16px" }
const card = { background: BG, border: `1px solid ${BD}`, borderRadius: 12, padding: "20px", marginBottom: 12 }
const goldCard = { ...card, border: `1px solid ${G}`, background: "rgba(212,160,23,0.05)" }
const btn = { background: G, color: D, border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 1, width: "100%" }
const btnOutline = { ...btn, background: "transparent", color: G, border: `1px solid ${G}` }
const input = { width: "100%", padding: "12px 16px", fontSize: 16, background: "#15152A", border: `1px solid ${BD}`, borderRadius: 8, color: W, boxSizing: "border-box" }
const navBtn = (active) => ({ background: active ? G : "transparent", color: active ? D : M, border: "none", padding: "8px 0", fontSize: 11, fontWeight: 700, cursor: "pointer", flex: 1, letterSpacing: 1 })
const label = { fontSize: 11, color: M, letterSpacing: 2, fontWeight: 700, marginBottom: 8, display: "block" }
const h1 = { fontSize: 26, fontWeight: 700, color: W, marginBottom: 4, fontFamily: SERIF }
const h2 = { fontSize: 19, fontWeight: 700, color: W, marginBottom: 12, fontFamily: SERIF }
const sub = { fontSize: 13, color: M }
const gold = { color: G }
const tag = { fontSize: 10, letterSpacing: 4, color: G, fontWeight: 700 }

// ═══ PAGES ═══

function HomePage() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i) }, [])
  const ifc = toIFC(now)
  const greg = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={{ ...h1, fontSize: 28, marginTop: 8 }}>Today</h1>
      </div>

      <div style={goldCard}>
        <div style={label}>SOL</div>
        {ifc.special ? (
          <div style={{ fontSize: 28, fontWeight: 900, color: G }}>{ifc.special}</div>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 900, color: W }}>{ifc.weekday}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: G }}>{ifc.day} {ifc.month}</div>
            <div style={{ ...sub, marginTop: 8 }}>Month {ifc.monthNum} of 13 · Day {ifc.day} of 28 · Week {Math.ceil(ifc.day/7)}</div>
            {(() => {
              const gw = now.toLocaleDateString('en-GB', { weekday: 'long' })
              const n = ifc.day, s = (n % 10 === 1 && n !== 11) ? 'st' : (n % 10 === 2 && n !== 12) ? 'nd' : (n % 10 === 3 && n !== 13) ? 'rd' : 'th'
              return (
                <div style={{ fontSize: 14, color: T, marginTop: 12, lineHeight: 1.5 }}>
                  Every {n}{s} is a {ifc.weekday} in Sol. Forever.{' '}
                  {gw === ifc.weekday ? 'Today the two calendars happen to agree.' : `That's why it isn't ${gw}.`}
                  <a href="/birthday" style={{ display: "block", marginTop: 8, color: G, fontWeight: 700, textDecoration: "none" }}>Your birthday works the same way. Find yours →</a>
                </div>
              )
            })()}
          </>
        )}
      </div>

      <div style={card}>
        <div style={label}>GREGORIAN</div>
        <div style={{ fontSize: 16, color: T }}>{greg}</div>
        <div style={{ ...sub, marginTop: 4 }}>Day {ifc.doy} of {isLeapYear(now.getFullYear()) ? 366 : 365}</div>
      </div>

      <a href="/ethiopia" style={{ ...card, display: "block", textDecoration: "none", marginBottom: 12 }}>
        <div style={label}>ETHIOPIA · ALSO 13 MONTHS</div>
        <div style={{ fontSize: 16, color: T }}>{(e => `${e.day} ${e.monthName} ${e.year}`)(toEthiopian(now))}</div>
        <div style={{ ...sub, marginTop: 4 }}>Twelve months of 30 days, and Pagume. See how it compares →</div>
      </a>

      <a href="/calendar" style={{ ...goldCard, display: "block", textDecoration: "none", marginBottom: 12, textAlign: "center" }}>
        <div style={label}>NEW</div>
        <div style={{ fontSize: 17, color: W, fontFamily: SERIF }}>Put Sol in your calendar</div>
        <div style={{ ...sub, marginTop: 4 }}>Today's Sol date in Google, Apple or Outlook, every day →</div>
      </a>

      <div style={card}>
        <div style={label}>THIS SOL MONTH</div>
        <MiniGrid day={ifc.day} />
      </div>

      {(() => { const [kind, text] = factOfDay(now); return (
        <div style={card}>
          <div style={label}>{kind === "Myth" ? "MYTH OF THE DAY" : "FACT OF THE DAY"}</div>
          <p style={{ fontSize: 15, color: W, lineHeight: 1.6, fontFamily: SERIF }}>{text}</p>
          <p style={{ fontSize: 11, color: M, marginTop: 8 }}>Checked against the Sol Claim Registry. We never repeat a myth as fact.</p>
        </div>) })()}

      <div style={{ ...card, textAlign: "center" }}>
        <div style={label}>COUNTDOWN</div>
        {(() => { const d = daysUntil(new Date(now.getFullYear(), 11, 31), now); return d <= 0 ? (
          <div style={{ fontSize: 28, fontWeight: 700, color: G, fontFamily: SERIF }}>Today is Year Day</div>
        ) : (<>
          <div style={{ fontSize: 34, fontWeight: 700, color: G, fontFamily: SERIF }}>{d.toLocaleString("en-GB")} {d === 1 ? "day" : "days"}</div>
          <p style={{ ...sub, marginTop: 6, lineHeight: 1.6 }}>until Year Day, 31 December: the one day of the year that belongs to no month and no week.</p>
        </>) })()}
      </div>

      <div style={{ ...card, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: M, lineHeight: 1.6, fontStyle: "italic" }}>
          Cotsworth's original calendar started every month on a Sunday, so it had a Friday the 13th in every single month. Sol starts on a Monday instead: the 13th is always a Saturday, and Friday the 13th can never happen. Your birthday falls on the same day of the week every year. Forever.
        </p>
      </div>
    </div>
  )
}

function MiniGrid({ day }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 9 }}>
      {SHORT_WD.map(d => <div key={d} style={{ color: G, textAlign: "center", fontWeight: 700 }}>{d[0]}</div>)}
      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
        <div key={d} style={{
          textAlign: "center", padding: "3px 0", borderRadius: 4, fontSize: 10, fontWeight: d === day ? 700 : 400,
          background: d === day ? G : "transparent", color: d === day ? D : M
        }}>{d}</div>
      ))}
    </div>
  )
}

function ConverterPage() {
  const [dateStr, setDateStr] = useState("")
  const [result, setResult] = useState(null)

  const convert = () => {
    if (!dateStr) return
    const d = new Date(dateStr + "T12:00:00")
    if (isNaN(d)) return
    const ifc = toIFC(d)
    setResult({ date: d, ifc })
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>Date Converter</h1>
        <p style={sub}>Any date → its Sol equivalent</p>
      </div>

      <div style={card}>
        <label style={label}>GREGORIAN DATE</label>
        <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} style={input} />
        <button onClick={convert} style={{ ...btn, marginTop: 12 }}>CONVERT</button>
      </div>

      {result && (
        <div style={goldCard}>
          <div style={label}>SOL DATE</div>
          {result.ifc.special ? (
            <div style={{ fontSize: 24, fontWeight: 900, color: G }}>{result.ifc.special}</div>
          ) : (
            <>
              <div style={{ fontSize: 24, fontWeight: 900, color: W }}>{result.ifc.weekday} {result.ifc.day} {result.ifc.month}</div>
              <div style={{ ...sub, marginTop: 8 }}>Month {result.ifc.monthNum} of 13 · Day {result.ifc.doy} of year</div>
            </>
          )}
        </div>
      )}

      <p style={{ textAlign: "center", margin: "8px 0 0" }}><a href="/dates" style={{ color: G, fontSize: 14 }}>Browse every date in Sol →</a></p>

      <a href="/payday" style={{ ...goldCard, display: "block", marginTop: 24, textDecoration: "none" }}>
        <div style={{ ...h2, marginBottom: 6 }}>The Payday Calendar →</div>
        <p style={{ ...sub, lineHeight: 1.6 }}>PIP, State Pension, Universal Credit or four-weekly wages? See every payment for the next 12 months: the early ones, the long waits, and the months with two.</p>
      </a>
    </div>
  )
}

// ═══ THE PAYDAY CALENDAR ═══ Dates only: no amounts, nothing stored, nothing sent.
const PAY_TYPES = [
  { id: "pip", name: "PIP", every: 28 },
  { id: "sp", name: "State Pension", every: 28 },
  { id: "aa", name: "Attendance Allowance", every: 28 },
  { id: "dla", name: "Disability Living Allowance", every: 28 },
  { id: "pc", name: "Pension Credit", every: 28 },
  { id: "cb", name: "Child Benefit", every: 28 },
  { id: "ca", name: "Carer's Allowance (paid every 4 weeks)", short: "Carer's Allowance", every: 28 },
  { id: "esa", name: "Employment and Support Allowance", short: "ESA", every: 14 },
  { id: "jsa", name: "Jobseeker's Allowance", every: 14 },
  { id: "uc", name: "Universal Credit", every: "month" },
  { id: "wage", name: "Wages", every: null },
]
const PAY_SOURCES = {
  how: "https://www.gov.uk/how-to-have-your-benefits-paid",
  uc: "https://www.gov.uk/government/publications/universal-credit-different-earning-patterns-and-your-payments",
  cb: "https://www.gov.uk/child-benefit-payment-dates/bank-holidays",
}
function PaydayPage() {
  const [rows, setRows] = useState([{ type: "pip", date: "", freq: "28" }])
  const [apStart, setApStart] = useState("")
  const [res, setRes] = useState(null)
  useEffect(() => { const t = document.title; document.title = "The Payday Calendar: PIP, State Pension and Universal Credit dates — Sol"; return () => { document.title = t } }, [])
  const setRow = (i, patch) => { setRows(rows.map((r, j) => j === i ? { ...r, ...patch } : r)); setRes(null) }
  const hasWage = rows.some(r => r.type === "wage" && r.freq !== "month"), hasUC = rows.some(r => r.type === "uc")
  const fmt = d => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
  const fmtS = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" })
  const fmtM = d => d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })

  const run = () => {
    const today = new Date(); today.setHours(12, 0, 0, 0)
    const items = []
    rows.forEach(r => {
      if (!r.date) return
      const anchor = new Date(r.date + "T12:00:00"); if (isNaN(anchor)) return
      const t = PAY_TYPES.find(x => x.id === r.type)
      const every = r.type === "wage" ? (r.freq === "month" ? "month" : Number(r.freq)) : t.every
      const name = t.short || t.name
      const sched = schedule(anchor, every, today, 12, r.type !== "wage")
      items.push({ id: r.type, name, every, anchor, sched, doubles: every === 28 ? doubleMonths(sched) : [], runs: every === 28 ? solRuns(sched) : [] })
    })
    if (!items.length) return
    const all = items.flatMap(it => it.sched.map(s => ({ ...s, name: it.name, id: it.id }))).sort((a, b) => a.paid - b.paid)
    let extra = []
    const ap = apStart ? new Date(apStart + "T12:00:00") : null
    const wage = items.find(it => it.id === "wage" && it.every !== "month")
    if (ap && !isNaN(ap) && wage) extra = extraPaydayPeriods(wage.anchor, wage.every, ap, today, 13)
    setRes({ items, all, extra, apAsked: !!(ap && wage) })
    setTimeout(() => { const el = document.getElementById("payday-result"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }) }, 50)
  }
  const download = () => {
    const blob = new Blob([toICS(res.all)], { type: "text/calendar" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "my-paydays.ics"; document.body.appendChild(a); a.click(); a.remove()
  }
  const sel = { ...input, appearance: "auto" }
  const small = { fontSize: 13, color: M, lineHeight: 1.6 }
  const waits = res ? res.all.filter(r => r.longWait) : []
  const src = (k, t) => <a href={PAY_SOURCES[k]} target="_blank" rel="noopener" style={{ color: G }}>{t}</a>

  return (
    <div>
      <style>{`@media print { * { background: #fff !important; color: #000 !important; border-color: #999 !important } .no-print { display: none !important } }`}</style>
      <div style={{ textAlign: "center", padding: "28px 0 8px" }}>
        <div style={{ fontSize: 11, color: G, letterSpacing: 4, fontWeight: 700 }}>SOL</div>
        <h1 style={{ fontSize: 30, color: W, fontFamily: SERIF, fontWeight: 400, margin: "8px 0" }}>The Payday Calendar</h1>
        <p style={{ fontSize: 15, color: T, lineHeight: 1.6 }}>Most benefits are paid every four weeks. That's <span style={gold}>13 payments a year</span>, not 12. Enter your last payment and see the year ahead: the early ones, the long waits, and the months with two.</p>
      </div>
      <div style={{ ...card, marginTop: 12 }} className="no-print">
        {rows.map((r, i) => (
          <div key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${BD}` : "none", paddingBottom: 14, marginBottom: 14 }}>
            <label style={label} htmlFor={`pt${i}`}>WHAT YOU RECEIVE</label>
            <select id={`pt${i}`} value={r.type} onChange={e => setRow(i, { type: e.target.value })} style={sel}>
              {PAY_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {r.type === "wage" && (<>
              <label style={{ ...label, marginTop: 12 }} htmlFor={`pf${i}`}>HOW OFTEN YOU'RE PAID</label>
              <select id={`pf${i}`} value={r.freq} onChange={e => setRow(i, { freq: e.target.value })} style={sel}>
                <option value="7">Every week</option><option value="14">Every 2 weeks</option><option value="28">Every 4 weeks</option><option value="month">Monthly, same date</option>
              </select>
            </>)}
            <label style={{ ...label, marginTop: 12 }} htmlFor={`pd${i}`}>DATE OF YOUR LAST PAYMENT</label>
            <input id={`pd${i}`} type="date" value={r.date} onChange={e => setRow(i, { date: e.target.value })} style={input} />
            {r.type === "uc" && <p style={{ ...small, marginTop: 6 }}>Use your usual payment date. If the last one came early for a weekend or bank holiday, enter the date it was due.</p>}
            {rows.length > 1 && <button onClick={() => { setRows(rows.filter((_, j) => j !== i)); setRes(null) }} style={{ background: "none", border: "none", color: M, fontSize: 13, textDecoration: "underline", cursor: "pointer", marginTop: 8, padding: 0 }}>Remove</button>}
          </div>
        ))}
        {rows.length < 6 && <button onClick={() => setRows([...rows, { type: "uc", date: "", freq: "28" }])} style={{ ...btn, background: "none", color: G, border: `1px solid ${G}`, marginBottom: 12 }}>+ ADD ANOTHER PAYMENT</button>}
        {hasWage && hasUC && (<div style={{ marginBottom: 12 }}>
          <label style={label} htmlFor="apstart">START DATE OF ANY UNIVERSAL CREDIT ASSESSMENT PERIOD (OPTIONAL)</label>
          <input id="apstart" type="date" value={apStart} onChange={e => { setApStart(e.target.value); setRes(null) }} style={input} />
          <p style={{ ...small, marginTop: 6 }}>It's on your statement in your online journal, for example "14 October to 13 November". This shows which periods will count extra paydays.</p>
        </div>)}
        <button onClick={run} style={btn}>SHOW MY YEAR</button>
        <p style={{ fontSize: 12, color: M, marginTop: 10, lineHeight: 1.6 }}>Worked out on your device. Nothing you enter is stored or sent anywhere. Dates only: this page never deals with amounts.</p>
      </div>

      {res && (
        <div id="payday-result">
          {res.items.map(it => (
            <div key={it.id + it.name} style={card}>
              <div style={label}>{it.name.toUpperCase()}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: G, fontFamily: SERIF }}>{it.sched.length} payments</div>
              <p style={sub}>in the next 12 months{it.every === 28 ? ", one every four weeks" : it.every === 14 ? ", one every two weeks" : it.every === 7 ? ", one every week" : ", one a month"}.</p>
              {it.doubles.map((dm, i) => <p key={i} style={{ fontSize: 15, color: W, marginTop: 8, lineHeight: 1.6 }}>Two arrive in <span style={gold}>{fmtM(dm[0].paid)}</span> ({dm.map(x => fmtS(x.paid)).join(" and ")}). It isn't extra money: the next month's comes early in the cycle, so plan for it.</p>)}
              {it.runs.length > 0 && !it.runs[0].label.includes("Day") && (
                <p style={{ fontSize: 14, color: T, marginTop: 10, lineHeight: 1.6, borderTop: `1px solid ${BD}`, paddingTop: 10 }}>
                  <strong style={{ color: W }}>In Sol</strong>, this payment is due on <span style={gold}>{it.runs[0].label}</span> of every month{it.runs.length > 1 ? <> until {fmtS(it.runs[0].to)}, then on <span style={gold}>{it.runs[1].label}</span></> : ""}. Every Sol month is exactly four weeks, so a four-weekly payment keeps its date.
                </p>)}
            </div>
          ))}

          {waits.length > 0 && (
            <div style={goldCard}>
              <h2 style={h2}>The long waits</h2>
              <p style={{ ...small, marginBottom: 8 }}>When a payment comes early for a weekend or bank holiday, the next one doesn't. These are the stretches to plan for.</p>
              {waits.map((r, i) => <p key={i} style={{ fontSize: 15, color: W, lineHeight: 1.6, marginBottom: 6 }}><strong>{r.name}</strong> arriving {fmt(r.paid)} has to last <span style={gold}>{r.toNext} days</span>.</p>)}
            </div>
          )}

          {res.extra.length > 0 && (
            <div style={goldCard}>
              <h2 style={h2}>Universal Credit: periods with extra paydays</h2>
              {res.extra.map((x, i) => <p key={i} style={{ fontSize: 15, color: W, lineHeight: 1.6, marginBottom: 6 }}><span style={gold}>{fmtS(x.from)} to {fmt(x.to)}</span>: {x.pays.length} paydays instead of {x.usual} ({x.pays.map(fmtS).join(", ")}).</p>)}
              <p style={{ ...small, marginTop: 8 }}>All of them count as earnings in that period, so GOV.UK says you may get less Universal Credit for it, or none ({src("uc", "GOV.UK guidance")}). If a payment looks wrong, tell DWP in your online account.</p>
            </div>
          )}
          {res.apAsked && res.extra.length === 0 && <p style={{ ...small, margin: "0 4px 12px" }}>No assessment period in the next year counts extra paydays. Check the dates you entered against your journal.</p>}

          <div style={card}>
            <h2 style={h2}>Every payment, in order</h2>
            {res.all.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: `1px solid ${BD}`, alignItems: "baseline" }}>
                <span style={{ fontSize: 15, color: W }}>{fmt(r.paid)}{r.early && <span style={{ fontSize: 12, color: G }}> · early (due {fmtS(r.due)})</span>}</span>
                <span style={{ fontSize: 13, color: r.longWait ? G : M, textAlign: "right" }}>{r.name}{r.longWait ? ` · ${r.toNext} days to next` : ""}</span>
              </div>
            ))}
            <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={download} style={{ ...btn, flex: 1 }}>ADD TO MY CALENDAR</button>
              <button onClick={() => window.print()} style={{ ...btn, flex: 1, background: "none", color: G, border: `1px solid ${G}` }}>PRINT</button>
            </div>
          </div>
        </div>
      )}

      <div style={card}>
        <h2 style={h2}>How this works</h2>
        <p style={small}>A planning tool, not benefits advice. Your award letter and your Universal Credit journal are the authority; if they disagree with this page, they are right.</p>
        <p style={{ ...small, marginTop: 8 }}><strong style={{ color: T }}>How often:</strong> PIP, State Pension, Attendance Allowance, DLA and Pension Credit are usually paid every 4 weeks; ESA and Jobseeker's Allowance every 2 weeks; Universal Credit every month ({src("how", "GOV.UK")}).</p>
        <p style={{ ...small, marginTop: 8 }}><strong style={{ color: T }}>Early payments:</strong> if a payment date falls on a weekend or bank holiday, you're usually paid on the working day before ({src("how", "GOV.UK")}). This page uses bank holidays for England and Wales. Wages are shown on their due date, because employers differ.</p>
        <p style={{ ...small, marginTop: 8 }}><strong style={{ color: T }}>Child Benefit</strong> can follow different bank holiday dates: check {src("cb", "HMRC's table")}. <strong style={{ color: T }}>Universal Credit on the 29th, 30th or 31st:</strong> check your journal for short months.</p>
        <p style={{ ...small, marginTop: 8 }}><strong style={{ color: T }}>Scotland:</strong> PIP has been replaced by Adult Disability Payment, and some bank holidays differ. <strong style={{ color: T }}>Northern Ireland:</strong> Universal Credit is usually paid twice a month, and bank holidays differ.</p>
        <p style={{ ...small, marginTop: 8 }}>For help with a claim, contact <a href="https://www.citizensadvice.org.uk/benefits/" target="_blank" rel="noopener" style={{ color: G }}>Citizens Advice</a> or <a href="https://www.turn2us.org.uk/" target="_blank" rel="noopener" style={{ color: G }}>Turn2us</a>. Rules checked against GOV.UK on 12 November 2026.</p>
      </div>
      <div style={{ ...card, textAlign: "center" }} className="no-print">
        <p style={{ fontSize: 15, color: T, lineHeight: 1.6 }}>Sol is a calendar of 13 months, each exactly four weeks. The benefits system already pays by it.</p>
        <a href="/birthday" style={{ color: G, fontSize: 15 }}>Find your True Birthday in Sol →</a>
      </div>
    </div>
  )
}

// ═══ THE REVEAL ═══ The conversion moment: staged, skippable, and instant for reduced-motion users.
const REVEAL_CSS = `
@keyframes solFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes solRing{0%{transform:scale(.6);opacity:0;box-shadow:0 0 0 0 rgba(212,160,23,.0)}60%{transform:scale(1.04);opacity:1;box-shadow:0 0 60px 6px rgba(212,160,23,.35)}100%{transform:scale(1);box-shadow:0 0 36px 2px rgba(212,160,23,.22)}}
@keyframes solTick{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}
.sol-in{animation:solFadeUp .6s ease both}
.sol-ring{animation:solRing 1s cubic-bezier(.2,.8,.2,1) both}
.sol-tick{animation:solTick .16s ease both}
@media (prefers-reduced-motion:reduce){.sol-in,.sol-ring,.sol-tick{animation:none}}`

function nextOccurrence(ifc, from) {
  // The next ordinary-calendar date that carries this Sol date (Year Day / Leap Day included)
  for (let i = 0; i < 1500; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, 12)
    const r = toIFC(d)
    if (ifc.special ? r.special === ifc.special : (!r.special && r.month === ifc.month && r.day === ifc.day)) return { date: d, days: i }
  }
  return null
}

function Reveal({ result, onDone }) {
  const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const [stage, setStage] = useState(reduce ? 4 : 0)
  const [tick, setTick] = useState(0)
  const { date, ifc } = result
  const target = ifc.special ? 13 : ifc.monthNum
  useEffect(() => {
    if (stage === 4) { onDone(); return }
    if (stage === 2) {
      if (tick < target) { const t = setTimeout(() => setTick(tick + 1), 1100 / target); return () => clearTimeout(t) }
      const t = setTimeout(() => setStage(3), 350); return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStage(stage + 1), [1300, 1500, 0, 1100][stage])
    return () => clearTimeout(t)
  }, [stage, tick])
  const now = new Date()
  const wd = d => d.toLocaleDateString("en-GB", { weekday: "long" })
  const thisYear = new Date(now.getFullYear(), date.getMonth(), date.getDate(), 12)
  const nextYear = new Date(now.getFullYear() + 1, date.getMonth(), date.getDate(), 12)
  const feb29 = date.getMonth() === 1 && date.getDate() === 29
  if (stage === 4) return null
  return (
    <div style={{ ...goldCard, textAlign: "center", minHeight: 260, cursor: "pointer" }} onClick={() => setStage(4)} title="Tap to skip">
      <div className="sol-in" style={{ fontSize: 15, color: T, marginBottom: 14 }}>You were born on a <strong style={{ color: W }}>{wd(date)}</strong>.</div>
      {stage >= 1 && !feb29 && (
        <div className="sol-in" style={{ fontSize: 15, color: T, marginBottom: 18, lineHeight: 1.6 }}>
          Since then your birthday has wandered round the week:<br />this year a <strong style={{ color: W }}>{wd(thisYear)}</strong>, next year a <strong style={{ color: W }}>{wd(nextYear)}</strong>.
        </div>
      )}
      {stage >= 1 && feb29 && <div className="sol-in" style={{ fontSize: 15, color: T, marginBottom: 18 }}>A 29 February birthday: three years in four, it doesn't exist at all.</div>}
      {stage >= 2 && (
        <div style={{ fontFamily: SERIF, fontSize: 26, color: G, height: 36 }}>
          <span key={tick} className="sol-tick">{ifc.special && tick >= 13 && stage >= 3 ? ifc.special : IFC_MONTHS[Math.max(0, Math.min(12, tick - 1))]}</span>
        </div>
      )}
      {stage >= 3 && <div className="sol-ring" style={{ width: 96, height: 96, borderRadius: "50%", border: `2px solid ${G}`, margin: "14px auto 0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontSize: ifc.special ? 18 : 40, fontWeight: 700, color: G }}>{ifc.special ? ifc.special : ifc.day}</div>}
      <div style={{ fontSize: 11, color: M, marginTop: 16 }}>Tap to skip</div>
    </div>
  )
}

// Birthday entry as three plain fields: native date pickers on some phones and browsers
// open on the current year, so a 1970 birthday was easy to submit as 2026.
function DateFields({ value, onChange, onEnter }) {
  const [d0, m0, y0] = value ? [String(+value.slice(8, 10)), String(+value.slice(5, 7)), value.slice(0, 4)] : ["", "", ""]
  const [day, setDay] = useState(d0), [mon, setMon] = useState(m0), [yr, setYr] = useState(y0)
  const thisYear = new Date().getFullYear()
  const push = (d, m, y) => {
    if (d && m && /^\d{4}$/.test(y) && +y >= 1900 && +y <= thisYear) {
      const dt = new Date(+y, +m - 1, +d, 12)
      if (dt.getDate() === +d && dt <= new Date()) { onChange(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`); return }
    }
    onChange("")
  }
  const sel = { ...input, padding: "12px 8px", appearance: "auto" }
  const ok = value ? new Date(value + "T12:00:00") : null
  const bad = day && mon && yr.length === 4 && !value
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1.2fr", gap: 8 }}>
        <select aria-label="Day" value={day} onChange={e => { setDay(e.target.value); push(e.target.value, mon, yr) }} style={sel}>
          <option value="">Day</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
        </select>
        <select aria-label="Month" value={mon} onChange={e => { setMon(e.target.value); push(day, e.target.value, yr) }} style={sel}>
          <option value="">Month</option>{MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
        </select>
        <input aria-label="Year" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="Year" value={yr}
          onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); setYr(v); push(day, mon, v) }}
          onKeyDown={e => { if (e.key === "Enter" && onEnter) onEnter() }} style={sel} />
      </div>
      <div style={{ fontSize: 13, marginTop: 8, minHeight: 18, color: bad ? "#E08A6B" : M }}>
        {ok ? `You entered ${ok.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`
          : bad ? (+yr > thisYear || +yr < 1900 ? `Enter a year between 1900 and ${thisYear}.` : new Date(+yr, +mon - 1, +day) > new Date() ? "That date hasn't happened yet." : "That date doesn't exist. Check the day and month.") : "Day, month and the year you were born."}
      </div>
    </div>
  )
}

function BirthdayPage() {
  const [shared] = useState(sharedBirthday)
  const [dateStr, setDateStr] = useState("")
  const [result, setResult] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const calculate = () => {
    if (!dateStr) return
    const d = new Date(dateStr + "T12:00:00")
    if (isNaN(d)) return
    const today = new Date()
    if (d > today) return
    setResult({ date: d, ifc: toIFC(d), f13: countFriday13ths(d, today) })
    setRevealed(false)
    setCopied(false)
  }

  const shareUrl = () => {
    const { ifc } = result
    const key = ifc.special ? ifc.special.toLowerCase().replace(" ", "-") : `${ifc.month.toLowerCase()}-${ifc.day}`
    return `https://sol28.co.uk/b/${key}`
  }

  const share = async () => {
    const { ifc } = result
    const text = ifc.special
      ? `I was born on ${ifc.special} — a day outside every week and month in the 13-month calendar. Find your True Birthday:`
      : `My True Birthday is ${ifc.weekday} ${ifc.day} ${ifc.month}. Same day of the week, every year. Find yours:`
    try {
      if (navigator.share) { await navigator.share({ title: "My True Birthday", text, url: shareUrl() }); return }
      await navigator.clipboard.writeText(`${text} ${shareUrl()}`)
      setCopied(true)
    } catch { /* user cancelled */ }
  }

  const downloadCard = () => {
    const { ifc } = result
    const c = document.createElement("canvas")
    c.width = 1080; c.height = 1920
    const x = c.getContext("2d")
    x.fillStyle = NAVY; x.fillRect(0, 0, 1080, 1920)
    const glow = x.createRadialGradient(540, 760, 40, 540, 760, 620)
    glow.addColorStop(0, "rgba(212,160,23,0.28)"); glow.addColorStop(1, "rgba(212,160,23,0)")
    x.fillStyle = glow; x.fillRect(0, 0, 1080, 1920)
    x.strokeStyle = G; x.lineWidth = 4
    x.beginPath(); x.arc(540, 760, 250, 0, Math.PI * 2); x.stroke()
    x.textAlign = "center"
    x.fillStyle = G; x.font = "bold 40px Georgia"; x.fillText("S O L", 540, 260)
    x.fillStyle = W; x.font = "56px Georgia"; x.fillText("My True Birthday", 540, 400)
    if (ifc.special) {
      x.fillStyle = G; x.font = "bold 110px Georgia"; x.fillText(ifc.special, 540, 800)
    } else {
      x.fillStyle = W; x.font = "bold 92px Georgia"; x.fillText(ifc.weekday, 540, 740)
      x.fillStyle = G; x.font = "bold 92px Georgia"; x.fillText(`${ifc.day} ${ifc.month}`, 540, 860)
    }
    x.fillStyle = T; x.font = "44px Georgia"
    x.fillText(ifc.special ? "Outside every week and month." : "Same day. Every year. Forever.", 540, 1180)
    x.fillStyle = M; x.font = "36px Georgia"
    x.fillText(`Friday the 13ths I've lived through: ${result.f13}`, 540, 1300)
    x.fillText("In Sol: none.", 540, 1356)
    x.fillStyle = G; x.font = "bold 46px Georgia"; x.fillText("sol28.co.uk", 540, 1700)
    x.fillStyle = M; x.font = "italic 34px Georgia"; x.fillText("Time, fixed.", 540, 1764)
    const a = document.createElement("a")
    a.download = "sol-true-birthday.png"
    a.href = c.toDataURL("image/png"); a.click()
  }

  const downloadICS = () => {
    if (result.ifc.special) return
    const d = result.date
    const { ifc } = result
    const today = new Date()
    let next = new Date(today.getFullYear(), d.getMonth(), d.getDate())
    if (next < today) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate())
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sol//True Birthday//EN",
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${fmtDate(next)}`,
      `DTEND;VALUE=DATE:${fmtDate(new Date(next.getFullYear(), next.getMonth(), next.getDate() + 1))}`,
      `SUMMARY:True Birthday — ${ifc.weekday} ${ifc.day} ${ifc.month}`,
      `DESCRIPTION:In Sol your birthday is always ${ifc.weekday} the ${ordinal(ifc.day)} of ${ifc.month}. sol28.co.uk`,
      `UID:sol-bday-${fmtDate(d)}@sol28.co.uk`, "RRULE:FREQ=YEARLY",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }))
    a.download = "sol-true-birthday.ics"; a.click()
  }

  const sameWeekday = shared && result && !shared.ifc.special && !result.ifc.special && shared.ifc.weekday === result.ifc.weekday

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>Your True Birthday</h1>
        <p style={{ ...sub, fontSize: 15, color: T, lineHeight: 1.6, maxWidth: 420, margin: "8px auto 0" }}>Sol is a calendar of 13 months, each exactly 28 days. Every date falls on the same day of the week, every year. Enter your birthday to see yours.</p>
      </div>

      {shared && (
        <div style={{ ...card, textAlign: "center" }}>
          <div style={label}>A FRIEND SENT YOU THEIRS</div>
          <div style={{ fontSize: 20, color: W, fontFamily: SERIF }}>
            {shared.ifc.special ? shared.ifc.special : `${shared.ifc.weekday} ${shared.ifc.day} ${shared.ifc.month}`}
          </div>
          <p style={{ ...sub, marginTop: 6 }}>Enter your birthday to see if you share a True Birthday weekday.</p>
        </div>
      )}

      <div style={card}>
        <label style={label}>YOUR BIRTHDAY</label>
        <DateFields value={dateStr} onChange={setDateStr} onEnter={calculate} />
        <button onClick={calculate} disabled={!dateStr} style={{ ...btn, marginTop: 4, opacity: dateStr ? 1 : 0.55 }}>FIND MY TRUE BIRTHDAY</button>
      </div>

      <style>{REVEAL_CSS}</style>
      {result && !revealed && <Reveal key={result.date.getTime()} result={result} onDone={() => setRevealed(true)} />}
      {result && revealed && (
        <div style={goldCard} className="sol-in">
          <div style={{ textAlign: "center" }}>
            <div style={label}>YOUR TRUE BIRTHDAY</div>
            {result.ifc.special ? (
              <>
                <div style={{ fontSize: 32, fontWeight: 700, color: W, fontFamily: SERIF }}>{result.ifc.special}</div>
                <p style={{ ...sub, marginTop: 8, lineHeight: 1.6 }}>
                  {result.ifc.special === "Year Day"
                    ? "You were born on Year Day — the one day each year that belongs to no month and no week."
                    : "You were born on Leap Day — the extra day that sits outside every month and week, once every four years."}
                </p>
              </>
            ) : (
              <>
                <div className="sol-ring" style={{ width: 120, height: 120, borderRadius: "50%", border: `2px solid ${G}`, margin: "8px auto 14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 46, fontWeight: 700, color: G, fontFamily: SERIF, lineHeight: 1 }}>{result.ifc.day}</div>
                  <div style={{ fontSize: 15, color: W, fontFamily: SERIF }}>{result.ifc.month}</div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: W, fontFamily: SERIF }}>{result.ifc.weekday}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: G, marginBottom: 8, fontFamily: SERIF }}>{result.ifc.day} {result.ifc.month}</div>
                <p style={{ ...sub, fontSize: 16, color: T }}>Every year, for the rest of your life.</p>
              </>
            )}
            {(() => {
              const now = new Date()
              const b = result.date
              const age = now.getFullYear() - b.getFullYear() - ((now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) ? 1 : 0)
              const next = nextOccurrence(result.ifc, now)
              return (
                <div style={{ marginTop: 14, fontSize: 14, color: T, lineHeight: 1.7 }}>
                  {age > 0 && !result.ifc.special && <div>You've had <strong style={{ color: W }}>{age}</strong> birthday{age === 1 ? "" : "s"}. In Sol, every one would have been a <strong style={{ color: G }}>{result.ifc.weekday}</strong>.</div>}
                  {next && <div style={{ color: M, fontSize: 13, marginTop: 4 }}>{next.days === 0 ? "That's today. Happy True Birthday." : `Your next one: ${next.date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} on the ordinary calendar — ${next.days} day${next.days === 1 ? "" : "s"} away.`}</div>}
                </div>
              )
            })()}

            <div style={{ borderTop: `1px solid ${BD}`, margin: "16px 0", paddingTop: 16 }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: G, fontFamily: SERIF }}>{result.f13}</div>
              <p style={{ ...sub, lineHeight: 1.6 }}>Friday the 13ths you've lived through so far. Cotsworth's original calendar would have given you thirteen a year. In Sol you'd have had none: the 13th is always a Saturday.</p>
            </div>

            {(() => {
              const b = result.date
              const noon = new Date(Date.UTC(b.getFullYear(), b.getMonth(), b.getDate(), 12))
              const angle = sunAngle(noon)
              const moon = moonInfo(noon)
              const now = new Date()
              let ret = solarReturn(angle, now.getFullYear(), b.getMonth(), b.getDate())
              if (ret < now) ret = solarReturn(angle, now.getFullYear() + 1, b.getMonth(), b.getDate())
              const retDay = ret.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" })
              const retTime = ret.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })
              const row = { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "8px 0", borderBottom: `1px solid ${BD}` }
              return (
                <div style={{ borderTop: `1px solid ${BD}`, margin: "0 0 16px", paddingTop: 16, textAlign: "left" }}>
                  <div style={{ ...label, textAlign: "center" }}>THE SKY ON THE DAY YOU WERE BORN</div>
                  <div style={row}><span style={{ fontSize: 13, color: M }}>The Sun</span><span style={{ fontSize: 15, color: W, fontFamily: SERIF, textAlign: "right" }}><strong style={{ color: G }}>{Math.round(angle) % 360}°</strong> past the March equinox</span></div>
                  <div style={row}><span style={{ fontSize: 13, color: M }}>The Moon</span><span style={{ fontSize: 15, color: W, fontFamily: SERIF, textAlign: "right" }}><strong style={{ color: G }}>Day {moon.day}</strong> · {moon.phase}</span></div>
                  <div style={row}><span style={{ fontSize: 13, color: M }}>The week</span><span style={{ fontSize: 15, color: W, fontFamily: SERIF, textAlign: "right" }}>A <strong style={{ color: G }}>{b.toLocaleDateString("en-GB", { weekday: "long" })}</strong> on the ordinary calendar</span></div>
                  <p style={{ fontSize: 14, color: T, lineHeight: 1.6, marginTop: 12 }}>Your <strong style={{ color: W }}>solar birthday</strong> is the moment the Sun returns to that exact point. Next: <strong style={{ color: G }}>{retDay}</strong>, at about <strong style={{ color: G }}>{retTime}</strong> UK time. It arrives nearly six hours later each year, which is why leap years exist.</p>
                  <p style={{ fontSize: 12, color: M, lineHeight: 1.6, marginTop: 6 }}>Worked out for midday on your birth date. If you were born earlier or later in the day, your solar birthday moves by the same amount. You were born in lunation {moon.lunation.toLocaleString("en-GB")}, counting new moons the way astronomers do. Three clocks, the Sun, the Moon and the week, and none of them divides evenly into the others.</p>
                </div>
              )
            })()}

            {(() => {
              const hits = bookDatesFor(result.ifc)
              const d = hits[0].diff
              const when = d === 0 ? "ON YOUR TRUE BIRTHDAY" : `${Math.abs(d)} DAY${Math.abs(d) === 1 ? "" : "S"} ${d > 0 ? "AFTER" : "BEFORE"} YOUR TRUE BIRTHDAY`
              return (
                <div style={{ borderTop: `1px solid ${BD}`, margin: "0 0 16px", paddingTop: 16, textAlign: "left" }}>
                  <div style={{ ...label, textAlign: "center" }}>{when}, IN HISTORY</div>
                  {hits.map((h, i) => (
                    <div key={i} style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 15, color: G, fontFamily: SERIF }}>{h.ifc.special || `${h.ifc.weekday} ${h.ifc.day} ${h.ifc.month}`} (Sol calendar)</div>
                      <p style={{ fontSize: 14, color: T, lineHeight: 1.6 }}>{h.text}</p>
                      <p style={{ fontSize: 12, color: M }}>From {h.from}.{h.converted ? " Sol date converted from the Julian calendar." : ""}</p>
                    </div>
                  ))}
                </div>
              )
            })()}

            {shared && !shared.ifc.special && !result.ifc.special && (
              <p style={{ fontSize: 14, color: sameWeekday ? G : T, marginBottom: 16 }}>
                {sameWeekday ? `You and your friend share a True Birthday weekday: ${result.ifc.weekday}.` : `Your friend's is a ${shared.ifc.weekday}; yours is a ${result.ifc.weekday}.`}
              </p>
            )}

            <button onClick={share} style={{ ...btn, marginBottom: 8 }}>{copied ? "LINK COPIED" : "SHARE MY TRUE BIRTHDAY"}</button>
            <button onClick={downloadCard} style={{ ...btnOutline, marginBottom: 8 }}>DOWNLOAD STORY CARD</button>
            {!result.ifc.special && <button onClick={downloadICS} style={btnOutline}>ADD YEARLY REMINDER TO CALENDAR</button>}
            <a href="/calendar" style={{ display: "block", marginTop: 12, fontSize: 13, color: G }}>Or see every Sol date in your calendar →</a>
          </div>
        </div>
      )}

      {result && revealed && <BirthdaySignup />}

      <div style={{ ...card, marginTop: 16 }}>
        <p style={{ fontSize: 12, color: M, lineHeight: 1.7 }}>
          Born on the 29th, 30th or 31st? Your birthday doesn't disappear — it converts to a permanent Sol date.
          Roughly one person in twelve was born on a 29th, 30th or 31st. Every one of those dates converts cleanly.
        </p>
        <p style={{ fontSize: 11, color: M, lineHeight: 1.6, marginTop: 8 }}>Your birthday is worked out on your device and never sent anywhere. Shared links include only your Sol date, never your year of birth.</p>
      </div>
    </div>
  )
}

function HistoryPage() {
  const sections = [
    { title: "The Month Names Don't Add Up", text: "September comes from the Latin for seven, but it's our ninth month. October means eight, November nine, December ten — each one two places out. By Roman tradition, the earliest calendar had ten months and began in March, so the numbers once fitted. January and February came later, and by 153 BC the Roman year began in January. July and August were renamed rather than added: Quintilis became Julius after Julius Caesar, and Sextilis became Augustus. Nobody renumbered the rest.", src: [["Macrobius, Saturnalia 1.12–13", "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Macrobius/Saturnalia/home.html"], ["Ovid, Fasti 1 and 3", "https://www.poetryintranslation.com/klineasfasti.php"]], ch: "1" },
    { title: "The Pope Who Deleted Ten Days", text: "By the 1500s the calendar had drifted ten days against the seasons. In 1582 Pope Gregory XIII ordered a correction: Thursday 4 October was followed by Friday 15 October. Spain, Portugal, the Italian states and Poland–Lithuania switched that October, and France followed in December. Many Protestant states held out for generations, wary of a reform that came from Rome — the Protestant German states waited until 1700.", src: [["Inter Gravissimas (1582)", "https://myweb.ecu.edu/mccartyr/inter-grav.html"], ["Tøndering, Calendar FAQ", "https://www.tondering.dk/claus/cal/gregorian.php"]], ch: "4" },
    { title: "Britain's 1752 Switch", text: "Britain held out until 1752, 170 years after the reform. By then 11 days had to go: Wednesday 2 September was followed by Thursday 14 September. So that no tax was lost, the tax year was stretched by 11 days and the next one began on 5 April instead of 25 March. In 1800 it moved one more day, to 6 April — where the UK personal tax year still starts.", src: [["The Conversation (2016)", "https://theconversation.com/why-the-uk-tax-year-starts-on-april-6-57247"], ["Tøndering, Calendar FAQ", "https://www.tondering.dk/claus/cal/gregorian.php"]], ch: "5" },
    { title: "The International Fixed Calendar", text: "In the early 1900s Moses Cotsworth proposed 13 months of exactly 28 days. Every month identical. Your birthday on the same weekday every year. One 'Year Day' sits outside the weekly cycle. Kodak ran 13 equal 28-day accounting periods, 1928–1989; employees lived by the Gregorian calendar.", src: [["Cotsworth, The Need of a Rational Almanac", "https://www.canadiana.ca/view/oocihm.80687"], ["Kodak period calendars, 1985–1990 (supplied by Kodak)", "/notes/15"]], ch: "15" },
    { title: "Thirteen Friday the 13ths", text: "In Cotsworth's calendar every month began on a Sunday, so the 13th was always a Friday: thirteen Friday the 13ths a year, guaranteed. Sol keeps his 13 months of 28 days but starts the week on Monday, the international standard. One day's shift, and the 13th becomes a Saturday in every month. Friday the 13th never happens.", src: [["Cotsworth, The Need of a Rational Almanac", "https://www.canadiana.ca/view/oocihm.80687"]], ch: "12" },
    { title: "Sol — The 13th Month", text: "Sol sits between June and July, around the summer solstice and the longest days of the northern year. Its name is Latin for 'sun', and Sól was the sun personified in Norse myth. Sol is built on Cotsworth's proposal, now more than 120 years old.", src: [["Snorri Sturluson, Prose Edda (Gylfaginning 11–12)", "https://www.sacred-texts.com/neu/pre/index.htm"]], ch: "17" },
  ]

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>The History</h1>
        <p style={sub}>How a Roman accident became the world's calendar</p>
      </div>
      <a href="/lost-days" style={{ ...goldCard, display: "block", textDecoration: "none", marginBottom: 12 }}>
        <div style={label}>LOST DAYS</div>
        <div style={{ fontSize: 18, color: W, fontFamily: SERIF, marginTop: 4 }}>Seven times whole days vanished from the calendar</div>
        <div style={{ ...sub, marginTop: 6 }}>From Caesar's 445-day year to Britain losing 11 days in 1752. See them all →</div>
      </a>
      {sections.map((s, i) => (
        <div key={i} style={card}>
          <h2 style={h2}>{s.title}</h2>
          <p style={{ fontSize: 14, color: T, lineHeight: 1.7 }}>{s.text}</p>
          {s.src && <p style={{ fontSize: 12, color: M, marginTop: 10, lineHeight: 1.6 }}>Sources: {s.src.map(([l, u], j) => <span key={j}>{j ? " · " : ""}<a href={u} {...(u.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})} style={{ color: G }}>{l}</a></span>)} · <a href={`/notes/${s.ch}`} style={{ color: G }}>All sources for this chapter of the book</a></p>}
        </div>
      ))}
      <div style={{ ...card, textAlign: "center" }}>
        <a href="/lost-days" style={{ color: G, fontSize: 15 }}>The Lost Days: every time the calendar skipped, and the year that never was →</a>
        <div style={{ marginTop: 10 }}><a href="/ethiopia" style={{ color: G, fontSize: 15 }}>In Ethiopia it's {toEthiopian(new Date()).year}: the 13-month calendar already in use →</a></div>
        <div style={{ marginTop: 10 }}><a href="/months" style={{ color: G, fontSize: 15 }}>The 13 months of Sol, day by day →</a></div>
        <div style={{ marginTop: 10 }}><a href="/garden" style={{ color: G, fontSize: 15 }}>The gardening year in 13 months →</a></div>
        <div style={{ marginTop: 10 }}><a href="/birds" style={{ color: G, fontSize: 15 }}>The birding year in 13 months →</a></div>
        <div style={{ marginTop: 10 }}><a href="/routine" style={{ color: G, fontSize: 15 }}>A printable month that never changes →</a></div>
      </div>

      <div style={{ ...card, textAlign: "center" }}>
        <p style={{ fontSize: 14, color: G, fontStyle: "italic" }}>
          We're not using this calendar because it's the best one. We're using it because it's the one we inherited.
        </p>
        <p style={{ fontSize: 12, color: M, marginTop: 8 }}>Sol — Time, fixed.</p>
      </div>
    </div>
  )
}

// Kit (kit.com) form ID. Leave empty until the Kit form exists; the page then shows an honest "opening soon" state.
const KIT_FORM_ID = "10109930" // Kit form "Sol waitlist (sol28.co.uk)": double opt-in, confirm link returns to /?go=waitlist&confirmed=1

function useKitSignup() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | invalid | sending | done | error
  const submit = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus("invalid"); return }
    setStatus("sending")
    try {
      const body = new FormData()
      body.append("email_address", email)
      const r = await fetch(`https://app.kit.com/forms/${KIT_FORM_ID}/subscriptions`, { method: "POST", body, headers: { Accept: "application/json" } })
      const j = await r.json().catch(() => ({}))
      setStatus(r.ok && j.status === "success" ? "done" : "error")
    } catch { setStatus("error") }
  }
  return { email, setEmail: v => { setEmail(v); setStatus("idle") }, status, submit }
}

const GIFT_URL = "/gift/sol-perpetual-calendar.pdf"

// Sign-up shown straight after the True Birthday result: the moment interest is highest.
function BirthdaySignup() {
  const k = useKitSignup()
  if (k.status === "done") return (
    <div style={{ ...card, marginTop: 16, textAlign: "center" }}>
      <h2 style={h2}>Check your inbox</h2>
      <p style={{ ...sub, lineHeight: 1.6 }}>Click the link in the confirmation email and you're on the list. Your calendar is ready now:</p>
      <a href={GIFT_URL} download style={{ ...btn, display: "block", boxSizing: "border-box", textAlign: "center", textDecoration: "none", marginTop: 12 }}>DOWNLOAD THE SOL CALENDAR (PDF)</a>
    </div>
  )
  return (
    <div style={{ ...card, marginTop: 16 }}>
      <h2 style={{ ...h2, marginBottom: 6 }}>Keep your Sol date to hand</h2>
      <p style={{ fontSize: 14, color: T, lineHeight: 1.6, marginBottom: 12 }}>Get the free one-page Sol calendar, a single sheet that never goes out of date, and hear first when the book and shop open.</p>
      <input type="email" aria-label="Email address" value={k.email} placeholder="you@example.com" onChange={e => k.setEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") k.submit() }} style={input} />
      <button onClick={k.submit} disabled={k.status === "sending"} style={{ ...btn, marginTop: 10 }}>{k.status === "sending" ? "SENDING…" : "SEND ME THE CALENDAR"}</button>
      {k.status === "invalid" && <p style={{ fontSize: 12, color: G, marginTop: 8, textAlign: "center" }}>Please enter a valid email address.</p>}
      {k.status === "error" && <p style={{ fontSize: 12, color: G, marginTop: 8, textAlign: "center" }}>Something went wrong. Please try again.</p>}
      <p style={{ fontSize: 11, color: M, marginTop: 8, textAlign: "center" }}>Confirmation email first. Sol news only; unsubscribe any time. Your birthday is never sent.</p>
    </div>
  )
}

const PRODUCTS = [
  { img: "/shop/challenge.jpg", name: "The 28-Day Challenge Workbook", text: "One habit, one Sol month. A daily page, a weekly check-in and an end-of-month review. Start any Monday and use it again whenever you like." },
  { img: "/shop/habit.jpg", name: "The Sol Habit Tracker", text: "A whole year in thirteen equal 28-day blocks, so this month's results compare honestly with last month's. No short Februaries skewing the totals." },
  { img: "/shop/sprint.jpg", name: "The Sol Sprint Journal", text: "Thirteen four-week sprints a year: plan each one, run it a week at a time, review it before the next." },
  { img: "/shop/payday.jpg", name: "The 13-Payday Budget", text: "Paid every four weeks? You get 13 paydays a year, not 12. One page per payday, plus what the double-payday month means for Universal Credit. A guide, not financial advice." },
]

function ShopPage() {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>The Sol Shop</h1>
        <p style={sub}>The book, and undated printables that never go out of date. Join the waitlist to hear first.</p>
      </div>
      <WaitlistPage embedded />
      <div style={{ ...goldCard, marginTop: 16 }}>
        <div style={label}>THE BOOK · OUT MONDAY 1 FEBRUARY 2027</div>
        <h2 style={{ ...h2, marginBottom: 4 }}>Still Ruled by Rome</h2>
        <p style={{ fontStyle: "italic", color: G, fontSize: 15, marginBottom: 10 }}>How an Empire Set the Calendar You Live By</p>
        <p style={{ fontSize: 14, color: T, lineHeight: 1.6 }}>October means eight. It is the tenth month. Nineteen chapters on how the calendar you live by was built, who tried to replace it, and why nobody did. Every claim sourced; every chapter's sources online at <a href="/notes" style={{ color: G }}>sol28.co.uk/notes</a>.</p>
        <p style={{ fontSize: 13, color: M, marginTop: 8 }}>Paperback and Kindle. Join the waitlist above to hear the day it's out.</p>
      </div>
      <div style={{ ...goldCard, marginTop: 16 }}>
        <div style={label}>THE POSTER · £4.99 · COMING SOON</div>
        <h2 style={{ ...h2, marginBottom: 6 }}>The Sol Year: 13-Month Calendar Poster</h2>
        <p style={{ fontSize: 14, color: T, lineHeight: 1.6 }}>Thirteen months of 28 days, all on one A3 page. Every month starts on a Monday, so the 13th always falls on a Saturday. Friday the 13th can't happen. Includes Year Day and Leap Day. It's undated, so it never goes out of date.</p>
        <p style={{ fontSize: 12, color: M, marginTop: 8 }}>Instant PDF download, cream or navy. Print at home or at any print shop. Join the waitlist above to hear the day it's on sale.</p>
      </div>
      <div style={{ ...card, marginTop: 16 }}>
        <img src="/shop/certificate.jpg" alt="True Birthday certificate, sample" loading="lazy" style={{ width: "100%", borderRadius: 8, display: "block", marginBottom: 12 }} />
        <div style={label}>PERSONALISED · COMING SOON</div>
        <h2 style={{ ...h2, marginBottom: 6 }}>Your True Birthday Certificate</h2>
        <p style={{ fontSize: 14, color: T, lineHeight: 1.6 }}>An A4 certificate made for one person: their name, the day they were born, and their True Birthday, the Sol date and weekday it falls on every year for life. A gift for anyone who loves history, maths or calendars.</p>
        <p style={{ fontSize: 12, color: M, marginTop: 8 }}>Personalised PDF, print at home. Join the waitlist above to hear when it's available.</p>
      </div>
      <div style={{ marginTop: 16 }}>
        {PRODUCTS.map(p => (
          <div key={p.name} style={{ ...card, marginBottom: 12 }}>
            <img src={p.img} alt={`${p.name}, sample pages`} loading="lazy" style={{ width: "100%", borderRadius: 8, display: "block", marginBottom: 12 }} />
            <h2 style={{ ...h2, marginBottom: 6 }}>{p.name}</h2>
            <p style={{ fontSize: 14, color: T, lineHeight: 1.6 }}>{p.text}</p>
            <p style={{ fontSize: 12, color: M, marginTop: 8 }}>Instant PDF download, A4, print at home. Coming December 2026.</p>
          </div>
        ))}
        <div style={{ ...card, textAlign: "center" }}>
          <h2 style={h2}>Free now</h2>
          <p style={{ fontSize: 14, color: T, lineHeight: 1.6 }}>The one-page Sol calendar: every Sol month on a single sheet.</p>
          <a href={GIFT_URL} download style={{ ...btnOutline, display: "block", boxSizing: "border-box", textAlign: "center", textDecoration: "none", marginTop: 12 }}>DOWNLOAD THE FREE CALENDAR</a>
        </div>
      </div>
    </div>
  )
}

function WaitlistPage({ embedded }) {
  const confirmed = (() => { try { return new URLSearchParams(window.location.search).get("confirmed") === "1" } catch { return false } })()
  const k = useKitSignup()
  const email = k.email, setEmail = k.setEmail, handleSubmit = k.submit
  const status = confirmed && k.status === "idle" ? "confirmed" : k.status
  const setStatus = () => {}

  return (
    <div>
      {!embedded && <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>Join the Waitlist</h1>
        <p style={sub}>Be first to know when the book and the first Sol products launch</p>
      </div>}

      {!KIT_FORM_ID ? (
        <div style={goldCard}>
          <div style={{ textAlign: "center" }}>
            <h2 style={h2}>The waitlist opens shortly</h2>
            <p style={{ ...sub, lineHeight: 1.6 }}>Sign-ups aren't open yet. In the meantime, find your True Birthday and share it.</p>
          </div>
        </div>
      ) : status === "confirmed" ? (
        <div style={goldCard}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>☀️</div>
            <h2 style={h2}>You're on the list</h2>
            <p style={{ ...sub, lineHeight: 1.6 }}>Thank you for confirming. You'll hear first when the book and the first Sol products launch.</p>
            <a href="/?go=birthday" style={{ ...btn, display: "block", boxSizing: "border-box", textAlign: "center", textDecoration: "none", marginTop: 16 }}>FIND YOUR TRUE BIRTHDAY</a>
          </div>
        </div>
      ) : status !== "done" ? (
        <div style={goldCard}>
          <label style={label}>YOUR EMAIL</label>
          <input type="email" value={email} placeholder="you@example.com" onChange={e => { setEmail(e.target.value); setStatus("idle") }} style={input} />
          <button onClick={handleSubmit} disabled={status === "sending"} style={{ ...btn, marginTop: 12 }}>
            {status === "sending" ? "JOINING…" : "JOIN THE WAITLIST"}
          </button>
          {status === "invalid" && <p style={{ fontSize: 12, color: G, marginTop: 8, textAlign: "center" }}>Please enter a valid email address.</p>}
          {status === "error" && <p style={{ fontSize: 12, color: G, marginTop: 8, textAlign: "center" }}>Something went wrong. Please try again.</p>}
          <p style={{ fontSize: 11, color: M, marginTop: 8, textAlign: "center" }}>We'll only use your email for Sol news. You'll get a confirmation email first, and you can unsubscribe anytime.</p>
        </div>
      ) : (
        <div style={goldCard}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>☀️</div>
            <h2 style={h2}>Check your inbox</h2>
            <p style={{ ...sub, lineHeight: 1.6 }}>We've sent a confirmation email. Click the link in it and you're on the list.</p>
            <a href={GIFT_URL} download style={{ ...btnOutline, display: "block", boxSizing: "border-box", textAlign: "center", textDecoration: "none", marginTop: 16 }}>DOWNLOAD YOUR FREE SOL CALENDAR</a>
          </div>
        </div>
      )}

      {!embedded && <div style={{ ...card, marginTop: 16 }}>
        <h2 style={h2}>What's Coming</h2>
        <div style={{ fontSize: 14, color: T, lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8 }}><span style={gold}>☀ Still Ruled by Rome</span> — the book, out 1 February 2027. How an empire set the calendar you live by.</div>
          <div style={{ marginBottom: 8 }}><span style={gold}>☀ Systems We Never Questioned</span> — the companion book on the everyday systems nobody chose.</div>
          <div style={{ marginBottom: 8 }}><span style={gold}>☀ Sol planners and journals</span> — 13 months of 28 days, built for the way Sol works.</div>
          <div><span style={gold}>☀ 28-day challenges</span> — printable workbooks that fit one Sol month exactly.</div>
        </div>
        <p style={{ fontSize: 12, color: M, marginTop: 12 }}>Waitlist members hear first, with launch dates and early access.</p>
      </div>}
    </div>
  )
}

function PrivacyPage() {
  const sec = (t, body) => (<div style={card}><h2 style={h2}>{t}</h2><p style={{ fontSize: 14, color: T, lineHeight: 1.7 }}>{body}</p></div>)
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>Privacy</h1>
        <p style={sub}>Last updated 28 October 2026</p>
      </div>
      {sec("Who we are", "Sol (sol28.co.uk) is run by Stephen Rooney in Liverpool, UK. For anything about your data, email hello@sol28.co.uk.")}
      {sec("Your dates stay on your device", "Every date you enter — including your birthday — is worked out in your own browser and never sent to us. Shared birthday links contain only your Sol date — never your year of birth. This site uses no cookies and no advertising trackers. We count visits with Vercel Web Analytics, which uses no cookies and stores no personal information, so we can see which pages people read — never who you are.")}
      {sec("The waitlist", "If you join the waitlist we collect your email address and nothing else, and use it only to send you news about Sol, its books and products. We ask for your consent first, and you confirm it from a link we email you. Every email has an unsubscribe link, and you can ask us to delete your address at any time.")}
      {sec("Who handles it", "Waitlist emails are stored and sent by Kit, our email provider, which is based in the United States. The site is served by Vercel, which may keep short-lived technical logs, such as IP addresses, to keep the service running and secure.")}
      {sec("Your rights", "You can ask to see, correct or delete the personal data we hold about you. If you're unhappy with how we've handled it, you can complain to the Information Commissioner's Office at ico.org.uk.")}
    </div>
  )
}

function TermsPage() {
  const sec = (t, body) => (<div style={card}><h2 style={h2}>{t}</h2><p style={{ fontSize: 14, color: T, lineHeight: 1.7 }}>{body}</p></div>)
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>Terms of Sale</h1>
        <p style={sub}>Last updated 12 November 2026 (evening)</p>
      </div>
      {sec("Who you're buying from", "Sol (sol28.co.uk) is run by Stephen Rooney, a sole trader. Postal address: Level One, Basecamp Liverpool, 49 Jamaica Street, Liverpool L1 0AH, United Kingdom. Email: hello@sol28.co.uk. Payments are taken by our checkout provider; we never see your card details.")}
      {sec("What you're buying", "Sol products are digital downloads: PDF files you print at home or at a print shop. Each product page says what's included, the paper size and the price. Prices are in pounds sterling. Sol is not VAT-registered, so no VAT is added.")}
      {sec("Delivery", "Your download link arrives by email straight after payment. If it hasn't arrived within an hour, check your spam folder, then email hello@sol28.co.uk and we'll send it again.")}
      {sec("Your right to cancel", "You normally have 14 days to cancel an online purchase. For digital downloads that right ends once the download starts. Each product page says so directly above the buy button, and buying is how you ask for immediate access and agree to it. Your receipt email confirms this in writing. Until you start the download, you can cancel for a full refund.")}
      {sec("If something's wrong", "Under the Consumer Rights Act 2015, a download must be as described, of satisfactory quality and fit for purpose. If a file is faulty, won't open or isn't what the page described, email hello@sol28.co.uk within 30 days. We'll fix or replace it, and if we can't, we'll refund you. None of this affects your statutory rights.")}
      {sec("Using what you buy", "Each purchase is for your own personal use. You can print as many copies as you like for yourself, your family or your classroom. Please don't resell, share or upload the files. The designs and text are copyright Stephen Rooney.")}
      {sec("Your data", "We use your email address to deliver your purchase and, only if you've opted in, to send you news. See the Privacy page for details.")}
      {sec("The law", "These terms are governed by the law of England and Wales. If you live elsewhere in the UK, you can also bring a claim in your local courts.")}
    </div>
  )
}

// ═══ MAIN APP ═══

export default function App() {
  const [page, setPage] = useState(() => {
    if (sharedBirthday()) return "birthday"
    try { const go = new URLSearchParams(window.location.search).get("go"); if (["convert","birthday","history","waitlist","shop","privacy","terms","payday"].includes(go)) return go } catch {}
    try { const path = window.location.pathname.replace(/^\/+|\/+$/g, ""); const byPath = { today: "home", convert: "convert", birthday: "birthday", history: "history", shop: "shop", waitlist: "waitlist", privacy: "privacy", terms: "terms", payday: "payday" }[path]; if (byPath) return byPath } catch {}
    return "birthday"
  })
  // Give every tab its own web address, so it can be shared and bookmarked
  const PATHS = { home: "/today", convert: "/convert", birthday: "/birthday", history: "/history", shop: "/shop", waitlist: "/waitlist", privacy: "/privacy", terms: "/terms", payday: "/payday" }
  const go = id => { setPage(id); try { if (window.location.pathname !== PATHS[id]) window.history.pushState({ page: id }, "", PATHS[id]) } catch {} ; window.scrollTo(0, 0) }
  useEffect(() => {
    const onPop = () => { const p = window.location.pathname.replace(/^\/+|\/+$/g, ""); const id = { today: "home", convert: "convert", birthday: "birthday", history: "history", shop: "shop", waitlist: "waitlist", privacy: "privacy", terms: "terms", payday: "payday", "": "birthday" }[p]; if (id) setPage(id) }
    window.addEventListener("popstate", onPop); return () => window.removeEventListener("popstate", onPop)
  }, [])
  const pages = { home: HomePage, convert: ConverterPage, birthday: BirthdayPage, history: HistoryPage, waitlist: WaitlistPage, shop: ShopPage, privacy: PrivacyPage, terms: TermsPage, payday: PaydayPage }
  const Page = pages[page]
  const navItems = [
    { id: "birthday", label: "BIRTHDAY" },
    { id: "home", label: "TODAY" },
    { id: "convert", label: "CONVERT" },
    { id: "history", label: "HISTORY" },
    { id: "shop", label: "SHOP" },
  ]

  return (
    <div style={container}>
      <div style={wrap}>
        <Page />
        <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <button onClick={() => go("payday")} style={{ background: "none", border: "none", color: M, fontSize: 12, textDecoration: "underline", cursor: "pointer" }}>Payday Calendar</button>
          <span style={{ color: M, fontSize: 12 }}> · </span>
          <button onClick={() => go("privacy")} style={{ background: "none", border: "none", color: M, fontSize: 12, textDecoration: "underline", cursor: "pointer" }}>Privacy</button>
          <span style={{ color: M, fontSize: 12 }}> · </span>
          <button onClick={() => go("terms")} style={{ background: "none", border: "none", color: M, fontSize: 12, textDecoration: "underline", cursor: "pointer" }}>Terms of sale</button>
          <span style={{ color: M, fontSize: 12 }}> · Sol — Time, fixed.</span>
        </div>
      </div>
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: "#15152A",
        borderTop: `1px solid ${BD}`, display: "flex", padding: "8px 0",
        justifyContent: "space-around", zIndex: 100
      }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => go(n.id)} style={navBtn(page === n.id)}>{n.label}</button>
        ))}
      </nav>
      <div style={{ height: 60 }} />
    </div>
  )
}
