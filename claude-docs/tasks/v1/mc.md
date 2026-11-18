## MC — Cleanup

MC ids hold grouped clean-up work from five audits: M17.8's duplicated-code audit ([`audits/dry.md`](../audits/dry.md)) for MC.1 → MC.9, and M17.10's test performance audit ([`audits/test-performance.md`](../audits/test-performance.md)) for MC.10 → MC.14, and M17.7's design and UX audit ([`audits/design-ux.md`](../audits/design-ux.md)) for MC.15 → MC.27, and M17.9's accessibility audit ([`audits/accessibility.md`](../audits/accessibility.md)) for MC.28 → MC.32 and additions to MC.20 and MC.21, and M17.6's search engine audit ([`audits/seo.md`](../audits/seo.md)) for MC.33 → MC.43. They sit in the Z. Cleanup milestone and are numbered on their own, so the waves don't renumber.

**MC.1 — Tidy the Test Support and Scripts** · 16.25h

_Story:_ As a developer, I want the test harness written once, so that a change to a mock, a wrapper or a helper is made in one place.

Minted from the duplicated-code audit (M17.8) as one of its grouped clean-up tasks. Findings: D-39, D-40, D-42, D-62, D-74, D-101, D-121, D-175, D-193, D-59, D-95, D-100, D-148, D-166, S-1, S-2, S-3, S-4, S-7, D-249, D-250, D-251, D-252, D-253; each is in `claude-docs/audits/dry.md`. Test files repeat the router mock, the query-client render wrapper and the request-session and mail mocks dozens of times; e2e specs copy small helpers such as `authorOf`, `openFilters`, the invitation-flow steps, the page-side GraphQL `fetch`, the sign-up form fill and the sign-in provider assertions; and several guards each rebuild the same allowed-set check, probe test, exemption list and file walker. One shared piece each replaces the copies, and unused helpers in `tests/support/` are removed. The lint rules in `lint/source-sweeps.js`, which are repo tooling like the scripts, repeat their allowlist reporter, attribute lookup and file gate (D-253). The CI workflows and scripts staging added also repeat code: the three Vitest part jobs, the failing-test list and ANSI stripping, `setOutput` and the flaky note (S-1 to S-4), and the task-board script repeats its GraphQL arguments, item selection and status and estimate writes, with the branch-id regex rebuilt in the progress tally (S-7).

_Acceptance criteria:_

