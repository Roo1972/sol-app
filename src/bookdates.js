// Dated people and events from the book "Still Ruled by Rome" and Sol's Friday the 13th film, placed on the Sol year.
// g = the date on the Gregorian calendar (for Julian dates, converted: +8 days in the 1300s, +10 in 1500-1582, +11 in 1700-1752).
// Every date is checked in the Sol Fact Verification Register (rows 50-121) or Britannica; see Sol_People_In_The_Book_True_Birthdays.
// House rule: every date shown names its calendar in brackets.
import { toIFC } from './engine.js'

export const BOOK_DATES = [
  { g: [1307, 10, 21], from: "Sol's Friday the 13th film", converted: true, text: "The Knights Templar are arrested across France on Friday 13 October 1307 (Julian). No document of the time calls the day unlucky." },
  { g: [1502, 6, 17], from: "Chapter 4 of Still Ruled by Rome", converted: true, text: "Ugo Boncompagni, the future Pope Gregory XIII, is born in Bologna on 7 June 1502 (Julian)." },
  { g: [1515, 4, 7], from: "Chapter 4 of Still Ruled by Rome", converted: true, text: "Teresa of Ávila is born on 28 March 1515 (Julian)." },
  { g: [1582, 3, 6], from: "Chapter 4 of Still Ruled by Rome", converted: true, text: "Gregory XIII issues the bull Inter gravissimas on 24 February 1582 (Julian), creating the Gregorian calendar." },
  { g: [1582, 10, 15], from: "Chapter 4 of Still Ruled by Rome", text: "Thursday 4 October 1582 (Julian) is followed by Friday 15 October 1582 (Gregorian). Ten days vanish. Teresa of Ávila dies that night." },
  { g: [1585, 4, 10], from: "Chapter 4 of Still Ruled by Rome", text: "Pope Gregory XIII dies in Rome on 10 April 1585 (Gregorian)." },
  { g: [1732, 2, 22], from: "Chapter 5 of Still Ruled by Rome", text: "George Washington is born: 11 February 1731 (Julian, with the year starting in March), which is 22 February 1732 (Gregorian). He lived to see his birthday move." },
  { g: [1752, 9, 14], from: "Chapter 5 of Still Ruled by Rome", text: "Britain changes calendar: Wednesday 2 September 1752 (Julian) is followed by Thursday 14 September 1752 (Gregorian)." },
  { g: [1769, 8, 15], from: "Chapter 13 of Still Ruled by Rome", text: "Napoleon Bonaparte is born in Ajaccio on 15 August 1769 (Gregorian)." },
  { g: [1781, 6, 9], from: "Chapter 16 of Still Ruled by Rome", text: "George Stephenson, the railway engineer whose wagonway gauge became Britain's standard, is born on 9 June 1781 (Gregorian)." },
  { g: [1792, 2, 29], from: "Sol's Friday the 13th film", text: "Gioachino Rossini is born on 29 February 1792 (Gregorian): a leap-day baby. In Sol his birthday comes every year." },
  { g: [1793, 11, 24], from: "Chapter 13 of Still Ruled by Rome", text: "France fixes its Republican calendar and ten-hour day by the decree of 4 Frimaire Year II (French Republican), 24 November 1793 (Gregorian)." },
  { g: [1794, 9, 22], from: "Chapter 13 of Still Ruled by Rome", text: "Decimal time becomes compulsory in France on 1 Vendémiaire Year III (French Republican), 22 September 1794 (Gregorian)." },
  { g: [1795, 4, 7], from: "Chapter 13 of Still Ruled by Rome", text: "France suspends decimal time on 18 Germinal Year III (French Republican), 7 April 1795 (Gregorian)." },
  { g: [1802, 4, 8], from: "Chapter 13 of Still Ruled by Rome", text: "Sunday becomes the day of rest for French officials again, by the law of 18 Germinal Year X (French Republican), 8 April 1802 (Gregorian)." },
  { g: [1806, 1, 1], from: "Chapter 13 of Still Ruled by Rome", text: "France abandons the Republican calendar and returns to the Gregorian on 1 January 1806 (Gregorian)." },
  { g: [1806, 4, 9], from: "Chapter 16 of Still Ruled by Rome", text: "Isambard Kingdom Brunel, champion of the 7-foot railway gauge, is born on 9 April 1806 (Gregorian)." },
  { g: [1821, 5, 5], from: "Chapter 13 of Still Ruled by Rome", text: "Napoleon dies on Saint Helena on 5 May 1821 (Gregorian). In Sol that is the 13th: a Saturday." },
  { g: [1848, 8, 12], from: "Chapter 16 of Still Ruled by Rome", text: "George Stephenson dies on 12 August 1848 (Gregorian)." },
  { g: [1854, 7, 12], from: "Chapter 15 of Still Ruled by Rome", text: "George Eastman is born on 12 July 1854 (Gregorian). His True Birthday falls in the month of Sol itself." },
  { g: [1859, 9, 15], from: "Chapter 16 of Still Ruled by Rome", text: "Isambard Kingdom Brunel dies on 15 September 1859 (Gregorian)." },
  { g: [1868, 11, 13], from: "Sol's Friday the 13th film", text: "Rossini dies on Friday 13 November 1868 (Gregorian). His biographer's line about it is the earliest known record of Friday the 13th as unlucky." },
  { g: [1892, 7, 23], from: "Chapter 12 of Still Ruled by Rome", text: "Tafari Makonnen, later Emperor Haile Selassie, is born on 23 July 1892 (Gregorian), 17 Hamle 1884 (Ethiopian)." },
  { g: [1896, 3, 1], from: "Chapter 12 of Still Ruled by Rome", text: "Ethiopia defeats Italy at Adwa on 1 March 1896 (Gregorian), 23 Yekatit 1888 (Ethiopian)." },
  { g: [1932, 3, 14], from: "Chapter 15 of Still Ruled by Rome", text: "George Eastman dies on 14 March 1932 (Gregorian). Kodak ran 13 equal 28-day accounting periods, 1928–1989; employees lived by the Gregorian calendar." },
  { g: [1971, 2, 15], from: "Chapter 16 of Still Ruled by Rome", text: "Decimal Day: Britain abandons shillings and the pound becomes 100 new pence, on 15 February 1971 (Gregorian)." },
  { g: [2007, 9, 12], from: "Chapter 12 of Still Ruled by Rome", text: "Ethiopia celebrates its millennium: 1 Meskerem 2000 (Ethiopian), 12 September 2007 (Gregorian)." },
  { g: [2012, 12, 21], from: "Chapter 10 of Still Ruled by Rome", text: "The Maya Long Count completes a b'ak'tun, 13.0.0.0.0 (Maya Long Count), on 21 December 2012 (Gregorian). Tortuguero Monument 6, which mentions it, describes a ceremony, not a catastrophe." },
]

// Position in the Sol year: 1-364 for month days, Leap Day between 28 June and 1 Sol, Year Day last.
export function solPos(ifc) {
  if (ifc.special === "Year Day") return 365
  if (ifc.special === "Leap Day") return 168.5
  return (ifc.monthNum - 1) * 28 + ifc.day
}

const ENTRIES = BOOK_DATES.map(e => {
  const ifc = toIFC(new Date(e.g[0], e.g[1] - 1, e.g[2], 12))
  return { ...e, ifc, pos: solPos(ifc) }
})

// The book's people and events on the reader's own Sol date, or the nearest ones to it.
export function bookDatesFor(ifc) {
  const p = solPos(ifc)
  const dist = e => { const d = Math.abs(e.pos - p); return Math.min(d, 365 - d) }
  const best = Math.min(...ENTRIES.map(dist))
  const hits = ENTRIES.filter(e => dist(e) === best)
  return hits.map(e => {
    let diff = e.pos - p
    if (diff > 182.5) diff -= 365
    if (diff < -182.5) diff += 365
    return { ...e, diff: Math.round(diff) }
  })
}
