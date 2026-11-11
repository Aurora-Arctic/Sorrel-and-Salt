# Invitation card print sheets

A keeper downloads a batch of invitation cards as one PDF to print at home or send to a printer. The code is `src/lib/invitation-cards/`; its tests are `tests/lib/invitation-cards/`.

The design is the approved card canvas: the `Main` artboard is the front and the `Back` artboard the back, on the business-card size. The artboards are drawn at 192 pixels to the inch (twice 96), so a 720 × 432 px artboard is a 3.5 × 2 in card with 1/8 in of bleed on every side, and the trim (the line the card is cut on) sits 24 px inside it. The builder keeps the canvas's pixels and scales them by 72/192 into PDF points, so every length in `layout.ts` can be checked against the canvas directly.

## The API

- The QR code's dot geometry (`qrShapes`, `roundedSquarePath`) lives in `src/lib/qr`, shared with the two-factor screen's `QrCode` component; `pdf.ts` draws the same shapes as PDF operators, filled with `HEADING_INK`.
- `buildCardSheetsPdf({ links, expiresAt })` fetches the fonts and pictures from `public/invitation-cards/` and returns the PDF's bytes. Card `i` gets link `i`.
- `renderCardSheets(input, assets)` in `pdf.ts` does the work without fetching, so tests pass it files read from disk.

## The sheet

Every page is US Letter, portrait (8.5 × 11 in).

- **Ten cards to a sheet**, two across and five down, each upright on the portrait page. A card is 3.5 × 2 in at the trim, so the block is 7 × 10 in. Ten is the most that fits upright with a margin a printer can print in: twelve would fill the page bar 1/8 in, which a printer's unprintable edge clips.
- **Bleed only on the block's outer edge.** Neighbouring cards share a cut line with no gap, so the block has 1/8 in of bleed all round its outside and is 7.25 × 10.25 in. It is centred: 5/8 in from each side and 3/8 in from the top and bottom.
- **Eighteen crop marks** sit outside the block, one on each end of every cut line (6 for the columns' lines, 12 for the rows'), on the cut line's extension and clear of the bleed: 2.25 pt of gap, 6 pt long, in a 0.75 pt line. A mark ends at least 18.75 pt (about 0.26 in) from the paper's top and bottom edges and 36.75 pt from its sides, outside the 1/4 in a printer may leave unprinted.
- **Two pages to a sheet**: a page of fronts, then a page of backs, so `N` links give `2 × ceil(N / 10)` pages.
- **The card turns like a book page.** Turned over side to side (left edge over to the right), a cut card shows its back right way up. Both pages stand upright, so the back page needs no half turn.
- **The backs are mirrored by column.** Back `i` takes position `floor(i / 2) × 2 + (1 − i mod 2)`: within each row the two cards swap places, so printed two-sided and flipped on the long edge each back sits behind its own front.
- **A part-filled last sheet** keeps the full soot block, and positions with no card stay plain soot, front and back, so the block prints and cuts as a full one with no bare paper at a cut.
- **The sheet label** names the batch, the sheet number and the face ("Batch 7c2d0000, sheet 2 of 3, fronts"). It sits in the margin below the block, upright, in Lexend 400 at 5 pt, its baseline 21 pt from the paper's bottom edge and its start 8 pt in from the first card's trim, at least 1/4 in from the paper's edge.

Layers on each page, in order: the soot fill, every picture, every front's shadow, every card's words and QR code, the crop marks. Everything except the marks is clipped to the block's outer edge, so a picture never lands on a neighbouring card's words.

## The card

**The front** keeps every line 1/8 in (24 px, 9 pt) inside the trim. A 290 px text column holds the headline (Cormorant Unicase 600, 52 px), the tagline (Lexend 400) and two muted lines, how to use the card and what it admits (Lexend 300). It runs the full height of the safe area: the headline's inked top sits on the top margin and the last muted line's inked bottom on the bottom margin. The room left over is shared between the gaps in proportion to their sizes, per card from the measured lines.

