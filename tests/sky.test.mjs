// Checks the sky engine against published astronomical events.
import { test } from "node:test"
import assert from "node:assert/strict"
import { sunAngle, moonElongation, moonInfo, solarReturn } from "../src/sky.js"
const utc = (y, m, d, h, min) => new Date(Date.UTC(y, m - 1, d, h, min))
const near = (a, b, tol) => { let x = Math.abs(a - b) % 360; if (x > 180) x = 360 - x; assert.ok(x <= tol, `${a} not within ${tol} of ${b}`) }

test("Sun is at 0 degrees at the March equinox and 90 at the June solstice", () => {
  near(sunAngle(utc(2026, 3, 20, 14, 46)), 0, 0.02)
  near(sunAngle(utc(2026, 6, 21, 8, 24)), 90, 0.02)
  near(sunAngle(utc(2000, 3, 20, 7, 35)), 0, 0.02)
})
test("Moon is new at a solar eclipse and full at a lunar eclipse", () => {
  near(moonElongation(utc(2026, 2, 17, 12, 1)), 0, 0.5)
  near(moonElongation(utc(2026, 3, 3, 11, 38)), 180, 0.5)
  near(moonElongation(utc(1999, 8, 11, 11, 8)), 0, 0.5)
})
test("lunation numbering: 953 began on 6 January 2000", () => {
  assert.equal(moonInfo(utc(2000, 1, 10, 12, 0)).lunation, 953)
  assert.equal(moonInfo(utc(2000, 1, 5, 12, 0)).lunation, 952)
  assert.equal(moonInfo(utc(2000, 2, 10, 12, 0)).lunation, 954)
})
test("solar return lands back on the same angle, about 5h49m later each year", () => {
  const birth = utc(1970, 8, 9, 12, 0), a = sunAngle(birth)
  const r1 = solarReturn(a, 2026, 7, 9), r2 = solarReturn(a, 2027, 7, 9)
  near(sunAngle(r1), a, 0.001)
  const hours = (r2 - r1) / 3600000 - 365 * 24
  assert.ok(hours > 5.6 && hours < 6.0, `year step was ${hours}h`)
})
