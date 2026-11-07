# Invitation card print sheets

A keeper downloads a batch of invitation cards as one PDF to print at home or send to a printer. This page describes what that PDF contains, where its sizes come from, and why it is built the way it is. The code is `src/lib/invitation-cards/`; its tests are `tests/lib/invitation-cards/`.

The design is the approved card canvas: the `Main` artboard is the front and the `Back` artboard is the back, re-flowed onto the shorter business-card size. Its artboards are drawn at 192 pixels to the inch (twice 96), so a 720 × 432 px artboard is a 3.5 × 2 in card with 1/8 in of bleed on every side, and the trim (the line the card is cut on) sits 24 px inside it. The builder keeps the canvas's pixels and scales them by 72/192 into PDF points, so every length in `layout.ts` can be checked against the canvas directly.

## The API

`src/lib/invitation-cards/index.ts` exports two functions:

- `cardQrSvg(link)` returns the card's QR code as an SVG string: round data dots and rounded finder squares, drawn from the `qrcode` package's module matrix. The dot geometry (`qrShapes`, `qrSvg`, `roundedSquarePath`) lives in `src/lib/qr`, which the two-factor screen's `QrCode` component shares; `cardQrSvg` only adds the card's tone, and `pdf.ts` draws the same shapes as PDF operators.
- `buildCardSheetsPdf({ links, expiresAt })` fetches the fonts and pictures from `public/invitation-cards/` and returns the PDF's bytes. Card `i` gets link `i`.

`renderCardSheets(input, assets)` in `pdf.ts` does the work without fetching, so the tests pass it the files read from disk.

## The sheet

Every page is US Letter, portrait (8.5 × 11 in).

- **Ten cards to a sheet**, two across and five down, each standing upright on the portrait page. A card is 3.5 × 2 in at the trim, the size of a business card, so two across make 7 in and five down make 10 in. Ten is the most that fits upright with a margin a printer can print in: twelve would fill the page bar 1/8 in, which a print shop's or an office printer's unprintable edge clips.
- **Bleed only on the block's outer edge.** Neighbouring cards share a cut line with no gap between them, so there is no bleed between cards; the block has 1/8 in of bleed all round its outside. With it, the block is 7.25 × 10.25 in.
- **Where the block sits.** It is centred on the page, which leaves 5/8 in at each side and 3/8 in at the top and the bottom.
- **Eighteen crop marks** sit outside the block, one on each end of every cut line: 6 for the three lines between and beside the columns, 12 for the six lines between and beside the rows. Each mark is on the cut line's extension, clear of the bleed: 2.25 pt of gap after the bleed, 6 pt long, in a 0.75 pt line. A mark therefore ends 8.25 pt (about 0.11 in) beyond the bleed, so 18.75 pt (about 0.26 in) from the top and bottom edges of the paper and 36.75 pt (about 0.51 in) from its sides: outside the 1/4 in a printer may leave unprinted.
- **Two pages to a sheet.** For each sheet of ten, the PDF has a page of fronts and then a page of backs, so `N` links give `2 × ceil(N / 10)` pages.
- **The card turns like a book page.** A cut card, turned over side to side (its left edge over to the right, as a book page turns), shows its back right way up. Both pages stand upright: a portrait page turned over its long edge keeps its top at the top, so the back page needs no half turn. Turned top over bottom instead, the back would be upside down.
- **The backs are mirrored by column.** Back `i` takes position `floor(i / 2) × 2 + (1 − i mod 2)`: within each row the two cards swap places. Printed two-sided and flipped on the long edge, which mirrors the page left to right, each back lands behind its own front.
- **A part-filled last sheet** keeps the full soot block, and the positions with no card stay plain soot, front and back. The block then prints and cuts exactly as a full one, with no bare paper showing at a cut.
- **The sheet label** names the batch, the sheet number and the face. It sits in the margin below the block, upright, in Lexend 400 at 5 pt, its baseline 21 pt from the paper's bottom edge and its start 8 pt in from the first card's trim, between the first two crop marks. Its letters stand clear of the block above and at least 1/4 in from the paper's edge below.

The layers on each page are drawn in this order: the soot fill, then every picture, then every front's shadow, then every card's words and QR code, then the crop marks. Everything except the marks is clipped to the block's outer edge, so a picture never lands on a neighbouring card's words.

## The card

**The front** keeps every line 1/8 in (24 px, 9 pt) inside the trim. It carries, in a 290 px text column starting at that inset:

1. the headline, Cormorant Unicase 600 at 52 px;
2. the tagline, Lexend 400;
3. the two muted lines (how to use the card and what it admits), Lexend 300.

