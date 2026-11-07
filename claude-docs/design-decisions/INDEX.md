# Design decisions

One record per decision: what was decided, why, and what it rules out. Each line below states the decision.

## Auth

- [m2.9-granting-admin](m2.9-granting-admin.md) — An admin is granted and revoked by an existing admin, with a ledger row.
- [m5.8-revoking-workspace-creation](m5.8-revoking-workspace-creation.md) — A keeper can revoke workspace creation; coven already made stay, and a ledger records it.
- [m6.3-permission-statements](m6.3-permission-statements.md) — Permissions are per-role statements, never a role rank.
- [m9.19-admin-sees-user-covens](m9.19-admin-sees-user-covens.md) — A keeper reads which covens a user belongs to, by name and role only.
- [m10.26-invited-by](m10.26-invited-by.md) — Membership stores who invited it, copied from the invitation at acceptance.
- [m10.32-accept-from-the-landing](m10.32-accept-from-the-landing.md) — A coven invitation is accepted by id from the account page too.
- [m11.20-curator-role](m11.20-curator-role.md) — A third site role, curator, may use every curation screen and nothing on People.
- [m15.9-demo-coven](m15.9-demo-coven.md) — One demo coven exists on every environment; every sign-in earns an observer seat.
- [m15.17-invitation-cards](m15.17-invitation-cards.md) — A printed invitation card is a third invitation shape bound to no address.
- [m15.50-invitation-token-rotation](m15.50-invitation-token-rotation.md) — The invitation mail's job step mints a fresh token on each attempt.
- [m15.52-site-access-pause](m15.52-site-access-pause.md) — The site access pause closes sign-in for paused accounts and records the pause.
- [m15.55-coven-access-pause](m15.55-coven-access-pause.md) — The coven access pause refuses a paused member at the service check.
- [m15.66-member-pause-mail-read](m15.66-member-pause-mail-read.md) — The pause mail step reads a pause without a Membership proof.
- [m15.77-curator-nav](m15.77-curator-nav.md) — Curator and Keepers get separate navs.
- [m16.1-first-party-sign-in](m16.1-first-party-sign-in.md) — Password, passkey and second factor are in v1.
- [m16.4-repository-writes-outside-the-audit](m16.4-repository-writes-outside-the-audit.md) — Two repository files write outside withAudit because their tables have no audit columns.
- [mb.10-co-member-display-names](mb.10-co-member-display-names.md) — A deleted co-member reads under their last name.
- [mb.24-rls-role-split](mb.24-rls-role-split.md) — RLS role split with FORCE; superseded by MB.29, which defers RLS.
- [mb.30-organization-plugin](mb.30-organization-plugin.md) — Better Auth's organization plugin is not used for workspaces and invitations.
- [mb.54-email-page](mb.54-email-page.md) — The account email is set on its own page and verified before it counts.
- [mb.57-post-sign-in-landing](mb.57-post-sign-in-landing.md) — The post-sign-in landing lives at a fixed place after sign-in.
- [mb.61-email-verification-and-delivery](mb.61-email-verification-and-delivery.md) — Email verification is first-party; its signed token is neither hashed nor single-use.
- [mb.62-pause-ledger](mb.62-pause-ledger.md) — The admin-role-change pause is a ledger, not a settings row.
- [mb.71-link-a-second-sign-in-method](mb.71-link-a-second-sign-in-method.md) — A provider links to an account only inside a link flow begun under a session.
- [mb.74-better-auth-plugins](mb.74-better-auth-plugins.md) — Better Auth plugin roster: what lands before launch, what waits.
- [mb.177-admins-hold-workspace-creation](mb.177-admins-hold-workspace-creation.md) — Every keeper and curator holds canCreateWorkspace, enforced by a CHECK.
- [mb.194-privilege-ledger-by-trigger](mb.194-privilege-ledger-by-trigger.md) — One privilege ledger, written by a database trigger.
- [mb.201-two-tier-invitations](mb.201-two-tier-invitations.md) — Workspace and keeper invitations share one two-tier table.
- [mb.282-graphql-refuses-cross-site](mb.282-graphql-refuses-cross-site.md) — The GraphQL endpoint refuses cross-site writes.

