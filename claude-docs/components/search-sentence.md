# SearchSentence

`src/components/SearchSentence/` — the sentence above a list that says what it is
searching for (M12.4): "12 ingredients matching rue", and beneath it, opened,
the filters that narrowed it. It draws the fragments `buildSearchSentence`
returns ([`ingredient-search.md`](ingredient-search.md), "The search sentence") and
does the loading animation that stands in for a spinner. A client component.

## Props

`SearchSentenceProps` (`types.ts`):

| Prop        | What it is                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `sentence`  | The `SearchSentence` from `buildSearchSentence`. Its values are drawn in a hairline box and are never links |
| `query`     | The text the person searched for, or "". It always shows in the closed line                                 |
| `pending`   | A search is on its way. Read as its two edges: true starts the typing, false is the search returning        |
| `className` | Added to the sentence's own class                                                                           |

There is no `total` prop: the count is the sentence's own lead, so passing it as
well would be a second copy to keep equal.

## Contracts

- **Settled, it is one closed line.** The lead, the term and a chevron, with one
  space at every join and no comma: "12 ingredients matching rue". The builder
  writes a comma before each clause (the term's too), so the component takes the
  sentence apart (`parts.ts`) and keeps the commas for the clauses beneath only.
  A press opens the clauses and a second shuts them. With no clause to show (no
  filter) it is a plain line and has no chevron.
- **Values are a quiet mark, joins the loud word.** A chosen value is a
  `<span class="search-sentence__value">` (not a `<strong>`: it is a mark, not emphasis) at
  the sentence's own weight (300, the body's) inside a 1px hairline box, like a key on a keyboard;
  the search term is drawn the same way. A join, the bare "or" or "and" between two values
  (`join` in `ClausePart`), is a `<span class="search-sentence__join">`: weight 600, in the accent
  colour, a little letter-spaced and set apart, with no box. The count at the start of the lead
  ("12", or "No") is a `<span class="search-sentence__count">` at 500. All are drawn while typing
  too, so a join types out with its style on. A value's box is not drawn while it types: it keeps
  its room (a transparent 1px edge and the padding, so the text never moves) and the edge fades in
  over `$motion-short` (150ms, ease-out) once every letter of the value is there (`is-boxed`).
  Backspacing a value drops the class and the box goes at once; reduced motion shows it with no
  fade, and a settled sentence is drawn boxed from the first paint. The status region keeps plain text. The casing is the builder's
  ([`ingredient-search.md`](ingredient-search.md), "The search sentence").
- **Before hydration** it is a native `<details>`, closed, holding the whole
  clauses, so it opens without script; the tail is not clipped until the script
  runs.
- **While `pending` the sentence is typed in its place.** The lead reads "Searching
  for ingredients", the term and the clauses are typed after it, and the clauses
  slide open beneath. The old line is backspaced first (about half a second at
  most), keeping the term if it did not change; a changed term is backspaced with
  the rest and the new one typed a character at a time (MB.270). The props already
  name the new search when `pending` rises (the list reads it from the address being
  opened), so the old line is the one last on screen: the settled sentence the
  component kept, or the typed line if a search starts before the last one has
  settled. The edge is read before paint, so the new search never shows for a frame
  first. The whole typed line is `aria-hidden` and `inert`, so it is neither read
  nor focusable.
- **On return** the lead is backspaced to "N ingredients" at the normal pace and the
  clauses still to type finish at four characters a tick (a fast search). The finished
  sentence is held for a second, then the clauses slide up into the closed line. Its
  text stays in the page, whole, through the slide (`useSlide`, `src/lib/use-slide.ts`).
- **A status region** (`role="status"`, visually hidden) is empty while a search is
  pending and receives the finished sentence once, when it returns. It holds no
  links. The typed line is not announced, because announcing every character would
  be noise (WCAG 4.1.3, Status Messages).
- **Reduced motion** turns the typing and the slide off: the line snaps to the
  finished sentence and shuts, with no hold. A changed term switches straight to the
  new one, never shown in part.
- The chevron turns with `disclosure-chevron` and fades by opacity
  as a search starts and ends, so it never pops in or out.

## Files

| File        | What it holds                                                                  |
| ----------- | ------------------------------------------------------------------------------ |
| `parts.ts`  | Cuts the fragments into the lead, the term and the clauses                     |
| `typing.ts` | The editing: one character an edit towards a goal, and the animation's timings |

## The sentence and its loading animation

The sentence above a list says what the list is searching for. Settled, it is one closed line such as "12 ingredients matching rue", which opens to the clauses beneath it.

While a search is on its way, the whole sentence is typed out in place as the loading animation. The count reads "Searching for ingredients" until the result returns, then is backspaced to the real count. The clauses finish typing, are held for a moment, and slide up into the closed line. The typed line is hidden from assistive technology, and a status region is given the finished sentence once, when the search returns.

## Stories

`src/components/SearchSentence/index.stories.tsx`, titled "Ingredients / Search Sentence": `States`, with the states Settled (one closed line), Slow Search (results after four seconds), Fast Search (results before the clauses finish typing) and Nothing To Open (a search term and no filter, so a plain line). Each starts its own search on load; New Search and Search Again start another.
