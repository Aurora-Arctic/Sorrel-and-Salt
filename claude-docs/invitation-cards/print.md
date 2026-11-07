# Invitation card print sheets

A keeper downloads a batch of invitation cards as one PDF to print at home or send to a printer. The code is `src/lib/invitation-cards/`; its tests are `tests/lib/invitation-cards/`.

The design is the approved card canvas: the `Main` artboard is the front and the `Back` artboard the back. The artboards are drawn at 192 pixels to the inch (twice 96), so a 720 × 552 px artboard is a 3.75 × 2.875 in card with its bleed, and the trim (the line the card is cut on) sits 24 px inside it. The builder keeps the canvas's pixels and scales them by 72/192 into PDF points, so every length in `layout.ts` can be checked against the canvas directly.

## The API

- `cardQrSvg(link)` returns the card's QR code as an SVG string. The dot geometry (`qrShapes`, `qrSvg`, `roundedSquarePath`) lives in `src/lib/qr`, shared with the two-factor screen's `QrCode` component; `cardQrSvg` only adds the card's tone, and `pdf.ts` draws the same shapes as PDF operators.
- `buildCardSheetsPdf({ links, expiresAt })` fetches the fonts and pictures from `public/invitation-cards/` and returns the PDF's bytes. Card `i` gets link `i`.
- `renderCardSheets(input, assets)` in `pdf.ts` does the work without fetching, so tests pass it files read from disk.

## The sheet

Every page is US Letter, portrait (8.5 × 11 in).

- **Nine cards to a sheet**, three by three. A card is 3.5 × 2.625 in at the trim, so the block is 10.5 × 7.875 in. That only fits the page turned on its side, so the cards are laid out on a landscape frame turned a quarter turn onto the portrait page.
- **Bleed only on the block's outer edge.** Neighbouring cards share a cut line with no gap, so the block has 1/8 in of bleed all round its outside and is 8.125 × 10.75 in. It is centred: 1/8 in from the top and bottom edges, 3/16 in from the left and right.
- **Sixteen crop marks** sit outside the block, one on each end of the four cut lines in each direction, on the cut line's extension and clear of the bleed: 1/32 in of gap and 1/12 in long at the page's top and bottom, where the margin is only 1/8 in; 1/16 in of gap and 5/48 in long at the sides. A printer with a wider unprintable margin crops the top and bottom marks.
- **Two pages to a sheet**: a page of fronts, then a page of backs, so `N` links give `2 × ceil(N / 9)` pages.
- **The card turns like a book page.** Turned over side to side (left edge over to the right), a cut card shows its back right way up. For that, the fronts' frame is turned a quarter clockwise onto the page and the backs' frame a quarter anticlockwise: every front's top points to the page's right and every back's top to its left.
- **The backs are mirrored by column.** Back `i` takes position `floor(i / 3) × 3 + (2 − i mod 3)`: within each row the first and last cards swap places. With the backs' frame turned the other way, each back lands at its front's height, mirrored left to right, so printed two-sided and flipped on the long edge it sits behind its own front.
- **A part-filled last sheet** keeps the full soot block, and positions with no card stay plain soot, front and back, so the block prints and cuts as a full one with no bare paper at a cut.

Layers on each page, in order: the soot fill, every picture, every card's words and QR code, the crop marks. Everything except the marks is clipped to the block's outer edge, so a picture never lands on a neighbouring card's words.

## The card

**The front** has a 290 px text column holding, in order: the headline (Cormorant Unicase 600, 52 px); the tagline (Lexend 400); two muted lines, how to use the card and what it admits (Lexend 300); and at the column's foot the wordmark, the site address and the expiry date. The QR code is on the right with the salt picture behind it. Card `i` gets front text `i mod 9` from `FRONT_COPY` in `copy.ts`. The expiry reads `VALID UNTIL 31 MARCH 2027`: the batch's expiry, formatted in UTC in British English, in capitals.

