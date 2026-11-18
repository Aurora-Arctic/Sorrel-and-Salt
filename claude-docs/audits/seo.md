# Search Engine Audit

## Purpose

This is the audit of every public page for search engines, for task M17.6. It lists what stops search engines finding, reading, indexing and showing the public pages well. It also checks that the Vitest coverage gates are set up as designed, the work M11.11 held. It changes no code. Each finding is proposed as a follow-up task, and a task is minted only after the owner approves it.

The audit has 13 findings. No finding is High, so none stops a search engine reaching or reading a page. Seven are Medium and six are Low. No coverage gate was found misconfigured.

### What The Owner Needs To Do

Nothing. All 13 findings are decided: 11 are minted as MC.33 to MC.43 in `claude-docs/tasks/v1/mc.md`, and 2 are skipped (SEO-10 and SEO-12). The audit asked nothing of Search Console, Bing Webmaster Tools or Vercel, and changed none of them.

- Both AI Bots rules are set to Log.

## Scope

- **Routes:** every public route: `/`, `/compendium` and its entry pages, `/about`, `/terms`, `/privacy`, `/disclaimer`, `/code-of-ethics` and their version pages, the help pages (`/help`, its articles, `/help/search`), `/sign-in`, `/support`, `/llms.txt`, and the two AI catalogue addresses `/.well-known/ai-catalog.json` and `/.well-known/ard.json`.
- **Topics:** `robots.txt`, the sitemap, canonical tags (the tag that names the address a page wants indexed), noindex headers and tags (an instruction to keep a page out of search results), titles and descriptions, share images (the picture a link shows when it is pasted into a chat or a post), structured data (JSON-LD, the machine-readable page description search engines read), internal links, the firewall's effect on crawlers, and what Google Search Console and Bing Webmaster Tools report.
- **Decisions from the owner (2026-11-18):** the audit covers every public route, including `/about`, `/terms` and `/help/*`; `/sign-in` stays out of the search index; the audit also covers `/llms.txt` and the AI catalogue; coverage gates are read from the config, the workflow and the latest CI result, with no local full run; the audit ends with a commit and no pull request.
- **Code base:** `staging` at `f10263de0`. Production runs `main` at `7aa9ed84c`, the merge of release 0.15.1. Each finding says whether it also holds on `main`. For the search-engine files the two branches differ in four places: the sign-in page's folder (`src/app/sign-in/` on `main`, `src/app/(public)/sign-in/` on `staging`), `src/app/(public)/help/search/page.tsx` (a pager on `staging`), `src/components/PublicFrame/sign-in-link.tsx` (on `staging` the header link is hidden on `/sign-in`) and the wording of four documents. `robots.ts`, `sitemap.ts`, `proxy.ts`, `page-metadata.ts`, `json-ld.ts` and the AI catalogue files are identical.

## Method

Three sources, each dated.

1. **Console.** Google Search Console and Bing Webmaster Tools, read by the owner's session on 2026-11-17. The data is in "Console Data".
2. **Live.** The owner's own Chrome session on 2026-11-18 fetched 19 production pages signed out (`credentials: 'omit'`), ran Google's URL Inspection on two pages, and read the Vercel firewall settings. This audit did not request the live site. The data is in "Live Data".
3. **Code.** Read in the worktree on `staging` on 2026-11-18. Questions about how code connects were put to the graphify code graph. The graph is built from the `/app` checkout, which holds `main`'s layout, so a graph fact marked _graph_ was then read against the `staging` file.

Each finding says how sure it is, by the kind of evidence:

- **Console:** a console report shows it.
- **Live:** a served response or a page fetched from production shows it.
- **Code:** a line of the source shows it.
- **Inference:** a conclusion drawn from the above. It names what would settle it.

A user consequence is written only where the code or a served response shows it. Where a cause was not found, the finding says "not observed" or "no known cause".

Severity scale, the same as `claude-docs/audits/design-ux.md` and `claude-docs/audits/accessibility.md`:

- **High:** a person cannot find the site, or a search engine cannot read it.
- **Medium:** a page loses something search engines or people use, or a setting differs from a recorded decision.
- **Low:** a small gap, or a missing guard.

Findings rank by severity, then in the order they were found.

## Console Data

Gathered on 2026-11-17 from Google Search Console and Bing Webmaster Tools. It is recorded as read; the causes are in "Findings".

### Google Search Console

Property `sc-domain:sorrelandsalt.com`. Indexing data last updated 2026-11-12.

| Measure                                         | Value                                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| Indexed pages                                   | 589                                                                                 |
| Not indexed pages                               | 23 (7 reasons)                                                                      |
| Sitemap `https://sorrelandsalt.com/sitemap.xml` | Success, submitted 2026-11-03, last read 2026-11-16, 582 pages discovered           |
| Search performance, last 3 months               | 6 clicks, 2.4K impressions, 0.3% CTR, average position 51.5                         |
| Crawl stats                                     | 3.53K requests, 523 ms average response, 99% 200, under 1% each of 301, 302 and 404 |
| Crawl by file type                              | CSS 41%, HTML 26%, JavaScript 19%, other 14%                                        |
| Crawl by host                                   | sorrelandsalt.com 3,523; www.sorrelandsalt.com 10                                   |
| Breadcrumbs enhancement                         | 0 valid, 0 invalid. No other enhancement type is listed.                            |
| HTTPS report                                    | 4 HTTPS, 0 non-HTTPS                                                                |
| Google's recommendation                         | `/compendium/ingredients/alum-potassium-alum` is down 100% in impressions           |

Not indexed, by reason:

| Reason                                   | Pages | Validation                          | Addresses (last crawl)                                                                                                                                                                                                                   |
| ---------------------------------------- | ----- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page with redirect                       | 2     | Failed (started 10/25, failed 11/6) | `http://www.sorrelandsalt.com/` (2026-11-12); `http://sorrelandsalt.com/` (2026-11-08)                                                                                                                                                   |
| Crawled - currently not indexed          | 3     | Failed                              | `/help/your-coven/invite-someone` (2026-11-14); `/help/account-and-security/passwords-and-lockout` (2026-11-14); `/about` (2026-11-12)                                                                                                   |
| Excluded by 'noindex' tag                | 4     | Not Started                         | `/sign-in?next=/help/your-coven/delete-a-coven` and three `/compendium?entry=<uuid>` addresses (all 2026-11-13)                                                                                                                          |
| Not found (404)                          | 1     | Not Started                         | `/compendium/ingredients/agarwood-aquilaria-malaccensis` (2026-11-02)                                                                                                                                                                    |
| Blocked by robots.txt                    | 1     | Not Started                         | `/&` (2026-10-24)                                                                                                                                                                                                                        |
| Discovered - currently not indexed       | 9     | Not Started (never crawled)         | Seven entries (`chalcedony-quartz-var-chalcedony`, `copper-copper`, `corn-poppy-papaver-rhoeas`, `mayapple-podophyllum-peltatum`, `psilocybe-mushrooms-psilocybe`, `snowdrop-galanthus-nivalis`, `topaz-topaz`), `/sign-in` and `/terms` |
| Alternate page with proper canonical tag | 3     | Started                             | Three `/compendium?entry=<uuid>` addresses (all 2026-10-23)                                                                                                                                                                              |

Top queries, last 3 months, all with 0 clicks:

| Query          | Impressions |
| -------------- | ----------- |
| cucumber       | 38          |
| santalum album | 29          |
| what is endive | 21          |
| saltpeter      | 17          |
| bitter kola    | 17          |
| tonka bean     | 16          |
| cymophane      | 15          |
| betel leaf     | 14          |
| what is rye    | 13          |
| endive         | 12          |

### Bing Webmaster Tools

Site `https://sorrelandsalt.com/`.

| Measure                                              | Value                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Known URLs (Site Explorer, last 6 months)            | 58                                                                        |
| Indexed                                              | 34                                                                        |
| Excluded                                             | 24 (Bing shows no reason for these)                                       |
| Errors and warnings                                  | 0 and 0                                                                   |
| Sitemap `https://sorrelandsalt.com/sitemap.xml`      | Success, submitted 2026-10-21, last crawl 2026-11-08, 529 URLs discovered |
| Search performance, 22 Oct to 15 Nov                 | 0 clicks, 2 impressions                                                   |
| `/` (https)                                          | Indexed, HTTP 200, last crawled 2026-10-07, 28.6KB                        |
| `/` (http)                                           | HTTP 308, last crawled 2026-10-05                                         |
| IndexNow (a protocol that tells Bing a page changed) | Not set up                                                                |

Bing's top recommendations:

1. Set up IndexNow.
2. Not enough inbound links from high quality domains.
3. Meta description too short. Moderate severity. 1 page: `https://sorrelandsalt.com/`. Bing suggests 150-160 characters.
4. Page title too short. Moderate severity. 1 page: `https://sorrelandsalt.com/`. Bing suggests 50-60 characters.

Site scans, as listed on 2026-11-17:

| Scan | Source | Age | Pages | Errors | Warnings |
| --------------------- | ------------- | ------- | ----- | ------ | -------- | ------ |
| Sorrel and Salve V1.4 | sitemap.xml | 14 days | 529 | 0 | 0 |
| Sorrel and Salt V1.3 | website crawl | 14 days | 174 | 2 | 0 |
| Sorrel and Salt V1.1 | website crawl | 27 days | 103 | 0 | 0 |
| Sorrel And Salt V1 | website crawl | 27 days | 103 | 1 | 0 |

The V1.3 errors are both "Blocked by robots.txt": `https://sorrelandsalt.com/account/terms` (page depth 2) and `https://sorrelandsalt.com/?support=` (page depth 1). The V1 error was not opened. The V1.3 scan ran on about 2026-11-03, the day MB.289 fixed crawl faults. No new scan was started.

### Ruled Out

The handoff ruled these out, and the audit did not re-check them.

- Google manual actions: none.
- Google security issues: none.
- Google robots.txt fetch: succeeds on all four host variants (http, https, with and without www), 414 bytes, no issues.
- Google "Page with redirect" (2 URLs): `http://sorrelandsalt.com/` and `http://www.sorrelandsalt.com/` redirecting to https. Expected. The "Validation failed" status on this row needs no action.
- Google Core Web Vitals: no data, because traffic is too low. Not a fault.
- Bing Site Explorer filters for 404-410, server errors, robots.txt disallowed, NOINDEX, canonical source, guidelines issues, and other issues: all empty.

## Live Data

Read by the owner's Chrome session on 2026-11-18, signed out, against production (`main`). The session saw no HTTP 429 and no security checkpoint, and the `x-vercel-mitigated` header was null on every response.

### Sitemap And robots.txt

- **Sitemap:** 581 addresses: 522 entries, 52 help pages and 7 others. 522 carry a last-modified date. No duplicates, none with a query, none for a `/versions/` page, none for agarwood, none on the wrong host.
- **robots.txt:** the body matches `src/app/robots.ts:8-43`. It allows `/$`, `/compendium`, `/compendium/`, `/sign-in`, `/support`, `/privacy`, `/disclaimer`, `/about`, `/terms`, `/code-of-ethics`, `/help`, `/llms.txt`, `/robots.txt`, `/.well-known/ai-catalog.json`, `/.well-known/ard.json`, `/sitemap.xml`, `/_next/` and `/opengraph-image`, then `Disallow: /`, then the sitemap line.
- **Assets:** CSS and JavaScript files are served `public,max-age=31536000,immutable`. `/opengraph-image` is a 53,452-byte PNG.

### Pages

| Path                                               | Status | Title chars | Description chars | Share image | Words | JSON-LD                         | Stylesheets |
| -------------------------------------------------- | ------ | ----------- | ----------------- | ----------- | ----- | ------------------------------- | ----------- |
| `/`                                                | 200    | 15          | 44                | yes         | 271   | `WebSite`                       | 15          |
| `/compendium`                                      | 200    | 28          | 128               | yes         | 1,563 | `CollectionPage`                | 76          |
| `/compendium/ingredients/achiote-bixa-orellana`    | 200    | 41          | 157               | yes         | 1,258 | `DefinedTerm`, `BreadcrumbList` | 74          |
| `/compendium/ingredients/alum-potassium-alum`      | 200    | 39          | 154               | yes         | 1,538 | `DefinedTerm`, `BreadcrumbList` | 74          |
| `/about`                                           | 200    | 26          | 100               | no          | 1,760 | none                            | 65          |
| `/terms`                                           | 200    | 30          | 103               | no          | 4,403 | none                            | 64          |
| `/terms/versions/1`                                | 200    | 41          | 55                | no          | 4,350 | none                            | 64          |
| `/help`                                            | 200    | 22          | 69                | no          | 3,341 | none                            | 64          |
| `/help/your-coven/invite-someone`                  | 200    | 32          | 35                | no          | 580   | none                            | 68          |
| `/help/account-and-security/passwords-and-lockout` | 200    | 39          | 49                | no          | 470   | none                            | 68          |
| `/sign-in`                                         | 200    | 25          | 25                | no          | 183   | none                            | 21          |
| `/support`                                         | 200    | 25          | 44 (the default)  | yes         | 331   | none                            | 63          |
| `/help/search`                                     | 200    | 29          | 44 (the default)  | yes         | 252   | none                            | 63          |

