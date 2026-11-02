# DocumentPage

`src/components/DocumentPage/` — the page a public document is read on: the privacy policy (`/privacy`), the disclaimer (`/disclaimer`), the code of ethics (`/code-of-ethics`) and the terms (`/terms`), and any document that follows them on the same frame. It opens with one muted line saying when the text last changed ("Last updated 1 November 2026", as a `<time>` carrying the day in `YYYY-MM-DD`), above the title as an ingredient entry's Last Edit line sits above its names. Then it draws the page head through [`PageHeader`](page-header.md) with the document's title and its lede, then a jump menu ([`PageNav`](page-nav.md), "On This Page") and the document's own sections. The whole is an `<article>` named by the title.

It reads nothing: no session, no database, no search params. A signed-out visitor and a member read the same page, inside whichever frame the public layout chooses for them (`src/app/(public)/layout.tsx`). A document page is not an exception to the rule that the compendium is the one public surface of data (`CLAUDE.md`, "Domain invariants"): it carries no application data, so there is nothing to protect. The site's own searches read the database, and a document is not in it, so no in-site search can list one; `tests/e2e/document-pages.spec.ts` proves the compendium search returns nothing for a document's title.

A document route is listed in three places beside its page: `PUBLIC_ROUTES` in `src/proxy.ts`, so the proxy lets a signed-out visitor through; `CRAWLABLE_PATHS` in `src/app/robots.ts`, so a crawler may index it on production; and `src/app/sitemap.ts`. The footer ([`site-footer.md`](site-footer.md)) links every document as a text link before Support.

## Props

`DocumentPageProps` (`types.ts`):

| Prop        | What it is                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `title`     | The document's title: the page's one `h1`, title case                                                   |
| `lede`      | Optional: a sentence under the title saying what the document is for                                    |
| `updatedOn` | The day the text last changed, a `Date`; the page shows it in UTC, so no server zone moves it           |
| `children`  | The document's sections: `h2` headings (optionally with `h3` subsections), paragraphs, lists and tables |

## The jump menu

The menu is read from `children`: each direct `h2` and `h3` child is given an `id` that is the slug of its text (`src/lib/slugify.ts`), so a heading is written once and the menu cannot drift from it. An `h2` followed by one or more `h3`s is a group: each `h3` becomes an entry carrying the `h2`'s text as its `group` ([`PageNav`](page-nav.md)), so the menu nests the subsections under it, and the `h2` has no entry of its own because a group label is not a link. An `h2` with no `h3` after it is a top-level entry. A heading must therefore be a direct child of `DocumentPage` and hold plain text; a document with no `h2` or `h3` draws no menu. Each heading keeps a scroll margin under the shell's bar.

The article is `.page-with-nav` ([`page-nav.md`](page-nav.md), "Where it stands"): from a tablet up the menu is a sticky column to the left of the sections, and on a wide screen an empty column of the menu's width balances it, so the text column sits at the window's centre; below that the pair is centred together. On a phone the menu stands above the sections. The column is the reading measure rather than `.page-with-nav`'s narrow column, and the menu's column is 18rem rather than its 12rem, with the breakpoints recomputed from those widths; text inside stays start-aligned. The rule that sets the columns names both classes (`.document-page.page-with-nav`), because the primitives are emitted under `body` and a lone class loses to them.

The entries are long: a document's section heading runs to a clause or two, so in the 12rem column most broke into three lines. The wider column leaves the longest at two, and each entry takes `space(2)` above and below rather than PageNav's `space(1)`, with its lines at 1.3, so the gap between two entries is plainly wider than the gap between one entry's own lines. From a tablet up the sticky menu is capped at the room under the shell's bar (`100dvh` less the bar and the offsets) and scrolls inside itself, since a document has more sections than a short window shows; its focus ring is drawn inset, as the scrolling edge would clip one drawn outside. The wrapping itself is PageNav's: a long entry balances its lines.

## Styling

`index.scss` scopes the document's prose: section headings take a step of air above them, lists keep to the reading measure, and a table sits in the `.data-table-frame` primitive so a wide table scrolls inside its frame rather than widening the page. A source list (`.document-page__sources`) hangs each entry's second line under its first, as a bibliography does.

Source numbers in the text are `SourceMarks` and each source-list entry is a `SourceItem` (both exported from `src/components/DocumentPage`). A number is its own link to its entry, written `#N` with `aria-label="Source N"` and styled as an ingredient entry's note numbers are (`faded-underline`, `$accent-hover`); `cite` names the place, so ids are `cite-<cite>-<N>` for a mark and `source-<N>` for an entry. An entry carries one return arrow per place that cites it, labelled "Back to citation 1", "Back to citation 2" when there are several and "Back to the text" when there is one. `sup` takes `line-height: 0` inside the page, so a line holding a number is no taller than its neighbours.

## The text itself

Each document's text lives in its page under `src/app/(public)/`, as JSX. Its working notes, which cite the file or `DESIGN.md` section behind every claim, live in `claude-docs/design-decisions/` beside the task's record: `m15.2-privacy-policy-notes.md` for the privacy policy, `m15.3-disclaimer-notes.md` for the disclaimer, `m15.4-code-of-ethics-notes.md` for the code of ethics. A document that cites a source lists it at its end in Chicago form, as the compendium's references are.
