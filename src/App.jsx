import React, { useState, useEffect } from 'react'
import { IFC_MONTHS, WEEKDAYS, SHORT_WD, MONTH_NAMES, ordinal, fmtDate, countFriday13ths, daysUntil, isLeapYear, doy, toIFC, moonPhase } from './engine.js'

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
  ["Fact", "Moses Cotsworth proposed the International Fixed Calendar in 1902: 13 months of exactly 28 days."],
  ["Fact", "Cotsworth founded the International Fixed Calendar League in 1922 to campaign for 13 months."],
  ["Fact", "Kodak ran 13 equal 28-day accounting periods, 1928–1989; employees lived by the Gregorian calendar."],
  ["Fact", "Religious leaders objected to the 13-month calendar because Year Day sits outside the week and would break the weekly Sabbath cycle."],
  ["Fact", "In a 13-month calendar of 28-day months, every date falls on the same weekday every year."],
  ["Fact", "Year Day and Leap Day belong to no week at all — they have no weekday."],
  ["Fact", "In Sol the 13th of every month is a Saturday, so Friday the 13th can never happen."],
  ["Fact", "Cotsworth's 1902 calendar began every month on a Sunday, so it had a Friday the 13th in all thirteen months. Sol shifted the week by one day and abolished it."],
  ["Fact", "Ethiopia uses a 13-month calendar today: twelve months of 30 days and a short thirteenth."],
  ["Fact", "The Igbo of Nigeria independently developed a calendar built on 13 months of 28 days."],
  ["Fact", "Moon, month, measure, metre and menses all trace back to one ancient root, *me-, to measure."],
  ["Myth", "'History' doesn't come from 'his story'. It comes from the Greek historia, meaning inquiry."],
  ["Myth", "'Hours' has nothing to do with the god Horus. It comes from the Greek hōra."],
  ["Fact", "Big retailers such as Walmart, Tesco and M&S plan their year in 4-4-5 periods: quarters of 13 weeks."],
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
  const moon = moonPhase(now)
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
          </>
        )}
      </div>

      <div style={card}>
        <div style={label}>GREGORIAN</div>
        <div style={{ fontSize: 16, color: T }}>{greg}</div>
        <div style={{ ...sub, marginTop: 4 }}>Day {ifc.doy} of {isLeapYear(now.getFullYear()) ? 366 : 365}</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ ...card, flex: 1 }}>
          <div style={label}>MOON</div>
          <div style={{ fontSize: 28 }}>{moon.icon}</div>
          <div style={{ fontSize: 13, color: T, marginTop: 4 }}>{moon.name}</div>
          <div style={sub}>Day {moon.age} of 29.53</div>
        </div>
        <div style={{ ...card, flex: 1 }}>
          <div style={label}>THIS SOL MONTH</div>
          <MiniGrid day={ifc.day} />
        </div>
      </div>

      {(() => { const [kind, text] = factOfDay(now); return (
        <div style={card}>
          <div style={label}>{kind === "Myth" ? "MYTH OF THE DAY" : "FACT OF THE DAY"}</div>
          <p style={{ fontSize: 15, color: W, lineHeight: 1.6, fontFamily: SERIF }}>{text}</p>
          <p style={{ fontSize: 11, color: M, marginTop: 8 }}>Checked against the Sol Claim Registry. We never repeat a myth as fact.</p>
        </div>) })()}

      <div style={{ ...card, textAlign: "center" }}>
        <div style={label}>COUNTDOWN</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: G, fontFamily: SERIF }}>{daysUntil(new Date(2029, 0, 1), now).toLocaleString("en-GB")} days</div>
        <p style={{ ...sub, marginTop: 6, lineHeight: 1.6 }}>until 1 January 2029, the next time New Year's Day falls on a Monday — the day every Sol year begins.</p>
      </div>

      <div style={{ ...card, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: M, lineHeight: 1.6, fontStyle: "italic" }}>
          Cotsworth's 1902 calendar started every month on a Sunday, so it had a Friday the 13th in every single month. Sol starts on a Monday instead: the 13th is always a Saturday, and Friday the 13th can never happen. Your birthday falls on the same day of the week every year. Forever.
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
    const moon = moonPhase(d)
    setResult({ date: d, ifc, moon })
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
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BD}` }}>
            <span style={{ fontSize: 13, color: M }}>{result.moon.icon} {result.moon.name} · Moon age: {result.moon.age} days</span>
          </div>
        </div>
      )}

      <p style={{ textAlign: "center", margin: "8px 0 0" }}><a href="/dates" style={{ color: G, fontSize: 14 }}>Browse every date in Sol →</a></p>

      <PaydayCalculator />
    </div>
  )
}

function PaydayCalculator() {
  const [dateStr, setDateStr] = useState("")
  const [ucDay, setUcDay] = useState("")
  const [res, setRes] = useState(null)

  const run = () => {
    if (!dateStr) return
    const anchor = new Date(dateStr + "T12:00:00")
    if (isNaN(anchor)) return
    const today = new Date(); today.setHours(12, 0, 0, 0)
    const step = 28 * 86400000
    const paydaysBetween = (from, to) => {
      const k = Math.ceil((from - anchor) / step)
      const out = []
      for (let d = new Date(anchor.getTime() + k * step); d < to; d = new Date(d.getTime() + step)) out.push(d)
      return out
    }
    // Tax year
    const taxStart = new Date(today.getMonth() > 3 || (today.getMonth() === 3 && today.getDate() >= 6) ? today.getFullYear() : today.getFullYear() - 1, 3, 6, 12)
    const taxEnd = new Date(taxStart.getFullYear() + 1, 3, 6, 12)
    const days = paydaysBetween(taxStart, taxEnd)
    // Calendar months with two paydays, over the next 12 months
    const ahead = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate(), 12)
    const byMonth = {}
    paydaysBetween(new Date(today.getFullYear(), today.getMonth(), 1, 12), ahead).forEach(d => { const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`; byMonth[key] = (byMonth[key] || 0) + 1 })
    const doubles = Object.keys(byMonth).filter(m => byMonth[m] > 1)
    // Universal Credit assessment periods (optional): run from day N of one month to the day before day N of the next
    let uc = null
    const n = parseInt(ucDay, 10)
    if (n >= 1 && n <= 31) {
      const periodStart = (y, m) => new Date(y, m, Math.min(n, new Date(y, m + 1, 0).getDate()), 12)
      let y = today.getFullYear(), m = today.getMonth()
      if (periodStart(y, m) > today) { m -= 1; if (m < 0) { m = 11; y -= 1 } }
      for (let i = 0; i < 13 && !uc; i++) {
        const a = periodStart(y, m + i), b = periodStart(y, m + i + 1)
        const inP = paydaysBetween(a, b)
        if (inP.length > 1) uc = { from: a, to: new Date(b.getTime() - 86400000), pays: inP }
      }
    }
    setRes({ count: days.length, doubles, start: taxStart, end: new Date(taxEnd.getTime() - 86400000), uc, ucAsked: !!ucDay })
  }

  const fmt = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
  const fmtShort = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" })

  return (
    <div style={{ ...card, marginTop: 24 }}>
      <h2 style={h2}>Paid every four weeks?</h2>
      <p style={{ ...sub, lineHeight: 1.6, marginBottom: 12 }}>Then you're paid 13 times a year, not 12 — and once a year two paydays land close together. Enter any payday to see when.</p>
      <label style={label}>ANY RECENT PAYDAY</label>
      <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} style={input} />
      <label style={{ ...label, marginTop: 14 }}>ON UNIVERSAL CREDIT? THE DAY YOUR ASSESSMENT PERIOD STARTS (OPTIONAL)</label>
      <input type="number" min="1" max="31" inputMode="numeric" placeholder="e.g. 14" value={ucDay} onChange={e => setUcDay(e.target.value)} style={input} />
      <button onClick={run} style={{ ...btn, marginTop: 12 }}>FIND MY EXTRA PAYDAY</button>
      {res && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: G, fontFamily: SERIF }}>{res.count} paydays</div>
          <p style={{ ...sub, lineHeight: 1.6 }}>in this tax year ({fmt(res.start)} to {fmt(res.end)}).</p>
          {res.doubles.length > 0 && (
            <p style={{ fontSize: 15, color: W, marginTop: 8, lineHeight: 1.6 }}>
              In the next 12 months, two paydays land in <span style={gold}>{res.doubles.join(" and ")}</span>. Plan that month on purpose rather than letting it disappear.
            </p>
          )}
          {res.uc && (
            <div style={{ ...goldCard, marginTop: 12 }}>
              <p style={{ fontSize: 15, color: W, lineHeight: 1.6 }}>
                <b>Universal Credit:</b> your assessment period from <span style={gold}>{fmtShort(res.uc.from)} to {fmt(res.uc.to)}</span> includes two paydays ({res.uc.pays.map(fmtShort).join(" and ")}). Both count as earnings in that period, so expect a lower Universal Credit payment for it.
              </p>
              <p style={{ fontSize: 12, color: M, marginTop: 8, lineHeight: 1.6 }}>Four-weekly pay means one assessment period a year counts two paydays (<a href="https://litrg.org.uk/benefits/universal-credit/universal-credit-and-employee-pay" style={{ color: G }} target="_blank" rel="noopener">LITRG guidance</a>). Check the exact dates in your Universal Credit journal.</p>
            </div>
          )}
          {res.ucAsked && !res.uc && <p style={{ fontSize: 13, color: T, marginTop: 8 }}>No assessment period in the next year counts two paydays — check the day you entered against your Universal Credit journal.</p>}
          {res.count === 14 && <p style={{ fontSize: 13, color: T, marginTop: 8 }}>This is one of the occasional tax years with a 14th payday.</p>}
          <p style={{ fontSize: 12, color: M, marginTop: 12, lineHeight: 1.6 }}>In Sol, every month is exactly four weeks, so a four-weekly payday lands on the same date every month. This is a guide, not financial advice — check your payslips.</p>
        </div>
      )}
    </div>
  )
}

