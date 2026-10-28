// Sol date engine — pure functions, tested in tests/engine.test.mjs
const IFC_MONTHS = ["January","February","March","April","May","June","Sol","July","August","September","October","November","December"]
const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
const SHORT_WD = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

function ordinal(n) { const v = n % 100; return n + ((v > 10 && v < 14) ? 'th' : ({1:'st',2:'nd',3:'rd'}[n % 10] || 'th')) }
function fmtDate(x) { return `${x.getFullYear()}${String(x.getMonth()+1).padStart(2,'0')}${String(x.getDate()).padStart(2,'0')}` }
function countFriday13ths(from, to) {
  let n = 0
  const d = new Date(from.getFullYear(), from.getMonth(), 13)
  if (d < from) d.setMonth(d.getMonth() + 1)
  while (d <= to) { if (d.getDay() === 5) n++; d.setMonth(d.getMonth() + 1) }
  return n
}
function daysUntil(target, now) { return Math.ceil((target - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000) }
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
function isLeapYear(y) { return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) }

// Day of the year from the calendar date alone, so clock changes (BST) can't shift it.
function doy(date) {
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 86400000) + 1
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
  const known = new Date(Date.UTC(2000, 0, 6, 18, 14))
  const diff = (date.getTime() - known.getTime()) / 86400000
  const phase = ((diff % 29.530589) + 29.530589) % 29.530589
  const pct = phase / 29.530589
  const names = ["New Moon","Waxing Crescent","First Quarter","Waxing Gibbous","Full Moon","Waning Gibbous","Third Quarter","Waning Crescent"]
  const icons = ["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"]
  const i = Math.round(pct * 8) % 8
  return { name: names[i], icon: icons[i], age: Math.round(phase) }
}

export { IFC_MONTHS, WEEKDAYS, SHORT_WD, MONTH_NAMES, ordinal, fmtDate, countFriday13ths, daysUntil, isLeapYear, doy, toIFC, moonPhase }

// ═══ ETHIOPIAN CALENDAR ═══
// 12 months of 30 days, then Pagume: 5 days, or 6 in an Ethiopian leap year (the year before a Gregorian leap year).
// Arithmetic from the standard Ethiopic epoch (Julian Day Number 1724221), as in Reingold & Dershowitz, Calendrical Calculations.
const ETH_MONTHS = ["Meskerem","Tikimt","Hidar","Tahsas","Tir","Yekatit","Megabit","Miyazya","Ginbot","Sene","Hamle","Nehase","Pagume"]
const ETH_EPOCH = 1724221
const jdnFromDate = date => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) + 2440588
const ethToJdn = (y, m, d) => ETH_EPOCH - 1 + 365 * (y - 1) + Math.floor(y / 4) + 30 * (m - 1) + d
function toEthiopian(date) {
  const jdn = jdnFromDate(date)
  const year = Math.floor((4 * (jdn - ETH_EPOCH) + 1463) / 1461)
  const month = Math.floor((jdn - ethToJdn(year, 1, 1)) / 30) + 1
  const day = jdn - ethToJdn(year, month, 1) + 1
  return { year, month, day, monthName: ETH_MONTHS[month - 1], pagumeDays: (year + 1) % 4 === 0 ? 6 : 5 }
}
export { ETH_MONTHS, toEthiopian }