## Data

- [m1.1-neon-branch-strategy](m1.1-neon-branch-strategy.md) — Staging is a persistent Neon branch; hotfix branches are ephemeral.
- [m1.21-seed-writes-through-its-handle](m1.21-seed-writes-through-its-handle.md) — The seed writes through the handle it is given, not withAudit.
- [m3.6-cursor-pagination-helper](m3.6-cursor-pagination-helper.md) — Every list pages through one cursor helper with a hard maximum page size.
- [m5.3-spells-keep-deleted-ingredients](m5.3-spells-keep-deleted-ingredients.md) — A spell keeps the ingredients it holds, deleted or not.
- [m6.11-members-without-a-loader](m6.11-members-without-a-loader.md) — A coven's members are read a coven at a time, without a loader.
- [mb.100-sql-follow-up](mb.100-sql-follow-up.md) — Correlated subqueries go through existsIn, not raw SQL.
- [mb.105-pager-counts](mb.105-pager-counts.md) — The pager counts, and the typeahead is the first page of a search.
- [mb.125-delete-names-rows-by-value](mb.125-delete-names-rows-by-value.md) — write.delete names rows by value; join tables stay hard-deleted.
- [mb.148-reads-on-the-write-transaction](mb.148-reads-on-the-write-transaction.md) — Reads that follow a write run on the write transaction.
- [mb.171-seed-keys](mb.171-seed-keys.md) — A seeded row keeps the key the seed gave it.
- [mb.252-table-rename](mb.252-table-rename.md) — A renamed table leaves a view under its old name.
- [mb.87-repository-split](mb.87-repository-split.md) — The repository is a folder of files behind one index.
- [mb.206-dry-review](mb.206-dry-review.md) — Shared helpers replace repeated validation and finder code.
- [postgres-driver-read-mode-and-channel-binding](postgres-driver-read-mode-and-channel-binding.md) — Postgres driver update: new read mode off, channel binding enforced.
- [mw15-slug-expiry-without-a-job](mw15-slug-expiry-without-a-job.md) — A slug's expiry is a date comparison; timed work is a durable job.
- [mw15-notes-keep-referential-integrity](mw15-notes-keep-referential-integrity.md) — Notes use real foreign keys and one generic history trigger.
- [mw15-bulk-add-partial-with-report](mw15-bulk-add-partial-with-report.md) — Bulk add is partial and returns a report.
- [mb.82-slug-takeover](mb.82-slug-takeover.md) — A taker ends a retired slug's redirect once confirmed.
- [mb.86-modular-monolith](mb.86-modular-monolith.md) — Domain modules with a guarded boundary.
- [mb.108-types-in-type-files](mb.108-types-in-type-files.md) — Types live in type-only files.

## GraphQL

- [m3.5-graphql-codegen](m3.5-graphql-codegen.md) — graphql-codegen types the browser's documents.
- [m3.8-react-cache-and-the-server-read-path](m3.8-react-cache-and-the-server-read-path.md) — Server components call services in React cache(); the browser uses GraphQL.
- [m3.10-me-query](m3.10-me-query.md) — me returns the signed-in user; scoped fields throw Forbidden.
- [m4.8-category-and-folk-name-loaders](m4.8-category-and-folk-name-loaders.md) — Child-row loaders filter by proofed scope in SQL, not after fetch.
- [m8.5-compendium-queries](m8.5-compendium-queries.md) — Compendium and ingredient queries read through scoped finders and loaders.
- [m10.31-graphql-request-dropped](m10.31-graphql-request-dropped.md) — A small fetch wrapper replaces graphql-request, holding graphql at 16.
- [mb.180-graphql-transport-half](mb.180-graphql-transport-half.md) — The GraphQL file holds the transport's half of the work.
- [mb.80-public-compendium](mb.80-public-compendium.md) — The compendium is public and indexable; nothing workspace-scoped follows it out.

