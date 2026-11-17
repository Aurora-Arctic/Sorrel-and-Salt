## MC — Cleanup

MC ids hold grouped clean-up work from two audits: M17.8's duplicated-code audit ([`audits/dry.md`](../audits/dry.md)) for MC.1 → MC.9, and M17.10's test performance audit ([`audits/test-performance.md`](../audits/test-performance.md)) for MC.10 → MC.14. They sit in the Z. Cleanup milestone and are numbered on their own, so the waves don't renumber.

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
- The `IngredientForm/index` tests that prove one field move to a `FormProvider` harness or the `MultiSelectField` describe, the repeats are cut or merged as T-22 lists, and the sentence check at `:1099` asserts role and kind
- The `variants` tests named in T-22 use `renderVariants()` and the `:303` repeat is cut
- A new `SpellSteps` harness, modelled on `list-field.test.tsx`, serves the about 38 `SpellBuilder/steps` tests that need one field; the repeats and copy lines in T-22 are cut, and class checks assert `aria-expanded` or an accessible name
- The `compendium` repeats in T-22 are cut, moved to `substitutes.test.tsx` or merged
- Every real sleep in T-23 is replaced by fake timers with `advanceTimersByTimeAsync`, by `typingClock()` or by an `act` flush; the sleeps T-23 keeps (the lock and race guards, the 20 ms database polls, the `pg_sleep` calls and the `setTimeout(0)` flushes) go through one named wait helper in `tests/support/` that says why the wait is the requirement, and a guard in `tests/guards/` refuses a real sleep in a Vitest file outside it; the guard lands in the same commit, is seen failing once with a copy put back, and has an empty allowlist. `setTimeout(0)` flushes are not sleeps and stay (R-7)
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
