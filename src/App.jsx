import React, { useState, useEffect } from 'react'

// ═══ IFC ENGINE ═══
const IFC_MONTHS = ["January","February","March","April","May","June","Sol","July","August","September","October","November","December"]
const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
const SHORT_WD = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

function ordinal(n) { const v = n % 100; return n + ((v > 10 && v < 14) ? 'th' : ({1:'st',2:'nd',3:'rd'}[n % 10] || 'th')) }
function isLeapYear(y) { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) }

function doy(date) {
  const start = new Date(date.getFullYear(), 0, 1)
  return Math.floor((date - start) / 86400000) + 1
}

function toIFC(date) {
  const year = date.getFullYear()
  const d = doy(date)
  const leap = isLeapYear(year)
  const total = leap ? 366 : 365
  if (d === total) return { month: "Year Day", monthNum: 0, day: 0, weekday: "Outside the week", special: "Year Day", doy: d }
  if (leap && d === 169) return { month: "Leap Day", monthNum: 0, day: 0, weekday: "Outside the week", special: "Leap Day", doy: d }
  let adj = d
  if (leap && d > 169) adj -= 1
  const mn = Math.ceil(adj / 28)
  const md = ((adj - 1) % 28) + 1
  const wd = WEEKDAYS[(md - 1) % 7]
  return { month: IFC_MONTHS[mn - 1], monthNum: mn, day: md, weekday: wd, special: null, doy: d }
}

function moonPhase(date) {
  const known = new Date(2000, 0, 6, 18, 14)
  const diff = (date.getTime() - known.getTime()) / 86400000
  const phase = ((diff % 29.53) + 29.53) % 29.53
  const pct = phase / 29.53
  const names = ["New Moon","Waxing Crescent","First Quarter","Waxing Gibbous","Full Moon","Waning Gibbous","Third Quarter","Waning Crescent"]
  const icons = ["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"]
  const i = Math.floor(pct * 8) % 8
  return { name: names[i], icon: icons[i], age: Math.round(phase) }
}

// ═══ STYLES ═══
const G = "#D4A017", D = "#0A0A0A", BG = "#111", BD = "#222", T = "#C8C4B8", W = "#E8E4D8", M = "#666"

const container = { background: D, minHeight: "100vh", fontFamily: "'Segoe UI','Helvetica Neue',sans-serif", color: T }
const wrap = { maxWidth: 540, margin: "0 auto", padding: "20px 16px" }
const card = { background: BG, border: `1px solid ${BD}`, borderRadius: 12, padding: "20px", marginBottom: 12 }
const goldCard = { ...card, border: `1px solid ${G}`, background: "rgba(212,160,23,0.05)" }
const btn = { background: G, color: D, border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 1, width: "100%" }
const btnOutline = { ...btn, background: "transparent", color: G, border: `1px solid ${G}` }
const input = { width: "100%", padding: "12px 16px", fontSize: 16, background: "#1A1A1A", border: `1px solid #333`, borderRadius: 8, color: W, boxSizing: "border-box" }
const navBtn = (active) => ({ background: active ? G : "transparent", color: active ? D : M, border: "none", padding: "8px 0", fontSize: 11, fontWeight: 700, cursor: "pointer", flex: 1, letterSpacing: 1 })
const label = { fontSize: 11, color: M, letterSpacing: 2, fontWeight: 700, marginBottom: 8, display: "block" }
const h1 = { fontSize: 24, fontWeight: 900, color: W, marginBottom: 4 }
const h2 = { fontSize: 18, fontWeight: 700, color: W, marginBottom: 12 }
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
        <div style={label}>INTERNATIONAL FIXED CALENDAR</div>
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
          <div style={label}>IFC MONTH</div>
          <MiniGrid day={ifc.day} />
        </div>
      </div>

      <div style={{ ...card, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: M, lineHeight: 1.6, fontStyle: "italic" }}>
          In the IFC, the 1st is always Monday. The 13th is always Saturday. Your birthday is the same day of the week every year. Forever.
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
        <p style={sub}>Any Gregorian date → IFC equivalent</p>
      </div>

      <div style={card}>
        <label style={label}>GREGORIAN DATE</label>
        <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} style={input} />
        <button onClick={convert} style={{ ...btn, marginTop: 12 }}>CONVERT</button>
      </div>

      {result && (
        <div style={goldCard}>
          <div style={label}>IFC DATE</div>
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
    </div>
  )
}