## Ingredients

- [m5.5-admin-compendium](m5.5-admin-compendium.md) — The admin compendium page: its size, modal and lookups.
- [m5.6-admin-categories](m5.6-admin-categories.md) — Admin categories page: delete, list read and modal.
- [m5.6a-admin-forms](m5.6a-admin-forms.md) — Admin forms page: the slug, the redirect, the stale pick.
- [m5.6b-admin-groups](m5.6b-admin-groups.md) — Admin group pages: where a deleted group's rows go.
- [m8.16-add-ingredient-modal-scoping](m8.16-add-ingredient-modal-scoping.md) — Add Ingredient uses a native Coven select and plain onTouched validation.
- [m8.17-editing-a-coven-ingredient](m8.17-editing-a-coven-ingredient.md) — Stewards and practitioners edit and Link their coven's own entries.
- [m9.3-create-stock-refuses-held-form](m9.3-create-stock-refuses-held-form.md) — Starting a jar of a form the coven already holds is refused.
- [m9.6-coven-ingredients-page](m9.6-coven-ingredients-page.md) — The coven's Ingredients page lists its own entries and named compendium entries.
- [m9.9-edit-stock-from-the-card](m9.9-edit-stock-from-the-card.md) — Stock is edited from the ingredient card.
- [m10.19-stock-off-the-builder](m10.19-stock-off-the-builder.md) — Stock is taken off the spell builder.
- [m11.22-search-facets](m11.22-search-facets.md) — Search facets take lists and a toxic setting.
- [m12.4-filter-layout](m12.4-filter-layout.md) — Search filters sit together in one layout.
- [m12.13-cupboard-names-the-compendium](m12.13-cupboard-names-the-compendium.md) — A coven's cupboard names the compendium entry rather than hiding it.
- [m12.24-retired-entry-stays-readable](m12.24-retired-entry-stays-readable.md) — A retired entry stays readable to the covens that use it.
- [m12.42-linking-goes-one-way](m12.42-linking-goes-one-way.md) — A coven annotates a compendium entry or makes it its own; linking goes one way.
- [m12.52-facet-sort-order](m12.52-facet-sort-order.md) — Each search facet sorts its values by its own rule.
- [m14.2-physical-uses](m14.2-physical-uses.md) — How an ingredient records its physical uses.
- [m14.4-compendium-markdown-files](m14.4-compendium-markdown-files.md) — Compendium seed is markdown files with a formal-name rule and curator review.
- [m14.24-plan](m14.24-plan.md) — Open plan: the sourcing score, its facts, weights and data.
- [m14.29-no-endangered-species](m14.29-no-endangered-species.md) — No endangered species in the compendium.
- [m14.35-curators-see-hidden-entry-pages](m14.35-curators-see-hidden-entry-pages.md) — A curator or keeper still sees a hidden entry's page.
- [m14.38-form-categories-in-search](m14.38-form-categories-in-search.md) — Search shows and filters on a form's categories.
- [m17.1-subscription-billing-scope](m17.1-subscription-billing-scope.md) — Subscription billing research scope.
- [m17.2-closed-practice-warning](m17.2-closed-practice-warning.md) — The closed-practice warning on ingredients.
- [m17.2-no-controlled-substances](m17.2-no-controlled-substances.md) — No controlled substances in the compendium.
- [m17.3-ethical-ingredient-warnings](m17.3-ethical-ingredient-warnings.md) — Ethical warnings on ingredients.
- [mb.91-keeper-curated-vocabularies](mb.91-keeper-curated-vocabularies.md) — Celestial body and zodiac are keeper-curated vocabularies.
- [mb.115-variant-substitutes-name-a-form](mb.115-variant-substitutes-name-a-form.md) — A form's linked substitute names a form.
- [mb.126-categories-on-the-combobox](mb.126-categories-on-the-combobox.md) — Categories are picked from the lists' combobox, not a wall of chips.
- [mb.131-closed-sets-on-the-combobox](mb.131-closed-sets-on-the-combobox.md) — A closed set wears the combobox.
- [mb.132-admin-deities](mb.132-admin-deities.md) — Admin deity pages: the slug, the tradition's delete, one form.
- [mb.138-substitute-links](mb.138-substitute-links.md) — A substitute is a row that links an ingredient or names one.
- [mb.151-references](mb.151-references.md) — A reference is one source, kept once, rendered in Chicago form.
- [mb.154-reference-form-field](mb.154-reference-form-field.md) — The References field in IngredientForm.
- [mb.155-notes-and-bibliography](mb.155-notes-and-bibliography.md) — Pages cite in notes and a bibliography.
- [mb.161-unknown-may-carry-a-formal-name](mb.161-unknown-may-carry-a-formal-name.md) — An unknown classification may carry a formal name.
- [mb.162-compendium-holds-curated-values](mb.162-compendium-holds-curated-values.md) — The compendium holds curated values alone.
- [mb.165-record-the-picked-vocabulary-row](mb.165-record-the-picked-vocabulary-row.md) — A picked form or deity is recorded beside its text.
- [mb.167-read-and-write-the-pick](mb.167-read-and-write-the-pick.md) — Reading and writing the picked form and deities.
- [mb.174-no-repeat-list-entries](mb.174-no-repeat-list-entries.md) — One rule decides what counts as a repeat list entry.
- [mb.215-ingredient-variants](mb.215-ingredient-variants.md) — An ingredient's identity is its formal name; each form is a variant beneath it.
- [mb.240-compendium-seed](mb.240-compendium-seed.md) — The compendium seed is researched and sourced.
- [mb.251-celestial-bodies](mb.251-celestial-bodies.md) — Planets read as Celestial Bodies everywhere a person sees them.
- [mw15-formal-name-in-the-compendium-only](mw15-formal-name-in-the-compendium-only.md) — A formal name is required in the compendium only.
- [mw15-no-external-taxonomic-identifiers](mw15-no-external-taxonomic-identifiers.md) — No external taxonomic identifiers are stored.