The column runs the full height of the safe area: the headline's inked top sits on the top margin and the last muted line's inked bottom on the bottom margin, both 9 pt inside the trim. The room left over is shared between the gaps (headline to tagline, tagline to the first muted line, and between the two muted paragraphs) in proportion to their sizes, worked out per card from the measured lines; the lines within a paragraph keep their spacing.

The QR code sits right of the column, 182 px (0.95 in) square, at y 144.231 px, over the edge of the salt's bright bowl. A second column stands on the code: the wordmark and the site address above it and the expiry date below it, each centred on the code's centre line. The column runs from the top margin to the bottom margin: the wordmark's inked top sits on the top margin and the expiry's inked bottom on the bottom margin. Its gaps, measured between inked edges, run 1 : 2 : 2, wordmark to address, address to code and code to expiry, which comes to 9.07, 18.14 and 18.14 pt. Across, the column is placed from the batch's own expiry date: `frontCode` in `layout.ts` stands the code where the expiry line, centred on it, ends its ink on the right margin (`SAFE_RIGHT`, 9 pt inside the trim). Every card in a batch carries the same date, so a short date stands the column further right than a long one: the code's left edge is at 467.27 px for `31 March 2027` and at 448.50 px for `30 September 2027`. The PDF builder places the code once per batch and passes it to the words, the code and the shadow.

