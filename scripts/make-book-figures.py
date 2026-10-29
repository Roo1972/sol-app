#!/usr/bin/env python3
"""Book A figures: print-ready PNGs (1800 px wide = 6 in at 300 dpi, used at ~4.5 in).
Colour carries meaning; every figure must still read in greyscale (production standards v2)."""
import math, datetime, json, os, sys
OUT = sys.argv[1]
FONTS = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

NAVY, GOLD, INK, MUTED, RULE, PALE, RED = "#1A1A2E", "#B8860B", "#1A1A2E", "#6B6B7B", "#C9C6BD", "#F3EEDF", "#B23A2E"
GOLDF = "#D4A017"  # fills (darker GOLD used for text so it holds up in print)

def font_css():
    def f(fam, file, w, s="normal"):
        return f"@font-face{{font-family:{fam};src:url(file://{FONTS}/@fontsource/{fam.lower()}/files/{file});font-weight:{w};font-style:{s}}}"
    return (f("Gelasio","gelasio-latin-700-normal.woff2",700)+f("Gelasio","gelasio-latin-400-normal.woff2",400)
            +f("Gelasio","gelasio-latin-400-italic.woff2",400,"italic")+f("Inter","inter-latin-400-normal.woff2",400)
            +f("Inter","inter-latin-600-normal.woff2",600))

FIGS = {}
def fig(name, h):
    def deco(fn):
        FIGS[name] = (h, fn)
        return fn
    return deco

def T(x, y, s, size=14, w=400, fill=INK, anchor="start", fam="Inter", style="normal"):
    return f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" font-weight="{w}" font-style="{style}" fill="{fill}" text-anchor="{anchor}">{s}</text>'