## Grimoire

- [m10.12-spell-builder-modal](m10.12-spell-builder-modal.md) — The spell builder is a modal.
- [m10.20-draft-visibility](m10.20-draft-visibility.md) — A draft's visibility moves either way; a complete spell's only widens.
- [m13.1-spell-steps](m13.1-spell-steps.md) — A spell's recipe is one ordered list of steps.
- [m13.4-spell-workings](m13.4-spell-workings.md) — A working records one making, in three tables.
- [m13.14-autosave](m13.14-autosave.md) — Long forms autosave, and edits of one row can conflict.
- [m13.17-new-spell-private](m13.17-new-spell-private.md) — A new spell starts private.
- [mb.40-custom-spell-ingredients](mb.40-custom-spell-ingredients.md) — A one-off spell ingredient is a row in spell_ingredients.
- [mb.121-workspace-ingredients-review](mb.121-workspace-ingredients-review.md) — Design review of the workspace ingredients page.
- [mb.123-design-review-the-grimoire](mb.123-design-review-the-grimoire.md) — Design review of the grimoire.
- [pr1308-repeat-forms](pr1308-repeat-forms.md) — A spell may lay one form in several steps.
- [pr1308-step-note-retired](pr1308-step-note-retired.md) — The step note is retired.
- [wave-13-review-record](wave-13-review-record.md) — Wave 13 review: workings, editing and deleting spells.

## Support