function BirthdayPage() {
  const [shared] = useState(sharedBirthday)
  const [dateStr, setDateStr] = useState("")
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const calculate = () => {
    if (!dateStr) return
    const d = new Date(dateStr + "T12:00:00")
    if (isNaN(d)) return
    const today = new Date()
    if (d > today) return
    setResult({ date: d, ifc: toIFC(d), f13: countFriday13ths(d, today) })
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
        <p style={sub}>The day of the week you'd celebrate every year. Forever.</p>
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
        <input type="date" value={dateStr} max={fmtDate(new Date()).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")} onChange={e => setDateStr(e.target.value)} style={input} />
        <button onClick={calculate} style={{ ...btn, marginTop: 12 }}>FIND MY TRUE BIRTHDAY</button>
      </div>

      {result && (
        <div style={goldCard}>
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
                <div style={{ fontSize: 32, fontWeight: 700, color: W, fontFamily: SERIF }}>{result.ifc.weekday}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: G, marginBottom: 8, fontFamily: SERIF }}>{result.ifc.day} {result.ifc.month}</div>
                <p style={sub}>Every year. Same date. Same day. Forever.</p>
              </>
            )}

            <div style={{ borderTop: `1px solid ${BD}`, margin: "16px 0", paddingTop: 16 }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: G, fontFamily: SERIF }}>{result.f13}</div>
              <p style={{ ...sub, lineHeight: 1.6 }}>Friday the 13ths you've lived through so far. Cotsworth's original calendar would have given you thirteen a year. In Sol you'd have had none: the 13th is always a Saturday.</p>
            </div>

            {shared && !shared.ifc.special && !result.ifc.special && (
              <p style={{ fontSize: 14, color: sameWeekday ? G : T, marginBottom: 16 }}>
                {sameWeekday ? `You and your friend share a True Birthday weekday: ${result.ifc.weekday}.` : `Your friend's is a ${shared.ifc.weekday}; yours is a ${result.ifc.weekday}.`}
              </p>
            )}

            <button onClick={share} style={{ ...btn, marginBottom: 8 }}>{copied ? "LINK COPIED" : "SHARE MY TRUE BIRTHDAY"}</button>
            <button onClick={downloadCard} style={{ ...btnOutline, marginBottom: 8 }}>DOWNLOAD STORY CARD</button>
            {!result.ifc.special && <button onClick={downloadICS} style={btnOutline}>ADD YEARLY REMINDER TO CALENDAR</button>}
          </div>
        </div>
      )}

      <div style={{ ...card, marginTop: 16 }}>
        <p style={{ fontSize: 12, color: M, lineHeight: 1.7 }}>
          Born on the 29th, 30th or 31st? Your birthday doesn't disappear — it converts to a permanent Sol date.
          Roughly one person in twelve was born on a 29th, 30th or 31st. Every one of those dates converts cleanly.
        </p>
        <p style={{ fontSize: 11, color: M, lineHeight: 1.6, marginTop: 8 }}>Your birthday is worked out on your device and never sent anywhere. Shared links include only the day and month.</p>
      </div>
    </div>
  )
}