The QR code sits right of the column, 182 px (0.95 in) square, at y 143.364 px, over the edge of the salt's bright bowl. A second column stands on the code: the wordmark and the site address above it and the expiry date below it, each centred on the code's centre line, running from the top margin to the bottom margin (the wordmark's inked top and the expiry's inked bottom). Its gaps, between inked edges, run 1 : 2 : 2 (8.96, 17.93 and 17.93 pt). Across, `frontCode` in `layout.ts` stands the code where the expiry line, centred on it, ends its ink on the right margin (`SAFE_RIGHT`, 9 pt inside the trim), so a short date stands the column further right than a long one (the code's left edge is 449.77 px for `31 March 2027`, 428.12 px for `30 September 2027`). The builder places the code once per batch. The expiry, the back's `BY INVITATION ONLY.` and its batch line are the card's smallest type, Lexend 500 at 15 px (5.6 pt). The expiry reads `VALID UNTIL 31 MARCH 2027`: the batch's expiry, formatted in UTC in British English, in capitals. A letter-spaced line is centred on its inked width, which leaves out the spacing after its last letter. Card `i` gets front text `i mod 9` from `FRONT_COPY` in `copy.ts`.

**A faint shadow lies behind the code column**, over the salt and under the words and the code, in the ground ink (K93): the column's shapes blurred with no offset. It is a DeviceCMYK image of solid ground ink whose DeviceGray soft mask holds the blurred shapes, traced in `shadow.ts` at 240 dpi. `SHADOW_RADIUS` (3 pt) and `SHADOW_OPACITY` (0.5, the mask's darkest point) in `layout.ts` set it. Each front has its own mask; the ink image's bytes are shared.

**That a printed code scans is checked by the owner on a printed sheet.** No test decodes a code from a render, as a screen shows the inks lighter than paper prints them.

**The back** keeps the same 1/8 in inset and has the wordmark, a sentence about the site, and `BY INVITATION ONLY.`, with the sorrel picture at the top right and the batch's name at the column's foot. The sentence wraps at one width, 1/16 in short of the sorrel's leftmost inked pixel beside it (a pixel counts as inked where its tint times its alpha moves the ground at least 5% of the way to chalk), and its lines are balanced so it ends on no lone word. `layout.test.ts` holds every back line to that and 1/8 in inside the trim.

**A headline never runs to three lines.** `layout.ts` breaks every headline itself, as CSS `text-wrap: balance` does, measuring with the embedded font's own advances and kerning, and never relies on a renderer's wrapping. The 52 px size is final. At 52 px every headline fits in two lines; the tightest, "Three Times", is 289.5 of 290 px. `headline.test.ts` holds every `FRONT_COPY` headline to two lines, so a headline that needs three fails it.

**Text is placed as the browser places it.** Line heights and baselines follow CSS's half-leading rule; kerning goes into each line as a PDF `TJ` array and letter spacing as the `Tc` operator.

## Pictures

`node scripts/invitation-card-images.mjs` bakes the two pictures from the email illustrations: `public/email/images/salt-dark.png` becomes `public/invitation-cards/salt.png`, and `public/email/images/sorrel-dark.png` becomes `public/invitation-cards/sorrel.png`, mirrored. A PDF has no CSS mask, so the script writes the canvas's edge fade into each picture's alpha channel: alpha rises from 0 to 1 over the top 20% and over the outer 14% of each side, and the two ramps are multiplied.

| Picture | Pixels    | Printed size   | Resolution    |
| ------- | --------- | -------------- | ------------- |
| Salt    | 440 × 294 | 1.88 × 1.25 in | about 235 dpi |
| Sorrel  | 330 × 248 | 2.04 × 1.50 in | about 162 dpi |

Both are below the 300 dpi usual for print; they are soft, low-contrast pictures behind the text, so the shortfall shows less. A sharper card needs larger source illustrations.

The salt sits where the `Main` artboard puts it: the bottom-right corner, its right and bottom edges 1/8 in past the trim, drawn at 360 × 240 px so its bright bowl lies beside and below the QR code rather than under the whole of it. Pictures are drawn before any card's words and the only clip is the block's outer edge, so the card beside and the card below each show a strip of salt under their words, and a card on the block's edge keeps that strip in the bleed, which the guillotine cuts away. `pdf.test.ts` pins the salt to that corner.

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
