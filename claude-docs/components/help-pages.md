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

## Ids

Only the FAQ entries (`HelpIndex`) and the terms (`HelpGlossary`) carry an id, their slug. `renderMarkdown` gives each h2 and h3 an id from its text, so `HelpIndex` and `HelpGlossary` pass every slug, and the ids earlier answers took, as its `reserved` argument; no heading claims an anchor.

## Links to help

`Welcome`, the footer nav (`SiteFooter`, after Privacy), the 404 screen, the `/support` page and the Support dialog (each a "Search Help" line before the form) link to `/help`. The top bar (`PublicFrame`, `AppShell`) does not. The keepers and curator layouts link `/help/staff` as "Staff Help" in a `nav`.