**The back** has the wordmark, a sentence about the site, and `BY INVITATION ONLY.`, with the sorrel picture at the top right.

**A headline never runs to three lines.** `layout.ts` breaks every headline itself, as CSS `text-wrap: balance` does, measuring with the embedded font's own advances and kerning, and never relies on a renderer's wrapping. The 52 px size is final. At 52 px every headline fits in two lines; the tightest, "Three Times", is 289.5 of 290 px. `headline.test.ts` holds every `FRONT_COPY` headline to two lines, so a headline that needs three fails it.

**Text is placed as the browser places it.** Line heights and baselines follow CSS's half-leading rule; kerning goes into each line as a PDF `TJ` array and letter spacing as the `Tc` operator.

## Pictures

`node scripts/invitation-card-images.mjs` bakes the two pictures from the email illustrations: `public/email/images/salt-dark.png` becomes `public/invitation-cards/salt.png`, and `public/email/images/sorrel-dark.png` becomes `public/invitation-cards/sorrel.png`, mirrored. A PDF has no CSS mask, so the script writes the canvas's edge fade into each picture's alpha channel: alpha rises from 0 to 1 over the top 20% and over the outer 14% of each side, and the two ramps are multiplied.

| Picture | Pixels    | Printed size   | Resolution    |
| ------- | --------- | -------------- | ------------- |
| Salt    | 440 × 294 | 2.40 × 1.60 in | about 184 dpi |
| Sorrel  | 330 × 248 | 2.04 × 1.50 in | about 162 dpi |

Both are below the 300 dpi usual for print; they are soft, low-contrast pictures behind the text, so the shortfall shows less. A sharper card needs larger source illustrations.

The salt sits where the `Main` artboard puts it: the bottom-right corner, its right and bottom edges 1/8 in past the trim. Pictures are drawn before any card's words and the only clip is the block's outer edge, so the card beside and the card below each show a strip of salt under their words, and a card on the block's edge keeps that strip in the bleed, which the guillotine cuts away. `pdf.test.ts` pins the salt to that corner.

## Fonts

The card embeds four static TrueType files from `public/invitation-cards/fonts/`, as Google Fonts serves them: Cormorant Unicase SemiBold (600) and Lexend Light, Regular and Medium (300, 400, 500). Both families are under the SIL Open Font License 1.1, which allows embedding in a document; each licence ships beside its fonts (`OFL-cormorant-unicase.txt`, `OFL-lexend.txt`). Lexend's Reserved Font Name is "RevReading Lexend"; Cormorant Unicase has none.

**The fonts are subsetted:** each PDF carries only the letters its cards use, and each font is embedded once however many cards there are.

**Every glyph is padded before the font is subsetted.** `@pdf-lib/fontkit`'s subsetter misplaces glyphs whose data has an odd number of bytes; Cormorant Unicase has 660, and without padding "The Kettle" drew as "e Kettle". `font-padding.ts` rewrites the font in memory before subsetting: every glyph padded to a multiple of four bytes, the glyph index (`loca`) rewritten in its long form, the table checksums recomputed. Outlines and metrics are unchanged and the files in `public/` stay as Google Fonts ships them. A test reads every embedded font back out of a built PDF and checks each glyph's outline equals one in the shipped font.

## Why pdf-lib, not jsPDF

The PDF is built with `pdf-lib` and `@pdf-lib/fontkit`, which meet the card's four needs through their documented API:

- **Raw text operators.** `pushOperators` writes any content-stream operator, so each line is a `TJ` array with the font's kerning and the canvas's letter spacing as `Tc`. The headline's measured line breaks hold only if the PDF draws text at exactly the measured widths.
- **Font subsetting.** fontkit embeds each TrueType font as a subset.
- **Clipping and even-odd fills.** The block is clipped to its outer edge, and the QR finder rings are filled with the even-odd rule, which leaves each ring's centre empty.
- **Size and audit.** pdf-lib has no native code and a small dependency tree (`claude-docs/dependencies.md` records its audit).
