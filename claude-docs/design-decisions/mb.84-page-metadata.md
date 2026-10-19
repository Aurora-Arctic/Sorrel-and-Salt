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
- **Robots is read per request.** Next runs a metadata route once at build and keeps the answer unless the route opts out, which would freeze `VERCEL_ENV` at build time. `robots.ts` and `sitemap.ts` both export `dynamic = 'force-dynamic'` (the supported option, per the Next.js `robots` and `sitemap` file-convention docs and the caching guide), so the runtime's `VERCEL_ENV` decides, as the proxy's `X-Robots-Tag: noindex` already does (MB.80), and no build setting matters. The sitemap's read underneath is the data cache's, so a crawl costs no query.

## Not done here

Search Console verification and sitemap submission are the owner's action.

## Lighthouse

`lighthouse` (exact version, a dev dependency, with `chrome-launcher`) backs `npm run lighthouse:seo -- <base-url>` (`scripts/lighthouse-seo.mjs`). It runs the SEO category on `/`, `/compendium` and one current entry (or the entries named by repeated `--path /...`, so a caller can sample several) and exits non-zero on any failed audit. It is run by hand and gates nothing, because it only means anything against a `VERCEL_ENV=production` server: off production the noindex header and the disallow-all robots.txt fail the crawlability audits, which is the site working. The devcontainer has no Chrome, so a `lighthouse-chrome` container supplies one (below). What was tried first: the remote Chromium reaches the app (`devcontainer:<port>`), but Lighthouse needs a DevTools port, and asking the Playwright server for one with a `--remote-debugging-port` launch option left it refused from the other container, so the script was checked only as far as its usage, entry discovery and missing-Chrome handling.

The fix is a `lighthouse-chrome` service on the `audit` profile (`make lighthouse-up` and `lighthouse-down` on the host): headless Chromium from the `playwright-audit` image with `--remote-debugging-port` on loopback, and a Node forwarder that publishes it to the compose network as `lighthouse-chrome:9222`. No port is published to the host, because DevTools has no authentication. The devcontainer sets `LIGHTHOUSE_CDP_HOST` and `LIGHTHOUSE_CDP_PORT`, which the script uses by default. It resolves the host name to an IP before connecting, since Chrome refuses a DevTools request whose Host header is a name rather than an IP or `localhost`, and builds the WebSocket address from that header. To run it: `make lighthouse-up` on the host, then in the devcontainer start the app with `VERCEL_ENV=production` on a free port and run `npm run lighthouse:seo -- http://devcontainer:<port>`. This path has not been run end to end: the container could not be started from the session that wrote it. On the three pages the checks Lighthouse's SEO category makes were done by hand with curl (status 200, title, description, viewport, canonical, no noindex, no image without alt text, valid robots.txt).

## Metadata in the head

Next 16 streams a page's metadata into `<body>` for any visitor not on its HTML-limited bot list (`htmlLimitedBots`) when `generateMetadata` is not ready as the shell is sent (Next docs, "Streaming metadata"). On the production build this happened on about one request in forty for an entry page, at random (a first read after the data cache went cold): the same entry had its description in `<head>` on the next request. Lighthouse's `meta-description` audit reads `head meta` only (`core/gather/gatherers/meta-elements.js`), so a streamed tag fails it, and a Lighthouse run on the lemon entry reported no description. `next.config.ts` sets `htmlLimitedBots: /.*/`, the option Next's docs give for turning streaming metadata off, so metadata always blocks and lands in the head. The cost is a little time to first byte on the public pages, which are the ones that need it. `tests/e2e/seo.spec.ts` asserts the description sits before `</head>`. The failed run itself was not reproduced afterwards (nine of nine audits passed on lemon), so the link between that one failure and streaming is the best account, not a capture.

## Sources

- RFC 9309, Robots Exclusion Protocol, sections 2.2.2 and 2.2.3. https://www.rfc-editor.org/rfc/rfc9309
- Google Search Central, "How Google interprets the robots.txt specification". https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
- Google Search Central, "Provide a site name to Google Search". https://developers.google.com/search/docs/appearance/site-names
- schema.org: `DefinedTerm`, `DefinedTermSet`, `BreadcrumbList`, `CollectionPage`, `WebSite`. https://schema.org
