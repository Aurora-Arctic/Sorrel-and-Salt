# Design decisions

Nine area docs, one section per decision: what was decided, why, and what it rules out. Each line below states the decision.

## Auth

Read [auth.md](auth.md).

- [m2.9-granting-admin](auth.md#granting-and-revoking-admin) — An admin is granted and revoked by an existing admin, with a ledger row.
- [m5.8-revoking-workspace-creation](auth.md#revoking-workspace-creation-and-its-ledger) — A keeper can revoke workspace creation; coven already made stay, and a ledger records it.
- [m6.3-permission-statements](auth.md#permission-statements-over-a-role-rank) — Permissions are per-role statements, never a role rank.
- [m9.19-admin-sees-user-covens](auth.md#a-site-keeper-sees-which-covens-a-user-belongs-to) — A keeper reads which covens a user belongs to, by name and role only.
- [m10.26-invited-by](auth.md#invited-by-on-the-coven-members-table) — Membership stores who invited it, copied from the invitation at acceptance.
- [m10.32-accept-from-the-landing](auth.md#a-coven-invitation-is-accepted-from-the-account-page-as-well-as-from-the-mail) — A coven invitation is accepted by id from the account page too.
- [m11.20-curator-role](auth.md#a-third-site-role-curator) — A third site role, curator, may use every curation screen and nothing on People.
- [m15.9-demo-coven](auth.md#one-demo-coven-on-every-environment) — One demo coven exists on every environment; every sign-in earns an observer seat.
- [m15.17-invitation-cards](auth.md#an-invitation-card-is-a-third-shape-of-invitations) — A printed invitation card is a third invitation shape bound to no address.
- [m15.50-invitation-token-rotation](auth.md#the-invitation-mail-mints-its-token-in-the-job-step) — The invitation mail's job step mints a fresh token on each attempt.
- [m15.52-site-access-pause](auth.md#what-the-site-access-pause-closes-and-what-it-decides-along-the-way) — The site access pause closes sign-in for paused accounts and records the pause.
- [m15.55-coven-access-pause](auth.md#how-the-coven-access-pause-refuses-a-member-and-what-it-decides-along-the-way) — The coven access pause refuses a paused member at the service check.
- [m15.66-member-pause-mail-read](auth.md#the-coven-pause-mail-step-reads-a-pause-without-a-membership-proof) — The pause mail step reads a pause without a Membership proof.
- [m15.77-curator-nav](auth.md#split-the-curator-and-keepers-navs) — Curator and Keepers get separate navs.
- [m16.1-first-party-sign-in](auth.md#first-party-sign-in-comes-into-v1-a-password-a-passkey-a-second-factor) — Password, passkey and second factor are in v1.
- [m16.4-repository-writes-outside-the-audit](auth.md#two-repository-files-that-import-the-database-client-and-write-outside-withaudit) — Two repository files write outside withAudit because their tables have no audit columns.
- [mb.10-co-member-display-names](auth.md#a-deleted-co-member-reads-under-their-last-name) — A deleted co-member reads under their last name.
- [mb.24-rls-role-split](auth.md#rls-role-split-force-and-identity-on-the-read-path) — RLS role split with FORCE; superseded by MB.29, which defers RLS.
- [mb.30-organization-plugin](auth.md#better-auths-organization-plugin-for-workspaces-and-invitations) — Better Auth's organization plugin is not used for workspaces and invitations.
- [mb.54-email-page](auth.md#set-the-accounts-email-prefilled-from-the-provider-editable-verified-before-it-counts) — The account email is set on its own page and verified before it counts.
- [mb.57-post-sign-in-landing](auth.md#where-the-post-sign-in-landing-lives) — The post-sign-in landing lives at a fixed place after sign-in.
- [mb.61-email-verification-and-delivery](auth.md#first-party-email-verification-and-email-delivery) — Email verification is first-party; its signed token is neither hashed nor single-use.
- [mb.62-pause-ledger](auth.md#the-admin-role-change-pause-is-a-ledger-not-a-settings-row) — The admin-role-change pause is a ledger, not a settings row.
- [mb.71-link-a-second-sign-in-method](auth.md#linking-a-second-sign-in-method) — A provider links to an account only inside a link flow begun under a session.
- [mb.74-better-auth-plugins](auth.md#better-auths-plugin-roster-what-lands-before-launch-what-waits) — Better Auth plugin roster: what lands before launch, what waits.
- [mb.177-admins-hold-workspace-creation](auth.md#every-admin-holds-cancreateworkspace) — Every keeper and curator holds canCreateWorkspace, enforced by a CHECK.
- [mb.194-privilege-ledger-by-trigger](auth.md#one-privilege-ledger-written-by-the-database) — One privilege ledger, written by a database trigger.
- [mb.201-two-tier-invitations](auth.md#workspace-and-admin-invitations-are-one-two-tier-table) — Workspace and keeper invitations share one two-tier table.
- [mb.282-graphql-refuses-cross-site](auth.md#the-graphql-endpoint-refuses-cross-site-writes) — The GraphQL endpoint refuses cross-site writes.

## Data

Read [data.md](data.md).

- [m1.1-neon-branch-strategy](data.md#neon-branch-strategy-persistent-staging-vs-ephemeral-hotfix-branches) — Staging is a persistent Neon branch; hotfix branches are ephemeral.
- [m1.21-seed-writes-through-its-handle](data.md#the-seed-writes-through-the-handle-it-is-given-not-through-withaudit) — The seed writes through the handle it is given, not withAudit.
- [m3.6-cursor-pagination-helper](data.md#cursor-pagination-helper-with-a-hard-maximum-page-size) — Every list pages through one cursor helper with a hard maximum page size.
- [m5.3-spells-keep-deleted-ingredients](data.md#a-spell-keeps-the-ingredients-it-holds-deleted-or-not) — A spell keeps the ingredients it holds, deleted or not.
- [m6.11-members-without-a-loader](data.md#a-covens-members-are-read-a-coven-at-a-time-without-a-loader) — A coven's members are read a coven at a time, without a loader.
- [mb.100-sql-follow-up](data.md#correlated-subqueries-go-through-existsin-not-raw-sql) — Correlated subqueries go through existsIn, not raw SQL.
- [mb.105-pager-counts](data.md#the-pager-counts-and-the-typeahead-is-the-first-page-of-a-search) — The pager counts, and the typeahead is the first page of a search.
- [mb.125-delete-names-rows-by-value](data.md#writedelete-names-its-rows-by-value-and-the-join-tables-stay-hard-deleted) — write.delete names rows by value; join tables stay hard-deleted.
- [mb.148-reads-on-the-write-transaction](data.md#reads-on-the-write-transaction) — Reads that follow a write run on the write transaction.
- [mb.171-seed-keys](data.md#a-seeded-row-keeps-the-key-the-seed-gave-it) — A seeded row keeps the key the seed gave it.
- [mb.252-table-rename](data.md#a-renamed-table-leaves-a-view-under-its-old-name) — A renamed table leaves a view under its old name.
- [mb.87-repository-split](data.md#the-repository-is-a-folder) — The repository is a folder of files behind one index.
- [mb.206-dry-review](data.md#backend-dry-review) — Shared helpers replace repeated validation and finder code.
- [postgres-driver-read-mode-and-channel-binding](data.md#take-the-new-version-pr-1542-turn-off-the-new-read-mode-and-enforce-channel-binding) — Postgres driver update: new read mode off, channel binding enforced.
- [mw15-slug-expiry-without-a-job](data.md#a-slugs-expiry-is-a-date-comparison-work-that-must-happen-on-time-is-a-durable-job) — A slug's expiry is a date comparison; timed work is a durable job.
- [mw15-notes-keep-referential-integrity](data.md#notes-use-real-foreign-keys-and-one-generic-history-trigger) — Notes use real foreign keys and one generic history trigger.
- [mw15-bulk-add-partial-with-report](data.md#bulk-add-is-partial-with-a-report) — Bulk add is partial and returns a report.
- [mb.82-slug-takeover](data.md#a-taker-ends-a-retired-slugs-redirect-once-confirmed) — A taker ends a retired slug's redirect once confirmed.
- [mb.86-modular-monolith](data.md#domain-modules-with-a-guarded-boundary) — Domain modules with a guarded boundary.
- [mb.108-types-in-type-files](data.md#types-live-in-type-only-files) — Types live in type-only files.

## GraphQL

Read [graphql.md](graphql.md).

- [m3.5-graphql-codegen](graphql.md#graphql-codegen-types-the-browsers-documents) — graphql-codegen types the browser's documents.
- [m3.8-react-cache-and-the-server-read-path](graphql.md#react-cache-wrapper-and-the-server-read-path) — Server components call services in React cache(); the browser uses GraphQL.
- [m3.10-me-query](graphql.md#me-query-user-type-and-field-level-auth-scope) — me returns the signed-in user; scoped fields throw Forbidden.
- [m4.8-category-and-folk-name-loaders](graphql.md#categoriesbyingredient-and-folknamesbyingredient-loaders) — Child-row loaders filter by proofed scope in SQL, not after fetch.
- [m8.5-compendium-queries](graphql.md#compendium-and-ingredient-graphql-queries) — Compendium and ingredient queries read through scoped finders and loaders.
- [m10.31-graphql-request-dropped](graphql.md#graphql-request-replaced-by-a-fetch-wrapper) — A small fetch wrapper replaces graphql-request, holding graphql at 16.
- [mb.180-graphql-transport-half](graphql.md#the-graphql-file-holds-the-transports-half) — The GraphQL file holds the transport's half of the work.
- [mb.80-public-compendium](graphql.md#the-compendium-is-public-and-search-indexable) — The compendium is public and indexable; nothing workspace-scoped follows it out.

## Ingredients

Read [ingredients.md](ingredients.md).

- [m5.5-admin-compendium](ingredients.md#the-admin-compendium-page-its-size-its-modal-its-lookups) — The admin compendium page: its size, modal and lookups.
- [m5.6-admin-categories](ingredients.md#the-admin-categories-page-delete-list-read-and-modal) — Admin categories page: delete, list read and modal.
- [m5.6a-admin-forms](ingredients.md#the-admin-forms-page-the-slug-the-redirect-the-stale-pick) — Admin forms page: the slug, the redirect, the stale pick.
- [m5.6b-admin-groups](ingredients.md#the-admin-group-pages-where-a-deleted-groups-rows-go) — Admin group pages: where a deleted group's rows go.
- [m8.16-add-ingredient-modal-scoping](ingredients.md#addingredientmodal-scoping-choices) — Add Ingredient uses a native Coven select and plain onTouched validation.
- [m8.17-editing-a-coven-ingredient](ingredients.md#editing-a-covens-own-ingredient) — Stewards and practitioners edit and Link their coven's own entries.
- [m9.3-create-stock-refuses-held-form](ingredients.md#starting-a-jar-of-a-form-the-coven-holds-is-refused) — Starting a jar of a form the coven already holds is refused.
- [m9.6-coven-ingredients-page](ingredients.md#the-covens-ingredients-page) — The coven's Ingredients page lists its own entries and named compendium entries.
- [m9.9-edit-stock-from-the-card](ingredients.md#edit-stock-from-the-card) — Stock is edited from the ingredient card.
- [m10.19-stock-off-the-builder](ingredients.md#stock-comes-off-the-spell-builder) — Stock is taken off the spell builder.
- [m11.22-search-facets](ingredients.md#search-facets-take-lists-and-a-toxic-setting) — Search facets take lists and a toxic setting.
- [m12.4-filter-layout](ingredients.md#how-the-search-filters-sit-together) — Search filters sit together in one layout.
- [m12.13-cupboard-names-the-compendium](ingredients.md#a-covens-cupboard-names-the-compendiums-entry-rather-than-hiding-it) — A coven's cupboard names the compendium entry rather than hiding it.
- [m12.24-retired-entry-stays-readable](ingredients.md#a-retired-entry-stays-readable-to-the-covens-that-use-it) — A retired entry stays readable to the covens that use it.
- [m12.42-linking-goes-one-way](ingredients.md#linking-goes-one-way) — A coven annotates a compendium entry or makes it its own; linking goes one way.
- [m12.52-facet-sort-order](ingredients.md#how-each-search-facet-sorts-its-values) — Each search facet sorts its values by its own rule.
- [m14.2-physical-uses](ingredients.md#how-an-ingredient-records-its-physical-uses) — How an ingredient records its physical uses.
- [m14.4-compendium-markdown-files](ingredients.md#the-compendium-seed-as-markdown-files-a-formal-name-rule-and-curator-review) — Compendium seed is markdown files with a formal-name rule and curator review.
- [m14.24-plan](ingredients.md#the-sourcing-score-facts-weights-and-the-data-they-need-plan) — Open plan: the sourcing score, its facts, weights and data.
- [m14.29-no-endangered-species](ingredients.md#no-endangered-species-in-the-compendium) — No endangered species in the compendium.
- [m14.35-curators-see-hidden-entry-pages](ingredients.md#a-curator-or-keeper-still-sees-the-page-of-a-hidden-entry) — A curator or keeper still sees a hidden entry's page.
- [m14.38-form-categories-in-search](ingredients.md#how-search-shows-and-filters-on-a-forms-categories) — Search shows and filters on a form's categories.
- [m17.1-subscription-billing-scope](ingredients.md#subscription-billing-scope) — Subscription billing research scope.
- [m17.2-closed-practice-warning](ingredients.md#the-closed-practice-warning) — The closed-practice warning on ingredients.
- [m17.2-no-controlled-substances](ingredients.md#no-controlled-substances-in-the-compendium) — No controlled substances in the compendium.
- [m17.3-ethical-ingredient-warnings](ingredients.md#the-ethical-warnings-on-ingredients) — Ethical warnings on ingredients.
- [mb.91-keeper-curated-vocabularies](ingredients.md#celestial-body-and-zodiac-as-keeper-curated-vocabularies) — Celestial body and zodiac are keeper-curated vocabularies.
- [mb.115-variant-substitutes-name-a-form](ingredients.md#a-forms-linked-substitute-names-a-form) — A form's linked substitute names a form.
- [mb.126-categories-on-the-combobox](ingredients.md#categories-are-picked-from-the-lists-box-not-a-wall-of-chips) — Categories are picked from the lists' combobox, not a wall of chips.
- [mb.131-closed-sets-on-the-combobox](ingredients.md#a-closed-set-wears-the-combobox) — A closed set wears the combobox.
- [mb.132-admin-deities](ingredients.md#the-admin-deity-pages-the-slug-the-traditions-delete-one-form) — Admin deity pages: the slug, the tradition's delete, one form.
- [mb.138-substitute-links](ingredients.md#a-substitute-is-a-row-that-links-an-ingredient-or-names-one) — A substitute is a row that links an ingredient or names one.
- [mb.151-references](ingredients.md#a-reference-is-one-source-kept-once-rendered-in-chicago-form) — A reference is one source, kept once, rendered in Chicago form.
- [mb.154-reference-form-field](ingredients.md#ingredientform-the-references-field) — The References field in IngredientForm.
- [mb.155-notes-and-bibliography](ingredients.md#the-page-cites-in-notes-and-a-bibliography) — Pages cite in notes and a bibliography.
- [mb.161-unknown-may-carry-a-formal-name](ingredients.md#an-unknown-classification-may-carry-a-formal-name) — An unknown classification may carry a formal name.
- [mb.162-compendium-holds-curated-values](ingredients.md#the-compendium-holds-curated-values-alone) — The compendium holds curated values alone.
- [mb.165-record-the-picked-vocabulary-row](ingredients.md#a-picked-form-or-deity-is-recorded-beside-its-text) — A picked form or deity is recorded beside its text.
- [mb.167-read-and-write-the-pick](ingredients.md#reading-and-writing-the-picked-form-and-deities) — Reading and writing the picked form and deities.
- [mb.174-no-repeat-list-entries](ingredients.md#one-rule-for-what-counts-as-a-repeat-list-entry) — One rule decides what counts as a repeat list entry.
- [mb.215-ingredient-variants](ingredients.md#an-ingredient-and-its-forms) — An ingredient's identity is its formal name; each form is a variant beneath it.
- [mb.240-compendium-seed](ingredients.md#a-researched-sourced-compendium-seed) — The compendium seed is researched and sourced.
- [mb.251-celestial-bodies](ingredients.md#the-planets-are-celestial-bodies-wherever-a-person-reads-them) — Planets read as Celestial Bodies everywhere a person sees them.
- [mw15-formal-name-in-the-compendium-only](ingredients.md#a-formal-name-is-required-in-the-compendium-only) — A formal name is required in the compendium only.
- [mw15-no-external-taxonomic-identifiers](ingredients.md#no-external-taxonomic-identifiers) — No external taxonomic identifiers are stored.

## Grimoire

Read [grimoire.md](grimoire.md).

- [m10.12-spell-builder-modal](grimoire.md#the-spell-builder-is-a-modal) — The spell builder is a modal.
- [m10.20-draft-visibility](grimoire.md#a-drafts-visibility-moves-either-way-a-complete-spells-only-widens) — A draft's visibility moves either way; a complete spell's only widens.
- [m13.1-spell-steps](grimoire.md#a-spells-recipe-is-one-ordered-list-of-steps) — A spell's recipe is one ordered list of steps.
- [m13.4-spell-workings](grimoire.md#a-working-is-the-record-of-one-making-in-three-tables) — A working records one making, in three tables.
- [m13.14-autosave](grimoire.md#long-forms-autosave-and-edits-of-one-row-can-conflict) — Long forms autosave, and edits of one row can conflict.
- [m13.17-new-spell-private](grimoire.md#a-new-spell-starts-private) — A new spell starts private.
- [mb.40-custom-spell-ingredients](grimoire.md#a-custom-one-off-spell-ingredient-is-a-row-in-spell_ingredients-not-a-table-of-its-own) — A one-off spell ingredient is a row in spell_ingredients.
- [mb.121-workspace-ingredients-review](grimoire.md#design-review-of-the-workspace-ingredients-page) — Design review of the workspace ingredients page.
- [mb.123-design-review-the-grimoire](grimoire.md#design-review-the-grimoire) — Design review of the grimoire.
- [pr1308-repeat-forms](grimoire.md#a-spell-may-lay-one-form-in-several-steps) — A spell may lay one form in several steps.
- [pr1308-step-note-retired](grimoire.md#the-step-note-is-retired-pr-1308) — The step note is retired.
- [wave-13-review-record](grimoire.md#wave-13-review-workings-editing-and-deleting-spells) — Wave 13 review: workings, editing and deleting spells.

## Support

Read [support.md](support.md).

- [m15-support-path-keeps-coven](support.md#a-support-request-keeps-the-coven-in-its-page) — A support request keeps the coven in its page.
- [m15-support-review](support.md#the-support-feature-revised-after-review) — The support feature as revised after review.
- [m15-support-review-research](support.md#support-feature-ux-accessibility-and-process-research) — Support feature UX, accessibility and process research.
- [m15.1-about](support.md#support-requests-kind-becomes-about) — Support requests: kind becomes about.
- [m15.1-plan](support.md#scope-a-support-form-reviewed-by-keepers-plan) — Open plan: scope a support form reviewed by keepers.
- [m15.1-support-form](support.md#a-support-form-reviewed-by-keepers) — A support form reviewed by keepers.
- [m15.2-privacy-policy-notes](support.md#the-privacy-policys-working-notes) — Working notes behind the privacy policy.
- [m15.3-disclaimer-notes](support.md#the-disclaimers-working-notes) — Working notes behind the disclaimer.
- [m15.4-code-of-ethics-notes](support.md#the-code-of-ethics-working-notes) — Working notes behind the code of ethics.
- [m15.46-daily-jobs-from-vercel-cron](support.md#daily-jobs-start-from-vercel-cron-and-no-job-sleeps-waiting) — Daily jobs start from Vercel Cron, and no job sleeps waiting.
- [m15.46-resolved-requests-close-and-anonymise](support.md#a-resolved-request-closes-on-its-own-and-a-closed-one-is-anonymised) — A resolved request closes on its own and a closed one is anonymised.
- [m15.48-mailed-link](support.md#a-signed-out-sender-reaches-their-request-by-a-mailed-link) — A signed-out sender reaches their request by a mailed link.
- [m15.48-plan](support.md#a-signed-out-sender-keeps-a-provisional-session-plan) — Open plan: a signed-out sender keeps a provisional session.
- [m15.49-job-mechanism](support.md#the-site-has-a-durable-job-mechanism) — The site has a durable job mechanism.
- [m15.50-mail-through-a-retried-job](support.md#mail-is-sent-through-a-retried-job) — Mail is sent through a retried job.
- [m15.57-terms-of-use-notes](support.md#the-terms-of-uses-working-notes) — Working notes behind the terms of use.
- [m15.58-gdpr-scope](support.md#what-gdpr-asks-of-sorrel--salt) — What GDPR asks of Sorrel & Salt.
- [m15.58-plan](support.md#mint-the-gdpr-build-tasks-now-build-nothing-plan) — Open plan for the GDPR scope.
- [m15.59-document-editor-scope](support.md#a-keeper-editor-for-the-sites-documents) — A keeper editor for the site's documents.
- [m15.59-plan](support.md#scope-a-keeper-editor-for-the-sites-documents-plan) — Open plan for the document editor.
- [m15.61-plan](support.md#scope-a-way-for-people-to-take-their-own-writing-with-them-plan) — Open plan for taking your own writing.
- [m15.61-take-your-writing-scope](support.md#a-way-for-people-to-take-their-own-writing-with-them) — People can take their own writing with them.
- [m15.79-agreement-covers-three-documents](support.md#agreeing-to-the-terms-covers-the-disclaimer-and-the-code-of-ethics) — Agreeing to the terms covers the disclaimer and the code of ethics.
- [m15.79-joint-document-mailing](support.md#one-joint-email-about-every-changed-document) — One joint email covers every changed document.
- [m17.2-plan](support.md#scope-the-closed-practice-warning-plan) — Open plan for the controlled-substances rule.
- [m17.3-plan](support.md#scope-the-ethical-warnings-on-ingredients-plan) — Open plan for the ethical warnings.
- [mb.175-help-articles](support.md#help-and-faq-articles-and-a-glossary-as-rows-a-keeper-edits) — Help articles and a glossary are rows a keeper edits.
- [mb.175-plan](support.md#scope-help-and-faq-articles-plan) — Open plan for help articles.
- [m17.18-promotional-email-consent](support.md#promotional-email-needs-recorded-consent-withdrawn-in-one-click) — Promotional email needs a recorded, unticked, withdrawable-in-one-click consent; no mail is promotional today.

## CI

Read [ci.md](ci.md).

- [m1.9-test-db-isolation](ci.md#test-database-isolation-per-worker-clone-vs-rolled-back-transaction) — Each test worker gets its own cloned database.
- [m1.11-e2e-reseed-without-seed](ci.md#e2e-reseeding-recreate-from-template-not-srcdbseed) — E2E reseeding recreates from a template, not from the seed.
- [m1.27-template-at-setup-not-in-image](ci.md#the-seeded-test-template-is-built-at-test-run-setup-not-baked-into-the-postgres-image) — The seeded test template is built at test-run setup, not baked in.
- [m9.1-stories-are-browser-flows](ci.md#stories-are-browser-flows) — A story is proved by a browser flow.
- [m9.17-specs-tag-their-stories](ci.md#specs-tag-the-stories-they-walk) — Playwright specs tag the stories they walk.
- [m11.18-faster-playwright-runs](ci.md#faster-playwright-runs-on-the-same-cpu-and-ram) — Faster Playwright levers need measurement; several are ruled out.
- [m11.23-pre-commit-changed-files](ci.md#pre-commit-on-changed-files-only-lint-staged) — Pre-commit runs lint-staged on changed files only.
- [m11.25-component-tests-run-on-happy-dom](ci.md#component-tests-run-on-happy-dom) — Component tests run on happy-dom.
- [m14.27-test-audit](ci.md#test-suite-audit-2026-10-27) — Test-suite audit findings.
- [mb.39-job-level-if-and-check-names](ci.md#a-job-level-if-renames-the-check-only-on-the-job-that-calls-a-reusable-workflow) — A job-level if renames the check only on the calling job.
- [mb.42-no-source-layer](ci.md#the-ci-images-carry-no-source-layer) — CI images carry no source layer.
- [mb.96-ci-vitest-job](ci.md#the-ci-vitest-job-dom-only-where-needed-githubs-runner) — The CI Vitest job: DOM only where needed, on GitHub's runner.
- [mb.112-server-per-worker](ci.md#each-playwright-worker-slot-gets-a-server-not-just-a-database) — Each Playwright worker slot gets a server as well as a database.
- [mb.191-coverage-provider](ci.md#the-coverage-provider-chosen-by-measurement) — The coverage provider was chosen by measurement.
- [mb.224-test-suite-cut](ci.md#cut-the-test-suite-to-functional-requirements) — The test suite is cut to functional requirements.
- [mb.235-test-reduction-lanes](ci.md#gate-time-reductions-not-taken) — Gate-time reductions not taken.
- [mb.275-oxlint-warnings](ci.md#oxlint-rules-that-are-errors) — Selected Oxlint rules are errors.

## UI

Read [ui.md](ui.md).

- [m6.14-global-sass-not-css-modules](ui.md#component-styling-is-global-sass-with-bem-names-not-css-modules) — Component styling is global Sass with BEM names.
- [m10.24-browser-floor](ui.md#the-browser-floor) — The browser floor is Baseline Widely Available.
- [m12.6-form-icons](ui.md#form-icons-on-the-group-with-a-generic) — Form icons sit on the group, with a generic one.
- [m12.9-undo-and-redo](ui.md#undo-and-redo-in-the-forms) — Forms get undo and redo.
- [m12.31-click-feedback-outside-forms](ui.md#feedback-from-a-click-outside-a-form) — Feedback from a click outside a form.
- [m12.33-loading-standard](ui.md#one-loading-standard-for-the-site) — One loading standard for the whole site.
- [m12.43-fewer-tooltips](ui.md#fewer-quieter-tooltips) — Fewer, quieter tooltips.
- [m12.53-storybook](ui.md#the-component-workshop-moves-from-ladle-to-storybook) — The component workshop moves from Ladle to Storybook.
- [m9.18-modals-open-with-a-pending-state](ui.md#admin-modals-open-at-once-with-a-loading-state) — Admin modals open at once and show a loading state.
- [mb.7-navigation](ui.md#the-navigation-shell-is-a-slim-bar-a-context-row-and-a-bottom-bar-on-a-phone) — A slim bar, a context row and a bottom bar on a phone.
- [mb.84-page-metadata](ui.md#robots-sitemap-page-metadata-and-structured-data) — Robots, sitemap, page metadata and structured data.
- [mb.116-design-review-sign-in](ui.md#design-review-the-sign-in-and-account-pages) — Design review of the sign-in and account pages.
- [mb.118-design-review-mail](ui.md#mail-design-review-sign-off) — Mail design review sign-off.
- [mb.119-design-review-coven](ui.md#design-review-the-coven-and-invitations) — Design review of the coven and invitations.
- [mb.120-design-review-public-compendium](ui.md#design-review-the-public-compendium-and-shared-ingredient-components) — Design review of the public compendium and shared ingredient components.

## Process

Read [process.md](process.md).

- [m10.30-dependency-audit](process.md#dependency-audit-and-its-follow-on-tasks) — Dependency moves are separate tasks recorded in dependencies.md.
- [m12.35-token-efficiency](process.md#token-efficiency-rules) — Short token-saving rules in CLAUDE.md; the long form is a doc.
- [m14.32-comment-guidelines](process.md#comments-say-how-the-code-works-and-nothing-else) — Comments say how the code works and nothing else.
- [m14.32-plan](process.md#comment-guidelines-and-the-cleanup-that-applies-them-plan) — Open plan: comment guidelines and the cleanup.
- [m14.4-plan](process.md#compendium-seed-as-markdown-files-with-a-hash-gated-update-path-a-formal-name-rule-and-curator-review-plan) — Open plan: compendium seed as markdown files.
- [m15.9-plan](process.md#the-demo-coven-every-account-is-seated-as-an-observer-at-sign-up-plan) — Plan: the demo coven seating.
- [mb.89-tracker-on-github](process.md#task-tracking-on-github-issues-and-projects) — Task tracking is on public GitHub Issues and Projects.
- [mb.142-doc-split-and-token-cost](process.md#docs-are-split-so-a-task-loads-only-what-it-touches) — Docs are split so a task loads only what it touches.
- [mw15-plan](process.md#the-v1-docs-close-out-with-m1112-and-mb90-plan) — Open plan: the v1 docs close-out.
- [mw15-rejected-stack-choices](process.md#stack-choices-that-were-weighed-and-rejected) — Stack choices weighed and rejected.
