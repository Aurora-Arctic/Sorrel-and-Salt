# SearchSentence

`src/components/SearchSentence/` is the sentence above a list that says what it is searching for, "12 ingredients matching rue", and beneath it, opened, the filters that narrowed it. It draws the fragments `buildSearchSentence` returns ([`ingredient-search.md`](ingredient-search.md), "The search sentence") and does the loading animation that stands in for a spinner. A client component. The props are in `types.ts`.

## Contracts

- **There is no `total` prop.** The count is the sentence's own lead, so passing it as well would be a second copy to keep equal. `pending` is read as its two edges: true starts the typing, false is the search returning.
- **Settled, it is one closed line.** The lead, the term and a chevron, with one space at every join and no comma: "12 ingredients matching rue". The builder writes a comma before each clause (the term's too), so the component takes the sentence apart (`parts.ts`) and keeps the commas for the clauses beneath only. A press opens the clauses and a second shuts them. With no clause to show (no filter) it is a plain line with no chevron.
- **Values are a quiet mark, joins the loud word.** A chosen value, and the search term, is a `<span class="search-sentence__value">` (not a `<strong>`: it is a mark, not emphasis) at the body's weight 300 inside a 1px hairline box, like a key on a keyboard. A join, the bare "or" or "and" between two values (`join` in `ClausePart`), is a `<span class="search-sentence__join">`: weight 600, accent colour, a little letter-spaced and set apart, with no box. The count at the start of the lead ("12", or "No") is a `<span class="search-sentence__count">` at 500. All are drawn while typing too, so a join types out with its style on. Values are never links. The casing is the builder's.
- **A value's box is not drawn while it types.** It keeps its room (a transparent 1px edge and the padding, so the text never moves) and the edge fades in over `$motion-short` (150ms, ease-out) once every letter is there (`is-boxed`). Backspacing a value drops the class and the box goes at once. Reduced motion shows it with no fade, and a settled sentence is drawn boxed from the first paint. The status region keeps plain text.
- **Before hydration** it is a native `<details>`, closed, holding the whole clauses, so it opens without script and the tail is not clipped until the script runs.
- **While `pending` the sentence is typed in its place.** The lead reads "Searching for ingredients", the term and the clauses are typed after it, and the clauses slide open beneath. The old line is backspaced first (about half a second at most), keeping the term if it did not change; a changed term is backspaced with the rest and the new one typed a character at a time. The props already name the new search when `pending` rises (the list reads it from the address being opened), so the old line is the one last on screen: the settled sentence the component kept, or the typed line if a search starts before the last one has settled. The edge is read before paint, so the new search never shows for a frame first.
- **The typed line is `aria-hidden` and `inert`**, so it is neither read nor focusable. A status region (`role="status"`, visually hidden) is empty while a search is pending and receives the finished sentence once, when it returns. It holds no links. Announcing every character would be noise (WCAG 4.1.3, Status Messages).
- **On return** the lead is backspaced to "N ingredients" at the normal pace and the clauses still to type finish at four characters a tick (a fast search). The finished sentence is held for a second, then the clauses slide up into the closed line. Its text stays in the page, whole, through the slide (`useSlide`, `src/lib/use-slide.ts`).
- **Reduced motion** turns the typing and the slide off: the line snaps to the finished sentence and shuts, with no hold. A changed term switches straight to the new one, never shown in part.
- **The chevron** turns with `disclosure-chevron` and fades by opacity as a search starts and ends, so it never pops in or out.
- **Forced colours:** the typing caret is painted `CanvasText`.

## Files

`parts.ts` cuts the fragments into the lead, the term and the clauses. `typing.ts` holds the editing, one character an edit towards a goal, and the animation's timings.

## Not here

Stories: `src/components/SearchSentence/index.stories.tsx` ("Ingredients / Search Sentence", `States`: Settled, Slow Search, Fast Search, Nothing To Open; New Search and Search Again start another).