- A shared router mock, query-client render wrapper and request-session and mail mocks exist under `tests/support/`, the 80, 61 and remaining inline copies named in D-39, D-40 and D-42 use them, and a guard refuses a new inline copy of each
- Each e2e helper named in D-62, D-74, D-101, D-121, D-175 and D-193 exists once in the shared e2e support files, and every spec that held a copy imports it
- One guard helper provides the allowed-set check, the probe test and the file walker, and the guards named in D-59, D-100 and D-166 use it
- The `SignInPanel/in-dialog` test uses the shared password-form harness (D-95), and exports in `tests/support/` with no importer are removed (D-148)
- The about 15 test files that still write `http://localhost:3000` or `http://localhost:8000` inline outside a `const ORIGIN` (for example the support service tests' `origin: async () => …` callbacks) use `ORIGIN` from `tests/support/constants.ts`, and `tests/guards/test-constants.test.ts` refuses a new inline one
- The three Vitest part jobs share one composite action (S-1), the failing-test list and `stripAnsi` have one home that both summarisers import (S-2), and `setOutput` and the flaky note are each defined once (S-3, S-4)
- The task-board GraphQL arguments, item selection and status and estimate writes, and the `tally.mjs` branch-id regex, are each written once (S-7), with tests added first for the writers that had none
- The e2e specs touched pass, run with the placeholder secret on the command line
- The component tests use shared `save()`, `submitForm()` and `fill` helpers from `tests/support/interact.tsx` and `expectSummaryLinksTo`, a guard refuses a local `const save =`, `const type =` or `const fill =` in a component test (D-252), the email field contract is tested once (D-251), and the duplicate error-reference block and the literal 80 and 81 coven-name limits in the tests use one block and `COVEN_NAME_LIMIT` (D-249, D-250)
- `lint/source-sweeps.js` has one allowlist-rule helper, one attribute lookup and literal reader and one component-file gate, and the rules named in D-253 use them with the tests under `tests/lint/` passing unchanged
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.2 — Share Page and Route Building** · 13h

_Story:_ As a developer, I want pages, paths and routes built from shared pieces, so that a route or layout change is made once.

Minted from the duplicated-code audit (M17.8) as one of its grouped clean-up tasks. Findings: D-41, D-83, D-92, D-114, D-160, D-208, D-58, D-78, D-90, D-115, D-169, D-170, D-172, D-49, D-117, D-171, D-184, D-185, D-209, D-50, D-55, D-116, D-52, D-104, D-183, D-239; each is in `claude-docs/audits/dry.md`. About 40 places build `/coven/<slug>/...` addresses by hand. The keepers and curator areas repeat one layout, user-dialog block, set of types and session guards. Pages read search params and build paging cursors by hand. Lede text, tab panels, notice text and the narrow-panel scaffold are written in a page and its skeleton. Four public document pages, three cron route handlers and `src/lib/utc.ts` repeat blocks, and coven access flags, jar-row conversion and card-category mapping are computed in more than one place. One shared piece each replaces them.

_Acceptance criteria:_

- A coven path builder exists in `src/lib` with a unit test, every hand-built `/coven/<slug>/...` address named in D-41 uses it, and a guard refuses a new one
- The two keepers and curator layouts are one file (D-114), the user-dialog block, the group and value types and the two session guards each exist once (D-83, D-208), the group and value dialogs share one props type and stay two files, as each wraps a different form (D-92), and shared admin files live outside `curator/` (D-160)
- Pages use `single()`, `trimmed` and the paging helpers instead of hand-written reads (D-58, D-78), one boolean search-parameter reader replaces the six copies (D-90), and `readBatches`, `readArrivals`, `readLedgerPage` and `cursorOf` are simplified (D-115, D-172)
- `src/app` uses `@/` imports and the mail glue builds its origin path once (D-169, D-170)
- The lede text is written once for a page and its skeleton (D-49), the account tab panel section and narrow-panel scaffold are shared components (D-117, D-185), and the help back-bar markup, the demo notice text and the `PublicLayout` branch markup each exist once (D-171, D-184, D-209)
- The public document pages share one page piece (D-55) and still render the same, the three cron handlers share one function (D-116), and `src/lib/utc.ts` has one `formatToParts` reader (D-50)
- The `rolePermits` flags are computed in one function used by all callers (D-52), and jar-row quantity conversion and the card-category mapping each exist once (D-104, D-183)
- Authorisation still lives in services, not pages, and the pages touched pass their tests
- The help front's wrapper is one shell used by the page and its skeleton (D-239), and the "Add Ingredient", "New Spell" and spell section titles are exported constants imported by the page, its skeleton and `AppShell` (D-49)
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.3 — Share Repository Queries** · 6.75h

_Story:_ As a developer, I want repository filters and predicates defined once, so that a fix to a filter reaches both the list and its count.

Minted from the duplicated-code audit (M17.8) as one of its grouped clean-up tasks. Findings: D-91, D-113, D-135, D-136, D-206, D-47, D-75, D-103, D-159, D-205, D-60, D-156, D-158, D-199, D-27 (part not fixed); each is in `claude-docs/audits/dry.md`. Page and count finders repeat their filter in every repository file and drift between list and count. Repository files repeat the `existsIn` pattern, about 59 empty-id early returns, the "card accepted by this user" test, the user-search test and the LIKE escape. The pause tables' repository files are near-copies with repeated stand-in user ids, `as never` inserts, index-name literals and constants. The facet-count twins `categoryFacet` and `findGrimoireCategoryCounts` share one query shape that D-27's fix left in place. A filter or helper is defined once and used by every caller.

_Acceptance criteria:_

- Each filter is defined once and used by its page and count finders (D-136, D-91, D-135), and the public-reply predicate and the help sort and filter clauses exist once (D-113, D-206)
- One `existsIn` helper pattern is used at the sites in D-47, and one empty-id helper replaces the early returns (D-75), with a guard against a new bare one
- The accepted-card test, user-search predicate and LIKE escape exist once (D-103, D-159, D-205)
- The pause repository files share one implementation (D-60), and the stand-in user id list, the `applyAudit` inserts, the index names and the constants each exist once (D-156, D-158, D-199)
- The facet-count twins `categoryFacet` (`ingredient-facets.ts`) and `findGrimoireCategoryCounts` (`grimoire.ts`) share one query shape (D-27, part not fixed), next to `categoryArms` in `category-arms.ts`
- Soft-delete filtering stays in the repository, and the repository and pause tests for the files touched pass
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.4 — Share Service and Schema Blocks** · 14h

_Story:_ As a developer, I want service sequences, input handling and schema declarations written once, so that a rule change lands everywhere it applies.

Minted from the duplicated-code audit (M17.8) as one of its grouped clean-up tasks. Findings: D-65, D-67, D-96, D-180, D-204, D-66, D-112, D-122, D-123, D-167, D-182, D-202, D-203, D-207, D-43, D-63, D-77, D-149, D-198, D-201, D-45, D-131, D-132, D-134, D-151, D-196, D-200, D-102, D-111, D-124, D-133, D-152, D-153, D-197, D-70, D-87, D-89, D-168, D-179, D-181, D-245, D-246; each is in `claude-docs/audits/dry.md`. Services repeat create and delete sequences, slug moves, cupboard insertion, the uuid guard, trim-then-empty handling, loader unwrapping, the mail-job family (copied five times), the reopen-on-sender-message update, the token hash, the "not a member" refusal, the unit-compatibility rule, the invitable roles and inline validation errors. Correspondence columns, the not-blank CHECK SQL and the quantity column are declared several times in the schema. One shared piece each replaces them, with no change to the database schema.

_Acceptance criteria:_

- The vocabulary create and delete sequences exist once (D-67), the "no such compendium entry" and curator guard sequence and the filter transform shapes exist once (D-65, D-96), and suggestion wrappers share the reader lookup and treat a blank query the same way (D-180, D-204)
- The slug-move block, the cupboard insertion block and the spell field list each exist once (D-122, D-123, D-112), as do the readable-spell parent check and the working report mapping (D-66, D-202)
- Entry assembly, tier-2 suggestion selects, distinct linked ids and the workspace-slug lookups exist once (D-203, D-207, D-167, D-182)
- One id-guard helper replaces the `RowId.safeParse(x).success` sites (D-43), and the trim-to-undefined helper, the loader unwrap, the case-fold helper, the batch refusal and the site-admin list sequence each exist once (D-63, D-77, D-149, D-198, D-201)
- One mail-job implementation serves the five copies (D-45), the reopen update, reply insert, token hash and notifier interface exist once (D-131, D-134, D-196), and the cleanup and retention coordinators share one implementation (D-132)
- Sender tier and dialog kind lists and the confirm-email refusals exist once (D-151, D-200), and hashes of stored tokens stay identical
- The not-a-member refusal and member-removal sequence, the unit-compatibility rule and the invitable roles are each defined once (D-102, D-111, D-124), inline `ValidationError` constructions use `fieldRefusal` (D-133), and the document, help and role noun blocks exist once (D-152, D-153, D-197)
- Shared declarations replace the correspondence, not-blank CHECK and quantity column copies (D-70, D-87, D-89), and `db:generate` produces no migration
- The GraphQL ref type and `tierScope` copies and the stale comments are removed (D-179, D-181, D-168)
- Authorisation checks stay in services, and the vocabulary, compendium, ingredient, grimoire, coven, identity and support service tests for the files touched pass
- `adminDeclaration` and `parsePauseNote` share one trimmed-note parser (D-245), and `spell-step.ts` and `SummariesInput` use `requiredRowId`, with `SummariesInput` moved into the documents module's `validation/` (D-246)
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.5 — Share Form and Failure Handling** · 12.75h

_Story:_ As a developer, I want form state, lists and field shells written once, so that a fix to a form pattern reaches every form.

Minted from the duplicated-code audit (M17.8) as one of its grouped clean-up tasks. Findings: D-44, D-79, D-46, D-106, D-56, D-137, D-154, D-162, D-82, D-107, D-108, D-150, D-215, D-216, D-38 (part not fixed), D-228, D-229, D-230, D-231, D-232, D-233; each is in `claude-docs/audits/dry.md`. Four local failure interfaces describe Better Auth results and forms hand-write their sending and failure state. GroupList, GroupedValueList, AdminInvitations and AdminCards rebuild one list, and NameForm and RenameWorkspaceForm copy each other. Three support reply forms are near-identical, seven request status marks are separate tips and the "until X" wording is built in five places. Text fields hand-build their shell, the field-message lookup is repeated eight times and the `zodResolver` cast is written six ways. The three correspondence field blocks (CupboardEntryForm, IngredientForm and its variants) still repeat. One shared piece each replaces them.

_Acceptance criteria:_

- One Better Auth failure type and reader replace the four interfaces (D-44), and one form sending and failure hook replaces the hand-written state in the forms named in D-79
- One list component serves the callers named in D-46, and one single-name form serves NameForm and RenameWorkspaceForm (D-106)
- One reply form serves the three support callers (D-56), one status mark component serves the seven (D-137), and the "until X" wording and the deleted-account and signed-out sender literals exist once (D-154, D-162)
- One plain text field wrapper replaces the hand-built ones (D-108), and the field-message lookup, the `zodResolver` cast and the radio input exist once (D-107, D-150, D-215)
- The `CupboardEntryForm` field names exist once and `undo` and `redo` share an implementation (D-82, D-216)
- A `CorrespondenceFields` component serves the three correspondence field blocks where they truly match, and the label stays "Elements" (D-38, part not fixed); the places where they differ (deities, hints, the per-field source `action`) stay as props
- The component tests for the forms and callers touched pass
- One email field in the Field set and one submit-time helper serve the six forms in D-228. `ReasonField` owns its error state (D-229). A plain-state date field serves the four forms in D-230, one suggest field replaces the two in D-231, a plain-state form hook holds the problems and first-invalid focus (D-232), and a support-form hook serves `SupportForm` and `SignedOutSupportForm` (D-233). The merged reply form (D-56) has one discard rule, one length check and one Notice kind, and the single-name form hook (D-106) also serves `Passkeys/rename-fields.tsx` and validates through a schema
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.6 — Share Hooks, Menus and Hover Tips** · 9.25h

_Story:_ As a developer, I want hover tips, menus and small hooks written once, so that a fix to dismissal, floating position or tips reaches every component that uses it.

Minted from the duplicated-code audit (M17.8) as one of its grouped clean-up tasks. Findings: D-68, D-85, D-125, D-174, D-222, D-80, D-118, D-140, D-223, D-71, D-76, D-119, D-72, D-81, D-88, D-161, D-163, D-188, D-213, D-214, D-20 (part not fixed), D-240; each is in `claude-docs/audits/dry.md`. Four hover-tip wrappers on `useTip`, icon-only button boilerplate, three "more" menus, floating-ui `autoUpdate` wired by hand in four effects, five `useOpenModalClick` and `ModalLink` pairs, the click-feedback action, delete and remove mutation hooks and several small hooks (callback-ref merge, two `Day` components, lazy wrappers, the tablet band, the back-forward cache effect) repeat the same code. The Escape handling in MenuButton, FacetPanel, Combobox, the HelpOutline guides bar and InfoTip also repeats after D-20's outside-press fix. One hook or component each replaces them.

_Acceptance criteria:_

- One tip wrapper replaces the four in UserList (D-68) and the hand-wired one in `category-more` (D-125), and the icon-only button boilerplate, the SVG wrapper and the magnifier submit button each exist once (D-174, D-222, D-85)
- One more-menu piece serves the three menus (D-118), one `autoUpdate` hook replaces the four effects (D-140), and one modal-link piece replaces the five pairs (D-80) while the Modal effect shape is shared (D-223)
- One click-feedback action replaces the copies in D-76, one delete and remove mutation hook serves the callers in D-71, and the navigate-to-landing-and-refresh step exists once (D-119)
- A callback-ref merge hook, a `Day` component and a lazy wrapper factory each exist once (D-72, D-81, D-88), as do the tablet band hook, the `pageshow` effect and the repeat-announcement helper (D-161, D-163, D-214), and the 99-cap text and `isAtPath` use are shared (D-188, D-213)
- The Escape `onKeyDown` handlers and listeners in MenuButton, FacetPanel, Combobox, HelpOutline's guides bar and InfoTip's `use-tip` use the shared dismissal in `src/lib/use-dismiss.ts` (D-20, part not fixed), and `tests/guards/dismissal.test.ts` refuses a new hand-written one
- The component tests for the callers touched pass
- One dialog add action serves the Ingredients and Grimoire pages (D-240), and `HelpSearchForm` renders `SearchField` or shares its input attributes (D-85)
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.7 — Share Text and Label Helpers** · 6h

_Story:_ As a developer, I want class-name joining, labels and wording built by shared helpers, so that a wording or label change is made once.

Minted from the duplicated-code audit (M17.8) as one of its grouped clean-up tasks. Findings: D-61, D-51, D-53, D-54, D-64, D-97, D-109, D-141, D-142, D-164, D-210, D-218, D-241, D-242, D-247, D-248; each is in `claude-docs/audits/dry.md`. A class-name joiner is hand-written in about nine components with four shapes. The "has text" check, the untitled-spell name, singular and plural ternaries and value-to-label lookups are hand-written in many components. CompendiumList and `buildSearchSentence` re-describe filters in words beside existing builders, and the unverified-email sentence, invitation-path pattern and calendar-day pattern are written several times. One shared helper each replaces them.

_Acceptance criteria:_

- One class-name joiner exists in `src/lib` with a unit test, the nine components named in D-61 use it, and a guard refuses a new hand-written joiner
- One has-text helper replaces `said` and the inline checks (D-51), and one untitled-spell name function replaces the ten copies (D-53)
- Every singular and plural ternary uses `plural()` (D-54), and one label lookup helper replaces the eleven copies (D-64)
- The compendium filter sentence uses the existing builders (D-97), and `buildSearchSentence` has one clause builder (D-218)
- The unverified-email sentence, invitation-path regex, calendar-day regex and `joinList` exist once (D-141, D-142, D-164, D-109), and the pager label union exists once (D-210)
- Combobox imports its `autoCapitalize`, `enterKeyHint` and `format` types from the Field set (D-241), `OPENABLE_ADDRESS` is built from `LINK_SCHEMES` with a test that proves it (D-242), and `reference-format.ts` uses `trimEnds` and `category-group.ts` one hex message (D-247, D-248)
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.8 — Share Feature Components** · 13.25h

_Story:_ As a developer, I want admin, ingredient, spell, date and help components built from shared pieces, so that a fix to a shared piece reaches every screen that shows it.

Minted from the duplicated-code audit (M17.8) as one of its grouped clean-up tasks. Findings: D-69, D-84, D-138, D-147, D-173, D-186, D-187, D-190, D-105, D-127, D-128, D-176, D-189, D-191, D-93, D-94, D-120, D-73, D-110, D-155, D-192, D-212, D-217, D-219, D-220, D-126, D-139, D-146, D-211, D-25 (part not fixed), D-234, D-235, D-236, D-237, D-238; each is in `claude-docs/audits/dry.md`. AdminCards and AdminInvitations hard-code constants and repeat small pieces, the provider row hand-rolls a Remove confirmation, and `PlusChoice`, the stuck choice chip and the facet switch re-implement existing components. The spell card face and the pick-a-coven modal are written twice, DateField and DateRangeField duplicate their popover shell, help page heads, AboutPillars and AboutRoles are near-copies, and Combobox repeats option-row, group-heading and indicator markup. Dead code and pass-through wrappers remain. Separately, the invitation-card expiry check repeats the pause end-time rule, and the third drag handle re-implements `GripHandle`. One shared piece each replaces them and the dead code is deleted.

_Acceptance criteria:_

- The AdminCards and AdminInvitations constants and duplicates in D-69 are shared, the provider row uses the shared confirmation (D-84), the account menu derives its counts once (D-138), and the `revokeInvitation` document, the role labels and the password-section constants exist once (D-173, D-147, D-186, D-187, D-190)
- `PlusChoice` uses the AddIcon button and `facet-switch` uses `switch-field` (D-105, D-128), and one stuck-chip piece replaces the copies (D-127)
- One spell card face and one pick-a-coven modal replace the two copies each (D-189, D-191), and the orphaned comment is removed (D-176)
- One date popover shell serves both date fields (D-94), one native-control fallback group serves the three callers (D-120), and one formal-name label function replaces the copies (D-93)
- One help page head and one back link serve the pages in D-73 and D-155, AboutPillars and AboutRoles share one component (D-110), and the SignInDialog padding, steps selection, `CovenHome` pending attributes, provider call and inbox link exist once (D-192, D-212, D-217, D-219, D-220)
- Combobox option rows, headings and indicators are shared pieces (D-139), the dead code, orphaned comments and wrappers named in D-146 are removed, and the duplicate constants and the SkeletonFrame lead are shared (D-126, D-211)
- The invitation-card expiry check in `invitation-cards.ts` uses the shared expiry rule in `src/lib/pause-message.ts` (D-25, part not fixed), keeping its own sentence and its own list of issues
- The third drag handle, in `src/components/HelpOutline/sortable.tsx`, uses `GripHandle` (`src/components/GripHandle/`)
- The component tests for the callers touched pass
- `TextField` and `PlainTextField` wrap one control (D-234), the authenticator-code field and digit stripper are written once (D-235), a plain-state select field serves `UserDetail` and `SupportRequests` (D-236), `StockDialog` exports its jar label and values (D-237), and the help header is drawn by one component with no `framed` branch left in `HelpIndex`, `HelpArticleView` and their skeletons (D-238, D-73)
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.9 — Clean Up Styles and Unused Code** · 11.75h

_Story:_ As a developer, I want repeated styles gone and unused code removed or exposed, so that a style change is made once and unused code stops accumulating.

Minted from the duplicated-code audit (M17.8) as one of its grouped clean-up tasks. Findings: D-48, D-57, D-98, D-99, D-165, D-177, D-178, D-194, D-221, D-224, D-225, D-226, D-129, D-145, D-157, D-195, D-86, S-5, S-6, D-243, D-244; each is in `claude-docs/audits/dry.md`. The same flex row, hairline box, `box-sizing` declaration and muted-stroke override are repeated across style sheets, and several hard-coded values, dead rules and restated paddings remain. Production code is kept alive only by tests, exports are used only inside their own file, and some knip config entries are unused or wrong. The CI comment and task-board scripts staging added repeat the comment update and the default-project lookup, and leave dead exports (S-5, S-6). `ignoreExportsUsedInFile: true` hides about 313 exports that only their own file uses; turning it off exposes them so each is un-exported or kept on purpose. `lint:unused` stays non-blocking, with no CI gate and no pre-commit step (owner's call).

_Acceptance criteria:_

- A mixin or token replaces the wrapping flex row, hairline box and muted-stroke overrides (D-48, D-57, D-99), and one global `box-sizing` reset replaces the 68 declarations (D-98)
- Dead CSS and the hard-coded values, restated paddings and nth-child rules are removed or use tokens (D-165, D-177, D-178, D-194, D-221, D-224, D-225, D-226), and `npm run lint:css` passes; `$hairline-border` and `$muted-border` tokens replace every hand-written `1px solid $hairline` and `1px solid $text-muted`, guarded by `tests/guards/border-tokens.test.ts` (D-221)
- The production code named in D-129 with no production caller is removed together with its tests, and exports used by nothing outside their own file are un-exported or removed (D-145)
- The knip config entries and the false positive are corrected (D-157, D-195)
- `ignoreExportsUsedInFile` is off in the knip config (D-86), and each newly reported export is un-exported or listed with a reason, with the codegen consts, email functions and Pothos Refs handled per class
- `npm run lint:unused` is no worse than before and reports less than before for D-129 and D-145; it stays non-blocking, with no CI gate and no pre-commit step
- `postSingle` reuses `upsertComment` and the four unused `pr-comment.cjs` exports are gone (S-5); `DEFAULT_PROJECT` is removed and one `defaultOf` helper serves the three lookups (S-6)
- The duplicate, unused and test-only exports in D-243 are deleted or un-exported, and `container-from` and `container-to` mixins write every container width query, `container-from` using `(width > X)` so no `0.01rem` step is needed, with `tests/guards/breakpoints.test.ts` refusing a raw `@container` width (D-244)
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.10 — Shard the CI Test Jobs** · 5h

_Story:_ As a developer, I want the long CI test jobs split into shards, so that every CI test step finishes in under 7 minutes and a pull request gets its answer sooner.

Minted from the test performance audit (M17.10). Findings: T-1, T-2, T-3, T-4, T-5, T-7; each is in `claude-docs/audits/test-performance.md`. No CI test job is sharded, and three are at or over 7 minutes: the Playwright gate (563 tests), the stories and the `vitest-dom` project. The axe sweep's 29 persona tests cap how evenly Playwright shards can be balanced, the Playwright comment shows no duration, slowest-files list or separate stories coverage, and the timing tables in `runner-budget.md` are about 9 times out of date. Playwright and the `vitest-dom` project are sharded in one PR because they share the comment and summarise scripts. `db` stays one job, because each shard would build its own template database. The two earlier rejections of Playwright sharding were made when the gate had 56 tests.

_Acceptance criteria:_

- The Playwright gate runs as 3 shards and the stories as 2, each using a matrix and `--shard` with the blob reporter, and `merge-reports` joins them into one report (T-1, T-3)
- The axe sweep generates one test per route group and per modal group from `ROUTE_SCANS` and `MODAL_SCANS`, so `fullyParallel` can spread them, and `tests/guards/axe-scans.test.ts` still passes (T-2)
- Shard cache, coverage and report artifacts have shard-unique names, and `playwright-coverage` reads every shard's artifacts (T-3)
- The shards join at the end of the run, with no new aggregator job (R-2): the Playwright shards join in `playwright-coverage`, which runs `merge-reports` per suite and fails when the gate failed; `vitest / vitest` keeps its name, the one listed for branch protection, and still needs every part
- `summarize-playwright.mjs`, `summarize-vitest.mjs` and the sections of `pr-gate.yml` (`needs` and the skipped-section logic) aggregate across shards, and `vitest.yml` no longer hard-codes a blob count of 3 or a fixed `VITEST_PARTS_PASSED` (T-3)
- The `vitest-dom` project is re-measured first, following `runner-budget.md`'s deferred order, and is sharded with `--shard` and a unique blob name only if its test step is still over 7 minutes (R-1); the PR says which
- The Playwright comment shows its duration, a slowest-files list beside Vitest's, and the stories coverage figure on its own line (T-4, T-5)
- The comment warns about each Playwright test over 30s, naming the test (R-3)
- Every CI test step is under 7 minutes in the PR's own run
- The timing tables in `claude-docs/ci/runner-budget.md` are refreshed from CI, and the file gains R-2 (the shards join at the end of the run: Vitest's in `vitest / vitest`, Playwright's in `playwright-coverage`) (T-7)
- `claude-docs/testing/layer-ownership.md`, "The file budget", gains R-3 (30s per Playwright test, named in the comment)
- The two rejections of Playwright sharding in `claude-docs/design-decisions/ci.md` are corrected in place: they were made at 56 tests, the gate now has 563, and the entry weighs each shard's repeated cost, about 94s outside the test step plus about 81s of server start inside it, so about 3 minutes per extra shard, against about 4 minutes of test time each shard removes
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.11 — Wait on State in Playwright, Not on Time** · 4h

_Story:_ As a developer, I want Playwright tests that wait on page state instead of on the clock, so that they stop flaking and the slowest ones get shorter.

Minted from the test performance audit (M17.10). Findings: T-6, T-8, T-9, T-9a, T-10, T-11, T-12; each is in `claude-docs/audits/test-performance.md`. The Playwright specs use 22 `networkidle` waits, six real sleeps that a state wait would replace, and five sleeps that are timing requirements. `hydrated(page, selector)` is defined twice. Several files are slow because they wait: `stack-row-skeleton`, `admin-help`, `admin-documents`, `admin-cards`, the 57s `stories/07-admin` test and the 46s `stories/03-ingredient-autosave` test. Two tests flaked in CI, `spell-quantity-input` (a 30s failure) and the `admin-help` keeper test (a 120s failure), and the gate retries twice where `acceptance.md` says once. The flakes are found and fixed in this task.

_Acceptance criteria:_

- One shared `hydrated(page, selector)` helper replaces the two copies in `skeleton-layout` and `skeleton-back-scroll` and all 22 `networkidle` waits (T-8)
- The six sleeps in T-9 wait on state: the held request at `back-during-navigation:56,59`, `hydrated` at `back-during-navigation:109`, the `REAL` selector at `stack-row-skeleton:155`, `expect.poll` at `step-row-stays-open:41`, and a state wait at `menu-button-edge:53` and `admin-documents:641`
- The five sleeps that stay (`back-during-navigation:131`, `route-scroll:51`, `navigation-wait:238`, `spell-dialog-size:53`, `ingredient-details-modal:250`) go through one shared helper that names why the wait is the requirement (T-9a)
- A guard in `tests/guards/` refuses `networkidle` and `waitForTimeout` outside that helper; it lands in the same commit as the sweep, is seen failing once with a copy put back, and has an empty allowlist
- The cause of the wait in `stack-row-skeleton`, `admin-help`, `admin-documents`, `admin-cards`, the 57s `stories/07-admin` test and the 46s `stories/03-ingredient-autosave` test is found and fixed, so that no Playwright test except the axe sweep's (split in MC.10) takes over 30s in CI, and the PR table gives each test's time before and after (T-10, R-3)
- The `spell-quantity-input` flake and the `admin-help` keeper-test flake are found and fixed, and each has a regression check showing it no longer flakes (T-6)
- The gate's CI retries are set to 1, and `claude-docs/testing/acceptance.md` states the retry count as the config sets it (T-6)
- The gate comment names each flaky test (`includeFlaky: true` and `FLAKY_NOTE`) and writes a `::warning` annotation per flaky test, and `failOnFlakyTests` is not set (R-13)
- `claude-docs/testing/e2e.md` gains R-7 (no sleeps and no `networkidle`; the named wait helper) and R-13 (a flake never blocks, CI retries once, the comment names it, and a flake seen later gets a bug task through `/create-bug-task` and is never skipped)
- The read-only story tests named in T-11 (`stories/06-grimoire` stories 49, 52, 54 and 56) share one seed where `claude-docs/testing/e2e.md`, "Databases and reseeding", allows it, and the PR classifies `spell-recipe-layout` and `coven-ingredients` as read-only or writing
- The `back-during-navigation` seed moves to `beforeAll` and the file is no longer serial (T-12)
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.12 — Trim the Playwright Suites to What a Browser Adds** · 6.5h

_Story:_ As a developer, I want Playwright to run only the checks that need a browser, so that the gate is shorter and each rule is proved once.

Minted from the test performance audit (M17.10). Findings: T-13, T-14, T-15, T-16, T-17, T-18, T-19, T-20; each is in `claude-docs/audits/test-performance.md`. Width sweeps cross breakpoints that do not exist, pairs of tests run identical bodies at two widths or themes, and some tests pin colours, font weights and exact pixel sizes, which are presentation (layout-ownership rule 4). About 25 gate scans and about 29 story scans repeat a default state the axe sweep already covers, and the sweep runs the full rule set in both themes although a theme switch changes only colour tokens. Four gate specs repeat a flow that a story or a Vitest test proves. The specs have no shared list of the app's widths. Nothing is cut for speed alone: every cut is a duplicate or a presentation pin.

_Acceptance criteria:_

- A shared e2e breakpoint file lists the widths the code crosses (640, 896, 928, 800, the page-header container widths and `TABLET_BAND`) with the 375 phone width as the one constant outside the list, and a guard in `tests/guards/` refuses a `setViewportSize` width that comes from neither; it lands in the same commit, is seen failing once with a copy put back, and has an empty allowlist (R-4)
- No width is written in two places that must change together: the breakpoint file is checked against MC.9's `container-from` and `container-to` mixins (D-244) and against D-12, and the PR names any width it restates and why
- The width sweeps are cut as T-13 sets out: `tabbed-page-alignment` keeps 712 and drops 500, 600, 680, 700 and 1000; `jump-menu-width` keeps 800, 927 and 929, straddling the 928 edge, with its stale `width < 1200` guard replaced by one at 928; `page-with-nav-layout` drops 1280; `shell.spec.ts:430-436` uses one `goto` and a `setViewportSize` per step
- The identical-body pairs in T-14 are merged or cut (`skeleton-layout`, `skeleton-back-scroll`, `help-pages`, `spell-recipe-layout`, `theme-switch`, `spell-quick-look`, `spell-footer-layout`, `ingredient-details-modal`), and no loop row runs the same code as another (R-5)
- The design pins in T-15 are cut, the unasserted screenshots in `stories/06-spell-preview` are deleted, and the merges in T-16 are made
- Every kept width, pin and loop row in T-17 is still proved by a test that is not cut, and the PR table names, for each cut, the test that keeps its rule proved
- `scanBothThemes` and the sweep's `collectBothThemes` run the full rule set in light and only the colour rules (`color-contrast`, `link-in-text-block`) in dark through `AxeBuilder.withRules`, and a full scan at 375 covers the shell's tab bar and each phone sheet (R-6)
- The gate scans and story scans that repeat a state the sweep covers are cut (T-18, T-19), each scan left carries a comment naming the state the sweep cannot reach, and the distinct-state scans listed in T-18 stay
- The PR records the axe sweep's summed seconds before and after
- The gate specs repeated by another layer are cut (`coven-rename:24`, `admin-cards:12`, `support-sender-resolve:13` after its admin-list and menu-count assertions are checked, `graphql:8`), `security-headers:30` and `error-pages:86` are cut or moved to Vitest, and the specs T-20 lists as needing a real server stay (T-20)
- `claude-docs/testing/layer-ownership.md` gains a widths line under rule 4 naming the shared breakpoint file and the 375 constant (R-4), and rule 9's "one axe scan per page state" is replaced by R-6's five parts
- The entries "Trimming the double-theme and double-width axe scans" and "Cutting accessibility scans for speed" in `claude-docs/design-decisions/ci.md` are corrected in place and say why they were reassessed
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.13 — Speed Up the Slow Vitest Dom Files** · 6.5h

_Story:_ As a developer, I want the slowest component tests to render only what they prove, so that the `vitest-dom` job is shorter.

Minted from the test performance audit (M17.10). Findings: T-21, T-22, T-23; each is in `claude-docs/audits/test-performance.md`. `pdf.test.ts` takes 59s and renders about 640 cards, 495 of them in one test. Several large files render a whole form or builder to prove one field: `IngredientForm/index`, `IngredientForm/variants`, `SpellBuilder/steps` and `IngredientForm/compendium`. About 13s of tests sleep on a real clock. `IngredientForm/index` still has about 45 tests that need the whole tree, so it stays over the file budget by decision. Savings are measured in CI, never from a single-file run, because the variants file runs 10 to 50 times slower in a full run (an earlier 20s guard on it was added and reverted for that reason).

_Acceptance criteria:_

- `pdf.test.ts` builds its `ten` and 11-card documents once, drops the 1, 10, 20 and 21 rows and the 495-card build, and tests `MAX_SHEETS_PER_BATCH` on a pure sheet-count function extracted from `renderCardSheets` (T-21)
- The `IngredientForm/index` test of an issue on one category pick runs in a `CategoriesField` harness under `tests/components/CategoryPicker/`, the spell-check check and the refused-categories save are merged into whole-form tests, the repeats are cut or merged as T-22 lists, and the form-head refusal check asserts role and kind rather than the sentence
- The `variants` tests that need one variant use `renderVariants()`, the copy test runs in `copy.test.tsx` on `renderVariants()`, and the check that a save opens Relations is in a whole-form test
- A `renderSpellSteps` harness in `tests/components/SpellBuilder/steps-harness.tsx`, modelled on `list-field.test.tsx`, serves the 34 `SpellBuilder/steps` tests that need one field, and the 14 that need the builder’s resolver, Save or the Jar Details drawing stay on the whole builder; the repeats and copy lines in T-22 are cut, and class checks assert `aria-expanded` or an accessible name
- In `compendium`, the two pick-only tests stay on their pick-only harness, the substitutes lookup check is merged into a whole-form test, the three switch tests are one, and the None reclassification keeps its entry-page row
- Every real sleep in T-23 is replaced by fake timers with `advanceTimersByTimeAsync`, by `typingClock()` or by an `act` flush; the waits T-23 keeps (the lock and race guards, the 20 ms database polls and the timestamp gaps) go through `requiredDelay` in `tests/support/waits.ts`, which says why the wait is the requirement, and `tests/guards/vitest-waits.test.ts` refuses a real sleep in a Vitest file outside it; the guard lands in the same commit, is seen failing once with a copy put back, and has an empty allowlist. `pg_sleep` inside SQL and `setTimeout(0)` flushes are not sleeps, stay as they are, and do not go through the helper (R-7)
- `claude-docs/testing/where-tests-live.md` gains R-7's Vitest half: no real sleeps, fake timers with `advanceTimersByTimeAsync`, and the named wait helper for a wait that is the requirement
- `tests/lib/watch-loads.test.ts` is confirmed to test a test helper and is cut (R-14), and every other cut in the PR table names the test that keeps its rule proved
- The saving is measured by comparing the `vitest-dom` job's CI timings before and after, not a single-file run, and the PR records both
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.14 — Pay Database Setup Once and Prove Each Rule Once in Vitest** · 5h

_Story:_ As a developer, I want database tests to pay their setup once per file and to prove each rule in one test, so that the database job is shorter and a rule has one place to change.

Minted from the test performance audit (M17.10). Findings: T-24, T-25, T-26 (T-27 is recorded as checked and not a duplicate); each is in `claude-docs/audits/test-performance.md`. `password-lockout` and `two-factor` pay for password hashing in every test, the seed tests and `stock.test.ts` truncate and re-seed per test, and several repository, service and component tests prove a rule that another test already proves. MC.8 and MC.9 changed code the findings point at, so their diffs are checked first.

_Acceptance criteria:_

- MC.8's and MC.9's merged diffs over `tests/` and the paths the findings cite are checked first, and each finding they changed is updated or dropped in the PR table
- `password-lockout` signs up once in `beforeAll` and resets the failure counts per test, `two-factor` shares one enrolled account and merges the rotation pair, and no test hasher is added because the real hash is what is under test (T-24)
- `seed/compendium.test.ts` shares one fixture seed for its read-only tests, replaces or deletes `:465`, and has one `afterAll(seedSharedVocabularies)` (T-25)
- `seed/index.test.ts` runs one `describe.each(SEED_ENTRIES)` with one `beforeAll`, in the order dry run, seed and fill, idempotent, no-resurrect, and `:221` is cut (T-25)
- `stock.test.ts` creates its three ingredients in `beforeAll`, resets only `inventory_items` and `workspace_compendium_entries` per test, and keeps the fixture-mutating tests in their own describe (T-25); a writing test still gets its own setup (R-9)
- The repeats in T-26 are cut, merged or trimmed in `tests/db/repository/invitations.test.ts`, `invitation-acceptance-by-token`, `identity/graphql/admin-invitations`, `sourcing-score.test.ts`, `HelpWidget/unit-converter`, `grimoire/services/workings`, `password-lockout:173`, `user-list.test.ts` and `add-ingredient-button`, and the style and class checks are cut from `LinkHint`, `IconTip` and `comparison-panel`
- The four `tests/scss` files stay, and the checks T-27 records as cleared (the soft-delete pairs, the membership-proof tests, the narrowing refusal in `workings.test.ts:441` and `graphql/working.test.ts:329`, the GraphQL refusal codes, `plan-deductions:103`, `password-lockout:234`, `Modal:704`) are not cut
- `help-reads.test.ts` has positive staff reads (glossary, index, sitemap) beside its absence checks (R-12)
- Every cut names, in the PR table, the test that keeps its rule proved, and no authorization test that asserts a direct-id refusal is removed
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass

**MC.15 — Tidy Copy And Casing Across The Site** · 6h

_Story:_ As a person using the site, I want the site role named the same everywhere, so that I know who a Keeper is. As a reader, I want clean help pages, so that I read each name and link as meant. As a reader, I want short, clean messages, so that I read each fact once. As a mail recipient, I want a link where the mail tells me to sign in, so that I know the next step. As a developer, I want one casing for aria-labels and placeholders, so that they match their siblings.

Minted from the design and UX audit (M17.7). Findings: F-6, F-13, F-17, F-38, F-42, F-45, F-47, F-61, F-75, F-76, F-78, F-79, F-80, R-6; each is in `claude-docs/audits/design-ux.md`. It joins these parts: Write Keeper With A Capital; Tidy Help And Public Page Copy; Tidy Coven And Auth Copy; Tidy The Mail Links And Headings; Set aria-label And Placeholder Casing.

_Acceptance criteria:_

- The coven list, new coven and account support screens write Keeper and Keepers with a capital.
- The Keepers hub reads "Keeper invitations" and never "admin".
- Field and button names in help copy, staff help and the document pages are set in bold, not straight quotes.
- Each FAQ link is named "Link to this answer" or hidden from the heading name.
- The footnote marker keeps "#" in front of the number as a superscript, with a tap area of at least 24 by 24 CSS pixels.
- The signed-in help page at 375 shows the Compendium link.
- The member dialog shows no stray dot before "none".
- The invite dialog copy is shortened.
- The four auth messages end without a full stop.
- The email-change and verify-email mails that say to sign in carry a link, or say why not.
- The support mail lead-ins use Title Case.
- Every aria-label and every placeholder named in the findings is in Title Case.
- `.claude/rules/components.md` gains the sentence "aria-labels and placeholders are Title Case."
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.16 — Route Every Date Through utc.ts** · 4h

_Story:_ As a person reading dates across screens, I want long dates in detail views and short dates in tables, so that I never compare two formats.

Minted from the design and UX audit (M17.7). Findings: F-1, R-3; each is in `claude-docs/audits/design-ux.md`.

_Acceptance criteria:_

- Every date and time shown on a screen or in a mail comes from a formatter in `src/lib/utc.ts`: the long form in detail views and the short form in tables.
- The hand-written date formats in components and in the one mail that formats its own are gone.
- A guard fails the build on a hand-written date format outside `src/lib/utc.ts`, and `.claude/rules/components.md` gains the sentence "Dates and times format only through `src/lib/utc.ts`."
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.17 — Give Error, Gate And Blocked Pages One Layout** · 5h

_Story:_ As a person who lands on a blocked page, I want it to look like its siblings and say what to do, so that I am not left guessing. As a person who cannot use a coven page yet, I want to be told where to go next, so that I am not stuck.

Minted from the design and UX audit (M17.7). Findings: F-2, F-48, F-49, F-50, F-52, F-53; each is in `claude-docs/audits/design-ux.md`. It joins these parts: Give Error And Gate Pages One Layout; Show Next Steps On Blocked Coven Pages.

_Acceptance criteria:_

- On the 404 pages at 375 the "?" icon button no longer wraps alone onto its own row; the Help and Report This links both stay.
- The 403 and 404 pages share one body and each offers a next step.
- The invite-token, access-paused and coven-paused cards align the same way.
- The reset-password page spaces its subtitle like the forgot-password page, with room for the content that appears under the password field once something is typed.
- The waiting page on the coven list and on new coven shows a link to Support.
- The two-factor backup-codes line and the paused-coven steward line are unchanged.
- A practitioner or observer who opens the coven invitations page sees a Not Authorized page inside the shell.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.18 — Fix The Support Form Hint, Radio Cards And Messages** · 4h

_Story:_ As a person asking for support, I want the form to warn me only where it matters and to read the same everywhere, so that I trust what it says.

Minted from the design and UX audit (M17.7). Findings: F-5, F-8, F-23, F-25, F-54, F-87, R-4; each is in `claude-docs/audits/design-ux.md`.

_Acceptance criteria:_

- The Message hint on the support page, the support-request page and the Feedback dialog is drawn in the warning style, not the error style and not the plain hint style.
- `.claude/rules/components.md` R7 reads "a hint is never drawn in the error style; a caution uses the warning style".
- The group error has no full stop.
- The Question radio cards lay out the same way on the support page, the support-request page and the Feedback dialog at 375 and at desktop.
- An empty radio group does not look selected; focus and selected look different.
- The request thread names its author once.
- The keeper button beside the GitHub Issue field reads "Save Issue".
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.19 — Bring Red Controls And Delete Icons Into The Rule** · 4h

_Story:_ As a person using edit dialogs, I want Delete to look and sit the same everywhere, so that I find it and know when it is dangerous.

Minted from the design and UX audit (M17.7). Findings: F-7, F-9, F-10, R-5; each is in `claude-docs/audits/design-ux.md`.

_Acceptance criteria:_

- The edit-ingredient and record-a-working dialogs show Delete as an icon with a tooltip and a visible or accessible name, at the footer end.
- Delete Guide on the keeper help page uses the same icon control; Delete Coven stays red.
- Decline Invitation stays red.
- `.claude/rules/components.md` lists the named red controls as Impersonate, Pause Admin Changes, Revoke Batch, Email Every Account, Delete Coven and Decline Invitation, and says a page's other deletes use the delete icon.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.20 — Fix Dialog, Sheet And Page Spacing** · 7.5h

_Story:_ As a steward, I want the Leave and Record a Working dialogs to name actions clearly, so that I know what each button does. As a person on a phone, I want sheets and dialogs to fit, so that I can reach every control. As a person using dialogs and long pages, I want even spacing, so that the screen looks finished.

Minted from the design and UX audit (M17.7). Findings: F-11, F-18, F-22, F-30, F-31, F-32, F-33, F-34, F-35, F-36, F-37, F-63, F-77; each is in `claude-docs/audits/design-ux.md`. It also holds AX-9 (the Save Working part), from `claude-docs/audits/accessibility.md`. It joins these parts: Fix The Leave And Record A Working Dialogs; Fix 375 Layout Faults In Sheets And Dialogs; Even Out Dialog And Page Spacing.

_Acceptance criteria:_

- Promote and Leave stays enabled with New Steward empty; pressing it flags that field and moves focus to it.
- Save Working stays enabled once the people field has text with a required field empty; pressing it flags the empty field and moves focus to it.
- The complete action is named Complete in both steps of Record a Working, and the dialog tells the user what completing does.
- The confirm step is titled for the action it confirms.
- The Filters sheet has an X button in its header and keeps Close at the bottom.
- A long coven name is truncated in the coven switcher and the chevron stays on the name line.
- The confirm buttons of the Discard Changes dialog stack instead of wrapping.
- The wrapped lines of the builder eyebrow are aligned.
- The Mint Cards dialog has no blank band and no uneven gaps at desktop and 375.
- The dark eyebrow halo is gone from every dialog.
- The Share With the Coven switch sits under its label with the gap closed.
- The member dialog date stays on one line at 375.
- The date popover stays inside the view and does not cover the top bar.
- The gap between the intro and the first heading on the terms and privacy pages matches the other document pages.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.21 — Fix Empty Cells And Small Hit Areas** · 5h

_Story:_ As a steward or keeper reading a table, I want an empty cell to say it is empty, so that a gap is not read as a fault. As a person on a phone, I want small buttons to be easy to press, so that I do not miss.

Minted from the design and UX audit (M17.7). Findings: F-16, F-21; each is in `claude-docs/audits/design-ux.md`. It also holds AX-2, AX-10 and AX-21, from `claude-docs/audits/accessibility.md`. It joins these parts: Show One Mark In Empty Cells; Grow Small Buttons To A 24 Pixel Hit Area.

_Acceptance criteria:_

- An empty table cell shows a dash, and a card label with no value shows a dash.
- Small buttons on the sign-in methods page and the other screens listed have a hit area of at least 24 by 24 CSS pixels, grown by padding.
- Button labels no longer wrap at 375.
- The help search submit button is at least 24 by 24 CSS pixels on the 13 help screens, and the input reserves room for it, at desktop and 375.
- The date range quick picks in the keeper date range field are at least 24 CSS pixels tall at 375, with a gap between them.
- The "Edited just now" control that `card-click.spec.ts` measures at lines 233 and 321 is at least 24 CSS pixels tall in Firefox.
- A Playwright check measures these three controls at 24 by 24 CSS pixels or larger, so the fault cannot return unseen (a regression test, because the three faults are shipped behaviour).
- Axe's `target-size` rule is enabled in the sweep in `tests/e2e/axe.ts`, and a target-size mixin exists in `src/scss/_mixins.scss` and is used by the help search button, the date range quick picks and the "Edited just now" control (R2).
- The R2 rule text is added to `claude-docs/styling.md`, beside the target-size note on chips, with a pointer from `.claude/rules/components.md`, "Styling".
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.22 — Fix The Compendium Pages** · 4h

_Story:_ As a reader of the compendium, I want pages that say each thing once, so that I find facts quickly.

Minted from the design and UX audit (M17.7). Findings: F-19, F-20, F-55, F-60; each is in `claude-docs/audits/design-ux.md`.

_Acceptance criteria:_

- The safety note shows once per entry page, and again whenever the page has a caution block.
- Correspondences shows no empty "No ... recorded" line for a group with no values.
- The compendium list with no match shows one message and the shared empty state with an action, if the shared empty state offers one.
- The Correspondences headings use the correct level without any heading becoming larger.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.23 — Draw Staff Help Inside The Keepers Frame** · 3h

_Story:_ As a keeper or curator, I want Staff Help to keep the Keepers frame, so that I can see where I am.

Minted from the design and UX audit (M17.7). Findings: F-4; each is in `claude-docs/audits/design-ux.md`.

_Acceptance criteria:_

- Staff Help pages show the Keepers context bar and the active top-nav tab.
- The Staff Help index links back to the Keepers hub.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.24 — Tidy The Keeper Screens, Forms And Tab Strips** · 7h

_Story:_ As a keeper, I want form pages to share one width and tab strips to show what is hidden, so that nothing jumps or hides. As a keeper or curator, I want the keeper screens to be compact and clearly labelled, so that I read each fact once.

Minted from the design and UX audit (M17.7). Findings: F-26, F-27, F-28, F-29, F-62, F-65, F-66, F-68, F-72, F-74, F-86, R-1, R-9; each is in `claude-docs/audits/design-ux.md`. It joins these parts: Align Keeper Form Pages And Tab Strips; Tidy The Keeper Screens.

_Acceptance criteria:_

- First check in a browser whether the Documents tab strip already starts at Terms of Use; the owner believes it does.
- Every tab strip starts at its first tab and shows a fade cue where it clips, so the three hidden support filters at 375 are cued.
- Keeper form pages use one narrow width, and `.claude/rules/components.md` gains the sentence "Keeper form pages share one narrow width."
- Download CSV is disabled while the list is empty.
- `claude-docs/styling.md` and `claude-docs/components/app-shell.md` name the shell bar's Add Ingredient as the exception to "one solid button per view".
- The Refused Opens intro reads easily at desktop and 375.
- Each People card is much shorter at 375.
- The Shown to Readers toggle shows its label once.
- The sort icon on the keeper help page has an accessible name.
- The colour sliders show the full words where there is room at 375.
- The curator compendium table shows a shaded edge where it scrolls under the action column, and the Sourcing Score heading is not clipped.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.25 — Share fieldsRefused And Move The Users Page Assembly** · 4h

_Story:_ As a developer, I want one copy of each helper, so that a change lands once.

Minted from the design and UX audit (M17.7). Findings: F-82, F-83, F-84; each is in `claude-docs/audits/design-ux.md`.

_Acceptance criteria:_

- One `fieldsRefused` export serves the ingredient form and the spell builder.
- The role and order tables use `DataTable` or carry a comment saying why not.
- The keeper Users page file does frame work only.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.26 — Split The Large Ingredient And Spell Components By Job** · 6h

_Story:_ As a developer, I want each large component to hold one job, so that a change touches one file.

Minted from the design and UX audit (M17.7). Findings: F-85; each is in `claude-docs/audits/design-ux.md`.

_Acceptance criteria:_

- The row-sliding hook and the GraphQL documents move out of the two ingredient-form files, and the spell builder and reference panel split by job.
- No file in the list stays over 300 lines with mixed jobs.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.27 — Extend The Pagination Guard To Page-Level Reads** · 3h

_Story:_ As a developer, I want the guard to see fixed limits on pages, so that no page lists without a pager unnoticed.

Minted from the design and UX audit (M17.7). Findings: R-7; each is in `claude-docs/audits/design-ux.md`.

_Acceptance criteria:_

- The pagination guard fails a page that passes `HELP_PAGE_LIMIT` or a literal `limit:` to a service read.
- The help glossary, the help front page and the staff help index each have a recorded exemption in the guard, with the reason.
- The guard fails once with a fixed limit put back on the search page, after help search has its pager.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.28 — Let The App Header Wrap At 320 Pixels And Large Text** · 3h

_Story:_ As a person who reads at a large text size or on a narrow screen, I want the header controls to stay on screen, so that I never scroll sideways to reach them.

Minted from the accessibility audit (M17.9). Findings: AX-1 (A-2); each is in `claude-docs/audits/accessibility.md`. The header end blocks (`app-shell__end` in `AppShell` and `public-frame__end` in `PublicFrame`) do not wrap, so at a 320 px window and at a 200% root font the page scrolls sideways and header controls leave the screen. The section nav's More overflow follows the viewport width, not the font size.

_Acceptance criteria:_

- At a window 320 px wide, no signed-in or public page scrolls sideways because of the header.
- With the root font at 200% at 1280 px, the header and the section nav do not scroll the page sideways, and the section nav's More overflow follows the font size.
- Every header control stays reachable by keyboard and by pointer at both settings.
- A Playwright check fails on sideways page scroll at 320 px and at 200% root font, on one signed-in page and one public page (R5).
- The R5 rule text is added to `.claude/rules/testing.md`, "What a test asserts".
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.29 — Add Move Up And Move Down To Reorder Handles** · 5h

_Story:_ As a person who cannot hold and drag, I want to move a list item up or down with a tap, so that I can reorder without dragging.

Minted from the accessibility audit (M17.9). Findings: AX-3 (C-1); each is in `claude-docs/audits/accessibility.md`. A list a person reorders by dragging offers only a drag, or the keyboard, and no single press. `src/components/GripHandle/index.tsx` is the one shared handle behind the combobox chips, the help outline guides and rows, and the spell builder steps, so one change covers all three.

_Acceptance criteria:_

- `GripHandle` offers Move Up and Move Down as single presses, beside drag and keyboard, which keep working.
- The combobox chips, the help outline guides and rows, and the spell builder steps all use it.
- Move Up is unavailable on the first item and Move Down on the last, without losing focus.
- Moving an item announces its new position.
- A component test, with role and label queries, proves that pressing Move Down changes the order (a regression test, because the missing route is shipped behaviour).
- The `sortable-wiring` guard also fails a sortable list that uses no `GripHandle`, was seen failing once with a drag-only handle put back, and its allowlist is empty (R3).
- The R3 rule text is added to `.claude/rules/components.md`, "Shared pieces", on the existing `GripHandle` line.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.30 — Move Focus To Errors And Announce Outcomes** · 5h

_Story:_ As a person using a keyboard or a screen reader, I want a form to tell me what went wrong and what worked, so that I do not have to look for it.

Minted from the accessibility audit (M17.9). Findings: AX-4 (A-16), AX-6 (A-14) and AX-9 (A-15, sign-in part); each is in `claude-docs/audits/accessibility.md`. After Send Invitation succeeds and after the account name saves, nothing is announced to a screen reader. A refused submit in the single-field email forms does not move focus to the error. Sign In is disabled while a required field is empty, which breaks the rule that Save is disabled only when there is nothing to save.

_Acceptance criteria:_

- After Send Invitation succeeds, focus returns to the Invite button and "Invitation sent" is written into a status region that existed before the text.
- "Your name was saved." is written into a status region that existed before the text.
- On forgot-password, the account email form, Send Invitation and the keeper invite, a refused submit moves focus to the error summary or to the invalid field.
- Sign In stays enabled once any field has text; pressing it with the password empty flags the field and moves focus to it.
- Regression tests: one per fixed behaviour, asserting the focus target or the status text, by role and label (R4, a check only).
- The R4 rule text is added to `.claude/rules/components.md`, "Form inputs".
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.31 — Fix Names, Roles And Contrast Found By The Scans** · 5h

_Story:_ As a person using a screen reader or a keyboard, I want every control and table to have a name and be reachable, so that I can read and use it. As a reader on the privacy, terms and compendium pages, I want the small muted text to be readable.

Minted from the accessibility audit (M17.9). Findings: AX-5 (Suite A1), AX-7 (A-4), AX-8 (A-9), AX-11 (A-10) and AX-12 (A-11, Suite A2); each is in `claude-docs/audits/accessibility.md`. Five small faults found by the axe sweeps and the keyboard passes: a sideways-scrolling table frame takes no Tab stop, a scrolling dialog body has no role or name, the spell preview opens with duplicate ids, the curator compendium table loses its header text at 375, and the small muted text over the background art falls under 4.5:1.

_Acceptance criteria:_

- One shared table frame, which sets `role="region"`, `tabIndex` and a name itself, replaces the hand-written frames in `DataTable/index.tsx`, `HelpOutline/order-table.tsx`, `HelpWidget/role-permission-table.tsx`, `RichTextEditor/elements.tsx` and `DocumentPage/markdown.tsx`, and `help-widgets.spec.ts:92` passes at phone width.
- A guard in `tests/guards/`, in the form of `sortable-wiring`, fails a `data-table-frame` class written outside the shared piece (R1). It was seen failing once with a hand-written frame put back, and its allowlist is empty.
- The R1 rule text is added to `.claude/rules/components.md`, "Shared pieces".
- A scrolling dialog body (`readingBody`) has a role and a name from the dialog title.
- The spell preview opens with no duplicate ids.
- The curator compendium table keeps its header text in the accessibility tree at 375.
- `.document-page__updated` and `.eyebrow` text keeps 4.5:1 against the art in light and dark at desktop and 375.
- Regression tests: the axe sweeps for the pages and dialogs named above report none of these rules.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.32 — Make The Audit Suites Run In WebKit, Firefox And Phone** · 8h

_Story:_ As a developer, I want `npm run e2e:audit` and `npm run test:stories:audit` to run and pass, so that I can see a real failure in another engine.

Minted from the accessibility audit (M17.9). Findings: SX-1, SX-2, and the suite failures in "Audit Suite Results"; each is in `claude-docs/audits/accessibility.md`. `npm run e2e:audit` and `npm run test:stories:audit` do not run cleanly. The audit browser server image is pinned behind the Playwright client (`Docker/docker-compose.yaml`), `scripts/e2e-servers.ts` skips its build when a port already answers, and about 24 tests assume desktop Chromium. The run in "Audit Suite Results" also left 14 e2e tests and 11 stories unexplained.

_Acceptance criteria:_

- The audit server image tag and server package in `Docker/docker-compose.yaml` take their version from one place, or a check fails when they differ from the `@playwright/test` range in `package.json`.
- `scripts/e2e-servers.ts` rebuilds when the first port answers, or refuses with a message naming what is on that port.
- Each test in "Tests That Assume Desktop Chromium" either runs only in the projects where it is valid, with the reason in the skip, or asserts something true in every engine. The phone tests that click the Site nav open the AccountMenu first.
- A guard in `tests/guards/` reads `Docker/docker-compose.yaml` and `package.json` and fails when the audit image tag or server package differs from the `@playwright/test` range (R6). It was seen failing once with a mismatch put back, and its allowlist is empty.
- A guard fails a spec that calls `page.pdf(`, sets `forcedColors` or calls `mouse.wheel` without a `test.skip` on the project (R7). It was seen failing once with the skip removed, and its allowlist is empty. Layout assumptions stay review only.
- The R6 and R7 rule texts are added to `.claude/rules/testing.md`, "Process".
- The 14 unknown e2e tests and 11 unknown stories are traced once each, and each is fixed or recorded with its cause.
- The owner runs the two audit suites once; every failure left is listed with its cause.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.33 — Carry The Share Image On Every Public Page** · 2h

_Story:_ As a person sharing a link to a document or a help page, I want the link to show the site's picture, so that it looks like the site and not a bare address.

Minted from the search engine audit (M17.6). Finding: SEO-1; it is in `claude-docs/audits/seo.md`. Most public pages serve no `og:image` tag, so a shared link shows a bare address. The change is one helper and one test.

_Acceptance criteria:_

- `/about`, `/terms`, `/privacy`, `/disclaimer`, `/code-of-ethics`, `/help` and a help article each serve an `og:image` tag naming the site's share image.
- `/`, `/compendium` and an entry still serve their own images.
- The share-card browser test checks every public page, not three.
- The test fails with the image removed from the helper.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.34 — Make The Article Title The Main Heading On Help Pages** · 3h

_Story:_ As a reader or a search engine, I want a help article's main heading to be its title, so that each article says what it is about.

Minted from the search engine audit (M17.6). Finding: SEO-2; it is in `claude-docs/audits/seo.md`. Every help page's `<h1>` reads "Help", so no article's main heading names its subject. The change is one shared head component, its skeleton and a heading test.

_Acceptance criteria:_

- A help article's only `<h1>` is the article's title.
- `/help` and `/help/search` keep "Help" as their `<h1>`.
- The word "Help" still shows above an article's title.
- Each help page has exactly one `<h1>`.
- The skeleton shown while an article loads has the same headings.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.35 — Cut The Number Of Stylesheet Files A Page Loads** · 6h

_Story:_ As a site keeper, I want a page to load a handful of stylesheet files, so that crawlers spend their requests on pages and not on styles.

Minted from the search engine audit (M17.6). Finding: SEO-3; it is in `claude-docs/audits/seo.md`. A public page loads 64 to 76 separate stylesheet files. The cause is not known, so the task starts by finding it. The limit of 10 files is a proposal.

_Acceptance criteria:_

- The cause of the 64 to 76 files is written down in the task's PR.
- A production build serves at most 10 stylesheet files on `/compendium`, an entry, a document and a help article.
- Each file is still served `public,max-age=31536000,immutable`.
- The pages look the same in light and dark.
- Google's URL Inspection live test of an entry shows no stylesheet preload warning.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.36 — Stop Crawlers Following Sign-In And Support Links** · 3h

_Story:_ As a site keeper, I want crawlers to skip links that open sign-in or support, so that they spend their requests on pages with content.

Minted from the search engine audit (M17.6). Finding: SEO-4; it is in `claude-docs/audits/seo.md`. Crawlable links lead into addresses that are never indexed. This is a part of what MB.289 did for the entry links.

_Acceptance criteria:_

- The header's Sign In link carries `rel="nofollow"` on every page that shows it.
- Each `?support=` link in a document body carries `rel="nofollow"`.
- A link to a real page in a document body carries no `rel`.
- Signed-out and signed-in visitors can still use all of these links.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.37 — Keep Superseded Document Versions Out Of Search** · 2h

_Story:_ As a site keeper, I want only the current version of a document to appear in search results, so that nobody finds an old copy of the terms.

Minted from the search engine audit (M17.6). Finding: SEO-5; it is in `claude-docs/audits/seo.md`. An older document version's page is an indexable copy. The change is one metadata function and a test.

_Acceptance criteria:_

- A version page that is not the current version carries a noindex tag with `follow`.
- A version page that is the current version still names the document's own address as its canonical.
- Version pages stay out of the sitemap.
- A test covers a current and a superseded version.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.38 — Tell Bing About New And Changed Pages With IndexNow** · 6h

_Story:_ As a site keeper, I want Bing told when a page is published or changed, so that people on Bing can find new entries and help.

Minted from the search engine audit (M17.6). Finding: SEO-6; it is in `claude-docs/audits/seo.md`. Bing has indexed 34 of 58 known addresses and is not told of new pages. The task adds a route, a key and a call from the keeper mutations. The key is never written in the repository, a comment or an issue.

_Acceptance criteria:_

- The site serves an IndexNow key file at the address the protocol requires.
- Publishing, changing or retiring a compendium entry sends one ping naming its address.
- Publishing or changing a help article sends one ping naming its address.
- A failed ping does not fail the save, and is logged.
- No ping is sent from a database that is not production.
- Bing Webmaster Tools shows IndexNow as set up.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.39 — Correct The Record Of The AI Bots Setting** · 1.5h

_Story:_ As a site keeper, I want the design record to say what the Vercel AI Bots rules are set to, so that the next person to read it is not misled.

Minted from the search engine audit (M17.6). Finding: SEO-7; it is in `claude-docs/audits/seo.md`. `claude-docs/design-decisions/ci.md` records AI Assistants as Allow and AI Crawlers as Deny, and Vercel shows both AI Bots rules set to Log. The owner chose to correct the record, not to change the setting. This is a document-only task: the Vercel setting is not touched.

_Acceptance criteria:_

- `claude-docs/design-decisions/ci.md`, item 4 of the owner's decisions and setting V5 in the Vercel table, say both AI Bots rules are set to Log, and say why.
- `claude-docs/seo/ai-discovery.md` is checked for any sentence that depends on the old setting, and each such sentence is corrected or none is found.
- `npm run format:check` and `npm run lint` pass.

**MC.40 — Lengthen The Home Page's Title And Description** · 1.5h

_Story:_ As a person finding the site in Bing, I want the home page's title and description to say what the site is, so that I know whether to click.

Minted from the search engine audit (M17.6). Finding: SEO-8; it is in `claude-docs/audits/seo.md`. The title is 15 characters and the description is 44. Bing flags both as short and suggests 50 to 60 and 150 to 160. The change is two strings and a check, in `src/app/page.tsx`.

_Acceptance criteria:_

- The home page's title is 50 to 60 characters.
- Its description is 150 to 160 characters.
- Its description agrees with the intro on the page.
- Bing Webmaster Tools no longer lists either as too short after its next crawl.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.41 — Fail A Public Page That Has No Description Or Canonical Tag** · 2h

_Story:_ As a developer, I want a test to fail when a public page ships with no description or canonical tag, so that no page loses them unnoticed.

Minted from the search engine audit (M17.6). Finding: SEO-11; it is in `claude-docs/audits/seo.md`. `tests/guards/page-metadata.test.ts` stops a page writing its own metadata and requires nothing, so a new public page can ship with neither. The guard extends that one file.

_Acceptance criteria:_

- A guard fails an indexable public page that passes no description to the helper.
- The guard fails an indexable public page that passes no canonical path.
- `/support` and `/help/search` are named in the guard as noindex pages.
- The guard fails once with a page's description removed, and passes with it back.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.42 — Add The Documents And Help To `llms.txt`** · 2h

_Story:_ As an AI assistant reading `llms.txt`, I want to find the site's documents and help, so that I can answer questions about how the site works.

Minted from the search engine audit (M17.6). Finding: SEO-13; it is in `claude-docs/audits/seo.md`. `buildLlmsTxt` lists the compendium and the sitemap only, so `/about`, the documents and the help pages are in neither `llms.txt` nor the AI catalogue. The builder, the doc and two tests change. The two draft specifications are re-read first, as the doc records them as read on 2026-10-19.

_Acceptance criteria:_

- `llms.txt` lists `/about`, each document and each help article, in its own section.
- Every address in it is on the site's own origin, and none is a retired or hidden page.
- The owner has said whether the AI catalogue gains a second entry for help.
- `claude-docs/seo/ai-discovery.md`, "What they read", is corrected to match.
- The tests for the layout and for hidden entries still pass.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

**MC.43 — Answer 410 For A Retired Compendium Entry** · 4h

_Story:_ As a site keeper, I want a retired entry's address to say it was removed, so that search engines stop asking for it.

Minted from the search engine audit (M17.6). Finding: SEO-9; it is in `claude-docs/audits/seo.md`. Migration `0090_retire-endangered-entries.sql` retired four entries as the curator Delete retires one, by setting `deleted_at`. Their addresses answer a plain 404, and a search of `src/app/(public)/compendium` finds no code that answers 410. The deleted row is kept, so no new table is needed. A finder that sees a deleted row is an exception to the soft-delete rule (CLAUDE.md, rule 4, and `.claude/rules/database.md`, Rule 4), and the task names that exception in the rule's list.

_Acceptance criteria:_

- A deleted compendium entry's address answers 410 with a noindex tag. This covers the four entries migration 0090 retired and any entry a curator deletes later.
- A hidden entry still answers 404 to the public.
- An address that never existed still answers 404.
- A renamed entry's old address still redirects for 180 days.
- The finder that sees a deleted row is named as an exception in `.claude/rules/database.md`, Rule 4.
- A test covers all four cases.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.