**A faint shadow lies behind the code column**, over the salt and under the words and the code: the wordmark, the address, the code's dots and finders and the expiry, blurred with no offset, in the ground ink (K93). It is a DeviceCMYK image of solid ground ink whose DeviceGray soft mask holds the blurred shapes, traced and blurred in `shadow.ts` at 240 dpi, finer than the salt picture. `SHADOW_RADIUS` (3 pt, twice the blur's standard deviation) and `SHADOW_OPACITY` (0.5, the mask's darkest point) in `layout.ts` set it. Each card's code differs, so each front has its own mask; the ink image's bytes are shared.

**That a printed code scans is checked by the owner on a printed sheet.** No test decodes a code from a render: a screen render shows the inks lighter than paper prints them, so it says nothing reliable about the code's contrast against the salt. A letter-spaced line is centred on its inked width, which leaves out the spacing after its last letter. The salt picture lies behind both columns. Card `i` gets front text `i mod 9` from `FRONT_COPY` in `copy.ts`, so the nine texts run on in turn from sheet to sheet and neighbouring cards read differently. The expiry date reads `VALID UNTIL 31 MARCH 2027`: the batch's expiry, formatted in UTC in British English and set in capitals.

**The back** keeps the same 1/8 in inset and carries the wordmark, a sentence about the site, and `BY INVITATION ONLY.`, with the sorrel picture at the top right. The sentence wraps at one width, 1/16 in short of the sorrel's leftmost inked pixel beside it, so no line runs over the sorrel or its stem. The picture's rectangle starts further left, where it has faded to nothing, so the edge is measured on the picture as it prints: a pixel counts as inked where its tint times its alpha moves the ground at least 5% of the way to chalk. Its lines are balanced as a headline's are, so it ends on no lone word. The batch's name sits at the column's foot. `layout.test.ts` holds every back line 1/16 in left of the sorrel's inked pixels in that line's own height, and 1/8 in inside the trim.

**A headline never runs to three lines.** `layout.ts` breaks every headline itself, as CSS `text-wrap: balance` does, measuring with the embedded font's own advances and kerning, and never relies on a renderer's wrapping. The owner approved the headlines at 52 px with these measured line breaks after seeing the rendered sample cards, and the size is final. At 52 px all nine headlines fit in two lines or fewer. The tightest line is "Three Times", at 289.5 of 290 px. `headline.test.ts` holds every headline in `FRONT_COPY` to two lines at the size the builder uses, so a headline added later that needs three lines fails the test.

**Text is placed as the browser places it.** Line heights and baselines follow CSS's half-leading rule. Kerning goes into each line as a PDF `TJ` array, and letter spacing as the `Tc` operator.

## Pictures

The two pictures are baked from the email illustrations by `node scripts/invitation-card-images.mjs`:

- `public/email/images/salt-dark.png` becomes `public/invitation-cards/salt.png`;
- `public/email/images/sorrel-dark.png` becomes `public/invitation-cards/sorrel.png`, mirrored.

A PDF has no CSS mask, so the script writes the canvas's edge fade into each picture's alpha channel. The alpha rises from 0 to 1 over the top 20% and over the outer 14% of each side, and the two ramps are multiplied together.

**Resolution at print size:**

| Picture | Pixels    | Printed size   | Resolution    |
| ------- | --------- | -------------- | ------------- |
| Salt    | 440 × 294 | 1.88 × 1.25 in | about 235 dpi |
| Sorrel  | 330 × 248 | 2.04 × 1.50 in | about 162 dpi |

Both are below the 300 dpi usual for print. They are soft, low-contrast pictures behind the text, so the shortfall shows less than it would on a sharp picture. A sharper card needs larger source illustrations.

The salt sits in the artboard's bottom-right corner, its right and bottom edges 1/8 in past the trim. It is drawn at 360 × 240 px, the canvas's 460 × 307 scaled with the card's height, so its bright bowl lies beside and below the QR code rather than under the whole of it. Every picture on a sheet is drawn before any card's words or QR code, and the only clip is the block's outer edge. So the card beside and the card below each show a strip of salt under their words, and a card on the block's edge keeps that strip in the bleed, which the guillotine cuts away. `pdf.test.ts` pins the salt to that corner.

## Fonts

The card embeds four font files from `public/invitation-cards/fonts/`: Cormorant Unicase SemiBold (600) and Lexend Light, Regular and Medium (300, 400 and 500). They are the static TrueType files Google Fonts serves (Cormorant Unicase v25, Lexend v26).

Both families are under the SIL Open Font License 1.1, and each licence ships beside its fonts as `OFL-cormorant-unicase.txt` and `OFL-lexend.txt`. The licence allows embedding a font in a document. Lexend's Reserved Font Name is "RevReading Lexend"; Cormorant Unicase has none.

**The fonts are subsetted:** each PDF carries only the letters its cards use, and each font is embedded once however many cards there are.

**Every glyph is padded before the font is subsetted.** `@pdf-lib/fontkit`'s subsetter misplaces glyphs whose data has an odd number of bytes. Cormorant Unicase has 660 such glyphs, and without the padding the PDF drew "The Kettle" as "e Kettle" and lost most of the wordmark's letters.

`font-padding.ts` rewrites the font in memory before it is subsetted:

- every glyph is padded to a multiple of four bytes;
- the glyph index (`loca`) is rewritten in its long form;
- the table checksums are recomputed.

The outlines and metrics are unchanged, and the files in `public/` stay as Google Fonts ships them. A test reads every embedded font back out of a built PDF and checks that each glyph's outline equals one in the shipped font.

## Why pdf-lib, not jsPDF

The PDF is built with `pdf-lib` and `@pdf-lib/fontkit`. The card needs four things from the library, and pdf-lib gives each one directly:

- **Raw text operators.** `pushOperators` writes any content-stream operator, so each line is a `TJ` array carrying the font's kerning, with the canvas's letter spacing as `Tc`. The headline's measured line breaks hold only if the PDF draws the text at exactly the widths that were measured.
- **Font subsetting.** fontkit embeds each TrueType font as a subset holding only the letters the cards use.
- **Clipping and even-odd fills.** The block is clipped to its outer edge, and the QR finder rings are filled with the even-odd rule, which leaves each ring's centre empty.
- **Size and audit.** pdf-lib has no native code and a small dependency tree. `claude-docs/dependencies.md` records its audit: version 1.17.1, with no open advisory.

jsPDF's higher-level text and font calls were not tested against these four needs. pdf-lib was chosen because it meets all four through its documented API.

## What the tests prove

`pdf.test.ts` reads a built PDF back with pdf-lib and with a small interpreter of the page's drawing operators. It proves:

- every page is Letter;
- the page count is `2 × ceil(N / 10)` for 1, 10, 11, 20 and 21 cards, and the card count matches the batch;
- the block's size and position;
- the 18 crop marks, on the cut lines, short, outside the block and at least 1/4 in from the paper edge;
- the sheet label at 5 pt in the margin below the block, at least 1/4 in from the paper edge;
- every front stands upright on the page, each back lands behind its own front under a long-edge flip, and stands right way up when the card is turned side over side, with no half turn of the back page;
- every picture lies inside the block;
- the expiry date and every tagline appear in order;
- a 495-card batch builds 100 pages with each font and picture embedded once, and one shadow per front;
- each front's shadow is solid ground ink through a grey soft mask that peaks at the shadow opacity, drawn over the salt and under the words;
- every embedded glyph is intact.

`qr.test.ts` proves the code is 29 × 29 modules and that the SVG's dots match the matrix. `headline.test.ts` holds the headlines to two lines. `layout.test.ts` holds the card to 3.5 × 2 in with 1/8 in of bleed, keeps every line of every front and the back 1/8 in inside the trim and clear of the code, and holds the code to at least 0.9 in. It also holds both front columns to the top and bottom margins and, for a short date and a long one, the expiry's inked right edge to the right margin within 0.25 pt, with every line of the code column centred on the code and its gaps unchanged. `shadow.test.ts` proves the shadow's peak, its resolution, that it spreads evenly about the code column with no offset from the shapes it blurs, that it fades to nothing before its edges, and that it moves across with the code when the date moves it. `pdf.test.ts` proves the code and its shadow move together in the PDF.
