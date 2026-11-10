# DocumentPage

`src/components/DocumentPage/` is the page a public document is read on: the privacy policy (`/privacy`), the disclaimer (`/disclaimer`), the About Us page (`/about`), the code of ethics (`/code-of-ethics`) and the terms (`/terms`), and any document that follows them on the same frame. It is an `<article>` named by the title. It opens with one muted line saying when the text last changed, then the page head ([`PageHeader`](page-header.md)), a jump menu ([`PageNav`](page-nav.md)) and the document's own sections.

Facts the types (`DocumentPageProps`) cannot say:

- `updatedOn` is a `Date` shown in UTC, so no server zone moves it.
- `body` is the document's markdown, rendered on the server: `##` and `###` headings, paragraphs, lists, tables and footnotes. Raw HTML is shown as text. A link that is not a site path, `#`, `?`, `https:` or `mailto:` is dropped to its text, and a link into `/account` carries `rel="nofollow"`.

## Contracts

- **It reads nothing itself**: no session, no database, no search params. The page route reads the document through `@/modules/documents` (`readDocument`, `readDocumentVersion`, `listDocumentVersions`) and passes the text in. Those reads are cached under the `documents` tag by `src/lib/documents-cache.ts`, and the route is `force-dynamic` so nothing is read at build time.
- **A keeper sees Edit beside the heading**, named for the document ("Edit Privacy Policy"), as `EditLink` in the `PageHeader` `action` slot, linking `/keepers/documents/<key>`. The current page of each document (not a numbered version page) reads `helpViewerOffers()` per request, as the help pages do, and passes `editHref` only when `edit` is true, a verified keeper; a curator, a member and a signed-out reader get none. The document text stays the same for every reader and stays cached under `documents`; only this one read depends on the viewer. The editor checks the keeper itself.
- **A signed-out visitor and a member read the same page**, inside whichever frame the public layout chooses for them (`src/app/(public)/layout.tsx`).
- **A document page carries no application data**, so it is not an exception to the rule that the compendium is the one public surface of data (`CLAUDE.md`, "Domain invariants"). No search covers the documents table, so no in-site search can list one, and `tests/e2e/document-pages.spec.ts` proves the compendium search returns nothing for a document's title.
- **A document route is listed in three places beside its page**: `PUBLIC_ROUTES` in `src/lib/public-routes.ts`, so the proxy lets a signed-out visitor through; `CRAWLABLE_PATHS` in `src/app/robots.ts`, so a crawler may index it on production; and `src/app/sitemap.ts`. The footer ([`site-footer.md`](site-footer.md)) links every document as a text link before Support.

### The jump menu

- **The menu is read from the rendered markdown**, so a heading is written once and the menu cannot drift from it. Each `h2` and `h3` is given an `id` that is the slug of its text (`src/lib/slugify.ts`). A repeat of a text takes `-2`, `-3` after the first, and the page's own `document-title` and `document-history` ids stay its own. Each heading keeps a scroll margin under the shell's bar.
- **An `h2` followed by one or more `h3`s is a group**: each `h3` becomes an entry carrying the `h2`'s text as its `group` ([`PageNav`](page-nav.md)), so the menu nests the subsections under it. The `h2` has no entry of its own, because a group label is not a link. An `h2` with no `h3` after it is a top-level entry. A heading must hold plain text, and a document with no `h2` or `h3` draws no menu.
- **On a phone the document passes `collapsible`**, so the menu is folded behind its "On This Page" label, closed until opened.

### The layout

The article is `.page-with-nav` ([`page-nav.md`](page-nav.md), "Where it stands"). From a tablet up the menu is a sticky column to the left of the head and the sections. On a wide screen an empty column of the menu's width balances it, so the text column sits at the window's centre. Below that the pair is centred together, and on a phone the menu stands above the sections.

- **The columns differ from `.page-with-nav`'s:** the reading measure, and a menu column of 18rem (`$document-menu-column`), through the same `page-with-nav-grid` mixin, which recomputes the breakpoints.
- **The rule that sets the columns names both classes** (`.document-page.page-with-nav`), because the primitives are emitted under `body` and a lone class loses to them.
- **The menu starts level with the frame's top**, on the head's row, because beside the sections its box began the head's height lower and that much hung below the window, out of reach of its own scrolling.
- **The entries are long**, so each takes more air than PageNav's default, and the wider column keeps the longest to two lines.
- **The skeleton's pending entries take the entries' spacing** (`padding-block` and `line-height`, one rule for `a` and `.page-nav__pending`), so the skeleton's menu is as tall and its bars sit where the labels will, and nothing shifts when the text replaces it. From a tablet up its bars end at the column's right edge, as the labels do, in widths that cycle (`PageNav`'s stylesheet), since the entries are not yet known.
- **From a tablet up the sticky menu scrolls inside itself**, because a document has more sections than a short window shows. It is capped at the room under the shell's bar (`100dvh` less the bar, the frame's padding and a step of air). With the paused viewer's notice above the frame, the cap gives up the notice's height (`$pause-notice-height`, sized for three lines of its text, its longest shape at the narrowest tablet width), through `:has()` on the shell's main.
- **The menu's focus ring is drawn inset**, as the scrolling edge would clip one drawn outside. The menu keeps padding at its end so the scrollbar never touches the current entry's bar.
- **Where entries are scrolled out of view**, PageNav marks its edge (`data-more-above`, `data-more-below`) and the page colour fades over that edge, opaque at the rim, so no entry shows cut off. Without the script there is no fade.

### The text

- **Each document's text lives in a markdown file under `documents/`**, which `npm run db:seed:documents` writes to the database as a new published version when the text differs. The public routes read the database: `/<key>` shows the current version and `/<key>/versions/<n>` one earlier version. The About Us page is the exception: it has no version pages (`UNVERSIONED_DOCUMENT_KEYS` in `src/lib/unversioned-documents.ts`), so it passes `DocumentPage` neither `number` nor `history`, and also no `updatedOn`, so the head has no "Last updated" line and no earlier-versions list. `updatedOn` is optional; the line is drawn only when it is given.
- **A version page is titled with the document and its number**, such as "Terms of Use, Version 1". Its canonical address, the one a search engine treats as the real page, is the document page while it is the current version, and itself once a newer version is published (`versionDocumentMetadata` in `src/app/(public)/_documents.tsx`).
- **A document that cites a source lists it at its end in Chicago form**, as the compendium's references are. A source is a markdown footnote.
  - Its number in the text is a superscript link written `#N` with `aria-label="Source N"`.
  - The list is headed "Sources". Each entry carries one return arrow per place that cites it, labelled "Back to citation 1", "Back to citation 2" when there are several and "Back to the text" when there is one.
- **The working notes**, which cite the file or `DESIGN.md` section behind every claim, live in `claude-docs/design-decisions/`: `design-decisions/support.md`, "The privacy policy's working notes" for the privacy policy, `design-decisions/support.md`, "The disclaimer's working notes" for the disclaimer, `design-decisions/support.md`, "The code of ethics' working notes" for the code of ethics.

## Styling

A paragraph that opens with `>` in a document's markdown is a plain `<blockquote>`, which every document draws as a pull-quote (`.document-page__body blockquote`): the `quote` type size, a hanging opening mark and a short rule in the accent. No seeded document uses one today. The mark is CSS, so the file holds only the words.

`variant` is an optional prop only the About Us page passes (`'about'`). It adds a modifier class that sets that page's own typography: a larger lede (the About page passes none today), and a hairline over each section heading. Every other document passes none and draws as before. The About page also hands the component two placeholders, `{aboutPillars}` and `{aboutRoles}` ([`about-pillars.md`](about-pillars.md), [`about-roles.md`](about-roles.md)).

A table sits in the `.data-table-frame` primitive, so a wide table scrolls inside its frame rather than widening the page. `sup` takes `line-height: 0` inside the page, so a line holding a source number is no taller than its neighbours.

## Disclaimer notice

`src/components/DisclaimerNotice/` is the one line under an ingredient's safety notes saying the notes are not complete, with a link to the disclaimer page (`/disclaimer`, read on this component). It takes no props and reads nothing.

- **The line is drawn whether or not there are notes.** An ingredient with no safety note is exactly the case the disclaimer covers, so the line cannot depend on [`SafetyNote`](safety-note.md), which draws nothing when there is nothing to say.
- **Used by** [`IngredientEntry`](ingredient-entry.md), after `SafetyNote` in the Details section and in each form's section, on the compendium page and on a coven's entry page alike. The details modal and the cards, which summarise, do not carry it.
- **It is a `<p role="note">`**, so a screen reader hears it as an aside to the section rather than as part of the notes.

## Not here

Tests: `tests/components/DisclaimerNotice/index.test.tsx`, `tests/components/IngredientEntry/index.test.tsx`, `tests/e2e/compendium-entry.spec.ts`, `tests/e2e/cupboard-entry.spec.ts` and `tests/e2e/document-pages.spec.ts`.