- [m15-support-path-keeps-coven](m15-support-path-keeps-coven.md) — A support request keeps the coven in its page.
- [m15-support-review](m15-support-review.md) — The support feature as revised after review.
- [m15-support-review-research](m15-support-review-research.md) — Support feature UX, accessibility and process research.
- [m15.1-about](m15.1-about.md) — Support requests: kind becomes about.
- [m15.1-plan](m15.1-plan.md) — Open plan: scope a support form reviewed by keepers.
- [m15.1-support-form](m15.1-support-form.md) — A support form reviewed by keepers.
- [m15.2-privacy-policy-notes](m15.2-privacy-policy-notes.md) — Working notes behind the privacy policy.
- [m15.3-disclaimer-notes](m15.3-disclaimer-notes.md) — Working notes behind the disclaimer.
- [m15.4-code-of-ethics-notes](m15.4-code-of-ethics-notes.md) — Working notes behind the code of ethics.
- [m15.46-daily-jobs-from-vercel-cron](m15.46-daily-jobs-from-vercel-cron.md) — Daily jobs start from Vercel Cron, and no job sleeps waiting.
- [m15.46-resolved-requests-close-and-anonymise](m15.46-resolved-requests-close-and-anonymise.md) — A resolved request closes on its own and a closed one is anonymised.
- [m15.48-mailed-link](m15.48-mailed-link.md) — A signed-out sender reaches their request by a mailed link.
- [m15.48-plan](m15.48-plan.md) — Open plan: a signed-out sender keeps a provisional session.
- [m15.49-job-mechanism](m15.49-job-mechanism.md) — The site has a durable job mechanism.
- [m15.50-mail-through-a-retried-job](m15.50-mail-through-a-retried-job.md) — Mail is sent through a retried job.
- [m15.57-terms-of-use-notes](m15.57-terms-of-use-notes.md) — Working notes behind the terms of use.
- [m15.58-gdpr-scope](m15.58-gdpr-scope.md) — What GDPR asks of Sorrel & Salt.
- [m15.58-plan](m15.58-plan.md) — Open plan for the GDPR scope.
- [m15.59-document-editor-scope](m15.59-document-editor-scope.md) — A keeper editor for the site's documents.
- [m15.59-plan](m15.59-plan.md) — Open plan for the document editor.
- [m15.61-plan](m15.61-plan.md) — Open plan for taking your own writing.
- [m15.61-take-your-writing-scope](m15.61-take-your-writing-scope.md) — People can take their own writing with them.
- [m15.79-agreement-covers-three-documents](m15.79-agreement-covers-three-documents.md) — Agreeing to the terms covers the disclaimer and the code of ethics.
- [m15.79-joint-document-mailing](m15.79-joint-document-mailing.md) — One joint email covers every changed document.
- [m17.2-plan](m17.2-plan.md) — Open plan for the controlled-substances rule.
- [m17.3-plan](m17.3-plan.md) — Open plan for the ethical warnings.
- [mb.175-help-articles](mb.175-help-articles.md) — Help articles and a glossary are rows a keeper edits.
- [mb.175-plan](mb.175-plan.md) — Open plan for help articles.

## CI

- [m1.9-test-db-isolation](m1.9-test-db-isolation.md) — Each test worker gets its own cloned database.
- [m1.11-e2e-reseed-without-seed](m1.11-e2e-reseed-without-seed.md) — E2E reseeding recreates from a template, not from the seed.
- [m1.27-template-at-setup-not-in-image](m1.27-template-at-setup-not-in-image.md) — The seeded test template is built at test-run setup, not baked in.
- [m9.1-stories-are-browser-flows](m9.1-stories-are-browser-flows.md) — A story is proved by a browser flow.
- [m9.17-specs-tag-their-stories](m9.17-specs-tag-their-stories.md) — Playwright specs tag the stories they walk.
- [m11.18-faster-playwright-runs](m11.18-faster-playwright-runs.md) — Faster Playwright levers need measurement; several are ruled out.
- [m11.23-pre-commit-changed-files](m11.23-pre-commit-changed-files.md) — Pre-commit runs lint-staged on changed files only.
- [m11.25-component-tests-run-on-happy-dom](m11.25-component-tests-run-on-happy-dom.md) — Component tests run on happy-dom.
- [m14.27-test-audit](m14.27-test-audit.md) — Test-suite audit findings.
- [mb.39-job-level-if-and-check-names](mb.39-job-level-if-and-check-names.md) — A job-level if renames the check only on the calling job.
- [mb.42-no-source-layer](mb.42-no-source-layer.md) — CI images carry no source layer.
- [mb.96-ci-vitest-job](mb.96-ci-vitest-job.md) — The CI Vitest job: DOM only where needed, on GitHub's runner.
- [mb.112-server-per-worker](mb.112-server-per-worker.md) — Each Playwright worker slot gets a server as well as a database.
- [mb.191-coverage-provider](mb.191-coverage-provider.md) — The coverage provider was chosen by measurement.
- [mb.224-test-suite-cut](mb.224-test-suite-cut.md) — The test suite is cut to functional requirements.
- [mb.235-test-reduction-lanes](mb.235-test-reduction-lanes.md) — Gate-time reductions not taken.
- [mb.275-oxlint-warnings](mb.275-oxlint-warnings.md) — Selected Oxlint rules are errors.