def R(x, y, w, h, fill="none", stroke="none", sw=1, rx=0, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" rx="{rx}" {extra}/>'
def L(x1, y1, x2, y2, stroke=RULE, sw=1, extra=""):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
def title(s, sub=None):
    o = T(0, 24, s, 19, 700, NAVY, fam="Gelasio")
    if sub:
        import textwrap
        for i, line in enumerate(textwrap.wrap(sub, 92)):
            o += T(0, 43 + i * 15, line, 12, 400, MUTED)
    return o

ARROW = f'<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{NAVY}"/></marker><marker id="ahg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{GOLD}"/></marker></defs>'

# 1 — Chapter 1: the numbered months slide two places
@fig("01-october-means-eight", 300)
def _():
    o = title("The months that lost their numbers", "The Roman ten-month year began in March. When the year came to start on 1 January (by 153 BC), every numbered month slid two places.")
    old = ["Mar","Apr","May","Jun","Quint.","Sext.","Sept.","Oct.","Nov.","Dec."]
    new = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    w = 46; x0 = 24
    o += T(0, 92, "ROMAN YEAR", 10.5, 600, MUTED)
    for i, m in enumerate(old):
        x = x0 + (i + 2) * w
        num = i >= 4
        o += R(x, 100, w - 4, 52, PALE if not num else "#FBF4DC", RULE, 1, 4)
        o += T(x + (w - 4) / 2, 122, m, 12, 600, NAVY, "middle")
        o += T(x + (w - 4) / 2, 142, str(i + 1), 13, 700, GOLD if num else MUTED, "middle", "Gelasio")
    o += T(0, 196, "YEAR TODAY", 10.5, 600, MUTED)
    for i, m in enumerate(new):
        x = x0 + i * w
        num = m in ("Sep","Oct","Nov","Dec")
        o += R(x, 204, w - 4, 52, NAVY if num else "#fff", NAVY if num else RULE, 1, 4)
        o += T(x + (w - 4) / 2, 226, m, 12, 600, "#fff" if num else NAVY, "middle")
        o += T(x + (w - 4) / 2, 246, str(i + 1), 13, 700, GOLDF if num else MUTED, "middle", "Gelasio")
    for i in range(6, 10):
        xa = x0 + (i + 2) * w + (w - 4) / 2
        o += L(xa, 156, xa, 198, GOLD, 1.6, 'stroke-dasharray="3 3"')
    o += T(0, 290, "September means seven, October eight, November nine, December ten. Their places today: 9, 10, 11, 12.", 12, 400, MUTED)
    return o

# 2 — Chapter 2: year lengths
@fig("02-year-of-confusion", 270)
def _():
    o = title("How long is a year?", "Days in the year under different calendars. The longest year on record: 46 BC.")
    rows = [("Islamic (lunar) year", 354, NAVY), ("Ordinary Roman year before Caesar", 355, NAVY), ("Julian / Gregorian year", 365, NAVY),
            ("46 BC, Macrobius's count", 443, GOLDF), ("46 BC, Censorinus's count", 445, GOLDF)]
    sc = 300 / 445
    for i, (lab, v, c) in enumerate(rows):
        y = 78 + i * 36
        o += T(0, y + 15, lab, 12.5, 400, INK)
        o += R(232, y, v * sc, 20, c, rx=2)
        o += T(232 + v * sc + 6, y + 15, str(v), 13, 700, NAVY, fam="Gelasio")
    o += L(232, 70, 232, 260, MUTED, 1)
    return o

# 3 — Chapter 3: October 1582
@fig("03-october-1582", 300)
def _():
    o = title("October 1582 in Rome", "Thursday 4 October was followed by Friday 15 October. Ten dates never happened.")
    days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    cw, ch, x0, y0 = 70, 40, 50, 70
    for i, d in enumerate(days):
        o += T(x0 + i * cw + cw / 2, y0 + 14, d, 11.5, 600, MUTED, "middle")
    # Oct 1 1582 (Julian) was a Monday
    seq = [1,2,3,4] + list(range(15, 32))
    cells = []
    for k, d in enumerate(seq):
        cells.append((k // 7, k % 7, d))
    for r, c, d in cells:
        x, y = x0 + c * cw, y0 + 24 + r * ch
        hot = d in (4, 15)
        o += R(x + 2, y + 2, cw - 4, ch - 4, "#FBF4DC" if hot else "#fff", GOLD if hot else RULE, 1.5 if hot else 1, 3)
        o += T(x + 10, y + 24, str(d), 15, 700, NAVY, fam="Gelasio")
    # missing strip
    o += R(x0, 240, 7 * cw, 34, PALE, RULE, 1, 3)
    o += T(x0 + 12, 262, "Never existed in Rome:", 11.5, 600, MUTED)
    for i, d in enumerate(range(5, 15)):
        o += T(x0 + 170 + i * 28, 262, str(d), 13, 400, MUTED, "middle", "Gelasio") + L(x0 + 162 + i * 28, 258, x0 + 178 + i * 28, 258, RED, 1.3)
    return o

# 4 — Chapter 4: September 1752 and the tax year
@fig("04-tax-year", 330)
def _():
    o = title("How the tax year reached 6 April", "Britain removed eleven days in September 1752. The Treasury kept every tax year a full 365 days long.")
    days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    cw, ch, x0, y0 = 36, 30, 0, 70
    o += T(0, 70, "SEPTEMBER 1752", 10.5, 600, MUTED)
    for i, d in enumerate(days):
        o += T(x0 + i * cw + cw / 2, y0 + 20, d[:2], 10, 600, MUTED, "middle")
    seq = [None, 1, 2] + list(range(14, 31))   # 1 Sept 1752 was a Tuesday
    for k, d in enumerate(seq):
        if d is None: continue
        r, c = divmod(k, 7)
        x, y = x0 + c * cw, y0 + 28 + r * ch
        hot = d in (2, 14)
        o += R(x + 1.5, y + 1.5, cw - 3, ch - 3, "#FBF4DC" if hot else "#fff", GOLD if hot else RULE, 1.4 if hot else 1, 2)
        o += T(x + cw / 2, y + 20, str(d), 12, 700, NAVY, "middle", "Gelasio")
    # timeline
    tx = 300
    steps = [("Before 1752", "Tax year starts 25 March", "Lady Day, an old quarter day"),
             ("1753", "Starts 5 April", "25 March plus the 11 lost days"),
             ("1800", "Starts 6 April", "a Julian leap day the new calendar skipped")]
    for i, (yr, a, b) in enumerate(steps):
        y = 86 + i * 78
        o += f'<circle cx="{tx}" cy="{y}" r="7" fill="{GOLDF if i == 2 else NAVY}"/>'
        if i < 2: o += L(tx, y + 8, tx, y + 70, NAVY, 1.5, 'marker-end="url(#ah)"')
        o += T(tx + 18, y - 2, yr, 11, 600, MUTED)
        o += T(tx + 18, y + 16, a, 15, 700, NAVY, fam="Gelasio")
        o += T(tx + 18, y + 33, b, 11.5, 400, MUTED)
    o += T(tx + 18, 318, "The UK tax year still begins on 6 April.", 12, 600, GOLD)
    return ARROW + o

# 5 — Chapter 5: the *me- word family (canonical facts only)
@fig("05-measure-root", 290)
def _():
    o = title("One root, six words", "Indo-European *me-, 'to measure', sits behind words for the Moon and for measuring.")
    cx, cy = 300, 160
    o += R(cx - 70, cy - 26, 140, 52, NAVY, rx=26)
    o += T(cx, cy - 2, "*me-", 20, 700, "#fff", "middle", "Gelasio")
    o += T(cx, cy + 16, "to measure", 11, 400, "#D9D6CC", "middle")
    words = [("moon", -230, -70), ("month", -230, 0), ("menses", -230, 70), ("measure", 230, -70), ("metre", 230, 0), ("meniscus", 230, 70)]
    for w, dx, dy in words:
        x, y = cx + dx, cy + dy
        o += L(cx + (70 if dx > 0 else -70), cy, x + (-55 if dx > 0 else 55), y, GOLD, 1.5)
        o += R(x - 55, y - 18, 110, 36, "#fff", NAVY, 1.2, 18)
        o += T(x, y + 5, w, 14, 700, NAVY, "middle", "Gelasio")
    o += T(cx - 230, 270, "TIME", 10.5, 600, MUTED, "middle") + T(cx + 230, 270, "MEASUREMENT", 10.5, 600, MUTED, "middle")
    return o

# 6 — Chapter 6: unequal hours at Heliopolis
@fig("06-unequal-hours", 250)
def _():
    o = title("When an hour changed with the seasons", "Egypt split daylight into 12 hours and night into 12, whatever the season. Lengths at Heliopolis (30° N).")
    rows = [("Midsummer daytime hour", 69.7, GOLDF), ("Midwinter daytime hour", 50.3, NAVY), ("Modern equal hour", 60, MUTED)]
    sc = 330 / 70
    for i, (lab, v, c) in enumerate(rows):
        y = 80 + i * 46
        o += T(0, y + 16, lab, 12.5, 400, INK)
        o += R(190, y, v * sc, 24, c, rx=2)
        o += T(190 + v * sc + 8, y + 17, f"{round(v)} min", 13, 700, NAVY, fam="Gelasio")
    o += L(190 + 60 * sc, 72, 190 + 60 * sc, 222, MUTED, 1, 'stroke-dasharray="3 3"')
    o += T(0, 240, "Calculated from day length at the solstices; mechanical clocks later made every hour 60 minutes.", 11, 400, MUTED)
    return o

# 7 — Chapter 7: divisors of 60 vs 10
@fig("07-sixty", 240)
def _():
    o = title("Why Babylon counted in sixties", "Every whole number that divides evenly into 10, and into 60.")
    def row(n, divs, y, c):
        s = T(0, y + 22, str(n), 30, 700, NAVY, fam="Gelasio")
        for i, d in enumerate(divs):
            x = 64 + i * 38
            s += f'<circle cx="{x + 16}" cy="{y + 14}" r="17" fill="{c}"/>' + T(x + 16, y + 19, str(d), 12.5, 700, "#fff", "middle")
        s += T(64 + len(divs) * 38 + 6, y + 19, f"{len(divs)} divisors", 12, 600, MUTED)
        return s
    o += row(10, [1, 2, 5, 10], 80, MUTED)
    o += row(60, [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60], 150, NAVY)
    return o

# 8 — Chapter 8: clockwise follows the northern sundial
@fig("08-clockwise", 290)
def _():
    o = title("Why clocks turn 'clockwise'", "Facing a sundial, its shadow turns one way in the north and the other way in the south.")
    def dial(cx, label, sign):
        s = f'<circle cx="{cx}" cy="165" r="78" fill="{PALE}" stroke="{NAVY}" stroke-width="1.5"/>'
        for k in range(-5, 6):
            a = math.radians(k * 15 * sign)
            s += L(cx + 64 * math.sin(a), 165 - 64 * math.cos(a), cx + 76 * math.sin(a), 165 - 76 * math.cos(a), NAVY, 1)
        s += f'<path d="M{cx - 52 * sign} {165 - 28} A60 60 0 0 {1 if sign > 0 else 0} {cx + 52 * sign} {165 - 28}" fill="none" stroke="{GOLD}" stroke-width="3" marker-end="url(#ahg)"/>'
        s += f'<circle cx="{cx}" cy="165" r="5" fill="{NAVY}"/>'
        s += T(cx, 270, label, 13, 700, NAVY, "middle", "Gelasio")
        return s
    o += dial(150, "Northern hemisphere", 1) + dial(450, "Southern hemisphere", -1)
    o += T(150, 58 + 22, "shadow: morning → evening", 11, 400, MUTED, "middle") + T(450, 80, "shadow: morning → evening", 11, 400, MUTED, "middle")
    return ARROW + o

# 9 — Chapter 9: the Long Count
@fig("09-long-count", 300)
def _():
    o = title("How the Maya counted days", "Each Long Count unit multiplies the one below. 13 b'ak'tuns, written 13.0.0.0.0, ended on 21 December 2012.")
    units = [("k'in", "1 day", 1), ("winal", "20 k'in = 20 days", 20), ("tun", "18 winal = 360 days", 360),
             ("k'atun", "20 tun = 7,200 days (≈ 20 years)", 7200), ("b'ak'tun", "20 k'atun = 144,000 days (≈ 394 years)", 144000)]
    for i, (n, d, v) in enumerate(units):
        y = 74 + i * 40
        wbar = 40 + i * 70
        o += R(0, y, wbar, 30, NAVY if i < 4 else GOLDF, rx=3)
        o += T(10, y + 20, n, 13, 700, "#fff" if i < 4 else NAVY, fam="Gelasio")
        o += T(wbar + 12, y + 20, d, 12.5, 400, INK)
    o += T(0, 290, "13 × 144,000 = 1,872,000 days, about 5,125 years: a completed cycle, not a prophecy.", 12.5, 600, GOLD)
    return o

# 10 — Chapter 10: Ramadan drifting through the seasons (tabular Islamic calendar, approximate)
def islamic_to_date(y, m, d):
    jd = d + math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + (3 + 11 * y) // 30 + 1948439.5
    return datetime.date(2000, 1, 1) + datetime.timedelta(days=int(jd + 0.5) - 2451545)

@fig("10-ramadan-drift", 320)
def _():
    o = title("Ramadan moves through every season", "Approximate start of Ramadan each year, 2020–2056. The Islamic year is about 11 days shorter than the solar year.")
    x0, y0, W, H = 40, 70, 540, 210
    months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    for i, m in enumerate(months):
        y = y0 + H * (i / 12)
        o += L(x0, y, x0 + W, y, "#ECE8DE", 1) + T(x0 - 6, y + H / 24 + 4, m, 10, 400, MUTED, "end")
    o += R(x0, y0 + H * 5 / 12, W, H * 3 / 12, "#FBF4DC")  # northern summer band Jun–Aug
    o += T(x0 + W - 4, y0 + H * 5 / 12 + 12, "June–August", 10, 600, GOLD, "end")
    pts = []
    for hy in range(1441, 1480):
        d = islamic_to_date(hy, 9, 1)
        if 2020 <= d.year <= 2056:
            doy = d.timetuple().tm_yday
            x = x0 + W * (d.year - 2020) / 36
            y = y0 + H * (doy - 1) / 365
            pts.append((x, y, d))
    for x, y, d in pts:
        o += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{NAVY}"/>'
    for yr in range(2020, 2057, 6):
        x = x0 + W * (yr - 2020) / 36
        o += T(x, y0 + H + 18, str(yr), 10.5, 400, MUTED, "middle")
    o += T(0, 312, "Dates from the arithmetical Islamic calendar; actual starts depend on moon sighting and can differ by a day or two.", 10.5, 400, MUTED)
    return o

# 11 — Chapter 11: Ethiopian vs Sol year
@fig("11-ethiopia-vs-sol", 300)
def _():
    o = title("Two thirteen-month years", "Ethiopia: twelve months of 30 days and a short thirteenth. Sol: thirteen months of 28 days and a day outside them.")
    def strip(y, label, blocks):
        s = T(0, y - 8, label, 11, 600, MUTED)
        x = 0
        for w, txt, c in blocks:
            s += R(x, y, w - 2, 46, c, rx=2)
            if txt: s += T(x + (w - 2) / 2, y + 28, txt, 11, 700, "#fff" if c == NAVY else NAVY, "middle")
            x += w
        return s
    eth = [(43.5, "30", NAVY)] * 12 + [(9, "", GOLDF)]
    sol = [(40.2, "28", NAVY)] * 13 + [(4, "", GOLDF)]
    o += strip(90, "ETHIOPIAN YEAR: 12 × 30 + Pagume (5 or 6 days)", eth)
    o += strip(190, "SOL YEAR: 13 × 28 + Year Day (and Leap Day in leap years)", sol)
    o += T(0, 268, "Both handle the leftover days outside the ordinary months instead of making the months uneven.", 12, 400, INK)
    o += T(0, 288, "Each block is drawn to scale: one millimetre per day.", 10.5, 400, MUTED)
    return o

# 12 — Interlude III / Chapter 13: the five-colour rota
@fig("13-nepreryvka", 300)
def _():
    o = title("The five-day rota, 1929", "Each colour group rested one day in five. A family split across colours never shared a day off.")
    cols = [("Yellow", "#E6C229"), ("Pink", "#E8A0B4"), ("Red", "#C0392B"), ("Purple", "#7D4E9E"), ("Green", "#3E8E5E")]
    x0, y0, cw, ch = 110, 80, 30, 34
    for d in range(15):
        o += T(x0 + d * cw + cw / 2, y0 - 8, str(d + 1), 10, 400, MUTED, "middle")
    for g, (name, c) in enumerate(cols):
        y = y0 + g * ch
        o += T(0, y + 21, name + (" (Pavel)" if g == 0 else " (Anna)" if g == 3 else ""), 12, 600 if g in (0, 3) else 400, INK)
        for d in range(15):
            rest = d % 5 == g
            o += R(x0 + d * cw + 1, y + 1, cw - 2, ch - 4, c if rest else "#F4F2EC", "none", 0, 2)
            if rest: o += T(x0 + d * cw + cw / 2, y + 20, "R", 10, 700, "#fff", "middle")
    o += T(0, 268, "R = rest day. Group colours as recorded for the 1929–1931 nepreryvka.", 10.5, 400, MUTED)
    o += T(0, 288, "The shaded boxes never line up across rows: no day off is shared.", 12, 600, NAVY)
    return o

# 12b — Chapter 12: a decimal clock face
@fig("12-decimal-time", 300)
def _():
    o = title("A day of ten hours", "Revolutionary France's decimal day: 10 hours of 100 minutes of 100 seconds.")
    def face(cx, n, label, sub):
        s = f'<circle cx="{cx}" cy="160" r="90" fill="#fff" stroke="{NAVY}" stroke-width="2"/>'
        for k in range(n):
            a = 2 * math.pi * k / n
            s += T(cx + 72 * math.sin(a), 160 - 72 * math.cos(a) + 5, str(k if n == 10 and k else (n if k == 0 else k)), 14, 700, NAVY, "middle", "Gelasio")
        s += T(cx, 275, label, 13, 700, NAVY, "middle", "Gelasio") + T(cx, 292, sub, 11, 400, MUTED, "middle")
        return s
    o += face(150, 12, "Ordinary dial", "12 hours, shown twice a day")
    o += face(450, 10, "Decimal dial", "10 hours a day; 1 decimal hour = 2 h 24 min")
    return o

# 14 — Chapter 14: Cotsworth's problem: month lengths
@fig("14-month-lengths", 300)
def _():
    o = title("Cotsworth's problem", "Days in each month. A business compares months that are not the same size.")
    g = [31,28,31,30,31,30,31,31,30,31,30,31]
    names = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
    x0, base, sc = 40, 250, 5.2
    for i, d in enumerate(g):
        x = x0 + i * 42
        o += R(x, base - d * sc, 30, d * sc, NAVY if d != 28 else MUTED, rx=1)
        o += T(x + 15, base - d * sc - 6, str(d), 11, 700, NAVY, "middle")
        o += T(x + 15, base + 16, names[i], 10.5, 400, MUTED, "middle")
    o += L(x0 - 6, base - 28 * sc, x0 + 12 * 42, base - 28 * sc, GOLD, 2, 'stroke-dasharray="5 3"')
    o += T(x0 + 12 * 42 - 8, base - 31 * sc - 22, "Sol: every month 28 days", 11.5, 700, GOLD, "end")
    o += T(0, 290, "March has 31 days to February's 28: 10.7% more trading days before anything else changes.", 12, 400, INK)
    return o

# 14b — Chapter 14: the record, as the registry states it
@fig("14b-timeline", 260)
def _():
    o = title("The International Fixed Calendar: the record", "Only dates confirmed in the Sol fact register are shown.")
    x0, x1, y = 20, 580, 150
    y_from, y_to = 1915, 1995
    X = lambda yr: x0 + (x1 - x0) * (yr - y_from) / (y_to - y_from)
    o += L(x0, y, x1, y, NAVY, 2)
    for yr in range(1920, 1991, 10):
        o += L(X(yr), y - 4, X(yr), y + 4, NAVY, 1.5) + T(X(yr), y + 20, str(yr), 10.5, 400, MUTED, "middle")
    o += R(X(1928), y - 40, X(1989) - X(1928), 18, GOLDF, rx=3)
    o += T(X(1928) + 6, y - 27, "Kodak runs 13 equal 28-day accounting periods, 1928–1989", 10.5, 700, NAVY)
    ev = [(1922, "IFC League founded", -70), (1932, "Eastman dies", 48), (1943, "Cotsworth dies", 68), (1955, "US opposes a UN study", 48)]
    for yr, t, dy in ev:
        o += L(X(yr), y, X(yr), y + dy - 12, MUTED, 1) + f'<circle cx="{X(yr)}" cy="{y}" r="4.5" fill="{NAVY}"/>'
        o += T(X(yr), y + dy, t, 11, 600, INK, "middle")
    o += T(0, 252, "Kodak's employees lived by the Gregorian calendar throughout.", 11, 400, MUTED)
    return o

# 16 — Chapter 16/17: a Sol month
@fig("16-sol-month", 330)
def _():
    o = title("Every Sol month is this month", "28 days, four full weeks, Monday start. The 13th is always a Saturday, so Friday the 13th cannot happen.")
    days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    cw, ch, x0, y0 = 80, 52, 20, 76
    for i, d in enumerate(days):
        o += T(x0 + i * cw + cw / 2, y0, d, 12, 600, GOLD if d == "Sat" else MUTED, "middle")
    for n in range(1, 29):
        r, c = divmod(n - 1, 7)
        x, y = x0 + c * cw, y0 + 10 + r * ch
        hot = n == 13
        o += R(x + 2, y + 2, cw - 4, ch - 4, NAVY if hot else "#fff", NAVY if hot else RULE, 1, 4)
        o += T(x + 12, y + 26, str(n), 17, 700, "#fff" if hot else NAVY, fam="Gelasio")
    o += T(0, 310, "The same grid serves every month of every year. Year Day and Leap Day sit outside it.", 12, 400, INK)
    return o

# 17 — Chapter 17: the Sol year against the Gregorian (2027)
@fig("17-sol-year-2027", 380)
def _():
    o = title("The Sol year 2027", "Each Sol month begins on a Monday. Here is the ordinary date it falls on in 2027 (not a leap year).")
    names = ["January","February","March","April","May","June","Sol","July","August","September","October","November","December"]
    start = datetime.date(2027, 1, 1)
    for i, n in enumerate(names):
        d = start + datetime.timedelta(days=28 * i)
        col, row = divmod(i, 7)
        x, y = col * 300, 76 + row * 40
        sol = n == "Sol"
        o += R(x, y, 285, 32, NAVY if sol else "#fff", NAVY if sol else RULE, 1, 4)
        o += T(x + 12, y + 21, f"{i + 1}. {n}", 13.5, 700, GOLDF if sol else NAVY, fam="Gelasio")
        o += T(x + 273, y + 21, "starts " + d.strftime("%-d %b"), 12, 600, "#fff" if sol else MUTED, "end")
    y = 76 + 6 * 40
    o += R(300, y, 285, 32, PALE, RULE, 1, 4)
    o += T(312, y + 21, "Year Day", 13.5, 700, NAVY, fam="Gelasio") + T(573, y + 21, "31 Dec", 12, 600, MUTED, "end")
    o += T(0, 372, "Year Day belongs to no week. In leap years Leap Day sits between June 28 and Sol 1.", 11.5, 400, MUTED)
    return o


ROMAN = {1:"I",2:"II",3:"III",4:"IV",5:"V",6:"VI",7:"VII",8:"VIII",9:"IX",10:"X",11:"XI",12:"XII",13:"XIII",14:"XIV",15:"XV",16:"XVI",17:"XVII",18:"XVIII",19:"XIX"}
@fig("03a-roman-march", 360)
def _():
    o = title("Reading a Roman month: March", "Each day counted down, both ends included, to the next fixed point: the Nones (7th), the Ides (15th), then the Kalends of April.")
    cw, ch, x0, y0 = 84, 46, 6, 74
    for d in range(1, 32):
        if d == 1: lab, key = "Kalends", True
        elif d < 7: lab, key = ("day before" if d == 6 else f"{ROMAN[8 - d]} Nones"), False
        elif d == 7: lab, key = "Nones", True
        elif d < 15: lab, key = ("day before" if d == 14 else f"{ROMAN[16 - d]} Ides"), False
        elif d == 15: lab, key = "Ides", True
        else: lab, key = ("day before" if d == 31 else f"{ROMAN[33 - d]} Kal. Apr."), False
        r, c = divmod(d - 1, 7)
        x, y = x0 + c * cw, y0 + r * (ch + 6)
        o += R(x, y, cw - 4, ch, NAVY if key else "#fff", NAVY if key else RULE, 1, 4)
        o += T(x + 8, y + 18, str(d), 13, 700, GOLDF if key else NAVY, fam="Gelasio")
        o += T(x + 8, y + 36, lab, 9.5, 600 if key else 400, "#fff" if key else MUTED)
    o += T(0, 352, "So 16 March was 'the seventeenth day before the Kalends of April'. Roman numerals give the count.", 11.5, 400, INK)
    return o

@fig("03b-caesars-ten-days", 320)
def _():
    o = title("Where Caesar put his ten extra days", "Month lengths before and after the reform of 46 BC. Odd numbers were thought lucky; February, at 28, was the only even month.")
    old = [29,28,31,29,31,29,31,29,29,31,29,29]
    new = [31,28,31,30,31,30,31,31,30,31,30,31]
    names = ["Jan","Feb","Mar","Apr","May","Jun","Quint.","Sext.","Sep","Oct","Nov","Dec"]
    x0, base, sc = 20, 262, 5.4
    for i in range(12):
        x = x0 + i * 48
        o += R(x, base - old[i] * sc, 18, old[i] * sc, MUTED, rx=1)
        o += R(x + 20, base - new[i] * sc, 18, new[i] * sc, NAVY, rx=1)
        if new[i] > old[i]:
            o += R(x + 20, base - new[i] * sc, 18, (new[i] - old[i]) * sc, GOLDF, rx=1)
            o += T(x + 29, base - new[i] * sc - 6, f"+{new[i]-old[i]}", 11, 700, GOLD, "middle")
        o += T(x + 19, base + 15, names[i], 10, 400, MUTED, "middle")
    o += R(330, 62, 12, 12, MUTED) + T(348, 72, "before: 355 days", 11, 400, INK)
    o += R(460, 62, 12, 12, NAVY) + T(478, 72, "after: 365 days", 11, 400, INK)
    o += T(0, 312, "The new days went at the ends of months, so no festival had to move.", 11.5, 400, INK)
    return o

@fig("03c-bissextile", 230)
def _():
    o = title("The day counted twice", "In a Julian leap year the 24th of February, 'the sixth day before the Kalends of March', was repeated: bis sextum, hence 'bissextile'.")
    labels = [("IX",21),("VIII",22),("Terminalia VII",23),("VI",24),("VI again",24),("V",25),("IV",26),("III",27),("day before",28)]
    x0, w = 0, 66
    for i, (lab, d) in enumerate(labels):
        x = x0 + i * w
        hot = i in (3, 4)
        o += R(x, 90, w - 4, 70, GOLDF if hot else "#fff", NAVY if hot else RULE, 1.5 if hot else 1, 4)
        o += T(x + (w - 4) / 2, 115, lab.replace("Terminalia ", ""), 13, 700, NAVY, "middle", "Gelasio")
        o += T(x + (w - 4) / 2, 135, "Feb", 9.5, 400, MUTED, "middle")
        if lab.startswith("Terminalia"): o += T(x + (w - 4) / 2, 152, "Terminalia", 9, 600, GOLD, "middle")
    o += T(0, 190, "Roman numerals count down to the Kalends of March. The doubled day sat where the old leap month", 11.5, 400, INK)
    o += T(0, 207, "had gone in, just after the Terminalia. The Church kept the custom for St Matthias until 1969.", 11.5, 400, INK)
    return o

def svg(name):
    h, fn = FIGS[name]
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="{h}" viewBox="0 0 600 {h}">{fn()}</svg>'

if __name__ == "__main__":
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(device_scale_factor=3, viewport={"width": 640, "height": 400})
        meta = {}
        for name, (h, _) in FIGS.items():
            html = f"<html><head><style>{font_css()} body{{margin:0;background:#fff}} .w{{padding:20px}}</style></head><body><div class='w'>{svg(name)}</div></body></html>"
            pg.set_viewport_size({"width": 640, "height": h + 40})
            pg.set_content(html, wait_until="load")
            pg.evaluate("document.fonts.ready")
            pg.screenshot(path=f"{OUT}/{name}.png", full_page=True)
            meta[name] = h
        json.dump(meta, open(f"{OUT}/meta.json", "w"))
        b.close()
    print("ok", len(FIGS))
