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

Only the FAQ entries (`HelpIndex`) and the terms (`HelpGlossary`) carry an id, their slug, besides the front page's two sections (`guides` and `faq`, which `HelpIndex` reserves too). `renderMarkdown` gives each h2 and h3 an id from its text, so `HelpIndex` and `HelpGlossary` pass every slug, and the ids earlier answers took, as its `reserved` argument; no heading claims an anchor.

## Headings

Every help page but the front page (`/help`, and the staff index, whose h1 is Staff Help) is headed by a level-one "Help" ("Staff Help" on a staff article), then the search box, then the page's own title as a level-two heading: the article's title, "Glossary" or "Search Help". The document `<title>` and metadata keep the page's own title. The Markdown body is drawn with `renderMarkdown(body, placeholders, reserved, true)`, whose last argument moves every heading down a level (h2 becomes h3), so the outline stays h1, h2, h3; the seed text is unchanged. The glossary does the same for its definitions.

- **A sub page links its parent** between the search box and its title ("Back to Your Coven"), drawn as the entry page's muted chevron back link (`.back-link` and `BackChevron` from `IngredientEntry/back-chevron`, without its history behaviour), spaced as the entry page spaces its own: 37px from the search box to the chevron, and about 45px from the chevron to the title (43px, the nearest the spacing scale gives); the chevron hangs 4px from its text, outside the column. Nothing more: the tree is two levels below the index, so one link stands in for a trail. The page reads the parent for its title, by the same finder that answered the sub page, so a parent the reader may not open is a 404.
- **An article with three or more `##` sections draws a contents menu**, `PageNav` labelled "On This Page", collapsible and non-sticky, as the document pages do; fewer sections are in view without one. The entries are read before the headings move down, so each jumps to an `h3`.
- **The pages beneath an article** are a numbered list (`ol`) in a hairline frame, the `nav` labelled "In This Guide" with the same words as a visible eyebrow hidden from assistive technology, each number in the heading face and each summary muted.
- **The index lists the glossary among the guides**, as a described item ("The words Sorrel & Salt uses, and what each one means."), so the Guides section is always drawn. The FAQ is open text with no accordion, and the glossary has no A–Z bar.
- **Search results** open with a count ("7 results for “steward”", an `output`), then each result as a quiet card (`.card--quiet`, as the front page's guides are): the title, in the body ink, whose link covers the card (`card-link`), with a chip of its kind at the top of the row's end (Question, Guide or Term, the `muted` badge palette) and, for a row whose audience is not `public`, a "Staff" chip (the `local` palette), and the summary beneath, muted and small, at the card's full width. The staff search is the only one that returns Staff rows. Each searched word is wrapped in a `<mark>` wherever the title or summary holds it, in any case, and drawn by weight with no fill. A query that finds nothing draws the site's No Matches state, as the coven's Ingredients list does: a `role="status"` region named "No Matches" holding a muted sentence, then quiet buttons to the guides and the glossary. An empty query draws neither results nor links.

## The front page

`HelpIndex` draws, beneath the h1, a band (`.help-index__band`, on the page itself, with no surface or edge) holding a lede, the search box at its `hero` size and the quick links; then the guides and the FAQ.

- **The jump menu** is the site's [`PageNav`](page-nav.md), named "On This Page", with two entries: Guides (`#guides`) and Frequently Asked Questions (`#faq`). The page takes `.page-with-nav`, as an article with a menu does: the menu stands in a column beside the band and the sections from 40rem, and above the guides, open with no fold, on a phone. Both ids are reserved before the answers are rendered, so no answer heading takes one; a question slug would clash only if a question were titled "Guides" or "FAQ". The menu is drawn only when there are questions, so the staff index, which has none, has no menu; its skeleton is drawn without one. The public index's skeleton draws the two labels as text (`HelpIndexSkeleton menu`).

- **The hero search box** (`HelpSearchForm size="hero"`) is `$hero-control-height` tall at the lead size, with a magnifier drawn inside the box and a "Search Help" placeholder; the button drops beneath the box below 20rem. Every other help page draws the standard box.
- **Quick links** are a list named "Quick Links", each link a pill on the guide cards' surface and hover pair (`$surface-card`, a hairline edge, `$edge-highlight` and `$fill-highlight-field` on hover), read on each request by `quickLinks(HELP_QUICK_LINKS, readHelpArticle)` (`src/lib/help-quick-links.ts`). `HELP_QUICK_LINKS` names articles by their shipped titles, which the skeleton draws while the page is on its way; each is read at its `slugify` slug, the title and the address shown come from the finder, and a slug that no longer answers as a public article drops out. `tests/lib/help-quick-links.test.ts` fails when a named title is not a public article's title in the shipped seed. The staff index passes none.
- **Each guide is a card** (`.card--quiet`) with a left bar of `$rule-heavy` that turns accent on hover and focus, a kind eyebrow ("Guide", or "Reference" for the glossary), the title as an h3 whose link covers the card (`card-link`), and the muted summary. One column on a phone, two from 40rem.
- **The FAQ** rules each entry with a hairline above it and sets the question at the h4 size; a "Back to Top" link to `#main` (the skip target both frames draw) follows the last entry, drawn as the parent link is (`.back-link`) with its chevron pointing up, its chevron 38px below the last answer, as the parent link's stands 37px below the search box. The question an address names (`/help#slug`) is marked as a glossary term is (`target-highlight`), its tint reaching `space(5)` below the answer, as far as the padding stands above the question, so it stops short of the next rule and of Back to Top.

## The glossary page

One row per term, ruled above, and the last below too: the term beside its definition from 40rem (11rem and the rest), stacked on a phone. The term is in the heading face at the h4 size, and holds a link to its own anchor, named "Link to <Term>" and drawn as a small, light "#" by CSS so the term's text stays its title; it shows on hovering the row or focusing the link.

The row an address names (`/help/glossary#steward`) is marked by CSS `:target` alone, through the `target-highlight` mixin (`_mixins.scss`), which the FAQ shares: a `::before` behind the row, reaching `space(3)` past each side so the rules stay their width, holds an accent edge of `$rule-heavy` on its start, so the mark is not colour alone, and the `$fill-highlight-field` tint. The tint arrives stronger and settles over three times `$motion-long` (`target-arrive`, in the primitives), and stays still under reduced motion. The row's `scroll-margin-top` keeps it clear of the shell bar. `:target` is set by loading the address or by a plain anchor on the page; a client navigation (a `PendingLink` from another help page) moves the address with `history.pushState`, which does not set it, so a row reached that way is not marked.

## Callouts

A help body marks a callout as a blockquote whose first words are a bold label: `> **Note:** …`, `> **Tip:** …` or `> **Take Care:** …`. `renderMarkdown` draws it as a `.notice` (plain, `.notice--tip` or `.notice--warn`) with `role="note"`, named by its label, the label shown above the text as `.eyebrow.notice__label` and hidden from assistive technology. Every paragraph of the blockquote stays inside. Any other blockquote, and every blockquote in a site document or the `HelpArticleForm` preview (which pass no terms), stays a blockquote. `tests/components/DocumentPage/help-callouts.test.tsx` holds the cases.

## Look

A section heading in an article body (an h3) has a short hairline beneath it (`short-hairline`). A screenshot or a widget in the text sits in a `.figure` frame with its caption beneath (`_primitives.scss`).

## Glossary marks

A body marks a glossary term as `[[Term]]`, or `[[Term|shown text]]` to show other words. The part before the bar matches a term row's title in any case, or its slug through `slugify`. Nothing is matched without a mark.

- **Where they render.** `renderMarkdown` takes the terms as its last argument and the help views pass them (`HelpArticleView`, `HelpIndex`, `HelpGlossary`), so the site documents, which pass none, are unchanged. The terms come from the cached public glossary read (tag `help`, `readGlossaryTerms` in `src/lib/help-glossary.ts`), once per page, never per mark. Staff pages read the same public terms.
- **What a mark becomes.** A [HelpTerm](help-term.md): a link to `/help/glossary#<slug>` with a tooltip of the term's title and its definition as plain text, drawn as a lifted card (`$surface-card`, a hairline, `$shadow-floating`) with the title in the heading face above the definition. A mouse click or Enter follows the link; a touch or pen tap opens the tooltip instead, whose "See in Glossary" link goes to the anchor, and a second tap, a tap outside or Escape closes it. A mark naming no row shows its shown text and no link.
- **Where they do not.** A heading, a link and a code span or block hold no mark: in a heading or link the shown text is plain, and in code the mark stays as typed so the syntax can be written down. The body preview in `HelpArticleForm` passes no terms and shows marks as typed.
- **The glossary page** links a mark in a definition to its anchor with no tooltip, since every definition is on the page.
- **Summaries** (search results, index and sub page lists, the page description) show the shown text as plain text.
- **Saving.** `createHelpArticle` and `updateHelpArticle` refuse a body that marks a term no live glossary row holds, as a `ValidationError` on `body` naming each missing term; an update that leaves the body alone is not checked. A term being saved counts as present in its own body. The seed test asserts every mark in the shipped prose names a seeded term.

## Widgets

A help body places a live widget with a paragraph that is one tag, `::widget[name]`. The names are a fixed list, `HELP_WIDGETS` in `src/lib/help-widgets.ts`:

| Name                    | What it draws                                                                                                    | Where its rule comes from                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `unit-converter`        | An amount and two units; the result, or the refusal for a conversion across dimensions or involving a count unit | `unitConvert` and `UNITS` (`src/modules/ingredients`)                            |
| `invitation-refusals`   | Every message the accept page can give, for a link and for a printed card                                        | `INVITATION_REFUSAL_MESSAGES` and `CARD_REFUSAL_MESSAGES` (`@/modules/identity`) |
| `role-permission-table` | A table of each workspace action against Steward, Practitioner and Observer, a check or a cross in each cell     | `rolePermits` and `WORKSPACE_STATEMENTS` (`@/modules/coven`)                     |
| `autosave-status`       | The real `SaveStatus` in each of its six states, and the retry delays                                            | `AutosaveStatus` and `RETRY_DELAYS_MS` (`src/lib/autosave`)                      |

- **The role table leaves out what no screen offers.** `HIDDEN_STATEMENTS` in `role-permission-table.tsx` lists the statements it skips, now `workspace.update` (renaming a coven, which has no screen); the task that builds a rename screen takes it off the list. A test holds every entry to a statement in `WORKSPACE_STATEMENTS` and every other statement to a row.
- **The autosave widget draws examples, not live lines.** Each state is an `example` `SaveStatus`, so the widget holds no live region or alert, with what the state means beneath it. Its time is a fixed date built from local parts (2:02 pm), so the server and the browser draw the same text. Nothing to Save shows no time; A Change Is Waiting shows the last save's.
- **Each widget imports its rule, never a copy**, so a reason, a role or a delay added in the code shows in the widget. The invitation and role widgets are server components, since their modules are server-only; the converter and the autosave widget are client components. All four live in `src/components/HelpWidget/`, and `HELP_WIDGET_ELEMENTS` maps each name to its element.
- **Where it renders.** `HelpArticleView` hands `HELP_WIDGET_ELEMENTS` to `renderMarkdown` as its last argument; a root paragraph that is one tag naming a handed widget is swapped for it. A tag inside a sentence, a tag for a widget not handed over, and every tag in a site document or the `HelpArticleForm` preview stays text.
- **Saving.** `createHelpArticle` and `updateHelpArticle` refuse a body that places a name not in the list, as a `ValidationError` on `body` naming it and listing the widgets, the same way as an unknown term mark; an update that leaves the body alone is not checked.
- **Tests.** `tests/components/HelpWidget/` checks each widget against its rule (a reason added to the invitation tables and missing from the widget fails there); `tests/e2e/help-widgets.spec.ts` reads one article per widget on the built server with axe.

## Screenshots

A help body shows a screenshot with a paragraph that is one image, `![alt text](/help/screens/<name>.png "caption")`. `renderMarkdown` draws it as a `.figure` with the title as its `figcaption`, only in help bodies; an image whose address is not a path on this site becomes its alt text. The pictures live in `public/help/screens/` and are committed; the proxy serves them under the public help article rule.

`npm run help:screenshots` writes them: `tests/e2e/help-screenshots/`, run on `playwright.help-screenshots.config.ts` against the e2e slot server and a slot database it seeds, at 1024 wide in the light theme. `npm run e2e` leaves it out. Run it after a change to a page a screenshot shows, with the e2e lock, ports clear of the dev server and the placeholder secret:

```sh
flock /tmp/sorrel-e2e.lock env E2E_PORT_BASE=8200 E2E_WORKERS=1 \
  BETTER_AUTH_SECRET=local-dev-not-a-real-secret npm run help:screenshots
```

| File                   | What it shows                                                              | Article                       |
| ---------------------- | -------------------------------------------------------------------------- | ----------------------------- |
| `compendium-entry.png` | The Rosemary entry page, signed out, marked reviewed by the seeded curator | Read an Entry and Its Sources |
| `spell-builder.png`    | The spell builder over a draft, every section open, three steps in it      | Build a Spell                 |

## Links to help

`Welcome`, the footer nav (`SiteFooter`, after Privacy), the 404 screen, the account menu (`AccountMenu`, a "Help" row before Support), the `/support` page and the Support dialog (each a "Search Help" line before the form) link to `/help`. The top bar (`PublicFrame`, `AppShell`) does not. An empty Ingredients list and an empty Grimoire tab each end with a "Learn More" link to their guide, built by `publicGuidePath(slug)` (`src/lib/help-paths.ts`) from the guide's slug, which is its title's. The keepers and curator layouts link `/help/staff` as "Staff Help" in a `nav` (`StaffHelpLink`), drawn before the section body rather than in it, so a page's skeleton, which covers the whole body, leaves it in view.

Every link from a help page to another page, the term marks and their "See in Glossary" link among them, is a `PendingLink`, so a press shows the destination's skeleton at once. A link to an anchor on the same page (the front page's "Back to Top", a glossary term's own "#") stays an `<a>`, since it loads nothing.