function HistoryPage() {
  const sections = [
    { title: "The Month Names Don't Add Up", text: "September comes from the Latin for seven, but it's our ninth month. October means eight, November nine, December ten — each one two places out. By Roman tradition, the earliest calendar had ten months and began in March, so the numbers once fitted. January and February came later, and by 153 BC the Roman year began in January. July and August were renamed rather than added: Quintilis became Julius after Julius Caesar, and Sextilis became Augustus. Nobody renumbered the rest." },
    { title: "The Pope Who Deleted Ten Days", text: "By the 1500s the calendar had drifted ten days against the seasons. In 1582 Pope Gregory XIII ordered a correction: Thursday 4 October was followed by Friday 15 October. Spain, Portugal, the Italian states and Poland–Lithuania switched that October, and France followed in December. Many Protestant states held out for generations, wary of a reform that came from Rome — the Protestant German states waited until 1700." },
    { title: "Britain's 1752 Switch", text: "Britain held out until 1752, 170 years after the reform. By then 11 days had to go: Wednesday 2 September was followed by Thursday 14 September. So that no tax was lost, the tax year was stretched by 11 days and the next one began on 5 April instead of 25 March. In 1800 it moved one more day, to 6 April — where the UK personal tax year still starts." },
    { title: "The International Fixed Calendar", text: "In 1902 Moses Cotsworth proposed 13 months of exactly 28 days. Every month identical. Your birthday on the same weekday every year. One 'Year Day' sits outside the weekly cycle. Kodak ran 13 equal 28-day accounting periods, 1928–1989; employees lived by the Gregorian calendar." },
    { title: "Thirteen Friday the 13ths", text: "In Cotsworth's calendar every month began on a Sunday, so the 13th was always a Friday: thirteen Friday the 13ths a year, guaranteed. Sol keeps his 13 months of 28 days but starts the week on Monday, the international standard. One day's shift, and the 13th becomes a Saturday in every month. Friday the 13th never happens." },
    { title: "Sol — The 13th Month", text: "Sol sits between June and July, around the summer solstice and the longest days of the northern year. Its name is Latin for 'sun', and Sól was the sun personified in Norse myth. In 2026 it's been 124 years since Cotsworth's proposal. Sol is built on it." },
  ]

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>The History</h1>
        <p style={sub}>How a Roman accident became the world's calendar</p>
      </div>
      {sections.map((s, i) => (
        <div key={i} style={card}>
          <h2 style={h2}>{s.title}</h2>
          <p style={{ fontSize: 14, color: T, lineHeight: 1.7 }}>{s.text}</p>
        </div>
      ))}
      <div style={{ ...card, textAlign: "center" }}>
        <a href="/lost-days" style={{ color: G, fontSize: 15 }}>The Lost Days: every time the calendar skipped, and the year that never was →</a>
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
const KIT_FORM_ID = ""

function WaitlistPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | sending | done | error

  const handleSubmit = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setStatus("invalid"); return }
    setStatus("sending")
    try {
      const body = new FormData()
      body.append("email_address", email)
      await fetch(`https://app.kit.com/forms/${KIT_FORM_ID}/subscriptions`, { method: "POST", body, mode: "no-cors" })
      setStatus("done")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>Join the Waitlist</h1>
        <p style={sub}>Be first to know when the book and the first Sol products launch</p>
      </div>

      {!KIT_FORM_ID ? (
        <div style={goldCard}>
          <div style={{ textAlign: "center" }}>
            <h2 style={h2}>The waitlist opens shortly</h2>
            <p style={{ ...sub, lineHeight: 1.6 }}>Sign-ups aren't open yet. In the meantime, find your True Birthday and share it.</p>
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
          </div>
        </div>
      )}

      <div style={{ ...card, marginTop: 16 }}>
        <h2 style={h2}>What's Coming</h2>
        <div style={{ fontSize: 14, color: T, lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8 }}><span style={gold}>☀ Still Ruled by Rome</span> — the book. The hidden history of how we measure time, and why we still live by a Roman calendar.</div>
          <div style={{ marginBottom: 8 }}><span style={gold}>☀ Systems We Never Questioned</span> — the companion book on the everyday systems nobody chose.</div>
          <div style={{ marginBottom: 8 }}><span style={gold}>☀ Sol planners and journals</span> — 13 months of 28 days, built for the way Sol works.</div>
          <div><span style={gold}>☀ 28-day challenges</span> — printable workbooks that fit one Sol month exactly.</div>
        </div>
        <p style={{ fontSize: 12, color: M, marginTop: 12 }}>Waitlist members hear first, with launch dates and early access.</p>
      </div>
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
      {sec("Your dates stay on your device", "Every date you enter — including your birthday — is worked out in your own browser and never sent to us. Shared birthday links contain only a day and month. This site uses no cookies, no analytics and no advertising trackers.")}
      {sec("The waitlist", "If you join the waitlist we collect your email address and nothing else, and use it only to send you news about Sol, its books and products. We ask for your consent first, and you confirm it from a link we email you. Every email has an unsubscribe link, and you can ask us to delete your address at any time.")}
      {sec("Who handles it", "Waitlist emails are stored and sent by Kit, our email provider, which is based in the United States. The site is served by Vercel, which may keep short-lived technical logs, such as IP addresses, to keep the service running and secure.")}
      {sec("Your rights", "You can ask to see, correct or delete the personal data we hold about you. If you're unhappy with how we've handled it, you can complain to the Information Commissioner's Office at ico.org.uk.")}
    </div>
  )
}

