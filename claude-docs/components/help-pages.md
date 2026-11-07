# Help pages

The public help centre and its staff counterpart. Components: `HelpSearchForm`, `HelpArticleView`, `HelpIndex`, `HelpGlossary` and `HelpSearchResults`, each in `src/components/<Name>/`. Pages: `src/app/(public)/help/` and `src/app/(shell)/help/staff/`. Data: [`graphql.md`, "Help articles"](../design/graphql.md#help-articles).

## Addresses

`helpPath()` in `src/lib/help-paths.ts` is the one place an address is built.

- A term is `/help/glossary#slug`.
- An FAQ entry is `/help#slug` when public, `/help/staff#slug` otherwise.
- An article is `/help/[parent/]slug` when public, `/help/staff/[parent/]slug` otherwise.

`glossary`, `staff` and `search` are reserved slugs, so no article takes those addresses.

## Public routes

`/help`, `/help/glossary`, `/help/[slug]` and `/help/[slug]/[child]` read the cached public finders (tag `help`) and are in the sitemap. `/help/search` is public, reads the session, is never cached and is `noindex`. The proxy admits `/help`, `/help/glossary`, `/help/search` and one or two segments beneath `/help` except `staff` (`HELP_ARTICLE` in `src/proxy.ts`); robots allows the `/help` prefix.

An article page answers 404 for a row that is not a public article, and for a child requested at the wrong parent. A child asked for at its top-level address gets a 308 to its nested address.

## Staff routes

`/help/staff`, `/help/staff/[slug]` and `/help/staff/[slug]/[child]` call `requireCuratorSession()` before any read, are never cached, and are `noindex`. They answer 404 for a public row, so a public row has one address. The `/curator` and `/keepers` layouts link to `/help/staff`.

## Layout

Every help page is one centred reading column: each component's root carries `.help-page` (`_primitives.scss`), `max-width: $measure` and `margin-inline: auto`, so the heading, the search box, the lists and the text share the text's edges. It stands inside the public layout's `.page-column` and inside the staff layout's `.page-frame`, so the two areas cannot differ. A primitive rather than a component style, because a route loads a component's stylesheet only when it draws the component. An article whose body has three or more `##` sections also carries `.page-with-nav`, which takes the document pages' pair (`$document-menu-column`, `$measure`) and centres on its own.

## Ids

Only the FAQ entries (`HelpIndex`) and the terms (`HelpGlossary`) carry an id, their slug. `renderMarkdown` gives each h2 and h3 an id from its text, so `HelpIndex` and `HelpGlossary` pass every slug, and the ids earlier answers took, as its `reserved` argument; no heading claims an anchor.

## Headings

Every help page but the front page (`/help`, and the staff index, whose h1 is Staff Help) is headed by a level-one "Help" ("Staff Help" on a staff article), then the search box, then the page's own title as a level-two heading: the article's title, "Glossary" or "Search Help". The document `<title>` and metadata keep the page's own title. The Markdown body is drawn with `renderMarkdown(body, placeholders, reserved, true)`, whose last argument moves every heading down a level (h2 becomes h3), so the outline stays h1, h2, h3; the seed text is unchanged. The glossary does the same for its definitions.

- **A sub page links its parent** between the search box and its title ("Back to Your Coven"), and nothing more: the tree is two levels below the index, so one link stands in for a trail. The page reads the parent for its title, by the same finder that answered the sub page, so a parent the reader may not open is a 404.
- **An article with three or more `##` sections draws a contents menu**, `PageNav` labelled "On This Page", collapsible and non-sticky, as the document pages do; fewer sections are in view without one. The entries are read before the headings move down, so each jumps to an `h3`.
- **The index lists the glossary among the guides**, as a described item ("The words Sorrel & Salt uses, and what each one means."), so the Guides section is always drawn. The FAQ is open text with no accordion, and the glossary has no A–Z bar.
- **Search results** open with a count ("7 results for “steward”", an `output`), then each result under a label of its kind (Question, Guide or Term) and, for a row whose audience is not `public`, "Staff"; the staff search is the only one that returns such rows. A query that finds nothing says so and links the guides and the glossary; an empty query draws neither results nor links.

## Glossary marks

A body marks a glossary term as `[[Term]]`, or `[[Term|shown text]]` to show other words. The part before the bar matches a term row's title in any case, or its slug through `slugify`. Nothing is matched without a mark.

- **Where they render.** `renderMarkdown` takes the terms as its last argument and the help views pass them (`HelpArticleView`, `HelpIndex`, `HelpGlossary`), so the site documents, which pass none, are unchanged. The terms come from the cached public glossary read (tag `help`, `readGlossaryTerms` in `src/lib/help-glossary.ts`), once per page, never per mark. Staff pages read the same public terms.
- **What a mark becomes.** A [HelpTerm](help-term.md): a link to `/help/glossary#<slug>` with a tooltip of the term's title and its definition as plain text. A mark naming no row shows its shown text and no link.
- **Where they do not.** A heading, a link and a code span or block hold no mark: in a heading or link the shown text is plain, and in code the mark stays as typed so the syntax can be written down. The body preview in `HelpArticleForm` passes no terms and shows marks as typed.
- **The glossary page** links a mark in a definition to its anchor with no tooltip, since every definition is on the page.
- **Summaries** (search results, index and sub page lists, the page description) show the shown text as plain text.
- **Saving.** `createHelpArticle` and `updateHelpArticle` refuse a body that marks a term no live glossary row holds, as a `ValidationError` on `body` naming each missing term; an update that leaves the body alone is not checked. A term being saved counts as present in its own body. The seed test asserts every mark in the shipped prose names a seeded term.

## Links to help

`Welcome`, the footer nav (`SiteFooter`, after Privacy), the 404 screen, the account menu (`AccountMenu`, a "Help" row before Support), the `/support` page and the Support dialog (each a "Search Help" line before the form) link to `/help`. The top bar (`PublicFrame`, `AppShell`) does not. An empty Ingredients list and an empty Grimoire tab each end with a "Learn More" link to their guide, built by `publicGuidePath(slug)` (`src/lib/help-paths.ts`) from the guide's slug, which is its title's. The keepers and curator layouts link `/help/staff` as "Staff Help" in a `nav`.