Other readings from the same run:

- **Canonical tags.** `/` names `https://sorrelandsalt.com`. `/terms/versions/1` and `/sign-in` name themselves. `/support` and `/help/search` carry none.
- **Robots tags.** `/sign-in` carries `noindex, follow`. `/support` carries `noindex, follow`. `/help/search` carries `noindex`. `/terms/versions/1` carries none.
- **Headings.** The main heading (`<h1>`) is "Sorrel & Salt" on `/`, and "Help" on `/help`, on both help articles and on `/help/search`.
- **Copies.** `/?support=` and `/support?support=` carry the header `x-robots-tag: noindex, follow`. `/compendium?entry=<uuid>` is 200 with `x-robots-tag: noindex, follow`, a canonical tag naming the entry's own page, and 25 entry links.
- **Missing addresses.** `/compendium/ingredients/agarwood-aquilaria-malaccensis` is 404 with a noindex tag. `/&` is 404 with a noindex tag. `/account/terms` redirects to `/sign-in?next=%2Faccount%2Fterms`.
- **Links.** `/compendium` holds 24 entry links. Document body links to `?support=question` (on `/about`) and `?support=account` and `?support=privacy` (on `/terms` and `/terms/versions/1`) carry no `rel`. The footer's `?support=` links and the `/account/terms` link carry `rel="nofollow"`. A header link to `/sign-in?next=<this page>` with no `rel` appears on `/compendium`, entries, `/about`, `/terms`, `/terms/versions/1`, `/help`, both articles, `/support`, `/help/search` and `/compendium?entry=`. On `/` the sign-in link is in the page body, not the header, with no `rel`. On `/sign-in` there is no sign-in link.

### Google URL Inspection

- **Alum entry** (`/compendium/ingredients/alum-potassium-alum`): on Google, last crawl 2026-10-24. Live test 2026-11-18 at 1:58 PM: HTTP 200, "Breadcrumbs: 1 valid item detected", one JSON-LD block, and one warning that a preloaded stylesheet (`2jofocsmr1qby.css`) was not used.
- **`/about`:** on Google, last crawl 2026-11-12. Its Sitemaps row shows "Temporary processing error". Referring pages are `/help/ingredients/annotate-an-entry-or-make-it-ours` and `/help/the-compendium/read-an-entry-and-its-sources?support=`. Live test 2026-11-18 at 2:00 PM: "URL has no enhancements", no JSON-LD, and the same stylesheet warning.

### Vercel Firewall

Over 7 days: Allowed 70.0k, Denied 5.3k, Challenged 1.7k, Logged 1.3k, Rate Limited none.

- DDoS Mitigation: 6.5k requests, 0 crawler matches.
- Bot Protection: about 1.0k requests (994 challenged), 0 crawler matches. Its action is Challenge and it excludes verified bots.
- A custom rule, "Deny SEO Scrapers": 222 requests (SemrushBot 209, AhrefsBot 13).
- Each user-agent list stops at 50 entries.
- Attack Challenge Mode is off.
- Both AI Bots rules are set to Log.

## Summary

| Id | Title | Severity | Also on `main` | Task estimate | Task |
| ------ | ---------------------------------------------------------------------- | -------- | -------------------------------------------- | ------------- |
| SEO-1 | Most Public Pages Have No Share Image | Medium | Yes | 2h | MC.33 |
| SEO-2 | Every Help Page's Main Heading Is "Help" | Medium | Yes | 3h | MC.34 |
| SEO-3 | Pages Load 64 To 76 Separate Stylesheet Files | Medium | Yes (live); not measured on `staging` | 6h | MC.35 |
| SEO-4 | Crawlable Links Into Addresses That Are Never Indexed | Medium | Yes, with a difference | 3h | MC.36 |
| SEO-5 | Older Document Versions Are Indexable Copies | Medium | Yes | 2h | MC.37 |
| SEO-6 | Bing Has Indexed 34 Of 58 Known Addresses And Is Not Told Of New Pages | Medium | Yes | 6h | MC.38 |
| SEO-7 | The Firewall's AI Bots Rules Differ From The Recorded Decision | Medium | Setting is live; record is on `staging` only | 1.5h | MC.39 |
| SEO-8 | The Home Page's Title And Description Are Short | Low | Yes | 1.5h | MC.40 |
| SEO-9 | A Retired Entry Answers A Plain 404 | Low | Yes | 4h | MC.43 |
| SEO-10 | `/compendium?entry=<id>` Sends Two Signals | Low | Yes | 2h | Skipped |
| SEO-11 | No Rule Makes A Public Page Carry A Description Or Canonical Tag | Low | Yes | 2h | MC.41 |
| SEO-12 | Help Articles And Documents Carry No Structured Data | Low | Yes | 3h | Skipped |
| SEO-13 | `llms.txt` And The AI Catalogue Name The Compendium Only | Low | Yes | 2h | MC.42 |

## Findings

### SEO-1 Most Public Pages Have No Share Image

- **Severity:** Medium
- **Where:** `src/lib/page-metadata.ts:30-35` (`social()` returns an `openGraph` object with a title, description, address, site name and type, and no image) and `:41-55` (`publicPageMetadata` uses it). `tests/e2e/seo.spec.ts:109-135`.
- **Found:** live and code. On production, `og:image` is absent on `/about`, `/terms`, `/terms/versions/1`, `/help`, both help articles and `/sign-in`. It is present on `/`, `/compendium` and entries, whose segments name their own share cards, and on `/support` and `/help/search`. The helper sets `openGraph` with no image, and Next replaces a parent's `openGraph` whole when a page sets its own (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md:1346-1348`), so the site image from `src/app/opengraph-image.tsx` is dropped on every page that uses the helper. The cause is an inference from those two facts; no page was rendered locally to confirm it. The browser test for share cards destructures only `[home, list, entry]` from `publicPages(request)`, so it covers three pages.
- **Also on `main`:** yes. `page-metadata.ts` and `tests/e2e/seo.spec.ts` are identical, and the live data is production's.
- **Why It Matters:** a link to a document or a help page, pasted into a chat or a post, shows no picture. The served pages show this.
- **Recommended Fix:** make the helper carry the site's share image on every page it builds, or add the image to the `openGraph` object it returns. Extend the share-card test to every public page that does not name its own card.
- **Follow-up Task:** MC.33 Carry The Share Image On Every Public Page