// ═══ MAIN APP ═══

export default function App() {
  const [page, setPage] = useState(() => {
    if (sharedBirthday()) return "birthday"
    try { const go = new URLSearchParams(window.location.search).get("go"); if (["convert","birthday","history","waitlist","privacy"].includes(go)) return go } catch {}
    return "home"
  })
  const pages = { home: HomePage, convert: ConverterPage, birthday: BirthdayPage, history: HistoryPage, waitlist: WaitlistPage, privacy: PrivacyPage }
  const Page = pages[page]
  const navItems = [
    { id: "home", label: "TODAY" },
    { id: "convert", label: "CONVERT" },
    { id: "birthday", label: "BIRTHDAY" },
    { id: "history", label: "HISTORY" },
    { id: "waitlist", label: "WAITLIST" },
  ]

  return (
    <div style={container}>
      <div style={wrap}>
        <Page />
        <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <button onClick={() => { setPage("privacy"); window.scrollTo(0, 0) }} style={{ background: "none", border: "none", color: M, fontSize: 12, textDecoration: "underline", cursor: "pointer" }}>Privacy</button>
          <span style={{ color: M, fontSize: 12 }}> · Sol — Time, fixed.</span>
        </div>
      </div>
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: "#15152A",
        borderTop: `1px solid ${BD}`, display: "flex", padding: "8px 0",
        justifyContent: "space-around", zIndex: 100
      }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={navBtn(page === n.id)}>{n.label}</button>
        ))}
      </nav>
      <div style={{ height: 60 }} />
    </div>
  )
}
