# Business Cards

`src/components/BusinessCards/` and `src/lib/business-cards/` — the keeper page `/keepers/business-cards` (M15.80). A keeper types a name, an email address and a phone number and downloads a PDF of their own business cards. It is for keepers only: the page calls `requireAdminSession()` itself, because the Keepers layout lets a curator through for Support ([`auth/admin-guard.md`](../auth/admin-guard.md)).

## What it asks the server for

Nothing, once the page is open. The form fetches the card fonts and pictures from `public/invitation-cards/` when it mounts (`fetchCardAssets`, the same files the invitation cards use), and Generate builds the PDF from them in the browser and saves it with `saveFile`. There is no GraphQL call, no service and no database write, so nothing typed is kept.

## The form

Name, Email and Phone are all required, and Email must be an email address (`schema.ts`). Phone must be a valid phone number (`isPhoneNumber`, `libphonenumber-js`), and the message is "Enter a phone number, like (202) 555-0123". The field is masked as the keeper types, through Field's `mask` ([Field](field.md), "Masks"): US formatting by default, `(202) 555-0123`, and a number starting with `+` is formatted for its own country. The saved value is the formatted text. Include Backs is a switch, off to start. Generate is off only until the fonts and pictures have arrived. It is never off for a missing or wrong field: a press then marks each wrong field, shows the error summary, which takes the focus, and builds nothing.

## The sheet

Portrait US Letter, ten cards to a page (2 × 5), each 3.5 × 2 in with 1/8 in of bleed and a short cut mark on every cut line. The geometry and drawing are the shared `src/lib/card-sheet/` module, the same as the invitation cards. With Include Backs on, a second page holds the backs, with the columns mirrored so each back lands behind its front when the sheet is turned over its long edge.

The design is Hedgerow — Airy, in the CMYK inks of tile 100-A4 (`src/lib/invitation-cards/inks.ts`); every fill and stroke is DeviceCMYK.

- **Front** (`layout.ts`): the name, a green rule exactly as wide as the printed name, the email and phone, the Sorrel & Salt name and address, and the salt picture running off the edge. The rule's green is `RULE_INK`, the site's bright sorrel in the same black replacement.
- **Back**: the sorrel picture and the site's one-line description.
- **A long name** is set smaller until its ink stops 9 pt (1/8 in) inside the trim. The email and phone are held to the same limit.
