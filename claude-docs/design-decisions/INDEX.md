# Design decisions

A record is `<id>-<slug>.md`: what was decided, why, and what it rules out. Records stay live and are superseded in place, with a status line at the top naming what replaced them. A plan is `<id>-plan.md`: it sits beside its record until its pull request lands, is not maintained, and is deleted once the pull request has landed and its facts have a home in a record or a live doc. Every decision and constraint a record holds is also written into the live summary that depends on it; if a reader needs a record to understand the system, the summary is missing something and the summary is what to fix. Write a record when a task's choice would otherwise be re-argued later, and link it from the summary that depends on it.

Each line below reads: record — title — status — live home.

## Auth and identity

- `m2.9-granting-admin` — Granting and revoking admin — decided — ../auth/README.md
- `m5.5-admin-compendium` — The admin compendium page: its size, its modal, its lookups — decided — this record
- `m5.6a-admin-forms` — The admin forms page: the slug, the redirect, the stale pick — decided (history) — this record
- `m5.6b-admin-groups` — The admin group pages: where a deleted group's rows go — decided — this record
- `m5.8-revoking-workspace-creation` — Revoking workspace creation, and its ledger — accepted 2026-10-09, on the owner's calls while building M5.8. — this record
- `m8.17-editing-a-coven-ingredient` — Editing a Coven's Own Ingredient — decided and built. — this record
- `m9.6-coven-ingredients-page` — The Coven's Ingredients Page — decided and built. — this record
- `m9.19-admin-sees-user-covens` — A site keeper sees which covens a user belongs to — decided — this record
- `m10.26-invited-by` — Invited By on the coven members table, scoped — decided and built. — this record
- `m11.20-curator-role` — A third site role, curator — decided — this record
- `m14.35-curators-see-hidden-entry-pages` — A curator or keeper still sees the page of a hidden entry — accepted — this record
- `m15-support-path-keeps-coven` — A support request keeps the coven in its page — decided — this record
- `m15.9-demo-coven` — One demo coven on every environment — decided — this record
- `m15.17-invitation-cards` — An invitation card is a third shape of invitations — decided — this record
- `m15.50-invitation-token-rotation` — the invitation mail mints its token in the job step — decided — this record
- `m15.52-site-access-pause` — What the site access pause closes, and what it decides along the way — decided — this record
- `m15.55-coven-access-pause` — How the coven access pause refuses a member, and what it decides along the way — decided — this record
- `m15.57-terms-of-use-notes` — the terms of use's working notes — decided — /terms
- `m15.66-member-pause-mail-read` — The coven pause mail step reads a pause without a Membership proof — decided — this record
- `m15.77-curator-nav` — Split the Curator and Keepers Navs — decided — this record
- `m16.1-first-party-sign-in` — First-party sign-in comes into v1: a password, a passkey, a second factor — decided — this record
- `mb.24-rls-role-split` — RLS role split, FORCE, and identity on the read path — superseded by MB.29 — this record
- `mb.54-email-page` — Set the account's email: prefilled from the provider, editable, verified before it counts — decided and built. — this record
- `mb.57-post-sign-in-landing` — Where the post-sign-in landing lives — decided — this record
- `mb.61-email-verification-and-delivery` — First-party email verification and email delivery — decided — this record
- `mb.62-pause-ledger` — The admin-role-change pause is a ledger, not a settings row — decided — this record
- `mb.71-link-a-second-sign-in-method` — Link a second sign-in method from the account page — decided and built. — this record
- `mb.74-better-auth-plugins` — Better Auth's plugin roster: what lands before launch, what waits — decided — this record
- `mb.91-keeper-curated-vocabularies` — Planet and zodiac as keeper-curated vocabularies (MB.91) — decided and built. — this record
- `mb.116-design-review-sign-in` — Design review: the sign-in and account pages (absorbing MB.117) — decided and built. — this record
- `mb.119-design-review-coven` — Design review: the coven and invitations (#576) — decided and built. — this record
- `mb.132-admin-deities` — The admin deity pages: the slug, the tradition's delete, one form — decided — this record
- `mb.177-admins-hold-workspace-creation` — Every admin holds canCreateWorkspace — decided — this record
- `mb.194-privilege-ledger-by-trigger` — One privilege ledger, written by the database — decided — this record
- `mb.201-two-tier-invitations` — Workspace and admin invitations are one two-tier table — decided — this record
- `mb.282-graphql-refuses-cross-site` — the GraphQL endpoint refuses cross-site writes — decided (history) — this record

## Support, legal and privacy

- `m15-support-review-research` — Support feature: UX, accessibility and process research — decided — this record
- `m15-support-review` — M15.32 → M15.47 — The support feature, revised after review — decided — this record
- `m15.1-about` — Support requests: "kind" becomes "about" — decided — this record
- `m15.1-support-form` — A support form, reviewed by keepers — decided — this record
- `m15.2-privacy-policy-notes` — the privacy policy's working notes — decided — this record
- `m15.48-mailed-link` — A signed-out sender reaches their request by a mailed link — decided — this record
- `m15.50-mail-through-a-retried-job` — mail is sent through a retried job — decided — this record
- `m15.58-gdpr-scope` — What GDPR Asks of Sorrel & Salt — decided — this record
- `m15.59-document-editor-scope` — A keeper editor for the site's documents — decided — this record
- `m15.61-take-your-writing-scope` — A way for people to take their own writing with them — decided — tasks/m18.md
- `m15.79-agreement-covers-three-documents` — Agreeing to the terms covers the disclaimer and the code of ethics — decided — this record
- `m15.79-joint-document-mailing` — one joint email about every changed document — decided — this record
- `m17.2-closed-practice-warning` — the closed-practice warning — decided — this record
- `m17.3-ethical-ingredient-warnings` — the ethical warnings on ingredients — decided — this record
- `mb.118-design-review-mail` — Design review: the site's mail (#575) — decided and built. — this record

## Database, seed and compendium

- `m1.1-neon-branch-strategy` — Neon branch strategy: persistent staging vs. ephemeral hotfix branches — decided — this record
- `m1.9-test-db-isolation` — Test database isolation: per-worker clone vs. rolled-back transaction — decided — this record
- `m1.11-e2e-reseed-without-seed` — E2E reseeding: recreate from template, not src/db/seed — superseded in part by M1.27 (2026-09-19) — this record
- `m1.21-seed-writes-through-its-handle` — The seed writes through the handle it is given, not through withAudit — decided; superseded in part by MB.86 (2026-09-27), which removed the users ↔ audit.ts import cycle, so a seed file's import order no longer — this record
- `m4.8-category-and-folk-name-loaders` — categoriesByIngredient and folkNamesByIngredient loaders — decided and built. — this record
- `m5.3-spells-keep-deleted-ingredients` — A spell keeps the ingredients it holds, deleted or not — decided — this record
- `m6.11-members-without-a-loader` — A coven's members are read a coven at a time, without a loader — decided — this record
- `m6.14-global-sass-not-css-modules` — Component styling is global Sass with BEM names, not CSS Modules — decided — this record
- `m8.5-compendium-queries` — compendium and ingredient GraphQL queries — decided and built. — this record
- `m8.16-add-ingredient-modal-scoping` — AddIngredientModal: scoping plan — decided and built. — this record
- `m9.9-edit-stock-from-the-card` — M9.9 plan: Edit stock from the card — decided and built. — this record
- `m10.12-spell-builder-modal` — The spell builder is a modal — decided — this record
- `m10.19-stock-off-the-builder` — stock comes off the spell builder — decided — this record
- `m12.13-cupboard-names-the-compendium` — a coven's cupboard names the compendium's entry, rather than hiding it — decided and built. — this record
- `m12.31-click-feedback-outside-forms` — Feedback from a click outside a form — decided and being built: Design F, chosen by the owner on 2026-10-20, replacing ActionFailure everywhere — this record
- `m13.1-spell-steps` — A spell's recipe is one ordered list of steps — decided — this record
- `m13.4-spell-workings` — A working is the record of one making, in three tables — decided — this record
- `m13.17-new-spell-private` — A new spell starts private — decided — this record
- `m14.4-compendium-markdown-files` — The compendium seed as markdown files, a formal-name rule and curator review — decided — compendium/sources/<handle>.yaml
- `m14.38-form-categories-in-search` — How search shows and filters on a form's categories — accepted — this record
- `m16.4-repository-writes-outside-the-audit` — Two repository files that import the database client and write outside withAudit — accepted — this record
- `mb.10-co-member-display-names` — A deleted co-member reads under their last name — decided — this record
- `mb.39-job-level-if-and-check-names` — A job-level if: renames the check only on the job that calls a reusable workflow — decided, verified by two probes, adopted in MB.39 — this record
- `mb.40-custom-spell-ingredients` — A custom, one-off spell ingredient is a row in spell_ingredients, not a table of its own — decided; superseded in part by MB.110 (2026-09-30), which soft-deletes the table and keys it on a surrogate id — this record
- `mb.80-public-compendium` — The compendium is public and search-indexable — decided — this record
- `mb.82-slug-takeover` — A taker ends a retired slug's redirect, once confirmed — decided — this record
- `mb.86-modular-monolith` — Domain modules with a guarded boundary — decided — this record
- `mb.87-repository-split` — Split src/db/repository.ts into src/db/repository/ (MB.87) — decided and built. — this record
- `mb.108-types-in-type-files` — Types live in type-only files — decided — this record
- `mb.115-variant-substitutes-name-a-form` — A form's linked substitute names a form — decided — this record
- `mb.120-design-review-public-compendium` — Design review: the public compendium and shared ingredient components (#577) — decided and built. — this record
- `mb.121-workspace-ingredients-review` — Design review of the workspace ingredients page — decided — this record
- `mb.123-design-review-the-grimoire` — Design review: the grimoire — decided and built; the owner has run no full test suite yet (Q0) and runs /design-sync at the end — this record
- `mb.125-delete-names-rows-by-value` — write.delete names its rows by value, and the join tables stay hard-deleted — decided — this record
- `mb.126-categories-on-the-combobox` — Categories are picked from the lists' box, not a wall of chips — decided — this record
- `mb.151-references` — A reference is one source, kept once, rendered in Chicago form — decided — this record
- `mb.154-reference-form-field` — IngredientForm — References field — decided and built. — this record
- `mb.161-unknown-may-carry-a-formal-name` — An unknown classification may carry a formal name — decided. — claude-docs/db/identity-model.md
- `mb.162-compendium-holds-curated-values` — The compendium holds curated values alone — decided — this record
- `mb.165-record-the-picked-vocabulary-row` — A picked form or deity is recorded beside its text — decided — this record
- `mb.171-seed-keys` — A seeded row keeps the key the seed gave it — decided — this record
- `mb.215-ingredient-variants` — An ingredient and its forms — decided — this record
- `mb.251-celestial-bodies` — The planets are Celestial Bodies wherever a person reads them — decided — this record
- `mb.252-table-rename` — A renamed table leaves a view under its old name — decided — this record
- `postgres-driver-read-mode-and-channel-binding` — Take the new version (PR #1542): turn off the new read mode, and enforce channel binding — decided (history) — this record
- `pr1308-repeat-forms` — PR #1308: a spell may lay one form in several steps — decided (history) — this record
- `pr1308-step-note-retired` — The step note is retired (PR #1308) — decided (history) — this record

- `mw15-bulk-add-partial-with-report` — Bulk add completes the rows it can and reports the rest — decided — this record
- `mw15-formal-name-in-the-compendium-only` — A formal name is required in the compendium only — decided — this record
- `mw15-no-external-taxonomic-identifiers` — No external taxonomic identifiers (POWO, IPNI, GBIF, CAS, IMA) — decided — this record
- `mw15-slug-expiry-without-a-job` — A slug's expiry is a date comparison; work that must happen on time is a durable job — decided — this record

## GraphQL and services

- `m3.5-graphql-codegen` — graphql-codegen types the browser's documents — decided. — claude-docs/graphql/client-types.md
- `m3.6-cursor-pagination-helper` — Cursor pagination helper with a hard maximum page size — decided and built. — this record
- `m3.8-react-cache-and-the-server-read-path` — React cache() wrapper and the server read path — decided and built. — this record
- `m3.10-me-query` — me query, User type and field-level auth scope — decided and built. — this record
- `mb.105-pager-counts` — The pager counts, and the typeahead is the first page of a search — decided. — claude-docs/graphql/pagination.md
- `mb.180-graphql-transport-half` — The GraphQL file holds the transport's half — decided — this record

## Interface and components

- `m9.1-stories-are-browser-flows` — Stories are browser flows — decided — this record
- `m9.18-modals-open-with-a-pending-state` — Admin modals open at once, with a loading state — decided and built. — this record
- `m10.24-browser-floor` — the browser floor — decided — this record
- `m11.22-search-facets` — Search facets take lists and a toxic setting — decided — this record
- `m12.4-filter-layout` — How the search filters sit together — signed off by the owner from the workshop stories — this record
- `m12.6-form-icons` — Form icons: on the group, with a generic — decided — this record
- `m12.9-undo-and-redo` — M12.9 and M12.10 — undo and redo in the forms: the approved plan — decided and built. — this record
- `m12.33-loading-standard` — One Loading Standard for the Site — decided — this record
- `m12.43-fewer-tooltips` — Fewer, quieter tooltips — decided and built. — this record
- `m12.52-facet-sort-order` — How each search facet sorts its values — decided by the owner from the workshop stories — this record
- `m12.53-storybook` — The component workshop moves from Ladle to Storybook — decided — this record
- `m13.14-autosave` — M13.14–M13.19 — Long forms autosave, and edits of one row can conflict — decided — this record
- `m14.32-comment-guidelines` — Comments say how the code works, and nothing else — decided — .claude/rules/writing.md
- `mb.7-navigation` — The navigation shell is a slim bar, a context row and a bottom bar on a phone — decided — canCreateWorkspace
- `mb.84-page-metadata` — Robots, sitemap, page metadata and structured data — decided — this record
- `mb.174-no-repeat-list-entries` — Stop the list fields offering or adding a repeat — decided and built. — this record
- `mb.224-test-suite-cut` — cut the test suite to functional requirements (MB.224–MB.230, seven lanes) — decided and built. — this record

## Testing, CI and tooling

- `m9.17-specs-tag-their-stories` — E2E specs tag the stories they walk, and the checklist shows them — decided and built. — this record
- `m10.30-dependency-audit` — Dependency audit, 2026-10-12: what can move, and the work to move it — decided and built. — this record
- `m11.18-faster-playwright-runs` — Faster Playwright runs on the same CPU and RAM — decided and built. — globalSetup
- `m11.23-pre-commit-changed-files` — commit on changed files only — decided and built. — this record
- `m11.25-component-tests-run-on-happy-dom` — The component tests run on happy-dom — decided and built. — this record
- `m12.35-token-efficiency` — cut per-turn cost, write token-efficiency rules, make test output useful — decided and built. — this record
- `m14.27-test-audit` — Test-suite audit, 2026-10-27 — decided — this record
- `mb.89-tracker-on-github` — Move task tracking from Asana to GitHub Issues and Projects (MB.89) — decided and built. — this record
- `mb.96-ci-vitest-job` — Bring the CI Vitest job under a minute — decided and built. — this record
- `mb.100-sql-follow-up` — Raw SQL: a follow-up task, and two assessments — decided and built. — this record
- `mb.112-server-per-worker` — Each Playwright worker slot gets a server, not just a database — decided — this record
- `mb.142-doc-split-and-token-cost` — Cut the tokens a task costs — decided and built. — this record
- `mb.191-coverage-provider` — The coverage provider, chosen by measurement — decided — this record
- `mb.206-dry-review` — Backend DRY review — plan (MB.206–MB.214) — decided and built. — this record
- `mb.235-test-reduction-lanes` — MB.235 to MB.238 — the approved plan — decided and built. — this record
- `mb.275-oxlint-warnings` — clear the 142 oxlint warnings and stop new ones landing — decided and built. — this record

## Other

- `m6.3-permission-statements` — Permission statements over a role rank — decided — this record
- `m10.20-draft-visibility` — A draft's visibility moves either way; a complete spell's only widens — decided — this record
- `m10.32-accept-from-the-landing` — A coven invitation is accepted from the account page as well as from the mail — decided — this record
- `m12.24-retired-entry-stays-readable` — A retired entry stays readable to the covens that use it — decided — this record
- `m12.42-linking-goes-one-way` — Linking Goes One Way — decided — this record
- `m14.2-physical-uses` — How an ingredient records its physical uses — accepted by the owner and moved to v2, 2026-10-23 (DESIGN.md §13, "Physical uses") — this record
- `m14.4-plan` — Compendium seed as markdown files, with a hash-gated update path, a formal-name rule and curator review — decided — this record
- `m14.24-plan` — The sourcing score: facts, weights and the data they need — decided — this record
- `m14.29-no-endangered-species` — no endangered species in the compendium — decided — this record
- `m14.32-plan` — M14.32 plan — Comment guidelines and the cleanup that applies them — decided — Story N
- `m15.1-plan` — Scope a support form reviewed by keepers (plan) — decided — this record
- `m15.3-disclaimer-notes` — the disclaimer's working notes — decided — this record
- `m15.4-code-of-ethics-notes` — the code of ethics' working notes — decided — this record
- `m15.9-plan` — The demo coven: every account is seated as an observer at sign-up — decided — this record
- `m15.46-daily-jobs-from-vercel-cron` — daily jobs start from Vercel Cron, and no job sleeps waiting — decided — this record
- `m15.46-resolved-requests-close-and-anonymise` — a resolved request closes on its own, and a closed one is anonymised — decided — this record
- `m15.48-plan` — M15.48 plan: a signed-out sender keeps a provisional session — decided — this record
- `m15.49-job-mechanism` — the site has a durable job mechanism — decided — this record
- `m15.58-plan` — M15.58 GDPR: mint the build tasks now, build nothing — decided — this record
- `m15.59-plan` — Scope a Keeper Editor for the Site's Documents (#1458) — decided — this record
- `m15.61-plan` — Scope a Way for People to Take Their Own Writing With Them (#1463) — decided — this record
- `m17.1-subscription-billing-scope` — Subscription Billing Scope — decided — this record
- `m17.2-no-controlled-substances` — no controlled substances in the compendium — decided — this record
- `m17.2-plan` — Scope the Closed-Practice Warning — decided — this record
- `m17.3-plan` — Scope the ethical warnings on ingredients — decided — this record
- `mb.30-organization-plugin` — Better Auth's organization plugin for workspaces and invitations — decided — **not adopted** — this record
- `mb.131-closed-sets-on-the-combobox` — A closed set wears the combobox — decided — this record
- `mb.138-substitute-links` — A substitute is a row that links an ingredient or names one — decided — this record
- `mb.148-reads-on-the-write-transaction` — Reads on the write transaction — decided — this record
- `mb.155-notes-and-bibliography` — The page cites in notes and a bibliography — decided — this record
- `mb.167-read-and-write-the-pick` — Reading and writing the picked form and deities — decided — this record
- `mb.175-help-articles` — Help and FAQ articles, and a glossary, as rows a keeper edits — decided — this record
- `mb.175-plan` — Scope Help and FAQ Articles (plan) — decided — this record
- `wave-13-review-record` — Wave 13 review — plan — decided and built. — this record
- `mw15-notes-keep-referential-integrity` — Notes keep referential integrity: no polymorphic subject, no shadow history tables — decided — this record
- `mw15-rejected-stack-choices` — Stack choices rejected (Gatsby, Vite SPA, Supabase, Render Postgres, SQLite for tests, Neon branches for CI, Netlify, Apollo Client, server functions, trunk-based, Better Auth anonymous plugin) — decided — this record
- `m5.6-admin-categories` — The admin categories page: the delete, the list query, the modal — decided — this record
- `m9.3-create-stock-refuses-held-form` — Starting a jar of a form the coven holds is refused — decided — this record
- `mb.240-compendium-seed` — A researched, sourced compendium seed — decided — this record
- `m10.31-graphql-request-dropped` — graphql-request dropped for a fetch wrapper — decided — this record
- `m1.27-template-at-setup-not-in-image` — The seeded test template is built at test-run setup, not baked into the Postgres image — decided — this record
- `mb.42-no-source-layer` — The CI images carry no source layer — decided — this record

Superseded records are in `archive/design-decisions-history.tar.gz`. List it with `tar -tzf`; git history holds the plain text.
