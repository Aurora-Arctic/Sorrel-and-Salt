# HelpFront

`src/components/HelpFront/` is the header every public help page shares: the level-one "Help", the lede and the search box at its `hero` size, with the page beneath it. The public help layout, `src/app/(public)/help/layout.tsx`, mounts it once, so a move from one public help page to another changes only the page beneath. The header stands in the same place on each, and a search under way keeps its typed words and its spinner. The staff pages (`/help/staff/…`) have their own layout and draw their own header.

- **The box holds the search page's words, and only there.** `HelpFrontSearch` (`search.tsx`, a client component) reads the address: on `/help/search` it hands the box the trimmed `q`, and on any other help page an empty query. `HelpSearchForm` copies a changed query into the box without remounting it, so the spinner carries over ([`help-search-form.md`](help-search-form.md)).
- **No Suspense boundary around the box.** Its fallback would be what a reader with no script sees, an empty box on the search page. The layout reads the session (`helpViewerOffers()`), so every public help page renders per request and `useSearchParams` needs no boundary.
- **Staff Help** is the header's action for a verified curator or keeper (`staffHelp`), from the layout's `helpViewerOffers()` read ([`help-pages.md`](help-pages.md), "The front page").
- **The body** is a [`SectionBody`](section-body.md) with `region="help"` and the class `help-front__body`, so a move between two public help pages draws the destination's skeleton under the header, which stays. It draws no second `main`, as the public layout's wraps it.
- **One column.** `HelpFrontHead` (`head.tsx`) carries `.help-page`, and every page beneath carries it too, so each section takes the header's edges at every width. A page with a jump menu keeps its text column at `$measure` and puts the menu beside or above it (`index.scss`; [`help-pages.md`](help-pages.md), "The jump menu").
- **The skeleton** is `HelpFrontSkeleton` (`skeleton.tsx`): the same `HelpFrontHead` with an empty box over the page's skeleton, drawn when a public help page is reached from outside the help pages (`framed('help', …)`, `src/components/SkeletonFrame`).

The pages beneath take `framed`, which leaves out the heading and the box they draw when they stand alone (`HelpIndex`, `HelpArticleView`); `HelpGlossary` and `HelpSearchResults` draw neither.

Story: `Pages / Help / HelpFront` in `index.stories.tsx`. Test: `tests/components/HelpFront/index.test.tsx`; the header's position, the column's edges and the held search are in `tests/e2e/help-pages.spec.ts`, "the help header".
