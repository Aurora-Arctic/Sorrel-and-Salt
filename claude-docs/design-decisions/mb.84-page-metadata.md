# MB.84 — Robots, sitemap, page metadata and structured data

**Decided:** the public pages tell a search engine what they are (title, description, canonical, JSON-LD), `robots.txt` lets a crawler into the home page and the compendium alone, and off production nothing is offered at all. The task's entry in `claude-docs/tasks/mb.md` carries the acceptance criteria and the owner's amendment of 2026-10-19.

## The pieces

- **`src/app/robots.ts`.** Production allows `/$`, `/compendium` and `/compendium/`, and disallows `/`. Anything else, including `/coven/…`, `/admin` and `/account`, is disallowed by the catch-all. A test (`tests/app/robots.test.ts`) reads the rules with the matching RFC 9309 gives and asserts the allowed and refused paths.
- **`src/app/sitemap.ts`.** The home page, `/compendium`, and one entry per current compendium slug, from the cached sessionless read `listCompendiumSlugs` (`claude-docs/db/compendium-cache.md`). `lastModified` is the entry's `updatedAt`, MB.106's definition of a change. A retired slug is never listed.
- **Page metadata.** `src/lib/page-metadata.ts` builds title, description, absolute canonical, Open Graph and Twitter text tags. There is no image. The root layout's title template appends the site name to every page; the home page uses an absolute title so the name is not doubled.
- **JSON-LD.** `src/lib/json-ld.ts` is the one place a block is serialised, escaping `<` as `<` so the data cannot close its own script tag. An entry carries `DefinedTerm` and `BreadcrumbList`, the list `CollectionPage`, and the signed-out home page `WebSite`. A filtered list and the in-app entry page carry none.

## The choices

- **The rule `/$`.** `Allow: /` would open the whole site, and `Disallow: /` alone would shut the home page. RFC 9309 section 2.2.2 says the longest matching rule wins, and an allow beats a disallow of equal length; section 2.2.3 lets `$` end a pattern. Google's robots.txt specification ("URL matching based on path values") lists `/$` as matching the root alone. So `Allow: /$` opens `/` and nothing under it.
- **Why the home page is crawlable.** Google's site-names documentation asks for `WebSite` markup on a home page it can crawl, with `name` and `url` required and `alternateName` optional. We give `name` and `url` only: nothing sourced supports an alternate name. The page shows no reference or workspace data, so `/compendium` stays the one page with reference content (MB.80, amended).
- **`og:type` is `website` on every public page.** `website` is the plain type for a site's pages and the owner approved it; an entry is a reference page, not a dated article. No `subjectOf` citations in the JSON-LD: the page already lists its references in HTML, and duplicating them in markup is a second thing to keep true.
- **Every list view names `/compendium` as its canonical**, query string dropped, not only a filtered one. A filtered view is also `noindex, follow`, so category combinations are not a crawl trap while links on them are still followed.
- **Canonical addresses are built on `SITE_ORIGIN`** (`src/lib/site.ts`), never on the request host, so staging and hotfix deploys point at production instead of indexing themselves.
- **A retired slug answers 308**, permanent because a temporary status tells a crawler the old address is still canonical. Next sends `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`, which a browser cannot keep; the test pins `no-store`, no positive `max-age`, no `Expires` and no `Last-Modified`. An unknown slug is a 404.
- **Robots is built at deploy time.** `robots.ts` is prerendered at build, so `VERCEL_ENV` must be set when the build runs for production to get its rules; a build without it disallows everything. The sitemap is `force-dynamic` so a new entry shows without a deploy. Off production the proxy also adds `X-Robots-Tag: noindex` (MB.80).

## Not done here

Search Console verification and sitemap submission are the owner's action. No Lighthouse dependency was added: it is not installed, and adding it is a new dependency for the owner to decide. The Lighthouse SEO audits were checked by hand on the three pages (status 200, title, description, viewport, canonical, no `noindex`, no image without alt, valid `robots.txt`); see the task's report for the options.

## Sources

- RFC 9309, Robots Exclusion Protocol, sections 2.2.2 and 2.2.3. https://www.rfc-editor.org/rfc/rfc9309
- Google Search Central, "How Google interprets the robots.txt specification". https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
- Google Search Central, "Provide a site name to Google Search". https://developers.google.com/search/docs/appearance/site-names
- schema.org: `DefinedTerm`, `DefinedTermSet`, `BreadcrumbList`, `CollectionPage`, `WebSite`. https://schema.org
