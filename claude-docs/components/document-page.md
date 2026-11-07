# DocumentPage

`src/components/DocumentPage/` is the page a public document is read on: the privacy policy (`/privacy`), the disclaimer (`/disclaimer`), the code of ethics (`/code-of-ethics`) and the terms (`/terms`), and any document that follows them on the same frame. It is an `<article>` named by the title. It opens with one muted line saying when the text last changed ("Last updated 1 November 2026", a `<time>` carrying the day in `YYYY-MM-DD`), above the title as an ingredient entry's Last Edit line sits above its names. Then come the page head ([`PageHeader`](page-header.md)) with the title and lede, a jump menu ([`PageNav`](page-nav.md), "On This Page") and the document's own sections.

Props are in `types.ts` (`DocumentPageProps`). The facts the types cannot say:

- `title` is the page's one `h1`, in title case.
- `updatedOn` is a `Date` shown in UTC, so no server zone moves it.
- `body` is the document's markdown, rendered on the server: `##` and `###` headings, paragraphs, lists, tables and footnotes. Raw HTML is shown as text. A link that is not a site path, `#`, `?`, `https:` or `mailto:` is dropped to its text, and a link into `/account` carries `rel="nofollow"`.
- `history` is optional earlier versions as `{ number, publishedAt, href }`, listed under "Earlier Versions".

## Contracts

- **It reads nothing itself**: no session, no database, no search params. The page route reads the document through `@/modules/documents` (`readDocument`, `readDocumentVersion`, `listDocumentVersions`) and passes the text in. Those reads are cached under the `documents` tag by `src/lib/documents-cache.ts`, and the route is `force-dynamic` so nothing is read at build time.
- **A signed-out visitor and a member read the same page**, inside whichever frame the public layout chooses for them (`src/app/(public)/layout.tsx`).
- **A document page carries no application data**, so it is not an exception to the rule that the compendium is the one public surface of data (`CLAUDE.md`, "Domain invariants"). No search covers the documents table, so no in-site search can list one, and `tests/e2e/document-pages.spec.ts` proves the compendium search returns nothing for a document's title.
- **A document route is listed in three places beside its page**: `PUBLIC_ROUTES` in `src/proxy.ts`, so the proxy lets a signed-out visitor through; `CRAWLABLE_PATHS` in `src/app/robots.ts`, so a crawler may index it on production; and `src/app/sitemap.ts`. The footer ([`site-footer.md`](site-footer.md)) links every document as a text link before Support.

### The jump menu

- **The menu is read from the rendered markdown**, so a heading is written once and the menu cannot drift from it. Each `h2` and `h3` is given an `id` that is the slug of its text (`src/lib/slugify.ts`). A repeat of a text takes `-2`, `-3` after the first, and the page's own `document-title` and `document-history` ids stay its own. Each heading keeps a scroll margin under the shell's bar.
- **An `h2` followed by one or more `h3`s is a group**: each `h3` becomes an entry carrying the `h2`'s text as its `group` ([`PageNav`](page-nav.md)), so the menu nests the subsections under it. The `h2` has no entry of its own, because a group label is not a link. An `h2` with no `h3` after it is a top-level entry. A heading must hold plain text, and a document with no `h2` or `h3` draws no menu.
- **On a phone the document passes `collapsible`**, so the menu is folded behind its "On This Page" label, closed until opened.

### The layout

The article is `.page-with-nav` ([`page-nav.md`](page-nav.md), "Where it stands"). From a tablet up the menu is a sticky column to the left of the head and the sections. On a wide screen an empty column of the menu's width balances it, so the text column sits at the window's centre. Below that the pair is centred together, and on a phone the menu stands above the sections.