### SEO-2 Every Help Page's Main Heading Is "Help"

- **Severity:** Medium
- **Where:** `src/components/HelpFront/head.tsx:15` (`<PageHeader title="Help" …>`), mounted for every help page by `src/app/(public)/help/layout.tsx`; the article's own title is an `<h2>` in `src/components/HelpChrome/index.tsx:15`.
- **Found:** live and code. The `<h1>` is `Help` on `/help/your-coven/invite-someone`, `/help/account-and-security/passwords-and-lockout` and `/help/search`; the article's own title is in `<title>` and the `<h2>`. The two articles are 580 and 470 words, with descriptions of 35 and 49 characters, and both are among Google's "Crawled - currently not indexed" pages. That the heading causes the exclusion is not shown: Google gives no reason for that status, so the link between the two facts is an inference.
- **Also on `main`:** yes. The help components are identical on both branches, bar the skeleton file.
- **Why It Matters:** a page's main heading is the first thing a reader or a search engine uses to say what the page is. Every article states the same one.
- **Recommended Fix:** make the article's title the `<h1>` on article pages, and make "Help" a smaller label above it. Keep "Help" as the `<h1>` on `/help` itself.
- **Follow-up Task:** MC.34 Make The Article Title The Main Heading On Help Pages

### SEO-3 Pages Load 64 To 76 Separate Stylesheet Files

- **Severity:** Medium
- **Where:** every public page. Counts: 15 on `/`, 76 on `/compendium`, 74 on an entry, 65 on `/about`, 64 on a document, 68 on a help article, 21 on `/sign-in`.
- **Found:** live. Each file is served `cache-control: public,max-age=31536000,immutable`, so caching is right; the count is the cost. CSS is 41% of Googlebot's 3.53K requests. Google's live test also logs one stylesheet preloaded and not used on both pages it inspected. Why the build emits so many files was not investigated; this finding does not name a cause.
- **Also on `main`:** live data is `main`'s. `staging` changed `src/scss/` and component styles; its stylesheet counts were not measured.
- **Why It Matters:** a crawler asks for every file, and the crawl budget Google gives a site is spent on them. The served pages and Google's crawl stats show the requests; no ranking effect is shown.
- **Recommended Fix:** find why the build splits the styles into so many files and combine them, so a page loads a handful. Re-measure with the same counts.
- **Follow-up Task:** MC.35 Cut The Number Of Stylesheet Files A Page Loads

### SEO-4 Crawlable Links Into Addresses That Are Never Indexed