function BirthdayPage() {
  const [dateStr, setDateStr] = useState("")
  const [result, setResult] = useState(null)

  const calculate = () => {
    if (!dateStr) return
    const d = new Date(dateStr + "T12:00:00")
    if (isNaN(d)) return
    const ifc = toIFC(d)
    setResult({ date: d, ifc })
  }

  const downloadCard = () => {
    if (!result || result.ifc.special) return
    const { ifc } = result
    const canvas = document.createElement("canvas")
    canvas.width = 1080; canvas.height = 1080
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#0A0A0A"; ctx.fillRect(0, 0, 1080, 1080)
    ctx.fillStyle = "#D4A017"; ctx.font = "bold 16px sans-serif"; ctx.letterSpacing = "8px"
    ctx.textAlign = "center"; ctx.fillText("SOL", 540, 200)
    ctx.fillStyle = "#E8E4D8"; ctx.font = "bold 64px sans-serif"; ctx.letterSpacing = "0px"
    ctx.fillText("My True Birthday", 540, 340)
    ctx.fillStyle = "#D4A017"; ctx.font = "bold 80px sans-serif"
    ctx.fillText(`${ifc.weekday}`, 540, 480)
    ctx.fillText(`${ifc.day} ${ifc.month}`, 540, 580)
    ctx.fillStyle = "#666"; ctx.font = "24px sans-serif"
    ctx.fillText("Every year. Same date. Same day. Forever.", 540, 700)
    ctx.fillStyle = "#D4A017"; ctx.font = "bold 18px sans-serif"
    ctx.fillText("sol28.co.uk", 540, 820)
    const link = document.createElement("a")
    link.download = `sol-true-birthday-${ifc.month.toLowerCase()}-${ifc.day}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const downloadICS = () => {
    if (!result || result.ifc.special) return
    const d = result.date
    const { ifc } = result
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const yr = new Date().getFullYear() + 1
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sol//True Birthday//EN",
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${yr}${mm}${dd}`,
      `DTEND;VALUE=DATE:${yr}${mm}${String(d.getDate()+1).padStart(2,"0")}`,
      `SUMMARY:🎂 True Birthday — ${ifc.weekday} ${ifc.day} ${ifc.month}`,
      `DESCRIPTION:In the IFC your birthday is always ${ifc.weekday} the ${ordinal(ifc.day)} of ${ifc.month}. Forever. sol28.co.uk`,
      `UID:sol-bday-${mm}${dd}@sol28.co.uk`, "RRULE:FREQ=YEARLY",
      "BEGIN:VALARM", "TRIGGER:-PT0M", "ACTION:DISPLAY",
      `DESCRIPTION:Happy True Birthday!`, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n")
    const blob = new Blob([ics], { type: "text/calendar" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
    a.download = `sol-true-birthday.ics`; a.click()
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>Your True Birthday</h1>
        <p style={sub}>The day of the week you'd celebrate every year. Forever.</p>
      </div>

      <div style={card}>
        <label style={label}>YOUR BIRTHDAY</label>
        <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} style={input} />
        <button onClick={calculate} style={{ ...btn, marginTop: 12 }}>FIND MY TRUE BIRTHDAY</button>
      </div>

      {result && !result.ifc.special && (
        <div style={goldCard}>
          <div style={{ textAlign: "center" }}>
            <div style={label}>YOUR TRUE BIRTHDAY</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: W }}>{result.ifc.weekday}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: G, marginBottom: 8 }}>{result.ifc.day} {result.ifc.month}</div>
            <p style={{ ...sub, marginBottom: 16 }}>Every year. Same date. Same day. Forever.</p>
            <button onClick={downloadCard} style={{ ...btn, marginBottom: 8 }}>📸 DOWNLOAD BIRTHDAY CARD</button>
            <button onClick={downloadICS} style={btnOutline}>📅 ADD YEARLY REMINDER TO CALENDAR</button>
          </div>
        </div>
      )}

      <div style={{ ...card, marginTop: 16 }}>
        <p style={{ fontSize: 12, color: M, lineHeight: 1.7 }}>
          Born on the 29th, 30th, or 31st? Your birthday doesn't disappear — it converts to a permanent IFC date.
          28.6% of the world was born on dates that "don't exist" in the IFC. Every one converts cleanly.
        </p>
      </div>
    </div>
  )
}

