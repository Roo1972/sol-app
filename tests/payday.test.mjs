// Checks the payday engine against published bank holidays and worked examples.
import { test } from "node:test"
import assert from "node:assert/strict"
import { easter, bankHolidays, paidOn, schedule, doubleMonths, extraPaydayPeriods, solRuns, toICS, key } from "../src/payday.js"
const d = (y, m, day) => new Date(y, m - 1, day, 12)

test("Easter Sunday matches published dates", () => {
  assert.equal(key(easter(2026)), "2026-04-05"); assert.equal(key(easter(2027)), "2027-03-28"); assert.equal(key(easter(2028)), "2028-04-16")
})
test("England and Wales bank holidays match GOV.UK for 2026 to 2028", () => {
  assert.deepEqual(bankHolidays(2026).sort(), ["2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28"])
  assert.deepEqual(bankHolidays(2027).sort(), ["2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28"])
  assert.deepEqual(bankHolidays(2028).sort(), ["2028-01-03", "2028-04-14", "2028-04-17", "2028-05-01", "2028-05-29", "2028-08-28", "2028-12-25", "2028-12-26"])
})
test("a payment due on a weekend or bank holiday arrives the working day before", () => {
  assert.equal(key(paidOn(d(2027, 3, 29))), "2027-03-25") // Easter Monday, Good Friday before it
  assert.equal(key(paidOn(d(2026, 12, 27))), "2026-12-24") // Sunday after Christmas
  assert.equal(key(paidOn(d(2027, 2, 27))), "2027-02-26") // Saturday
  assert.equal(key(paidOn(d(2027, 4, 26))), "2027-04-26") // ordinary Monday
})
test("a four-weekly payment from Mon 4 Jan 2027: 13 in the year, Easter one early, 32-day wait after", () => {
  const rows = schedule(d(2027, 1, 4), 28, d(2027, 1, 1), 12)
  assert.equal(rows.length, 13)
  const easterRow = rows.find((r) => key(r.due) === "2027-03-29")
  assert.equal(key(easterRow.paid), "2027-03-25"); assert.equal(easterRow.early, true); assert.equal(easterRow.toNext, 32); assert.equal(easterRow.longWait, true)
  const dm = doubleMonths(rows); assert.equal(dm.length, 1); assert.equal(dm[0][0].paid.getMonth(), 2)
  const runs = solRuns(rows); assert.equal(runs.length, 1); assert.equal(runs[0].label, "Thursday the 4th")
})
test("the Sol date steps back by one at the new year", () => {
  const runs = solRuns(schedule(d(2027, 1, 4), 28, d(2027, 11, 1), 4))
  assert.deepEqual(runs.map((r) => r.label), ["Thursday the 4th", "Wednesday the 3rd"])
})
test("an anchor in the past or future gives the same cycle", () => {
  const a = schedule(d(2026, 10, 12), 28, d(2027, 1, 1), 12).map((r) => key(r.due))
  const b = schedule(d(2027, 6, 21), 28, d(2027, 1, 1), 12).map((r) => key(r.due))
  assert.deepEqual(a, b)
})
test("monthly Universal Credit on the 27th: early six times, 34-day wait after Christmas 2027", () => {
  const rows = schedule(d(2026, 11, 27), "month", d(2026, 12, 1), 13)
  assert.equal(rows.filter((r) => r.early).length, 6)
  const dec = rows.find((r) => key(r.due) === "2027-12-27"); assert.equal(key(dec.paid), "2027-12-24"); assert.equal(dec.toNext, 34)
})
test("monthly payment on the 31st falls back to the last day of short months", () => {
  const rows = schedule(d(2027, 1, 31), "month", d(2027, 2, 1), 3).map((r) => key(r.due))
  assert.deepEqual(rows, ["2027-02-28", "2027-03-31", "2027-04-30"])
})
test("Universal Credit: extra paydays match GOV.UK counts (4-weekly once, 2-weekly twice, weekly four times a year)", () => {
  const from = d(2027, 1, 14)
  assert.equal(extraPaydayPeriods(d(2027, 1, 8), 28, d(2027, 1, 14), from, 12).length, 1)
  assert.equal(extraPaydayPeriods(d(2027, 1, 8), 14, d(2027, 1, 14), from, 12).length, 2)
  assert.equal(extraPaydayPeriods(d(2027, 1, 8), 7, d(2027, 1, 14), from, 12).length, 4)
})
test("calendar file lists each payment as an all-day event", () => {
  const ics = toICS(schedule(d(2027, 1, 4), 28, d(2027, 1, 1), 2).map((r) => ({ ...r, name: "PIP" })))
  assert.match(ics, /BEGIN:VCALENDAR/); assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2); assert.match(ics, /DTSTART;VALUE=DATE:20270104/)
})
