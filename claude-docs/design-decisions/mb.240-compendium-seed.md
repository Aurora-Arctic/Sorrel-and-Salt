# A researched, sourced compendium seed

**Status:** decided. Live home: `claude-docs/compendium/compendium-seed/README.md` (the rules every entry is written to), with the roster in `claude-docs/compendium/compendium-seed/candidates.md`. M14.4 moved the seed to one markdown file per entry (`claude-docs/design-decisions/m14.4-compendium-markdown-files.md`).

## Decision

Staging and production start with a researched, sourced compendium rather than an empty one a keeper fills by hand. The owner's binding rule: "Do not make stuff up. All claims must have sources."

- **Size.** Entries keyed by formal name; forms are extra rows beneath them and do not count. A ceiling of 1,111 entries (first 614, widened by the owner); the roster stops at what its sources yield and is never padded to the ceiling.
- **Depth.** Cunningham's: 100 to 250 words of description per entry, at most 120 per form.
- **Evidence.** A value rests on a source the lane read during its task: a page of the owner's books or a page it fetched. Wikipedia is a valid source. A value with no source is left out, and a candidate nobody could source is listed as left out.
- **Not a scenario.** It is reference data with its own target, `db:seed:compendium`, run by `migrate.yml` after the five vocabularies and their sources. `standard` is cloned for every db test and stays the fixture it is.
- **Write-once.** A present entry is skipped with all its children; the run that inserts an entry writes everything beneath it. A correction is made in the admin page and the seed edited to match. Presence is `seed_key` on `ingredients` (MB.241), or a live row with that identity or slug. Renaming a seeded key would insert the entry again beside itself.
- **Shards.** Six content shards of 48 to 136 entries, each its own task, pull request and research lane, after a 14-entry pilot that proved the shape on real data.
- **Facts.** Every citation carries `supports`, the fields it backs, and a guard fails a populated field no citation covers. Each shard doc records its bibliography and one source line per entry.
- **Books.** The owner's copies in `/app/.library/`, git-ignored and guarded by a test; `npm run library:text` (`scripts/library-text.ts`) makes them searchable. A citation names the edition in hand and the number printed on the page, not the PDF page offset. An entry-ordered EPUB is cited by heading (`under "Mugwort"`). `Master Book Of Herbalism PDF.pdf` is a Bookey summary and is never cited; Kynes's `9780738732534.pdf` is a 37-page excerpt without its plant, mineral and animal chapters; the crystal encyclopedia and the 1903 _Book of Herbs_ are OCR text, so a spelling is checked against the page.
- **Curated values only.** An entry names only forms, categories, deities, planets and signs by their seed files' spelling, picked through `seed_key`, and colours from a closed list.
- **Stones.** A named sort sold and worked as itself (Apache tear, Herkimer diamond, chevron amethyst) is an entry, named as Wikipedia or Mindat heads it, `nomenclature: 'mineral'`; `<Species> var. <variety>` only where a source names the variety so, and the first 614 rows' `var.` names stand. Laboratory-treated stones Hall heads (aqua aura, titanium quartz) are entries and say they are treated. Crystal formations (cluster, point, wand, elestial, phantom and the rest) are forms beneath Clear Quartz, and a geode is a form of its stone. A species a source heads or gives its own correspondences is its own row; otherwise it stays under "left out".
- **Pilot calls.** Sandalwood's Bead form and Hematite's Pigment form stay; Florida Water's safety note stands; Zeus stays on Honey.

## Why

A stone sold under its own name has correspondences of its own, and a form beneath its mineral would hide it from the list and fold those into a parent that does not share them. A variant is only ever a physical form. Write-once keeps a reseed from undoing what a keeper changed.

## Rules out

- **Compressing the seed.** Git already packs this seed text 9.5 to 11.8 times, and a gzipped copy deflates to the same size in git. A compressed file is unreviewable and loses git's delta storage on every edit.
- **Git LFS.** It spends the account's free bandwidth on a problem a hundred times smaller than the one it solves, and puts the seed outside a plain clone.
- **One TypeScript file per entry, or the entries repeated in markdown beside a literal.** Both were set aside here for shards over a single literal, then reversed by M14.4: the seed is one markdown file per entry and that file is the source of truth, not a copy.
