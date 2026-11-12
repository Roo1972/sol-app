// Sky engine: where the Sun and Moon were at a given instant.
// Formulae from Jean Meeus, Astronomical Algorithms (2nd ed.), ch. 25 (Sun) and ch. 47 (Moon, main terms).
// Pure functions, tested in tests/sky.test.mjs against published equinox, solstice and eclipse times.
const RAD = Math.PI / 180
const norm = (x) => ((x % 360) + 360) % 360
const SYNODIC = 29.530588861
const jd = (date) => date.getTime() / 86400000 + 2440587.5
const fromJd = (j) => new Date((j - 2440587.5) * 86400000)
const cent = (j) => (j - 2451545.0) / 36525

function sunTrue(T) {
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M)
  return L0 + C
}
// Degrees the Sun has travelled past the March equinox (apparent ecliptic longitude), 0 to 360.
function sunAngle(date) {
  const T = cent(jd(date))
  return norm(sunTrue(T) - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * RAD))
}
const MOON_TERMS = [[0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],[0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],[2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036]]
function moonLon(T) {
  const Lp = 218.3164477 + 481267.88123421 * T
  const D = (297.8501921 + 445267.1114034 * T) * RAD, M = (357.5291092 + 35999.0502909 * T) * RAD
  const Mp = (134.9633964 + 477198.8675055 * T) * RAD, F = (93.272095 + 483202.0175233 * T) * RAD
  let s = 0
  for (const [d, m, mp, f, c] of MOON_TERMS) s += c * Math.sin(d * D + m * M + mp * Mp + f * F)
  return Lp + s / 1e6
}
// How far the Moon is ahead of the Sun: 0 = new, 180 = full.
function moonElongation(date) { const T = cent(jd(date)); return norm(moonLon(T) - sunTrue(T)) }
const PHASES = ["New Moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full Moon", "Waning gibbous", "Last quarter", "Waning crescent"]
function moonInfo(date) {
  const e = moonElongation(date)
  const age = e / 360 * SYNODIC
  // Lunation number (Brown's count, used by astronomers): number 953 began with the new moon of 6 January 2000.
  const lunation = Math.round((jd(date) - age - 2451550.09766) / SYNODIC) + 953
  return { elongation: e, age, day: Math.floor(age) + 1, phase: PHASES[Math.round(e / 45) % 8], lunation }
}
// The instant in a given year when the Sun returns to a given angle.
function solarReturn(angle, year, monthIndex, day) {
  let j = jd(new Date(Date.UTC(year, monthIndex, day, 12)))
  for (let i = 0; i < 8; i++) {
    let diff = norm(angle - sunAngle(fromJd(j))); if (diff > 180) diff -= 360
    j += diff / 0.985647
  }
  return fromJd(j)
}
export { sunAngle, moonElongation, moonInfo, solarReturn }
