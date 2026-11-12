// Payday engine: when benefit and wage payments arrive. Pure functions, tested in tests/payday.test.mjs.
// Rules from GOV.UK "How and when your benefits are paid": a payment due on a weekend or bank holiday
// is usually paid on the working day before. Bank holidays are those for England and Wales.
import { toIFC, ordinal } from "./engine.js"

const DAY = 86400000
const at = (y, m, d) => new Date(y, m, d, 12)
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const addDays = (d, n) => at(d.getFullYear(), d.getMonth(), d.getDate() + n)
const daysBetween = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY)

// Easter Sunday (Gregorian), by the anonymous algorithm in Meeus, Astronomical Algorithms, ch. 8.
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1
  return at(y, month - 1, day)
}
const firstMonday = (y, m) => { const d = at(y, m, 1); return addDays(d, (8 - d.getDay()) % 7) }
const lastMonday = (y, m) => { const d = at(y, m + 1, 0); return addDays(d, -((d.getDay() + 6) % 7)) }
// Bank holidays in England and Wales for one year, with weekend substitutes.
function bankHolidays(y) {
  const out = []
  const ny = at(y, 0, 1); out.push(ny.getDay() === 6 ? at(y, 0, 3) : ny.getDay() === 0 ? at(y, 0, 2) : ny)
  const e = easter(y); out.push(addDays(e, -2), addDays(e, 1))
  out.push(firstMonday(y, 4), lastMonday(y, 4), lastMonday(y, 7))
  const x = at(y, 11, 25).getDay()
  if (x === 5) out.push(at(y, 11, 25), at(y, 11, 28))
  else if (x === 6) out.push(at(y, 11, 27), at(y, 11, 28))
  else if (x === 0) out.push(at(y, 11, 26), at(y, 11, 27))
  else out.push(at(y, 11, 25), at(y, 11, 26))
  return out.map(key)
}
const bhCache = {}
const isBankHoliday = (d) => { const y = d.getFullYear(); return (bhCache[y] ||= bankHolidays(y)).includes(key(d)) }
const isWorkingDay = (d) => d.getDay() !== 0 && d.getDay() !== 6 && !isBankHoliday(d)
// The day the money actually arrives: the due date, or the working day before.
function paidOn(due) { let d = due; while (!isWorkingDay(d)) d = addDays(d, -1); return d }

// Due dates from `from` (inclusive) to `to` (exclusive).
// every: 7, 14 or 28 (days, counted from any known payment date) or "month" (same day number each month).
function dueDates(anchor, every, from, to) {
  const out = []
  if (every === "month") {
    const n = anchor.getDate()
    for (let y = from.getFullYear(), m = from.getMonth() - 1; ; m++) {
      const last = at(y, m + 1, 0).getDate(), d = at(y, m, Math.min(n, last))
      if (d >= to) break
      if (d >= from) out.push(d)
    }
    return out
  }
  const k = Math.ceil(daysBetween(anchor, from) / every)
  for (let d = addDays(anchor, k * every); d < to; d = addDays(d, every)) out.push(d)
  return out
}

// A full schedule for one payment: due date, arrival date, whether it came early, and the gap since the last arrival.
function schedule(anchor, every, from, months = 12, shift = true) {
  const arrive = shift ? paidOn : (d) => d
  const to = at(from.getFullYear(), from.getMonth() + months, from.getDate())
  const usual = every === "month" ? 31 : every
  // start one cycle back so the first gap is known
  const back = every === "month" ? at(from.getFullYear(), from.getMonth() - 1, from.getDate()) : addDays(from, -every)
  // ...and one cycle past the end so the last wait is known
  const beyond = every === "month" ? at(to.getFullYear(), to.getMonth() + 2, 1) : addDays(to, every)
  const all = dueDates(anchor, every, back, beyond).map((due) => ({ due, paid: arrive(due) }))
  const rows = []
  for (let i = 0; i < all.length; i++) {
    const r = all[i]
    if (r.due < from || r.due >= to) continue
    const gap = i > 0 ? daysBetween(all[i - 1].paid, r.paid) : null
    const next = all[i + 1] ? daysBetween(r.paid, all[i + 1].paid) : null
    rows.push({ ...r, early: key(r.due) !== key(r.paid), gap, toNext: next, longWait: next !== null && next > usual })
  }
  return rows
}

// Calendar months in which a payment arrives twice.
function doubleMonths(rows) {
  const c = {}
  rows.forEach((r) => { const k = `${r.paid.getFullYear()}-${r.paid.getMonth()}`; (c[k] ||= []).push(r) })
  return Object.values(c).filter((v) => v.length > 1)
}

// Universal Credit assessment periods (day N of one month to the day before day N of the next) holding more wage paydays than usual.
function extraPaydayPeriods(wageAnchor, every, apStart, from, months = 13) {
  const n = apStart.getDate(), usual = { 7: 4, 14: 2, 28: 1 }[every]
  if (!usual) return []
  const start = (y, m) => at(y, m, Math.min(n, at(y, m + 1, 0).getDate()))
  let y = from.getFullYear(), m = from.getMonth()
  if (start(y, m) > from) m -= 1
  const out = []
  for (let i = 0; i < months; i++) {
    const a = start(y, m + i), b = start(y, m + i + 1)
    const pays = dueDates(wageAnchor, every, a, b)
    if (pays.length > usual) out.push({ from: a, to: addDays(b, -1), pays, usual })
  }
  return out
}

// Where a four-weekly payment sits in Sol: one fixed date for each stretch of the year.
function solRuns(rows) {
  const runs = []
  rows.forEach((r) => {
    const s = toIFC(r.due)
    const label = s.special ? s.special : `${s.weekday} the ${ordinal(s.day)}`
    const last = runs[runs.length - 1]
    if (last && last.label === label) { last.to = r.due; last.count++ } else runs.push({ label, from: r.due, to: r.due, count: 1 })
  })
  return runs
}

// An .ics calendar file of payment days, for any phone calendar.
function toICS(items) {
  const stamp = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sol//Payday Calendar//EN", "CALSCALE:GREGORIAN"]
  items.forEach((it, i) => {
    lines.push("BEGIN:VEVENT", `UID:payday-${stamp(it.paid)}-${i}@sol28.co.uk`, `DTSTAMP:${stamp(new Date())}T000000Z`,
      `DTSTART;VALUE=DATE:${stamp(it.paid)}`, `DTEND;VALUE=DATE:${stamp(addDays(it.paid, 1))}`,
      `SUMMARY:${it.name} due${it.early ? " (early)" : ""}`, "TRANSP:TRANSPARENT", "END:VEVENT")
  })
  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

export { easter, bankHolidays, isWorkingDay, paidOn, dueDates, schedule, doubleMonths, extraPaydayPeriods, solRuns, toICS, daysBetween, key }
