# MB.175 — Help and FAQ articles, and a glossary, as rows a keeper edits

**Status:** decided · **Date:** 2026-11-06

Visitors and members need somewhere to learn how the site is used and what its
words mean. This record says what that is, how it is stored, who writes it and
who reads it. It records the model only: nothing is built here. The approved plan is
[`mb.175-plan.md`](mb.175-plan.md), and the model itself is written into
`DESIGN.md` §5, §7, §9 and §10 ("Help and FAQ articles").

The owner decided on 2026-11-03 to add the glossary, and on 2026-11-06 to add
sub pages (from M17.2) and to move the work from Wave 15 (Launch) to Wave 17
(Fast follow).

## Rows a keeper edits, or Markdown files in the repo

A help page could be a Markdown file in the repository, rendered at build
time, or a row in the database that a keeper edits.

|                           | Files in the repo                        | Rows a keeper edits                                                        |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| Changing a word           | A developer, a PR, a review and a deploy | A keeper saves the page and it is live (after the cache tag is refreshed)  |
| Review                    | A PR gives a reviewer a diff             | The audit columns say who changed a row and when; there is no review step  |
| Who can write             | Anyone with repository access            | A keeper only, through the same checks as the site documents               |
| Fits the existing pattern | No: nothing else the site says is a file | Yes: the site documents (M15.59) and the compendium are keeper-edited rows |
| Cost                      | No table, no admin page                  | A table, services, an admin page and a cache                               |
| First content             | Already in the diff                      | Needs a seed, keyed on `seed_key` (MB.171)                                 |

**Decision: rows.** The point of help text is to answer questions as they arrive. If every
fix to a sentence needs a deploy, wrong or missing answers stay wrong for
days. The site documents already took this route for the same reason
(`m15.59-document-editor-scope.md`), so the admin page, the Markdown renderer
and the cache pattern are known. The cost is the five build tasks, and the
loss of review on a keeper's edit, which the audit columns partly cover. A file
stays the better choice for text that must change only with the code it
describes; none of the help text is that.

## The table

One table, `help_articles`, with a `kind` of `faq`, `article` or `term`. Three
tables would repeat the same columns, the same admin page and the same
public finders. `position` orders the FAQ and is unused by a term. The slug is
unique across all three kinds among live rows, so an article's address and a
term's anchor never clash. Columns are in `DESIGN.md` §5.

## The glossary

A glossary term is a third `kind`, `term`, rather than a separate table: its
`title` is the term and its `body` is a short Markdown definition, so a keeper adds
or edits a term as they would an article. `/help/glossary` lists every term from
A to Z, with an anchor from each slug, so any page can link to one term as
`/help/glossary#steward`. The slug `glossary` is reserved so that no article
can take the glossary page's address. The seed ships at least Compendium,
Ingredients, Grimoire, Coven, Steward, Practitioner, Observer, Keeper, Curator,
Spell, Working, Variant and Form, each defined the way `CLAUDE.md` uses it (its
Vocabulary and domain invariants). The screens' role names are Steward,
Practitioner and Observer, and Keeper for the site role; the glossary uses
those, and says the code's name (`owner`, `member`, `viewer`, `admin`) only
where a definition needs it.

## The parent article

An `article` may have a parent `article` through a nullable `parent_id`,
one level deep, and its page sits under its parent's address:
`/help/closed-practices/<practice>`. M19.8's closed-practice pages need this:
one general page and one per practice.

- **One level, not a tree.** A tree needs breadcrumbs, a depth limit and
  recursive reads, and nothing asks for them. A child has no children.
- **Only an `article` has a parent, and only an `article` is one.** A CHECK
  holds the first half; the rest need a look at a second row, so the service
  enforces them and a test asserts them.
- **Slugs stay unique across all rows**, children included. A child's page
  is then identified by its own slug and its parent's, and `/help/[slug]` for
  a child's slug answers 308 to the nested address, so the child has one
  canonical address.
- **A parent with live children cannot be deleted** until they are moved or
  deleted, and the error says so.

## The module: `help`

The table gets a module of its own, `src/modules/help/`, rather than a place
in `identity`. The articles have no tie to accounts, sessions or
workspaces beyond the `SiteAdmin` proof every keeper write takes, and
`identity` already owns the sign-in tables; adding unrelated public content
there would make it the module everything else imports for the wrong reason.
`documents` is the precedent: a table of keeper-edited public text, in a module
of its own that imports `identity` only. `help` takes the same edge,
`help: ['identity']` in `lint/sorrel-lint.js`.
The steps in `modules.md`, "Adding a module", are done by the table task
(M17.13), except the documentation rows, which this record adds.

## The two invariants it widens

Both are lines in `CLAUDE.md`, amended in the same PR as this record.

1. **Who curates.** "Keepers and curators curate the compendium, …" gains the
   help articles: a keeper alone (admin only, like the site documents)
   writes the help articles and the glossary. A curator cannot, because the
   articles are the site's own voice, as the documents are, and not
   reference data. What it gives up: a curator who spots a wrong answer must
   ask a keeper.
2. **What is public.** "The compendium is the one public surface of data" gains
   `/help` and its sub pages, open and indexable, carrying no workspace data.
   That is no new kind of exposure, since the pages hold only text a keeper
   chose to publish, and the public finders take no session and cannot reach a
   workspace row.

## The move from Wave 15 to Wave 17

MB.175 and its five build tasks were first Wave 15 (Launch) work, "v1 scope"
by the decision of 2026-11-03. On 2026-11-06 the owner moved them to Wave 17
(Fast follow), before M17.6. The help pages therefore ship after launch.
Two things follow. Wave 15's axe sweep (M11.16, M11.8) no longer scans these
pages, and the Wave 17 accessibility audit (M17.9) does. And the links from
`Welcome`, the public frame, `AppShell` and M11.10's 404 page land with the
public pages (M17.16), not before.

## The build

| Task                                                       | What it builds                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| M17.13 — Add the Help Articles Table                       | The table, with nullable `parent_id`; prerequisite MB.175                        |
| M17.14 — Help Article Services and GraphQL                 | The services, the keeper's GraphQL and the cache; after M17.13                   |
| M17.15 — The Keepers' Help Page                            | `/keepers/help`; after M17.14                                                    |
| M17.16 — The Public Help Pages, the Glossary and Sub Pages | `/help`, `/help/glossary`, `/help/[slug]`, `/help/[parent]/[slug]`; after M17.14 |
| M17.17 — Seed the Help Articles and the Glossary           | The `help` seed target and the terms; after M17.13                               |

## What it rules out

- Help text kept in the repository, for the reasons above.
- A tree of articles deeper than one level, or a child with a glossary term
  beneath it.
- A curator writing help text. A keeper-only rule is easy to widen later; a wide one is
  harder to narrow.
- Any help content carrying workspace data. The public pages read only
  `help_articles`.
