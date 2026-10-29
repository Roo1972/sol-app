# Book A print build (not part of the website)

Builds the 6x9 KDP interior and the draft wrap cover for Still Ruled by Rome.

1. Save the Google Doc JSON (Docs API read of Still_Ruled_by_Rome_v9_launch) as `doc.json` here.
2. `npm pack @fontsource/eb-garamond@5.1.0` and unpack into `fonts/` (so `fonts/package/files/*.woff` exists).
3. Put the figure PNGs (`public/book-art/*.png`) at `../book/figs/out/` relative to this folder, or edit FIGS in build.py.
4. `pip install weasyprint segno pypdf`, then `python3 build.py` and `python3 cover.py <page count rounded up to even>`.
