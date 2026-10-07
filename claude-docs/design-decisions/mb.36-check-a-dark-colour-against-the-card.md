# MB.36 — Check a dark group colour against the dark card

**Decided (2026-10-06):** M5.6b checks each category-group colour against the harder of its own theme's two surfaces, not its page ground. `colorDark` is checked against the dark card (`$soot-raised`, `#1f1c16`), and `colorLight` against the light page (`$parchment`, `#efe9da`). This amends DESIGN.md §5 and its §14 row, CLAUDE.md's curation invariant, and M5.6b's description and acceptance criteria. The working summary is [`../styling.md`](../styling.md), "Chips, badges and the solid-fill rule".

## What the question was

MB.35 had each colour checked against "its own theme's ground", which M5.6b took to be the page: `$soot` dark, `$parchment` light. MB.36 moved the chip onto the row's pair and showed what that leaves out. An unselected chip has no fill, so its label is the colour itself on whatever surface holds the chip. On an ingredient card or a modal, that surface is the card.

On dark, the card is lighter than the page, so a colour reads weaker on the card. The seeded eight measure 5.1–5.3:1 on the dark page and 4.6–4.8:1 on the dark card. Every seeded colour clears both, since M0.7 tuned them with headroom. An admin's colour picked to just clear the dark page would not: it could pass the check and still read under 4.5:1 on every card it appears on.

On light, the page is the darker surface, so the page is already the harder ground. That column does not change.

## Why the harder surface, not both

A colour that clears the harder surface clears the easier one too. The selected chip's label is the page surface, `$text-on-color`, on a fill of the colour, and its ratio is the colour's ratio against the page. So one check per column covers both chip states on both surfaces, and the error still names one column and one ratio.

## What it costs

An admin's dark colour must be a little lighter than the page alone would require. The seeded eight already pass, the worst being wellbeing's dark hex at 4.62:1 on the card. M5.6b asserts that every seeded pair passes the check, so editing a seeded group never trips it.
