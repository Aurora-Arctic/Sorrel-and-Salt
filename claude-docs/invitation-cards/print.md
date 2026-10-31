# Invitation card print sheets

An admin downloads a batch of invitation cards as one PDF to print at home or send to a printer. This page describes what that PDF contains, where its sizes come from, and why it is built the way it is. The code is `src/lib/invitation-cards/`; its tests are `tests/lib/invitation-cards/`.

The design is the approved card canvas: the `Main` artboard is the front and the `Back` artboard is the back. Its artboards are drawn at 192 pixels to the inch (twice 96), so a 720 × 552 px artboard is a 3.75 × 2.875 in card with its bleed, and the trim (the line the card is cut on) sits 24 px inside it. The builder keeps the canvas's pixels and scales them by 72/192 into PDF points, so every length in `layout.ts` can be checked against the canvas directly.

## The API

`src/lib/invitation-cards/index.ts` exports two functions:

- `cardQrSvg(link)` returns the card's QR code as an SVG string: round data dots and rounded finder squares, drawn from the `qrcode` package's module matrix.
- `buildCardSheetsPdf({ links, expiresAt })` fetches the fonts and pictures from `public/invitation-cards/` and returns the PDF's bytes. Card `i` gets link `i`.

`renderCardSheets(input, assets)` in `pdf.ts` does the work without fetching, so the tests pass it the files read from disk.

## The sheet

Every page is US Letter, portrait (8.5 × 11 in).

- **Nine cards to a sheet**, three by three. A card is 3.5 × 2.625 in at the trim, so three across the long side make 10.5 in and three down make 7.875 in. That block only fits on the page turned on its side, so the cards are laid out on a landscape frame turned a quarter turn onto the portrait page.
- **Bleed only on the block's outer edge.** Neighbouring cards share a cut line with no gap between them, so there is no bleed between cards; the block has 1/8 in of bleed all round its outside. With it, the block is 8.125 × 10.75 in.
- **Where the block sits.** It is centred on the page: 1/8 in from the top and bottom edges and 3/16 in from the left and right.
- **Sixteen crop marks** sit outside the block, one on each end of the four cut lines in each direction. Each mark is on the cut line's extension, clear of the bleed: 1/32 in of gap and 1/12 in long at the page's top and bottom, where the margin is only 1/8 in; 1/16 in of gap and 5/48 in long at the sides.
- **Two pages to a sheet.** For each sheet of nine, the PDF has a page of fronts and then a page of backs, so `N` links give `2 × ceil(N / 9)` pages.
- **The card turns like a book page.** A cut card, turned over side to side (its left edge over to the right, as a book page turns), shows its back right way up. For that, the fronts' frame is turned a quarter clockwise onto the page and the backs' frame a quarter anticlockwise. On the paper, every front's top points to the page's right and every back's top to the page's left. Turned top over bottom instead, the back would be upside down.
- **The backs are mirrored by column.** Back `i` takes position `floor(i / 3) × 3 + (2 − i mod 3)`: within each row of the frame the first and last cards swap places. With the backs' frame turned the other way, this puts each back at the same height on the page as its front, mirrored left to right. Printed two-sided and flipped on the long edge, each back lands behind its own front.
- **A part-filled last sheet** keeps the full soot block, and the positions with no card stay plain soot, front and back. The block then prints and cuts exactly as a full one, with no bare paper showing at a cut.
- **The crop marks need a printer that prints close to the edge.** The marks at the top and bottom sit in the 1/8 in margin; a printer with a wider unprintable margin crops them.

The layers on each page are drawn in this order: the soot fill, then every picture, then every card's words and QR code, then the crop marks. Everything except the marks is clipped to the block's outer edge, so a picture never lands on a neighbouring card's words.

## The card

**The front** carries, in a 290 px text column:

1. the headline, Cormorant Unicase 600 at 52 px;
2. the tagline, Lexend 400;
3. the two muted lines (how to use the card and what it admits), Lexend 300;
4. at the column's foot, the wordmark, the site address and the expiry date.

The front also carries the QR code on the right and the salt picture behind it. Card `i` gets front text `i mod 9` from `FRONT_COPY` in `copy.ts`. The expiry date reads `VALID UNTIL 31 MARCH 2027`: the batch's expiry, formatted in UTC in British English and set in capitals.

**The back** carries the wordmark, a sentence about the site, and `BY INVITATION ONLY.`, with the sorrel picture at the top right.

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
| Salt    | 440 × 294 | 2.40 × 1.60 in | about 184 dpi |
| Sorrel  | 330 × 248 | 2.04 × 1.50 in | about 162 dpi |

Both are below the 300 dpi usual for print. They are soft, low-contrast pictures behind the text, so the shortfall shows less than it would on a sharp picture. A sharper card needs larger source illustrations.

The salt sits where the canvas's `Main` artboard puts it: in the artboard's bottom-right corner, its right and bottom edges 1/8 in past the trim. Every picture on a sheet is drawn before any card's words or QR code, and the only clip is the block's outer edge. So the card beside and the card below each show a strip of salt under their words, and a card on the block's edge keeps that strip in the bleed, which the guillotine cuts away. `pdf.test.ts` pins the salt to that corner.

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
- the page count is `2 × ceil(N / 9)` for 1, 9, 10, 18 and 19 cards, and the card count matches the batch;
- the block's size and position;
- the 16 crop marks, on the cut lines and outside the block;
- each back lands behind its own front under a long-edge flip, and stands right way up when the card is turned side over side;
- every picture lies inside the block;
- the expiry date and every tagline appear in order;
- a 500-card batch builds 112 pages with each font and picture embedded once;
- every embedded glyph is intact.

`qr.test.ts` proves the code is 29 × 29 modules and that the SVG's dots match the matrix. `headline.test.ts` holds the headlines to two lines.