- **The columns differ from `.page-with-nav`'s.** The text column is the reading measure rather than its narrow column, and the menu's column is 18rem (`$document-menu-column`) rather than 12rem, through the same `page-with-nav-grid` mixin, which recomputes the breakpoints from those widths. Text inside stays start-aligned.
- **The rule that sets the columns names both classes** (`.document-page.page-with-nav`), because the primitives are emitted under `body` and a lone class loses to them.
- **The menu starts level with the frame's top**, on the head's row, rather than beside the sections. Placed beside the sections, its box began the head's height lower before it stuck, and that much of it hung below the window, out of reach of its own scrolling.
- **The entries are long**, a clause or two, so in the 12rem column most broke into three lines. The wider column leaves the longest at two. Each entry takes `space(2)` above and below rather than PageNav's `space(1)`, with its lines at 1.3, so the gap between two entries is plainly wider than the gap between one entry's own lines. The wrapping itself is PageNav's: a long entry balances its lines.
- **From a tablet up the sticky menu scrolls inside itself**, because a document has more sections than a short window shows. It is capped at the room under the shell's bar (`100dvh` less the bar, the frame's padding and a step of air). With the paused viewer's notice above the frame, the cap gives up the notice's height (`$pause-notice-height`, sized for three lines of its text, its longest shape at the narrowest tablet width), through `:has()` on the shell's main.
- **The menu's focus ring is drawn inset**, as the scrolling edge would clip one drawn outside. The menu keeps `space(2)` of padding at its end so the scrollbar (thin where `scrollbar-width` is supported) never touches the current entry's bar or the right-aligned text.
- **Where entries are scrolled out of view**, PageNav marks its edge (`data-more-above`, `data-more-below`) and the page colour fades over that edge, opaque at the rim, so no entry shows cut off. Without the script there is no fade.

### The text

- **Each document's text lives in a markdown file under `documents/`**, which `npm run db:seed:documents` writes to the database as a new published version when the text differs. The public routes read the database: `/<key>` shows the current version and `/<key>/versions/<n>` one earlier version.
- **A version page is titled with the document and its number**, such as "Terms of Use, Version 1". Its canonical address, the one a search engine treats as the real page, is the document page while it is the current version, and itself once a newer version is published (`versionDocumentMetadata` in `src/app/(public)/_documents.tsx`).
- **A document that cites a source lists it at its end in Chicago form**, as the compendium's references are. A source is a markdown footnote.
  - Its number in the text is a superscript link written `#N` with `aria-label="Source N"`.
  - The list is headed "Sources". Each entry carries one return arrow per place that cites it, labelled "Back to citation 1", "Back to citation 2" when there are several and "Back to the text" when there is one.
- **The working notes**, which cite the file or `DESIGN.md` section behind every claim, live in `claude-docs/design-decisions/`: `m15.2-privacy-policy-notes.md` for the privacy policy, `m15.3-disclaimer-notes.md` for the disclaimer, `m15.4-code-of-ethics-notes.md` for the code of ethics.

## Styling

`index.scss` scopes the document's prose. Section headings take a step of air above them and lists keep to the reading measure. A table sits in the `.data-table-frame` primitive, so a wide table scrolls inside its frame rather than widening the page. A source list (`.document-page__sources`) hangs each entry's second line under its first, as a bibliography does. A source's number is styled as an ingredient entry's note numbers are (`faded-underline`, `$accent-hover`), and `sup` takes `line-height: 0` inside the page, so a line holding a number is no taller than its neighbours.

## Disclaimer notice

`src/components/DisclaimerNotice/` is the one line under an ingredient's safety notes saying the notes are not complete, with a link to the disclaimer page (`/disclaimer`, read on this component). It takes no props and reads nothing.

- **The line is drawn whether or not there are notes.** An ingredient with no safety note is exactly the case the disclaimer covers, so the line cannot depend on [`SafetyNote`](safety-note.md), which draws nothing when there is nothing to say.
- **Used by** [`IngredientEntry`](ingredient-entry.md), after `SafetyNote` in the Details section and in each form's section, on the compendium page and on a coven's entry page alike. The details modal and the cards, which summarise, do not carry it.
- **It is a `<p role="note">`**, so a screen reader hears it as an aside to the section rather than as part of the notes. Its link is named "Read the Disclaimer".
- **The text is muted and small** (`.disclaimer-notice`), a step of air below the notes.

## Not here

Tests: `tests/components/DisclaimerNotice/index.test.tsx` proves the link and its role. `tests/components/IngredientEntry/index.test.tsx` proves the line is in the Details section and in every form's, with notes and without. `tests/e2e/compendium-entry.spec.ts` and `tests/e2e/cupboard-entry.spec.ts` find it on a built page of each route and pass axe with it there. `tests/e2e/document-pages.spec.ts` covers the document pages.