function HistoryPage() {
  const sections = [
    { title: "The Month Names Don't Add Up", text: "September means 7 but it's the 9th. October means 8 but it's the 10th. November means 9 but it's the 11th. December means 10 but it's the 12th. Every numbered month is wrong by exactly two positions. Why? The original Roman calendar started in March and had ten months. When January and February were added at the front, the numbered months got pushed forward. Then Julius Caesar and Augustus each claimed a month — July and August. Nobody renumbered anything." },
    { title: "The Pope Who Deleted Ten Days", text: "By the 1500s, the calendar had drifted 10 days from the actual seasons. In 1582, Pope Gregory XIII issued a decree: Thursday October 4th was followed by Friday October 15th. Ten days simply ceased to exist. Catholic countries adopted it immediately. Protestant nations refused for decades or centuries — not because the maths was wrong, but because they wouldn't follow a Pope." },
    { title: "Britain's 1752 Switch", text: "Britain held out until 1752 — 170 years after the reform. By then, 11 days needed to be removed. Wednesday September 2nd was followed by Thursday September 14th. The Treasury shifted the tax year start from March 25th to April 6th to protect revenue. That date remains the UK tax year start to this day." },
    { title: "The International Fixed Calendar", text: "In 1902, Moses Cotsworth proposed 13 months of exactly 28 days. Every month identical. Your birthday on the same weekday every year. One 'Year Day' sits outside the weekly cycle. Kodak ran 13 equal 28-day accounting periods, 1928–1989; employees lived by the Gregorian calendar." },
    { title: "Sol — The 13th Month", text: "Sol sits between June and July, over the summer solstice. Latin for 'sun.' The Norse sun goddess. The brightest point of the year. In 2026, it's been 124 years since Cotsworth's proposal. Sol is built on it." },
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
        <p style={{ fontSize: 14, color: G, fontStyle: "italic" }}>
          We're not using this calendar because it's the best one. We're using it because it's the one we inherited.
        </p>
        <p style={{ fontSize: 12, color: M, marginTop: 8 }}>Sol — Time, fixed.</p>
      </div>
    </div>
  )
}

function WaitlistPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (!email || !email.includes("@")) return
    // In production, this would POST to a Buttondown/Mailchimp API endpoint
    setSubmitted(true)
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={tag}>SOL</div>
        <h1 style={h1}>Join the Waitlist</h1>
        <p style={sub}>Be first to know when the Sol planner launches</p>
      </div>

      {!submitted ? (
        <div style={goldCard}>
          <label style={label}>YOUR EMAIL</label>
          <input type="email" value={email} placeholder="you@example.com" onChange={e => setEmail(e.target.value)} style={input} />
          <button onClick={handleSubmit} style={{ ...btn, marginTop: 12 }}>JOIN THE WAITLIST</button>
          <p style={{ fontSize: 11, color: M, marginTop: 8, textAlign: "center" }}>No spam. Just Sol updates. Unsubscribe anytime.</p>
        </div>
      ) : (
        <div style={goldCard}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>☀️</div>
            <h2 style={h2}>You're on the list</h2>
            <p style={{ ...sub, lineHeight: 1.6 }}>We'll let you know when the Sol planner is ready. In the meantime, find your True Birthday.</p>
          </div>
        </div>
      )}

      <div style={{ ...card, marginTop: 16 }}>
        <h2 style={h2}>What's Coming</h2>
        <div style={{ fontSize: 14, color: T, lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8 }}><span style={gold}>☀ Sol Planner 2027</span> — 13-month A5 hardcover. Standard (£22) and Collector's (£35) editions.</div>
          <div style={{ marginBottom: 8 }}><span style={gold}>☀ Sol Daily Diary</span> — A fact a day. Moon phase. Day length. 28 pages per month.</div>
          <div style={{ marginBottom: 8 }}><span style={gold}>☀ Sol Desk Calendar</span> — 365 facts and debunked myths. Tear-off page per day.</div>
          <div><span style={gold}>☀ "Still Ruled by Rome"</span> — The book. On Amazon KDP.</div>
        </div>
      </div>
    </div>
  )
}

// ═══ MAIN APP ═══

export default function App() {
  const [page, setPage] = useState("home")
  const pages = { home: HomePage, convert: ConverterPage, birthday: BirthdayPage, history: HistoryPage, waitlist: WaitlistPage }
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
      </div>
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: "#111",
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
