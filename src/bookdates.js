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
  { g: [14, 8, 17], from: "Chapter 2 of Still Ruled by Rome", converted: true, text: "Augustus dies near Naples on 19 August AD 14 (Julian). The month of August still carries his name." },
  { g: [337, 5, 23], from: "Chapter 3 of Still Ruled by Rome", converted: true, text: "Constantine, the emperor who made Sunday a day of rest in 321, dies on 22 May 337 (Julian)." },
  { g: [632, 6, 11], from: "Chapter 11 of Still Ruled by Rome", converted: true, text: "The Prophet Muhammad dies in Medina on 8 June 632 (Julian). The Islamic calendar counts its years from his migration to Medina ten years earlier." },
  { g: [1048, 5, 24], from: "Chapter 11 of Still Ruled by Rome", converted: true, text: "Omar Khayyam, poet and one of the astronomers behind Persia's Jalali calendar, is born on 18 May 1048 (Julian)." },
  { g: [1131, 12, 11], from: "Chapter 11 of Still Ruled by Rome", converted: true, text: "Omar Khayyam dies in Nishapur on 4 December 1131 (Julian)." },
  { g: [1241, 9, 29], from: "Chapter 17 of Still Ruled by Rome", converted: true, text: "Snorri Sturluson, who wrote down the Norse myths of the Sun and Moon in the Prose Edda, is killed on 22 September 1241 (Julian)." },
  { g: [1388, 10, 27], from: "Chapter 9 of Still Ruled by Rome", converted: true, text: "Giovanni Dondi, builder of the Astrarium, an astronomical clock, in Padua, dies on 19 October 1388 (Julian)." },
  { g: [1527, 7, 23], from: "Chapter 5 of Still Ruled by Rome", converted: true, text: "John Dee, who proposed an English calendar reform in 1583, is born on 13 July 1527 (Julian)." },
  { g: [1533, 9, 17], from: "Chapter 5 of Still Ruled by Rome", converted: true, text: "Elizabeth I is born on 7 September 1533 (Julian). Under her, England kept the old calendar." },
  { g: [1603, 4, 3], from: "Chapter 5 of Still Ruled by Rome", converted: true, text: "Elizabeth I dies on 24 March 1603 (Julian), the last day of the English year as it was then counted." },
  { g: [1694, 10, 2], from: "Chapter 5 of Still Ruled by Rome", converted: true, text: "Lord Chesterfield, who steered Britain's 1750 Calendar Act, is born on 22 September 1694 (Julian)." },
  { g: [1773, 3, 24], from: "Chapter 5 of Still Ruled by Rome", text: "Lord Chesterfield dies on 24 March 1773 (Gregorian)." },
  { g: [1697, 11, 20], from: "Chapter 5 of Still Ruled by Rome", converted: true, text: "William Hogarth, painter of 'An Election Entertainment', is born on 10 November 1697 (Julian)." },
  { g: [1764, 10, 26], from: "Chapter 5 of Still Ruled by Rome", text: "William Hogarth dies on 26 October 1764 (Gregorian)." },
  { g: [1750, 3, 26], from: "Chapter 13 of Still Ruled by Rome", text: "Gilbert Romme, who led the making of France's Republican calendar, is born on 26 March 1750 (Gregorian)." },
  { g: [1795, 6, 17], from: "Chapter 13 of Still Ruled by Rome", text: "Gilbert Romme dies on 17 June 1795 (Gregorian), 29 Prairial Year III (French Republican)." },
  { g: [1819, 2, 14], from: "Chapter 16 of Still Ruled by Rome", text: "Christopher Latham Sholes, inventor of the QWERTY typewriter, is born on 14 February 1819 (Gregorian)." },
  { g: [1890, 2, 17], from: "Chapter 16 of Still Ruled by Rome", text: "Christopher Latham Sholes dies on 17 February 1890 (Gregorian)." },
  { g: [1879, 3, 14], from: "Chapter 9 of Still Ruled by Rome", text: "Albert Einstein is born in Ulm on 14 March 1879 (Gregorian). He later lived beside Bern's Zytglogge clock tower." },
  { g: [1955, 4, 18], from: "Chapter 9 of Still Ruled by Rome", text: "Albert Einstein dies in Princeton on 18 April 1955 (Gregorian)." },
  { g: [1894, 5, 5], from: "Chapter 16 of Still Ruled by Rome", text: "August Dvorak, who designed a faster keyboard that never replaced QWERTY, is born on 5 May 1894 (Gregorian)." },
  { g: [1975, 10, 10], from: "Chapter 16 of Still Ruled by Rome", text: "August Dvorak dies on 10 October 1975 (Gregorian)." },
  { g: [1890, 10, 14], from: "Chapter 15 of Still Ruled by Rome", text: "Dwight D. Eisenhower is born on 14 October 1890 (Gregorian)." },
  { g: [1953, 3, 5], from: "Chapter 14 of Still Ruled by Rome", text: "Joseph Stalin, whose government replaced the seven-day week from 1929 to 1940, dies on 5 March 1953 (Gregorian)." },
  { g: [1975, 8, 27], from: "Chapter 12 of Still Ruled by Rome", text: "Haile Selassie, the last Emperor of Ethiopia, dies on 27 August 1975 (Gregorian)." },
]

// Position in the Sol year: 1-364 for month days, Leap Day between 28 June and 1 Sol, Year Day last.
export function solPos(ifc) {
  if (ifc.special === "Year Day") return 365
  if (ifc.special === "Leap Day") return 168.5
  return (ifc.monthNum - 1) * 28 + ifc.day
}

const ENTRIES = BOOK_DATES.map(e => {
  const d = new Date(2000, 0, 1, 12); d.setFullYear(e.g[0], e.g[1] - 1, e.g[2])
  const ifc = toIFC(d)
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