## UI

- [m6.14-global-sass-not-css-modules](m6.14-global-sass-not-css-modules.md) — Component styling is global Sass with BEM names.
- [m10.24-browser-floor](m10.24-browser-floor.md) — The browser floor is Baseline Widely Available.
- [m12.6-form-icons](m12.6-form-icons.md) — Form icons sit on the group, with a generic one.
- [m12.9-undo-and-redo](m12.9-undo-and-redo.md) — Forms get undo and redo.
- [m12.31-click-feedback-outside-forms](m12.31-click-feedback-outside-forms.md) — Feedback from a click outside a form.
- [m12.33-loading-standard](m12.33-loading-standard.md) — One loading standard for the whole site.
- [m12.43-fewer-tooltips](m12.43-fewer-tooltips.md) — Fewer, quieter tooltips.
- [m12.53-storybook](m12.53-storybook.md) — The component workshop moves from Ladle to Storybook.
- [m9.18-modals-open-with-a-pending-state](m9.18-modals-open-with-a-pending-state.md) — Admin modals open at once and show a loading state.
- [mb.7-navigation](mb.7-navigation.md) — A slim bar, a context row and a bottom bar on a phone.
- [mb.84-page-metadata](mb.84-page-metadata.md) — Robots, sitemap, page metadata and structured data.
- [mb.116-design-review-sign-in](mb.116-design-review-sign-in.md) — Design review of the sign-in and account pages.
- [mb.118-design-review-mail](mb.118-design-review-mail.md) — Mail design review sign-off.
- [mb.119-design-review-coven](mb.119-design-review-coven.md) — Design review of the coven and invitations.
- [mb.120-design-review-public-compendium](mb.120-design-review-public-compendium.md) — Design review of the public compendium and shared ingredient components.

## Process

- [m10.30-dependency-audit](m10.30-dependency-audit.md) — Dependency moves are separate tasks recorded in dependencies.md.
- [m12.35-token-efficiency](m12.35-token-efficiency.md) — Short token-saving rules in CLAUDE.md; the long form is a doc.
- [m14.32-comment-guidelines](m14.32-comment-guidelines.md) — Comments say how the code works and nothing else.
- [m14.32-plan](m14.32-plan.md) — Open plan: comment guidelines and the cleanup.
- [m14.4-plan](m14.4-plan.md) — Open plan: compendium seed as markdown files.
- [m15.9-plan](m15.9-plan.md) — Plan: the demo coven seating.
- [mb.89-tracker-on-github](mb.89-tracker-on-github.md) — Task tracking is on public GitHub Issues and Projects.
- [mb.142-doc-split-and-token-cost](mb.142-doc-split-and-token-cost.md) — Docs are split so a task loads only what it touches.
- [mw15-plan](mw15-plan.md) — Open plan: the v1 docs close-out.
- [mw15-rejected-stack-choices](mw15-rejected-stack-choices.md) — Stack choices weighed and rejected.
