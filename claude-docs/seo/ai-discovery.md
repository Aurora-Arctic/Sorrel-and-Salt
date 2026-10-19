# Files for AI agents and crawlers

The compendium is the one public surface (MB.80). Three small files describe
it to a crawler or an AI agent: `/llms.txt`, and one catalog served at both
`/.well-known/ai-catalog.json` and `/.well-known/ard.json` (M12.2). Each is a
route handler that answers a public file and carries no application data, as
`/robots.txt` and `/sitemap.xml` do, so none is a third access path (CLAUDE.md
rule 1; lint's `sorrel/route-allowlist` names the three paths). The code is `src/app/ai-discovery.ts` (the two builders) and the
handlers beside the paths.

## What they read

All three read `listCompendiumSlugs()` (MB.84): every current compendium
entry, with no session, held in the data cache under the `compendium` tag, so
an admin write refreshes them ([`../db/compendium-cache.md`](../db/compendium-cache.md)).
The read leaves out soft-deleted rows and every workspace's own ingredients in
SQL. Every URL is built on `siteUrl()` in `src/lib/site.ts`, production's
origin, never on the request's host. Off production the proxy sets
`X-Robots-Tag: noindex` on all three (MB.83), and `robots.txt` allows them on
production by listing them in `CRAWLABLE_PATHS`.

## llms.txt

Specification: https://llmstxt.org/, read 2026-10-19. It gives no version. The
file sits at `/llms.txt` and is Markdown, in this order: an H1 with the site
name (the only required part), a blockquote summary, prose with no headings,
then H2 sections of link lists, each item `- [name](url): optional notes`.
An `## Optional` section marks links a reader may skip. The spec states no
media type; the handler answers `text/markdown; charset=utf-8`.

Ours has a Compendium section (the list page, then one link per entry, named
with `pageTitleOf` so two entries sharing a label are told apart by formal
name) and an Optional section holding the sitemap.

## The catalog

Two drafts name two paths, and both are served from one body.

| Spec                                                                  | Version                           | Path                           | Required                                                                      |
| --------------------------------------------------------------------- | --------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| AI Catalog draft, https://ai-catalog.io/spec/                         | `specVersion` "1.0", undated      | `/.well-known/ai-catalog.json` | `specVersion`, `entries`; per entry `identifier`, `type`, one of `url`/`data` |
| Agentic Resource Discovery, https://agenticresourcediscovery.org/spec | v0.91, 26 August 2026, "Proposal" | `/.well-known/ard.json`        | per entry `identifier`, `displayName`, `type`, one of `url`/`data`            |

Both read 2026-10-19. ARD says a consumer MUST fetch `ard.json` and calls
`ai-catalog.json` its predecessor, whose publishers SHOULD move; it also says
the two evolve independently, so a consumer of either finds the file. The
body carries every field either requires, plus `host.displayName` (the AI
Catalog draft's Level 2, "Discoverable"). The one entry is the compendium: an
identifier `urn:air:sorrelandsalt.com:compendium:ingredients`, `type` of
`text/html` and `url` of `/compendium`, because the artefact the entry points
at is the HTML page. `updatedAt` is the latest real change among the entries.

The media type is `application/ai-catalog+json` on both paths: the AI Catalog
draft says a catalog SHOULD be served with it, and ARD names none for
`ard.json` while listing that type for a catalog of entries. Both specs are
drafts that can change; if either moves, this page and `src/app/ai-discovery.ts`
change together.
