## MC — Cleanup

MC ids hold grouped clean-up work from the audits, the first being M17.8's duplicated-code audit ([`audits/dry.md`](../audits/dry.md)). They sit in the Z. Cleanup milestone and are numbered on their own, so the waves don't renumber.

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

**MC.9 — Clean Up Styles and Unused Code** · 7.75h

_Story:_ As a developer, I want repeated styles gone and unused code removed or exposed, so that a style change is made once and unused code stops accumulating.

Minted from the duplicated-code audit (M17.8) as one of its grouped clean-up tasks. Findings: D-48, D-57, D-98, D-99, D-165, D-177, D-178, D-194, D-221, D-224, D-225, D-226, D-129, D-145, D-157, D-195, D-86, S-5, S-6, D-243, D-244; each is in `claude-docs/audits/dry.md`. The same flex row, hairline box, `box-sizing` declaration and muted-stroke override are repeated across style sheets, and several hard-coded values, dead rules and restated paddings remain. Production code is kept alive only by tests, exports are used only inside their own file, and some knip config entries are unused or wrong. The CI comment and task-board scripts staging added repeat the comment update and the default-project lookup, and leave dead exports (S-5, S-6). `ignoreExportsUsedInFile: true` hides about 313 exports that only their own file uses; turning it off exposes them so each is un-exported or kept on purpose. `lint:unused` stays non-blocking, with no CI gate and no pre-commit step (owner's call).

_Acceptance criteria:_

- A mixin or token replaces the wrapping flex row, hairline box and muted-stroke overrides (D-48, D-57, D-99), and one global `box-sizing` reset replaces the 68 declarations (D-98)
- Dead CSS and the hard-coded values, restated paddings and nth-child rules are removed or use tokens (D-165, D-177, D-178, D-194, D-221, D-224, D-225, D-226), and `npm run lint:css` passes; a `$hairline-border` token replaces every hand-written `1px solid $hairline`, guarded by `tests/guards/hairline-border.test.ts` (D-221)
- The production code named in D-129 with no production caller is removed together with its tests, and exports used by nothing outside their own file are un-exported or removed (D-145)
- The knip config entries and the false positive are corrected (D-157, D-195)
- `ignoreExportsUsedInFile` is off in the knip config (D-86), and each newly reported export is un-exported or listed with a reason, with the codegen consts, email functions and Pothos Refs handled per class
- `npm run lint:unused` is no worse than before and reports less than before for D-129 and D-145; it stays non-blocking, with no CI gate and no pre-commit step
- `postSingle` reuses `upsertComment` and the four unused `pr-comment.cjs` exports are gone (S-5); `DEFAULT_PROJECT` is removed and one `defaultOf` helper serves the three lookups (S-6)
- The duplicate, unused and test-only exports in D-243 are deleted or un-exported, and `container-from` and `container-to` mixins write every container width query, `container-from` using `(width > X)` so no `0.01rem` step is needed, with `tests/guards/breakpoints.test.ts` refusing a raw `@container` width (D-244)
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass
