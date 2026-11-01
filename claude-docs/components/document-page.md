# DocumentPage

`src/components/DocumentPage/` — the page a public document is read on: the privacy policy (`/privacy`) and the disclaimer (`/disclaimer`), and the documents that follow them on the same frame. It draws the page head through [`PageHeader`](page-header.md) with the eyebrow "Documents", the document's title and its lede, then one muted line saying when the text last changed ("Last updated 1 November 2026", as a `<time>` carrying the day in `YYYY-MM-DD`), then the document's own sections. The whole is an `<article>` named by the title.

It reads nothing: no session, no database, no search params. A signed-out visitor and a member read the same page, inside whichever frame the public layout chooses for them (`src/app/(public)/layout.tsx`). A document page is not an exception to the rule that the compendium is the one public surface of data (`CLAUDE.md`, "Domain invariants"): it carries no application data, so there is nothing to protect. The site's own searches read the database, and a document is not in it, so no in-site search can list one; `tests/e2e/document-pages.spec.ts` proves the compendium search returns nothing for a document's title.

A document route is listed in three places beside its page: `PUBLIC_ROUTES` in `src/proxy.ts`, so the proxy lets a signed-out visitor through; `CRAWLABLE_PATHS` in `src/app/robots.ts`, so a crawler may index it on production; and `src/app/sitemap.ts`. The footer ([`site-footer.md`](site-footer.md)) links every document as a text link before Support.

## Props

`DocumentPageProps` (`types.ts`):

| Prop        | What it is                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------- |
| `title`     | The document's title: the page's one `h1`, title case                                         |
| `lede`      | Optional: a sentence under the title saying what the document is for                          |
| `updatedOn` | The day the text last changed, a `Date`; the page shows it in UTC, so no server zone moves it |
| `children`  | The document's sections: `h2` headings, paragraphs, lists and tables                          |

## Styling

`index.scss` scopes the document's prose: section headings take a step of air above them, lists keep to the reading measure, and a table sits in the `.data-table-frame` primitive so a wide table scrolls inside its frame rather than widening the page. A source list (`.document-page__sources`) hangs each entry's second line under its first, as a bibliography does.

## The text itself

Each document's text lives in its page under `src/app/(public)/`, as JSX. Its working notes, which cite the file or `DESIGN.md` section behind every claim, live in `claude-docs/design-decisions/` beside the task's record: `m15.2-privacy-policy-notes.md` for the privacy policy, `m15.3-disclaimer-notes.md` for the disclaimer. A document that cites a source lists it at its end in Chicago form, as the compendium's references are.