- **Severity:** Medium
- **Where:** `src/components/PublicFrame/sign-in-link.tsx:14-30` (the header's Sign In, built with `signInPath`; _graph_: `SignInLink` is one of 11 callers of `signInPath`), `src/components/DocumentPage/markdown.tsx:333` (the one place a document link gets `rel="nofollow"`, for `/account/…` addresses), and `documents/about.md:54`, `documents/terms.md:28` and `:96`, `documents/privacy.md:13` and `:103`, `documents/disclaimer.md:59`, `documents/code-of-ethics.md:39` and `:57` (links to `?support=…`).
- **Found:** live and code. The header link `/sign-in?next=<this page>` carries no `rel` on the pages fetched, except `/` and `/sign-in`, where it is not in the header. It is not on every public page: on `/` the sign-in link is in the page body, and on `/sign-in` there is none. In document bodies, `?support=question` on `/about` and `?support=account` and `?support=privacy` on `/terms` and `/terms/versions/1` carry no `rel`, while the footer's support link has `rel="nofollow"`. Google lists `/help/the-compendium/read-an-entry-and-its-sources?support=` as a referring page for `/about`, so it does crawl such addresses. Each such address answers with a noindex header or tag: `/?support=` and `/support?support=` carry `x-robots-tag: noindex, follow`, and Google lists `/sign-in?next=/help/your-coven/delete-a-coven` as "Excluded by 'noindex' tag". The other `?support=` links in the documents listed under Where were read from source and were not fetched live.
- **Also on `main`:** yes, with one difference. On `staging` the header link is hidden on `/sign-in` (`sign-in-link.tsx:22`); on `main` the sign-in page is in `src/app/sign-in/` and production shows no link there.
- **Why It Matters:** a crawler follows each link and fetches an address that holds nothing to index. The served responses show the fetches; the audit found no evidence of harm beyond that.
- **Recommended Fix:** add `rel="nofollow"` to the header's Sign In link and to document-body links that open the support dialog. A body link is written in Markdown, so the fix goes in `markdown.tsx` beside the existing `/account/…` rule, keyed on a `?support=` link.
- **Follow-up Task:** MC.36 Stop Crawlers Following Sign-In And Support Links

### SEO-5 Older Document Versions Are Indexable Copies

- **Severity:** Medium
- **Where:** `src/app/(public)/_documents.tsx:65-87` (`versionDocumentMetadata`; the canonical choice is at `:80`).
- **Found:** live and code. `/terms/versions/1` is 4,350 words against `/terms`' 4,403, names itself as canonical and has no robots tag. The code comment (`_documents.tsx:65-69`) says the document is the canonical only while the version is current, and that once a newer one is published the version names itself. Version pages are not in the sitemap. Whether any version page is linked from a page a crawler reaches was not checked; `_documents.tsx:51-57` builds links to them for a document's history list.
- **Also on `main`:** yes. `_documents.tsx` is identical.
- **Why It Matters:** a superseded version is a near copy of the current text. The page is open to indexing and answers 200, so it can be listed in place of the current document. No search result showing it was observed.
- **Recommended Fix:** mark a version that is not the current one noindex, with `follow`, as the helper does for other copies, and keep naming itself as canonical.
- **Follow-up Task:** MC.37 Keep Superseded Document Versions Out Of Search

### SEO-6 Bing Has Indexed 34 Of 58 Known Addresses And Is Not Told Of New Pages

- **Severity:** Medium
- **Where:** Bing Webmaster Tools; no IndexNow code or key file in `src/`, `scripts/` or `public/` on either branch (grep for "indexnow" finds none).
- **Found:** console and code. Bing knows 58 addresses and has indexed 34. The sitemap it read has 529. It last crawled `/` on 2026-10-07, and shows IndexNow as not set up. The firewall is not the cause: see "Left As It Is". The cause of the gap between 58 known and 529 in the sitemap was not established. That IndexNow would close it is the console's recommendation, not a measurement.
- **Also on `main`:** yes.
- **Why It Matters:** Bing finds a page only when it crawls, and the console shows it crawled the home page 6 weeks before the audit. Google does not use IndexNow, so only Bing is affected.
- **Recommended Fix:** serve an IndexNow key file and send a ping to Bing when a compendium entry or help article is published or changed.
- **Follow-up Task:** MC.38 Tell Bing About New And Changed Pages With IndexNow

### SEO-7 The Firewall's AI Bots Rules Differ From The Recorded Decision

- **Severity:** Medium
- **Where:** the Vercel firewall (live, 2026-11-18); `claude-docs/design-decisions/ci.md:1063` and `:1076` (setting V5), on `staging` only.
- **Found:** live and code. The recorded setting is "AI Assistants: Allow. AI Crawlers: Deny", because the site publishes `llms.txt` and the AI catalogue for assistants. Vercel shows both AI Bots rules set to Log. Bot Protection, action Challenge, excludes only verified bots. An earlier plain request from outside the owner's browser was challenged with HTTP 429 and a "Vercel Security Checkpoint"; that request is recorded in the audit plan, not in the Chrome results, whose run saw no 429. **Not observed:** whether any AI assistant is challenged when it fetches `/llms.txt`. The audit states the two settings and the one 429, and no more.
- **Also on `main`:** the setting is in the Vercel dashboard, so it is the same for both. The record of the decision (`ci.md`) is on `staging` and has no matching text on `main`.
- **Why It Matters:** the record and the setting disagree, so the next person reading either is wrong about what the site does.
- **Recommended Fix:** either change the Vercel setting to AI Assistants Allow and AI Crawlers Deny, or correct the record to say Log. The owner chose to correct the record to say Log.
- **Follow-up Task:** MC.39 Correct The Record Of The AI Bots Setting

### SEO-8 The Home Page's Title And Description Are Short

- **Severity:** Low
- **Where:** `src/app/page.tsx:14-18` (`DESCRIPTION` and the `publicPageMetadata` call), `src/components/Welcome/index.tsx:12-17` (the visible intro).
- **Found:** live and code. The title is `Sorrel and Salt`, 15 characters. The description is `A compendium, ingredient store and grimoire.`, 44 characters. Bing flags both: it suggests 50-60 characters for a title and 150-160 for a description. The description differs from the visible intro, which says "A shared grimoire for a coven or a household: a compendium of ingredients, the stock you keep, and the spells you make from it."
- **Also on `main`:** yes. `src/app/page.tsx` is identical.
- **Why It Matters:** Bing's console reports both as moderate. No effect on clicks is shown: Bing shows 2 impressions.
- **Recommended Fix:** write a title of about 50-60 characters and a description of about 150-160 that say what the site is, from the visible intro.
- **Follow-up Task:** MC.40 Lengthen The Home Page's Title And Description

### SEO-9 A Retired Entry Answers A Plain 404

- **Severity:** Low
- **Where:** `src/db/migrations/0090_retire-endangered-entries.sql`; `src/modules/ingredients/schema/retired-ingredient-slugs.ts:9-13` (a renamed entry's old slug redirects for 180 days).
- **Found:** live and code. `/compendium/ingredients/agarwood-aquilaria-malaccensis` answers 404 with a noindex tag, and Google lists it as "Not found (404)", last crawled 2026-11-02. The migration retires four entries (seed keys `aquilaria malaccensis`, `pterocarpus santalinus`, `nardostachys jatamansi` and `liquidambar orientalis`), as the curator Delete retires an entry, by setting `deleted_at`; its comment says so. The row is kept, so code can tell a retired entry from an address that never existed. It writes no row to the slug-history table, so no redirect applies. A search of `src/app/(public)/compendium` finds no code that answers 410 (gone). The retirement is deliberate; the finding is only that search engines are told "missing", not "removed".
- **Also on `main`:** yes.
- **Why It Matters:** a search engine retries a 404 for longer than a 410 before it drops the address. This is general crawler behaviour, not something a served response here shows; Google's console shows the address once, with validation not started.
- **Recommended Fix:** answer 410 for a retired entry's address. Keep 404 for an address that never existed.
- **Follow-up Task:** MC.43 Answer 410 For A Retired Compendium Entry

### SEO-10 `/compendium?entry=<id>` Sends Two Signals

- **Severity:** Low
- **Where:** `src/app/(public)/compendium/page.tsx:89-100` (`canonicalPath` names the entry's own page when `?entry=` is set), `src/app/(public)/compendium/page.tsx:226-231` (the entry links), `src/proxy.ts:109-123` (`NOINDEX_PARAMS` and the header).
- **Found:** live and code. The address answers 200 with `x-robots-tag: noindex, follow` and a canonical tag naming the entry's page. `/compendium` holds 24 entry links. The first carries `rel="nofollow"`; the live data did not record the `rel` of the other 23. Google's "Alternate page with proper canonical tag" rows (2026-10-23) and "Excluded by 'noindex' tag" rows (2026-11-13) are the before and after of MB.289. The handoff's guess that these are old addresses is wrong: the page still builds them.
- **Also on `main`:** yes. Both files are identical.
- **Why It Matters:** a page says "index the other address" and "do not index this one" at once. The audit found no evidence that either signal fails today.
- **Recommended Fix:** keep one signal. The two choices were the noindex header alone, or the canonical tag alone.
- **Owner's Decision:** skipped. Both signals stay.
- **Follow-up Task:** None. Skipped by the owner: both signals stay.

### SEO-11 No Rule Makes A Public Page Carry A Description Or Canonical Tag

- **Severity:** Low
- **Where:** `tests/guards/page-metadata.test.ts` (the first rules at lines 1-30; `MAY_ADD_A_TAG` at `:12-16`).
- **Found:** live and code. The guard stops a page writing its own metadata and requires nothing. `/support` and `/help/search` fall back to the site's default description and carry no canonical tag. Both are noindex, so nothing is lost today.
- **Also on `main`:** yes. The guard is identical.
- **Why It Matters:** a new public page can ship with no description and no canonical tag, and no test fails.
- **Recommended Fix:** add a guard that every indexable public page passes a description and a canonical path to the helper, with `/support` and `/help/search` named as noindex.
- **Follow-up Task:** MC.41 Fail A Public Page That Has No Description Or Canonical Tag

### SEO-12 Help Articles And Documents Carry No Structured Data

- **Severity:** Low
- **Where:** `/about`, `/terms`, `/help` and both help articles.
- **Found:** live. The JSON-LD list is empty on each of them. Google's URL Inspection of `/about` reports "URL has no enhancements". Entries carry `DefinedTerm` and `BreadcrumbList`; `/` carries `WebSite`. That an `Article` description would change how Google shows these pages is not shown by any data here.
- **Also on `main`:** yes. `json-ld.ts` is identical.
- **Why It Matters:** none shown. This is a gap in what the pages say about themselves, not a fault a served response reveals.
- **Recommended Fix:** add a breadcrumb description to help articles, as entries have, and an `Article` description to documents.
- **Owner's Decision:** skipped. Google's documentation shows breadcrumb markup changes only the address line of a desktop result, and breadcrumbs left mobile results on 23 January 2025 [S8][S9]. It describes Article markup as for news, blog, and sports article pages, and lists no help or FAQ type [S10].
- **Follow-up Task:** None. Skipped by the owner (see "Proposed Tasks").

### SEO-13 `llms.txt` And The AI Catalogue Name The Compendium Only

- **Severity:** Low
- **Where:** `src/app/ai-discovery.ts:18-40` (`buildLlmsTxt`) and `:68-90` (`buildAiCatalog`); `src/app/catalog-link.tsx:10` placed by `src/app/layout.tsx:36`; `claude-docs/seo/ai-discovery.md`, "What they read" and the paragraph that says `rel="ard"` is not emitted.
- **Found:** code. `buildLlmsTxt` lists `/compendium`, one link per entry and the sitemap. The AI catalogue has one entry, the compendium. `/about`, the documents and the 52 help pages, all in the sitemap, are in neither. The doc states this as the design. Pages name the catalogue with `rel="ai-catalog"` only; the newer draft's `rel="ard"` is not emitted, which the doc records as "not yet". Nothing here was fetched live.
- **Also on `main`:** yes. `ai-discovery.ts`, `catalog-link.tsx`, `layout.tsx` and `claude-docs/seo` are identical.
- **Why It Matters:** an assistant reading `llms.txt` is not shown the site's own documents or help. The files do what the doc says, so this is a scope choice and not a fault.
- **Recommended Fix:** add a "Help And Documents" section to `llms.txt`, and decide whether the catalogue should list the help as a second entry. Re-read the two draft specifications first, as the doc records them as read on 2026-10-19.
- **Follow-up Task:** MC.42 Add The Documents And Help To `llms.txt`

## Coverage Gates

The second paragraph of the M17.6 entry asks that the 80% coverage thresholds hold across the six Vitest projects and that acceptance coverage reports separately from line coverage. No gate was found misconfigured.

- **Six projects:** `unit`, `dom`, `db`, `db-mocking`, `workflow` and `rsc` (`vitest.config.mts:204-287`). Thresholds are 80 for lines, branches, functions and statements (`:197-202`). Coverage counts `src/**/*.{ts,tsx}` less stories, migrations, seed and `src/gql` (`:185-197`).
- **One CI part each:** every project runs in exactly one part: `dom`; `unit` and `rsc`; `db`, `db-mocking` and `workflow` (`.github/workflows/vitest.yml:75-161`). The parts switch the thresholds off (`.github/actions/vitest-part/action.yml:40`); the `vitest` job merges the parts and applies them (`vitest.yml:168-218`). `npm run test:coverage` runs all six with thresholds on (`package.json:25`).
- **Latest run:** the PR gate run of 2026-11-18 19:46 UTC, on branch `feature/m17.38-m17.42-review-setup`, where all four Vitest jobs passed. `vitest.yml` is called from `pr-gate.yml`, which skips it when a pull request touches no code.
- **Acceptance coverage:** it reports separately. `npm run test:stories` prints a count of stories, never a percentage of lines (`claude-docs/testing/acceptance.md:1-21`).

No local full run was made, by the owner's decision.

## Proposed Tasks

The owner approved eleven of the 13 tasks below, and skipped two. The eleven are minted as MC.33 to MC.43 in `claude-docs/tasks/v1/mc.md`, in the milestone "Z. Cleanup", one PR each. Their hours total 33. SEO-10 and SEO-12 are skipped, so each has a heading and no id. Each estimate is scaled to the finished tasks MB.289 (6.5h), MB.84 (7h), MB.82 (4h), MB.80 (2h) and M12.2 (1.5h), and is an estimate. Every task also ends with "The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.", except MC.39, which is document-only and ends with "`npm run format:check` and `npm run lint` pass."

### MC.33 Carry The Share Image On Every Public Page · 2h

_Story:_ As a person sharing a link to a document or a help page, I want the link to show the site's picture, so that it looks like the site and not a bare address.

From SEO-1.

_Acceptance criteria:_

- `/about`, `/terms`, `/privacy`, `/disclaimer`, `/code-of-ethics`, `/help` and a help article each serve an `og:image` tag naming the site's share image.
- `/`, `/compendium` and an entry still serve their own images.
- The share-card browser test checks every public page, not three.
- The test fails with the image removed from the helper.

Estimate based on: MB.80 (2h). The figure is an estimate; the change is one helper and one test.

### MC.34 Make The Article Title The Main Heading On Help Pages · 3h

_Story:_ As a reader or a search engine, I want a help article's main heading to be its title, so that each article says what it is about.

From SEO-2.

_Acceptance criteria:_

- A help article's only `<h1>` is the article's title.
- `/help` and `/help/search` keep "Help" as their `<h1>`.
- The word "Help" still shows above an article's title.
- Each help page has exactly one `<h1>`.
- The skeleton shown while an article loads has the same headings.

Estimate based on: MB.82 (4h). The figure is an estimate; the change is one shared head component, its skeleton and a heading test.

### MC.35 Cut The Number Of Stylesheet Files A Page Loads · 6h

_Story:_ As a site keeper, I want a page to load a handful of stylesheet files, so that crawlers spend their requests on pages and not on styles.

From SEO-3.

_Acceptance criteria:_

- The cause of the 64 to 76 files is written down in the task's PR.
- A production build serves at most 10 stylesheet files on `/compendium`, an entry, a document and a help article.
- Each file is still served `public,max-age=31536000,immutable`.
- The pages look the same in light and dark.
- Google's URL Inspection live test of an entry shows no stylesheet preload warning.

Estimate based on: MB.84 (7h). The figure is an estimate; the cause is not known, and the figure of 10 is a proposal the owner can change.

### MC.36 Stop Crawlers Following Sign-In And Support Links · 3h

_Story:_ As a site keeper, I want crawlers to skip links that open sign-in or support, so that they spend their requests on pages with content.

From SEO-4.

_Acceptance criteria:_

- The header's Sign In link carries `rel="nofollow"` on every page that shows it.
- Each `?support=` link in a document body carries `rel="nofollow"`.
- A link to a real page in a document body carries no `rel`.
- Signed-out and signed-in visitors can still use all of these links.

Estimate based on: MB.289 (6.5h). The figure is an estimate; it is a part of what MB.289 did.

### MC.37 Keep Superseded Document Versions Out Of Search · 2h

_Story:_ As a site keeper, I want only the current version of a document to appear in search results, so that nobody finds an old copy of the terms.

From SEO-5.

_Acceptance criteria:_

- A version page that is not the current version carries a noindex tag with `follow`.
- A version page that is the current version still names the document's own address as its canonical.
- Version pages stay out of the sitemap.
- A test covers a current and a superseded version.

Estimate based on: MB.80 (2h). The figure is an estimate; the change is one metadata function and a test.

### MC.38 Tell Bing About New And Changed Pages With IndexNow · 6h

_Story:_ As a site keeper, I want Bing told when a page is published or changed, so that people on Bing can find new entries and help.

From SEO-6.

_Acceptance criteria:_

- The site serves an IndexNow key file at the address the protocol requires.
- Publishing, changing or retiring a compendium entry sends one ping naming its address.
- Publishing or changing a help article sends one ping naming its address.
- A failed ping does not fail the save, and is logged.
- No ping is sent from a database that is not production.
- Bing Webmaster Tools shows IndexNow as set up.

Estimate based on: MB.84 (7h) and MB.82 (4h). The figure is an estimate; it adds a route, a key and a call from the keeper mutations.

### MC.39 Correct The Record Of The AI Bots Setting · 1.5h

_Story:_ As a site keeper, I want the design record to say what the Vercel AI Bots rules are set to, so that the next person to read it is not misled.

From SEO-7. The owner chose to correct the record to say Log, and not to change the Vercel setting. The task is document-only.

_Acceptance criteria:_

- `claude-docs/design-decisions/ci.md`, item 4 of the owner's decisions and setting V5 in the Vercel table, say both AI Bots rules are set to Log, and say why.
- `claude-docs/seo/ai-discovery.md` is checked for any sentence that depends on the old setting, and each such sentence is corrected or none is found.
- `npm run format:check` and `npm run lint` pass.

Estimate based on: M12.2 (1.5h). The figure is an estimate; it is a short edit to two documents.

### MC.43 Answer 410 For A Retired Compendium Entry · 4h

_Story:_ As a site keeper, I want a retired entry's address to say it was removed, so that search engines stop asking for it.

From SEO-9. The owner approved it.

_Acceptance criteria:_

- A deleted compendium entry's address answers 410 with a noindex tag. This covers the four entries migration 0090 retired and any entry a curator deletes later.
- A hidden entry still answers 404 to the public.
- An address that never existed still answers 404.
- A renamed entry's old address still redirects for 180 days.
- The finder that sees a deleted row is named as an exception in `.claude/rules/database.md`, Rule 4.
- A test covers all four cases.

Estimate based on: MB.82 (4h). The figure is an estimate. The deleted row is kept, so no new table is needed; a finder that sees a deleted row is an exception to the soft-delete rule (CLAUDE.md, rule 4) and must be named.

### Give An Entry Quick Look Address One Search Signal · 2h (skipped)

_Story:_ As a site keeper, I want `/compendium?entry=<id>` to send search engines one instruction, so that they do not read two that disagree.

From SEO-10. Skipped by the owner: both signals stay.

_Acceptance criteria:_

- The owner has picked the signal that stays: the noindex header or the canonical tag.
- `/compendium?entry=<id>` serves only that signal.
- The entry's own page is unchanged.
- A test checks the address's header and tag.

Estimate based on: MB.80 (2h). The figure is an estimate; the change is one function and a test.

### MC.41 Fail A Public Page That Has No Description Or Canonical Tag · 2h

_Story:_ As a developer, I want a test to fail when a public page ships with no description or canonical tag, so that no page loses them unnoticed.

From SEO-11.

_Acceptance criteria:_

- A guard fails an indexable public page that passes no description to the helper.
- The guard fails an indexable public page that passes no canonical path.
- `/support` and `/help/search` are named in the guard as noindex pages.
- The guard fails once with a page's description removed, and passes with it back.

Estimate based on: MB.80 (2h). The figure is an estimate; the guard extends one existing file.

### Describe Help Articles And Documents To Search Engines · 3h (skipped)

_Story:_ As a person searching, I want a help article or a document to describe itself to search engines, so that a result can show more than a title.

From SEO-12. Skipped by the owner. Google's documentation shows breadcrumb markup changes only the address line of a desktop result [S8][S9]. It describes Article markup as for news, blog, and sports article pages, and lists no help or FAQ type [S10].

_Acceptance criteria:_

- Each help article serves one JSON-LD block with a breadcrumb.
- Each document serves one JSON-LD block describing it as an article.
- The block holds no text that is not on the page.
- Google's URL Inspection live test of `/about` lists the enhancement without errors.

Estimate based on: MB.84 (7h). The figure is an estimate, scaled down because `src/lib/json-ld.ts` already builds the entry blocks.

### MC.42 Add The Documents And Help To `llms.txt` · 2h

_Story:_ As an AI assistant reading `llms.txt`, I want to find the site's documents and help, so that I can answer questions about how the site works.

From SEO-13.

_Acceptance criteria:_

- `llms.txt` lists `/about`, each document and each help article, in its own section.
- Every address in it is on the site's own origin, and none is a retired or hidden page.
- The owner has said whether the AI catalogue gains a second entry for help.
- `claude-docs/seo/ai-discovery.md`, "What they read", is corrected to match.
- The tests for the layout and for hidden entries still pass.

Estimate based on: MB.80 (2h). The figure is an estimate; the builder, the doc and two tests change.

## Left As It Is

These were checked and need no fix.

- **`/llms.txt` and the AI catalogue are built and guarded as their doc says.** Three route files (`src/app/llms.txt/route.ts`, `src/app/.well-known/ai-catalog.json/route.ts`, `src/app/.well-known/ard.json/route.ts`) are identical on `main` and `staging`. _Graph:_ all three call `listCompendiumSlugs()` (`src/modules/ingredients/services/compendium-slugs.ts:14`), as does `sitemap()` (`src/app/sitemap.ts:15`). It leaves out deleted, hidden and coven rows in SQL, and every address is built on the site's own origin. The media types are `text/markdown; charset=utf-8` and `application/ai-catalog+json`. Tests cover the layout, escaping, required fields and that hidden entries stay out (`tests/app/ai-discovery.test.ts`, `tests/app/well-known-routes.test.ts`, `tests/modules/ingredients/services/ai-discovery-files.test.ts`, `tests/modules/ingredients/services/compendium-hidden.test.ts:98`). `robots.txt` allows all three addresses. The three files were not fetched live, so what production serves there is known from code and tests only.
- **Structured data on entries works.** An entry serves one valid JSON-LD block (`DefinedTerm` plus `BreadcrumbList`). Google's URL Inspection of the alum entry shows "Breadcrumbs: 1 valid item detected" on both the indexed result and the live test. The console's site-wide Breadcrumbs report showed 0 valid and 0 invalid on 2026-11-17. The two disagree. **No known cause;** both are recorded.
- **`/about` is indexed.** URL Inspection says "URL is on Google", last crawl 2026-11-12. The console listed it as "Crawled - currently not indexed" from data last updated 2026-11-12. The only link to it is the footer's (`src/components/SiteFooter/index.tsx:31`), which every public page carries; Google names two help pages as its referring pages.
- **The sitemap is consistent.** 581 addresses (522 entries, 52 help pages, 7 others), no duplicates, none with a query, none for agarwood, all on the right host. Google read 582 on 2026-11-16 and Bing 529 on 2026-11-08; the differences are between dates.
- **The firewall checkpoint does not reach search engines.** Bot Protection is on with action Challenge, "excluding verified bots", and its challenges began within the last day; Attack Challenge Mode is off. In 7 days of challenged and denied requests, no listed user agent contains bingbot, Googlebot or DuckDuckBot; each list stops at 50 agents. A rule named "Deny SEO Scrapers" denies SemrushBot and AhrefsBot.
- **`/account/terms`.** The Terms of Use link to it (`documents/terms.md:88`). The link has `rel="nofollow"` (MB.289, `src/components/DocumentPage/markdown.tsx:333`), and the address redirects to sign-in. Bing's scan ran the day MB.289 merged.
- **`/&`.** Live: 404 with a noindex tag. No link to it on any of the 19 pages fetched, and no address builder in the code can produce it. Google crawled it once, on 2026-10-24. **Not observed:** where the address came from. No source was found.
- **`/sign-in`.** Live: `noindex, follow`, canonical `/sign-in`, and not in the sitemap. This matches the owner's decision that it stays out of the index.
- **`robots.txt`.** The live body matches `src/app/robots.ts:8-43`.
- **Nine addresses queued, and weak ranking** (the handoff's findings 10 and 11): recorded in "Console Data". They are not code faults.
- **Public pages are served `cache-control: private, no-store`.** Recorded with Google's 523 ms average response. MB.300 already covers what a crawler request costs.

## Not Covered

- **The three AI files were not fetched live.** `/llms.txt`, `/.well-known/ai-catalog.json` and `/.well-known/ard.json` were not in the Chrome run. What production serves is known from code and tests.
- **Whether an AI assistant is challenged** by Bot Protection when it fetches those files was not observed (SEO-7).
- **No Lighthouse run.** `npm run lighthouse:seo` needs a production-mode server on a port. M17.11, the full Lighthouse audit, can cite this doc.
- **The two draft specifications were not re-read.** `claude-docs/seo/ai-discovery.md` records them as read on 2026-10-19.
- **No local coverage run.** The coverage gates were read from the config, the workflow and the latest CI result (owner's decision).
- **The Amazonbot rule in `/app`.** A rule shutting out Amazonbot sits uncommitted in `/app`'s `src/app/robots.ts`, another session's work. It is in no commit, the live `robots.txt` has no such rule, and it is not part of this audit. It can be audited once committed.
- **The Breadcrumbs mismatch.** The console's 0 against URL Inspection's "1 valid item" has no known cause (see "Left As It Is").
- **The source of `/&`** was not found.
- **Fixing any finding.** Each is its own task after approval.
- **Nothing was changed** in Search Console, Bing Webmaster Tools or Vercel, and no request was made to the live site from this container.

## Sources

- [S1] Koster, M., et al. "Robots Exclusion Protocol (RFC 9309)." _RFC Editor_. https://www.rfc-editor.org/rfc/rfc9309
- [S2] llms.txt. "The /llms.txt file." _llmstxt.org_. https://llmstxt.org/
- [S3] AI catalogue draft specification. _ai-catalog.io_. https://ai-catalog.io/spec/
- [S4] Agentic Resource Discovery specification, v0.91. _agenticresourcediscovery.org_. https://agenticresourcediscovery.org/spec
- [S5] Next.js. "generateMetadata." _Next.js documentation, as shipped in the repository_. `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`
- [S6] Google Search Console and Bing Webmaster Tools, read by the owner's session, 2026-11-17 and 2026-11-18.
- [S7] The owner's Chrome session against production and the Vercel firewall settings, 2026-11-18.
- [S8] Google. "Breadcrumb structured data." _Google Search Central_. https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- [S9] Google. "Simplifying the search results page." _Google Search Central Blog_, January 2025. https://developers.google.com/search/blog/2025/01/simplifying-breadcrumbs
- [S10] Google. "Article structured data." _Google Search Central_. https://developers.google.com/search/docs/appearance/structured-data/article
