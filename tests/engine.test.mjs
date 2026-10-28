// Run with: TZ=Europe/London node --test tests
// These run before every build. If one fails, the site does not deploy.
import { test } from "node:test"
import assert from "node:assert/strict"
import { toIFC, countFriday13ths, moonPhase, isLeapYear } from "../src/engine.js"

const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min)

test("fixed points of the calendar", () => {
  const cases = [
    [at(2026, 1, 1), "January", 1, "Monday"],
    [at(2026, 1, 28), "January", 28, "Sunday"],
    [at(2026, 1, 29), "February", 1, "Monday"],
    [at(2027, 6, 17), "June", 28, "Sunday"],      // day 168, ordinary year
    [at(2027, 6, 18), "Sol", 1, "Monday"],        // day 169, ordinary year
    [at(2028, 6, 18), "Sol", 1, "Monday"],        // the day after Leap Day
    [at(2028, 12, 30), "December", 28, "Sunday"],
    [at(2026, 10, 28), "October", 21, "Sunday"],
  ]
  for (const [date, month, day, weekday] of cases) {
    const r = toIFC(date)
    assert.deepEqual([r.month, r.day, r.weekday], [month, day, weekday], date.toDateString())
  }
})

test("Leap Day and Year Day sit outside the week", () => {
  assert.equal(toIFC(at(2028, 6, 17)).special, "Leap Day")   // day 169 of a leap year
  assert.equal(toIFC(at(2027, 6, 17)).special, null)
  assert.equal(toIFC(at(2027, 12, 31)).special, "Year Day")
  assert.equal(toIFC(at(2028, 12, 31)).special, "Year Day")
  assert.equal(toIFC(at(2027, 12, 31)).weekday, "Outside the week")
})

test("the 13th of every Sol month is a Saturday, so Friday the 13th cannot happen", () => {
  for (const y of [2026, 2027, 2028, 2100]) {
    for (let d = at(y, 1, 1); d.getFullYear() === y; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12)) {
      const r = toIFC(d)
      if (r.day === 13) assert.equal(r.weekday, "Saturday", d.toDateString())
      assert.notEqual(r.day === 13 && r.weekday === "Friday", true)
    }
  }
})

test("every ordinary date maps to exactly one Sol date, in order", () => {
  for (const y of [2026, 2028]) {
    let prev = 0
    const days = isLeapYear(y) ? 366 : 365
    for (let i = 0; i < days; i++) {
      const r = toIFC(new Date(y, 0, 1 + i, 12))
      assert.equal(r.doy, i + 1)
      if (!r.special) {
        const n = (r.monthNum - 1) * 28 + r.day
        assert.equal(n, prev + 1, `${y} day ${i + 1}`)
        prev = n
      }
    }
    assert.equal(prev, 364)
  }
})

test("clock changes cannot shift the date (any hour, any day, British time)", () => {
  for (const y of [2026, 2027, 2028]) {
    for (let i = 0; i < 366; i++) {
      const noon = new Date(y, 0, 1 + i, 12)
      if (noon.getFullYear() !== y) break
      const want = toIFC(noon)
      for (const h of [0, 1, 2, 23]) {
        const d = new Date(y, 0, 1 + i, h, 30)
        assert.deepEqual(toIFC(d), want, d.toString())
      }
    }
  }
})

test("Friday the 13th count (2026 has three: February, March, November)", () => {
  assert.equal(countFriday13ths(at(2026, 1, 1), at(2026, 12, 31)), 3)
  assert.equal(countFriday13ths(at(2026, 3, 14), at(2026, 11, 12)), 0)
})

test("moon phase matches eclipses (eclipses only happen at new and full moon)", () => {
  assert.equal(moonPhase(new Date(Date.UTC(2024, 3, 8, 18, 21))).name, "New Moon")   // total solar eclipse, USA
  assert.equal(moonPhase(new Date(Date.UTC(2025, 2, 14, 6, 59))).name, "Full Moon")  // total lunar eclipse
})

test("Ethiopian calendar matches published new years (FCDO 2015, WHO Africa 2019)", async () => {
  const { toEthiopian } = await import("../src/engine.js")
  const e = d => { const r = toEthiopian(d); return `${r.day} ${r.monthName} ${r.year}` }
  assert.equal(e(at(2015, 9, 12)), "1 Meskerem 2008")   // FCDO: 2008 began 12 Sept 2015
  assert.equal(e(at(2019, 9, 11)), "6 Pagume 2011")     // WHO: Pagume 6 is the last day of 2011
  assert.equal(e(at(2019, 9, 12)), "1 Meskerem 2012")   // WHO: 2012 began 12 September 2019
  assert.equal(e(at(2026, 9, 11)), "1 Meskerem 2019")   // the current Ethiopian year
  assert.equal(e(at(2026, 9, 10)), "5 Pagume 2018")
  assert.equal(toEthiopian(at(2026, 10, 28)).year, 2019)
  for (let i = 0; i < 3000; i++) {                       // every day for eight years: months run 1–30, Pagume 1–5/6
    const r = toEthiopian(new Date(2024, 0, 1 + i, 12))
    assert.ok(r.day >= 1 && r.day <= (r.month === 13 ? r.pagumeDays : 30), JSON.stringify(r))
  }
})
