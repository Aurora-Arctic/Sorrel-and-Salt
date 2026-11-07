# SearchSentence

`src/components/SearchSentence/` is the sentence above a list that says what it is searching for, "12 ingredients matching rue", and beneath it, opened, the filters that narrowed it. It draws the fragments `buildSearchSentence` returns ([`ingredient-search.md`](ingredient-search.md), "The search sentence") and does the loading animation that stands in for a spinner. A client component; props in `types.ts`. `parts.ts` cuts the fragments into lead, term and clauses; `typing.ts` holds the editing (one character an edit towards a goal) and the timings.

## Contracts

- **There is no `total` prop.** The count is the sentence's own lead, so a second copy would have to be kept equal. `pending` is read as its two edges: true starts the typing, false is the search returning.
- **Settled, it is one closed line**: lead, term and a chevron, one space at every join and no comma. The builder writes a comma before each clause (the term's too), so the component takes the sentence apart and keeps the commas for the clauses beneath only. A press opens the clauses and a second shuts them. With no clause (no filter) it is a plain line with no chevron.
- **Values are a quiet mark, joins the loud word.** A chosen value and the term are `.search-sentence__value` (a `<span>`, not `<strong>`: a mark, not emphasis) at weight 300 in a 1px hairline box like a key. A join, the bare "or"/"and" between two values (`join` in `ClausePart`), is `.search-sentence__join`: weight 600, accent, letter-spaced, no box. The lead's count ("12", "No") is `.search-sentence__count` at 500. All are drawn while typing too. Values are never links. The casing is the builder's.
- **A value's box is not drawn while it types.** It keeps its room (a transparent 1px edge and the padding, so the text never moves) and the edge fades in over `$motion-short` once every letter is there (`is-boxed`); backspacing drops the class at once. A settled sentence is drawn boxed from first paint.
- **Before hydration** it is a native `<details>`, closed, holding the whole clauses, so it opens without script and the tail is not clipped.
- **While `pending` the sentence is typed in its place.** The lead reads "Searching for ingredients", the term and clauses are typed after it, and the clauses slide open beneath. The old line is backspaced first (about half a second at most), keeping the term if it did not change. The props already name the new search when `pending` rises (the list reads it from the address being opened), so the old line is the one last on screen: the settled sentence the component kept, or the typed line if a search starts before the last settled. The edge is read before paint, so the new search never shows for a frame first.
- **The typed line is `aria-hidden` and `inert`.** A visually hidden `role="status"` region is empty while pending and receives the finished sentence once, when it returns, with plain text and no links. Announcing every character would be noise (WCAG 4.1.3).
- **On return** the lead is backspaced to "N ingredients" at the normal pace and the clauses still to type finish at four characters a tick. The finished sentence is held for a second, then the clauses slide up into the closed line; the text stays whole in the page through the slide (`useSlide`, `src/lib/use-slide.ts`).
- **Reduced motion** turns typing, the slide and the box fade off: the line snaps to the finished sentence and shuts, with no hold. A changed term switches straight to the new one.
- **The chevron** turns with `disclosure-chevron` and fades by opacity as a search starts and ends.
- **Forced colours:** the typing caret is painted `CanvasText`.

## Stories

`src/components/SearchSentence/index.stories.tsx` ("Ingredients / Search Sentence", `States`: Settled, Slow Search, Fast Search, Nothing To Open; New Search and Search Again start another).
