# Duplicated Code Audit

This audit lists code in `src/` and `tests/` (styles included) that is written out more than once, so a fix to one copy can be missed in the others. Each finding names every copy, the shared piece that would replace them, a guard that would stop the copies coming back, the fix, and what could break.

Findings are ranked by severity (high, medium, low). High means the copies have already drifted apart or a missed fix would break behaviour. Medium means three or more copies of logic that a future change must touch together. Low means a small repeat, an unused export, or a tidy-up. Inside a severity, a confirmed or possible behaviour bug comes first, then the number of copies, then how widely a missed fix would show.

Each finding records whether it has been fixed in its **Status** line and in the table below. Hours are estimates, not measurements.

Scope (owner, 2026-11-09): the branch for this audit fixes every finding judged a real bug and every high finding (40 findings). Every other medium and low finding becomes a grouped task in the Z. Cleanup milestone and shows "Not fixed: owner moved it to a Z. Cleanup task". D-130 shows that the owner keeps `lint:unused` non-blocking.

## Summary

| Id    | Title                                                                                                                                                        | Severity | Area          | Copies | Hours | Status                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------- | -----: | ----: | ----------------------------------------------- |
| D-1   | Two helpers for numbered pagination in the curator pages, and the keepers help page hand-builds a third                                                      | high     | Pages and lib |      8 |     2 | Fixed                                           |
| D-2   | Quantity formatting has drifted across three components                                                                                                      | high     | Components    |      5 |     3 | Fixed                                           |
| D-3   | Text folding for matching has drifted (`toLowerCase` versus `toLocaleLowerCase`)                                                                             | high     | Components    |      4 |     3 | Fixed                                           |
| D-4   | AdminInvitations/invite-form and InviteDialog are near-identical invite forms, and the validation has drifted                                                | high     | Components    |      2 |     4 | Fixed                                           |
| D-5   | Signed-out support input repeats the signed-in input and has drifted                                                                                         | high     | Server        |      1 |     2 | Fixed                                           |
| D-6   | Help articles: duplicate audience rank map, missing id guard, repeated lookups                                                                               | high     | Server        |      1 |   1.5 | Fixed                                           |
| D-7   | Status label 'Used Up' versus 'Used up' has drifted                                                                                                          | high     | Components    |      1 |   0.5 | Fixed                                           |
| D-8   | three ways to open the per-file `sql` client in `db` tests; 89 files hand-roll it, 18 never end it                                                           | high     | Tests         |    224 |     5 | Fixed                                           |
| D-9   | `const ORIGIN = ...` is redefined in 27 test files, with two different values; `tests/support/oauth.ts` already exports one                                  | high     | Tests         |     33 |     2 | Fixed                                           |
| D-10  | fourteen `insertCoven`/`makeCoven` helpers each insert a workspace and its members with raw SQL                                                              | high     | Tests         |     31 |     6 | Not yet fixed                                   |
| D-11  | e2e specs open a raw `postgres` client inline 36 times, and six files define their own `withSql`                                                             | high     | Tests         |     30 |   3.5 | Not yet fixed                                   |
| D-12  | Breakpoints written by hand in three spellings, plus literal widths                                                                                          | high     | Styles        |     30 |     4 | Fixed                                           |
| D-13  | The "reduced motion" media-query check is copied into eight places                                                                                           | high     | Components    |     26 |  4.75 | Fixed                                           |
| D-14  | The failure message is read three different ways from `readGraphqlFailure`                                                                                   | high     | Components    |     26 |  2.75 | Fixed in part                                   |
| D-15  | Page metadata is written by hand on about 60 pages and has drifted from `publicPageMetadata`                                                                 | high     | Pages and lib |     16 |     4 | Fixed                                           |
| D-16  | Not-found handling written per page (`orNotFound` twice, try/catch about 25 times)                                                                           | high     | Pages and lib |     15 |     3 | Fixed                                           |
| D-17  | Help kind and audience lists typed out in GraphQL, the repository and the components                                                                         | high     | Server        |     14 |   2.5 | Fixed                                           |
| D-18  | Auth message constants and rate-limit handling are defined in one component and imported by four others; `FIELD_ERRORS` re-states `lib/password-refusals.ts` | high     | Components    |     14 |   1.5 | Fixed in part                                   |
| D-19  | Sortable lists: HelpSortable and SortableSteps (and the Combobox entries) copy the dnd-kit wiring                                                            | high     | Components    |     12 |  6.75 | Fixed in part                                   |
| D-20  | Outside-press and Escape dismissal is hand-written at about 11 sites and has drifted                                                                         | high     | Components    |     10 |     8 | Fixed in part: outside press shared             |
| D-21  | "assertMembership, swallow Forbidden" written at least six times                                                                                             | high     | Server        |     10 |     3 | Fixed                                           |
| D-22  | Support time-out panel rebuilds the access-pause panel                                                                                                       | high     | Components    |      7 |     4 | Fixed                                           |
| D-23  | Categories field written twice (SpellBuilder and IngredientForm), including 20 lines of error flattening                                                     | high     | Components    |      7 |   3.5 | Fixed                                           |
| D-24  | `holdServerAnswers` is written seven times in e2e specs and the copies have drifted                                                                          | high     | Tests         |      7 |     2 | Not yet fixed                                   |
| D-25  | Pause validation (end time, note length) written out three times, constants four times                                                                       | high     | Server        |      6 |     2 | Fixed in part                                   |
| D-26  | Retention predicates repeated between the finders and the writers                                                                                            | high     | Server        |      5 |   1.5 | Fixed                                           |
| D-27  | Two category filters are the same function; the grimoire copy has already dropped one term                                                                   | high     | Server        |      4 |     2 | Fixed                                           |
| D-28  | Compendium `reviewOf` is written twice and the copies have drifted                                                                                           | high     | Pages and lib |      4 |   1.5 | Fixed                                           |
| D-29  | GroupForm and GroupedValueForm repeat one form skeleton, and their delete-error handling has drifted                                                         | high     | Components    |      4 |     8 | Fixed                                           |
| D-30  | Viewer's live covens list built three times, one copy drifted                                                                                                | high     | Server        |      3 |     2 | Fixed                                           |
| D-31  | `lockSupportSender` re-writes `timeoutStands` and uses a raw `tx.select()`                                                                                   | high     | Server        |      3 |     1 | Fixed                                           |
| D-32  | Two different `covenSlugOf` functions with the same name                                                                                                     | high     | Pages and lib |      3 |     1 | Fixed                                           |
| D-33  | Coven create and rename repeat the name schema, the slug-race retry and the index names                                                                      | high     | Server        |      2 |   1.5 | Fixed                                           |
| D-34  | Visibility and status lists written three times, one copy without its drift check                                                                            | high     | Server        |      2 |   0.5 | Fixed                                           |
| D-35  | `textList` and the element-array schema are written twice and have drifted                                                                                   | high     | Server        |      2 |     2 | Fixed                                           |
| D-36  | Recipient lookup and signed-out view token written three times in support mail builders                                                                      | high     | Server        |      1 |     2 | Fixed                                           |
| D-37  | "Newest first" cursor key (`-extract(epoch from col)`, `numeric`) is spelled out in ten places beside an existing helper                                     | medium   | Server        |     10 |   1.5 | Fixed                                           |
| D-38  | The correspondence fields block is copied three times, with drifted labels, and its labels repeat in seven more places                                       | medium   | Components    |      9 |     4 | Fixed in part                                   |
| D-39  | the `next/navigation` router mock is declared in about 80 dom and app test files                                                                             | medium   | Tests         |    178 |  3.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-40  | a `QueryClientProvider` render wrapper is rewritten in 61 component test files                                                                               | medium   | Tests         |     61 |     3 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-41  | `/coven/<slug>/...` hrefs built by hand in about 40 places                                                                                                   | medium   | Pages and lib |     55 |    10 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-42  | `vi.mock('@/lib/request-session', ...)` and `vi.mock('@/lib/mail', () => ({ send }))` repeated in 51 and 31 files                                            | medium   | Tests         |     51 |     3 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-43  | `RowId.safeParse(x).success` guarding a NotFound/Forbidden/empty answer, 40+ times; NotFound messages inlined 10-17 times each                               | medium   | Server        |     50 |     4 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-44  | Four local `Failure`/`Refusal` interfaces for Better Auth results, one of which shadows the shared `Failure`                                                 | medium   | Components    |     29 |  4.75 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-45  | The mail-job family is five-times copied (start, message-for/send, step, workflow, report)                                                                   | medium   | Server        |     23 |     3 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-46  | GroupList and GroupedValueList (and AdminInvitations, AdminCards) rebuild one list family file for file                                                      | medium   | Components    |     20 |   6.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-47  | `existsIn(parent, and(eq(parent.id, child.fk), predicate))` repeated about fifteen times                                                                     | medium   | Server        |     19 |   4.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-48  | Wrapping flex row (`display:flex; flex-wrap:wrap; align-items:center; gap`) repeated 25 times                                                                | medium   | Styles        |     19 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-49  | The lede text is written in both a page and its skeleton                                                                                                     | medium   | Pages and lib |     18 |  2.75 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-50  | `src/lib/utc.ts` repeats the `formatToParts` plus `part()` block four times, and one email does its own date formatting                                      | medium   | Pages and lib |     18 |  3.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-51  | "Has text" check (`(x ?? '').trim() !== ''`) written as a local `said` in four places and inline in six more                                                 | medium   | Components    |     16 |  1.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-52  | The coven access flags (`rolePermits` x4) are computed in more than one layout and page                                                                      | medium   | Pages and lib |     15 |   4.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-53  | Untitled-spell name expression written in ten places                                                                                                         | medium   | Components    |     15 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-54  | Hand-written singular/plural ternaries beside an existing `plural()` helper                                                                                  | medium   | Components    |     15 |  3.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-55  | Four public document pages and their versions repeated eight times, plus eight skeletons                                                                     | medium   | Pages and lib |     14 |     4 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-56  | Three near-identical support reply forms                                                                                                                     | medium   | Components    |     14 |   5.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-57  | Hairline surface box repeated 12 times (exact triplicates)                                                                                                   | medium   | Styles        |     14 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-58  | Two pages read search params by hand instead of `single()` and `trimmed()`                                                                                   | medium   | Pages and lib |     13 |  1.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-59  | "named only in an allowed set of files" guards each rebuild the same scanner                                                                                 | medium   | Tests         |     13 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-60  | The pause tables' repository files are near-copies, and re-implement `noEndOrAhead`                                                                          | medium   | Server        |     12 |   3.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-61  | A class-name joiner is hand-written in about nine components with four different idioms                                                                      | medium   | Components    |     12 |     4 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-62  | small e2e helpers copied across specs: `authorOf` x3, `openFilters`/`applyFilters` x2, `grimoireList` x2                                                     | medium   | Tests         |     11 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-63  | Trim, then empty to undefined or null, written inline in eight services                                                                                      | medium   | Server        |     11 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-64  | Value-to-label lookups with a fallback, written eleven times                                                                                                 | medium   | Components    |     11 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-65  | "No such compendium entry" and the curator / uuid guard / NotFound sequence repeated                                                                         | medium   | Server        |     10 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-66  | Readable-spell parent check repeated in `spells.ts` and `workings.ts`; `grimoire.ts` ANDs `notSoftDeleted(spells)` after `readableSpells`                    | medium   | Server        |     10 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-67  | Vocabulary admin services repeat the create and delete sequences                                                                                             | medium   | Server        |      9 |   4.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-68  | Four hand-built hover-tip wrappers on `useTip` in UserList                                                                                                   | medium   | Components    |      9 |     4 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-69  | AdminCards and AdminInvitations small duplicates and hard-coded constants                                                                                    | medium   | Components    |      8 |   3.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-70  | Correspondence columns declared three times                                                                                                                  | medium   | Server        |      8 |  3.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-71  | Delete and remove write hooks repeat one mutation shape                                                                                                      | medium   | Components    |      8 |   3.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-72  | A callback-ref merge written twice                                                                                                                           | medium   | Components    |      8 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-73  | Help article title row and page head repeated across four Help pages and their skeletons                                                                     | medium   | Components    |      8 |  2.75 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-74  | invitation-flow helpers duplicated between `workspace-invitation.spec.ts` and `stories/01-invitations.spec.ts`; Mailpit lookup duplicated again              | medium   | Tests         |      8 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-75  | About 59 hand-written empty-id early returns in the repository                                                                                               | medium   | Server        |      8 |     3 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-76  | The click-feedback action (guard, report, run, report failure) is written eight times                                                                        | medium   | Components    |      8 |     4 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-77  | "Unwrap a loader slot or throw" written three times                                                                                                          | medium   | Server        |      7 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-78  | Members page pages by hand and builds its cursor like the users page                                                                                         | medium   | Pages and lib |      7 |   2.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-79  | Form `sending`/`failure` state and GraphQL error display is hand-written in each form                                                                        | medium   | Components    |      7 |  4.75 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-80  | Five components pair `useOpenModalClick` with `ModalLink` to make a link that opens a modal                                                                  | medium   | Components    |      7 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-81  | Two near-identical `Day` components, plus three inline copies of the ISO-day cell                                                                            | medium   | Components    |      7 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-82  | CupboardEntryForm lists its field names in four places that can drift apart                                                                                  | medium   | Components    |      7 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-83  | The user-dialog block is written out in three keeper pages                                                                                                   | medium   | Pages and lib |      6 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-84  | `SignInMethods/provider-row.tsx` hand-rolls a Remove confirmation the shared confirm pieces already provide                                                  | medium   | Components    |      6 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-85  | Magnifier submit button written in the search box, its idle twin and `SearchField`                                                                           | medium   | Components    |      6 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-86  | `ignoreExportsUsedInFile: true` hides about 313 exports that only their own file uses                                                                        | medium   | Unused code   |      6 |     4 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-87  | Not-blank CHECK SQL written by hand in many tables                                                                                                           | medium   | Server        |      6 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-88  | Seven "lazy wrapper" components repeat `useLazyModule(x, true)` then `module ? <module.default {...props}/> : null`                                          | medium   | Components    |      6 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-89  | Quantity column declared five times without the shared constants' helper                                                                                     | medium   | Server        |      5 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-90  | Boolean ('1') search params copied six times                                                                                                                 | medium   | Components    |      5 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-91  | Invitation page and count twins repeat both scope and filter; `pendingInvitation` and `openInvitation` are near-twins                                        | medium   | Server        |      5 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-92  | Curator group and value types and dialogs are near-copies                                                                                                    | medium   | Pages and lib |      5 |     4 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-93  | The formal-name label (`name (canonicalName)` and `name, canonicalName`) is formatted in five places                                                         | medium   | Components    |      5 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-94  | DateField and DateRangeField duplicate the popover shell, bounds and weekday-word helper                                                                     | medium   | Components    |      5 |     3 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-95  | SignInPanel/in-dialog.test.tsx copies the password-form harness                                                                                              | medium   | Tests         |      5 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-96  | Compendium filter schema repeats two transform shapes                                                                                                        | medium   | Server        |      4 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-97  | CompendiumList re-describes the filter in words beside existing builders                                                                                     | medium   | Components    |      4 |  4.75 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-98  | `box-sizing: border-box` declared 68 times with no global reset                                                                                              | medium   | Styles        |      4 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-99  | Jar muted-stroke overrides repeated in three sheets                                                                                                          | medium   | Styles        |      4 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-100 | the three `lint-*-boundary` guards repeat the probe test and the exemption-directive scanner                                                                 | medium   | Tests         |      4 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-101 | the page-side GraphQL `fetch` is written four times; `graphqlFromPage` already exists                                                                        | medium   | Tests         |      4 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-102 | Coven "not a member" refusal and member-removal sequence repeated                                                                                            | medium   | Server        |      4 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-103 | "Card accepted by this user" written four ways, two as raw SQL                                                                                               | medium   | Server        |      4 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-104 | Jar-row number conversion `quantityOnHand === null ? null : Number(quantityOnHand)` is repeated                                                              | medium   | Pages and lib |      4 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-105 | IngredientForm/duplicates `PlusChoice` re-implements AddIcon's button and glyph                                                                              | medium   | Components    |      4 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-106 | Single-name forms (NameForm, RenameWorkspaceForm) copy each other                                                                                            | medium   | Components    |      4 |     3 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-107 | "this field's server message, or undefined" repeated 8 times in 5 forms                                                                                      | medium   | Components    |      4 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-108 | Plain-state text fields hand-build `fieldDescription` + `FieldShell` + `<input className="input">` in four forms                                             | medium   | Components    |      4 |     3 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-109 | DocumentMailingPanel hand-writes `joinList` and a count pluralisation, twice with drifted wording                                                            | medium   | Components    |      4 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-110 | AboutPillars and AboutRoles are near-copies                                                                                                                  | medium   | Components    |      3 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-111 | Unit compatibility rule stated in three places                                                                                                               | medium   | Server        |      3 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-112 | Spell field list written five times                                                                                                                          | medium   | Server        |      3 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-113 | Public-reply test `eq(supportReplies.visibility, 'public')` written three times, each with a lint disable                                                    | medium   | Server        |      3 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-114 | The keepers and curator area layouts are the same file                                                                                                       | medium   | Pages and lib |      3 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-115 | `readBatches` and `readArrivals` wrap `cache()` around an object argument, which React's cache never matches, and each has one caller                        | medium   | Pages and lib |      3 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-116 | Three cron route handlers are the same function                                                                                                              | medium   | Pages and lib |      3 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-117 | Account tab pages write the panel section markup seven times                                                                                                 | medium   | Pages and lib |      3 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-118 | Three "more" menus repeat the Asking state, trigger ref and alert logic                                                                                      | medium   | Components    |      3 |     4 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-119 | Navigate-to-landing-and-refresh after leaving or deleting a coven is written three times with the same comment                                               | medium   | Components    |      3 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-120 | Three "native control before hydration" fallbacks build the same grouped `<select>`                                                                          | medium   | Components    |      3 |     3 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-121 | the sign-up form fill is written four times                                                                                                                  | medium   | Tests         |      3 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-122 | Compendium slug-move block written twice in `compendium.ts`                                                                                                  | medium   | Server        |      2 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-123 | Same "cupboard insertion on first compendium jar" block in `createStock` and `saveStock`                                                                     | medium   | Server        |      2 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-124 | Invitable roles listed in four places                                                                                                                        | medium   | Server        |      2 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-125 | CategoryChips/category-more re-implements the InfoTip hover, focus and Escape logic                                                                          | medium   | Components    |      2 |     3 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-126 | Two `workingStepsOf` and two `UNAVAILABLE_INGREDIENT` constants                                                                                              | medium   | Components    |      2 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-127 | The "stuck" choice chip (every option leaves the same results) is spelled out per facet                                                                      | medium   | Components    |      2 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-128 | `FacetPanel/facet-switch.tsx` re-implements `Field/switch-field.tsx`                                                                                         | medium   | Components    |      2 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-129 | Production code with no production caller, kept alive by tests only                                                                                          | medium   | Unused code   |      1 |     5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-130 | Make `lint:unused` a gate                                                                                                                                    | medium   | Unused code   |      1 |   0.5 | Not fixed: owner keeps lint:unused non-blocking |
| D-131 | Reopen-on-sender-message update and reply insert written twice                                                                                               | medium   | Server        |      1 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-132 | Cleanup and retention page coordinators are near-copies                                                                                                      | medium   | Server        |      1 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-133 | Inline `new ValidationError([{ path, message }])` where `fieldRefusal(path, message)` exists                                                                 | medium   | Server        |      1 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-134 | Token hash written in four places                                                                                                                            | medium   | Server        |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-135 | Vocabulary group list/count pairs drift between `findPage` and `findGroupPage`                                                                               | medium   | Server        |      1 |   2.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-136 | Page and count twin finders repeat their filter in every repository file                                                                                     | medium   | Server        |      1 |     4 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-137 | Support-request status marks written as seven separate `IconTip` plus button blocks                                                                          | medium   | Components    |      1 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-138 | AccountMenu trigger and panel each derive the same counts and labels                                                                                         | medium   | Components    |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-139 | Combobox repeats option-row, group-heading and indicator markup                                                                                              | medium   | Components    |      1 |     4 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-140 | floating-ui `autoUpdate` wired by hand in four effects                                                                                                       | medium   | Components    |      1 |     3 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-141 | Unverified-email sentence exists in five places                                                                                                              | medium   | Components    |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-142 | Invitation-path regex written three times                                                                                                                    | medium   | Components    |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-143 | `Passkeys` keeps its own `GENERIC` failure text and a re-export used only by a test                                                                          | low      | Components    |      4 |   0.5 | Fixed                                           |
| D-144 | `downloadCodes` re-implements `AdminCards/save-file.ts`                                                                                                      | low      | Components    |      2 |   0.5 | Fixed                                           |
| D-145 | Exports used by nothing outside their own file, and exports under two spellings                                                                              | low      | Unused code   |     52 |  2.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-146 | Dead code, orphaned comments and pass-through wrappers                                                                                                       | low      | Components    |     18 |   4.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-147 | Coven role labels live in a keeper-only folder; site and coven role helpers are split across two folders                                                     | low      | Components    |     16 |  0.75 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-148 | exported helpers and constants in `tests/support/` with no importer                                                                                          | low      | Tests         |     11 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-149 | Case-folded equality and the trim-lowercase fold typed inline                                                                                                | low      | Server        |      7 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-150 | The `zodResolver` type cast is written six ways                                                                                                              | low      | Components    |      7 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-151 | Support sender tier and dialog kind lists typed inline in GraphQL                                                                                            | low      | Server        |      5 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-152 | Published document literal built twice; draft-not-found sequence repeated                                                                                    | low      | Server        |      5 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-153 | Help module small repeats                                                                                                                                    | low      | Server        |      5 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-154 | "Until X" / "with no end date" wording built in five places                                                                                                  | low      | Components    |      5 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-155 | "Back to" link markup: `HelpBackLink` repeats `IngredientEntry/back-link.tsx`'s render and the skeleton rebuilds it                                          | low      | Components    |      5 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-156 | Stand-in user id list and direct `applyAudit(...) as never` inserts                                                                                          | low      | Server        |      4 |  2.75 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-157 | lock-probe.drizzle.config.ts is a false positive; fix the knip config                                                                                        | low      | Unused code   |      4 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-158 | Unique-index names and their race handling repeated as string literals                                                                                       | low      | Server        |      4 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-159 | User search: name-or-email test, and the three-way system-user exclusion                                                                                     | low      | Server        |      4 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-160 | Admin shared files live in `curator/` and the keepers area imports them across the sibling boundary                                                          | low      | Pages and lib |      4 |     2 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-161 | `TABLET_BAND` and its `useSyncExternalStore` subscription written in both PageNav and SectionNav                                                             | low      | Components    |      4 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-162 | "Deleted account" and "Signed-out sender" literals repeated across the support screens                                                                       | low      | Components    |      4 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-163 | `pageshow` "restored from the back-forward cache" effect written three times                                                                                 | low      | Components    |      4 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-164 | Calendar-day regex `/^\d{4}-\d{2}-\d{2}$/` written three times                                                                                               | low      | Components    |      4 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-165 | Dead CSS                                                                                                                                                     | low      | Styles        |      3 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-166 | three guards each carry their own recursive file walker beside the shared `inject('repoFiles')` listing                                                      | low      | Tests         |      3 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-167 | Distinct linked ingredient ids derived twice                                                                                                                 | low      | Server        |      3 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-168 | Cosmetic and stale comments                                                                                                                                  | low      | Server        |      3 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-169 | Mixed deep-relative and `@/` imports across `src/app`                                                                                                        | low      | Pages and lib |      3 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-170 | The mail glue repeats `${origin}/<path>` three times in one file                                                                                             | low      | Pages and lib |      3 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-171 | Help back-bar markup is written in both help form pages, and the edit page repeats the not-found catch                                                       | low      | Pages and lib |      3 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-172 | `readLedgerPage` and `cursorOf` are one-caller wrappers                                                                                                      | low      | Pages and lib |      3 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-173 | Identical `revokeInvitation` mutation document written twice, and three `RemoveControl` names                                                                | low      | Components    |      3 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-174 | Icon-only button boilerplate and SVG wrappers                                                                                                                | low      | Components    |      3 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-175 | document-order assertions via compareDocumentPosition repeated in new tests                                                                                  | low      | Tests         |      3 |  0.75 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-176 | AddIngredientButton has an orphaned doc comment                                                                                                              | low      | Components    |      2 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-177 | Button reset re-implemented                                                                                                                                  | low      | Styles        |      2 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-178 | Declaration written twice in one block                                                                                                                       | low      | Styles        |      2 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-179 | Inline result type repeated as a GraphQL ref type                                                                                                            | low      | Server        |      2 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-180 | Blank-query handling differs between the lookups                                                                                                             | low      | Server        |      2 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-181 | GraphQL `tierScope` written twice                                                                                                                            | low      | Server        |      2 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-182 | Repeated live-row lookups in repository workspace-slugs and provisional users                                                                                | low      | Server        |      2 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-183 | Grimoire categories are mapped to `CardCategory[]` twice                                                                                                     | low      | Pages and lib |      2 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-184 | The demo notice's text choice is written twice                                                                                                               | low      | Pages and lib |      2 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-185 | Narrow-panel page scaffold repeated in Create Coven and Access Paused                                                                                        | low      | Pages and lib |      2 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-186 | Password-section message constants are exported and compared in tests, but the client `STALE_SESSION` wording differs from the server's                      | low      | Components    |      2 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-187 | `.invalid` placeholder-address check is a literal in `PasswordSection/index.tsx` twice and in `lib/email-address.ts`                                         | low      | Components    |      2 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-188 | Two copies of the 99-cap count text                                                                                                                          | low      | Components    |      2 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-189 | Spell card face and burn markup repeated in SpellCard and SpellPreview                                                                                       | low      | Components    |      2 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-190 | DemoNotice and CovenFacts both derive the destination coven from `useNavigationState`                                                                        | low      | Components    |      2 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-191 | "Pick a coven, then Continue" modal written twice in IngredientEntry                                                                                         | low      | Components    |      2 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-192 | SignInDialog restates the sign-in card padding and the phone-column pattern                                                                                  | low      | Components    |      2 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-193 | the sign-in-provider assertion block is repeated                                                                                                             | low      | Tests         |      2 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-194 | Literal spacing where a token exists                                                                                                                         | low      | Styles        |      1 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-195 | Config entries to correct, and a blind spot                                                                                                                  | low      | Unused code   |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-196 | Three identical notifier interfaces                                                                                                                          | low      | Server        |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-197 | "a/an role" noun written three times                                                                                                                         | low      | Server        |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-198 | Batch refusal try/catch around an assert, returning one error per id                                                                                         | low      | Server        |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-199 | Constants: `SYSTEM`, day length, retention cutoff                                                                                                            | low      | Server        |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-200 | Confirm-email Forbidden and "no row" NotFound copies                                                                                                         | low      | Server        |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-201 | Site-admin list services repeat assert, parse filter, page, count                                                                                            | low      | Server        |      1 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-202 | Working report mapping duplicated                                                                                                                            | low      | Server        |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-203 | Compendium entry page assembled twice                                                                                                                        | low      | Server        |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-204 | Vocabulary suggestion wrappers repeat the reader lookup                                                                                                      | low      | Server        |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-205 | LIKE-escape inlined twice in predicates                                                                                                                      | low      | Server        |      1 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-206 | Help repository repeats its sort and filter clauses                                                                                                          | low      | Server        |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-207 | Tier-2 uncurated suggestion select repeated                                                                                                                  | low      | Server        |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-208 | `requireAdminSession` and `requireCuratorSession` are the same function with a different assertion                                                           | low      | Pages and lib |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-209 | `PublicLayout` writes `<main><PageColumn as="div">` once per branch                                                                                          | low      | Pages and lib |      1 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-210 | The `'Prev' \| 'Next'` label union is written three times in `Pager/types.ts`                                                                                | low      | Components    |      1 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-211 | SkeletonFrame writes the context-row lead twice in one file                                                                                                  | low      | Components    |      1 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-212 | Steps selection written four times with no guard                                                                                                             | low      | Components    |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-213 | AppShell `onCuratedPage` re-implements `isAtPath`                                                                                                            | low      | Components    |      1 |  0.25 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-214 | Repeat-announcement NBSP trick written three times                                                                                                           | low      | Components    |      1 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-215 | `Field/radio-group-field.tsx` writes the radio `<input>` three times                                                                                         | low      | Components    |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-216 | `Field/use-form-history.ts` `undo` and `redo` are near-identical                                                                                             | low      | Components    |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-217 | `CovenHome` repeats `id={pending ? undefined : '…'}` with `aria-labelledby` across four sections                                                             | low      | Components    |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-218 | `buildSearchSentence` repeats one "picked values to clause" block fourteen times                                                                             | low      | Components    |      1 |   1.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-219 | `configuredProviders()` call with its lint-disable and comment repeated in three layouts                                                                     | low      | Components    |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-220 | SignInDialog inbox view repeats the "Confirm Your Email" link and `emailPagePath`                                                                            | low      | Components    |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-221 | DocumentPage blockquote CSS hard-codes values                                                                                                                | low      | Components    |      1 |     1 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-222 | Four new stroked-SVG icons repeat the 8-attribute wrapper                                                                                                    | low      | Components    |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-223 | Modal `wasTitled` effect repeats the `wasLoading` effect shape                                                                                               | low      | Components    |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-224 | QR ink colour duplicates SCSS `$chalk`                                                                                                                       | low      | Components    |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-225 | `.page-frame--in-column` margin restates `.page-column` padding                                                                                              | low      | Components    |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |
| D-226 | PageNav skeleton width cycle written as six `nth-child` rules                                                                                                | low      | Components    |      1 |   0.5 | Not fixed: owner moved it to a Z. Cleanup task  |

## Findings

### D-1: Two helpers for numbered pagination in the curator pages, and the keepers help page hand-builds a third

- **Severity:** high (includes a behaviour bug, see Possible Behaviour Bugs)
- **Why it matters:** A keeper on a curator group or value list who opens a stale page link gets an error, while the same stale link on every keepers list lands on page 1. The help page's hand-built cursor can drift from both.
- Copies have drifted: `readNumberedPage` falls back to page 1 on `InvalidCursor`; `resolveNumberedPage` does not.
- **Where:**
  - `src/app/(shell)/curator/group-page.tsx:68`, `src/app/(shell)/curator/value-page.tsx:35` (both `resolveNumberedPage({ after, before }, list, count)`); every keepers list page uses `readNumberedPage` (`keepers/(people)/users/page.tsx`, `privilege-changes/page.tsx`, `card-sign-ups/page.tsx`, `invitation-cards/page.tsx`, `support/reads.ts`); `src/app/(shell)/keepers/help/page.tsx:74-90` hand-builds the cursor (`after === undefined && before !== undefined ? { last: 25, before } : { first: 25, after }`) and calls `resolvePage`.
- **Shared piece:** `readNumberedPage` in `src/lib/numbered-page.ts` already exists. Use it in the three places; delete `resolveNumberedPage` if no caller remains.
- **Guard:** extend `tests/guards/pagination.test.ts` to fail a page file calling `resolvePage` or `resolveNumberedPage` directly.
- **Fix:** 1. Switch `group-page.tsx` and `value-page.tsx`. 2. Switch `readSearch` in the help page. 3. Remove the unused helper. Could break: a stale cursor on the curator group and value lists now lands on page 1 instead of erroring (the intended behaviour elsewhere).
- **Tests covering the callers:** `tests/lib/numbered-page.test.ts`, `tests/lib/pagination.test.ts`, curator group/value e2e specs, keepers help e2e spec.

- **Estimate:** 2 hours
- **Status:** Fixed.

### D-2: Quantity formatting has drifted across three components

- **Severity:** high (includes a behaviour bug, see Possible Behaviour Bugs)
- **Why it matters:** The same amount and unit reads differently in the spell builder, the recipe and the stock badge, with different spacing, rounding and count wording. A fix to one, such as the count unit, leaves the other two showing the old text.
- **Where:**
  - `StepRow/index.tsx` `plainQuantity`
  - `SpellRecipe/summary.tsx` `plain`
  - `StockBadge/stock-words.ts` `withUnit`
  - Related: the recipe ingredient label `labelOf` (`SpellRecipe/body.tsx:24`) against `stepNameOf` (`SpellBuilder/steps/values.ts:236`).
- **Shared piece:** one `formatQuantity(amount, unit)` in `src/lib/` next to the unit helpers (`unitLabel`, `UNIT_OPTIONS`), and one `ingredientLabel` for the name. The three versions render the same fact (amount plus unit) and differ in spacing, rounding and how `count` is handled, so a spell reads differently in the builder, the recipe and the stock badge. A fix to one (for example the `count` unit) misses the others.
- **Guard:** a unit test pinning one table of inputs and outputs for the shared function; callers import it.
- **Fix:** diff the three functions on the same inputs first (write a throwaway table), choose the intended output with the owner, then replace. Risk: visible text changes in one or two places.
- **Tests covering the callers:** `tests/components/StepRow`, `SpellRecipe`, `StockBadge`, `SpellBuilder`.

- **Owner's call:** One string-based quantity formatter in `src/lib` replaces all three.
- **Estimate:** 3 hours
- **Status:** Fixed.

### D-3: Text folding for matching has drifted (`toLowerCase` versus `toLocaleLowerCase`)

- **Severity:** high (includes a behaviour bug, see Possible Behaviour Bugs)
- **Why it matters:** Matching text is lowercased two ways, so a user on a Turkish-locale browser can type a name and fail to match the same name in a picker or duplicate check. Fixing the folding in one component leaves the others broken.
- **Where:**
  - Combobox/index.tsx:102-104; Combobox/typeahead.tsx:11,50 (`toLocaleLowerCase`); Combobox/match.ts:2 (`matchesLabelOrGroup`); IngredientForm/values.ts:406 (`fold`); SpellBuilder/steps/picker.tsx:38,206 (`oneOffKey`); CategoryPicker/index.tsx:104; RecordWorking/form.tsx:93 (`sameText`); HelpArticleForm/sub-pages-field.tsx:48; FacetCombobox/typeahead.tsx:42
- **Shared piece:** `fold(text)` (trim plus one fixed lowercase) in `src/lib/text.ts`, beside `capitalise` and `titleCase`. Combobox/match.ts is its natural neighbour.
- **Guard:** a `tests/guards/` grep for `.trim().toLowerCase()` and `toLocaleLowerCase` in `src/components` outside `lib/text.ts`.
- **Fix:** add `fold`; replace each local copy. Choose `toLowerCase` (locale-independent, as the IngredientForm comment prefers); a Turkish-locale browser would differ under `toLocaleLowerCase`, which is the live bug.
- **Tests covering the callers:** tests/components/Combobox/match.test.ts, Combobox, IngredientForm, SpellBuilder, CategoryPicker, FacetCombobox.

- **Estimate:** 3 hours
- **Status:** Fixed. Pickers fold text through `src/lib/text.ts`, so a Turkish-locale browser matches a capital I as the others do (MoonPhaseIcon and JarShelf had copies too); regression tests in `tests/components/Combobox/typeahead.test.tsx` and `tests/components/SpellBuilder/steps.test.tsx`. `tests/guards/text-folding.test.ts` refuses a hand-written fold in `src/components/`, with an allowlist of EmailForm and CompendiumList facets still to move.

### D-4: AdminInvitations/invite-form and InviteDialog are near-identical invite forms, and the validation has drifted

- **Severity:** high (includes a behaviour bug, see Possible Behaviour Bugs)
- **Why it matters:** A keeper inviting someone can submit an email the client would have refused in the coven invite dialog, and the field error does not clear as they type. The same input is accepted in one form and refused in the other.
- **Where:**
  - `src/components/AdminInvitations/invite-form.tsx:1-154`
  - `src/components/InviteDialog/index.tsx:1-149`
- **Shared piece:** one `InviteForm` component in `src/components/InviteDialog/` (or `InviteForm/`) taking the role options and the submit mutation. Both share the `sending`/`failure` state, the email `FieldShell`, `RadioGroupField`, `FormActions` and `DiscardQuestion`. Only `InviteDialog` validates the email on the client and clears the field error on change; the keeper form does neither, so the same input is accepted or refused differently in the two places.
- **Guard:** none practical.
- **Fix:** move the client-side email check and clear-on-change into the shared form, parameterise role choices (the keeper form also offers Coven Creator per M17.28), keep both call sites thin. Risk: the keeper form's role default (Coven Creator) must survive.
- **Tests covering the callers:** `tests/components/InviteDialog/`, `tests/components/AdminInvitations/`, the invitation e2e specs and Story 62.

- **Extra copies and changes found when merging:**

- **D-4 and D-79 shape:** AdminInvitations/invite-form.tsx (same busy, error and result handling as the form copies in D-4/D-79). BusinessCards/index.tsx (`building`, `buildFailed`, `saved` state, D-79 family).
- **D-125 (chip as tip button or plain span):** CategoryChips/index.tsx:36-46; CategoryChips/category-more.tsx:155-162.
- **D-118 (Asking-menu pattern):** CompendiumCards/card-more.tsx.
- **D-69 (date picks):** AdminCards/filter.tsx:43-68.
- **D-14 (bare `.alert`):** AddIcon/index.tsx:108.
- **D-76 (sign-out shape):** AccountMenu/sign-out-button.tsx.
- **D-105 (Glyph and button):** AddIcon (Glyph and button in index.tsx).
- **D-69 (busy button):** AdminCards/minted.tsx:91-99.

- **Estimate:** 4 hours
- **Status:** Fixed. Both invite forms use the shared address field `src/components/InviteDialog/email-field.tsx`, which checks the address before anything is sent and clears its refusal on edit; regression tests in `tests/components/AdminInvitations/index.test.tsx`, and `tests/guards/invite-forms.test.ts` refuses an invite form that checks the address itself.

### D-5: Signed-out support input repeats the signed-in input and has drifted

- **Severity:** high (includes a behaviour bug, see Possible Behaviour Bugs)
- **Why it matters:** A signed-out person can send an error reference of 65 to 100 characters that the signed-in form accepts and the signed-out form rejects with different wording. A changed limit in one input or schema silently misses the other.
  Severity: high
  Copies:
- `src/modules/support/validation/support.ts:~30-60` (`SupportRequestInput`: `errorReference` max `ERROR_REFERENCE_MAX_LENGTH` = 100, message 'That error reference is too long')
- `src/modules/support/validation/support.ts:~60-85` (`SignedOutSupportRequestInput`: `errorReference` max 64, message 'That reference is too long'; repeats `about` list, `subject`, `message`, `path`, `errorCode`)
- `src/lib/support-path.ts:5,65` (a third `ERROR_REFERENCE_MAX_LENGTH = 100`, exported separately from the one in `validation/support.ts:15`)
- GraphQL mirrors: `src/modules/support/graphql/support.ts:187-211` and `:213-238` (the same six fields twice; descriptions differ: the signed-out path, errorCode and errorReference have none)
  Shared piece: one zod base shape for the shared fields in `validation/support.ts`, extended by each input; one `ERROR_REFERENCE_MAX_LENGTH` imported by `support-path.ts` or the reverse. A GraphQL field-builder function for the shared six fields.
  Guard: none. A bug already lives in the copies: a 65 to 100 character error reference is accepted when signed in and refused when signed out.
  Fix: build `SignedOutSupportRequestInput` from `SupportRequestInput.pick(...)` plus the signed-out `about` subset and the sender fields. Decide with the owner whether 64 or 100 is right.
  Tests covering the callers: `tests/modules/support/` signed-out and signed-in create tests; `tests/e2e/` signed-out support form spec.
  Estimate: 2 h

- **Estimate:** 2 hours
- **Status:** Fixed. The signed-out support form now allows the same 100-character error reference as the signed-in one, and both share the `about` choices; regression test "same limit signed-in and signed-out" in `tests/modules/support/validation/support.test.ts`.

### D-6: Help articles: duplicate audience rank map, missing id guard, repeated lookups

- **Severity:** high (includes a behaviour bug, see Possible Behaviour Bugs)
- **Why it matters:** A developer changing the help audience order must edit two rank maps or ranking disagrees. Update and delete skip the id check the other help calls make, so a malformed id may reach Postgres and show a keeper a driver error instead of Not Found.
- **Where:**
  - src/modules/help/services/help-writes.ts local `WIDTH: Record<HelpAudience, number>` beside the imported `HELP_AUDIENCE_RANK` (`@/lib/help-audience`, same values); `updateHelpArticle` and `deleteHelpArticle` call `findOneById` with no `RowId` guard while `setHelpArticleShown`, help-reads.ts:176-178 and help-rename.ts:49-50 guard it and throw `NotFound('Help article not found')`.
- **Shared piece:** use `HELP_AUDIENCE_RANK` in place of `WIDTH`; one `requireHelpArticle(id)` in help-reads.ts used by all five callers.
- **Guard:** none practical.
- **Fix:** replace `WIDTH`; add the helper; a non-uuid id to update/delete currently reaches Postgres and may raise a driver error (not verified). Add a regression test.
- **Tests covering the callers:** tests/modules/help services tests.

- **Estimate:** 1.5 hours
- **Status:** Fixed. Updating or deleting a help article now refuses an id that is not a uuid with `NotFound`, as the other help services do, rather than a database cast error; regression test in `tests/modules/help/services/help-writes.test.ts`. The audience rank map is written once in `src/lib/help-audience`.

### D-7: Status label 'Used Up' versus 'Used up' has drifted

- **Severity:** high (includes a behaviour bug, see Possible Behaviour Bugs)
- **Why it matters:** A keeper sees the card status as 'Used Up' in the filter and 'Used up' in the table for the same status. This breaks the Title Case label rule and looks like two different statuses.
- **Where:**
  - src/components/AdminCards/filter.tsx:20-26 (`STATUS_OPTIONS`, 'Used Up'); src/components/AdminCards/batches.ts:21-26 (`STATUS_LABEL`, 'Used up')
- **Shared piece:** one status-to-label map in AdminCards/batches.ts; `STATUS_OPTIONS` is derived from it. The project rule is Title Case for labels, so 'Used Up' is the likely correct text; confirm with the owner.
- **Guard:** none practical beyond deriving one from the other, which makes drift impossible.
- **Fix:** build `STATUS_OPTIONS` from `STATUS_LABEL`; pick one spelling. A test or story that asserts either text must be updated.
- **Tests covering the callers:** tests/components/AdminCards/*

- **Estimate:** 0.5 hours
- **Status:** Fixed. One shared label reads "Used Up" everywhere.

### D-8: three ways to open the per-file `sql` client in `db` tests; 89 files hand-roll it, 18 never end it

- **Severity:** high
- **Why it matters:** a fix to client options or teardown misses 89 files; 18 leak a connection until the harness FORCE-drops the database
- **Where:**
  - `useTestDatabase(bind)` in `tests/support/db/database.ts:11-25`: used by 224 files (the standard).
  - `useRawClient()` in `tests/support/db/probe-tables.ts:83-88`: used by 23 files, same job but without `onnotice: () => {}`, so notices print.
  - Hand-rolled `let sql; beforeAll(() => { sql = postgres(process.env.DATABASE_URL as string, ...) }); afterAll(() => sql.end())` in 89 files (list: `grep -rl "sql = postgres(process.env.DATABASE_URL" tests`, minus the 224). 56 pass `{ onnotice }`, 26 do not. 18 have no `afterAll` at all, e.g. `tests/db/graphql-query-scopes.test.ts`, `tests/db/repository/ingredients.test.ts`, `vocabularies.test.ts`, `slugs.test.ts`, `tests/modules/ingredients/graphql/{common-names,compendium,duplicates,ingredient,ingredient-suggestions}.test.ts`, `tests/modules/ingredients/services/{ingredient-suggestions,common-names-plan,duplicates,duplicates-plan,replaced-entries,common-name-suggestions}.test.ts`, `tests/modules/ingredients/loaders/{references,ingredient-children}.test.ts`, `tests/support/graphql-workspace-probes.ts`.
- **Shared piece:** `useTestDatabase` (existing). Make `useRawClient` a one-line alias or delete it and point its 23 callers at `useTestDatabase`; migrate the 89.
- **Guard:** extend `tests/guards/` (or an oxlint `no-restricted-syntax`) to fail on `postgres(process.env.DATABASE_URL` outside `tests/support/`.
- **Fix:** replace the beforeAll/afterAll pair with `useTestDatabase((client) => { sql = client; })`. Files that need a second client or `max` options stay, named in an allowlist. Risk: files whose `beforeAll` also does other setup keep that setup in its own hook; order between hooks is declaration order.
- **Tests covering the callers:** the files themselves.

- **Estimate:** 5 hours
- **Status:** Fixed.

### D-9: `const ORIGIN = ...` is redefined in 27 test files, with two different values; `tests/support/oauth.ts` already exports one

- **Severity:** high

**Part 1: `const ORIGIN = ...` is redefined in 27 test files, with two different values; `tests/support/oauth.ts` already exports one**

- **Why it matters:** drifted: 13 files use `http://localhost:3000`, 11 use `http://localhost:8000`; `oauth.ts:9` exports the 8000 one and the rest do not import it
- **Where:**
  - `grep -rln "^const ORIGIN = " tests` (27 files). Same pattern for `const MAILPIT_URL = 'http://mailpit.test'` (9 files), `const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001'` (5 files; 7 more use two other spellings of the same id), `const USER_ID` (7 files), `const PASSWORD` (8 files, two phrases).
  - `tests/lib/invitation-link-mail.test.ts` (new); the constant is exported by `tests/support/oauth.ts:9`; other copies in `tests/proxy.test.ts`, `tests/workflows/*.test.ts`, `tests/modules/coven/services/invitations.test.ts`, `tests/modules/support/services/support-retention.test.ts` (extra copy of D-9).
- **Shared piece:** `tests/support/fixtures/constants.ts` exporting `TEST_ORIGIN` (and `TEST_MAILPIT_URL`, `TEST_WORKSPACE_ID`, `TEST_USER_ID`); `oauth.ts` re-exports or imports it. Decide first whether 3000 and 8000 both matter: a test that reads the origin from env config must keep its value, a test that only needs "an origin" takes the shared one.
- **Guard:** none practical.
- **Fix:** replace per file; check each 3000 file for a dependency on `BETTER_AUTH_URL` or `NEXT_PUBLIC_*` before changing it.
- **Tests covering the callers:** the 27 files.

**Part 2: `const ORIGIN = 'http://localhost:8000'` in a new lib test**

- **Why it matters:** A developer changing the test origin or port must edit every file with its own copy. A missed file keeps using the old origin and fails, or worse, passes while testing the wrong address.
- **Shared piece:** import `ORIGIN` from `tests/support/oauth.ts`, or move it to `tests/support/paths.ts`.
- **Guard:** a `tests/guards/` grep for `const ORIGIN =` under `tests/`.
- **Fix:** replace with an import.
- **Tests covering the callers:** each file.

- **Owner's call:** Every test imports the one `ORIGIN`, set to `http://localhost:8000`.
- **Estimate:** 2 hours
- **Status:** Fixed.

### D-10: fourteen `insertCoven`/`makeCoven` helpers each insert a workspace and its members with raw SQL

- **Severity:** high
- **Why it matters:** drifted: some take `{ demo }`, some `joined_at`, some return `{id, slug}`, return types differ; a schema column change breaks each
- **Where:**
  - `tests/modules/coven/services/member-role.test.ts:14-24`, `last-owner.test.ts:11-24`, `member-pause.test.ts:24-38`, `member-removal.test.ts:15-25`, `workspace-deletion.test.ts:13-`, `member-roster.test.ts:10-`, `workspace-rename.test.ts:22-`, `invitation-revocation.test.ts:26-`, `invitations.test.ts:56-`, `members.test.ts:29-45` (inline in beforeAll), `tests/modules/coven/graphql/workspace-rename.test.ts:24-`, `tests/modules/coven/schema/workspace-slugs-schema.test.ts:52-`, `tests/db/migrations/0142-workspace-slugs.test.ts:27-`, `tests/support/graphql-workspace-probes.ts:151-`, `tests/e2e/stories/07-admin.spec.ts:27-`, `tests/e2e/stories/coven-ingredients.ts:31-`, `tests/e2e/stories/accounts-setup.ts:40-`. Further inline `insert into workspace_members` (no helper) in about 25 more files (see `grep -rl "insert into workspace_members" tests`), among them `tests/modules/coven/services/membership.test.ts`, `memberships.test.ts`, `member-pause-mail.test.ts`, `tests/modules/ingredients/services/covens-holding.test.ts`, `held-compendium-entries.test.ts`, `compendium-held-in.test.ts`, `covens-opening-entry.test.ts`, `tests/workflows/pause-mail.test.ts`, `tests/e2e/coven.spec.ts:44-`, `shell.spec.ts:56-`, `coven-switcher.spec.ts`, `menu-button-edge.spec.ts`, `navigation-wait.spec.ts`, `forced-colours.spec.ts`.
- **Shared piece:** `tests/support/db/insert-workspace.ts` with `insertWorkspace(sql, overrides?, members?)` built on the existing `makeWorkspace`/`workspaceColumns` (`tests/support/fixtures/workspace.ts`). This matches the rule in `.claude/rules/testing.md` that ingredient and spell tests seed through `insert-ingredient.ts`/`insert-spell.ts`; there is no workspace equivalent. `workspaceColumns(makeWorkspace(...))` is already repeated in 25 files, which shows the need.
- **Guard:** a guard that fails when a test file other than `insert-workspace.ts` contains `insert into workspaces` or `insert into workspace_members` in a SQL tag. Exempt tests whose subject is the write path or a schema constraint (`tests/db/repository/memberships.test.ts`, `invitations.test.ts`, `tests/db/migrations/*`), by name.
- **Fix:** write the helper (members as `[userId, role]` or `{userId, role, joinedAt}`, `demo`, created_by defaulting to A), migrate callers one directory at a time. Risk: tests asserting `created_by`/`updated_by` need the actor kept explicit.
- **Tests covering the callers:** every file listed; all in the `db` project.

- **Estimate:** 6 hours
- **Status:** Not yet fixed

### D-11: e2e specs open a raw `postgres` client inline 36 times, and six files define their own `withSql`

- **Severity:** high

**Part 1: e2e specs open a raw `postgres` client inline 36 times, and six files define their own `withSql`**

- **Why it matters:** three drifted copies of the wrapper already; the other 30 inline copies repeat the try/finally/`sql.end()`
- **Where:**
  - Wrapper defined six times: `tests/e2e/stories/accounts-setup.ts:12-19`, `tests/e2e/stories/coven-ingredients.ts:15-22`, `tests/e2e/stories/07-admin.spec.ts:18-`, `tests/e2e/stories/08-email-and-admin.spec.ts:18-`, `tests/e2e/stories/01-invitations.spec.ts:31-`, `tests/e2e/workspace-invitation.spec.ts:20-`.
  - Inline `const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} }); try { ... } finally { await sql.end(); }` in: `help-widgets.spec.ts:22`, `support-sender-statuses.spec.ts:19,50`, `admin-support-curator.spec.ts:32`, `admin.spec.ts:171,310`, `admin-support-layout.spec.ts:18`, `compendium-cache.spec.ts:13` (passes `COMPENDIUM_CACHE_DATABASE`), `admin-help-order.spec.ts:28`, `coven.spec.ts:39`, `route-protection.spec.ts:46`, `admin-support-views.spec.ts:18`, `document-versions.spec.ts:58`, `account.spec.ts:74`, `support-view-link.spec.ts:91`, `support-sender-resolve.spec.ts:20`, `shell.spec.ts:43`, `stories/90-admin-support.spec.ts:44`, `admin-compendium.spec.ts:292,397,465,555,632,687,1019,1112`, `help-articles.ts:31,156`, and `session.ts:56,98` (two more inside `signInAs`/`signInAgainAs`).
  - `tests/e2e/sign-in-dialog.spec.ts:22-29` `withSql` (7th copy of D-11)
  - `tests/e2e/sign-in-dialog.spec.ts` `beforeAll`: raw `insert` of a workspace, a member and an invitation with `createHash` of the token (extra copy of D-10)
  - `VERIFY_LINK` identical in `tests/e2e/sign-in-dialog.spec.ts`, `tests/e2e/stories/16-password.spec.ts:18`, `tests/e2e/stories/08-email-and-admin.spec.ts:47`
  - `PASSWORD = 'lantern moss under the north window'` (5th e2e copy of D-9)
  - local `field` helper (4th near-copy)
- **Shared piece:** one exported `withE2eSql<T>(fn, database?)` in `tests/e2e/database.ts` (it already owns `e2eDatabaseUrl`). The six `withSql` copies become re-exports or are deleted; `session.ts` uses it too.
- **Guard:** a `tests/guards/` scan that fails when a file under `tests/e2e/` other than `database.ts` calls `postgres(`.
- **Fix:** add the helper, replace each `postgres(...)`+try/finally with `await withE2eSql(async (sql) => {...})`. Mechanical. Risk: a few blocks hold the client across `await page...` calls; keep the callback boundary identical to the old try block.
- **Tests covering the callers:** the specs themselves (run each touched spec once, named together).

**Part 2: sign-in-dialog.spec.ts re-declares the e2e helpers and fixture inserts that other specs already copy**

- **Why it matters:** adds the 7th `withSql`, the 3rd identical `VERIFY_LINK`, and raw invitation inserts; one fix to any helper already misses it
- **Shared piece:** the D-11 `tests/support/` e2e SQL wrapper, the D-10 invitation inserter, and one exported `VERIFY_LINK`, `PASSWORD` and `field` in `tests/support/` (e.g. `tests/support/password.ts`, `email-verification.ts`, which exist).
- **Guard:** the D-11 guard (forbid `postgres(` in `tests/e2e/**` outside support).
- **Fix:** do it with D-11, D-10 and D-9 in one pass; this spec only adds a caller. Could break: the spec's `scrolled` and `clickInPlace` are bespoke and stay.
- **Tests covering the callers:** `tests/e2e/sign-in-dialog.spec.ts`, `tests/e2e/stories/16-password.spec.ts`, `tests/e2e/stories/08-email-and-admin.spec.ts`.

- **Extra copies and changes found when merging:**

- D-11: `sign-in-dialog.spec.ts` is the 7th `withSql` (D-11).
- D-10: raw invitation and workspace inserts in `sign-in-dialog.spec.ts` (D-11).
- D-39: inline router mocks (D-39).
- D-9: `PASSWORD` 5th e2e copy; `ORIGIN` (D-11, D-9).
- D-42: auth-client mock shape now in 7 files (D-95).
- D-24: `holdServerAnswers` still in `tests/e2e/skeleton-layout.spec.ts` (now `:262`, used `:524`). No new copy.

- **Estimate:** 3.5 hours
- **Status:** Not yet fixed

### D-12: Breakpoints written by hand in three spellings, plus literal widths

- **Severity:** high
- **Why it matters:** copies have drifted: `max-width: $shell-phone-width`, `max-width: #{$shell-phone-width}`, and `min-width: calc(#{$shell-phone-width} + 0.01rem)` all mean the same edge; literals ignore the tokens
- **Where:**
  - `max-width` phone edge, about 30 copies: `src/app/globals.scss:44`, `src/scss/_frame-bar.scss:73`, `src/scss/_primitives.scss:558,572,583,606,1336,1352,1375,1416`, `src/components/Backdrop/index.scss:72,85,104`, `src/components/Backdrop/_sorrel.scss:46`, `src/components/DocumentPage/index.scss:31`, `src/components/IngredientEntry/index.scss:192,713,722,731`, and the remaining hits of `grep -rnE "max-width: #?\{?\$shell-phone-width" src --include='*.scss'`.
  - `min-width: calc(<edge> + 0.01rem)`, 30 copies: `src/scss/_mixins.scss:490,505`, `src/scss/_primitives.scss:750`, `src/components/DocumentPage/index.scss:40`, `src/components/TabbedPage/index.scss:43`, `src/components/IngredientEntry/index.scss:28,171,265,403,534,701`, `src/components/IngredientEntry/formal-name.scss:28`, `src/components/PageNav/index.scss:182,247`, and the rest of `grep -rn "+ 0.01rem" src --include='*.scss'`.
  - Tablet edge, 10 copies: `src/components/HelpOutline/index.scss:236,292`, `src/components/AdminCards/index.scss:137`, `src/components/AccountMenu/index.scss:271`, plus the `+ 0.01rem` forms above.
  - Literal widths where `$shell-*` tokens exist or should be added: `src/components/PageHeader/index.scss:11` (75rem), `src/components/HelpSearchForm/index.scss:43` (20rem), `src/components/HelpIndex/index.scss:113` and `src/components/HelpGlossary/index.scss:30` (40rem), `src/components/DateRangeField/index.scss:70` (48rem), `src/components/JarShelf/index.scss:29`, `.storybook/story-frame.scss:16`, `.storybook/foundations.scss:368` (30rem).
- **Shared piece:** mixins in `src/scss/_mixins.scss`: `phone-down`, `above-phone`, `tablet-down`, `above-tablet` (content block), each owning the `0.01rem` offset once. Add named tokens for the 20/30/40/48/75rem literals in `_variables.scss`, or document each as a deliberate one-off.
- **Guard:** a `tests/guards/` test that fails on any `@media` containing `min-width` or `max-width` in `src/**/*.scss` outside `_mixins.scss` and `_variables.scss`.
- **Fix:** add mixins, replace mechanically with a script (regex per spelling), run `npm run lint:css` and the visual specs. Risk: `calc()` in media queries is lowered by the build; the mixin must emit the same output.
- **Tests covering the callers:** none for CSS directly; the e2e responsive specs and `tests/e2e/stories` run the layouts. Run the specs of touched components.

- **Estimate:** 4 hours
- **Status:** Fixed.

### D-13: The "reduced motion" media-query check is copied into eight places

- **Severity:** high

**Part 1: The "reduced motion" media-query check is copied into eight places**

- **Why it matters:** In a browser with no matchMedia, some components play fades and others do not, so one user sees mixed motion. A person who asks for reduced motion may still get animations from any copy that was missed.
- **Where:**
  - `src/components/MenuButton/index.tsx:29-32` and `src/components/Modal/modal.tsx:41-44` (identical `fadesAreOff`, same doc comment), `src/components/ClickFeedback/fade.ts:14-16` and `src/components/FacetPanel/choice-chip.tsx:31-33` (same body), `src/components/ThemeToggle/index.tsx:55-56`, `src/components/IngredientForm/duplicates.tsx:251-252`, `src/components/SearchSentence/index.tsx:30,167` and `src/lib/use-slide.ts:9,26` (each with its own `REDUCED_QUERY` constant). They have drifted: some treat a missing `matchMedia` as "reduced" (`=== 'function' ||`), others as "not reduced" (`?.matches === true`), so the same browser gets different behaviour in different components.
  - `src/components/IngredientForm/duplicates.tsx:251-252` (`reducedMotion`, `?.` guard)
  - `src/components/ThemeToggle/index.tsx:55-56` (`prefersReducedMotion`, `?.` guard)
  - `src/components/Modal/modal.tsx:43-44` (no guard)
  - `src/components/FacetPanel/choice-chip.tsx:32-33` (no guard)
  - `src/components/MenuButton/index.tsx:31-32` (no guard)
  - `src/components/ClickFeedback/fade.ts:14-16` (`fadesAreOff`, `typeof` guard)
  - `src/components/SearchSentence/index.tsx:30` and `src/lib/use-slide.ts:9,28` (constant string, unguarded)
  - `FacetPanel/choice-chip.tsx:28-33` (`FADE_LIMIT_MS`, exported `fadesAreOff`)
  - `FacetPanel/shell.tsx:19,29,62,114` (imports `fadesAreOff` from `./choice-chip`; its own `LEAVE_LIMIT_MS = 400`)
  - `MenuButton/index.tsx:25-32` (`FADE_LIMIT_MS = 400`, `fadesAreOff`)
  - `Modal/modal.tsx:41-44` (`fadesAreOff`)
  - `IngredientForm/duplicates.tsx:252` (inline `matchMedia?.('(prefers-reduced-motion: reduce)')`)
  - `src/components/MenuButton/index.tsx:27`, `src/components/Modal/modal.tsx:31`, `src/components/ClickFeedback/fade.ts:11`, `src/components/FacetPanel/choice-chip.tsx:28`. The scss in `Modal/index.scss:98` says "FADE_LIMIT_MS there outlasts this", so the constant is coupled to a CSS duration, and the four JS copies can drift apart from it unnoticed.
- **Shared piece:** `prefersReducedMotion()` in `src/lib/` (new `src/lib/reduced-motion.ts`, browser only), with one stated answer for a missing `matchMedia`. `use-slide.ts` and `SearchSentence` use it too.
- **Guard:** an oxlint `no-restricted-syntax` rule (or `tests/guards/` grep) failing on the literal `prefers-reduced-motion` outside `src/lib/reduced-motion.ts`, `.scss` and pre-paint scripts.
- **Fix:** add helper; replace the eight call sites; choose the missing-API default once (the `fadesAreOff` meaning, "treat as reduced", is the safer one for waiting on `transitionend`). Risk: a behaviour change in the components that now flip default; check each one's waits on `transitionend`.
- **Tests covering the callers:** `tests/components/Modal/`, `MenuButton/`, `ClickFeedback/`, `FacetPanel/`, `ThemeToggle/`, `SearchSentence/`, `tests/lib/use-slide.test.ts`.

**Part 2: "Is reduced motion on?" query written in ten places, with two different safety guards (drifted)**

- **Why it matters:** copies have drifted: some guard a missing `matchMedia`, some do not, so a test environment without it throws in some components only
- **Shared piece:** `prefersReducedMotion()` in a new `src/lib/reduced-motion.ts` (guarded form, with the query constant).
- **Guard:** an oxlint `no-restricted-syntax` rule on the string literal `'(prefers-reduced-motion: reduce)'` outside `src/lib/reduced-motion.ts`, or a `tests/guards/` grep test.
- **Fix:** add the helper, import it in all eight places. Risk: none beyond the guard being added to the unguarded sites.
- **Tests covering the callers:** `tests/components/Modal/`, `MenuButton/`, `FacetPanel/`, `ThemeToggle/`, `ClickFeedback/`, `IngredientForm/duplicates*`, `tests/lib/use-slide*`.

**Part 3: `fadesAreOff` and the 400 ms fade limit are written four times, and FacetPanel exports one copy for another file**

- **Why it matters:** The fade-off check and 400 ms limit exist four times, and FacetPanel exports one for another file to borrow. One copy treats missing matchMedia as motion allowed and the rest as off, so a change to reduced-motion handling reaches only some components.
- **Shared piece:** `src/lib/motion.ts` exporting `fadesAreOff()` and `FADE_LIMIT_MS`. Nothing like it exists in `src/lib/` today.
- **Guard:** a `tests/guards/` test that fails on the string `prefers-reduced-motion` in `.ts`/`.tsx` outside `src/lib/motion.ts`.
- **Fix:** create the helper, replace the five copies, drop the `choice-chip` export that `shell.tsx` borrows. The duplicates.tsx copy treats a missing `matchMedia` as "motion allowed", the other three as "motion off"; pick one (the three) and say so. Risk: the duplicates behaviour changes in jsdom-less environments only.
- **Tests covering the callers:** `tests/components/FacetPanel/`, `tests/components/MenuButton/`, `tests/components/Modal/`, `tests/components/IngredientForm/`.

**Part 4: Four copies of `FADE_LIMIT_MS = 400` (extra copies of D-13 territory, but a separate constant)**

- **Why it matters:** The 400 ms fade limit is coupled to a CSS duration, but four JS copies exist. Changing the CSS time while missing one copy makes a modal or menu cut off its fade early or wait too long, and nobody is warned.
- **Shared piece:** one exported constant (with the `prefersReducedMotion()` helper D-13 proposes) in `src/lib/reduced-motion.ts` or `src/lib/fade.ts`.
- **Guard:** the D-13 grep guard can also fail on `const FADE_LIMIT_MS` outside the shared file.
- **Fix:** do it in the same change as D-13, since the same four files are touched.
- **Tests covering the callers:** as D-13.

- **Extra copies and changes found when merging:**

- See D-13 for the `FADE_LIMIT_MS` constant in the same four files.

- **Owner's call:** One shared reduced-motion hook, an exported fade-limit constant, and a guard test that refuses a new inline reduced-motion `matchMedia`.
- **Estimate:** 4.75 hours
- **Status:** Fixed.

### D-14: The failure message is read three different ways from `readGraphqlFailure`

- **Severity:** high

**Part 1: The failure message is read three different ways from `readGraphqlFailure`**

- **Where:**
  - `.alert ?? GENERIC_FAILURE` (nine sites): `IngredientEntry/delete-entry.tsx:67`, `IngredientEntry/cupboard-writes.tsx:124`, `InvitationAcceptance/index.tsx:83`, `SpellRecipe/delete-spell.tsx`, `src/lib/graphql-failure.ts:35`, and others
  - bare `.alert` (about thirteen sites): `AdminCards/download-csv.tsx:24`, `IngredientEntry/review-mark.tsx:64`, `AddIcon/index.tsx:108`, `ConfirmedAction/index.tsx:96`, `DocumentEditor/editor.tsx:119`, `IngredientForm/read-failure.tsx:11`, `IngredientForm/index.tsx:548` and `:726`, `ShownSwitch/index.tsx:69`, `UserList/pause-control.tsx:75`, `LeaveWorkspaceButton/owner-exit.tsx:126`, `ReceivedInvitations/accept-control.tsx:50`
  - `src/components/RecordWorking/completion.tsx:163`, `src/components/SpellRecipe/delete-spell.tsx:44`, `src/components/SpellRecipe/duplicate-spell.tsx:42`, `src/components/SupportRequestByLink/index.tsx:90`, `src/components/UserDetail/pause-panel.tsx:19` (a local `refusal` const), plus `IngredientEntry/cupboard-writes.tsx`, `IngredientEntry/delete-entry.tsx`, `InvitationAcceptance/index.tsx` (outside my folders). `src/components/Modal/confirm-question.tsx:39` does the same with `readGraphqlIssues(error)[0]?.message ?? GENERIC_FAILURE`, which reads a different field and so may word a refusal differently from the other nine.
  - `src/components/LeaveWorkspaceButton/owner-exit.tsx:126` (bare `.alert` passed to `report()`) and `:134-136` (`...but you did not leave. ${readGraphqlFailure(error).alert}`). `readGraphqlFailure` without `fields` returns an optional `alert`, so the second message can read "...but you did not leave. undefined". D-14 lists `:126` but not the template-string use at `:135`, which is worse because it prints a literal `undefined` rather than clearing the callout.
- **Why it matters:** The same failure is read three different ways, so a user hitting the same refusal can see different wording depending on which screen they are on. A fix to the message reading has to be found in every place.
- **Shared piece:** `failureMessage(error): string` in `src/lib/graphql-failure.ts`.
- **Guard:** a lint-style guard test that no component reads `readGraphqlFailure(...).alert` directly.
- **Fix:** add the helper, replace both forms mechanically.
- **Tests covering the callers:** the component tests of each folder named.

**Part 2: `readGraphqlFailure(error).alert ?? GENERIC_FAILURE` written at nine call sites**

- **Why it matters:** Nine places repeat the failure fallback and the confirm dialog reads a different field. A user refused with both an alert and an issue sees different wording on the confirm dialog than elsewhere, and a fallback change misses sites.
- **Shared piece:** `failureMessage(error: unknown): string` exported from `src/lib/graphql-failure.ts` next to `GENERIC_FAILURE`.
- **Guard:** an oxlint `no-restricted-syntax` rule or a `tests/guards/` grep that fails on `.alert ?? GENERIC_FAILURE` outside `graphql-failure.ts`.
- **Fix:** add the helper, replace the nine; decide whether `confirm-question.tsx` should use it too (it would change which message shows when a refusal has both an alert and an issue).
- **Tests covering the callers:** `tests/components/RecordWorking/`, `SpellRecipe/`, `SupportRequestByLink/`, `UserDetail/`, `Modal/`, `tests/lib/graphql-failure.test.ts`.

**Part 3: `LeaveWorkspaceButton/owner-exit.tsx` interpolates `readGraphqlFailure(error).alert` into a sentence with no fallback (bug, drifted from the sibling flow)**

- **Why it matters:** A steward whose leave fails after a successor is promoted can read 'but you did not leave. undefined' when the response carries no alert. The user sees a broken sentence at a stressful moment about their access.
- **Shared piece:** the `failureMessage(error): string` proposed in D-14/D-14 in `src/lib/graphql-failure.ts`.
- **Guard:** the guard proposed in D-14 (no direct `readGraphqlFailure(...).alert` in components).
- **Fix:** use `failureMessage(error)` in both places in `owner-exit.tsx`. Add a regression test that a failed leave (after the successor is promoted) with a response that carries no alert reads a sentence without "undefined".
- **Tests covering the callers:** `tests/components/LeaveWorkspaceButton/`.

- **Extra copies and changes found when merging:**

- `DocumentEditor/editor.tsx` `writeDraft`: `readGraphqlFailure(error).alert` used bare.
- `GroupForm/index.tsx:300-310`: `readGraphqlIssues(error)` then `issues.map(({ message }) => message).join(' ')`, a fourth way.

- `src/components/LeaveWorkspaceButton/owner-exit.tsx:126` (already named in D-14) and `:135` (not named; see D-14).

`readGraphqlFailure(error).alert ?? GENERIC_FAILURE` also appears in `SpellRecipe/delete-spell.tsx`, `SpellRecipe/duplicate-spell.tsx`, `UserDetail/pause-panel.tsx:19` (`refusal`), `SupportRequestByLink/index.tsx:90` and `UserList/pause-control.tsx:75` (`.alert` only).

- **Estimate:** 2.75 hours
- **Status:** Fixed in part. `failureMessage(error)` in `src/lib/graphql-failure.ts` gives the sentence a failed request shows, falling back to its first validation issue, and eight components use it; `tests/guards/failure-message.test.ts` refuses reading `.alert` or the first issue by hand in `src/components/`, with an allowlist of the twelve components still to move. The "undefined" sentence in the coven exit cannot happen, since a failure without fields always carries an alert.

### D-15: Page metadata is written by hand on about 60 pages and has drifted from `publicPageMetadata`

- **Severity:** high
- **Why it matters:** The same public page shows a different link preview depending on which file wrote its metadata, since only compendium pages get Open Graph and Twitter tags. A noindex comment copied into eight files can be missed, leaving a private page indexable.
- **Where:**
  - 67 `export const metadata` or `generateMetadata` sites under `src/app/`. `publicPageMetadata` in `src/lib/page-metadata.ts` (adds canonical, openGraph and twitter) is used only by the compendium pages. The public pages (`src/app/page.tsx`, `src/app/sign-in/page.tsx`, `src/app/(public)/help/page.tsx`, `help/glossary/page.tsx`, `help/search/page.tsx`, `src/app/(public)/support/page.tsx`, `support/request/page.tsx`, the four document pages) write `alternates: { canonical: siteUrl('/...') }` themselves and have no openGraph or twitter tags, so the same page shows different link previews depending on which file wrote it. The same comment and `robots: { index: false }` ("A second guard beside robots.txt...") is copied in 8 files: `forgot-password/page.tsx`, `reset-password/page.tsx`, `access-paused/page.tsx`, `(public)/help/search/page.tsx`, `(shell)/coven-paused/[slug]/page.tsx`, `(shell)/help/staff/page.tsx`, `(shell)/help/staff/[slug]/page.tsx`, `(shell)/help/staff/[slug]/[child]/page.tsx`.
- **Shared piece:** use `publicPageMetadata` on every public page, and add `noIndexMetadata(title)` to `src/lib/page-metadata.ts` for the eight noindex pages.
- **Guard:** `tests/guards/` check that a page under `(public)` exports metadata made by the helper, or a metadata snapshot of the canonical and social tags per public route.
- **Fix:** 1. Add `noIndexMetadata`. 2. Move the 8 noindex pages. 3. Move each public page to `publicPageMetadata`. 4. Check `node_modules/next/dist/docs/` for how `metadata` merges with `titleTemplate` in this Next version before changing the title field. Could break: pages whose title already goes through `titleTemplate`; a doubled site name.
- **Tests covering the callers:** `tests/lib/page-metadata.test.ts`, SEO e2e specs.

- **Extra copies and changes found when merging:**

- Every page under both areas sets `export const metadata = { title: ... }` by hand (for example `keepers/help/page.tsx:32-34`, `keepers/help/new/page.tsx:8-10`); `keepers/help/[id]/page.tsx:24-32` and the other `generateMetadata` pages re-read the record with `requireAdminSession()` in a second call. Titles come from `ADMIN_PAGES[...].label` on some pages and string literals on others.

- **Owner's call:** Every public page uses `publicPageMetadata`; signed-in pages get a smaller shared helper that sets the title only.
- **Estimate:** 4 hours
- **Status:** Fixed.

### D-16: Not-found handling written per page (`orNotFound` twice, try/catch about 25 times)

- **Severity:** high
- **Why it matters:** Not-found handling is written per page about 25 times, in two copies of the helper. A page that forgets the catch shows a visitor a server error instead of a 404, and a change to the 404 rule must be found everywhere.
- **Where:**
  - `orNotFound` in `src/app/(public)/_documents.tsx:18-25` and `src/lib/help-pages.ts:22-29` (same job, two files). `catch ... instanceof NotFound -> notFound()` written inline in `src/app/(public)/compendium/page.tsx`, `compendium/ingredients/[slug]/page.tsx`, `compendium/ingredients/[slug]/opengraph-image.tsx`, `src/app/compendium-reads.ts`, `(shell)/coven/[slug]/grimoire/[id]/page.tsx`, `grimoire/(list)/reads.ts`, `ingredients/reads.ts`, `ingredients/[id]/page.tsx`, `(shell)/curator/list-page.tsx`, `(shell)/keepers/support/reads.ts`, `(shell)/keepers/documents/[key]/page.tsx`, `(shell)/keepers/help/[id]/page.tsx`, `(shell)/account/(tabs)/support/reads.ts`.
- **Shared piece:** export the `src/lib/help-pages.ts` `orNotFound` from a neutral file (`src/lib/or-not-found.ts`), delete the copy in `_documents.tsx`, and make the other files call it. `src/lib/request-session.ts` already does the same thing for coven guards.
- **Guard:** an oxlint `no-restricted-syntax` rule or a `tests/guards/` grep for `instanceof NotFound` in `src/app/**` outside the helper.
- **Fix:** 1. Create the helper (generic over the return type). 2. Replace each try/catch where the catch only calls `notFound()`; leave those that do more (log, redirect). 3. Check each copy's catch really rethrows other errors. Could break: a copy that also catches `Forbidden`.
- **Tests covering the callers:** `tests/e2e` specs for the documents, help and compendium pages; `tests/app/**` for reads files.

- **Extra copies and changes found when merging:**

- `keepers/documents/[key]/page.tsx:16-19`, `keepers/support/reads.ts:144-150`, `keepers/help/[id]/page.tsx:15-22`. `readOrMissing` (`curator/list-page.tsx:27-34`) already exists and is not used here.

- `src/app/(shell)/coven/[slug]/grimoire/(list)/reads.ts` `readEditedSpell` (~78-100) returns `undefined`; `readLookedSpell` (~165-180) returns `undefined` for these and `{ failed }` for the rest
- `src/app/(shell)/coven/[slug]/grimoire/[id]/page.tsx` `spellOf` (~39-48, `notFound()`)
- `src/app/(shell)/coven/[slug]/ingredients/reads.ts` `readEditedEntry` and `readViewedEntry` (two `undefined`)
- `src/app/(shell)/coven/[slug]/ingredients/[id]/page.tsx` `entryOf` (`notFound()`)
- `src/app/(shell)/coven/[slug]/(people)/members/page.tsx:~38-45` (`Forbidden -> notFound()`)
- `src/app/(shell)/coven-paused/[slug]/page.tsx` (`Forbidden -> notFound()`)
- `src/app/(public)/compendium/ingredients/[slug]/opengraph-image.tsx` (twice)
- `src/app/(public)/compendium/ingredients/[slug]/page.tsx` `entryAt`, `reviewOf`, `sourcingOf`
- `src/app/(public)/compendium/page.tsx` `heldEntryIds` (`Forbidden -> empty`), `reviewOf`
- `src/app/plus-covens.ts` `covensHolding`
- `src/app/(shell)/account/(tabs)/support/reads.ts`
- `src/app/(public)/_documents.tsx` has a private `orNotFound` (a copy of the one in `src/lib/help-pages.ts`) and a `versionDocumentMetadata` `NotFound -> {}`.

- **Estimate:** 3 hours
- **Status:** Fixed.

### D-17: Help kind and audience lists typed out in GraphQL, the repository and the components

- **Severity:** high

**Part 1: Help kind and audience lists typed out in GraphQL, the repository and the components**

- **Why it matters:** The help kinds and audiences are typed in GraphQL, the repository and three components. Adding a kind such as a new article type in one place leaves the API, database filter or editor refusing or hiding it, so keepers cannot save or see it.
- **Where:**
  - `src/modules/help/graphql/help.ts:24-34` (`['faq','article','guide','term']`, `['public','staff','keeper']`), `src/db/repository/help.ts:24` (`['public','staff','keeper']`), `src/components/HelpOutline/types.ts:4`, `src/components/HelpSearchResults/types.ts:4`, `src/components/HelpArticleForm/types.ts:3` (the kind union, three times). Other modules build their GraphQL enums from the schema's `enumValues`; help does not.
  - src/modules/help/validation/help.ts:4-5 redefines `z.enum(['faq','article','guide','term'])` and `z.enum(['public','staff','keeper'])`.
  - `src/components/HelpArticleForm/rules.ts:3-17` (`NOUNS`, `AUDIENCE_LABELS`, `NARROWNESS`)
  - `src/components/HelpArticleForm/types.ts` (`HelpFormKind`, `HelpFormAudience`)
  - `src/components/HelpArticleForm/form.tsx:89` (`KINDS`) and its `AUDIENCES` array
  - `src/components/HelpOutline/types.ts` (`HelpOutlineKind`, `HelpOutlineAudience`)
  - `src/components/HelpOutline/index.tsx` (`KIND_LABELS`, same text as `NOUNS`)
  - `src/components/HelpOutline/guides-bar.tsx:31` (`AUDIENCES = ['public','staff','keeper']`)
  - `src/components/HelpOutline/filter.tsx:18-25` (`KIND_OPTIONS`, `AUDIENCE_OPTIONS`)
  - `src/components/HelpSearchResults/types.ts` (kind union inline)
- **Shared piece:** `HELP_KINDS` and `HELP_AUDIENCES` constants beside the help schema, used by the GraphQL enums and the repository; the component types derive from the generated `src/gql` type or a shared type.
- **Guard:** none practical.
- **Fix:** export the constant lists from the help schema or a type-only file, use them in `builder.enumType`; replace the component unions with the shared type.
- **Tests covering the callers:** `tests/modules/help/`, `tests/db/` help repository specs, the help component tests.

**Part 2: Extra copies of D-17 (help validation enums)**

- **Why it matters:** The help validation lists kinds and audiences again, so adding one to the shared constants still gets refused by the validator. A keeper sees a validation error saving a valid article until the extra copy is updated.
- **Shared piece:** build the enums from the constants in `@/lib/help-audience` and the kinds list, as D-17 proposes.
- **Guard:** as D-17.
- **Fix:** import the tuple constants.
- **Tests covering the callers:** tests/modules/help validation tests.

**Part 3: Help kind and audience labels, ranks and unions are redeclared in four components**

- **Why it matters:** copies already differ in shape: three type names for one union, two label maps for one lib map
- **Shared piece:** `src/lib/help-audience.ts` already exports `HELP_AUDIENCE_LABELS`, `HELP_AUDIENCE_RANK`, `byAudience`, `placeInAudience`, and `HelpAudience` comes from `@/modules/help`. `AUDIENCE_LABELS` and `NARROWNESS` re-implement the first two. Add one `HELP_KIND_LABELS` and a `HELP_AUDIENCES` list beside them, and alias the types to `HelpAudience` / a `HelpKind` from the module.
- **Guard:** none practical beyond knip; a `tests/guards/` test that greps components for `'public', 'staff', 'keeper'` literals would work.
- **Fix:** delete the four local maps and unions, import the lib ones. Risk: the form's `NARROWNESS` rank must stay public < staff < keeper; the lib rank is the same order.
- **Tests covering the callers:** `tests/components/HelpArticleForm/`, `tests/components/HelpOutline/`, `tests/lib/help-audience.test.ts` if present.

- **Estimate:** 2.5 hours
- **Status:** Fixed. The GraphQL enums and the validator take the help kinds and audiences from the schema's enum values, the component types alias `@/modules/help`'s, and the audience labels and rank live once in `src/lib/help-audience`; `tests/modules/help/lists.test.ts` fails if any list drifts.

### D-18: Auth message constants and rate-limit handling are defined in one component and imported by four others; `FIELD_ERRORS` re-states `lib/password-refusals.ts`

- **Severity:** high
- **Why it matters:** Password form messages are restated, so if the shared too-short or too-long wording changes, the sign-in form still shows the old sentence. Rate-limit handling is written in six places, so a user can get different messages for the same too-many-attempts refusal.
- **Where:**
  - `src/components/SignInPanel/password-form.tsx:30-34` (`FIELD_ERRORS` repeats the PASSWORD_TOO_SHORT and PASSWORD_TOO_LONG sentences held in `src/lib/password-refusals.ts:4-7`, whose own header says every form that chooses a password shares it, so this copy can drift). `TOO_MANY_ATTEMPTS` (`password-form.tsx:25`) imported from `../SignInPanel/password-form` by `ForgotPasswordForm/index.tsx:9`, `ResetPasswordForm/index.tsx:10`, `PasswordSection/index.tsx:15`, `PasswordSection/two-factor.tsx:17`. `WRONG_CODE` (`SignInPanel/two-factor-step.tsx:17`) imported by `PasswordSection/two-factor.tsx:18`. The `status === 429 ? TOO_MANY_ATTEMPTS : GENERIC` branch is written at `password-form.tsx:55`, `PasswordSection/index.tsx:48,98`, `PasswordSection/two-factor.tsx:56`, `ForgotPasswordForm/index.tsx:36`, `ResetPasswordForm/index.tsx:57`.
- **Shared piece:** `src/lib/auth-messages.ts` (browser-safe, beside `password-refusals.ts`) holding `TOO_MANY_ATTEMPTS`, `WRONG_CODE`, `WRONG_CREDENTIALS` and generic sentences, and a small `rateLimited(failure)` helper. `SignInPanel/password-form.tsx` should use `newPasswordRefusal` from `lib/password-refusals.ts` for the length codes and keep only `INVALID_EMAIL` locally.
- **Guard:** a `tests/guards/` test that no component imports another component's non-component, non-type exports (`from '../<Other>/...'` for a constant), or that the length sentences appear once in `src/`.
- **Fix:** move constants; point the five imports at the lib file; delete the local `FIELD_ERRORS` length entries. Risk: stories and tests importing the constants from the old path.
- **Tests covering the callers:** `tests/components/SignInPanel/`, `ForgotPasswordForm/`, `ResetPasswordForm/`, `PasswordSection/`, `tests/lib/password-refusals.test.ts` if present.

- **Extra copies and changes found when merging:**

- `TOO_MANY_ATTEMPTS` is defined in `SignInPanel/password-form.tsx:23` and again in `ForgotPasswordForm`, `ResetPasswordForm`, `PasswordSection/index.tsx` and `PasswordSection/two-factor.tsx` (grep: five files).
- `PASSWORD_CHECK_UNAVAILABLE` (ResetPasswordForm) and `SIGN_UP_UNAVAILABLE` (password-form) say the same refusal for a 500 from the breached-password check.

- **Estimate:** 1.5 hours
- **Status:** Fixed in part. `src/lib/auth-messages.ts` holds the too-many-attempts, wrong-code and wrong-credentials sentences and `rateLimited`, and `tests/guards/auth-messages.test.ts` requires each sentence once under `src/`. Still to move: ForgotPasswordForm and ResetPasswordForm import the too-many-attempts sentence through a re-export in `SignInPanel/password-form` and test the rate limit by hand.

### D-19: Sortable lists: HelpSortable and SortableSteps (and the Combobox entries) copy the dnd-kit wiring

- **Severity:** high

**Part 1: Sortable lists: HelpSortable and SortableSteps (and the Combobox entries) copy the dnd-kit wiring**

- **Why it matters:** The drag-and-drop reorder wiring is copied in three lists. A fix for keyboard reorder or screen-reader announcements in one leaves the other lists broken for keyboard and assistive-technology users, and the rollback notice wording drifts.
- **Where:**
  - `src/components/HelpOutline/sortable.tsx:1-133` (`HelpSortable`, `useHelpSortableRow`)
  - `src/components/SpellBuilder/steps/sortable.tsx:1-96` (`SortableSteps`; elsewhere, about 80% identical to the first)
  - `src/components/Combobox/sortable.tsx` (`ComboboxSortableEntries`, same sensors and announcements with `arrayMove`)
  - Grip button markup: `HelpOutline/sortable.tsx:~108-130`, `SpellBuilder/steps/step-row.tsx:~55-76`, `Combobox/entry.tsx:~43`; `GripIcon` lives in `Combobox/icons.tsx`
  - Optimistic reorder with rollback, written twice: `HelpOutline/guides-bar.tsx:~165-185` (`save(move)`) and `HelpOutline/order-table.tsx:~128-145`, each with its own "Could not move X. It is back where it was." Notice
  - `src/components/HelpOutline/guides-bar.tsx:185-230`, `src/components/HelpOutline/order-table.tsx` (the `onMove`, the `orderKey`/`seenKey` state-sync block, the "Could not move X. It is back where it was." Notice with Try Again, and each file's own `Move` interface), plus `HelpOutline/sortable.tsx` wiring.
- **What repeats:** `useId`, `useKeyboardTarget`, a `coordinateGetter` over `Set(['ArrowUp','ArrowDown','Home','End'])` (`ROW_KEYS` / `STEP_KEYS`), `useSortableSensors`, announcements, `onDragStart` / `onDragEnd` / `settle`. They differ only in the rect returned (steps account for height) and the `<ol>` wrapper. `MOVE_KEYS` already exists in `src/lib/sortable`.
- **Shared piece:** a `SortableColumn` component or `useSortableColumn` hook in `src/lib/sortable/` taking `ids`, `onMove`, `label` and a rect-offset option; a shared `GripHandle`; a `useOptimisticOrder` hook for the rollback.
- **Guard:** none practical. Once `SortableColumn` exists, a grep guard that `useSortableSensors` is imported only there is possible.
- **Fix:** extract from `HelpSortable`, port `SortableSteps`, then Combobox. Risk: keyboard and screen-reader behaviour differs subtly per list; the existing component tests for each must still pass.
- **Tests covering the callers:** `tests/components/HelpOutline/`, `tests/components/SpellBuilder/`, `tests/components/Combobox/`, help-outline and spell-builder e2e specs.

**Part 2: HelpOutline guides-bar and order-table repeat one optimistic-reorder block (extra copies of D-19)**

- **Why it matters:** drifted: guides-bar guards `if (!move) return`, order-table `onMove` indexes `listed[from]` and `listed[to]` unguarded
- **Shared piece:** one `useOptimisticOrder` hook in `src/components/HelpOutline/` (or `src/lib/`, next to `sortable.ts`), returning `{ order, move, failed, retry }`, and one `MoveFailedNotice`.
- **Guard:** none practical.
- **Fix:** extract the hook with the guard from guides-bar, point both at it. Risk: guides-bar groups per audience, so the hook takes a save callback and the list.
- **Tests covering the callers:** `tests/components/HelpOutline/*`.

- **Estimate:** 6.75 hours
- **Status:** Fixed in part. `SortableColumn` in `src/lib/sortable/column.tsx` serves the help outline and the spell steps, and `useOptimisticOrder` serves the guides bar and the order table; `tests/guards/sortable-wiring.test.ts` keeps the sortable hooks to `column.tsx` and `Combobox/sortable.tsx`. The Combobox chips keep their own keyboard coordinates, since they wrap. Still to share: one grip button for `SpellBuilder/steps/step-row.tsx` and `Combobox/entry.tsx`.

### D-20: Outside-press and Escape dismissal is hand-written at about 11 sites and has drifted

- **Severity:** high

**Part 1: Outside-press and Escape dismissal is hand-written at about 11 sites and has drifted**

- **Why it matters:** The eleven outside-click and Escape handlers disagree on event type, phase and focus return. A keyboard or touch user may find some menus close on outside press and return focus, while others do not, and a fix lands in only some.
- **Where:**
  - AccountMenu/index.tsx:48-64; CategoryChips/category-more.tsx:89-107; SectionNav/section-links.tsx:173-174; FacetPanel/shell.tsx:132; FacetPanel/choice-chip.tsx:129; HelpTerm/index.tsx:47; DateField/calendar.tsx:82,97; MenuButton/index.tsx:139; Combobox/summary.ts:44; SpellBuilder/steps/index.tsx:98; ClickFeedback/index.tsx:147-172 (all under src/components/)
  - `FacetPanel/choice-chip.tsx:129-130`, `FacetPanel/shell.tsx:132-133`
  - Elsewhere: `MenuButton/index.tsx:139-140`, `AccountMenu/index.tsx:58-61`, `HelpTerm/index.tsx:47-48`, `Combobox/summary.ts:44-45` (capture phase), `CategoryChips/category-more.tsx`, `SpellBuilder/steps/index.tsx`, `DateField/calendar.tsx` (inside my area; it uses Floating UI dismissal, check before porting)
- **Shared piece:** a `useDismiss({ open, refs, onDismiss })` hook in `src/lib/use-dismiss.ts`. The copies disagree on `window` versus `document`, capture versus bubble, `pointerdown` versus `mousedown`, and whether Escape returns focus. That disagreement is the drift.
- **Guard:** an oxlint `no-restricted-syntax` rule or a `tests/guards/` grep test against `addEventListener('pointerdown'|'mousedown'` in `src/components` outside the hook.
- **Fix:** write the hook with the most robust variant (document, capture, pointerdown); move each site over one by one; check which sites need focus return. Risk: capture order against Downshift menus.
- **Tests covering the callers:** tests/components/AccountMenu, CategoryChips, MenuButton, DateField, HelpTerm, FacetPanel, Combobox.

**Part 2: Outside-`pointerdown` close listeners are hand-written in eight components**

- **Why it matters:** Eight components hand-write the outside-press close with differing phases and extras. A user may find one popover stays open after a tap elsewhere while another closes, and a fix to touch handling reaches only the copies someone remembers.
- **Shared piece:** `useOutsidePress(ref, active, onOutside)` in `src/lib/` (a hook, not a component). Floating UI's `useDismiss` is already a dependency of DateField and Combobox, and may serve every popover instead.
- **Guard:** none practical; a grep guard on `addEventListener('pointerdown'` would flag the legitimate drag code in Field/pointer-held.ts and ClickFeedback.
- **Fix:** write the hook from the two FacetPanel copies, port the other six, keep Combobox's capture phase as an option. Risk: some copies also close on a focus change or Escape, so the hook takes only the pointer part.
- **Tests covering the callers:** `tests/components/FacetPanel/`, `MenuButton`, `AccountMenu`, `HelpTerm`, `Combobox`.

- **Estimate:** 8 hours
- **Status:** Fixed in part. Outside-press dismissal goes through `useDismiss` in `src/lib/use-dismiss.ts`, used by AccountMenu, SectionNav, CategoryChips, HelpTerm, MenuButton, Combobox, FacetPanel and DateField, and `tests/guards/dismissal.test.ts` refuses a new hand-written `pointerdown` or `mousedown` listener in `src/components/`. The press listener now runs in the capture phase everywhere. Three sites stay as they are because they are not plain dismissals: SpellBuilder steps (a press paired with its release), ClickFeedback (it also closes on focus moving out) and Field pointer-held. Not yet shared: Escape handled in `onKeyDown` in MenuButton, FacetPanel and Combobox, and the Escape listeners in HelpOutline guides-bar and InfoTip `use-tip`.

### D-21: "assertMembership, swallow Forbidden" written at least six times

- **Severity:** high
- **Why it matters:** The check-membership-and-swallow-refusal pattern returns undefined, null or the error depending on the file. A caller that misreads the convention can treat a refused person as allowed or an empty result, risking a leak of another coven's data.
- **Where:**
  - `services/ingredient-rows.ts:55-61` `proofFor` (returns undefined); `services/compendium-held-in.ts:30-38` `proofsOf` (returns null); `services/cupboard-entries.ts:126-131` `entriesOf` (returns the error); `services/stock.ts` `jarsOf` and `formsHeldBy` (return the error, two copies); the same shape in `grimoire/services/spell-reads.ts:183`, `coven/services/members.ts:70`, `help/services/reach.ts`, `support/services/reads.ts` (three).
- **Drift:** three different return conventions (undefined, null, the error), so each caller handles "refused" differently. No helper exists in `@/modules/coven` (checked `src/modules/coven/index.ts` and `services/membership.ts`).
- **Shared piece:** `tryMembership(session, workspaceId, permission): Promise<Membership | Forbidden>` in `src/modules/coven/services/membership.ts`, exported through the barrel. Callers that want undefined do `result instanceof Forbidden ? undefined : result`.
- **Guard:** a `tests/guards/` check that no module outside `coven` has `catch` blocks containing `instanceof Forbidden` next to `assertMembership` (grep-level).
- **Fix:** add the helper; replace the ingredients copies first, the other modules in a follow-up task (one task per PR).
- **Tests covering the callers:** `tests/modules/ingredients/` stock, cupboard-entries, held-in specs; `tests/modules/coven/membership*.test.ts`.

- **Estimate:** 3 hours
- **Status:** Fixed for the workspace services (ingredients, coven, grimoire), which share one membership-refusal helper; `tests/guards/membership-refusal.test.ts` refuses a new hand-written catch of `Forbidden` around `assertMembership`. The similar catches in `help/reach.ts` and `support/reads.ts` wrap `assertSiteAdmin` and are a different check, so they stay.

### D-22: Support time-out panel rebuilds the access-pause panel

- **Severity:** high

**Part 1: Support time-out panel rebuilds the access-pause panel**

- **Why it matters:** The time-out panel for a support sender and the pause panel for a user are near copies. A keeper fix to one, such as a validation rule, busy state or announcement, misses the other, so the two screens behave differently for the same job.
- **Where:**
  - `SupportRequests/timeout-panel.tsx:1-247` (StandingCard 87-105, TimeoutForm 111-176, TimeoutPanel 178-247)
  - `UserDetail/pause-panel.tsx:1-196` (StandingCard 21-62, PauseForm 64-136, PausePanel 138-196)
  - Already share only `UserDetail/access-pause-parts.tsx` (PauseFields, Ledger, Until, endOf). Both import `../SupportRequests/timeout-panel.scss` / `./timeout-panel.scss`.
  - `src/components/UserList/pause-control.tsx:1-60` (own `STATES` map, `PAUSE_QUESTION`, `useClickFeedback`, `BusyButton`) and `src/components/UserDetail/pause-panel.tsx` (same flow, already part of D-22).
- **Shared piece:** make `PausePanel` generic over its copy (badge text "Paused" / "Timed Out", section title, button labels "Pause Access"/"Time Out Sender", busy words, announcement, `noteRequired`, whether `message` is required, optional `earlierHref` info link, `send(until, note, message)`, `lift`). `TimeoutPanel` becomes a thin wrapper that supplies the copy and the two-target `send`. Move the shared panel, `access-pause-parts.tsx` and the three pause types out of `UserDetail/` into a neutral folder (for example `PausePanel/`), since `SupportRequests` and `MemberDetail` import `UserDetail` internals today.
- **Guard:** none practical (a structural copy); a story/test on both wrappers covers drift.
- **Fix:** 1) add `badge`, `buttons`, `earlierHref`, `messageRequired` to `PausePanelCopy`. 2) Port the Lift button's `Lift Time-Out` label via copy. 3) Reduce `TimeoutPanel` to the wrapper. Risk: the two panels' reset-after-send, `refresh()` and `onChanged` ordering differ slightly (the timeout form does not call `onChanged`; PausePanel's lift refreshes, TimeoutPanel's Lift does not call refresh).
  The time-out `LiftButton` lacks `onSent={refresh}` while the pause one has it: already a drift, so verify which is intended.
- **Tests covering the callers:** tests/components/SupportRequests, tests/components/UserDetail, tests/components/MemberDetail (check names with `ls tests/components`).

**Part 2: `UserList/pause-control.tsx` hand-rolls the pause flow that `UserDetail/pause-panel.tsx` has**

- **Why it matters:** The user list pause control hand-rolls the pause flow already in the detail panel. A keeper pausing someone from the list can get different confirmation, busy feedback or errors than from the detail page, and fixes miss the list.
- **Shared piece:** fold into the D-22 shared pause/time-out piece; the list row uses a compact variant of the same confirm, mutation and feedback sequence.
- **Guard:** none practical.
- **Fix:** do together with D-22. Could break: the row layout, which is the only part that should stay local.
- **Tests covering the callers:** `tests/components/UserList/`, `tests/components/UserDetail/`.

- **Extra copies and changes found when merging:**

- `src/components/MemberDetail/coven-access-panel.tsx:113-120` builds `AccessPauseEntry` with a local `person()` mapper that falls back to `'Unknown'`, and imports `access-pause-parts`, `pause-panel` and `types` from `../UserDetail/`. No new copies, but the folder reaches into a sibling's internals (as D-22 says).

`NOTE_HINT` is declared again in `UserDetail/pause-panel.tsx` and `access-pause-panel.tsx` beside the timeout-panel copy.

- **Estimate:** 4 hours
- **Status:** Fixed. The support time-out panel is a thin wrapper over the shared `PausePanel` in `src/components/UserDetail/pause-panel.tsx`, which now carries every word through `PausePanelCopy`, and the site and coven pause panels share `PAUSE_WORDS`. A refused time-out now shows its reason through `failureMessage`, and lifting one refreshes the page as lifting a site pause does. The per-row coven pause in `UserList/pause-control.tsx` has its own flow and stays.

### D-23: Categories field written twice (SpellBuilder and IngredientForm), including 20 lines of error flattening

- **Severity:** high

**Part 1: Categories field written twice (SpellBuilder and IngredientForm), including 20 lines of error flattening**

- **Why it matters:** The categories field with its error flattening is copied in the spell and ingredient forms. A fix to how chip errors show for a steward leaves the other form wrong, and the two forms fetch the category list in different shapes.
- **Where:**
  - `src/components/SpellBuilder/categories-field.tsx:30-69` and `src/components/IngredientForm/categories.tsx:51-96`. The `entryIssues` / `message` block (per-chip errors joined with the field-level error) is identical in both. The file's own comment says "The same picker as ../IngredientForm/categories.tsx". Also `SpellBuilder/category-index.ts` imports `CategoriesDocument` from `IngredientForm/categories` (a component folder reaching into another's field file), and the two fetch the same categories list with two different shapings (`useCategoryIndex` returns names and colours; `CategoryField` uses `find`).
  - `src/components/IngredientForm/categories.tsx:45-95` (`CategoryField`)
  - `src/components/SpellBuilder/categories-field.tsx:26-70` (`SpellCategoriesField`), whose own comment says "The same picker as ../IngredientForm/categories.tsx"
  - `src/components/SpellBuilder/category-index.ts:15-20` imports `CategoriesDocument` from `IngredientForm/categories.tsx`, so the query lives in a component file of an unrelated folder
- **Shared piece:** a `useCategoryField(name)` hook (or a `CategoryFieldFor` component taking the react-hook-form field name) in `src/components/CategoryPicker/`, which owns `CategoriesDocument` and `useCategoryIndex`, so both forms render `<CategoryFieldFor name="categoryIds" />`.
- **Guard:** none practical.
- **Fix:** move `CategoriesDocument` and the index hook into `CategoryPicker/`; move the error flattening into the shared hook; both forms keep only their name.
- **Tests covering the callers:** `tests/components/SpellBuilder/`, `tests/components/IngredientForm/`, `tests/components/CategoryPicker/`.

**Part 2: The Categories form field (error-message assembly plus `CategoryPicker`) is written in IngredientForm and again in SpellBuilder**

- **Why it matters:** two near-identical 45-line copies; one already drifted: SpellBuilder reads categories through `useCategoryIndex`, IngredientForm runs its own `useQuery` on the same `CategoriesDocument`, and `at`/`action`/`boxName` differ
- **Shared piece:** one `CategoriesField({ name, boxName, action })` (generic over the form's values) plus `useCategoryIndex` and `CategoriesDocument` moved to `src/components/CategoryPicker/` (it already owns `PickerCategory`). Both forms render it.
- **Guard:** none practical.
- **Fix:** move the document and hook into `CategoryPicker/`, build the field there taking the RHF field name, delete both copies. The array-error-to-message block (`entryIssues` / `message`) is also a candidate helper for the other list fields in `IngredientForm/fields.tsx`, `variants.tsx`, `references.tsx`, which import the same `FormFieldError` and `get` (see D-13).
- **Tests covering the callers:** `tests/components/IngredientForm/`, `tests/components/SpellBuilder/`, `tests/components/CategoryPicker/`.

- **Estimate:** 3.5 hours
- **Status:** Fixed. `CategoryPicker` holds `CategoriesField`, its query and `useCategoryIndex`, used by IngredientForm and SpellBuilder.

### D-24: `holdServerAnswers` is written seven times in e2e specs and the copies have drifted

- **Severity:** high
- **Why it matters:** drifted: prefetch requests are aborted in two copies, passed through in four, and ignored in one; one also holds `/api/graphql`; two count navigations, three expose `held()`
- **Where:**
  - `tests/e2e/skeleton-layout.spec.ts:315-` (aborts prefetch, `held()`), `skeleton-back-scroll.spec.ts:15-` (aborts prefetch, `held()`), `skeleton-footer.spec.ts:10-` (no prefetch handling, no `held()`), `grimoire-skeleton.spec.ts:47-` (lets prefetch through), `stack-row-skeleton.spec.ts:64-` (lets prefetch through, also holds `/api/graphql`), `coven-switch-demo-notice.spec.ts:18-` and `navigation-wait.spec.ts:65-` (count non-prefetch navigations).
- **Shared piece:** `tests/e2e/hold-server-answers.ts` exporting `holdServerAnswers(page, { prefetch: 'abort' | 'pass' | 'hold', alsoGraphql?: boolean })` returning `{ hold, release, held, navigations }`. The existing `tests/e2e/navigation-wait.spec.ts` is the richest copy.
- **Guard:** none practical beyond a grep guard for `async function holdServerAnswers` outside the helper file.
- **Fix:** the options keep each spec's present behaviour exactly (the drift is a real difference only where the spec depends on it; check each when converting, since a spec that aborted prefetch may be relying on no prefetch reaching the server). Risk: timing-sensitive skeleton specs; run all seven once.
- **Tests covering the callers:** the seven specs.

- **Estimate:** 2 hours
- **Status:** Not yet fixed

### D-25: Pause validation (end time, note length) written out three times, constants four times

- **Severity:** high

**Part 1: Pause validation (end time, note length) written out three times, constants four times**

- **Why it matters:** Pause end and note checks are written three times with different rules. A keeper must give a note while a coven steward need not, and the 500 limit sits in a fourth place, so a rule change lands in one pause path and not the others.
- **Where:**
  - `src/modules/identity/services/access-pause.ts:29-35,53-67` (`NOTE_MAX_LENGTH`, `PAST_END`, `LONG_NOTE`, `NO_NOTE`, the `until` instanceof/NaN/past check, note trim and length)
  - `src/modules/coven/services/member-pause.ts:22-29,57-66`
  - `src/modules/support/services/timeouts.ts:20-40` (`checkedNote`, the only one already extracted)
  - `src/lib/pause-message.ts:3` `MESSAGE_MAX_LENGTH = 500` repeats the same 500 limit as a fourth constant
  - Drift already: the keeper pause requires a note (`NO_NOTE`), the coven pause makes it optional (`trimmed || null`), and `access-pause.ts:75-77` and `:89` write the "already paused" sentence twice (`ALREADY_PAUSED` constant exists but the inline `ValidationError` at 75 spells it out again).
- **Shared piece:** extend `src/lib/pause-message.ts` (it already holds the message half) with `parsePauseEnd(until)` and `parsePauseNote(note, { required })`, using one `PAUSE_TEXT_MAX_LENGTH`. `checkedNote` in timeouts becomes `parsePauseEnd` + `parsePauseNote(note, {required: true})`.
- **Guard:** `tests/guards/` grep test that `Choose a time in the future` appears once under `src/`.
- **Fix:** add the two parsers, test them in `tests/lib/`, replace the three bodies, delete the inline `ValidationError` at `access-pause.ts:75-77` in favour of `fieldRefusal('userId', ALREADY_PAUSED)`. Error messages and paths are unchanged.
- **Tests covering the callers:** the access-pause, member-pause and timeouts module tests under `tests/modules/`.

**Part 2: Future-date and note checks repeat the pause validation (extends D-25)**

- **Why it matters:** three copies of a shared rule; see also "Extra copies of D-25"
  Severity: medium (three copies of a shared rule; see also "Extra copies of D-25")
  Copies:
- `src/modules/identity/services/invitation-cards.ts:~560` ('Choose an expiry date in the future')
- `src/modules/support/services/timeouts.ts` `checkedNote` (`PAST_END = 'Choose a time in the future'`; Date, NaN and `<= Date.now()` checks, plus trim, blank and max-500 note checks)
- the pause validation already in D-25
  Shared piece: the D-25 helper, widened to take the message text and the field path.
  Guard: none.
  Fix: fold into the D-25 fix.
  Tests covering the callers: `tests/modules/support/timeouts*.test.ts`, `tests/modules/identity/invitation-cards*.test.ts`.
  Estimate: 1 h on top of D-25

- **Extra copies and changes found when merging:**

`support/services/timeouts.ts` `checkedNote` (trim, blank, max 500, `until` in the future) parallels `identity/services/access-pause.ts`; the schemas `identity/schema/user-access-pauses.ts` and `support/schema/support-timeouts.ts` share `until`, `note` (not-blank check), `message`, `liftedAt`, `auditColumns`.

- **Estimate:** 2 hours
- **Status:** Fixed in part. `parsePauseEnd`, `parsePauseNote` and `PAUSE_TEXT_MAX_LENGTH` live in `src/lib/pause-message.ts` and serve the access, member and support-address pauses, and the "already paused" refusal uses `fieldRefusal`; `tests/guards/pause-validation.test.ts` refuses the future-time sentence anywhere else. Not folded in: the invitation-card expiry check in `invitation-cards.ts`, whose sentence differs and which builds its own list of issues; it moves to a Z. Cleanup task.

### D-26: Retention predicates repeated between the finders and the writers

- **Severity:** high
- **Why it matters:** The job that lists support requests due for anonymising and the writer that acts on them each state the rule. If one is edited alone, requests are listed then refused or skipped, so personal data stays past its retention time.
- The finder that lists what is due and the writer that acts on it each spell the rule. If one is edited alone, the job lists rows the writer then refuses (or the reverse). This is the retention path for personal data (anonymise after close), so a miss is a data-retention bug.
- **Where:**
  - Due to anonymise: `support.ts:500-512` (`findSupportRequestsDueToAnonymise`) and `support.ts:806-812` (`anonymiseClosedSupportRequests`): `notSoftDeleted`, `status = 'closed'`, `closedAt <= cutoff`, `createdBy <> SYSTEM_ACTOR_ID`.
  - Due to close: `support.ts:483-495` (`findSupportRequestsDueToClose`) and `support.ts:758-762` (`closeIdleResolvedSupportRequests`): `status = 'resolved'`, `resolvedAt <= cutoff`. The writer has already dropped `notSoftDeleted` because `update` adds it; the finder keeps it. That is a drift in form, not in meaning.
  - `ne(supportRequests.createdBy, SYSTEM_ACTOR_ID)`: `support.ts:311`, `510`, `810`. Line 311 (view token lookup) is a different reason (a request the System account owns is anonymised) but it is the same test, "this request is not anonymised".
- **Shared piece:** two private predicates beside `retentionPage` in `support.ts`: `dueToClose(cutoff)` and `dueToAnonymise(cutoff)`, plus a const `notAnonymised = ne(supportRequests.createdBy, SYSTEM_ACTOR_ID)` used at the three places.
- **Guard:** none practical.
- **Fix:** add the two functions; call them from the finder and the writer. `anonymiseClosedSupportRequests` uses a raw `tx.update` (comment at `support.ts:788-790` says why) so it must `and(notSoftDeleted(supportRequests), inArray(id, ids), dueToAnonymise(cutoff))` itself. Nothing else changes.
- **Tests covering the callers:** `tests/modules/support/` retention tests, `tests/db/repository/support*.test.ts`.

- **Estimate:** 1.5 hours
- **Status:** Fixed. The retention finders and writers share their predicates.

### D-27: Two category filters are the same function; the grimoire copy has already dropped one term

- **Severity:** high
- **Why it matters:** The ingredient and spell category filters repeat the any-versus-all rule. A fix for the multi-category filter in one leaves the other list wrong, so a user filtering by several categories sees incorrect results in one place.
- Drift: the ingredient version adds `pairIsLive(ingredientCategories)` (a pair outlives its soft-deleted variant); the spell version has no variant, so the term is absent on purpose. But the body is otherwise line for line the same, and a fix to the "`any` is one EXISTS, `all` is one per id" rule would have to be made twice.
- **Where:**
  - `ingredients.ts:842-860` (`categoryArms`), `grimoire.ts:106-121` (`categoryArms`). Their count twins repeat the same shape too: `ingredient-facets.ts` `categoryFacet` (about 232-262) and `grimoire.ts:185-215` (`findGrimoireCategoryCounts`): alias the pair table, inner-join `categories` on `inLiveGroup`, group by `categories.id`, and drop the chosen ids when mode is `any`.
- **Shared piece:** `categoryArms(link, ownerColumn, extra?, ids, mode)` in a new `src/db/repository/category-arms.ts` (or in `predicates.ts`). Parameters: the link table, its owner column (`ingredientCategories.ingredientId` / `spellCategories.spellId`), the outer id (`ingredients.id` / `spells.id`), and an optional extra arm (`pairIsLive`). Use `pointsLive` (move it with the helper, or import it from `ingredients.ts`).
- **Guard:** none practical.
- **Fix:** add the helper; make both call it. `pointsLive` is in `ingredients.ts` and `grimoire.ts` already imports it from there, so the helper can live in `ingredients.ts` or a sibling with no import cycle. The facet count twin is a second, optional step.
- **Tests covering the callers:** `tests/db/repository/grimoire*.test.ts`, `tests/db/repository/ingredients*.test.ts`, `tests/db/repository/ingredient-facets*.test.ts`.

- **Estimate:** 2 hours
- **Status:** Fixed. `categoryArms` and `pointsLive` in `src/db/repository/category-arms.ts` serve both filters, and the ingredient filter adds its extra live-pair term as an argument. The facet-count twins move to a Z. Cleanup task.

### D-28: Compendium `reviewOf` is written twice and the copies have drifted

- **Severity:** high
- **Why it matters:** The compendium list and entry pages read review and sourcing separately and return the date in different shapes. A change to what a visitor sees as reviewed or sourced can show on one page and not the other.
- **Where:**
  - `src/app/(public)/compendium/page.tsx:171-185` (inline arrow; returns `reviewedAt` as an ISO string)
  - `src/app/(public)/compendium/ingredients/[slug]/page.tsx:67-82` (module function; returns the Date)
  - `sourcingOf` at `src/app/(public)/compendium/ingredients/[slug]/page.tsx:83-95` and the matching inline read in `compendium/page.tsx:~186-200` use the same `try { ... } catch { Forbidden || NotFound -> undefined }`.
- **Shared piece:** one `readEntryReview(id)` and `readEntrySourcing(id)` in `src/app/compendium-reads.ts` (it already holds the page-level compendium reads). Both pages take the one return shape.
- **Guard:** none practical. The shared function is the guard.
- **Fix:** move the two reads to `compendium-reads.ts`, pick one return shape (ISO string, since the list page sends it to a client component), and convert at the entry page if it needs a Date. Wrap with the shared refusal helper from D-16 instead of a local try/catch. Risk: the entry page's caller expects a Date.
- **Tests covering the callers:** `tests/app/(public)/compendium/*`, `tests/app/compendium-reads.test.ts`.

- **Estimate:** 1.5 hours
- **Status:** Fixed.

### D-29: GroupForm and GroupedValueForm repeat one form skeleton, and their delete-error handling has drifted

- **Severity:** high
- **Why it matters:** Group and value forms repeat the same save, delete and history wiring and their delete-error handling has drifted. A curator hitting a failed delete may see a different message or an unreset form depending on which form they use.
- **Where:**
  - `src/components/GroupForm/index.tsx:136-190` (`defineKind`), `:279-330` (save/remove mutations, `confirmDelete`)
  - `src/components/GroupedValueForm/index.tsx:177-300` (`defineKind`), `:351-400` (save/remove mutations, `confirmDelete`)
  - Same shape, smaller: `src/components/HelpArticleForm/form.tsx`, `src/components/IngredientForm/index.tsx`
- **Shared piece:** a `useEntityForm` hook (or a `defineKind` factory) in `src/lib/` or beside the forms. It would own `saveRequest(create, update)` selection, the `zodResolver` cast, the save and remove `useMutation` pair, `useFormHistory`, `useDiscardGuard`, server-issue placement via `placeServerIssues`, and the delete-confirm flow. Each kind keeps only its schema, fields and GraphQL documents.
- **Guard:** none practical. The copies differ in fields. A review note in `.claude/rules/components.md` pointing at the hook is the realistic guard.
- **Fix:** extract the hook from GroupedValueForm (the smaller), port GroupForm, then reconcile `confirmDelete`. GroupForm takes a target and can show the refusal at the choice or in an alert; GroupedValueForm's version has no target and handles a refusal differently. Decide which error placement is right first, then make both identical. Risk: the two delete flows have different UX (GroupForm reassigns to a destination), so the hook must accept an optional target.
- **Tests covering the callers:** `tests/components/GroupForm/`, `tests/components/GroupedValueForm/`, the curator e2e specs for groups and grouped values.

- **Extra copies and changes found when merging:**

- The nine `graphql(...)` mutation documents in `GroupForm/index.tsx:46-110` and the fifteen in `GroupedValueForm/index.tsx:46-170` follow one Create/Update/Delete shape per kind; `defineKind` in each file builds `saveRequest(create, update)` and a `remove` closure. Beyond the shared hook, a `crudDocuments(name, inputType)` helper cannot work because `graphql()` needs literal strings for codegen, so leave the documents and share only `defineKind` (`GroupForm/index.tsx:136-153`, `GroupedValueForm/index.tsx:177-197`).
- Drift in the delete path: `GroupForm` `confirmDelete` catches and places a refusal at the choice or in the alert; `GroupedValueForm` `confirmDelete` has no `try`, and relies on `ConfirmQuestion`'s `onRefused`. Same event, two mechanisms.
- Both repeat `useDiscardGuard`, `useFormHistory({root, enabled})`, `FormHistoryContext.Provider`, `FormProvider`, `Notice kind="error"` for `errors.root?.message ?? alert`, and `FormActions` with `onDelete` clearing the alert.
- `GroupForm/index.tsx:120` and `GroupedValueForm/index.tsx:130` each define `FIELDS` + `isField`/`fieldOf` for placing server issues.
- Icon-bearing group choices (`kind === 'form' ? <FormIcon name={each.icon ?? null} /> : undefined`) appear at `GroupForm/index.tsx:320` and `GroupedValueForm/index.tsx:386`.

- **Estimate:** 8 hours
- **Status:** Fixed. `useEntityForm` in `src/components/Field/use-entity-form.ts` holds the undo history, the save mutation and where a refused save is said, for GroupForm and GroupedValueForm; each still calls `useDiscardGuard` itself, which the `long-form-guards-leaving` lint rule requires. HelpArticleForm's delete now reports a refusal through `ConfirmQuestion`'s `onRefused`, like the other forms. No guard: none is practical.

### D-30: Viewer's live covens list built three times, one copy drifted

- **Severity:** high
- **Why it matters:** The facet 'held in' filter counts a paused member's coven, while the entry page hides it. A paused member sees a coven in the filter that does not appear on the entry, so counts and results disagree.
- **Where:**
  - `services/entry-covens.ts` (about 44-51); `services/cupboard-entries.ts` `covensHoldingEntry` (about 485-497); `services/compendium-held-in.ts` `everyCovenProof` (about 66-72). Each calls `membershipsOf(session, [userId])`, runs `if (!memberships || memberships instanceof Error) return []`, filters paused seats, maps `{id, slug, name}` and sorts with `byCovenName`.
- **Drift:** `everyCovenProof` does not filter paused seats, the other two do. A paused member's coven therefore counts in the facet "held in" filter while it is hidden from the entry page.
- **Shared piece:** `livenCovensOf(session)` (name it `activeCovensOf`) in `@/modules/coven`, next to `membershipsOf`.
- **Guard:** none practical.
- **Fix:** add helper; confirm with the owner whether `everyCovenProof` should skip paused seats (probably yes) and add a regression test for it.
- **Tests covering the callers:** `tests/modules/ingredients/entry-covens*.test.ts`, `compendium-held-in*.test.ts`, cupboard-entries tests.

- **Estimate:** 2 hours
- **Status:** Fixed. The live-covens list is built once. The drift was not a bug: a paused seat makes `AccessPaused`, which is a `Forbidden`, so every copy already left paused covens out; a test in `tests/modules/ingredients/services/compendium-held-in.test.ts` now says so.

### D-31: `lockSupportSender` re-writes `timeoutStands` and uses a raw `tx.select()`

- **Severity:** high
- **Why it matters:** The lock that decides whether a sender is timed out spells the standing rule itself. If the rule behind timeoutStands changes, the send check keeps the old rule and may let a timed-out sender submit a request, or refuse one wrongly.
- The standing-time-out rule is already in two forms. `timeoutStands` is exported and used four times (`support.ts:354-357`, used at 368, 382, 616, 725, and `users.ts:196`). `lockSupportSender` spells the same two terms out. A change to what "standing" means that edits `timeoutStands` leaves the lock's send check on the old rule. That check is the one that refuses a timed-out sender.
- **Where:**
  - `support.ts:354-357` (`timeoutStands`)
  - `support.ts:849-857` (inline `isNull(liftedAt)` + `noEndOrAhead(until)` inside `lockSupportSender`)
  - `support.ts:855` is also the only place in the file that calls `noEndOrAhead` outside the `timeoutStands` definition.
- **Shared piece:** use the existing `timeoutStands` in `lockSupportSender`. Read the rows with `selectFrom(supportTimeouts, and(notSoftDeleted(...), eq(userId, userId), timeoutStands))` as `findStandingSupportTimeout` (`support.ts:362-370`) does. Better still, give `findStandingSupportTimeout` an optional `tx` or reuse its `where` as a private `standingFor(userId)` const used by both.
- **Guard:** none practical. A grep for `liftedAt` outside `timeoutStands` would work but is a one-off.
- **Fix:**
  1. Replace the inline terms with `timeoutStands`.
  2. Build the `where` once in a private function `standingOnUser(userId)`; call it from `findStandingSupportTimeout` and from `lockSupportSender`.
  3. `lockSupportSender` reads inside the writer's transaction (`tx`). `selectFrom` supports `lockIn: tx` but that adds `for update`, which the advisory lock design does not want. Check whether `selectFrom` can run in `tx` without locking before switching; if not, keep `tx.select()` and share only the predicate.
- **Tests covering the callers:** `tests/modules/support/` (send-limit and time-out tests), `tests/db/` repository support tests.

- **Estimate:** 1 hours
- **Status:** Fixed. One private `standingOnUser` in `src/db/repository/support.ts` serves `findStandingSupportTimeout` and `lockSupportSender`.

### D-32: Two different `covenSlugOf` functions with the same name

- **Severity:** high
- **Why it matters:** Two functions named covenSlugOf parse a coven address differently: one rejects reserved slugs, the other decodes the text. A developer importing the wrong one gets a different slug for the same address, such as treating 'new' as a coven.
- **Where:**
  - `src/lib/coven-path.ts:42-45` (returns `string | null`, refuses reserved slugs such as `new`, does not decode) and `src/lib/access-paused.ts:35-38` (returns `string | undefined`, accepts reserved slugs, runs `decodeURIComponent`). The second is used by `src/lib/graphql-client.ts:5,26`; the first by about ten components and libs.
- **Shared piece:** one parser in `src/lib/coven-path.ts`. Decide whether the slug is decoded (a slug from `slugify` is URL-safe, so decoding is likely unneeded) and whether reserved slugs count. Rename or delete the `access-paused.ts` copy so the name means one thing. `pausedCovenSlugOf` stays beside `covenPausedPath`.
- **Guard:** a `tests/guards/` test that each exported function name under `src/lib/` is unique (a cheap grep-based test). Otherwise none practical.
- **Fix:** 1. Make `graphql-client.ts` import from `coven-path.ts`. 2. Delete the `access-paused.ts` export. 3. Check `/coven/new` on a paused account: today `graphql-client.ts` would read `new` as a slug; the shared one returns null. Could break: the paused-redirect for an error raised on `/coven/new`.
- **Tests covering the callers:** `tests/lib/coven-path.test.ts`, `tests/lib/access-paused.test.ts`, `tests/lib/graphql-client.test.ts` (check names with `ls tests/lib`).

- **Estimate:** 1 hours
- **Status:** Fixed.

### D-33: Coven create and rename repeat the name schema, the slug-race retry and the index names

- **Severity:** high
- **Why it matters:** two copies, large, and the invariants must stay equal: the retry list of unique indexes and the 80-character limit
- **Where:**
  - `src/modules/coven/services/workspace-creation.ts:16-23,36-56` and `src/modules/coven/services/workspace-rename.ts:16-23,40-58`: `NAME_LIMIT = 80`, the `requiredText(...).max(...)` schema with the same two messages, `SLUG_ATTEMPTS = 5`, the `for (attempt...)` loop around `freeCovenSlug` and `withAudit`, and the `workspaces_slug_unique` / `workspace_slugs_slug_unique` check. The two schemas differ only in their constant name. A change to the limit or to a third slug index in one file would leave the other behind.
- **Shared piece:** `CovenNameInput` plus `withFreeCovenSlug(name, excludeId, attempt)` in `coven-slug.ts`, which runs the loop and the race check and takes the write as a callback.
- **Guard:** none practical.
- **Fix:** move the schema and the retry loop into `coven-slug.ts`; the two services keep their own assertion (`Forbidden` for the flag or `assertMembership`) before calling it.
- **Tests covering the callers:** `tests/modules/coven/` workspace creation and rename specs, the slug-race specs.

- **Estimate:** 1.5 hours
- **Status:** Fixed. Coven create and rename share the name schema, the slug-race retry and the index names.

### D-34: Visibility and status lists written three times, one copy without its drift check

- **Severity:** high
- **Why it matters:** Spell visibility and status lists exist in two validation files and one lacks the check against the database enum. Adding a value to the enum can leave working validation refusing it, so a user cannot save a valid choice.
- **Where:**
  - `src/modules/grimoire/validation/spell.ts` (`VISIBILITIES`, `STATUSES`, ~1505-1506); `src/modules/grimoire/validation/working.ts` (`VISIBILITIES` ~1624, no `satisfies` check against the pgEnum); the pgEnum in `src/modules/grimoire/schema/`. The message `'Choose private or coven'` is repeated in both validation files.
- **Shared piece:** export the lists once from the schema file that owns the pgEnum (`pgEnum` exposes `.enumValues`); both validation files import them.
- **Guard:** none practical beyond TypeScript: deriving from `enumValues` makes a second list impossible.
- **Fix:** replace both literal arrays with the enum's `enumValues`; move the message to one constant.
- **Tests covering the callers:** `tests/modules/grimoire/` spell and working validation tests.

- **Estimate:** 0.5 hours
- **Status:** Fixed. `src/modules/grimoire/validation/visibility.ts` holds the lists, typed with `satisfies` against the enums; they are not read from the `pgEnum` values, which would bring the database layer into the browser. Drift tests in `tests/modules/grimoire/validation/` check them against the enums.

### D-35: `textList` and the element-array schema are written twice and have drifted

- **Severity:** high
- **Why it matters:** The text list and element array schemas differ on blank entries and error paths. A user entering a blank or duplicate element sees different behaviour and error placement in the cupboard entry form than in the ingredient form.
- **Where:**
  - `src/modules/ingredients/validation/cupboard-entry.ts` (`textList` ~1267, drops blanks and keeps `[]`; element array with one message "Each element can be chosen once"); `src/modules/ingredients/validation/ingredient.ts:1395` (`textList` keeps blanks until a later step; `elementArray` is index-pathed with "is already chosen").
- **Shared piece:** one `textList` and one `elementArray` in `validation/` (a small `lists.ts`), with the behaviour chosen deliberately.
- **Guard:** none practical; a single definition removes the second.
- **Fix:** decide which behaviour is intended (the two differ for blank entries and for error paths), export one, add a regression test per behaviour kept.
- **Tests covering the callers:** `tests/modules/ingredients/validation/` cupboard-entry and ingredient tests.

- **Estimate:** 2 hours
- **Status:** Fixed. `src/modules/ingredients/validation/lists.ts` holds both schemas, which keep their different handling of blanks on purpose (the ingredient form keeps blanks until its cross-field rules have run). A repeated element in a cupboard entry is now refused at its own position, in the ingredient form's wording, rather than once for the whole list.

### D-36: Recipient lookup and signed-out view token written three times in support mail builders

- **Severity:** high
- **Why it matters:** The recipient lookup and signed-out view token are written three times, and one copy carries guards the others lack. A fix to the token or recipient rules lands in one builder and leaves the other two mailing the old behaviour to real recipients.
  Severity: high (three copies, one carries extra guards the others lack)
  Copies:
- `src/modules/support/services/reply-notice.ts:~18-32` (`replyMailFor`)
- `src/modules/support/services/status-mail.ts:~19-37` (`supportStatusMessageFor`)
- `src/modules/support/services/retention.ts:~45-62` (`closingNoticeFor`)
  Each does `row.senderEmail ?? (await findOneById(users, row.createdBy))?.email`, `signedOut = senderEmail !== null`, and `signedOut ? await mintSupportViewToken(id) : undefined`. `replyMailFor` and `supportStatusMessageFor` also return null when `createdBy === SYSTEM_ACTOR_ID`; `closingNoticeFor` does not repeat that guard.
  Shared piece: `supportRecipientFor(request): Promise<{ to; signedOut; viewToken } | null>` in `support/services/`, next to `view-link.ts`.
  Guard: none.
  Fix: extract the helper, keep each builder's message text.
  Tests covering the callers: `tests/modules/support/` reply-notice, status-mail and retention tests.
  Estimate: 2 h

- **Estimate:** 2 hours
- **Status:** Fixed. `supportRecipientFor` in `src/modules/support/services/recipient.ts` serves the reply notice, the status mail and retention; the System-actor check stays where it was, so behaviour is unchanged. No guard: none is practical.

### D-37: "Newest first" cursor key (`-extract(epoch from col)`, `numeric`) is spelled out in ten places beside an existing helper

- **Severity:** medium (includes a behaviour bug, see Possible Behaviour Bugs)

**Part 1: "Newest first" cursor key (`-extract(epoch from col)`, `numeric`) is spelled out in ten places beside an existing helper**

- **Why it matters:** Ten lists repeat the newest-first sort key. If the numeric cast or tie-break is fixed in one, the others can page wrongly, so a user may see a row twice or miss one when scrolling a list.
- **Where:**
  - the helper, private: `src/db/repository/grimoire.ts:26-31` (`newestFirst`, typed to two spell columns)
  - inline copies: `src/db/repository/user-access-pauses.ts:55-57`, `src/db/repository/workspace-member-pauses.ts:80-82`, `src/db/repository/users.ts:133`, `src/db/repository/workings.ts:74-75`, `src/db/repository/invitations.ts:165,330,384,505-507`, `src/db/repository/support.ts:104,113` (the `REQUEST_ORDER` and `OWN_ORDER` comments even say "as the other newest-first lists do")
  - `workings.ts:56-67` (`findWorkingsInSpell`), `workings.ts:69-77` (`WORKING_ORDER`). Also `workings.ts:74-75` is an D-37 copy.
- **Shared piece:** move `newestFirst` to `src/db/repository/predicates.ts` (or `select.ts`, beside `SortPart`) typed on `AnyPgColumn`, and call it in all ten places. Its comment (why `numeric`) moves with it.
- **Guard:** `tests/guards/` grep test: `-extract(epoch from` appears only in that one helper (the support queue's positive `extract(epoch from coalesce(...))` stays).
- **Fix:** export the helper, replace each literal `{ expression: sql\`-extract(epoch from ${x})\`, type: 'numeric' }`with`newestFirst(x)`. Sort order and cursor values are byte-identical, so no cursor in flight changes.
- **Tests covering the callers:** `tests/db/` repository tests for pagination of each list (`grep -rl "findPage" tests/db`), plus `tests/guards/pagination.test.ts`.

**Part 2: Working order spelled twice: SQL key and a JavaScript re-sort**

- **Why it matters:** The list of workings in a spell sorts in JavaScript by date text, while the paged list sorts in SQL with an id tie-break. Two workings on the same day can show in different orders, so a user sees the order change between views.
- Drift risk. `findWorkingsInSpell` sorts in JavaScript by `workedOn.localeCompare` then `createdAt`; `WORKING_ORDER` (used by `findWorkingsPage`) sorts by `-extract(epoch ...)` then the id tiebreak the cursor adds. The JS sort has no id tiebreak, and `localeCompare` on a date string is not the same comparison as a numeric epoch. The two lists can disagree on ties. The comment at `workings.ts:68-70` says they are the same order.
- **Shared piece:** read both through `findMany` with `WORKING_ORDER` (the existing finder in `finders.ts`), or drop the JS sort and `ORDER BY` in SQL. Check `findMany`'s signature before choosing.
- **Guard:** none practical.
- **Fix:** replace the JS sort with the SQL order. Callers receive the same list unless two workings tie, in which case the order becomes the id order.
- **Tests covering the callers:** `tests/db/repository/workings*.test.ts`, `tests/modules/grimoire/**` working tests.

- **Extra copies and changes found when merging:**

- **Extra copies of D-37** (newest-first key): `workings.ts:74-75` (`WORKING_ORDER`, two parts), `invitations.ts:498-505` (`CARD_ATTEMPT_ORDER`), `support.ts:104,113`, `users.ts:133`, `invitations.ts:165,330,384,505-507`. All already listed by D-37 except `invitations.ts:498-505`, whose exact range is `invitations.ts:499-503`.
- **Extra copies of D-75** (empty-id guards): `cupboard-entries.ts`, `references.ts`, `grimoire.ts` and `users.ts` each hold one or more; counts beyond D-75's list: `users.ts` (2), `cupboard-entries.ts` (3), `references.ts` (1). Not exhaustive; the fix is mechanical and should be done with a grep for `length === 0) return`.
- **Extra copies of D-149** (case-folded equality): `cupboard-entries.ts` already listed; `invitations.ts:102` (`heldVerifiedBySession`) is listed; `grimoire.ts` `folded()` (`lower(btrim(...))`) and `textArm` (`value.trim().toLowerCase()`) at `grimoire.ts:123-134` are a further pair, and `predicates.ts` already has `fold`. `grimoire.ts:folded` should be `fold(column)`.
- **Extra copies of D-47** (parent EXISTS): see D-47, D-47, D-66, D-47 for the specific copies in this area.
- **Extra copies of D-136** (page and count twins): see D-91 (invitations) and the support pair `support.ts:242-256`: `findOwnSupportRequestPage` / `findOwnSupportRequestCount` each write `eq(supportRequests.createdBy, userId)`. `users.ts` and `grimoire.ts` pairs already share a filter function and need no work; `ingredients.ts` pairs share `compendiumList` and need no work; `cupboard-entries.ts`, `stock.ts`, `references.ts` and `spells.ts` have no page and count pair. So the D-136 list narrows to `invitations.ts` and `support.ts` in this area.
- **Extra copies of D-156** (stand-in ids, `applyAudit(...) as never`): see D-159 and D-156.

- **Estimate:** 1.5 hours
- **Status:** Fixed. `newestFirst` in `src/db/repository/predicates.ts` is the one newest-first key, and the re-sort of a spell's workings uses the same order, so ties now break by id; regression test in `tests/modules/grimoire/services/workings.test.ts`. `tests/guards/pagination.test.ts` refuses the key spelled anywhere else.

### D-38: The correspondence fields block is copied three times, with drifted labels, and its labels repeat in seven more places

- **Severity:** medium (includes a behaviour bug, see Possible Behaviour Bugs)
- **Why it matters:** The correspondence fields are copied in three forms with drifted labels, 'Elements' in one and 'Element' in the others. A user sees inconsistent field names, and a change to the field, such as a new suggestion list, misses copies.
- **Where:**
  - `CupboardEntryForm/index.tsx:~329-368`, `IngredientForm/index.tsx:~995-1040`, `IngredientForm/variants.tsx:~485-535`. Each repeats `MultiSelectField` (elements), `LookupListField` (celestial bodies, `useCelestialBodySuggestions`), `LookupListField` (zodiac signs, `useZodiacSuggestions`) and `ListField` (colours).
- **Drift:** the label is "Elements" in CupboardEntryForm and "Element" in the other two; the colours hint is `listHint(...)` in one and a literal sentence in another; `pickOnly` and `action` props vary.
- **Label strings repeated:** 'Celestial Bodies', 'Zodiac Signs', 'Colours' appear in `IngredientForm/options.ts:35-37` (`CITED_FIELD_LABELS`), `IngredientForm/values.ts:67-69` (`FIELD_NOUNS`), `IngredientEntry/blocks.tsx:25-28`, `IngredientForm/substitute-summary.tsx:111-114`, `FacetPanel/index.tsx:302`, `GroupedValueList/kinds.ts:34` and `:41`.
- **Shared piece:** a `CorrespondenceFields` component (`prefix`, `pickOnly`, `renderAction`) and one label table in `IngredientForm/options.ts`.
- **Guard:** none practical.
- **Fix:** extract from `CupboardEntryForm` (smallest), decide on "Element" vs "Elements" (needs the owner), port the others. Risk: IngredientForm cites a source per field through `action`.
- **Tests covering the callers:** `tests/components/CupboardEntryForm/`, `tests/components/IngredientForm/`, ingredient e2e specs.

- **Owner's call:** The label is "Elements" everywhere.
- **Estimate:** 4 hours
- **Status:** Fixed in part. The label reads "Elements" everywhere. The three correspondence blocks differ (one has deities, and the hints vary), so one shared component moves to a Z. Cleanup task.

### D-39: the `next/navigation` router mock is declared in about 80 dom and app test files

- **Severity:** medium

**Part 1: the `next/navigation` router mock is declared in about 80 dom and app test files**

- **Why it matters:** About 80 test files repeat the same router mock. A developer changing the router API must edit them all, and a missed file keeps passing against a stale mock, so a real navigation bug goes unnoticed.
- **Where:**
  - about 176 files mock `next/navigation`. About 80 declare the same `const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }))` plus `vi.mock('next/navigation', () => ({ useRouter: () => router }))` (42 hoisted three-method form, 15 plain form). Find them with `grep -rln "useRouter: () => router" tests`.
  - `tests/components/DocumentEditor/status.test.tsx:5-13`, `tests/app/(shell)/keepers/document-skeleton.test.tsx`; `vi.mock('next/navigation', ...)` now appears in all six DocumentEditor tests (`sources`, `autosave`, `toolbar`, `restore`, `saving`, `status`), each with `warmImport(() => import('@/components/DocumentEditor/editor'))` and its own `renderEditor`.
- **Shared piece:** `tests/support/next-navigation.ts` exporting a `router` object and the module factory, used as `vi.mock('next/navigation', () => import('@/../tests/support/next-navigation'))`, following the `tests/support/next-data-cache` pattern already used for `next/cache`.
- **Guard:** none practical (a grep guard would also catch the bespoke shapes that legitimately differ).
- **Fix:** convert only the files whose mock is exactly the three-method router; leave files that assert on `usePathname`, `useSearchParams` or `redirect` with their own shape. Reset the shared `router` mocks in `beforeEach` (check `vitest` `clearMocks` config first) so call counts do not leak between tests. Mechanical, done by script.
- **Tests covering the callers:** the converted files themselves.

**Part 2: inline router mocks in new DocumentEditor and keepers skeleton tests**

- **Why it matters:** Six DocumentEditor tests each declare the same router mock and render helper. When the editor's props change, a developer must update each, and a missed one fails for the wrong reason or stops testing the real editor.
- **Shared piece:** `tests/support/document-editor.tsx` with the mock factory and a `renderEditor(props)` taking `body`, `revision`, `documentKey`. Extra copies of D-39.
- **Guard:** none practical.
- **Fix:** extract the common props; keep each file's bespoke props as arguments.
- **Tests covering the callers:** the six DocumentEditor tests.

- **Estimate:** 3.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-40: a `QueryClientProvider` render wrapper is rewritten in 61 component test files

- **Severity:** medium
- **Why it matters:** The same query-client wrapper is rewritten in 61 test files, 16 of them under the name `renderForm`. A change to the provider setup has to be made 61 times, and a missed file fails or passes for the wrong reason, which costs developers time to diagnose.
- **Where:**
  - `grep -rl "QueryClientProvider client={makeQueryClient()}" tests` lists 61 files. Four support files already wrap it for one component each (`tests/support/ingredient-form.tsx`, `grouped-value-form.tsx`, `compendium-list.tsx`, `discard-guard.tsx`). Local `renderForm` in `tests/components/NameForm/index.test.tsx:14`, `EmailForm/index.test.tsx:19`, `RenameWorkspaceForm/index.test.tsx:18`, `GroupForm/index.test.tsx:56`, `CreateWorkspaceForm`, `CupboardEntryForm` (index, autosave), `HelpArticleForm`, `GroupedValueForm`, and `IngredientForm/*` (compendium, promote, variants, references, autosave, sections, index). Also 9 `renderBuilder`, 4 `renderDetail`.
- **Shared piece:** `tests/support/render-with-query.tsx` exporting `renderWithQuery(ui)` (returns the `render` result, with a fresh `makeQueryClient()` per call). Local wrappers then keep only their component props.
- **Guard:** none practical (the wrapper is a few lines; a grep guard would flag legitimate client-sharing tests).
- **Fix:** script the swap for files whose wrapper is exactly `render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>)`; hand-convert wrappers that build props. Do not convert tests that keep a client to inspect its cache.
- **Tests covering the callers:** the converted files.

- **Estimate:** 3 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-41: `/coven/<slug>/...` hrefs built by hand in about 40 places

- **Severity:** medium

**Part 1: `/coven/<slug>/...` hrefs built by hand in about 40 places**

- **Why it matters:** Coven addresses are built by hand in about 40 places, one with URL encoding and the rest without. A slug with unusual characters can give a working link in one place and a broken one in another for a member.
- **Where:**
  - `src/app/(shell)/coven/[slug]/{(people)/layout.tsx:23,30,(people)/skeleton.tsx:37,42,52,grimoire/(list)/layout.tsx:19,24,grimoire/(list)/skeleton.tsx:31,36,46,grimoire/(list)/grimoire-tab.tsx:78,200,grimoire/[id]/page.tsx:61,102,200,ingredients/[id]/page.tsx:127,128,147,200,ingredients/viewed-details.tsx:17,(people)/members/page.tsx:102,(people)/invitations/page.tsx:50}`, `src/app/(shell)/coven-paused/[slug]/page.tsx:34,74` (with `encodeURIComponent`, unlike the rest), `src/app/(shell)/coven/page.tsx:25`, `src/lib/shell-home.ts:15`, `src/app/invite/[token]/invitation-panel.tsx:75`, and in components: `CovenNav/sections.ts:16-17`, `AppShell/add-href.ts:62`, `AppShell/add-ingredient-button.tsx:79,191,233,242`, `ReceivedInvitations/accept-control.tsx:45`, `IngredientEntry/summary.tsx:113`, `IngredientEntry/cupboard-writes.tsx:137`, `CovenCards/index.tsx:63`, `RenameWorkspaceForm/index.tsx:44`, `SpellBuilder/step-quick-look.tsx:30`. Several repeat `as Route` casts. Drift already exists: only `coven-paused` encodes the slug, and `movedCovenPath` and `pathInCoven` in `coven-path.ts` use a third spelling.
  - `/coven/${slug}/grimoire`, `/grimoire/drafts`, `/members`, `/invitations`, `/ingredients` in: `(people)/layout.tsx`, `(people)/skeleton.tsx`, `(people)/members/page.tsx`, `grimoire/(list)/{layout,skeleton,grimoire-tab}.tsx`, `grimoire/[id]/page.tsx` (3), `ingredients/[id]/page.tsx` (4), `ingredients/viewed-details.tsx`, `(shell)/coven-paused/[slug]/page.tsx` (2); about 30 files repo-wide.
  - `/compendium/ingredients/${slug}` in `(public)/compendium/page.tsx` (~3), `compendium/ingredients/[slug]/page.tsx` (`addressOf`, `canonicalPath`), and `coven/[slug]/ingredients/[id]/page.tsx` (`publicAddress`).
  - `covenIngredientsPath` in `src/components/CompendiumList/href.ts:30` already exists for one path; the others have no builder.
  - `curator/compendium/page.tsx:165`. Repo-wide (outside the area first audited's area, listed for the fixer): `src/app/ai-discovery.ts:30`, `src/app/(public)/compendium/ingredients/[slug]/page.tsx:28` (`addressOf`), `src/app/(shell)/coven/[slug]/ingredients/[id]/page.tsx:43` (`publicAddress`), `src/app/sitemap.ts:27`, `src/app/(public)/compendium/page.tsx:93,226,255`.
  - `/coven/${slug}/ingredients/${id}`: AppShell/add-ingredient-button.tsx:79,242; IngredientEntry/cupboard-writes.tsx:137; IngredientEntry/summary.tsx:113; CovenCards/index.tsx:63; SpellBuilder/step-quick-look.tsx:30; IngredientEntry/entry-dialog.tsx:66. `/compendium/ingredients/${slug}`: CompendiumCards/index.tsx:28; CompendiumList/index.tsx:92; IngredientEntry/entry-dialog.tsx:19; AppShell/add-ingredient-button.tsx:80; app/(shell)/coven/[slug]/ingredients/[id]/page.tsx:43; app/(public)/compendium/ingredients/[slug]/page.tsx:28; app/(public)/compendium/page.tsx:93,226,255,310; app/(shell)/curator/compendium/page.tsx:165; app/sitemap.ts:27; app/ai-discovery.ts:30; lib/json-ld.ts:22
  - src/app/(public)/_documents.tsx:36 (`/keepers/documents/${key}`), src/components/AdminNav/sections.ts:95-102 (five literal paths)
- **Shared piece:** `covenPath(slug, ...segments): Route` in `src/lib/coven-path.ts` (which already owns `COVEN_LANDING_PATH` and `pathInCoven`), with the single `as Route` cast inside.
- **Guard:** an oxlint `no-restricted-syntax` on template literals starting with `/coven/`, or a `tests/guards/` grep outside `coven-path.ts`.
- **Fix:** 1. Add the helper plus a test. 2. Replace call sites file by file (lib and app first, components after). 3. Decide once on encoding (slugs are slugified, so none is needed). Could break: typed-route checks; `as Route` removal must still type.
- **Tests covering the callers:** the component tests under `tests/components/{CovenNav,AppShell,CovenCards}`, e2e coven specs.

**Part 2: Coven and compendium addresses are built by hand with `as Route` casts**

- **Why it matters:** Coven and compendium paths are built by hand with route casts in about 30 files. If a path segment is renamed, any missed link silently points to a 404 for members, and the casts hide the error from the compiler.
- **Shared piece:** `covenPath(slug, ...tail)` and `compendiumEntryPath(slug)` in `src/lib/coven-path.ts` (it already owns `covenSlugOf` and `COVEN_LANDING_PATH`), each returning `Route`.
- **Guard:** an oxlint `no-restricted-syntax` or a `tests/guards/` grep for the `` `/coven/${ `` literal outside `coven-path.ts`.
- **Fix:** add builders, replace the literals file by file. Large but mechanical; encode the slug once, since `coven-paused` encodes and the others do not.
- **Tests covering the callers:** `tests/app/(shell)/coven/*`, `tests/lib/coven-path.test.ts`.

**Part 3: The `/compendium/ingredients/<slug>` address is built by hand; the curator compendium page also has a duplicate import and a needless fragment**

- **Why it matters:** The compendium entry address is built by hand in seven places, so renaming the route leaves broken links in the sitemap, AI discovery file or JSON-LD that search engines and visitors follow. The curator page also has a duplicate import and needless fragment.
- **Dead/tidy in area:** `curator/compendium/page.tsx:32-38` and `:39` import twice from `'../../../compendium-reads'`; `curator/compendium/compendium-dialog.tsx:31-77` wraps a single child in `<>`.
- **Shared piece:** `compendiumEntryPath(slug)` in `src/lib/` (check `src/lib/help-paths.ts` for the pattern).
- **Guard:** grep guard for the string literal `/compendium/ingredients/` outside the helper.
- **Fix:** add helper, replace seven sites, merge the import, drop the fragment.
- **Tests covering the callers:** compendium e2e specs, `tests/app/sitemap` if present.

**Part 4: No helper for ingredient addresses; the literals appear about 19 times**

- **Why it matters:** Ingredient addresses are typed out about 19 times. Changing the route leaves some links, such as a sitemap entry or a card, pointing at a missing page for members and search engines.
- **Shared piece:** `covenIngredientPath(slug, id)` and `compendiumIngredientPath(slug)` in `src/lib/coven-path.ts` and the public-routes module. `covenIngredientsPath` in CompendiumList/href.ts:30 also duplicates the pattern in `lib/coven-path` and CovenNav/sections.ts.
- **Guard:** a `tests/guards/` grep for the literal `/compendium/ingredients/` outside the helper.
- **Fix:** add two helpers, replace literals, move `covenIngredientsPath` into `lib/coven-path`.
- **Tests covering the callers:** tests/components/CompendiumCards, CompendiumList, IngredientEntry, CovenCards; tests/app sitemap.

**Part 5: `_documents.tsx` builds the keeper edit path by hand**

- **Why it matters:** The keeper document edit path is typed in the document page and the keeper navigation. Renaming the route leaves one pointing at a missing page, so a keeper clicking Edit lands on a 404.
- **Shared piece:** a `keeperDocumentPath(key)` beside `keeperHelpEditPath`.
- **Guard:** none.
- **Fix:** add the helper; use it in both.
- **Tests covering the callers:** AdminNav tests; document page e2e.

- **Extra copies and changes found when merging:**

- `src/app/(shell)/coven-paused/[slug]/page.tsx` (`/coven/${encodeURIComponent(slug)}`, twice); see D-41 for the rest.

- **Estimate:** 10 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-42: `vi.mock('@/lib/request-session', ...)` and `vi.mock('@/lib/mail', () => ({ send }))` repeated in 51 and 31 files

- **Severity:** medium
- **Why it matters:** 51 test files mock request-session in eight shapes. Adding a new session helper means many mocks lack it, giving confusing failures, and a stale mock can make an authorization test pass without exercising the real guard.
- **Where:**
  - `@/lib/request-session` is mocked in 51 files in about eight shapes (`{ getSession }` x9, `{ requireAdminSession }` x6, `{ requireSession }` x5, `{ requireCovenMembership, requireSession }` x5, `{ getSession, sessionIsVerified }` x5, plus 10 multi-line). `@/lib/mail` is mocked as `({ send })` in 24 of 31 files. 44 files declare `const session = ...` and 17 `const getSession = vi.fn()` locally.
- **Shared piece:** `tests/support/request-session.ts` exporting `vi.hoisted`-friendly factory `requestSessionMock()` returning `{ getSession, requireSession, requireAdminSession, requireCuratorSession, requireCovenMembership, sessionIsVerified }` all as `vi.fn()`, used as `vi.mock('@/lib/request-session', () => import('.../request-session'))`, same pattern as `next-data-cache`. A matching `mailMock()` returning `{ send }`.
- **Guard:** none practical.
- **Fix:** convert the files that stub only these exports with no custom implementation; leave the others. Risk: a factory that returns more exports than a file used makes a missing mock look configured; keep each `vi.fn()` returning `undefined` by default.
- **Tests covering the callers:** the converted files.

- **Estimate:** 3 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-43: `RowId.safeParse(x).success` guarding a NotFound/Forbidden/empty answer, 40+ times; NotFound messages inlined 10-17 times each

- **Severity:** medium

**Part 1: `RowId.safeParse(x).success` guarding a NotFound/Forbidden/empty answer, 40+ times; NotFound messages inlined 10-17 times each**

- **Why it matters:** The id-validity check and its NotFound wording are repeated over 40 times. A missed copy lets a malformed id reach Postgres and raise a driver error, and the same refusal reads differently to a user in different places.
- **Where:**
  - about 45 sites; the throwing ones are `src/modules/ingredients/services/compendium.ts:181,242,285,307`, `.../workspace-ingredients.ts:76,121`, `.../stock.ts:50,163,169,369`, `.../references.ts:107,135`, `.../cupboard-entries.ts:223`, `.../ingredient-rows.ts:184,836`, `src/modules/grimoire/services/workings.ts:46,202,337`, `.../spells.ts:195,222`, `src/modules/help/services/help-writes.ts:387`, `src/modules/coven/services/membership.ts:71`, `member-removal.ts:23`, `member-role.ts:31`, `member-pause.ts:33,142`, `invitations.ts:135`; the "id or undefined" ones are `compendium.ts:112,328,516`, `help-rename.ts:50`, `help-reads.ts:178`, `compendium-sourcing.ts:40`, `curated-writes.ts:50`; the filter ones are `member-pause.ts:125`, `stock.ts:295`, `ingredients-by-id.ts:26`, `display-names.ts:21`. Messages inlined: `'No such compendium entry'` 17 times (11 more via constants such as `NO_ENTRY` at `cupboard-entries.ts:151`), `'No such spell in this coven'` 11 times, `'Help article not found'` 10 times, `'No such user'` 9 times, `'No such ingredient in this coven'` 6 times (same text also as a parameter in `softDeleteIngredient`).
  - `src/modules/grimoire/services/spells.ts:957-961` (`readableSpell`), `:1063,1123,1131,1150`; `spell-reads.ts:782-791` (`readSpell`); `spell-visibility.ts:918-919`; `workings.ts` `recordWorking` (~243-247), `previewWorkingDeductions` (~359-361), `readableWorking`, `listWorkings`, `listWorkingsPage`. All throw `NotFound('No such spell in this coven')` after `RowId.safeParse(...)` and `findOneSpell`. `workings.ts` also has a local `NO_SUCH_WORKING`.
- **Shared piece:** in `src/lib/validation.ts` (beside `RowId`) add `isRowId(value): boolean` and `assertRowId(value, makeError: () => Error): void`; in each module's `types.ts`/a `messages.ts` per module, one exported constant per not-found sentence (or small `noSuchSpell()` factories next to `NotFound`). The comment "An id that is not a uuid names nothing and would be a driver error at the comparison" is also repeated, and moves into the helper.
- **Guard:** an oxlint `no-restricted-syntax` selector (or a `tests/guards/` grep) banning `RowId.safeParse(` outside `src/lib/validation.ts`; and banning duplicated `new NotFound('...')` literals is practical only as a grep test with a count limit, so propose the first only.
- **Fix:** mechanical replace in about 25 files; behaviour unchanged. Keep each call's specific error class (Forbidden vs NotFound), because services deliberately pick between them to avoid leaking existence.
- **Tests covering the callers:** the service tests under `tests/modules/*/` for compendium, stock, workings, spells, help, coven membership.

**Part 2: "Readable spell or NotFound" and the uuid guard repeated across the grimoire module**

- **Why it matters:** The readable-spell lookup and its not-found message are repeated across the grimoire module. A fix to who may read a spell, such as a private one, must be made in each, and a missed copy could expose or wrongly hide a spell.
- **Shared piece:** export `readableSpell` (and a `readableWorking`) from one grimoire-internal file and use it everywhere; one `NO_SUCH_SPELL` constant. This is the grimoire side of D-43.
- **Guard:** a `tests/guards/` grep test that `'No such spell in this coven'` appears once under `src/modules/grimoire/`.
- **Fix:** move the helper to `services/spell-access.ts`; replace the inline copies. Check each caller's order of checks (membership before lookup) is kept.
- **Tests covering the callers:** `tests/modules/grimoire/spells*.test.ts`, `workings*.test.ts`, `spell-visibility*.test.ts`.

- **Extra copies and changes found when merging:**

`'No such user'`: `identity/services/access-pause.ts` (twice), `admin-changes.ts` `liveUser` (re-implements `findOneById(users, id)` plus NotFound instead of a shared lookup), `invitation-acceptance.ts:303,385,419`, `user-role.ts:~747`, `workspace-creation.ts:~810`, `display-names.ts`, `support/services/timeouts.ts`, `support/services/staff.ts`. `'No such support request'` about seven times across `support/services/lifecycle.ts`, `own.ts`, `view-link.ts`; `'No such request'` in `timeouts.ts` (message differs from the others).

- Every `RowId.safeParse(x).success` guard that throws NotFound or returns `[]`: `grimoire/services/spells.ts:1123,1150`; `workings.ts` (five functions); `grimoire/validation/spell.ts:1530-1541` `categoryRule`; `ingredients/validation/ingredient.ts` six times (variant id, formId, `linkOrNameRules`, `substituteRules`, `referenceRules`, `categoryRules`, each with the comment "Not a uuid names nothing..."); `ingredients/services/compendium-sourcing.ts:850`.

- **Estimate:** 4 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-44: Four local `Failure`/`Refusal` interfaces for Better Auth results, one of which shadows the shared `Failure`

- **Severity:** medium

**Part 1: Four local `Failure`/`Refusal` interfaces for Better Auth results, one of which shadows the shared `Failure`**

- **Why it matters:** Four local Failure types describe Better Auth results, and one name collides with the app's shared Failure. A developer importing the wrong one gets a type that fits but means something else, so a form can miss an error field.
- **Where:**
  - `src/components/SignInPanel/password-form.tsx:37-47`, `src/components/SignInPanel/two-factor-step.tsx:26-35`, `src/components/ResetPasswordForm/index.tsx:19-23`, `src/components/PasswordSection/two-factor.tsx:40-50` and the `Failure` import/use in `src/components/PasswordSection/index.tsx`. The name `Failure` also exists in `src/lib/types.ts:95` with a different meaning (`{ field?, alert? }`, the app's own form refusal).
  - `src/components/PasswordSection/index.tsx:32-42` (`Failure`, `Refusal`), `:95` (`{} as { status?: number }`), `:123` (`{} as Failure`)
  - `src/components/PasswordSection/two-factor.tsx:40-49` (`Failure`, `Refusal`), `:197-209` (`run()` wrapper with the same catch)
  - `src/components/SignInPanel/password-form.tsx:37-47`, `:121`
  - `src/components/SignInPanel/two-factor-step.tsx:26-35`, `:71`
  - `src/components/ResetPasswordForm/index.tsx:19-23`, `:45`
  - `src/components/ForgotPasswordForm/index.tsx:34`
  - `src/components/Passkeys/index.tsx:58-60`, `:69-71` (the same idea with `{ error: { code: undefined } }`)
  - The comment "Better Auth answers `{ error }` for a refusal and throws for a dropped connection" is repeated in `PasswordSection/index.tsx:119`, `two-factor.tsx:197`, `SignInPanel/two-factor-step.tsx` and `password-form.tsx`.
  - `src/components/SignInPanel/password-form.tsx:65-67` (getSession, `{data:null}`), `:121` (`error: {} as Failure`)
  - `src/components/SignInPanel/two-factor-step.tsx:70-72`
  - `src/components/SignInPanel/passkey-button.tsx:28` (`error: thrown`)
  - `src/components/SignInPanel/index.tsx:~104-110` (try/catch form of the same thing around `signIn.social`)
  - `src/components/SignInMethods/index.tsx:96`, `:114`
  - `src/components/ResetPasswordForm/index.tsx:44`
  - `src/components/ForgotPasswordForm/index.tsx:34`
  - `src/components/PasswordSection/index.tsx:95`, `:123`; `src/components/PasswordSection/two-factor.tsx:202`
  - `src/components/Passkeys/index.tsx:43`, `:60`, `:71`
  - `src/components/ImpersonationBanner/index.tsx:52`; `src/components/AccountMenu/sign-out-button.tsx:26`
- **Shared piece:** one `AuthError` (`{ status?, code?, message? }`) in `src/lib/types.ts` (or a type-only `src/components/SignInPanel/types.ts`), plus a shared `AuthRefusal` (`{ alert?, email?, password?, code?, current?, chosen? }` as needed). Rename so it no longer collides with `lib/types.ts` `Failure`.
- **Guard:** none practical (a type-name collision is not mechanically checkable beyond review).
- **Fix:** replace the four local interfaces with the shared type; keep per-form `Refusal` shapes only where fields differ.
- **Tests covering the callers:** `tests/components/SignInPanel/`, `tests/components/ResetPasswordForm/`, `tests/components/PasswordSection/`.

**Part 2: Better Auth client failure handling (`Failure`/`Refusal` types and the `.catch(() => ({ error: {} as Failure }))` fallback) is rewritten in seven forms**

- **Why it matters:** The Better Auth failure handling is rewritten in seven forms. A fix for a dropped connection in one leaves a user stuck on a spinner or seeing no message in another sign-in, password or passkey screen.
- **Shared piece:** a type-only `AuthFailure` (`{ status?: number; code?: string; message?: string }`) in `src/lib/types.ts` (or beside `auth-client.ts`), and a small `settled(call)` helper in `src/lib/auth-client.ts` that returns `{ data, error }` and turns a throw into `{ data: null, error: {} }`. `Refusal` stays per form, because each form places messages differently.
- **Guard:** a `tests/guards/` grep failing on `as Failure }` / `error: {} as` in `src/components/`.
- **Fix:** add the type and helper; replace the seven local `Failure` interfaces and the catch fallbacks. Could break: the Passkeys catch yields `code: undefined` and feeds `refusal(code)`, so it needs the same shape (it does with `{}`).
- **Tests covering the callers:** `tests/components/PasswordSection/`, `tests/components/SignInPanel/`, `tests/components/ResetPasswordForm/`, `tests/components/ForgotPasswordForm/`, `tests/components/Passkeys/`.

**Part 3: Better Auth "dropped connection" catch wrapper written 14 times**

- **Why it matters:** The catch for a dropped connection is written 14 times with differing fallbacks. A person with a flaky network can see a clean error in one auth screen and an unhandled failure or silent hang in another.
- **Drift:** the fallback is `{error: thrown}` in six places, `{error: {}}` (cast to a local `Failure`) in six, `{error: {code: undefined}}` in two, `{error: {} as {status?: number}}` in two, and a try/catch in one. Callers that read `error.status` or `.code` depend on which shape they got.
- **Shared piece:** one helper in `src/lib/auth-client.ts` (or `src/lib/auth-call.ts`), e.g. `settle(call: Promise<{data, error}>)`, that returns the Better Auth result and turns a throw into `{data: null, error: {status: undefined, code: undefined, message: undefined}}`. It would also own the one `AuthFailure` shape (this overlaps D-44, which owns the `Failure` types; do both together).
- **Guard:** an oxlint `no-restricted-syntax` rule or a `tests/guards/` grep test that fails on `.catch(` directly after a call imported from `lib/auth-client` inside `src/components/`.
- **Fix:** add the helper with a test, replace the 14 sites one file at a time, delete the local `Failure` interfaces. Risk: the callers that pass `thrown` onward (passkey, banner, sign-out) only test truthiness, so the empty object is safe.
- **Tests covering the callers:** `tests/components/SignInPanel/*`, `tests/components/SignInMethods/*`, `tests/components/ResetPasswordForm/index.test.tsx`, `tests/components/ForgotPasswordForm/*`, `tests/components/PasswordSection/*`, `tests/components/Passkeys/*`, `tests/components/ImpersonationBanner/*`, `tests/components/AccountMenu/*`.

- **Extra copies and changes found when merging:**

- `src/components/SignInPanel/password-form.tsx:41-45` (`Failure` with `status`, `code`, `message`)
- `src/components/SignInPanel/two-factor-step.tsx:29-32` (`Failure` with `status`, `code`)
- `src/components/ResetPasswordForm/types.ts` and the `{status?: number}` inline casts in `ForgotPasswordForm/index.tsx:34` and `PasswordSection/index.tsx:95`

- **Estimate:** 4.75 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-45: The mail-job family is five-times copied (start, message-for/send, step, workflow, report)

- **Severity:** medium
- **Why it matters:** Five mail jobs repeat the start, send and report steps. A fix to retry, logging or the missing-message check reaches one, so a keeper's pause or time-out email may fail silently while another family of mails is repaired.
- **Where:**
  - start wrappers: `src/modules/identity/services/access-pause-start.ts:1-19`, `src/modules/coven/services/member-pause-start.ts:1-20`, `src/modules/support/services/timeout-start.ts:1-21`, `src/modules/identity/services/account-notice-start.ts:1-19`, `src/modules/identity/services/secret-link-start.ts:1-18` (each: `startMailJob(job, [mail], label, async () => { const message = await xMessageFor(mail); if (message) await send(message); })`)
  - `sendXMail` wrappers (`messageFor` then `if (!message) return false; return deliver(message)`): `src/modules/identity/services/access-pause-mail.ts:21-25`, `src/modules/coven/services/member-pause-mail.ts:23-28`, `src/modules/support/services/timeout-mail.ts:21-28`, and the same in `src/modules/support/services/status-mail.ts`
  - step files (`'use step'`, one `xStep` that only calls `sendXMail`, one `reportXUnsent` that logs `mail: every attempt failed; ... was not sent`): `src/modules/identity/jobs/access-pause-mail-steps.ts`, `src/modules/coven/jobs/member-pause-mail-steps.ts`, `src/modules/support/jobs/support-timeout-mail-steps.ts`, `src/modules/support/jobs/support-status-mail-steps.ts`, `src/modules/identity/jobs/secret-link-mail-steps.ts`
  - workflow files (`'use workflow'`, `try { return await step(mail) } catch { await report(mail); return false }`): `src/modules/identity/jobs/access-pause-mail.ts`, `src/modules/coven/jobs/member-pause-mail.ts`, `src/modules/support/jobs/support-timeout-mail.ts`, `support-status-mail.ts`, `secret-link-mail.ts`, `account-notice-mail.ts`
  - the same four-line "try { await mailX(pause.id, await notifier.origin()) } catch { console.error('Could not start ...') }" block after a saved row: `src/modules/identity/services/access-pause.ts:96-102`, `src/modules/coven/services/member-pause.ts:88-94`, `src/modules/support/services/timeouts.ts:68-74`
- **Shared piece:** `src/lib/mail-job.ts` already owns `startMailJob`. Add to it (or a sibling `src/lib/mail-job-start.ts`) a `startMessageMail({ job, mail, label, messageFor })` that does the `tryOnce` body (`messageFor` then `send`), so each start file shrinks to one call or disappears (the callers import the job and `messageFor` directly; the "apart so no import cycle" reason is kept by keeping the call in a `*-start.ts` only where a cycle really exists). Add `deliverMessageFor(messageFor, mail)` (`messageFor` then `deliver`, boolean) to replace the three `sendXMail` bodies. Add a `notifyAfterSave(start, label)` helper in `src/lib/` for the try/catch/log block. The workflow-file bodies must stay in each module (`'use workflow'` / `'use step'` directives are per file, and the bundle must not pull database code), so those are not merged; report as a known floor.
- **Guard:** none practical for the workflow/step files (the directives force a file each). A `tests/guards/` test that no module file outside `src/lib/mail-job.ts` calls `startMailJob` with an inline `send(message)` body would stop the start copies coming back.
- **Fix:** 1) add the three helpers with unit tests; 2) switch the five start files and three `sendXMail` bodies; 3) switch the three notify blocks. Could break: the `'use step'` files must still import only the `sendX` function (no database code in the workflow bundle); check `npm run build`.
- **Tests covering the callers:** `tests/modules/identity/` access-pause and secret-link specs, `tests/modules/coven/` member-pause, `tests/modules/support/` timeouts and status-mail specs (find with `grep -rl "mailPausedUser\|mailPausedMember\|mailTimedOutSender\|scheduleSecretLinkMail" tests`).

- **Extra copies and changes found when merging:**

- Identity: `identity/jobs/access-pause-mail(-steps)`, `account-notice-mail(-steps)`, `secret-link-mail(-steps)`; `identity/services/account-notice-start.ts`, `secret-link-start.ts`, `account-notice-mail.ts`, `secret-link-mail.ts` (message then `deliver`).
- Support: `support/jobs/support-reply-notice`, `support-status-mail`, `support-timeout-mail` (each with `-steps`); start wrappers `support/services/mail-sender.ts` and `timeout-start.ts` (`startMailJob` plus fallback `send`); `reply-notice.ts`, `status-mail.ts`, `timeout-mail.ts` (`...MessageFor` plus `send...` calling `deliver`).
  Each job is a try/catch workflow around one step with a `console.error` "every attempt failed" report.

- **Estimate:** 3 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-46: GroupList and GroupedValueList (and AdminInvitations, AdminCards) rebuild one list family file for file

- **Severity:** medium

**Part 1: GroupList and GroupedValueList (and AdminInvitations, AdminCards) rebuild one list family file for file**

- **Why it matters:** The group and value lists rebuild the same files, and about a dozen other lists follow the same pattern. A fix to filtering, loading skeleton or paging in one leaves a curator seeing different behaviour in the other lists.
- **Where:**
  - `src/components/GroupList/{href.ts,kinds.ts,skeleton.tsx,filter.tsx,index.tsx}` (19/34/30/35/81 lines)
  - `src/components/GroupedValueList/{href.ts,kinds.ts,skeleton.tsx,filter.tsx,index.tsx}` (21/46/34/60/113 lines)
  - `src/components/AdminInvitations/{filter,skeleton}.tsx`, `src/components/AdminCards/{filter.tsx,href.ts}`
  - Same pattern elsewhere: `HelpOutline`, `UserList`, `CompendiumCards`, `MemberList`, `PrivilegeLedger`, `CovenCards`, `SupportRequests`, `ReceivedInvitations`, `PendingInvitations`, `CompendiumList`, `GrimoireList` (all use `ListBodySkeleton`; `listHref(` appears in 11 places).
  - `GroupList/kinds.ts` (path, title, label, noun, plural, add, holds) and `GroupedValueList/kinds.ts` (path, title, label, noun, plural, group): same fields, two types (`GroupListKind`, `GroupedValueListKind`).
  - `GroupList/filter.tsx` and `GroupedValueList/filter.tsx`: both a `FilterForm` + `SearchField` ("Name", "Search names") + `draftQuery` state; the second adds one `FilterSelectField`.
  - `GroupList/skeleton.tsx` and `GroupedValueList/skeleton.tsx`: `ListFilterFrame` with the real filter at `{ query: '' }`.
  - `GroupList/href.ts` `groupsPath` (a one-line wrapper on `KINDS[kind].path`, see D-190) against `GroupedValueList/href.ts`.
  - `GroupedValueList/index.tsx:46-65` (name cell with "Also called"), and the "no match" text built with `noMatchText` in both.
- **Shared piece:** the two Group lists differ by a `KINDS` record and a few columns. One `KindList` (or a `createKindList(kinds)` factory) with the `StackTable` columns Name, Description, `updatedColumn()`, Edit via `EditLink`, plus `Pager soft`, serves both. The per-list `href.ts` files each re-state filter keys that `listHref` already builds from a key list; a `defineListParams(keys)` helper would remove them.
- **Guard:** none practical. A guard that every `*List/skeleton.tsx` is under N lines would be arbitrary.
- **Fix:** merge GroupList and GroupedValueList first (two copies, same people), then evaluate the `href.ts` helper. Risk: stories (`index.stories.tsx`) for both must still render.
- **Tests covering the callers:** `tests/components/GroupList/`, `tests/components/GroupedValueList/`, curator list e2e specs.

**Part 2: GroupedValueList, GroupList and GroupedValueForm repeat the kind-registry and filter scaffolding (extra detail for D-46, with drift)**

- **Why it matters:** Group and value lists repeat the kind registry and filter scaffolding. A change to the search field or skeleton in one leaves the other showing a skeleton that does not match the real page, so curators see the layout jump.
  This extends D-46 with specifics found; see "Extra copies of D-46" below for the file list. Drift found:

- **Shared piece:** see D-46 (`KindList` factory and `defineListParams`). Specific addition: one `defineListKind({path,title,label,noun,plural,...})` type shared by both registries, and `FilterForm` taking an optional `select` slot so the Name search is written once.
- **Guard:** none practical.
- **Fix:** do as D-46, after merging the two `types.ts` kind interfaces.
- **Tests covering the callers:** `tests/components/GroupList/`, `GroupedValueList/`.

- **Extra copies and changes found when merging:**

- `GroupList/{filter,href,kinds,skeleton,index}.tsx` against `GroupedValueList/{filter,href,kinds,skeleton,index}.tsx`, with the details in D-46.
- `GrimoireList/filter.tsx` + `params.ts` + `recipe-href.ts` and `CovenCards` (`sortable-links.tsx`) repeat the "state the filter keys three times" shape (`Held` interface, `heldOf`, `NONE`, `hrefFor`, `filterOf`). `GrimoireList/filter.tsx` compares `JSON.stringify(held) !== JSON.stringify(heldOf(filter))`; `CompendiumList/filter.tsx` has the same Held pattern.

- **Estimate:** 6.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-47: `existsIn(parent, and(eq(parent.id, child.fk), predicate))` repeated about fifteen times

- **Severity:** medium

**Part 1: `existsIn(parent, and(eq(parent.id, child.fk), predicate))` repeated about fifteen times**

- **Why it matters:** The live-parent check is written about fifteen times. A copy that forgets the soft-delete filter would count or return deleted rows, so a user could see a deleted ingredient's data in a list or count.
- **Where:**
  - the correlated "parent is live and matches" check across `src/db/repository/ingredients.ts`, `spells.ts`, `stock.ts`, `workings.ts` and `cupboard-entries.ts`.
  - `ingredients.ts:480-485` (`holdsForm`), `487-493` (`holdsGroupMate`), `822-826` (`citesNowhere`), `835` (`hasNoForm`), `903-906` (`listOrVariantHolds`), `928-934` (`elementArm`), `945-951` (`formArm`), `989-992` (`toxicArm`), `1019-1022` (`pickedFormArm`). Also `vocabularies.ts:287` (`ofEntry`) and `ingredient-parent.ts` hold the same join condition.
  - Coven holds a row of the entry: `ingredients.ts:356-363` (`workspaceListScopeIncludingSoftDeleted`), `ingredients.ts:430-436` (`held` in the suggestion finder), `ingredients.ts:696-703` (`heldBy`, for several proofs), `cupboard-entries.ts:66-71` (the same shape), `ingredient-parent.ts:49-54` (Elsewhere, same shape).
  - Cupboard row names a live compendium entry: `cupboard-entries.ts:82-90` (`inCupboard`) and `cupboard-entries.ts:180-183` (`countCovensUsing`).
  - `cupboard-entries.ts:179`, `invitations.ts:87` and `92` (`inLiveWorkspaceOrSite`, `inLiveWorkspace`), `users.ts:118` (via `workspaceMembers`), `memberships.ts:45` and `78` (Elsewhere).
- **Shared piece:** `parentLive(parent, childFk)` in `predicates.ts`.
- **Guard:** none practical.
- **Fix:** add the predicate, swap the copies. Low value alone; do it only with D-75 in the same files.
- **Tests covering the callers:** `tests/db/` repository specs.

**Part 2: The "ingredient has a live variant that ..." `EXISTS` is spelled nine times in `ingredients.ts`**

- **Why it matters:** The 'has a live variant' check is spelled nine times in ingredients. A copy written without the live filter would count deleted forms, so a user filtering by element or form sees an ingredient that has no current form.
- Nine near-identical copies of `existsIn(ingredientVariants, and(eq(ingredientVariants.ingredientId, ingredients.id), X))`. Extra copy of D-47 (which counted this shape across five files at about fifteen; this is the ingredients.ts share). The shape matters more than usual because `existsIn` ANDs the variant's tombstone filter, so a copy that forgot `existsIn` would count soft-deleted forms.
- **Shared piece:** `const hasLiveVariant = (...arms: (SQL | undefined)[]) => existsIn(ingredientVariants, and(eq(ingredientVariants.ingredientId, ingredients.id), ...arms))` in `ingredients.ts`, exported for `vocabularies.ts` if it fits. Do this in the same change as D-47.
- **Guard:** none practical.
- **Fix:** add the helper; swap nine call sites. `hasNoForm` becomes `not(hasLiveVariant())`. Keep each caller's own doc comment.
- **Tests covering the callers:** `tests/db/repository/ingredients*.test.ts`, `tests/db/repository/ingredient-facets*.test.ts`, `tests/modules/ingredients/**`.

**Part 3: "This coven holds a cupboard row for this entry" `EXISTS` spelled four times; "row names a live compendium entry" twice**

- **Why it matters:** The 'coven holds this entry' check is spelled four times. A changed rule, such as paused seats or soft-deleted rows, applied to one copy makes the suggestion list, held-in filter and cupboard disagree about what a coven has.
- **Shared piece:** one exported `heldBy(memberships)` (it already handles one or many) used for the first four; `countCovensUsing` should reuse the "names a live entry" arm from `inCupboard`, pulled into a private `namesLiveEntry()`.
- **Guard:** none practical.
- **Fix:** export `heldBy` from `ingredients.ts` and import it in `cupboard-entries.ts` (check `ingredient-parent.ts` before moving, since layering matters there). `held` in the suggestion finder becomes `heldBy([membership])`.
- **Tests covering the callers:** `tests/db/repository/cupboard*.test.ts`, `ingredients*.test.ts`.

**Part 4: `existsIn(workspaces, eq(workspaces.id, X.workspaceId))` ("its coven is live") written six times**

- **Why it matters:** The 'its coven is live' check is written six times. A copy missing it would return rows of a deleted coven, so a member could see an invitation or ingredient from a coven that no longer exists.
- **Shared piece:** `inLiveWorkspaceOf(column: AnyPgColumn)` in `predicates.ts` beside `scopedTo`.
- **Guard:** none practical.
- **Fix:** add the helper; replace six sites. `invitations.ts:inLiveWorkspace` becomes `inLiveWorkspaceOf(invitations.workspaceId)`.
- **Tests covering the callers:** `tests/db/repository/{cupboard-entries,invitations,users,memberships}*.test.ts`.

- **Estimate:** 4.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-48: Wrapping flex row (`display:flex; flex-wrap:wrap; align-items:center; gap`) repeated 25 times

- **Severity:** medium
- **Why it matters:** The wrapping flex row is repeated in 25 stylesheets. Changing the spacing or alignment means editing each, and a missed one leaves a wrapped row that looks different to users on narrow screens.
- **Where:**
  - `src/components/ChipColorField/index.scss:224`, `Combobox/index.scss:122`, `DocumentEditor/index.scss:13`, `FacetPanel/index.scss:149`, `ImpersonationBanner/index.scss:13`, `IngredientEntry/index.scss:317`, `IngredientForm/index.scss:449,495,681`, `JarShelf/index.scss:96`, `Passkeys/index.scss:18`, `ReceivedInvitations/index.scss:63`, `SignInMethods/index.scss:15`, `SiteFooter/index.scss:40,61`, `StepRow/index.scss:4`, `SupportList/index.scss:10,86`, `SupportRequests/index.scss:230`, `SupportRequests/timeout-panel.scss:52,72`, `Welcome/index.scss:14`, `src/scss/_primitives.scss:2376`, `.storybook/foundations.scss:230,307` (all under `src/components/` unless shown).
- **Shared piece:** `@mixin wrap-row($gap)` in `src/scss/_mixins.scss` next to `stack`, or a `.wrap-row` primitive if markup can take it. Gaps vary (`space(1)` to `space(4)`, some two-value), so the gap is the argument.
- **Guard:** none practical; the block is three ordinary declarations, a lint rule would be noisy.
- **Fix:** `@include wrap-row(space(2))`; the one `no gap` hit (`timeout-panel.scss:72`) needs the argument made optional. Risk: low, cascade order inside each block must keep later overrides after the include.
- **Tests covering the callers:** component tests and e2e specs of the 20 components; no visual regression suite exists.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-49: The lede text is written in both a page and its skeleton

- **Severity:** medium

**Part 1: The lede text is written in both a page and its skeleton**

- **Why it matters:** The page lede is typed in the page and its skeleton. A keeper-visible wording change reaches one, so the loading skeleton shows the old text for a moment before the page swaps in the new one.
- **Where:**
  - `curator/page.tsx` and `curator/skeleton.tsx:6-19`; `keepers/page.tsx` and `keepers/skeleton.tsx:16-29`.
  - `src/app/(shell)/coven/[slug]/(people)/layout.tsx:21-36` and `(people)/skeleton.tsx:34-46`
  - `src/app/(shell)/coven/[slug]/grimoire/(list)/layout.tsx:17-28` and `grimoire/(list)/skeleton.tsx:23-34`
  - Each pair builds the same `PageTab[]` (`href` cast to `Route`, label, `skeleton`). The people skeleton lists both tabs because the role is unknown; the layout adds Invitations by permission.
  - Support: `src/app/(public)/support/page.tsx:50-51` and `support/skeleton.tsx:12-13`
  - Compendium: `src/app/(public)/compendium/page.tsx` and `compendium/skeleton.tsx` (eyebrow "Reference", title "Compendium", the long lede)
  - Create Coven: `src/app/(shell)/coven/new/page.tsx:43-44` and `coven/new/skeleton.tsx:14-15`
  - Titles "Access Paused", "Your Email", "Terms of Use" in the matching skeletons of `coven-paused/[slug]`, `account/email`, `account/terms`.
  - Contrast `HELP_LEDE` and `HELP_GLOSSARY_CARD`, which are already shared constants.
  - `src/app/(shell)/account/(tabs)/page.tsx` (3 entries) and `(tabs)/panels.tsx`
  - `src/app/(shell)/account/(tabs)/sign-in/page.tsx` (4 entries) and `(tabs)/panels.tsx`
- **Shared piece:** export the lede string/markup from `ADMIN_PAGES` (`src/components/AdminNav/sections`) and use it in both.
- **Guard:** none practical.
- **Fix:** add `lede` to the `ADMIN_PAGES` entry; read it in both. Could break: nothing.
- **Tests covering the callers:** curator and keepers index e2e specs.

**Part 2: Tab lists are written in the layout and again in the skeleton (people, grimoire)**

- **Why it matters:** The tab lists are written in both layout and skeleton. Adding or renaming a tab in the layout leaves the skeleton showing the old tabs, so members see tabs flicker or shift when the page loads.
- **Shared piece:** `peopleTabs(slug, { invitations })` in `(people)/tabs.tsx` and `grimoireTabs(slug)` in `grimoire/(list)/tabs.tsx`; the layout and the skeleton both call them.
- **Guard:** none practical.
- **Fix:** extract both; the skeleton passes `invitations: true`. The two files that hold the skeletons are `'use client'`; the helper must be importable from both, so keep it free of server-only imports.
- **Tests covering the callers:** `tests/app/(shell)/coven/[slug]/members.test.tsx`, `invitations.test.tsx`, `layout.test.tsx`, `tests/guards/skeletons.test.ts`.

**Part 3: Page titles and ledes are typed in both the page and its skeleton**

- **Why it matters:** Page titles and ledes are typed in both the page and its skeleton. A wording change in one makes the loading state show different text from the loaded page, so users see the heading change when loading ends.
- **Shared piece:** a `const <PAGE>_HEAD = { title, lede }` in each page's `types.ts` sibling (a `head.ts`), imported by both files.
- **Guard:** none practical; a copy test would test wording, which the project does not test.
- **Fix:** one constant per page. Skeletons are client files; the constant files must not import server code.
- **Tests covering the callers:** `tests/guards/skeleton-heading.test.tsx`, `tests/guards/page-titles.test.ts`.

**Part 4: `PageNav` entries are listed in the page and again in its skeleton**

- **Why it matters:** The account page navigation entries are listed in the page and the skeleton. Adding an account section updates one, so the skeleton shows the wrong list of links while loading and the layout visibly jumps.
- **Shared piece:** `ACCOUNT_NAV` and `SIGN_IN_NAV` constants in `(tabs)/tabs.tsx` or a new `nav.ts`.
- **Guard:** none practical.
- **Fix:** one constant per tab. Do together with D-117.
- **Tests covering the callers:** `tests/app/(shell)/account/*`.

- **Estimate:** 2.75 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-50: `src/lib/utc.ts` repeats the `formatToParts` plus `part()` block four times, and one email does its own date formatting

- **Severity:** medium

**Part 1: `src/lib/utc.ts` repeats the `formatToParts` plus `part()` block four times, and one email does its own date formatting**

- **Why it matters:** The UTC date formatting block is copied four times, plus an email formatting its own date. A fix to a wrong time part in one leaves other dates, such as one in an email notice, showing a different or wrong time.
- **Where:**
  - `src/lib/utc.ts:36-49`, `52-66`, `96-107`, `108-121` (the `Intl.DateTimeFormat(...).formatToParts(at)` call and the `part` lookup). `src/emails/email-change-notice.ts:19-25` (`whenOf`) formats a long date and short time in UTC again, near `inUtc` in the same lib file.
  - `src/components/Passkeys/label.ts:3-9` (`passkeyAdded`), `src/components/IngredientEntry/review-date.ts:3-9` (`reviewDay`, outside my folders; used by `IngredientEntry/review-row.tsx` and `EntryMarks/index.tsx`), `src/components/LastEdit/index.tsx:9-10` (`day`, month short or long, UTC), `src/components/SupportRequests/day-range.tsx:7-14` (`dayOf`, with or without year, any zone). `passkeyAdded` and `reviewDay` are byte-identical to each other and equal `shortDayInZone(date, 'UTC')` in `src/lib/utc.ts:95-104` apart from `formatToParts` spacing; `LastEdit` with `month: 'long'` equals `dayInUtc` (`lib/utc.ts:22`).
  - `DataTable/updated-column.tsx:15`, `DocumentPage/index.tsx:32` (for the `dateTime` attribute), and Elsewhere `MemberDetail/index.tsx:15`, `UserDetail/index.tsx:31`, `UserList/index.tsx:143`, `AdminCards/mint-form.tsx:50,53`, `AdminCards/filter-params.ts:14`, `src/app/(shell)/account/terms/page.tsx:38`.
- **Shared piece:** a private `partsOf(at, options)` returning the `part()` lookup in `utc.ts`; `whenOf` can use `inUtc` if the format difference (24 hour against `timeStyle: 'short'`) is accepted.
- **Guard:** none.
- **Fix:** 1. Add `partsOf`. 2. Use it in the four functions. 3. Ask the owner before changing the email's visible time format.
- **Tests covering the callers:** `tests/lib/utc.test.ts`, `tests/emails/email-change-notice.test.ts`.

**Part 2: Short UTC date formatters re-implement `src/lib/utc.ts`**

- **Why it matters:** Four components format short dates themselves instead of using the UTC helpers. A bug fix to the shared date helper misses them, so a passkey or review date can show differently from the same date elsewhere.
- **Shared piece:** `shortDayInZone` / `dayInUtc` in `src/lib/utc.ts`, plus a `shortDayNoYearInZone` there if `SupportRequests/day-range.tsx` needs the year-less form.
- **Guard:** a `tests/guards/` grep failing on `toLocaleDateString(` in `src/components/` (the lib file owns date wording).
- **Fix:** delete `passkeyAdded`/`reviewDay` and call `shortDayInZone(new Date(at), 'UTC')`; swap `LastEdit`'s `day`; fold `dayOf`. Check output is identical (the `en-GB` short month has no full stop, so `Sept` vs `Sep` must be checked on the runtime used by the tests).
- **Tests covering the callers:** `tests/components/Passkeys/`, `LastEdit/`, `SupportRequests/`, `EntryMarks/`, `tests/lib/utc.test.ts`.

**Part 3: ISO-day display `toISOString().slice(0, 10)` is written in six components**

- **Why it matters:** The ISO-day slice is written in six components. A change to how days display, or a wrong day near midnight in a time zone, is fixed in one place and left in the rest, so users see different dates for the same moment.
- **Shared piece:** `isoDayOf(at: Date): string` in `src/lib/utc.ts` beside `dayInUtc`. `MemberDetail` and `UserDetail` also repeat the whole `<time dateTime={at.toISOString()}>…</time>` element at the same shape (`MemberDetail/index.tsx:15`, `UserDetail/index.tsx:31`); a `UtcDay` component would own both.
- **Guard:** a `tests/guards/` grep for `toISOString().slice(0, 10)` outside `src/lib/utc.ts` (the seed file `src/db/seed/documents.ts:47` is a validation use and goes on the allow list).
- **Fix:** add the helper and optionally `<UtcDay at={…} />`; port the call sites. No behaviour change.
- **Tests covering the callers:** `tests/components/DataTable/`, `DocumentPage/`, `MemberDetail/`, `UserDetail/`, `UserList/`.

- **Extra copies and changes found when merging:**

- `src/components/Passkeys/label.ts:3-9` is already named. No further copies found in J to P.

`toISOString().slice(0, 10)` for a `<time>` day, where `lib/utc.ts:33` (`dayInUtc`) exists: `UserList/index.tsx:141-143`, `UserDetail/index.tsx:30-32`. Elsewhere: `MemberList/index.tsx:66`, `MemberDetail/index.tsx:15`, `DataTable/updated-column.tsx:15`, `app/(shell)/account/terms/page.tsx:38`.

- **Estimate:** 3.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-51: "Has text" check (`(x ?? '').trim() !== ''`) written as a local `said` in four places and inline in six more

- **Severity:** medium

**Part 1: "Has text" check (`(x ?? '').trim() !== ''`) written as a local `said` in four places and inline in six more**

- **Why it matters:** The "has text" check exists as a local `said` helper in four files and inline in six more. If the rule changes, for example to treat non-breaking spaces as blank, the missed copies accept input the others reject, and users see forms that disagree.
- **Where:**
  - `src/components/IngredientEntry/blocks.tsx:6` (`said`, a type guard) and `listed` beside it
  - `src/components/SafetyNote/safety-note.tsx:7` (`said`, identical type guard)
  - `src/components/SafetyNote/caution-mark.tsx:4` (`said`, boolean form)
  - `src/components/SpellBuilder/steps/values.ts:159` and `:240` (inline)
  - `src/components/IngredientCard/face.tsx:~48` and `IngredientCard/index.tsx:14` (`noted`, inline)
  - `src/components/IngredientEntry/formal-name.tsx` (`(entry.canonicalName ?? '').trim()`), `IngredientEntry/references.tsx` NoteItem (`located`)
  - `src/db/repository/ingredients.ts:875` (filter of blank strings; outside components, same idea)
  - `src/components/IngredientForm/summaries.tsx:34-35` (`count(n, {one, many})` = `${n} ${plural(n, one, many)}`; the same helper D-54 asks for in `src/lib/text.ts`), `IngredientForm/copy.tsx:131` (`said(...)`, an unrelated sentence builder that shares its name with D-51's `said`; rename on the way).
  - `src/components/IngredientForm/summaries.tsx:36`, `src/components/SpellBuilder/index.tsx:95` (both named `oneLine`), `src/lib/page-metadata.ts:15`, `src/lib/help-marks.ts:91`.
- **Shared piece:** `src/lib/text.ts` already holds small string helpers (`plural`, `capitalise`, `joinAnd`); add `hasText(value): value is string` and `nonBlank(values)` there.
- **Guard:** none practical (a lint rule on the exact expression is possible via oxlint `no-restricted-syntax` but noisy).
- **Fix:** add the helper, delete the three `said` definitions, replace the inline copies. Low risk; the type guard form covers both uses.
- **Tests covering the callers:** `tests/components/SafetyNote/`, `tests/components/IngredientEntry/`, `tests/components/IngredientCard/`.

**Part 2: Local `count` and `said` helpers in IngredientForm re-implement shared wording helpers**

- **Why it matters:** IngredientForm has its own count helper and a second helper named said, which clashes with another said elsewhere. A pluralisation fix in the shared helper misses this form, so a steward sees wrong plurals in its summaries.
- **Shared piece:** the `counted` helper of D-54.
- **Guard:** none practical.
- **Fix:** do together with D-54; rename `copy.tsx`'s `said` to `copiedSentence`.
- **Tests covering the callers:** `tests/components/IngredientForm/`.

**Part 3: Whitespace collapse `text.trim().replace(/\s+/g, ' ')` written as `oneLine` twice and inline twice more**

- **Why it matters:** The whitespace collapse is written four times, two named oneLine. A fix, such as handling non-breaking spaces, reaches one, so page metadata or help text can keep stray spaces that appear in a title or search snippet.
- **Shared piece:** `oneLine` in `src/lib/text.ts`.
- **Guard:** none practical.
- **Fix:** add and import (note the lib copies are `replace` then `trim`; same result).
- **Tests covering the callers:** `tests/lib/page-metadata*`, `tests/lib/help-marks*`, IngredientForm and SpellBuilder component tests.

- **Estimate:** 1.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-52: The coven access flags (`rolePermits` x4) are computed in more than one layout and page

- **Severity:** medium

**Part 1: The coven access flags (`rolePermits` x4) are computed in more than one layout and page**

- **Why it matters:** If the role rules change, for example a Practitioner gaining invite rights, one page can show the invite button while the layout or its server check still refuses, so a member sees a control that does nothing.
- **Where:**
  - `src/app/(shell)/coven/[slug]/layout.tsx` and `src/app/(shell)/coven/[slug]/page.tsx` compute the same four flags from the role. Related `canInvite` and `canReadMembers` copies are in `src/app/(shell)/coven/[slug]/(people)/layout.tsx`, `src/app/(shell)/coven/[slug]/(people)/invitations/page.tsx`, the invite action file, and `src/lib/viewer.ts`.
  - `src/app/(public)/compendium/card-places.ts:16-18,40-42`
  - `src/app/(public)/compendium/ingredients/[slug]/cupboard.ts:65-67`
  - `src/app/(shell)/coven/[slug]/ingredients/[id]/page.tsx:~200-206` (`canAnnotate`, `canRemove`, `canMakeOurs`, `canAdd`)
  - `src/app/(shell)/coven/[slug]/ingredients/page.tsx:~55-65` (`mayEdit`, `mayDelete`, `mayMakeOurs`, `mayStock`)
  - Also `${entryPath}?annotate=${encodeURIComponent(slug)}` is built in both `card-places.ts` and `cupboard.ts`.
  - `src/app/(shell)/coven/[slug]/layout.tsx:36-44` (`canDelete`, `canReadMembers`, `canInvite`, `canRename`; `canReadMembers` is computed a second time at line ~58 for `CovenNav`)
  - `src/app/(shell)/coven/[slug]/page.tsx:19-22` (the same four)
  - `(people)/layout.tsx:20` and `(people)/invite-action.tsx` recompute `member: ['invite']`.
- **Shared piece:** `covenAccessOf(role)` returning the named flags, exported next to `rolePermits` use in `src/lib/` (or from `@/modules/coven`).
- **Guard:** a `tests/guards/` grep for `rolePermits(` in `src/app/**` outside the helper.
- **Fix:** 1. Add the helper and a test. 2. Replace the calls. Could break: a flag whose resource list differs slightly between files; compare each before replacing.
- **Tests covering the callers:** `tests/components/CovenNav`, coven e2e specs for each role.

**Part 2: Per-coven permission flags (`canAnnotate`, `canMakeOurs`, `canRemove`, `canAdd`) are computed in four places**

- **Why it matters:** When a role's permissions change, the compendium card, entry page, coven ingredient list and detail page can disagree: a Practitioner sees Remove on one screen but not another, or a link opens an annotate form the server then refuses.
  Extra copies of D-52 and a finding of its own, because the app-side callers are four near-identical copies.

- **Shared piece:** `cupboardAccessOf(role)` returning `{ canAdd, canAnnotate, canRemove, canMakeOurs, canStock }`, exported from `@/modules/coven` or `@/modules/ingredients` next to `MAKE_IT_OURS_PERMISSION`. It stays a per-role statement, not a rank.
- **Guard:** none practical. A guard test could forbid `MAKE_IT_OURS_PERMISSION` outside the helper.
- **Fix:** add the helper, replace the four sites. Risk: `canAdd` differs (the entry page requires `inCompendium`); keep that condition at the call site.
- **Tests covering the callers:** `tests/app/(public)/compendium/*`, `tests/app/(shell)/coven/[slug]/ingredient.test.tsx`.

**Part 3: Coven facts (`access` flags) are computed in the layout and again in the home page**

- **Why it matters:** The coven layout draws a loading skeleton from its own copy of the flags while the page uses another. If one list changes alone, the skeleton shows buttons the page then drops, so members see the screen jump.
- **Shared piece:** `covenAccessOf(role)` in `src/lib/` or `@/modules/coven`, returning the four flags; the layout stores it in `CovenFactsProvider` and the page spreads it.
- **Guard:** none practical. The layout's facts exist so the skeleton draws what the page will; if the two lists disagree, the skeleton lies.
- **Fix:** add the helper, call it in both. Risk: none beyond import cycles; keep it a pure function.
- **Tests covering the callers:** `tests/app/(shell)/coven/[slug]/layout.test.tsx`, `page.test.tsx`.

- **Extra copies and changes found when merging:**

- See D-52.

- **Estimate:** 4.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-53: Untitled-spell name expression written in ten places

- **Severity:** medium

**Part 1: Untitled-spell name expression written in ten places**

- **Why it matters:** A change to how an unnamed spell is shown, such as trimming rules or the fallback wording, lands in some cards and dialogs but not others, so one spell appears as 'Untitled' in one place and blank in another.
- **Where:**
  - `SpellCard/index.tsx:42` and `SpellRecipe/body.tsx:69` and `SpellRecipe/index.tsx:36`: `(title ?? '').trim() || UNTITLED_SPELL`
  - `SpellBuilder/spell-dialog.tsx:69`, `SpellBuilder/index.tsx:444`, `SpellRecipe/deleted-href.ts:6`, `SpellRecipe/look-dialog.tsx:39`: `title?.trim() || UNTITLED_SPELL`
  - Outside: `app/(shell)/coven/[slug]/grimoire/[id]/page.tsx:55,90`, `IngredientSearch/search-box.tsx:184,188` (twice in one object).
  - `src/components/IngredientSearch/search-box.tsx:183-188` (three times in one object), `SpellBuilder/spell-dialog.tsx:69`, `SpellBuilder/index.tsx:444`, `SpellCard/index.tsx:42`, `SpellRecipe/look-dialog.tsx`, `SpellRecipe/deleted-href.ts`.
- **Shared piece:** `spellNameOf(title: string | null | undefined): string` in `SpellCard/untitled.ts`, beside `UNTITLED_SPELL`. Callers stop importing the constant.
- **Guard:** a `tests/guards/` test that fails on `|| UNTITLED_SPELL` outside `untitled.ts`.
- **Fix:** add the helper, replace the eleven expressions, keep `UNTITLED_SPELL` unexported from `SpellCard/index.tsx` if no caller remains. Small risk: the two spellings differ on `null` handling only; the helper covers both.
- **Tests covering the callers:** `tests/components/SpellCard`, `SpellRecipe`, `SpellBuilder`, `IngredientSearch`.

**Part 2: Spell title fallback `title?.trim() || UNTITLED_SPELL` repeated**

- **Why it matters:** The fallback name for a spell with no title is repeated in six files, with slightly different trimming. A fix in one leaves the search results, dialogs or deleted-spell links showing an empty name for a Practitioner.
- **Shared piece:** `spellTitle(title)` exported beside `UNTITLED_SPELL` in `SpellCard/untitled.ts` (would also use D-51's `hasText`).
- **Guard:** none practical.
- **Fix:** add helper, replace the five or six sites.
- **Tests covering the callers:** SpellCard, SpellBuilder, SpellRecipe component tests.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-54: Hand-written singular/plural ternaries beside an existing `plural()` helper

- **Severity:** medium

**Part 1: Hand-written singular/plural ternaries beside an existing `plural()` helper**

- **Why it matters:** Hand-written singular/plural tests sit beside a ready helper, so wording fixes such as '0 items' or irregular plurals get applied in some screens and missed in others, leaving users with mismatched grammar like '1 ingredients'.
- **Where:**
  - src/components/AccountMenu/index.tsx:29; src/components/AccountMenu/panel.tsx:62; src/components/AccountMenu/counts.ts:8,16; src/components/AdminCards/minted.tsx:85; src/components/Combobox/index.tsx:155; src/components/CategoryChips/category-more.tsx:132. Also in: HelpOutline/index.tsx:115, HelpOutline/guides-bar.tsx:319, SpellBuilder/index.tsx:112, SpellBuilder/steps/index.tsx:160-161, SignInMethods/index.tsx:186, HelpSearchResults/index.tsx:25, DocumentMailingPanel/index.tsx:98,122-123, SupportRequests/index.tsx:109, RecordWorking/warnings.ts:17, IngredientForm/duplicates.tsx:446.
  - inline `n === 1 ? 'x' : 'xs'` at `src/components/SpellBuilder/index.tsx:112`, `SpellBuilder/steps/index.tsx:160-161`, `SignInMethods/index.tsx:186`, `HelpOutline/guides-bar.tsx:319`, `HelpOutline/index.tsx:115`, `HelpSearchResults/index.tsx:25`, `AdminCards/minted.tsx:85`, `AccountMenu/index.tsx:29`, `AccountMenu/panel.tsx:62`, `AccountMenu/counts.ts:8,16`, `DocumentMailingPanel/index.tsx:98,122,123`, `IngredientForm/delete-users.tsx:30-32`, and others (42 `=== 1 ?` hits under `src/components/` outside stories). Only `GroupForm`, `IngredientForm/copy.tsx` and `IngredientForm/summaries.tsx` use `plural`.
- **Shared piece:** `plural(count, one, many)` in `src/lib/text.ts`. Only 6 component call sites use it; at least 17 write `n === 1 ? 'x' : 'xs'` by hand.
- **Guard:** none practical as a type check. An oxlint `no-restricted-syntax` selector for `ConditionalExpression[test.operator="==="][test.right.value=1]` with string-literal branches would catch most, with some false positives.
- **Fix:** replace each ternary with `plural(n, ...)`; consider `count(n, 'noun')` returning `"3 requests"` for the many `${n} ${...}` shapes. Wording is unchanged.
- **Tests covering the callers:** tests/components/AccountMenu, AdminCards, Combobox, CategoryChips.

**Part 2: `plural()` exists in `src/lib/text.ts` and is bypassed in about 40 places**

- **Why it matters:** Hand-written `n === 1 ? ... : ...` ternaries sit beside the existing `plural()` helper. A grammar fix to the helper misses these copies, so users see mismatched wording such as "1 ingredients" on some screens.
- **Shared piece:** existing `plural(count, one, many)` in `src/lib/text.ts`; add `count(n, 'step')` returning `"3 steps"` for the common "number plus noun" form (every site above prints the number).
- **Guard:** an oxlint `no-restricted-syntax` selector on `ConditionalExpression[test.operator='==='][test.right.value=1]` with string-literal branches, in components only.
- **Fix:** add `counted(n, one, many?)`, replace the sites. Leave titles like "Sub Page"/"Sub Pages" (capitalised) with `plural` direct.
- **Tests covering the callers:** each folder's component tests; `tests/lib/text.test.ts`.

- **Estimate:** 3.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-55: Four public document pages and their versions repeated eight times, plus eight skeletons

- **Severity:** medium

**Part 1: Four public document pages and their versions repeated eight times, plus eight skeletons**

- **Why it matters:** Adding or changing a public document, such as a new page title or metadata, means editing sixteen near-identical files. A missed skeleton shows the wrong heading while the page loads, and a missed page loses its metadata or freshness setting.
- **Where:**
  - `src/app/(public)/{terms,disclaimer,privacy,code-of-ethics}/page.tsx` and `.../versions/[number]/page.tsx` (eight wrappers of `_documents.tsx`, each with the same metadata and `dynamic = 'force-dynamic'`); `src/app/(public)/{terms,disclaimer,privacy,code-of-ethics}/skeleton.tsx` and `.../versions/[number]/skeleton.tsx` (eight files, each `<PageColumn as="div"><DocumentSkeleton title="..." /></PageColumn>`); eight registry rows in `src/app/skeletons.ts:79-86`.
  - `src/app/sitemap.ts:19-22`, `src/app/robots.ts:13-16`, `src/lib/public-routes.ts:19-26` (with `/versions/*`) and `:58` (`STAY_ON`), `src/app/skeletons.ts:79-86`, `src/lib/agreement-version.ts:14-16`, plus the key types `src/lib/types.ts:228` (`AgreementDocumentKey`) and `src/modules/documents/types.ts:1` (`DocumentKey`). Adding a fifth document means editing all of them; today nothing fails if one is missed.
  - src/lib/unversioned-documents.ts (a Set and an array, both `['about']`), src/components/DocumentEditor/editor.tsx (casts to `ReadonlySet<string>`)
- **Shared piece:** Next needs a file per route, so the pages stay, but the skeletons can be one `documentSkeleton(title)` factory in `_documents.tsx` (or a `[document]` dynamic route is rejected, see below). The registry rows can be generated from the document list (D-55).
- **Guard:** none practical beyond D-55's list test.
- **Fix:** 1. Add `DocumentPageSkeleton({ title })` and have the eight skeleton files re-export one-liners, or build the registry rows with a loop. 2. Keep route files. Could break: the skeleton registry's import order and `route-match` tests.
- **Tests covering the callers:** `tests/app/skeletons.test.ts` (or similar), `tests/lib/navigation/*`.

**Part 2: The list of agreement documents is written out in six places**

- **Why it matters:** Adding a fifth agreement document means editing six lists by hand and nothing fails if one is missed. The new page could be missing from the sitemap, hidden by robots rules, or lack a loading skeleton, and a developer would not notice.
- **Shared piece:** one `DOCUMENT_PATHS` constant in a type-only/constant file in `src/lib/` (key to path), from which sitemap, robots, public-routes, STAY_ON and the registry derive. `AgreementDocumentKey` should be a subset of `DocumentKey` exported once.
- **Guard:** a `tests/guards/` test that every `src/app/(public)/<key>/page.tsx` for a `DocumentKey` appears in sitemap, robots and PUBLIC_ROUTES.
- **Fix:** 1. Add the constant. 2. Derive each list. 3. `public-routes.ts` is generated or has a generator check (see `lib/page-routes.ts`): confirm what the generator reads before editing. Could break: the generated-file freshness test.
- **Tests covering the callers:** `tests/app/sitemap.test.ts`, `tests/app/robots.test.ts`, `tests/lib/public-routes.test.ts`, `tests/lib/agreement-version.test.ts`.

**Part 3: `UNVERSIONED_DOCUMENT_KEYS` and `UNMAILED_DOCUMENT_KEYS` are the same list in two shapes**

- **Why it matters:** Two lists of the same documents (unversioned and unmailed) can drift apart, so a keeper could be offered versioning or mailing on a document that the repository treats the other way. The editor also needs a cast to compile.
- **Shared piece:** one `as const` array with one derived predicate.
- **Guard:** none.
- **Fix:** keep the array, export `isUnversionedDocument(key)`; drop the cast.
- **Tests covering the callers:** documents repository and DocumentEditor tests.

- **Extra copies and changes found when merging:**

- The four document pages and their `versions/[number]/page.tsx` files (`terms`, `disclaimer`, `privacy`, `code-of-ethics`) are one shape; the comment "Read from the database per request..." is copied four times. Their `skeleton.tsx` files are four copies of one skeleton.
- Hand-written metadata: `src/app/(public)/support/page.tsx`, `support/request/page.tsx`.
- `export const metadata = { title: 'Staff Help', robots: { index: false } }` in `src/app/(shell)/help/staff/page.tsx:8`, `staff/[slug]/page.tsx:11`, `staff/[slug]/[child]/page.tsx:11`.

The ninth public document page and skeleton shape: src/app/(public)/about/{page.tsx,placeholders.tsx,skeleton.tsx}.

`/about` added by hand to: src/app/robots.ts, src/app/sitemap.ts, src/lib/public-routes.ts (PUBLIC_ROUTES and STAY_ON), src/lib/page-routes.ts, src/app/skeletons.ts, src/components/AdminNav/sections.ts, src/components/AdminNav/skeleton.tsx, SiteFooter.

- **Estimate:** 4 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-56: Three near-identical support reply forms

- **Severity:** medium

**Part 1: Three near-identical support reply forms**

- **Why it matters:** The three support reply forms each hold their own copy of the box, discard guard and buttons. A fix to a bug, such as losing a draft on close, reaches the keeper's form but can be missed in the sender's or the link-based reply.
- **Where:**
  - `SupportRequests/reply-form.tsx:70-185` (reply or note, Notice error, textarea, BusyButton, DiscardQuestion)
  - `SupportSenderRequest/reply-box.tsx:25-88`
  - `SupportViewReplyForm/index.tsx:24-104`
  - Same structure each time: `useState(body)`, `useDiscardGuard(body.trim() !== '')`, `fieldDescription`, `<FieldShell label="Your Reply">` + `<textarea className="textarea" rows={4}>`, `<div className="support-detail__actions"><BusyButton ...>`.
  - `SupportForm/index.tsx:35-41` (`SUBJECT_LIMIT = 120`, `MESSAGE_LIMIT = 4000`), `SignedOutSupportForm/index.tsx:25-26` (same two), `SupportViewReplyForm/index.tsx:20` (`MESSAGE_LIMIT = 4000`); the server owns `src/modules/support/validation/support.ts:12-13` (`SUBJECT_MAX_LENGTH`, `MESSAGE_MAX_LENGTH`).
  - Subject field + Message field markup with the "Don't include passwords, payment details or other private information." warning: `SupportForm/index.tsx:236-290`, `SignedOutSupportForm/index.tsx:140-180`.
  - The about radio group (`RadioGroupField layout="cards"`, `ABOUT_REQUIRED`, `ABOUT_LABEL`): `SupportForm/index.tsx:213-228`, `SignedOutSupportForm/index.tsx:119-130`.
  - The hidden bot-trap input (`<div hidden><input name="website" tabIndex={-1} aria-hidden>`) plus its state: `SignedOutSupportForm/index.tsx:49,185-196`, `SupportViewReplyForm/index.tsx:27,77-89`.
  - Drift already present: SupportForm shows a `CharacterCount` and no `maxLength`; SignedOutSupportForm sets `maxLength` and shows no count; SupportForm validates client-side, SignedOutSupportForm does not.
  - `SupportRequestByLink/index.tsx:94-112` and `:115-133` (hash/token extraction in two effects), `:184-187` (`readGraphqlFailureCode`, a local reader of the error code), `:90` (D-14 form).
- **Shared piece:** a `SupportReplyField` (or `ReplyBody`) component in `SupportRequests/` rendering FieldShell+textarea+actions+discard guard; or a `useSupportReply` hook. `SupportViewReplyForm` also hand-rolls busy/failure state that `useSupportAction` (SupportRequests/use-support-action.ts) already holds, except it has no session/refresh: make `useSupportAction` take an `onDone` override, or split out a `useBusyAction` base that the other two share.
- **Guard:** none practical.
- **Fix:** extract the textarea block; make `useSupportAction` accept `{ refresh: false }` so `SupportViewReplyForm` can use it (it calls `onSent` instead of refresh/announce). Risk: `SupportViewReplyForm` is rendered signed-out and must not call `usePendingNavigation` if that needs a router (it does not need a session, check).
- **Tests covering the callers:** tests/components/SupportRequests, SupportSenderRequest, SupportViewReplyForm.

**Part 2: The two support-request forms copy fields, limits and warning text; limits also copy the server**

- **Why it matters:** The 120 and 4000 character limits are copied into three forms, away from the server's own constants. If the server limit changes, the form still accepts the old length and the sender loses a long message to a refusal after typing it.
- **Shared piece:** put the limits in `src/lib/support-path.ts` (client-safe, already holds `SUPPORT_ABOUTS`) and have `modules/support/validation/support.ts` import them from there (check `lib` -> module direction is allowed; if not, export from `@/modules/support` only if it is client-safe). Add `SupportMessageFields` (subject + message, with the warning, `CharacterCount`) and `BotTrapField` (owns the `website` state or takes `value/onChange`) in `SupportForm/` or `Field/`.
- **Guard:** a `tests/guards/` test asserting the client limits equal the service constants if they stay separate; best is one source.
- **Fix:** steps above. Risk: the signed-out form's ready logic; Story coverage (support stories).
- **Tests covering the callers:** tests/components/SupportForm, SignedOutSupportForm; e2e support stories.

**Part 3: SupportRequestByLink repeats token extraction and a local failure-code reader**

- **Why it matters:** The sign-in-by-link page reads the token from the URL in two separate effects. If a fix to the token handling lands in only one, the page can read the link correctly on load but fail after navigation, leaving the sender stuck.
- **Shared piece:** one `readToken()` function in the same file; look in `lib/graphql-failure` for an existing code accessor before keeping the local one.
- **Guard:** none practical.
- **Fix:** extract the function, call it from both effects; replace the local code reader if `lib/graphql-failure` offers one.
- **Tests covering the callers:** `tests/components/SupportRequestByLink`.

- **Extra copies and changes found when merging:**

`SupportViewReplyForm/index.tsx` hand-rolls `sending` and `failure` and repeats `MESSAGE_LIMIT = 4000` and the bot-trap `website` field.

- **Estimate:** 5.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-57: Hairline surface box repeated 12 times (exact triplicates)

- **Severity:** medium
- **Why it matters:** The same bordered card style is written out in twelve stylesheets. A change to the card look, such as border colour or radius, must be made in each, and any missed place is left with an odd panel next to its neighbours for every user.
- **Where:**
  - `border: 1px solid $hairline; border-radius: radius('surface'); background-color: $surface-card` in `src/components/AccessCards/index.scss:150`, `DateField/calendar.scss:10`, `HelpArticleForm/index.scss:60`, `PageNav/index.scss:116`, `StepRow/index.scss:78`, `src/scss/_primitives.scss:773,817`. Same with `$surface-page` in `FacetPanel/index.scss:89`, `SupportList/index.scss:49`, `SupportRequests/index.scss:187`, `SupportRequests/timeout-panel.scss:42`, `src/scss/_primitives.scss:2073`. Near variants: `HelpIndex/index.scss:86` (pill, card), `HelpWidget/index.scss:85` (control, page), `TabbedPage/index.scss:31` (pill, segment track).
- **Shared piece:** `@mixin surface-box($background: $surface-card, $radius: radius('surface'))` in `_mixins.scss`. Check `_primitives.scss:773,817` first: if one is already a primitive class, components should use it.
- **Guard:** none practical.
- **Fix:** replace the 12 exact copies; leave the three variants on the mixin's arguments.
- **Tests covering the callers:** component tests of the listed components.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-58: Two pages read search params by hand instead of `single()` and `trimmed()`

- **Severity:** medium

**Part 1: Two pages read search params by hand instead of `single()` and `trimmed()`**

- **Why it matters:** Two pages read the search text by hand while the rest use the shared helpers. If trimming or array handling changes in the helper, help search and the account support list behave differently, for example treating spaces as a real search.
- **Where:**
  - `src/app/(public)/help/search/page.tsx:19` and `src/app/(shell)/account/(tabs)/support/page.tsx:25` use `Array.isArray(...)` inline. `src/lib/search-params.ts` has `single` and `trimmed`, which the other pages use.
  - `src/app/(shell)/coven/[slug]/grimoire/(list)/grimoire-tab.tsx:130`
  - `src/app/(shell)/coven/[slug]/grimoire/[id]/page.tsx:106`
  - `src/app/(shell)/coven/[slug]/ingredients/page.tsx:59,63,66`
  - `src/app/(public)/compendium/ingredients/[slug]/types.ts:3`
  - `src/app/(shell)/coven/[slug]/grimoire/(list)/types.ts:5`
  - `src/app/(shell)/coven/[slug]/grimoire/[id]/types.ts:3`
  - `src/app/(shell)/coven/[slug]/ingredients/types.ts:26`
  - `src/app/(shell)/coven/[slug]/ingredients/[id]/types.ts:3`
  - `src/app/(shell)/keepers/help/new/page.tsx:16` and `keepers/help/page.tsx:117` (outside the area first audited)
  - Also `{ slug: string; id: string }` params interfaces are repeated per page.
- **Shared piece:** `trimmed()` and `single()`.
- **Guard:** a `tests/guards/` grep for `Array.isArray` in `src/app/**/page.tsx`.
- **Fix:** replace the two lines. Could break: whitespace trimming differs from the inline code; check the search term test.
- **Tests covering the callers:** help search and account support e2e specs.

**Part 2: Query-parameter id reads `typeof query.x === 'string' && query.x ? query.x : undefined` are written five times**

- **Why it matters:** Five places re-implement the shared 'read one query value' helper. A change to how arrays or blanks are handled reaches the helper's users but not these, so a repeated ?entry= parameter can open one thing on one page and none on another.
- **Shared piece:** `trimmed`/`single` from `src/lib/search-params.ts` (`grimoire-tab.tsx:~183` already uses `single(query.deleted)?.trim()`, so this is a re-implementation of an existing helper). If `trimmed` also trims, add `idParam(value)` there.
- **Guard:** none practical.
- **Fix:** replace the five lines with `single(query.entry) || undefined`. Risk: `single` takes the first of an array where the current code rejects arrays; check its contract first.
- **Tests covering the callers:** `tests/app/(shell)/coven/[slug]/*`.

**Part 3: `searchParams: Promise<Record<string, string | string[] | undefined>>` is declared seven times**

- **Why it matters:** The same search-parameters type is declared seven times. If Next.js changes the page props shape, each copy has to be fixed by hand, and a missed one fails the build or quietly types the wrong shape for a developer.
- **Shared piece:** `SearchParams` type in `src/lib/types.ts` (type-only file, per MB.108). `Next` may generate `PageProps`; check `node_modules/next/dist/docs/` for a global helper type before adding one.
- **Guard:** none practical.
- **Fix:** export the type and import it. Trivial.
- **Tests covering the callers:** type check only (`npm run pre-commit`).

- **Extra copies and changes found when merging:**

- `(shell)/account/(tabs)/support/page.tsx:25` and `(public)/help/search/page.tsx:19` are already listed in D-58; no new ones here.

---

- **Estimate:** 1.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-59: "named only in an allowed set of files" guards each rebuild the same scanner

- **Severity:** medium
- **Why it matters:** four near-identical guards, plus eight hand-written copies of the source-file filter
- **Where:**
  - Name-allowlist scan: `tests/guards/workspace-slug-lookup.test.ts:17-31`, `invitation-token-rotation.test.ts:18-30`, `stock-decrement-path.test.ts:14-45`, `daily-job-starts.test.ts:7-30` (`callers()`), and the first half of `unit-of-work.test.ts:17-`. Each does `inject('repoFiles').filter(ext regex && !includes('__lint-probe'))`, asserts the definition is in the listing, filters by `readFileSync(join(REPO_ROOT, file))` against a regex, then compares `.sort()` to a sorted allowlist.
  - The source-file filter `/\.[cm]?tsx?$/ && !file.includes('__lint-probe')` appears in `invitation-token-rotation.test.ts:20`, `workspace-slug-lookup.test.ts:22`, `lint-job-boundary.test.ts:31,52`, `lint-loader-boundary.test.ts:26`, `daily-job-starts.test.ts:11`, `unit-of-work.test.ts:20`, `stock-decrement-path.test.ts:15` (the last with a slightly different regex, `/\.tsx?$/`: drifted, it misses `.mts`/`.cts`).
  - `readFileSync(join(REPO_ROOT, file), 'utf8')` instead of `fromRoot(file)` (`tests/support/paths.ts`): 12 uses across `lint-job-boundary`, `invitation-token-rotation`, `unit-of-work`, `workspace-slug-lookup`, `soft-delete-finder-guard`, `lint-loader-boundary`, `daily-job-starts`, `lint-db-client-boundary`, `stock-decrement-path`.
- **Shared piece:** `tests/support/repo-scan.ts` exporting `sourceFiles({ under?, extensions? })` (wraps `inject('repoFiles')`, drops lint probes) and `filesMatching(files, regex)` (reads through `fromRoot`). Optionally `expectNamedOnlyIn(regex, allowed, { definition })` for the allowlist guards.
- **Guard:** none practical; the helper is the guard against re-copying, and reviewers see a new guard importing it.
- **Fix:** add the helper, convert the guards one by one; keep each guard's own allowlist and precondition assertions verbatim so each still proves the same thing. Fix the `stock-decrement-path` extension drift when converting.
- **Tests covering the callers:** the guards themselves.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-60: The pause tables' repository files are near-copies, and re-implement `noEndOrAhead`

- **Severity:** medium

**Part 1: The pause tables' repository files are near-copies, and re-implement `noEndOrAhead`**

- **Why it matters:** The two pause repositories copy the same 'has this pause run out' rule, even though a shared predicate exists. If the rule changes, one pause table could treat an expired pause as still standing, wrongly locking out a member or user.
- **Where:**
  - `src/db/repository/user-access-pauses.ts:13` and `src/db/repository/workspace-member-pauses.ts:15-19`: `notRunOut` is `or(isNull(until), gt(until, sql\`now()\`))`, which is exactly `noEndOrAhead(until)`in`src/db/repository/predicates.ts:61`, already used by `support.ts:356,855`
  - `src/db/repository/user-access-pauses.ts:15-16` (`pauseStands`), `src/db/repository/support.ts:353-356` (`timeoutStands`): `and(isNull(liftedAt), noEndOrAhead(until))`
  - `lifted = () => ({ liftedAt: sql\`now()\`, liftedBy: session.userId })`in`user-access-pauses.ts:78`and`workspace-member-pauses.ts:108`
  - `setXPause` (close live row with `update(...lifted())`, then `insert ... onConflictDoNothing().returning()`) and `liftXPause` (`update(..., lifted(), and(liveFor, notRunOut))`) in `user-access-pauses.ts:77-95` and `workspace-member-pauses.ts:107-131`; the "stands" finder + `liveFor` + page finder around them mirror each other
  - `support.ts:845-857` inlines `notSoftDeleted + userId + isNull(liftedAt) + noEndOrAhead` a third time instead of using `timeoutStands`
  - src/db/repository/user-access-pauses.ts:1-1140 (`notRunOut`, `liveFor`, `HISTORY_ORDER`, `lifted`, `setUserAccessPause`, `liftUserAccessPause`, standing/for-many finders); src/db/repository/workspace-member-pauses.ts:1-1271 (same shapes, scoped by `Membership`).
- **Shared piece:** use `noEndOrAhead` for both `notRunOut`s; add `standingPause(table)` (`isNull(liftedAt)` and `noEndOrAhead(until)`) to `predicates.ts` for the three tables; add `liftedNow(session)` and optionally a `closeAndInsertPause(context, table, liveWhere, values)` writer helper in a new `pause-writes.ts` beside the repository files. Both pause writers keep their own proof types (`SiteAdmin`, `Membership`) in their signatures; the helper takes the already-built `where`, so the proof stays first and the coven id stays derived from the proof.
- **Guard:** none practical for the writer shape (two tables). A `tests/guards/` check that `gt(<col>, sql\`now()\`)`combined with`isNull`appears only in`predicates.ts` would stop the predicate copies.
- **Fix:** 1) swap `notRunOut` bodies for `noEndOrAhead`; 2) replace `support.ts:850-856` with `timeoutStands`; 3) extract writer helper. `workspace-member-pauses.ts` exports `notRunOut` for `findWorkspaceSeat`; keep that export name or update the one importer.
- **Tests covering the callers:** `tests/db/` and `tests/modules/` for user-access-pauses, workspace-member-pauses, support timeouts and sign-in (`grep -rln "AccessPause\|MemberPause\|SupportTimeout" tests`).

**Part 2: Extra copies of D-60 (pause tables): the two pause repositories**

- **Why it matters:** The user and coven-member pause files are near-copies of the same open, lift and history logic. A bug fix to how a pause closes or is lifted can land in one and not the other, leaving a member paused after a keeper lifted it.
- **Shared piece:** a private `pause-ledger.ts` in `src/db/repository/` holding `notRunOut(table)`, `lifted(session)`, `historyOrder(table)` and a `closeThenInsert` helper. Each file keeps its own proof types and table.
- **Guard:** none practical; the two tables are different, so a test cannot tell a copy from a coincidence.
- **Fix:** extract the table-parametrised pieces; keep the proofs per file. Risk: `notRunOut` in workspace-member-pauses is exported for `findWorkspaceSeat`, keep the export.
- **Tests covering the callers:** tests/modules/identity and tests/modules/coven pause tests, tests/db repository pause tests.

- **Estimate:** 3.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-61: A class-name joiner is hand-written in about nine components with four different idioms

- **Severity:** medium

**Part 1: A class-name joiner is hand-written in about nine components with four different idioms**

- **Why it matters:** Class names are joined in four different ways across components. A mistake like a stray 'false' or double space in a class affects some components but not others, and a developer cannot tell which idiom is the correct one to copy.
- **Where:**
  - `src/components/PageFrame/index.tsx:13` (`[...].filter(Boolean).join(' ')`), `src/components/PageHeader/index.tsx` (a local `classes()` function), `src/components/PageColumn/index.tsx:7` (`className ? \`page-column ${className}\` : 'page-column'`), `src/components/Notice/index.tsx:26`, `src/components/JarLine/index.tsx:26`(template string with two nested ternaries),`src/components/ProviderMark/unavailable-note.tsx:11`, plus `PageWithNav`, `PageNav`, `MenuButton`, `Modal/modal.tsx`(same idea). About 25 more files under`src/components/`use`.filter(Boolean).join(' ')` (`Field/shell.tsx`, `Field/form-actions.tsx`, `DataTable/index.tsx`, `CollapsibleSection`, `Combobox/entry.tsx`, `SkeletonFade`, and others). No helper exists in `src/lib/` (`classNames`, `clsx`and`cx` return nothing).
  - about six in Combobox alone (index.tsx, multi-select.tsx, select.tsx, popup.tsx) and the same expression in many other folders of `src/components`; count the full list at fix time with `grep -rn "filter(Boolean).join(' ')" src/components`.
- **Shared piece:** `cx(...parts: (string | false | null | undefined)[]): string` in `src/lib/class-names.ts`.
- **Guard:** an oxlint `no-restricted-syntax` rule or a `tests/guards/` grep against `.filter(Boolean).join(' ')` in `src/components/`.
- **Fix:** add helper and replace mechanically, file by file; no behaviour change. Prefer doing it in one commit, as the diff is wide but trivial.
- **Tests covering the callers:** `tests/components/` for each touched folder; a unit test for the helper.

**Part 2: Class names joined by hand with `.filter(Boolean).join(' ')`**

- **Why it matters:** About thirty-odd components join class names by hand with the same expression. Any change, such as dropping empty strings or de-duplicating, must be repeated in each, so styling glitches appear in the components left behind.
- **Shared piece:** `cx(...parts)` in `src/lib/cx.ts`. No class-join helper exists.
- **Guard:** an oxlint `no-restricted-syntax` selector on `.filter(Boolean).join(' ')`.
- **Fix:** add `cx`; codemod the sites mechanically.
- **Tests covering the callers:** component tests across `tests/components`.

- **Estimate:** 4 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-62: small e2e helpers copied across specs: `authorOf` x3, `openFilters`/`applyFilters` x2, `grimoireList` x2

- **Severity:** medium
- **Why it matters:** The copied e2e helpers have already drifted: one 'apply filters' waits for the page to navigate and the other does not. The admin spec can race the navigation and fail at random, so a developer is told the app is broken when it is not.
- **Where:**
  - `authorOf` (signs a keeper in on a throwaway page and returns the id): `tests/e2e/share-card.spec.ts:27-37`, `compendium-entry.spec.ts:15-25`, `forced-colours.spec.ts:120-127`. Identical.
  - `openFilters`: `tests/e2e/admin-compendium.spec.ts:32-40` and `stories/coven-ingredients.ts:345-353`; identical bodies. `applyFilters` differs (`admin-compendium.spec.ts:27` clicks only; `coven-ingredients.ts:355` waits for the URL change), which is drift: the admin copy can race the navigation.
  - `grimoireList`: `stories/01-viewer.spec.ts:28`, `stories/06-grimoire.spec.ts:43`.
  - `scanBothThemes` exists in `axe.ts` and `axe-sweep.ts` with different signatures and jobs (one asserts, one collects findings); same name only, so rejected below.
  - `settled`/`visit` have the same names but do different jobs (rejected below).
- **Shared piece:** `authorOf` into `tests/e2e/session.ts` as `signInKeeperOnSidePage(browser, baseURL, email)`; `openFilters`/`applyFilters` from `stories/coven-ingredients.ts` imported by `admin-compendium.spec.ts` (or moved to `tests/e2e/filters.ts`); `grimoireList` into `stories/` shared file.
- **Guard:** none practical.
- **Fix:** move and import; for `applyFilters`, adopt the waiting version in the admin spec (check the admin page changes its URL on apply).
- **Tests covering the callers:** the listed specs.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-63: Trim, then empty to undefined or null, written inline in eight services

- **Severity:** medium
- **Why it matters:** Services each trim text and turn blanks into nothing in their own way, and the repository trims again. A blank invite note or label might be stored as an empty string in one place and null in another, confusing keepers' lists and searches.
- **Where:**
  - `src/modules/coven/services/members.ts:22`, `vocabulary/services/curated-lists.ts:25`, `identity/services/invitation-cards.ts:57,67,95`, `identity/services/user-list.ts:39`, `identity/services/admin-changes.ts:29`, `identity/services/admin-invitations.ts:119`, `coven/services/member-pause.ts:56`. The repository trims again at `grimoire.ts:57`, `help.ts:108`, `ingredients.ts:763`, `references.ts:99` (a second trim after the service's).
- **Shared piece:** `blankToUndefined(text)` and `blankToNull(text)` in `src/lib/` (check `src/lib/text.ts` and `src/lib/validation.ts` for an existing helper first).
- **Guard:** none practical.
- **Fix:** add or reuse the helper in the service copies. The repository's second trim is a separate, smaller cleanup: services own normalising, the repository should receive clean values.
- **Tests covering the callers:** the specs for each service listed.

- **Extra copies and changes found when merging:**

`identity/services/invitation-cards.ts:525,535,563`, `privilege-changes.ts:140-144`, `user-list.ts:649`, `admin-invitations.ts` `siteFilter`, `admin-changes.ts` `adminDeclaration` (`admin-invitations.ts` calls `adminDeclaration(note).note ?? null` only to trim), `support/services/redact-path.ts` (`path?.trim() ?? ''`), `support/services/timeouts.ts` (`typeof note === 'string' ? note.trim() : ''`).

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-64: Value-to-label lookups with a fallback, written eleven times

- **Severity:** medium
- **Why it matters:** Eleven files look up a label for a stored value with their own fallback. If a role or provider is renamed or added, some screens show the new label and others fall back to the raw code, such as 'member', to a keeper or steward.
- **Where:**
  - `SupportRequests/index.tsx:41-42` (`labelOf`)
  - `SupportRequestByLink/index.tsx:159-160`
  - `SupportList/index.tsx:22-23` (`labelOfAbout`)
  - `StockDialog/batch.ts:12-13` and `StockDialog/form.tsx:223-224` (by `variantId`, fallback `''`)
  - `UserDetail/roles.ts:9-10`
  - `UserList/roles.ts:22-23` (`roleLabel`)
  - `UserList/marks.tsx:13-14` (`providerLabel`)
  - Outside: `IngredientForm/options.ts:21-22`, `PrivilegeLedger/privileges.ts:16-17`, `IngredientEntry/back-link.tsx:60`.
- **Shared piece:** `labelOf(options: readonly {value; label}[], value: string): string` in `src/lib/options.ts` (or beside `Field/types` `SelectOption`). `SupportRequests/index.tsx:41` already is that function with a local name; promote it. Search first: `IngredientForm/options.ts` is the same function, so use it as the starting point.
- **Guard:** none practical; the lookups differ by key name. A review note in `.claude/rules/components.md` is enough.
- **Fix:** move one copy to `src/lib/`, replace the `value`-keyed copies; leave the `variantId` ones, which key differently, or take a key function.
- **Tests covering the callers:** `tests/components/SupportRequests`, `SupportList`, `UserList`, `UserDetail`, `IngredientForm`, `PrivilegeLedger`.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-65: "No such compendium entry" and the curator / uuid guard / NotFound sequence repeated

- **Severity:** medium
- **Why it matters:** The 'No such compendium entry' check is repeated at about thirteen throw sites. If one drops the curator or id check, a keeper or user can get a different error or message for the same missing entry, or reach an unchecked path.
- **Where:**
  - `src/modules/ingredients/services/compendium.ts` (about 13 throw sites in `updateCompendiumEntry`, `promoteCompendiumFolkName`, `setCompendiumEntryReviewed`, `setCompendiumEntryShown`, `deleteCompendiumEntry`, `countCompendiumEntryUsers`, and the `softDeleteIngredient` argument); `services/compendium-sourcing.ts:850-866`; `services/cupboard-entries.ts` `NO_ENTRY`; `services/workspace-ingredients.ts` `'No such ingredient in this coven'` five times (`updateWorkspaceIngredient`, `promoteWorkspaceFolkName` twice, `getWorkspaceIngredient`, `deleteWorkspaceIngredient`); `services/ingredient-detail.ts` `'No such ingredient'` twice and `compendium.ts` once; `graphql/cupboard-entries.ts` `nodeOf`; `services/share-card.ts` once.
- **Drift:** `getWorkspaceIngredient` (`workspace-ingredients.ts`) has no `RowId.safeParse` guard, while `updateWorkspaceIngredient`, `promoteWorkspaceFolkName` and `readableJar` in `stock.ts` all have one. A non-uuid id there reaches the driver and returns a driver error, not NotFound.
- **Shared piece:** module-level message constants (`NO_COMPENDIUM_ENTRY`, `NO_COVEN_INGREDIENT`) in `services/messages.ts`, and one `readableId(id, message)` helper that applies the uuid guard (extends D-43, which is the repo-wide `RowId` guard).
- **Guard:** none practical; a grep test on repeated string literals would be noise.
- **Fix:** add constants, replace literals, add the missing guard to `getWorkspaceIngredient` with a regression test.
- **Tests covering the callers:** `tests/modules/ingredients/` compendium, workspace-ingredients and stock specs.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-66: Readable-spell parent check repeated in `spells.ts` and `workings.ts`; `grimoire.ts` ANDs `notSoftDeleted(spells)` after `readableSpells`

- **Severity:** medium
- **Why it matters:** The 'can this member read the parent spell' check is copied across spell and working code, with one query adding an extra soft-delete filter. If the rule changes, one path could expose a private spell's steps or workings to a member who should not see them.
- Extra copies of D-47 specific to the spell tables.
- **Where:**
  - `existsIn(spells, and(eq(spells.id, X.spellId), readableSpells(membership)))`: `spells.ts:43`, `spells.ts:107`, `spells.ts:131`.
  - `existsIn(spells, and(eq(spells.id, spellSteps.spellId), scopedTo(membership, spells)))`: `spells.ts:197` (the coven-only variant, `inCovenSpell`).
  - `existsIn(spellWorkings, and(eq(spellWorkings.id, X.workingId), readableWorkings(membership)))`: `workings.ts:48`, `workings.ts:126`, `workings.ts:145`.
  - Redundant term: `grimoire.ts:192` and `grimoire.ts:231` write `and(readableSpells(membership), notSoftDeleted(spells), ...)`; `readableSpells` (`spells.ts:28-34`) already includes `notSoftDeleted(spells)`.
- **Shared piece:** `inReadableSpell(membership, spellIdColumn)` in `spells.ts` and `inReadableWorking(membership, workingIdColumn)` in `workings.ts`. Drop the redundant term in `grimoire.ts`.
- **Guard:** none practical.
- **Fix:** add the two helpers, swap six call sites, delete two redundant terms.
- **Tests covering the callers:** `tests/db/repository/spells*.test.ts`, `workings*.test.ts`, `grimoire*.test.ts`, and the authorisation tests in `tests/modules/grimoire/**` that assert a direct id is refused.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-67: Vocabulary admin services repeat the create and delete sequences

- **Severity:** medium

**Part 1: Vocabulary admin services repeat the create and delete sequences**

- **Why it matters:** Seven vocabulary services each write their own create and delete steps. If one forgets to refuse a slug clash, check the 'still in use' rule, or refresh the compendium cache, a keeper sees a raw database error or stale lists after a change.
- **Where:**
  - create in `src/modules/vocabulary/services/deities.ts`, `deity-traditions.ts`, `astrology.ts`, `categories.ts`, `category-groups.ts`, `ingredient-form-groups.ts`, `ingredient-form-values.ts` (`assertCurator`, `parseInput`, `slugify`, `withAudit` insert, `.catch(refuseSlugCollision)`, `expireCompendium()`); delete in the same seven (`liveRow`, `refuseWhileHeld`, `softDeleteByIds`, `if (!row) throw new NotFound`, `expireCompendium()`). `curated-writes.ts` already shares update, group move and delete-group, so create and delete are the two sequences left outside it.
  - `getAstrologyValueBySlug`, `getCategoryBySlug`, `getCategoryGroupBySlug`, `getDeityBySlug`, `getDeityTraditionBySlug`, `getIngredientFormGroupBySlug`, `getIngredientFormValueBySlug` under src/modules/vocabulary/services/; each is `findOneBySlug` then `throw new NotFound('No such X')`. `liveRow` in curated-writes.ts is the by-id twin.
- **Shared piece:** `createCurated` and `deleteCurated` beside `updateGroup` and `deleteGroup` in `curated-writes.ts`, configured by the same vocabulary descriptor.
- **Guard:** none practical.
- **Fix:** add the two helpers, move the seven services onto them one at a time. `ingredient-form-values.ts` has its own variant-form index check (D-158) and may stay partly bespoke.
- **Tests covering the callers:** `tests/modules/vocabulary/` for each vocabulary, plus the keeper vocabulary stories.

**Part 2: Extra copies of D-67: seven vocabulary by-slug getters**

- **Why it matters:** Seven getters each look up a vocabulary item by slug and throw 'not found' in their own way. If the lookup or error wording changes, the curator pages for deities, categories and forms behave differently, with some showing a blank page instead of a not-found.
- **Shared piece:** `bySlug(table, label)` beside `liveRow` in curated-writes.ts.
- **Guard:** none practical.
- **Fix:** replace seven bodies with one-line calls; callers are src/app/(shell)/curator/value-kinds.ts and group-page.tsx only.
- **Tests covering the callers:** the two test files per getter under tests/modules/vocabulary.

- **Estimate:** 4.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-68: Four hand-built hover-tip wrappers on `useTip` in UserList

- **Severity:** medium
- **Why it matters:** Four hover-tip wrappers each repeat the show/hide handlers, accessibility attributes and bubble. If a tip bug is fixed, such as flicker or missing aria text, it is fixed in one user-list tooltip and left in the others for a keeper using the screen.
- **Where:**
  - `src/components/UserList/hint.tsx:9-33`
  - `src/components/UserList/history-link.tsx:11-41`
  - `src/components/UserList/locked-control.tsx:16-63`
  - `src/components/UserList/primary-admin-mark.tsx:10-43`
  - Same shape elsewhere: `EntryMarks/tip-mark.tsx`, `LastEdit/last-edit-tip.tsx`, `HelpTerm/index.tsx`, `FacetPanel/choice-chip.tsx`, `InfoTip/index.tsx` (Elsewhere).
- **Shared piece:** each copy repeats the `useTip()` destructure, an anchor `span` with `onMouseEnter={showSoon}` and `onMouseLeave={hideSoon}`, and a bubble `span` with `is-open`, `aria-hidden` and `style={bubbleStyle}`. Only the trigger element and the bubble class differ. Extract a `TipAnchor` render-prop component beside `InfoTip/use-tip.ts` (`<TipAnchor className bubbleClass role bubble={...}>{({show, hide}) => trigger}</TipAnchor>`), or give `IconTip` a variant. `Hint` becomes the no-focus case, `HistoryLink` and `PrimaryAdminMark` the focus case. The two `user-list__*-tip` bubble classes in `UserList/*.scss` collapse into one.
- **Guard:** none practical; a test that rejects `useTip(` outside `InfoTip/` would be mechanical (`tests/guards/`) once the migration is done, and is the recommended guard.
- **Fix:** add `TipAnchor`, port the four UserList files, then the four outside it. Risk: the tip placement and the `role="alert"` re-keying in `LockedControl` must survive, so keep that as a prop.
- **Tests covering the callers:** `tests/components/UserList/*`, `tests/components/InfoTip/*`, `tests/e2e/` specs for keeper users.

- **Estimate:** 4 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-69: AdminCards and AdminInvitations small duplicates and hard-coded constants

- **Severity:** medium

**Part 1: AdminCards and AdminInvitations small duplicates and hard-coded constants**

- **Why it matters:** Admin card and invitation screens repeat constants and a Yes/No mark. Where a copy drifts, the skeleton shows a different filter than the page, or a keeper sees words where the table rule requires a check or cross, so the screens look inconsistent.
- **Where:**
  - AdminCards/attempts.tsx:70-115 (hand-rolled cursor paging); AdminCards/skeleton.tsx:46-53,65 (hard-codes the empty filter although `NO_CARDS_FILTER` and `NO_ARRIVALS_FILTER` exist in href.ts); AdminCards/batches.ts:4 (re-exports `batchName`); AdminInvitations/index.tsx:31 and skeleton.tsx:22 (local `NO_FILTER` twice); Beta Yes/No mark at AdminInvitations/index.tsx:89-94 and arrivals.tsx:72-77 (the project's rule is a check or cross mark in tables); same hint at mint-form.tsx:89 and 161; repeated `failure.field?.name ===` at mint-form.tsx:96-101; day maths at mint-form.tsx:49-53; AdminNav/skeleton.tsx `panels()` repeating route strings, and `SUPPORT_HREF` (AdminNav/index.tsx:11) beside `ADMIN_ASSIGNED_PATH` (AccountMenu/panel.tsx:17)
  - `src/components/AdminCards/filter.tsx:48-70` (`day`, `monthOf`, `MINTED_PICKS`, `EXPIRES_PICKS`). Check `src/lib/` for existing date helpers (`grep -n "monthOf\|startOfDay" src/lib`) before extracting; other filters (`SupportRequests`, `PrivilegeLedger`) may carry similar pick lists.
  - `AdminCards/minted.tsx:~90-100` uses `<button disabled aria-busy>` with a text swap instead of `BusyButton`. (`MenuButton`, `SupportRequests/detail.tsx:182` and the AddIcon button are special-purpose and not findings.)
- **Shared piece:** use the existing `NO_*_FILTER` constants; a `YesNoMark` shared with other tables if one exists (check `src/components/` for the table mark); a `fieldError(failure, name)` helper; the route constants from `lib/page-routes` for the support path.
- **Guard:** none practical.
- **Fix:** one small PR per folder; none changes behaviour.
- **Tests covering the callers:** tests/components/AdminCards, AdminInvitations, AdminNav.

**Part 2: AdminCards/filter re-implements date helpers and pick lists**

- **Why it matters:** The admin cards filter has its own date helpers and pick lists. If another keeper filter needs the same month-and-day logic, it will be copied again, and a date-boundary bug (month ends, time zones) will have to be fixed in each copy.
- **Shared piece:** `src/lib/date-picks.ts` if a second consumer exists; otherwise leave.
- **Guard:** none practical.
- **Fix:** move helpers to `src/lib/` and import. Risk: none beyond import paths.
- **Tests covering the callers:** `tests/components/AdminCards/`.

**Part 3: AdminCards/minted hand-rolls a busy button**

- **Why it matters:** The minted-card button is hand-built with disabled and aria-busy rather than the shared busy button. A keeper may get different spinner, double-click protection or screen reader wording than on other buttons, and fixes to the shared button skip it.
- **Shared piece:** `BusyButton`.
- **Guard:** none practical.
- **Fix:** swap in `BusyButton`.
- **Tests covering the callers:** `tests/components/AdminCards/`.

- **Estimate:** 3.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-70: Correspondence columns declared three times

- **Severity:** medium

**Part 1: Correspondence columns declared three times**

- **Why it matters:** The four correspondence columns are declared in three tables. If one table gets a new correspondence or a changed type, ingredients, variants and coven entries disagree, and the keeper's data silently loses or mistypes that field in one of them.
- **Where:**
  - `src/modules/ingredients/schema/ingredients.ts:470-474`; `schema/ingredient-variants.ts:384-387`; `schema/workspace-compendium-entries.ts:986-989` (`elements`, `celestialBodies`, `zodiacSigns`, `colors`).
  - `graphql/ingredient.ts` `IngredientRef` (1246-1249) and `IngredientVariantRef` (1202-1205); `graphql/cupboard-entries.ts` `CupboardEntryRef` (441-444) and `CupboardEntryInputRef` (506-509); `graphql/ingredient-input.ts` `IngredientVariantInput` (931-934) and `ingredientInputFields` (965-969); in services `ingredient-rows.ts` `ingredientColumns`, `PickedVariant`, `writeVariant`'s column list (3454-3475) and `cupboard-entries.ts` `ownValuesOf` and `asPicked`.
- **Shared piece:** `correspondenceColumns()` in `src/modules/ingredients/schema/` (or `src/db/schema-parts`).
- **Guard:** catalogue-introspection tests already cover column shape; no new guard.
- **Fix:** spread the helper in all three tables. Generated SQL must not change: confirm with `npm run db:generate` showing no migration.
- **Tests covering the callers:** `tests/db/` schema tests.

**Part 2: Correspondence field list exposed or typed in five more places (extra copies of D-70)**

- **Why it matters:** The correspondence field list is spelled out in GraphQL, services and input types. Adding one correspondence means editing each place; a missed one is accepted in a form but dropped on save, or returned by one query but not another.
- **Shared piece:** `correspondenceFields(t, {nullable})` for GraphQL objects and `CORRESPONDENCE_KEYS` plus a `pickCorrespondence(row)` for services; pair with the schema-column helper in D-70.
- **Guard:** none practical.
- **Fix:** do with D-70 so the column, validation, GraphQL and service lists share one source.
- **Tests covering the callers:** ingredient write tests and the SDL snapshot.

- **Estimate:** 3.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-71: Delete and remove write hooks repeat one mutation shape

- **Severity:** medium

**Part 1: Delete and remove write hooks repeat one mutation shape**

- **Why it matters:** Delete and remove hooks each hand-write the error and pending handling. A fix, such as showing the refusal message or stopping a double submit, reaches one button and not the rest, so a steward can click Delete twice or see a generic failure.
- **Where:**
  - `IngredientEntry/delete-entry.tsx` (`useDeleteEntry`), `IngredientEntry/cupboard-writes.tsx` (`useCupboardWrites`, ~105-146), `SpellRecipe/delete-spell.tsx` (`useDeleteSpell`, ~27-47), `SpellRecipe/duplicate-spell.tsx:44`, `TermsAgreement/index.tsx:56`, `IngredientForm/index.tsx:677`
  - `src/components/IngredientEntry/cupboard-writes.tsx:112-140` (remove, makeOurs), `src/components/IngredientEntry/delete-entry.tsx:41-67`. Each builds `useMutation({ mutationFn: graphqlRequest(...), onSuccess: navigate-or-refresh, onError: onSettle(); onRefused(readGraphqlFailure(error).alert ?? GENERIC_FAILURE) })`, and each reports `pending: x.isPending || x.isSuccess`.
- **What repeats:** `useMutation`, `onError: { settle/close; onRefused(readGraphqlFailure(error).alert ?? GENERIC_FAILURE) }`, and `pending: x.isPending || x.isSuccess`.
- **Shared piece:** `useRefusableMutation({ request, onDone, onRefused })` returning `{ run, pending }`, next to `saveRequest` in `src/lib/graphql-client.ts`.
- **Guard:** none practical.
- **Fix:** extract from `useDeleteEntry`, port the rest. Folds in D-14.
- **Tests covering the callers:** `tests/components/IngredientEntry/`, `tests/components/SpellRecipe/`, delete-entry and delete-spell e2e specs.

**Part 2: Delete/remove mutation hooks in IngredientEntry repeat the same `onSuccess`/`onError` shape (extra copies of D-29)**

- **Why it matters:** Remove, make-ours and delete on an ingredient entry each repeat the same success and error handling. If one forgets to clear its busy state on failure, the steward's button stays stuck, with no message, while the others recover.
- **Shared piece:** the same hook D-29 proposes; the local part is a `useConfirmedWrite({ document, variables, leaveTo, onSettle, onRefused })` returning `CupboardWrite`.
- **Guard:** see D-29.
- **Fix:** fold the three mutations into one helper in `IngredientEntry/`; the types `CupboardWritesOptions` and `DeleteEntryOptions` share `onSettle`/`onRefused`/`workspaceId`.
- **Tests covering the callers:** IngredientEntry component tests, e2e specs for Delete Ingredient and Remove from Cupboard.

- **Estimate:** 3.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-72: A callback-ref merge written twice

- **Severity:** medium

**Part 1: A callback-ref merge written twice**

- **Why it matters:** Two components each copy the same few lines that pass a ref to both the component and a caller. A fix for a ref bug, such as React 19 cleanup behaviour, reaches only one, so focus or positioning breaks in either the menu or the modal button.
- **Where:**
  - `src/components/MenuButton/index.tsx:211-215` and `src/components/Modal/modal-button.tsx:32-36` (`if (typeof ref === 'function') ref(node); else if (ref) ref.current = node;`).
  - `src/components/IngredientEntry/own-actions.tsx:21-31`
  - `src/components/IngredientEntry/cupboard-actions.tsx:110-120`
  - `src/components/SpellRecipe/more-menu.tsx:32-40`
  - `src/components/ConfirmedAction/index.tsx:~50-58`
  - `src/components/AddIcon/index.tsx:~80-90`
  - `src/components/SignInMethods/provider-row.tsx:~30-38`
  - Each makes a `useCallback` that stores the node in its own `useRef` and then calls `anchorRef(node)`. The first three also each build `useClickFeedback({ name: \`More for ${name}\` })` for the same "More" menu.
- **Shared piece:** `setRef(ref, node)` (or `mergeRefs`) in `src/lib/` (React 19 permits a cleanup return, so write it as a plain function for both).
- **Guard:** none practical.
- **Fix:** add helper; replace both. Estimate small.
- **Tests covering the callers:** `tests/components/MenuButton/`, `tests/components/Modal/`.

**Part 2: Merging a `useClickFeedback` anchor ref with a second ref is written out in six components**

- **Why it matters:** The callback-ref merge is written twice. A bug fix, such as handling a null ref, lands in one copy and leaves the other component dropping its ref, which breaks focus or measurement for that component only.
- **Shared piece:** `useClickFeedback` already owns `anchorRef` (`ClickFeedback/index.tsx:88`); let it take an optional `ref` to also fill (`useClickFeedback({ name, ref })`), and add `useMoreFeedback(name)` for the three menus, or put the ref in `MoreMenu` itself.
- **Guard:** none practical.
- **Fix:** extend the hook, delete the six callbacks. Risk: ref identity must stay stable so the control does not remount its tip.
- **Tests covering the callers:** `tests/components/ClickFeedback/`, IngredientEntry, SpellRecipe and AddIcon component tests.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-73: Help article title row and page head repeated across four Help pages and their skeletons

- **Severity:** medium

**Part 1: Help article title row and page head repeated across four Help pages and their skeletons**

- **Why it matters:** The Help title row and header are rebuilt in four pages and their skeletons. A change to the heading or edit link lands in some pages, so a keeper sees the edit link on one article and not another, and skeletons jump when the page loads.
- **Where:**
  - `HelpArticleView/index.tsx`, `HelpGlossary/index.tsx`, `HelpIndex/index.tsx` (FAQ entry) each build `help-article__title` (h2 plus `EditLink`); the same row without the link in `HelpIndex/skeleton.tsx`. `<PageHeader title="Help" /><HelpSearchForm />` is repeated in `HelpArticleView`, `HelpGlossary`, `HelpIndex`, `HelpSearchResults` and in each skeleton.
  - `src/app/(public)/help/[slug]/page.tsx:38-45`
  - `src/app/(public)/help/[slug]/[child]/page.tsx:39-45`
  - `src/app/(shell)/help/staff/[slug]/page.tsx:24-32`
  - `src/app/(shell)/help/staff/[slug]/[child]/page.tsx:29-36`
  - Each writes `terms={await readGlossaryTerms()}`, `editHref={(await helpViewerOffers()).edit ? keeperHelpEditPath(found.id) : undefined}`, `steps={guideSteps(linkTo(parent), parent.children.map(linkTo), helpPath(found))}`, `subpages={...map(linkTo)}`.
  - The public pair also writes the metadata `{ title, description: linkTo(found).summary ?? undefined, alternates: { canonical: siteUrl(helpPath(found)) } }` twice.
  - `topLevel` and `subPage` run once in `generateMetadata` and again in the page, with no `cache()` around them (check `readHelpArticle` first; if it is not cached, this is a second read per request).
- **Shared piece:** `HelpArticleTitle({ title, editHref })` and `HelpPageHead` in a `HelpChrome` folder or `HelpArticleView/`.
- **Guard:** none practical.
- **Fix:** extract both, replace six call sites.
- **Tests covering the callers:** tests for the four Help components.

**Part 2: Help article pages repeat the same prop block four times**

- **Why it matters:** Four help pages repeat the same block of props, including the keeper edit link and glossary. A change to one page, say adding steps or fixing the canonical link, leaves the staff or child pages different from the public ones for readers and search engines.
- **Shared piece:** `helpArticleProps(found, parent?)` (async) in `src/lib/help-pages.ts`, and `helpArticleMetadata(found)` beside it; read the article through a `cache()`-wrapped function.
- **Guard:** none practical.
- **Fix:** the helper returns the shared props; each page spreads it. Keep staff vs public differences (robots, base path) as arguments.
- **Tests covering the callers:** `tests/app/(public)/help/*`, `tests/app/(shell)/help/*`.

- **Estimate:** 2.75 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-74: invitation-flow helpers duplicated between `workspace-invitation.spec.ts` and `stories/01-invitations.spec.ts`; Mailpit lookup duplicated again

- **Severity:** medium
- **Why it matters:** Invitation e2e helpers are copied between two specs, and one re-implements the Mailpit lookup. When the invite dialog or email changes, one spec is updated and the other breaks, so a developer chases a failure that is only a stale test copy.
- **Where:**
  - `mailedInvitePath`: `tests/e2e/workspace-invitation.spec.ts:51-56`, `tests/e2e/stories/01-invitations.spec.ts:48-54` (identical but for the error text).
  - `ownerInvites`: `workspace-invitation.spec.ts:58-68`, `stories/01-invitations.spec.ts:144-158` (same dialog steps; the story version takes a role and checks the pending row).
  - `refusalAt`: `workspace-invitation.spec.ts:71-80`, `stories/01-invitations.spec.ts:187-193` (same steps; first adds a heading check and a sideways-scroll check).
  - `messagesTo` in `stories/01-invitations.spec.ts:56-64` re-implements the `MAILPIT_URL` check and search that `tests/e2e/mailpit.ts` (`mailpitUrl`, `get`) already holds.
- **Shared piece:** `mailedInvitePath` and a `countMessagesTo` go in `tests/e2e/mailpit.ts`; the invite-dialog steps go in a shared `tests/e2e/invitations.ts` (or `stories/accounts-setup.ts` if kept story-local).
- **Guard:** none practical.
- **Fix:** move and import; keep the extra assertions of each `refusalAt` by passing a flag or leaving the extras at the call site.
- **Tests covering the callers:** both specs.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-75: About 59 hand-written empty-id early returns in the repository

- **Severity:** medium
- **Why it matters:** About 59 empty-list early returns each return a different shape ([], a Map or undefined). A caller expecting one shape can crash or mis-handle the other, and the guards are not needed for correctness, so they add noise to every repository file.
- **Where:**
  - `if (ids.length === 0) return ...` in `src/db/repository/ingredients.ts` (8), `support.ts` (7), `spells.ts` (5), `invitations.ts` (4), `documents.ts` (4), `stock.ts` (3), `workings.ts` (3), `vocabularies.ts` (3) and about ten other files. Drizzle's `inArray(col, [])` already compiles to `false`, so the guard only saves a round trip; it is not a correctness need, and some copies return `[]`, some `new Map()`, some `undefined`.
- **Shared piece:** `findWhereIn` (or a short-circuit in `findManyByIds` in `finders.ts`) that owns the empty case and the return shape.
- **Guard:** none practical.
- **Fix:** route the plain by-id readers through `findManyByIds`; delete the guards that guard nothing. Where a guard avoids a query on a hot path (loaders), keep one in the helper.
- **Tests covering the callers:** `tests/db/` repository specs, loader specs.

- **Estimate:** 3 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-76: The click-feedback action (guard, report, run, report failure) is written eight times

- **Severity:** medium
- **Why it matters:** Eight click buttons repeat the guard, error report and busy handling. If one copy misses the double-click guard or forgets to clear busy on failure, a user clicking Sign Out, Accept or Download gets a stuck button or a duplicate request.
- **Where:**
  - `AccountMenu/sign-out-button.tsx:~17-35`, `ImpersonationBanner/index.tsx:~27-60` (near-identical to sign-out), `SignInPanel/passkey-button.tsx:20-35`, `ReceivedInvitations/accept-control.tsx:30-54`, `UserList/pause-control.tsx:58-78`, `AdminCards/download-csv.tsx:12-27`, `IngredientEntry/review-mark.tsx:38-68`, `InvitationAcceptance/index.tsx:69-84`
- **What repeats:** a pending guard, `report(undefined)`, the call, on error `setPending(false)` plus `report(failure)`, and on success staying busy until the page reloads.
- **Shared piece:** `useGuardedAction(fn)` built on `useClickFeedback`, returning `{ run, pending, feedback, anchorRef }`.
- **Guard:** none practical.
- **Fix:** extract from `sign-out-button.tsx`, port the near-identical `ImpersonationBanner` first. Fold D-14's `failureMessage` in.
- **Tests covering the callers:** `tests/components/` for each folder named.

- **Estimate:** 4 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-77: "Unwrap a loader slot or throw" written three times

- **Severity:** medium

**Part 1: "Unwrap a loader slot or throw" written three times**

- **Why it matters:** Three services unwrap a loader result in slightly different ways; one also throws a fresh Forbidden on a missing value. A change to how denial is reported could leave one path returning undefined, hiding a refused read from a keeper or member.
- **Where:**
  - `services/compendium-sourcing.ts:12-14` `answered`; `services/cupboard-entries.ts` `answered` (about 326, with `slot instanceof Forbidden`); `services/ingredient-detail.ts` `only`.
  - `keepers/(people)/users/opened-user.ts:38-44` and `:65-76` (found user, memberships, providers); `keepers/(people)/users/page.tsx:71-72`; `keepers/(people)/privilege-changes/page.tsx:60-61`; `keepers/(invitations)/card-sign-ups/page.tsx:54-61`.
- **Shared piece:** one `unwrapSlot` in `services/` (a small file next to the three) that throws a `Forbidden` or `NotFound` slot and returns the value otherwise.
- **Guard:** none practical.
- **Fix:** extract; match the three bodies first (compendium-sourcing also throws a fresh `Forbidden` on `undefined`).
- **Tests covering the callers:** sourcing, cupboard-entries and ingredient-detail tests.

**Part 2: Unwrapping a batch-loaded slot (`instanceof Error` then value) is written five times in the keepers people pages**

- **Why it matters:** Five keeper pages each unwrap a batch-loaded result by hand. If one treats an error as 'missing' and another throws, the same failed lookup shows a user detail dialog as 'not found' on one page and a crash on another for a keeper.
- **Shared piece:** a small `valueOrNull(slot)` / `valueOrThrow(slot)` in `src/lib/` (next to the batch helper that produces the slots; check `src/lib/` for its name), typed so `Error | T` narrows.
- **Guard:** none practical; the shape is two lines.
- **Fix:** 1. Add helper with unit test. 2. Replace the five sites. Could break: sites that throw versus sites that treat an error as "missing"; keep both variants.
- **Tests covering the callers:** keepers users, privilege-changes and card-sign-ups e2e specs.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-78: Members page pages by hand and builds its cursor like the users page

- **Severity:** medium

**Part 1: Members page pages by hand and builds its cursor like the users page**

- **Why it matters:** The members page builds its page cursor by hand and skips the fallback to page 1 that other lists have. A cursor copied from another list leaves a steward on an empty or wrong page, instead of being returned to the first page.
- **Where:**
  - `src/app/(shell)/coven/[slug]/(people)/members/page.tsx:103` (`after ? { after } : before ? { before } : undefined`, with `resolvePage` and an ad hoc object) and `src/app/(shell)/keepers/(people)/users/page.tsx:86-90` (`cursorOf(after, before)`). Every other numbered list calls `readNumberedPage` from `src/lib/numbered-page.ts`. The members page differs: it does not get `readNumberedPage`'s fallback to page 1 for a cursor copied from another list.
  - `src/app/(shell)/account/(tabs)/page.tsx` (`invitationsHref`, destructured `hasPreviousPage`/`startCursor`)
  - `src/app/(shell)/account/(tabs)/support/page.tsx` (`href`)
  - `src/app/(shell)/coven/[slug]/(people)/members/page.tsx:~40-50` reads its page with `resolvePage` and a hand-built `{ last: 25, before }` while `invitations/page.tsx` uses `readNumberedPage`; it also rebuilds the cursor object at `~line 100`.
- **Shared piece:** `readNumberedPage` already exists. Export one `cursorOf` from `src/lib/numbered-page.ts` and have the members page call `readNumberedPage` with its own keys.
- **Guard:** `tests/guards/pagination.test.ts` could also fail a page file that calls `resolvePage` directly.
- **Fix:** 1. Add `cursorOf`. 2. Switch the members roll to `readNumberedPage`. Could break: the members page spends `?after`/`?before` on its roll and uses other keys for the pending list; keep both key sets.
- **Tests covering the callers:** `tests/e2e` members and users specs; `tests/lib/numbered-page.test.ts`.

**Part 2: Account pages build previous/next links by hand while about 15 pages use `pagerHrefs`**

- **Why it matters:** Account and members pages build previous/next links by hand while fifteen others use the shared pager. A fix to paging, such as keeping filters in the link, reaches those fifteen but not these, so a user's Next link can drop their place.
- **Shared piece:** `pagerHrefs` and `readNumberedPage` (`src/lib/list-href.ts`, `src/lib/numbered-page.ts`). `pagerHrefs` takes a `build` callback, so the account page's `#fragment` fits.
- **Guard:** none practical.
- **Fix:** switch the three pages to the helpers. Risk: the members page shows no position or count; `readNumberedPage` needs a count function, so pass a cheap one or accept `resolvePage` there and only fix the hrefs.
- **Tests covering the callers:** `tests/app/(shell)/account/*`, `tests/app/(shell)/coven/[slug]/members.test.tsx`.

- **Extra copies and changes found when merging:**

- `keepers/(people)/users/page.tsx:86-90`, `keepers/help/page.tsx:74-90` (see D-1).

- **Estimate:** 2.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-79: Form `sending`/`failure` state and GraphQL error display is hand-written in each form

- **Severity:** medium

**Part 1: Form `sending`/`failure` state and GraphQL error display is hand-written in each form**

- **Why it matters:** Each form keeps its own sending and failure state and error display. If one form forgets to clear the failure or disable on send, a keeper can submit twice or see a stale error after retrying, while other forms behave correctly.
- **Where:**
  - `src/components/AdminCards/mint-form.tsx:1-263`
  - `src/components/AdminInvitations/invite-form.tsx`
  - `src/components/InviteDialog/index.tsx`
  - Others in A to I using the same `useState` pair; confirm with `grep -n "setSending" src/components`.
  - `SupportViewReplyForm/index.tsx` (own `sending` and `failure` state, `MESSAGE_LIMIT = 4000`, bot-trap `website` field)
  - `TermsAgreement/index.tsx` (`useMutation` then `reportLeaving(); window.location.assign(destination)`)
  - `UserList/pause-control.tsx:58-77` (`sending`, `feedback.report`, `refresh()`) against `SupportRequests/use-support-action.ts`
- **Shared piece:** `useMutation` already tracks `isPending` and `error`; `readGraphqlFailure` in `src/lib/graphql-failure.ts` already turns an error into a message. A thin `useFormSubmit(mutationFn)` returning `{submit, sending, failure}` would remove the pair. Alternatively use `mutation.isPending` and `readGraphqlFailure(mutation.error)` directly.
- **Guard:** none practical.
- **Fix:** do it together with D-4 for the two invite forms; then MintForm.
- **Tests covering the callers:** as D-4, plus `tests/components/AdminCards/`.

**Part 2: Hand-rolled send, busy and failure state in two forms that `useSupportAction` already covers**

- **Why it matters:** Three forms hand-roll sending, failure and refresh logic that a shared hook already provides. The support reply form can show a different error, skip the announcement for screen readers, or fail to refresh, unlike the other support forms.
- **Shared piece:** `useSupportAction` already does busy, failure, announce and refresh. It lives in `SupportRequests/`; move it to `src/lib/` as a general `useSend` hook and use it in the three. Related to D-56 and D-56 (reply forms).
- **Guard:** none practical.
- **Fix:** generalise the hook (rename, no support-specific text), port the three, delete their local state. The full-load redirect in `TermsAgreement` needs an `onDone` that does not refresh.
- **Tests covering the callers:** `tests/components/SupportViewReplyForm`, `TermsAgreement`, `UserList`.

- **Extra copies and changes found when merging:**

- `DocumentEditor/editor.tsx` `useState` busy and failure pairs for `writeDraft`, publish and discard.
- `DocumentMailingPanel/index.tsx` sending/failure pair.
- `CupboardEntryForm/index.tsx` autosave glue (`persist`, `saveAll`, `reload`, `SaveStatus`).

- **Estimate:** 4.75 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-80: Five components pair `useOpenModalClick` with `ModalLink` to make a link that opens a modal

- **Severity:** medium
- **Why it matters:** Five components each pair the open-modal hook with a modal link by hand. If a fix to modifier-click or keyboard behaviour is made in one, a keeper opening a user or request in a new tab still gets the old, broken behaviour from the others.
- **Where:**
  - `src/components/MemberList/member-link.tsx:1-18` and `src/components/UserList/user-link.tsx:1-18` (identical apart from the prop type name and the comment), `src/components/SupportList/index.tsx:41-50` (`RowLink`), `src/components/SupportRequests/index.tsx:59-83` (`SubjectLink`), `src/components/SupportRequests/sender-name.tsx:23-37`; also `AdminCards/index.tsx:36` and `AdminInvitations/index.tsx:96` (outside my folders) use the same hook-then-`ModalLink` pair for buttons.
- **Shared piece:** `OpenModalLink` in `src/components/Modal/` (exported from `Modal/index`), taking `href`, `heading`, optional `place`, and the link's children and `className`, calling `useOpenModalClick` inside. `MemberLink`, `UserLink` and `RowLink` become `<OpenModalLink>` at the call site and the two single-purpose files are deleted.
- **Guard:** none practical.
- **Fix:** add the component, replace the five; the server-component list pages keep working because the new component is itself a client file.
- **Tests covering the callers:** `tests/components/MemberList/`, `UserList/`, `SupportList/`, `SupportRequests/`, `tests/components/Modal/`.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-81: Two near-identical `Day` components, plus three inline copies of the ISO-day cell

- **Severity:** medium
- **Why it matters:** Two Day components and three inline date cells show the UTC date differently from the shared helper. A fix to date display, such as time zones or the time tag, reaches one list but not the others, so a keeper sees inconsistent dates.
- **Where:**
  - `src/components/MemberDetail/index.tsx:14-16` (`Day`) and `src/components/UserDetail/index.tsx:30-32` (`Day`): identical.
  - Inline `toISOString().slice(0, 10)` cell text: `src/components/MemberList/index.tsx:64-68`, `src/components/UserList/index.tsx:141-145`, `src/components/DataTable/updated-column.tsx:15`.
  - `src/lib/utc.ts:33` already has the slice behind a named function (`dayInUtc` family), and `src/components/DocumentPage/index.tsx:32` wraps it in `<time>`.
- **Shared piece:** one `Day` component (a `<time dateTime=ISO>` showing the UTC `YYYY-MM-DD`) in `src/components/LocalTime/` or a new `src/components/Day/`, built on the `src/lib/utc.ts` function. The five call sites use it.
- **Guard:** a `tests/guards/` grep failing on `toISOString().slice(0, 10)` under `src/components/`.
- **Fix:** add `Day`; delete both local copies; replace the three inline cells (`updatedColumn` keeps its own `<time>` wrapper by using `Day`). Check the output text stays identical.
- **Tests covering the callers:** `tests/components/MemberDetail/`, `UserDetail/`, `MemberList/`, `UserList/`, `DataTable/`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-82: CupboardEntryForm lists its field names in four places that can drift apart

- **Severity:** medium
- **Why it matters:** The cupboard entry form lists its field names in four places. Adding a field means finding all of them; a missed one is shown in the form but not compared for changes or saved, so a steward's edit is silently lost or unsaved warnings never fire.
- **Where:**
  - `CupboardEntryForm/index.tsx:100` `TEXT_FIELD_NAMES = ['label','description','safetyNotes']` against `CupboardEntryForm/changes.ts:15` `TEXT_FIELDS` (identical contents, and `changes.ts:25` already has `isTextField`). Used at `index.tsx:161` beside `field === 'elements'`.
  - The seven-field object spelled out in `baselineOf`, `openingValues` (index.tsx / changes.ts) and `entry-values.ts`.
  - `handBack` re-lists `'label' | 'description' | 'safetyNotes'` as a type union.
  - `placeOf` / `placeRefusal` (`index.tsx:87,150`) place a server issue on a field by hand; `src/lib/graphql-failure.ts` `placeServerIssues` does this and the other seven forms use it.
- **Shared piece:** import `TEXT_FIELDS` / `isTextField` from `changes.ts`; derive `handBack`'s union from `TextField`; build the baseline from `FIELDS`; use `placeServerIssues`.
- **Guard:** none practical.
- **Fix:** delete `TEXT_FIELD_NAMES`, call `isTextField(field)` at line 161. Then fold `placeOf` into `placeServerIssues`'s mapper. Risk: `placeRefusal` may place issues on the list fields differently; read both before swapping.
- **Tests covering the callers:** `tests/components/CupboardEntryForm/`.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-83: The user-dialog block is written out in three keeper pages

- **Severity:** medium

**Part 1: The user-dialog block is written out in three keeper pages**

- **Why it matters:** Three keeper pages each write the same user-dialog block. A change to the impersonation or paused-changes rules reaches one page, so a keeper can impersonate or edit a user from one screen while another page correctly refuses.
- **Where:**
  - `src/app/(shell)/keepers/(people)/users/page.tsx`, `src/app/(shell)/keepers/(invitations)/card-sign-ups/page.tsx`, `src/app/(shell)/keepers/support/page.tsx`. Each reads the `user` search param, looks the user up, renders `{userParam && !opened && <MissingNotice noun="user" />}`, then `<UserDialog closeHref=... opened=... canImpersonate={impersonationEnabled()} changesPaused={Boolean(adminChanges && changesLocked(adminChanges))} />`.
  - `keepers/(people)/users/page.tsx:116-147`, `keepers/(invitations)/card-sign-ups/page.tsx:86-104`, `keepers/support/page.tsx:48-68`. Same `<MissingNotice noun="user" />`, `UserDialog`, `impersonationEnabled()`, `Boolean(adminChanges && changesLocked(adminChanges))`.
- **Shared piece:** a server component `UserDialogHost` (or a `readUserDialog` read plus a thin component) in `src/app/(shell)/keepers/(people)/users/`, taking the open user and the close href.
- **Guard:** none; the repeated props are the only tell.
- **Fix:** 1. Extract the block. 2. Replace in three pages. Could break: each page has a different `closeHref`, which becomes the one parameter.
- **Tests covering the callers:** the keepers e2e specs that open the user dialog from each list.

**Part 2: The user-dialog block is written out three times (extra copies of D-83 are none; confirms D-83 and gives the exact lines)**

- **Why it matters:** The same user-dialog block appears in three keeper pages. If the impersonation or lock check changes in one, a keeper could see a dialog allowing impersonation on one page that another page, with the newer rule, would block.
- **Shared piece:** see D-83 (`UserDialogHost`). This entry only adds the line ranges.
- **Guard:** / Fix / Tests / Estimate:** as D-83; no separate hours.

- **Extra copies and changes found when merging:**

- See D-83 for the line ranges.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-84: `SignInMethods/provider-row.tsx` hand-rolls a Remove confirmation the shared confirm pieces already provide

- **Severity:** medium

**Part 1: `SignInMethods/provider-row.tsx` hand-rolls a Remove confirmation the shared confirm pieces already provide**

- **Why it matters:** The sign-in methods Remove confirmation is hand-built with its own state, while passkeys use the shared confirm. A fix to the shared confirm, like focus return or busy locking, skips this row, so a user can remove a sign-in method with weaker safeguards.
- **Where:**
  - `src/components/SignInMethods/provider-row.tsx:122-155` (a `Modal` with a destructive `BusyButton` and a Cancel in `modal__actions`, own `asking` state and a `returnTo` ref) against `src/components/Passkeys/passkey-row.tsx:28-40` which does the same job with `ConfirmedAction`. `PasswordSection/two-factor.tsx` (the leave and turn-on warning, about lines 255-285) and `LeaveWorkspaceButton/owner-exit.tsx:89-94` also hand-build a `modal__actions` pair.
  - `src/components/PendingInvitations/remove-control.tsx:1-39` and `src/components/PendingInvitations/revoke-control.tsx:1-38`. Both declare a `graphql()` document that calls `revokeInvitation(workspaceId, id) { id }` (`RemoveDeclinedInvitationDocument`, `RevokeInvitationDocument`), both wrap `ConfirmedAction` with the same `openClass`, `confirmClass`, `send` shape and an `announcement`. Only the wording differs. Both take `RevokeControlProps`, a name that is wrong for `RemoveControl`. Outside the folder, `src/components/AdminInvitations/` and `ReceivedInvitations/` use the same ConfirmedAction shape (only note, not counted).
- **Shared piece:** `ConfirmedAction` (it already takes `send`, `refusal`, `question`, `busy`). Reason it may not fit: the row needs the press's failure shown under the row control via `useClickFeedback`. If `ConfirmedAction` cannot report to a caller, add an `onRefused` prop.
- **Guard:** none practical.
- **Fix:** switch `ProviderRow` to `ConfirmedAction`; leave the two-factor warning, which has a stay/go answer pair and a leave guard, as is.
- **Tests covering the callers:** `tests/components/SignInMethods/`.

**Part 2: `RemoveControl` and `RevokeControl` are one control twice, with the same mutation document declared twice**

- **Why it matters:** Remove and Revoke invitation controls are the same control with the same mutation declared twice, and one has the wrong prop name. A fix to the confirm step or announcement is made once and the other control keeps the bug for a steward.
- **Shared piece:** one `InvitationRowControl` in `PendingInvitations/` taking a `declined` flag (or a `copy` object: label, title, question, busy, announcement), with one `RevokeInvitationDocument`. `PendingInvitations/index.tsx` picks the copy by `declinedAt`. The two files and `RevokeControlProps` go; replace it with a `InvitationControlProps`.
- **Guard:** none practical (the codegen already de-duplicates identical documents by name only; distinct operation names pass).
- **Fix:** merge into one file, one document, a copy table for the two states. Could break: the story `PendingInvitations/index.stories.tsx:87` presses by accessible name, so keep the names.
- **Tests covering the callers:** `tests/components/PendingInvitations/`, story `PendingInvitations/index.stories.tsx`.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-85: Magnifier submit button written in the search box, its idle twin and `SearchField`

- **Severity:** medium

**Part 1: Magnifier submit button written in the search box, its idle twin and `SearchField`**

- **Why it matters:** The magnifier search button is written three times, and the idle box restates every Combobox prop. A change to the search box, such as label or accessibility, can reach the live box but not the idle one that shows first, so the two look different.
- **Where:**
  - `src/components/IngredientSearch/search-box.tsx:278-285`, `IngredientSearch/idle-box.tsx:31-36`, `Field/search-field.tsx:~52-58`. The first two are the same `<button type="submit" className="combobox__indicator"><MagnifierIcon /><span className="visually-hidden">Search</span></button>`; `idle-box.tsx` also restates every other `Combobox` prop of `search-box.tsx:239-287`.
  - src/components/HelpSearchForm/index.tsx, src/components/HelpSearchForm/index.scss
- **Shared piece:** `SearchSubmit({ id? })` in `Field/` (beside `MagnifierIcon`); idle-box could render `IngredientSearchBox` with a `disabled`/`idle` flag instead of a second Combobox call, so the two cannot drift (it already imports `WORDING` from the box).
- **Guard:** none practical.
- **Fix:** add `SearchSubmit`; consider folding idle into the box. Risk: the idle box must stay free of query hooks.
- **Tests covering the callers:** `tests/components/IngredientSearch/`.

**Part 2: HelpSearchForm hand-writes the magnifier submit button**

- **Why it matters:** The help search form has a fourth hand-written copy of the magnifier submit button. If the shared search button is fixed for labels or focus, help search keeps the old behaviour, so screen reader users get a different control there.
- **Shared piece:** the shared search-submit control already counted in D-85 (this is a fourth copy).
- **Guard:** see D-85.
- **Fix:** fold into the D-85 fix.
- **Tests covering the callers:** HelpSearchForm tests; help search e2e.

- **Extra copies and changes found when merging:**

src/components/HelpSearchForm/{index.tsx,index.scss} (see D-85).

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-86: `ignoreExportsUsedInFile: true` hides about 313 exports that only their own file uses

- **Severity:** medium
- **Why it matters:** About 313 exports that nothing imports are hidden by a knip setting. They mislead developers into thinking the code is used elsewhere, keep dead email functions and icons alive, and bury real unused code among noise.
- **Where:**
  - `knip-strict.log` (full list with locations): 182 unused exports and 131 unused exported types, all with no importer in src, tests, scripts or stories; they are used only inside their defining file. Examples: `src/components/AppShell/add-href.ts` (`NEW_COVEN_INGREDIENT_PREFIX`, `NEW_INGREDIENT`, `NEW_SPELL`, `NEW_SPELL_PREFIX`, `askedSpell`, `covenIngredientValue`), `src/components/SignInPanel/icons.tsx` (5 icons), `src/components/IngredientForm/reference-panel.tsx` (9 items), `src/db/seed/demo-coven-content.ts`, `src/emails/*.ts` (18 email functions), `src/modules/*/graphql/*Ref` consts, `tests/support/card-sheet-pdf.ts`, `tests/support/story-checklist.ts`.
- **Verdict:** not dead code, only over-exported. Not a runtime cost. Three classes need care before un-exporting:
  1. codegen `*Document` consts (e.g. `OrderHelpGuidesDocument`, `CreateReferenceDocument`): graphql-codegen's client preset reads them from the file; do not un-export without checking the codegen output stays the same.
  2. `src/emails/*.ts` functions (`AccessPaused`, `VerifyEmail`, ...): check `react-email` preview and `renderParts` users before un-exporting.
  3. Pothos `*Ref` consts: may be referenced by other graphql files in later work; harmless.
- **Shared piece:** none.
- **Guard:** set `ignoreExportsUsedInFile` to `false` (or `{ "interface": true, "type": true }` to keep only the type noise out) once the list is cleared; knip then keeps it from returning.
- **Fix:** mechanical `export` removal per line of the log, minus the three classes above. Mechanical, but 313 sites: split by folder.
- **Tests covering the callers:** `npm run typecheck`, `npm run lint:unused`, plus the vitest project for each folder touched.

- **Owner's call:** Turning off `ignoreExportsUsedInFile` is its own later Z. Cleanup task.
- **Estimate:** 4 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-87: Not-blank CHECK SQL written by hand in many tables

- **Severity:** medium
- **Why it matters:** The 'not blank' database check is hand-written on many tables. A typo in one gives a column that accepts spaces-only text, so a keeper or steward can save a blank name there while other tables refuse it, and migrations drift.
- **Where:**
  - ingredients: `schema/ingredient-deities.ts:96`, `ingredient-variants.ts:392`, `ingredient-substitutes.ts:344` (null-or-not-blank form), `ingredients.ts:503`, `references.ts:800-806`, `reference-links.ts:730`; grimoire: `spell-steps` (3x), `spell-workings`, participants, `spells`. More in other modules (check `grep -rn "btrim(" src`).
- **Shared piece:** `notBlank(column)` and `notBlankIfSet(column)` in `src/db/schema-parts`.
- **Guard:** a grep test that `btrim(` appears only in `schema-parts`.
- **Fix:** helper returns the `sql` fragment; replace calls. Constraint names and SQL must stay identical, or the migration generator emits churn.
- **Tests covering the callers:** `tests/db/` constraint tests.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-88: Seven "lazy wrapper" components repeat `useLazyModule(x, true)` then `module ? <module.default {...props}/> : null`

- **Severity:** medium
- **Why it matters:** Seven lazy-wrapper components each repeat the same load-then-render logic. A change to loading behaviour, such as an error state or fallback, has to be made seven times, and a missed wrapper shows a blank gap to users while the module loads.
- **Where:**
  - `src/components/IngredientEntry/lazy-coven-choice.tsx:13-15`
  - `src/components/IngredientEntry/lazy-forms.tsx:19-37` (three wrappers in one file)
  - `src/components/StockDialog/lazy-form.tsx:13-15`
  - `src/components/CompendiumEntryForm/lazy.tsx:18`
  - (Two further wrappers draw a fallback and are not copies: `Combobox/lazy-sortable.tsx`, `IngredientForm/lazy-quick-look.tsx`.)
- **Shared piece:** `lazyComponent(module)` in `src/lib/use-lazy-module.ts` returning a component that renders null until the module arrives (taking the fallback as an option for the two that draw one).
- **Guard:** none practical.
- **Fix:** add `lazyComponent`, rewrite the five bare wrappers to one line each. The module objects (`covenChoiceModule`, `stockFormModule` ...) stay exported because openers preload them.
- **Tests covering the callers:** `tests/lib/use-lazy-module.test.ts*`, tests for StockDialog and IngredientEntry dialogs.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-89: Quantity column declared five times without the shared constants' helper

- **Severity:** medium

**Part 1: Quantity column declared five times without the shared constants' helper**

- **Why it matters:** Five quantity columns each repeat the precision and scale. If the quantity size changes, a missed column keeps the old size, so a stock or spell amount is rounded or rejected in one table but kept in another for a steward.
- **Where:**
  - `src/modules/grimoire/schema/spell-steps.ts`, `spell-working-deductions.ts`, `spell-workings.ts`; `src/modules/ingredients/schema/inventory-items.ts` (twice); each `numeric(name, { precision: QUANTITY_PRECISION, scale: QUANTITY_SCALE })`.
  - `src/modules/grimoire/services/workings.ts` `completeWorking` (`taken.toFixed(3)` and the shortfall).
- **Shared piece:** `quantityColumn(name)` beside `QUANTITY_PRECISION` in `schema/quantities.ts`.
- **Guard:** none practical.
- **Fix:** add the helper, replace five calls; no SQL change.
- **Tests covering the callers:** `tests/db/` schema tests.

**Part 2: `toFixed(3)` hard-coded where `QUANTITY_SCALE` exists**

- **Why it matters:** The working completion hard-codes three decimal places while the shared scale constant exists. If the quantity scale changes, deductions are rounded differently from stored amounts, so a steward's stock count ends up slightly wrong.
- **Shared piece:** `QUANTITY_SCALE` from `schema/quantities.ts`.
- **Guard:** none practical.
- **Fix:** replace the literal 3 with `QUANTITY_SCALE`.
- **Tests covering the callers:** workings tests.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-90: Boolean ('1') search params copied six times

- **Severity:** medium

**Part 1: Boolean ('1') search params copied six times**

- **Why it matters:** Six on/off search parameters each hand-write the '1' check. If the format changes, some filters in the compendium or coven search read the link correctly and others ignore it, so a shared filtered link shows different results for the person who opens it.
- **Where:**
  - CompendiumList/params.ts:40,49,56,105; IngredientSearch/coven-params.ts:24,31
  - `src/components/CompendiumList/params.ts:36-42` (`withoutReferences`), `:44-51` (`hidden`, differs only in `toVariable`), `:52-58` (`withoutForms`), `:101-108` (`covensNot`)
  - `src/components/IngredientSearch/coven-params.ts:21-27` (`inStock`), `:28-34` (`lowStockOnly`)
  - Each is `searchParam({ name, variable, read: (raw) => single(raw) === '1', write: (on) => (on ? '1' : undefined), toVariable: (on) => on || undefined })`.
  - Related: `FacetPanel/index.tsx:250,292` and `CompendiumList/params.ts:86` decode `'1'`/`'0'` by hand for the same switch values.
- **Shared piece:** `flagParam()` in `src/lib/search-param-table.ts` (read `single(raw) === '1'`, write `on ? '1' : undefined`, variable `on || undefined`).
- **Guard:** none practical.
- **Fix:** add `flagParam`; replace six declarations.
- **Tests covering the callers:** tests/components/CompendiumList, IngredientSearch, tests/lib/search-param-table.

**Part 2: Boolean `?flag=1` search parameter written out six times**

- **Why it matters:** The "1" boolean search-parameter check is copied six times. A change to what counts as true, such as accepting "true", applies to some pages and not others, so the same link filters differently depending on the page.
- **Shared piece:** `flagParam(name, variable = name, toVariable?)` beside `choiceParam`/`textParam`/`listParam` in `src/lib/search-param-table.ts`.
- **Guard:** none practical (a test that no table passes `read: ... === '1'` by hand is possible but low value).
- **Fix:** add `flagParam`, replace six blocks with one line each. The `hidden` entry passes its `toVariable`.
- **Tests covering the callers:** `tests/lib/search-param-table.test.ts`, `tests/components/CompendiumList/`, `tests/components/IngredientSearch/`.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-91: Invitation page and count twins repeat both scope and filter; `pendingInvitation` and `openInvitation` are near-twins

- **Severity:** medium
- **Why it matters:** Invitation list and count queries repeat their scope and filter separately. If one side changes, the page count shown to a steward ('3 pending') disagrees with the list, or a declined or expired invitation is counted but not listed.
- Extra copies of D-136. Three pairs repeat their scope and filter expressions on both sides (no shared const). The two predicate builders differ by only the declined/expiry rule.
- **Where:**
  - `invitations.ts:179-205` (site pair: `onSiteTier()` + `pendingOnSite(filter)`; this one is shared as a function)
  - `invitations.ts:224-250` (workspace pair: `scopedTo(membership, invitations)` + `openInvitation()` written twice)
  - `invitations.ts:252-279` (received pair: `onWorkspaceTier()` + `pendingInvitation(inLiveWorkspace(), heldVerifiedBySession(session))` written twice)
  - `invitations.ts:515-540` (attempt pair: `attemptsOnBatch(batchId)` + `CARD_ATTEMPT_ORDER` shared already; fine)
  - `invitations.ts:65-84` (`pendingInvitation`, `openInvitation`): both start `...which, isNull(acceptedAt), isNull(revokedAt)` and differ in the declined/expiry terms.
- **Shared piece:** for each pair a private `xScope(arg)` returning `{ scope, where }`, called by both finders. For the two predicates, `notAcceptedOrRevoked(...which)` as the shared base.
- **Guard:** none practical.
- **Fix:** add `receivedScope(session)` and `workspaceOpen(membership)` returning the tuple; replace four call sites. The predicates need no change beyond the optional base.
- **Tests covering the callers:** `tests/db/repository/invitations*.test.ts`, `tests/modules/coven/**`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-92: Curator group and value types and dialogs are near-copies

- **Severity:** medium
- **Why it matters:** The curator group and value dialogs, pages and types are near-copies. A fix to one, such as the not-found notice or the close link, is missed in the other, so a curator gets different behaviour for deity groups than for their values.
- **Where:**
  - `curator/types.ts` (`GroupRow`/`ValueGroupRow`, `OpenedGroup`/`OpenedValue`, `GroupDialogProps`/`ValueDialogProps`); `curator/group-dialog.tsx` and `curator/value-dialog.tsx` (same `RouteModal` wrapper over `GroupForm` / `GroupedValueForm`); `curator/group-page.tsx` and `curator/value-page.tsx` (same read-list-place, open-or-missing, dialog, table scaffolding).
- **Shared piece:** one generic `EntityDialog` (title, close href, form as children) in `curator/`; shared base types with the differing fields added by intersection.
- **Guard:** none practical.
- **Fix:** 1. Merge the row and opened types. 2. Replace both dialogs with one. 3. Consider one `ListPage` scaffold taking the read and the form. Could break: the two forms take different props; keep them as children.
- **Tests covering the callers:** curator vocabulary e2e specs; component tests for the dialogs if present under `tests/components/`.

- **Estimate:** 4 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-93: The formal-name label (`name (canonicalName)` and `name, canonicalName`) is formatted in five places

- **Severity:** medium
- **Why it matters:** The ingredient formal-name label is formatted in two styles across five places. A change to how the name and its formal name appear lands in some lists, so a user sees 'Rose (Rosa)' in one place and 'Rose, Rosa' in another.
- **Where:**
  - Parenthesised: `IngredientSearch/search-box.tsx:117`, `IngredientForm/suggestions.tsx:189`, `IngredientForm/duplicates.tsx:437` (`titleOf`), and outside the area first audited `src/modules/vocabulary/services/held-entries.ts:40`
  - Comma variant: `IngredientCard/card-name.ts` (`cardName`), used by CompendiumCards, CovenCards/actions, IngredientEntry/index, IngredientForm/duplicates, CompendiumList
- **Shared piece:** `src/lib/ingredient-name.ts` holding both formats. A service may import a `lib` file, so the module copy folds in.
- **Guard:** none practical.
- **Fix:** add the lib file, move `cardName` into it, replace the four parenthesised copies.
- **Tests covering the callers:** `tests/components/IngredientSearch/`, `tests/components/IngredientForm/`, `tests/modules/vocabulary/`.

- **Extra copies and changes found when merging:**

- `CovenCards/actions.tsx` `covenCardName`, which wraps `cardName`.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-94: DateField and DateRangeField duplicate the popover shell, bounds and weekday-word helper

- **Severity:** medium
- **Why it matters:** DateField and DateRangeField each copy the popover, bounds and close-and-focus logic. A bug fix such as focus return or min and max dates reaches one picker, so the other lets a keeper pick an out-of-range date or lose focus.
- **Where:**
  - `DateRangeField/index.tsx` and `DateField/index.tsx` / `DateField/calendar.tsx`: the popover panel markup and class, the `disabled` bounds array, the close-then-focus-trigger step, `usePreloadWhenIdle` / `useLazyModule` use, and the open/floating state.
  - `DateRangeField` `shortWords` against the `dayWords` pattern in `DateField/day.ts`.
  - `DateField/index.tsx` imports `'../DateField/lazy-day-picker'` through its own folder name instead of `./lazy-day-picker` (cosmetic).
- **Shared piece:** `DateField/popover.tsx` (the panel, bounds, close-and-focus) used by both; `shortWords` merged into `day.ts`.
- **Guard:** none practical.
- **Fix:** extract the popover from `DateField`, port `DateRangeField`, fix the self-import path. Risk: the range field keeps two days open at once; the shared piece takes the content as children.
- **Tests covering the callers:** `tests/components/DateField/`, `tests/components/DateRangeField/`.

- **Estimate:** 3 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-95: SignInPanel/in-dialog.test.tsx copies the password-form harness

- **Severity:** medium
- **Why it matters:** Sign-in tests copy the same mock set-up and helpers into several files. When the auth client changes, each copy must be fixed, so a developer sees failures in unrelated tests or keeps a stale mock that passes while the real flow is broken.
- **Where:**
  - harness header (auth-client mock, `./search-params` navigation mock, `assign`, `PASSWORD = 'Testwort crowns the eastern hedge'`, `press`, `field`, `type`, `afterEach` reset list) in `tests/components/SignInPanel/in-dialog.test.tsx:1-60` and `tests/components/SignInPanel/password-form.test.tsx`; `press` is also written in `SignInPanel/index.test.tsx:26`, `SignInPanel/two-factor-step.test.tsx:32`, `SignInDialog/index.test.tsx:30`.
- **Shared piece:** `tests/support/interact.tsx` already exists; add `press`, and a `tests/support/sign-in-harness.ts` for the shared auth-client mock factory (extends D-42).
- **Guard:** none practical (`vi.mock` factories must stay in the test file; a support factory is called from them).
- **Fix:** move `press`, `field`, `type` to `interact.tsx`; export `PASSWORD`; keep the `vi.mock` calls but build their bodies from a support factory.
- **Tests covering the callers:** the five SignInPanel/SignInDialog test files above.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-96: Compendium filter schema repeats two transform shapes

- **Severity:** medium

**Part 1: Compendium filter schema repeats two transform shapes**

- **Why it matters:** The compendium filter validation repeats the same transforms nine times. A mistake in one, such as a filter treating false as set, makes a stock or reference filter behave differently from its siblings, so a user's filtered list shows the wrong ingredients.
- **Where:**
  - `src/modules/ingredients/validation/compendium-filter.ts`: `.nullish().transform(only => only === true ? true : undefined)` four times (`withoutReferences`, `withoutForms`, `inStock`, `lowStockOnly`); `.enum(X).nullish().transform(v => v ?? undefined)` five times (nomenclature, sort, order, source, reviewed); `filterElements` and `filterIds` share an "empty list means no filter" transform.
  - `graphql/compendium.ts` `compendium` query args (about 273-296) and `compendiumFacets` args (312-343): `query`, `categoryArgs`, `facetArgs`, `withoutReferences`, `withoutForms`, `nomenclature`, `listing`, and the `reviewed` argument with a 3-line description, all repeated. `filterOf` in `graphql/compendium.ts:366-402` and `graphql/workspace-ingredient-list.ts:1803-1831` each destructure and rebuild the same 12-16 keys, so adding a filter means editing the args, the type and `filterOf`.
- **Shared piece:** local helpers `onlyTrue()`, `nullishEnum(values)`, `listOrNone(schema)` in the same file.
- **Guard:** none practical.
- **Fix:** replace each repeat with the helper; the parsed type must stay identical.
- **Tests covering the callers:** `tests/modules/ingredients/validation/compendium-filter.test.ts`.

**Part 2: Compendium search arguments declared twice, `filterOf` copies list every field**

- **Why it matters:** Compendium search arguments are declared twice and the filter is rebuilt key by key in two places. Adding a filter means three edits; a missed one makes the facet counts disagree with the list results, so a user sees wrong counts.
- **Shared piece:** `compendiumFilterArgs = builder.args(...)` beside `facetArgs` for the shared eight; replace `filterOf` with a rest-spread that drops only the non-filter keys (`const { workspaceId, ...filter } = args`) or, for `compendium`, pass `args` directly since the paging keys are already split off.
- **Guard:** the SDL snapshot test already pins the schema, so a changed argument shows.
- **Fix:** declare once, spread twice; check the SDL snapshot is unchanged.
- **Tests covering the callers:** the GraphQL SDL snapshot, `tests/modules/ingredients/graphql/compendium*.test.ts`.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-97: CompendiumList re-describes the filter in words beside existing builders

- **Severity:** medium

**Part 1: CompendiumList re-describes the filter in words beside existing builders**

- **Why it matters:** The compendium empty-state text rebuilds the filter sentence with its own plural ternaries beside the search sentence builder. A wording fix in one leaves the other saying something different, so a user's 'no results' message disagrees with the filter.
- **Where:**
  - CompendiumList/index.tsx:168-190 (`andNodes`, `orValues`, `joinedNames`: JSX forms of `joinAnd` and `joinList`); CompendiumList/index.tsx:192-273 (`emptyText`, with plural ternaries at 221, 226, 231, 236, 246, 255); IngredientSearch/sentence.ts (`buildSearchSentence`)
  - CompendiumList/filter.tsx:53-146 (`panelOf`, `noFacets`, `changeOf`, `heldFilter`; the field list four times), 174 and 221-225 (`JSON.stringify` comparisons), 237-245 (`pickHref`); CompendiumList/live-facets.ts:25-96 and 98-165 (7 facet fields, `{ value count }` each, plus shared variables); CompendiumList/facets.ts:49-53, 88-92, 93-97, 100-105 (`{ value, label: MAP[value], count }`)
- **Shared piece:** `joinAnd`/`joinList` from `src/lib` and `plural`; a JSX variant only if links are needed. Check whether `buildSearchSentence` can serve the compendium filter.
- **Guard:** none practical.
- **Fix:** replace ternaries with `plural()` (see D-54); move `emptyText` into its own file and reuse the sentence builder where the inputs match.
- **Tests covering the callers:** tests/components/CompendiumList, IngredientSearch.

**Part 2: CompendiumList facet field list repeated; two GraphQL documents repeat one selection set**

- **Why it matters:** A developer adding or renaming a compendium facet must edit the field list in four filter functions and two GraphQL documents; missing one makes that facet silently stop filtering, clearing or counting for visitors browsing the compendium.
- **Shared piece:** a `FACET_FIELDS` constant to drive the four filter.tsx functions; a GraphQL fragment for the facet selection; a `toFacetOptions(values, labels)` mapper.
- **Guard:** none practical.
- **Fix:** run codegen after adding the fragment; commit `src/gql/`.
- **Tests covering the callers:** tests/components/CompendiumList/*

- **Estimate:** 4.75 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-98: `box-sizing: border-box` declared 68 times with no global reset

- **Severity:** medium
- **Why it matters:** A developer writing a new component sheet who forgets box-sizing gets padded boxes that overflow their container, so a user sees misaligned or clipped layouts. The 68 repeats also hide whether any element is meant to differ.
- **Where:**
  - `grep -rn "box-sizing" src --include='*.scss'` (for example `src/scss/_frame-bar.scss:17,31`, `src/scss/_primitives.scss:141,549,615,653,663,693,746,839`, and the same across component sheets). `src/app/globals.scss` and `_layout.scss` set no reset.
- **Shared piece:** one `*, ::before, ::after { box-sizing: border-box }` in `src/app/globals.scss`, then delete the per-block declarations. Alternative if a global reset is judged too risky: keep them and say so in `claude-docs/`.
- **Guard:** stylelint `declaration-property-value-disallowed-list` for `box-sizing: border-box` after the reset lands.
- **Fix:** add the reset, delete the 68 lines mechanically, then check the three elements that must stay `content-box` (if any: search for `box-sizing: content-box`, none were seen). Risk: third-party widgets (day picker) inheriting the reset; check `DateField/calendar.scss`.
- **Tests covering the callers:** e2e and story suites for layout; accessibility specs. Owner must approve the global reset (architecture-level change).

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-99: Jar muted-stroke overrides repeated in three sheets

- **Severity:** medium
- **Why it matters:** If the muted look of a low or empty jar changes in one sheet, the shelf, the jar line and the spell builder show different jars for the same stock state, so a practitioner sees an out-of-stock jar look faded in one place and normal in another.
- **Where:**
  - `src/components/JarLine/index.scss:11-19` (`.jar-shelf__lid`, `__facet`), `src/components/SpellBuilder/index.scss:395-400` (same two selectors), `src/components/JarShelf/index.scss:154-174` (lid, facet, cork, cloth) with `--low` at `:273` and `--out` at `:302`; `src/components/SpellBuilder/panels.scss:41,45` (`.is-low`, `.is-out`).
- **Shared piece:** a mixin `jar-muted()` in `src/scss/_jar-motion.scss` (or a custom property on `.jar-shelf`) set once, applied by the three callers.
- **Guard:** none practical.
- **Fix:** compare declarations first (they were read as near-identical, not byte-identical); extract and include. Risk: specificity differs per caller.
- **Tests covering the callers:** `tests/components` for JarLine, JarShelf, SpellBuilder; spell builder e2e specs.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-100: the three `lint-*-boundary` guards repeat the probe test and the exemption-directive scanner

- **Severity:** medium
- **Why it matters:** A developer tightening the import-ban rules must fix the same exemption scanner in three guard tests; if one copy is missed, that guard can wrongly accept an unsafe import or fail on a valid exemption, letting a boundary breach merge.
- **Where:**
  - `tests/guards/lint-job-boundary.test.ts:16-40`, `lint-loader-boundary.test.ts:11-45`, `lint-db-client-boundary.test.ts:20-58`; matching probe modules `tests/support/lint-probes/{job,loader,db-client}-boundary.ts`.
  - Same `directive` regex (`/^[ \t]*\/\/[ \t]*oxlint-disable(-next-line)? no-restricted-imports\b/`) and the same "directive on line i, import on line i+1" loop, differing only in the import regex.
  - Same "bans X" test: `inject('lintedFiles')` contains the probe, `inject('lintDiagnostics').filter(code === RULE && filename === probe)` has length 1. `RULE = 'eslint(no-restricted-imports)'` is declared in each file.
- **Shared piece:** in `tests/support/lint-probes/index.ts` (exists): `exemptFilesFor(files, importRegex)` and `diagnosticsAt(probe, rule)`.
- **Guard:** none practical.
- **Fix:** move the directive regex, the loop and the diagnostics filter into `index.ts`; each guard passes its import regex and keeps its own expected set.
- **Tests covering the callers:** the three guards.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-101: the page-side GraphQL `fetch` is written four times; `graphqlFromPage` already exists

- **Severity:** medium
- **Why it matters:** The keepers' story specs already differ: one copy omits the accept header. A fix to GraphQL page requests, such as an auth or error change, reaches only some specs, so a developer sees misleading failures or false passes in browser tests.
- **Where:**
  - `tests/e2e/stories/coven-ingredients.ts:~266-285` (`graphqlFromPage`, the exported one), `tests/e2e/stories/01-invitations.spec.ts:66-85` (`sendFromPage`), `tests/e2e/stories/08-email-and-admin.spec.ts:79-97` (`sendFromPage`, no `accept` header: drifted), `tests/e2e/unverified-api.spec.ts:15-30` (`readGrimoire`).
- **Shared piece:** move `graphqlFromPage` to `tests/e2e/graphql.ts` (a harness file beside `session.ts`) and import it in all four; `stories/coven-ingredients.ts` re-exports or its importers are updated.
- **Guard:** grep-style guard: `fetch('/api/graphql'` appears once under `tests/e2e/`.
- **Fix:** replace the three local copies with the import; `readGrimoire` becomes `graphqlFromPage(page, GRIMOIRE, { id })`. The `accept` header difference in the 08 copy: confirm the server answers the same for both (it is the app's default content negotiation) before converting.
- **Tests covering the callers:** `unverified-api.spec.ts`, `stories/01-invitations.spec.ts`, `stories/08-email-and-admin.spec.ts`, specs importing `coven-ingredients.ts`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-102: Coven "not a member" refusal and member-removal sequence repeated

- **Severity:** medium
- **Why it matters:** If the not-a-member refusal or the removal steps change in one coven service, leaving and removing a member can behave differently, so a steward sees one message and a practitioner another, or the last-steward safeguard is skipped on one path.
- **Where:**
  - src/modules/coven/services/member-removal.ts (`removeMember`, `leaveWorkspace`: RowId guard, `assertNotSystemSeat`, `withAudit` + `assertNotLastOwner` + `softDeleteMembership`); src/modules/coven/services/member-role.ts (guard + `assertNotSystemSeat` + the same message); src/modules/coven/services/member-pause.ts (`STRANGER_REFUSAL`). The text `That person is not a member of this coven` appears in 3-4 places.
- **Shared piece:** one `notAMember()` error factory and a shared `removeSeat(session, membership, userId)` in `src/modules/coven/services/`.
- **Guard:** none practical.
- **Fix:** export the message as a constant from the coven services; make `leaveWorkspace` call the same inner function as `removeMember`.
- **Tests covering the callers:** tests/modules/coven member-removal, member-role, member-pause tests.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-103: "Card accepted by this user" written four ways, two as raw SQL

- **Severity:** medium
- **Why it matters:** If the rule for an accepted card changes, such as ignoring a revoked card, three of the four copies may be missed. A keeper then sees users grouped as card sign-ups in one list but not another, or a sender gets the wrong support tier.
- Same fact ("a live card invitation whose `accepted_by` is this user") in four forms. One is a raw `not exists` with an alias, one a raw `exists` with no alias, two are `selectFrom` finders. A change to what counts as an accepted card (for example excluding a revoked card) has to be made four times.
- **Where:**
  - `invitations.ts:113-116` (`noCardAcceptedBySession`, raw `not exists`, aliased `used_card`)
  - `invitations.ts:132-138` (`hasAcceptedCard`, `selectOne` with `cardKind()`)
  - `support.ts:158-163` (`senderArm`, raw `exists`)
  - `support.ts:572-583` (`findCardAcceptorIds`, `selectFrom` with `eq(kind, 'card')`)
- **Shared piece:** one predicate in `invitations.ts`, `cardAcceptedBy(userColumn)`, built with `existsIn(alias(invitations, ...), ...)`; `support.ts` imports it (the repository files already import each other: `users.ts` imports `timeoutStands` from `support.ts`). `noCardAcceptedBySession` is `not(cardAcceptedBy(...))`.
- **Guard:** none practical.
- **Fix:** write `cardAcceptedBy(column: AnyPgColumn | SQLWrapper)`, replace the two raw SQL strings, and make `findCardAcceptorIds` use `cardKind()` instead of `eq(invitations.kind, 'card')`. Check the raw `not exists` is not used because `existsIn` cannot take an aliased table with the outer `invitations` in scope; if so keep an alias.
- **Tests covering the callers:** `tests/modules/coven/**` invitation-card tests, `tests/modules/support/**` sender-group tests, `tests/db/repository/invitations*.test.ts`.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-104: Jar-row number conversion `quantityOnHand === null ? null : Number(quantityOnHand)` is repeated

- **Severity:** medium
- **Why it matters:** If stock conversion changes, for example how a missing quantity is read, one of four places keeps the old rule. A practitioner then sees a different amount or low-stock state for the same jar on the ingredient page, recipe and quick look.
- **Where:**
  - `src/app/(shell)/coven/[slug]/grimoire/[id]/recipe-supply.ts:17-19` (`jarRowsOf`, also does `lowStockThreshold`)
  - `src/app/(shell)/coven/[slug]/ingredients/page.tsx:132,135`
  - `src/app/coven-stock.ts:29`
  - `src/components/IngredientForm/quick-look.tsx:147`
- **Shared piece:** `src/app/coven-stock.ts` already maps jars; export one `numericOrNull(value)` in `src/lib/` or reuse `jarRowsOf` and have the others call it.
- **Guard:** none practical.
- **Fix:** one helper, four call sites. `quick-look.tsx` is outside the area first audited; list it for the matching audit area.
- **Tests covering the callers:** `tests/app/entry-stock.test.ts`, `tests/app/(shell)/coven/[slug]/ingredient.test.tsx`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-105: IngredientForm/duplicates `PlusChoice` re-implements AddIcon's button and glyph

- **Severity:** medium
- **Why it matters:** The duplicate-ingredient add button already drifts: its label is typed by hand rather than using the shared wording. If the Add to My Ingredients label or button states change, practitioners see inconsistent labels and screen-reader names in this one dialog.
- **Where:**
  - `IngredientForm/duplicates.tsx:~565-600` (`PlusChoice`: `add-icon` button, `data-state`, `aria-busy`, check/eye/spinner glyph, `useFade`) against `AddIcon/index.tsx:36-60` (`Glyph`) and `:158-175` (button).
- **Drift:** `duplicates.tsx:581` writes out `Add to My Ingredients: ${name}` although `AddIcon/wording.ts:5` exports `ADD = 'Add to My Ingredients'`.
- **Shared piece:** export `AddGlyph` (with an eye variant) from `AddIcon/`, and use `ADD`.
- **Guard:** none practical.
- **Fix:** export the glyph, replace `PlusChoice`'s markup. Styles for `add-icon` already exist, so the matching audit area may report the matching rules.
- **Tests covering the callers:** `tests/components/IngredientForm/`, `tests/components/AddIcon/`.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-106: Single-name forms (NameForm, RenameWorkspaceForm) copy each other

- **Severity:** medium
- **Why it matters:** A change to how form errors are shown or cleared must be made in eight or more forms; any missed one leaves a user with a stale or missing error message after a failed save, with no clear sign of what went wrong.
- **Where:**
  - `NameForm/index.tsx:1-85`
  - `RenameWorkspaceForm/index.tsx:1-102`
  - outside the area first audited (same shape, name them): `CreateWorkspaceForm/index.tsx`, `EmailForm/index.tsx`, `GroupForm`, `HelpArticleForm`
  - Each: `useMutation`, `useState` for `alert`/`fieldError`, `readGraphqlFailure(failure, ['name'])` in `onError`, `fieldDescription({ id: useId(), error })`, `FieldShell` + input + `FormActions`, `noValidate`, "A disabled submit stops a click" guard.
- **Shared piece:** a `useFormMutation({ mutationFn, fields, onSuccess })` hook in `src/lib/` or `components/Field/` returning `{ alert, fieldErrors, clear, mutation }`. `readGraphqlFailure` + the two `useState`s + `onError` are the repeated 8 lines in at least 8 components (see D-56).
- **Guard:** none practical (a lint rule on `readGraphqlFailure` inside `onError` would be noisy).
- **Fix:** add the hook, migrate NameForm and RenameWorkspaceForm first (they are the closest), others later. Risk: forms differ in when they clear the error.
- **Tests covering the callers:** tests/components/NameForm, RenameWorkspaceForm.

- **Extra copies and changes found when merging:**

Hand-written submit, busy, failure then refresh blocks that D-106's hook would replace:

- `src/components/SignedOutSupportForm/index.tsx:75-96` (try/catch around `graphqlRequest`, `setSending`, `readGraphqlFailure(error, [...])`)
- `src/components/RenameWorkspaceForm/index.tsx` (same shape)
- `src/components/ReceivedInvitations/accept-control.tsx` and `decline-control.tsx` (manual try/catch plus `feedback.report(readGraphqlFailure(error).alert)`; one-button variants, two near-identical files)
- `src/components/ReportThis/index.tsx`, `src/components/RecordWorking/complete-action.tsx`, `src/components/RecordWorking/form.tsx`

- **Estimate:** 3 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-107: "this field's server message, or undefined" repeated 8 times in 5 forms

- **Severity:** medium
- **Why it matters:** If the server's field error shape changes, any of eight copies left behind stops showing the message under its field, so a user submitting a support or card form sees a vague failure or no message with no hint what to fix.
- **Where:**
  - `src/components/RecordWorking/form.tsx:158`, `:162`, `:164`
  - `src/components/SignedOutSupportForm/index.tsx:56-57` (a local `errorFor`)
  - `src/components/AdminCards/mint-form.tsx:92`, `:96`, `:101`
  - `src/components/SupportViewReplyForm/index.tsx:35`
  - further forms Elsewhere that read `failure.field` (only those four were grepped for the exact `failure.field?.name ===` text)
- **Shared piece:** `fieldMessage(failure: Failure, name: string): string | undefined` exported beside `readGraphqlFailure` in `src/lib/graphql-failure.ts` (the `Failure` type is in `src/lib/types.ts:95`). SignedOutSupportForm's `errorFor` is already this function, closed over `failure`.
- **Guard:** a `tests/guards/` grep that fails on `.field?.name ===` in `src/components/`.
- **Fix:** add the helper, swap the 8 call sites, delete `errorFor`. No behaviour change.
- **Tests covering the callers:** `tests/components/RecordWorking/*`, `tests/components/SignedOutSupportForm/*`, `tests/components/AdminCards/*`, `tests/components/SupportViewReplyForm/*`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-108: Plain-state text fields hand-build `fieldDescription` + `FieldShell` + `<input className="input">` in four forms

- **Severity:** medium
- **Why it matters:** A fix to field labelling, error wiring or hints for text inputs must be made in four forms; a missed form leaves the input unlabelled for screen-reader users or missing its error text when someone signs in or creates a coven.
- **Where:**
  - `EmailForm/index.tsx`, `ForgotPasswordForm/index.tsx`, `CreateWorkspaceForm/index.tsx`, `Field/reason-field.tsx`.
- **Shared piece:** `TextField` is bound to react-hook-form. A `PlainTextField` (value and onChange props, error and hint) in `Field/`, which these four use and which `TextField` itself can sit on.
- **Guard:** none practical.
- **Fix:** extract from `reason-field.tsx` (the most complete), port the three forms. Risk: autocomplete, `type` and `inputMode` props must pass through.
- **Tests covering the callers:** `tests/components/EmailForm/`, `ForgotPasswordForm/`, `CreateWorkspaceForm/`, `Field/`.

- **Estimate:** 3 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-109: DocumentMailingPanel hand-writes `joinList` and a count pluralisation, twice with drifted wording

- **Severity:** medium
- **Why it matters:** The panel hand-writes the list and plural wording the shared helpers already produce. If the house style changes, such as the comma rule, a keeper sees mailing confirmations worded differently from the rest of the site, or a count like 1 days.
- **Where:**
  - `DocumentMailingPanel/index.tsx:43-46` `titlesOf`: the Oxford-comma join, identical in output to `src/lib/join-list.ts` `joinList(items, 'and')`. (For exactly two items both return `a and b`; for three or more both return `a, b, and c`.)
  - `DocumentMailingPanel/index.tsx:98` and `:122-123`: `accountCount === 1 ? 'account' : 'accounts'` and `days === 1 ? 'day' : 'days'`, written twice; the lib `plural(count, one, many)` (`src/lib/text.ts:3`) already does this.
  - `count` helper (`toLocaleString('en-GB')`) beside it.
- **Shared piece:** `joinList` and `plural` from `src/lib/`.
- **Guard:** none practical.
- **Fix:** delete `titlesOf`, replace the four ternaries with `plural`. No behaviour change.
- **Tests covering the callers:** `tests/components/DocumentMailingPanel/`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-110: AboutPillars and AboutRoles are near-copies

- **Severity:** medium

**Part 1: AboutPillars and AboutRoles are near-copies**

- **Why it matters:** If the card grid spacing, icon size or accent colours change in one About component, the other no longer matches, so a visitor to the About page sees two sections styled slightly differently, and a developer must keep four accent blocks in step.
- **Where:**
  - src/components/AboutPillars/index.scss:1-60, src/components/AboutRoles/index.scss:1-60, src/components/AboutPillars/index.tsx, src/components/AboutRoles/index.tsx
  - `tests/components/AboutPillars/index.test.tsx`, `tests/components/AboutRoles/index.test.tsx`. Both render a card list and assert heading, count and order.
- **Shared piece:** one `AboutCardGrid` (or a shared SCSS mixin) holding the `list-reset` grid with `gap: space(5)`, the `.document-page__body .X { margin-block: space(7) }` rule, the `$icon-size-large` icon box (svg 100%), the `__heading { margin: 0 }` rule and the `<span aria-hidden>{icon}</span>` markup. The four `[data-accent=...]` blocks become one Sass map loop.
- **Guard:** none today; a component-level review rule in `.claude/rules/components.md`.
- **Fix:** extract the shared grid and icon box; keep each component's content and accent map.
- **Tests covering the callers:** stories for both components; the /about e2e spec.

**Part 2: AboutPillars and AboutRoles tests are near-twins**

- **Why it matters:** A change to what both card lists must show is tested twice, so a developer edits two near-identical files and can leave one stale; a component that stops rendering a card in order may still pass because its twin test was not updated.
- **Shared piece:** one `describe.each` card-list table in a shared test, or leave if the components diverge.
- **Guard:** none practical.
- **Fix:** merge only if the components share a structure; check `src/components/AboutPillars` against `AboutRoles` first (the matching audit area may already propose a shared card).
- **Tests covering the callers:** both files.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-111: Unit compatibility rule stated in three places

- **Severity:** medium
- **Why it matters:** If the rule for which units convert changes, for example a new dimension, the three places can disagree. A practitioner could then see a recipe step accepted as measurable but fail to convert, or stock deducted for units that cannot be compared.
- **Where:**
  - `src/modules/ingredients/units/convert.ts` (`unitConvert`); `src/modules/grimoire/validation/step-unit.ts` `measurable()`; `src/modules/grimoire/services/plan-deductions.ts:138-146`.
- **Shared piece:** an exported `sameDimension(a, b)` / `isMeasurable(unit)` beside `dimensionOf` in `ingredients/schema/units.ts`, re-exported through the module index.
- **Guard:** none practical.
- **Fix:** replace the two inline checks; preserve the "count is never convertible" rule.
- **Tests covering the callers:** unit convert tests, `plan-deductions` tests, step-unit validation tests.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-112: Spell field list written five times

- **Severity:** medium
- **Why it matters:** Adding or renaming a spell field means editing five lists. If one is missed, the field saves from the form but is dropped on a copy or update, so a practitioner duplicating a spell silently loses that field.
- **Where:**
  - `src/modules/grimoire/services/spells.ts:963-1000` (`spellColumns`), `~1159-1169` (`duplicateSpell`); `validation/spell.ts` `SpellFields`; `graphql/spell.ts` `SpellInput` and `UpdateSpellInput` (same ten fields: title, intent, jarDescription, sealWaxColor, moonPhase, dayOfWeek, note, status, visibility, steps, categoryIds).
- **Shared piece:** a `SPELL_FIELDS` key list in `validation/spell.ts` that `spellColumns` and `duplicateSpell` map over; a shared field-builder in `graphql/spell.ts` taking the description text.
- **Guard:** a type-level check that the key list covers `SpellFields`.
- **Fix:** derive the column picker from the list; build the two GraphQL inputs from one function.
- **Tests covering the callers:** `tests/modules/grimoire/spells*.test.ts`, GraphQL spell mutation tests.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-113: Public-reply test `eq(supportReplies.visibility, 'public')` written three times, each with a lint disable

- **Severity:** medium
- **Why it matters:** The public-reply filter is the guard for what a support sender may see. If one of three copies is changed or mistyped, a sender could be shown an internal staff note, or a reply could be missed from the notice, with the lint warning disabled each time.
- Three copies, each carrying the same two comment lines and an `oxlint-disable-next-line`.
- **Where:**
  - `support.ts:322-325` (`findPublicSupportReplies`), `support.ts:400-403` (`findReplyAwaitingNotice`), `support.ts:554-556` (`internalNotesScope`).
- **Shared piece:** one module-level const in `support.ts`, `const publicReply = eq(supportReplies.visibility, 'public')`, with the comment and lint disable written once. Used at all three.
- **Guard:** the oxlint rule `sorrel/spell-visibility-read-in-one-place` already flags new copies (that is why the disables exist). Once the const exists, a single disable remains. No new guard.
- **Fix:** add the const; replace the three expressions. Nothing else changes.
- **Tests covering the callers:** `tests/modules/support/` reply tests; `tests/db/repository/support*.test.ts`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-114: The keepers and curator area layouts are the same file

- **Severity:** medium
- **Why it matters:** A change to the admin area header, navigation or modal scaffolding must be made in both layouts. A missed one leaves keepers and curators with different navigation or a broken route modal, and the curator type is already imported across them.
- **Where:**
  - `src/app/(shell)/keepers/layout.tsx` and `src/app/(shell)/curator/layout.tsx` differ only in names, the nav list and the support count; their index `page.tsx` files have the same shape.
- **Shared piece:** an `AdminAreaLayout({ guard, title, nav, children })` in `src/app/(shell)/` that both layouts call.
- **Guard:** none; two files.
- **Fix:** 1. Extract the layout. 2. Keep each folder's `layout.tsx` as a three-line call. Could break: the support count, which only the keepers layout reads.
- **Tests covering the callers:** the keepers and curator e2e specs, area navigation component tests.

- **Extra copies and changes found when merging:**

- `keepers/layout.tsx` and `curator/layout.tsx` share the `ContextRow` / `SectionBody` / `RouteModalProvider` scaffolding; `keepers/layout.tsx:12` already imports the curator type.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-115: `readBatches` and `readArrivals` wrap `cache()` around an object argument, which React's cache never matches, and each has one caller

- **Severity:** medium
- **Why it matters:** These two keepers' pages wrap a cache around a filter object, which never matches, so the cache does nothing while suggesting a read is shared. A developer trusts it to avoid repeat database reads, and the card list reloads every time.
- **Where:**
  - `keepers/(invitations)/invitation-cards/page.tsx:21-71` (`readBatches(session, filter: CardsFilter, after, before)`), `keepers/(invitations)/card-sign-ups/page.tsx:31-73` (`readArrivals(session, filter: ArrivalsFilter, ...)`). The curator pages say their `cache()` reads are "keyed by primitives rather than a filter object"; the help page does the same for `readAll` but not for `readSearch` (`keepers/help/page.tsx:74`, also an object key).
- **Shared piece:** none needed. Either drop `cache()` (one caller each, verified by grep: no second caller of either function) or key by primitives as the curator pages do.
- **Guard:** none practical.
- **Fix:** remove `cache()` from the one-caller reads, or pass `query`, `role`, etc. as primitives. Could break: nothing; the cache currently never hits.
- **Tests covering the callers:** keepers invitation-cards and card-sign-ups e2e specs.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-116: Three cron route handlers are the same function

- **Severity:** medium
- **Why it matters:** A change to cron authorisation, such as a header check or response code, must be repeated in three routes. A missed route could run its daily job for an unauthorised caller or fail to respond correctly, so a scheduled cleanup or mailing silently fails.
- **Where:**
  - `src/app/api/cron/document-mailing/route.ts:1-14`
  - `src/app/api/cron/provisional-cleanup/route.ts:1-12`
  - `src/app/api/cron/support-retention/route.ts:1-14`
  - Each repeats `if (!cronAuthorised(request)) return new Response(null, { status: 401 }); await start(...); return new Response(null, { status: 204 });` and a near-identical 3-line comment. Two also call `requestOrigin(request, '/')`.
- **Shared piece:** `cronRoute(job: (origin: string) => Promise<unknown>)` in `src/lib/cron-request.ts`, which returns the `GET` handler. `cronAuthorised` already lives there.
- **Guard:** `tests/guards/daily-job-starts.test.ts` and `tests/app/cron-routes.test.ts` already exist; extend the second to require every `route.ts` under `api/cron/` to export through `cronRoute`.
- **Fix:** `export const GET = cronRoute((origin) => startSupportRetention(origin))`. The provisional-cleanup job ignores the origin; do not read it for that route (keep the origin read lazy). Risk: the comments carry rule-1 reasoning; move the shared part into `cron-request.ts` and keep one line per route naming the job.
- **Tests covering the callers:** `tests/app/cron-routes.test.ts`, `tests/guards/daily-job-starts.test.ts`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-117: Account tab pages write the panel section markup seven times

- **Severity:** medium
- **Why it matters:** If the account panel heading, lede or anchor markup changes, seven sections must be edited. A missed one gives a signed-in user a tab page with a differently styled heading or a broken in-page link in the account navigation.
- **Where:**
  - `src/app/(shell)/account/(tabs)/page.tsx:52-95` (3 sections)
  - `src/app/(shell)/account/(tabs)/sign-in/page.tsx:59-130` (4 sections)
  - Each is `<section id className="page-frame__section panel" aria-labelledby><div className="header"><h2 id>...</h2><p className="lede">...</p></div>`.
  - The skeleton side already has `PanelSkeleton` (`src/components/Skeleton/panel.tsx`).
- **Shared piece:** `PanelSection` component (`src/components/PanelSection/index.tsx`) taking `id`, `title`, `lede`, `children`.
- **Guard:** a grep-based `tests/guards/` check for `page-frame__section panel` outside `PanelSection` is practical after the move.
- **Fix:** add the component, replace the seven sections. Risk: ids drive `PageNav` anchors; keep them as props.
- **Tests covering the callers:** `tests/app/(shell)/account/*`.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-118: Three "more" menus repeat the Asking state, trigger ref and alert logic

- **Severity:** medium
- **Why it matters:** If focus return or the failure alert changes in one menu, the others differ. A keyboard or screen-reader user finds that after closing a dialog from one more menu, focus is lost or an error is not announced, while another menu behaves correctly.
- **Where:**
  - `src/components/CovenCards/card-more.tsx:1-78`
  - `src/components/CompendiumCards/card-more.tsx:1-158`
  - `src/components/IngredientEntry/cupboard-actions.tsx:1-324`
- **Shared piece:** a `useAskingMenu` hook beside `MoreMenu` that owns the "which question is asked" state, returns focus to the trigger on close, and holds the failure alert. `MoreMenu`, `choicesFor`, `useCupboardWrites`, `MakeItOursDialog` and `RemoveDialog` already exist and are used; only the glue is copied.
- **Guard:** none practical.
- **Fix:** extract the glue, keep each menu's choices local. Risk: focus return order after a dialog closes.
- **Tests covering the callers:** `tests/components/CovenCards/`, `tests/components/CompendiumCards/`, `tests/components/IngredientEntry/`.

- **Extra copies and changes found when merging:**

- `CovenCards/card-more.tsx` is the third copy: Asking state, trigger ref and alert; its `close` duplicates `settle`.

- **Estimate:** 4 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-119: Navigate-to-landing-and-refresh after leaving or deleting a coven is written three times with the same comment

- **Severity:** medium
- **Why it matters:** The order of navigating then refreshing matters because a client-side replace does not re-run the layout. If one of three copies swaps it, a steward who leaves or deletes a coven sees a stale coven in the menu or a blank page.
- **Where:**
  - `src/components/LeaveWorkspaceButton/index.tsx:42-48`, `src/components/LeaveWorkspaceButton/owner-exit.tsx:138-142`, `src/components/DeleteWorkspaceButton/index.tsx:43-49` (outside my folders). Each calls `navigate(COVEN_LANDING_PATH, { replace: true }); refresh();` with a comment explaining that a client-side replace does not re-run the layout.
- **Shared piece:** `leaveCoven()` returned by `usePendingNavigation` or a small hook `useLeaveCoven()` in `src/lib/navigation/`, that does both calls and holds the one comment.
- **Guard:** none practical.
- **Fix:** add the hook; replace the three. Could break: none expected; the order (navigate, then refresh) must stay.
- **Tests covering the callers:** `tests/components/LeaveWorkspaceButton/`, `tests/components/DeleteWorkspaceButton/`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-120: Three "native control before hydration" fallbacks build the same grouped `<select>`

- **Severity:** medium
- **Why it matters:** A change to how a pre-hydration native select groups options or hides zero counts can reach only some of the copies. Users who load a filter before scripts run would see different groups or counts, and specs reading the option text may fail.
- **Where:**
  - `FacetCombobox/index.tsx` (native fallback: groups by `choice.group`, hides zero counts unless chosen, option text `label count`)
  - `FacetPanel/category-line.tsx` (`NativeCategories`: same grouping and zero-hiding, grouped by `category.group.name`)
  - `Field/filter-select-field.tsx` (plain native select, no counts)
- **Shared piece:** one `NativeGroupedSelect` in `Field/` taking `{ value, label, count?, group? }[]`, used by the two Facet copies. `FilterSelectField` can stay if it takes the same options.
- **Guard:** none practical.
- **Fix:** move the grouping and zero-hiding into the shared piece; the two Facet callers map their choices to it. Risk: the `count` text format must match what the e2e specs read.
- **Tests covering the callers:** `tests/components/FacetCombobox/`, `tests/components/FacetPanel/`, `tests/components/Field/`.

- **Estimate:** 3 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-121: the sign-up form fill is written four times

- **Severity:** medium
- **Why it matters:** If the sign-up form labels or field order change, four test copies break separately, so a developer must fix each. A missed copy can keep passing against an old form shape and stop proving that visitors can actually sign up.
- **Where:**
  - twice in `tests/components/SignInDialog/index.test.tsx`, once in `tests/components/InvitationAcceptance/index.test.tsx` (new in the merge), once in `tests/components/SignInPanel/in-dialog.test.tsx`.
- **Shared piece:** `fillSignUp(user, {name, email, password})` in `tests/support/interact.tsx`.
- **Guard:** none practical.
- **Fix:** extract after D-95; the fill is the same field labels in the same order.
- **Tests covering the callers:** the three files.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-122: Compendium slug-move block written twice in `compendium.ts`

- **Severity:** medium

**Part 1: Compendium slug-move block written twice in `compendium.ts`**

- **Why it matters:** A change to how a renamed compendium entry keeps its old address must be made twice. A missed copy leaves old links broken or lets a name collide, so a visitor following a saved compendium link gets a not-found page after a curator renames.
- **Where:**
  - `src/modules/ingredients/services/compendium.ts:192-216` (`updateCompendiumEntry`) and `:249-270` (`promoteCompendiumFolkName`): `const at = new Date(); const moves = slug !== current.slug; if (moves) await refuseEndingARedirect(...)`, then inside `withAudit` `deleteLapsedSlugRetirements`, update, `if (moves) insertInCompendium(retiredIngredientSlugs, { ingredientId, slug: current.slug, retiredAt: at })`, then `.catch(refuseCollision(...))` and `expireCompendium()`.
  - `src/modules/ingredients/services/compendium.ts` `updateCompendiumEntry` (about 1063-1082) and `promoteCompendiumFolkName` (about 1119-1136): `moves = slug !== current.slug`, `refuseEndingARedirect`, `deleteLapsedSlugRetirements`, `insertInCompendium(curator, retiredIngredientSlugs, {ingredientId, slug: current.slug, retiredAt})`. `createCompendiumEntry` repeats the lapsed-delete step. The `withAudit(...)` then `expireCompendium()` shape repeats in about six writes, and `...(input.shown != null && { shown })` repeats in create and update.
- **Shared piece:** a private `writeWithSlugMove(session, curator, current, slug, endRedirect, doWrite)` in the same file (or `compendium-slugs.ts`, which already exists). Stays in the service layer; the `curator` proof is passed through.
- **Guard:** none practical.
- **Fix:** extract the shared envelope; the two callers pass only the differing update.
- **Tests covering the callers:** `tests/modules/ingredients/` compendium update and promote specs.

**Part 2: Slug-move block copied across compendium writes**

- **Why it matters:** The retire-old-address steps must run in a set order. A copy that changes or omits the order of the lapsed delete and insert fails or leaves duplicates, so a curator's rename or promotion errors, or old links stop redirecting for visitors.
- **Shared piece:** `retireSlug(write, curator, id, oldSlug, at)` in `compendium.ts` (private).
- **Guard:** none practical.
- **Fix:** extract; keep the order of statements (the lapsed delete must precede the insert).
- **Tests covering the callers:** `tests/modules/ingredients/compendium*.test.ts` (redirect cases).

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-123: Same "cupboard insertion on first compendium jar" block in `createStock` and `saveStock`

- **Severity:** medium
- **Why it matters:** The comment in the second copy admits it was pasted. A fix to adding an entry to a coven's cupboard on its first jar, or to the duplicate-jar message, reaches only one path, so a practitioner sees a different error or a missing cupboard entry depending on how stock was saved.
- **Where:**
  - `services/stock.ts:62-70` (`createStock`) and `services/stock.ts:164-172` (`saveStock`): `if (!entry) { if (!(await heldCompendiumEntry(...))) throw NotFound(NO_FORM) } else if (entry.workspaceId === null && !(await findCupboardEntry(...))) await write.insertInWorkspace(membership, workspaceCompendiumEntries, {ingredientId: entry.id})`. The unique-index `catch` that maps `inventory_items_workspace_id_variant_id_unique` to `HELD` is also written twice (one pathed `['variantId']`, one `['create', index, 'variantId']`).
- **Shared piece:** private `ensureHeld(write, membership, entry, ingredientId)` in `stock.ts`, and `refuseHeld(error, path)`.
- **Guard:** none practical.
- **Fix:** extract both; the comment "as `createStock`" in `saveStock` already admits the copy.
- **Tests covering the callers:** `tests/modules/ingredients/stock*.test.ts`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-124: Invitable roles listed in four places

- **Severity:** medium
- **Why it matters:** If a new invitable role is added or one removed, four lists must change together. A missed one means the form offers a role the database rejects, or the database accepts a role such as steward that invitations must never grant.
- **Where:**
  - src/modules/coven/services/invitations.ts `INVITABLE`; src/modules/coven/graphql/invitations.ts `builder.enumType('InvitableRole')`; src/modules/coven/schema/invitations.ts `invitations_role_invitable` CHECK; src/db/repository `InvitableRole` type.
- **Shared piece:** one `INVITABLE_ROLES` tuple in a type-only/constants file in coven schema, used by the zod/enum/CHECK/type.
- **Guard:** a catalogue test that the CHECK and the tuple agree.
- **Fix:** derive the GraphQL enum values and the CHECK from the tuple. The repository type must import from a constants file the repository may import.
- **Tests covering the callers:** tests/modules/coven invitations tests; tests/db constraint tests.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-125: CategoryChips/category-more re-implements the InfoTip hover, focus and Escape logic

- **Severity:** medium
- **Why it matters:** The hand-built toggletip has its own timers and Escape handling. A fix to the shared tip, such as focus or dismiss behaviour, misses the category menu, so a keyboard user can find a category tip that will not close or stays open.
- **Where:**
  - `src/components/CategoryChips/category-more.tsx:1-169` (hand-rolled floating toggletip: open timers, Escape handling, floating-ui wiring)
  - `src/components/InfoTip/use-tip.ts:1-166` (`useTip`, the shared version)
- **Shared piece:** `useTip` from `InfoTip/use-tip.ts`. If `useTip` lacks a click-toggle mode, add one there rather than keeping a second copy.
- **Guard:** an oxlint `no-restricted-imports` rule for `@floating-ui/react` outside `InfoTip`, `Combobox`, `Modal` and other named primitives.
- **Fix:** replace the timers and Escape handler in `category-more.tsx` with `useTip`. Risk: touch/keyboard behaviour of the toggletip (it opens on press, not hover) differs from InfoTip's hover tip; confirm `useTip` can express it.
- **Tests covering the callers:** `tests/components/CategoryChips/`, `tests/components/InfoTip/`.

- **Estimate:** 3 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-126: Two `workingStepsOf` and two `UNAVAILABLE_INGREDIENT` constants

- **Severity:** medium
- **Why it matters:** The card and the page already disagree on when a step counts as linked, and each holds the Unavailable Ingredient text. A practitioner recording a working may see different names, stock or one-off flags for the same spell depending on where they start.
- **Where:**
  - `src/components/SpellCard/record-working.tsx:42-53` and `src/app/(shell)/coven/[slug]/grimoire/[id]/recipe-steps.ts:8,73-95`. Both turn a spell's steps into `WorkingStep[]` for Record a Working and both hold the literal `'Unavailable Ingredient'`. They have already drifted: the card decides "linked" from `ingredient != null || variant != null` of a GraphQL query, the page from `ingredientId !== null` of a service view, and the page also carries `stock`.
- **Shared piece:** put `UNAVAILABLE_INGREDIENT` in a type-free constants file inside `src/components/RecordWorking/` (e.g. `warnings.ts` already exists there) and import it in both. The two mappers read different inputs (query result vs service view) so they stay two functions, but should share the one rule for the name, form, seed and `oneOff`; a shared `workingStepOf({ id, name, form, linked, ingredientId })` in `RecordWorking/` covers it.
- **Guard:** none practical.
- **Fix:** extract the constant and the per-step builder; call from both.
- **Tests covering the callers:** `tests/components/SpellCard/`, `tests/components/RecordWorking/`, tests for `recipe-steps` under `tests/app/`.

- **Extra copies and changes found when merging:**

`SpellBuilder/record-working` repeats the `workingStepsOf` / `UNAVAILABLE_INGREDIENT` handling.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-127: The "stuck" choice chip (every option leaves the same results) is spelled out per facet

- **Severity:** medium
- **Why it matters:** A change to when the stuck-choice chip disables or what hint it shows must be made in four places. A missed facet leaves a chip clickable that changes nothing, or hides the reason, so a user filtering the grimoire or compendium is confused.
- **Where:**
  - `GrimoireList/filter.tsx` (visibility chip: `some(c => c.count === 0)` disables it, value `''`, `chipHint` "Every matching ... cannot narrow further")
  - `FacetPanel/index.tsx` (Toxic, Source and Reviewed chips, same logic)
- **Shared piece:** a `stuckChoice(choices)` helper next to `ChoiceChip` in `FacetPanel/` returning `{ disabled, value, hint }`, so each chip passes its noun only.
- **Guard:** none practical.
- **Fix:** extract the helper from the FacetPanel copy, call it from the four sites. Risk: the hint wording differs by noun; the helper takes the noun.
- **Tests covering the callers:** `tests/components/FacetPanel/`, `tests/components/GrimoireList/`.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-128: `FacetPanel/facet-switch.tsx` re-implements `Field/switch-field.tsx`

- **Severity:** medium
- **Why it matters:** A fix to the switch markup, keyboard handling or press feedback reaches only one of two copies. A keyboard or screen-reader user can find a facet switch that does not toggle on Enter or announce correctly, while the form switch works.
- **Where:**
  - `FacetPanel/facet-switch.tsx` (label with `pressFeedback`, `role="switch"` checkbox, Enter-key click handler, plus a count) and `Field/switch-field.tsx` (the same markup).
- **Shared piece:** a presentational `SwitchControl` in `Field/` (markup only, no react-hook-form), used by `SwitchField` and `FacetSwitch` (which passes the count as a child).
- **Guard:** none practical.
- **Fix:** split `SwitchField` into the form-bound wrapper and the bare control, build `FacetSwitch` on the bare control. Risk: the two differ in class names; the e2e selectors use roles.
- **Tests covering the callers:** `tests/components/Field/`, `tests/components/FacetPanel/`.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-129: Production code with no production caller, kept alive by tests only

- **Severity:** medium
- **Why it matters:** a dozen functions, several large, in services where the architecture rules apply
  Found with a knip run that does not count `tests/` (`knip-no-tests.log`), then each name grepped over `src`. "src uses" = 0 means nothing but the definition (and at most a barrel re-export).

- **Entirely dead, not even tests (delete):**
  - `src/lib/auth.ts:225` `linkedProviderIds` (and its `isRosterProvider` import in auth.ts if that was its only use there; check). Zero references anywhere in the repo. Knip's default run does not report it (see D-195).
- **Service functions with zero production callers, tests only:**
  - `src/modules/grimoire/services/spell-visibility.ts:19` `setSpellVisibility` (whole file; the live widening rule runs through `assertWidens` in `spells.ts:113` and `workings.ts:424`). Tests: `tests/modules/grimoire/services/spell-visibility.test.ts`, `tests/db/workspace-isolation.test.ts`.
  - `src/modules/grimoire/services/spells.ts:148` `addSpellStep`, `:168` `updateSpellStep`. Test: `tests/modules/grimoire/services/spells.test.ts`.
  - `src/modules/grimoire/services/workings.ts:248` `getWorking`, `:260` `listWorkings`. Test: `tests/modules/grimoire/services/workings.test.ts`.
  - `src/modules/identity/services/invitation-cards.ts:294` `countCardAttempts`. Test: `tests/modules/identity/services/card-attempts.test.ts`.
  - `src/modules/ingredients/services/stock.ts:246` `getStock`. Tests: `stock.test.ts`, `tests/db/workspace-isolation.test.ts`.
  - `src/modules/ingredients/services/workspace-ingredients.ts:164` `getWorkspaceIngredient`. Tests: 5 files (`workspace-isolation`, `ingredient-substitutes`, `workspace-ingredient-deleted-reads`, `compendium-entries`, `workspace-ingredients`).
  - `src/db/repository/workspace-slugs.ts:30` `findWorkspaceSlugs` (+ barrel `index.ts:114`). Test: `tests/modules/coven/schema/workspace-slugs-schema.test.ts`.
  - `src/db/repository/finders.ts:301` `findManyIncludingSoftDeleted` (+ barrel `index.ts:8`). Tests: `write.test.ts`, `finders.test.ts`, `tests/guards/soft-delete-finder-guard.test.ts`. Check the Rule 4 named list in `.claude/rules/database.md` before deleting; the guard test may need its fixture updated.
- **Dead helper code in src used only by tests:**
  - `src/lib/utc.ts:69` `longMinuteInUtc`, `:74` `minuteInUtc` (test: `tests/lib/utc.test.ts`).
  - `src/db/seed/compendium/guard.ts:575` `unauditedGrowth` (test: `tests/db/seed/compendium-files.test.ts`).
  - `src/db/seed/demo-coven-content.ts:205` `DEMO_COVEN_EXCEPTIONS` (test: `tests/db/seed/demo-coven.test.ts`).
  - `src/lib/impersonation.ts:7` `IMPERSONATION_PATHS` (test: `tests/lib/impersonation.test.ts`).
  - `src/lib/invitation-cards/layout.ts:62` `HEADLINE_MAX_LINES` (test: `tests/lib/invitation-cards/headline.test.ts`).
  - `src/lib/invitation-cards/qr.ts:5` `cardQrSvg` plus re-export `src/lib/invitation-cards/index.ts:5` (2 tests).
  - `src/lib/background-tasks.ts:18` `settleHeldTasks` (tests: `tests/db/password-reset-background.test.ts`, `tests/support/auth-module.ts`). Test hook; it is legitimate if the comment says so. Candidate to `tests/support`.
  - `src/db/seed/compendium/render-entry.ts` (whole file: `renderEntryFile`, `renderFrontmatter`, type `RenderableEntryFile`). No `src` or `scripts` importer. Only 7 test files import it (`mark`, `parse-entry`, `content-hash`, `compendium`, `compendium-citation-columns`, `guard-files`, `files-fixture`). It is test support living in `src/`; move to `tests/support/`.
- **Verify before touching (test-only but plausibly meant as public API of the module):** barrel exports used only by tests: `src/modules/documents/index.ts:4,5,7,8,11,13` (`discardDocumentDraft`, `publishDocumentDraft`, `saveDocumentDraft`, `updateDocument`, `emailDocumentsToEveryAccount`, `resumeDocumentMailing`); `src/modules/help/index.ts:3-8,22` (`createHelpArticle`, `deleteHelpArticle`, `orderHelpFaq`, `orderHelpGuides`, `setHelpArticleShown`, `updateHelpArticle`, `readHelpRenameEffects`); `src/modules/support/index.ts:7` (`redactPath`, `redactPathForCurator`); `src/db/repository/index.ts` `findMany`, `findManyInWorkspace`, `findOne`, `findOneInWorkspace`, `findPageInWorkspace`, `findPageInReadableSpells`, `COVEN_STOCK_LOCK_NAMESPACE`; `src/components/Passkeys/index.tsx:20` `LAST_WAY_IN`; `src/lib/autosave/index.ts:2` `writeMirror`; `src/lib/pagination.ts:25` `encodeCursor`. These may be intentional barrel surface (graphql resolvers in the same module import `../services` directly). Only act with the owner's call on whether a barrel lists only what other modules use.
- **Guard:** none practical for "used only by tests" with knip alone; could be a second knip config (tests excluded from `entry`) run as a report. Not recommended as a gate: the barrel list above is partly by design.
- **Fix:** delete each function with its test cases (a test of a deleted function goes with it; keep any case that proves a live rule, e.g. the one-way visibility cases that `spells.test.ts` already covers through `updateSpell`). Confirm the isolation cases in `tests/db/workspace-isolation.test.ts` still cover a live path for each deleted reader. For `render-entry.ts`: `git mv` to `tests/support/` and fix the 7 imports.
- **Tests covering the callers:** as listed per item.

- **Estimate:** 5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-130: Make `lint:unused` a gate

- **Severity:** medium
- **Why it matters:** Without a required check, unused code and exports can merge unnoticed and build up, misleading readers about what is live. Making it required needs an owner decision, and the workflow cannot be edited until the owner answers.
- **Current state:** CI job `unused` in `.github/workflows/checks.yml` is non-blocking by design; not in pre-commit.
- **Recommendation:** after D-157 to D-145 and D-195 step 1 are merged, the default run is clean (0 issues). Then (a) remove `continue-on-error: true` from the `unused` job and add `unused` to the required checks, and (b) leave it out of pre-commit (knip needs the whole project, about a minute; `lint-staged` runs per changed file). The owner decides whether it becomes required; I need that decision before the fix lane edits the workflow.
- **Guard:** the job itself.

- **Owner's call:** `lint:unused` stays non-blocking: no CI gate and no pre-commit step.
- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner keeps lint:unused non-blocking

### D-131: Reopen-on-sender-message update and reply insert written twice

- **Severity:** medium
- **Why it matters:** The reopen-on-sender-message update and the reply insert are written in two large copies. A fix to one, such as the status rule for a closed request, misses the other, so a support request reopens or stays closed depending on which path the message took.
  Severity: medium (two large copies)
  Copies:
- `src/modules/support/services/lifecycle.ts:~100-125` (`sendSenderMessage`)
- `src/modules/support/services/view-link.ts:~165-190` (`replyToSupportRequestByViewToken`)
  Both call `moveSupportRequest(..., ['open','waiting_on_sender','resolved'], { status:'open', resolvedAt:null, resolvedBy:null, closingNoticeSentAt:null, lastSenderActivityAt })` and then insert a `supportReplies` row with `authorRole:'sender'`, `visibility:'public'`.
  Shared piece: `reopenWithSenderReply(tx, request, body, now)` in the support services.
  Guard: none.
  Fix: extract; the two callers differ only in which auth check precedes it.
  Tests covering the callers: `tests/modules/support/lifecycle*.test.ts`, `view-link*.test.ts`.
  Estimate: 1.5 h

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-132: Cleanup and retention page coordinators are near-copies

- **Severity:** medium
- **Why it matters:** A fix to paging, such as the stop test or cursor, must be made in the cleanup and retention jobs separately. A missed copy could skip or repeat a page, so provisional accounts or old support data are left behind or removed twice.
  Severity: medium
  Copies:
- `src/modules/identity/jobs/provisional-cleanup.ts` + `provisional-cleanup-pages.ts` (`CLEANUP_PAGE_SIZE = 500`) + `provisional-cleanup-batch(-steps).ts`
- `src/modules/support/jobs/support-retention.ts` + `support-retention-pages.ts` (`RETENTION_PAGE_SIZE = 500`) + `support-retention-batch(-steps).ts`
  Both loop: read a page of ids after a cursor, start a batch, stop if the page is short, set `after` to the last id. Both batch workflows are try/catch around one step that returns null and logs.
  Shared piece: a `forEachIdPage(readPage, pageSize, startBatch)` helper in `src/lib/` (no workflow directives needed in the loop part only if the loop stays in the `'use workflow'` file; check that a helper imported into a workflow file is allowed).
  Guard: none.
  Fix: extract the loop only; keep the `'use step'` files separate as the workflow runtime requires.
  Tests covering the callers: `tests/modules/identity/jobs/`, `tests/modules/support/jobs/`.
  Estimate: 2 h

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-133: Inline `new ValidationError([{ path, message }])` where `fieldRefusal(path, message)` exists

- **Severity:** medium
- **Why it matters:** Many services build `new ValidationError([{ path, message }])` inline although `fieldRefusal(path, message)` exists. A change to the refusal shape, such as a code or a translation key, misses the inline copies, and users see inconsistent form errors.
  Severity: medium (many small copies)
  `fieldRefusal` is used 40 times. Inline forms remain here:
- `src/modules/identity/services/email.ts:134-139,144-146`
- `src/modules/identity/services/admin-invitations.ts:~58-66`
- `src/modules/identity/services/access-pause.ts:75-77`
- `src/modules/identity/services/invitation-cards.ts` (mint issues, ~555-570)
- `src/modules/support/services/staff.ts:163` (`assignSupportRequest`)
  Elsewhere (listed for the owner, not read in full): `coven/services/invitations.ts:37,65,77,85,140`, `coven/services/member-role.ts:35`, `vocabulary/services/curated-writes.ts:31,66,79,88`, `vocabulary/services/ingredient-form-values.ts:171,179`, `ingredients/services/cupboard-entries.ts:172,178,192,201,203`, `ingredients/services/ingredient-rows.ts:806,871`, `ingredients/services/compendium.ts:531`, `help/services/help-writes.ts:411,419`.
  Shared piece: `fieldRefusal` in `src/lib/errors` (exists).
  Guard: an ESLint `no-restricted-syntax` rule on `new ValidationError([{` with a single issue.
  Fix: replace single-issue inline constructions; leave multi-issue arrays.
  Tests covering the callers: the services' own tests; behaviour is unchanged.
  Estimate: 1.5 h

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-134: Token hash written in four places

- **Severity:** medium
- **Why it matters:** The token hash is computed in four places, and a stored token matches only if every copy hashes identically. A change to one copy alone makes valid invitation or view links stop working for users with tokens already issued.
  Severity: medium (the hash must stay identical for stored tokens to match)
  Copies: `src/db/repository/tokens.ts:8` (the documented hex SHA-256), `src/modules/support/services/view-link.ts:40` (`hashOf`), `src/db/seed/invitation-cards.ts:225` (`sha256Hex`); minting `randomBytes(32).toString('base64url')` at `view-link.ts:47` and `src/lib/invitation-token.ts:8`.
  Shared piece: `tokens.ts` already exports the hash; `view-link.ts` should import it, and mint should come from `src/lib/invitation-token.ts` or be renamed to a general `newToken()`.
  Guard: a test that the seed hash equals the repository hash.
  Fix: delete `hashOf` and `sha256Hex`; import the repository function (seed code may import the repository).
  Tests: `tests/modules/support/view-link*.test.ts`, invitation-card seed test.
  Estimate: 1 h

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-135: Vocabulary group list/count pairs drift between `findPage` and `findGroupPage`

- **Severity:** medium
- **Why it matters:** The group lists use two paging methods with different filters. A filter or sort change made to one set leaves the deity traditions paging or counting differently, so a curator sees a total that does not match the rows shown.
- **Where:**
  - `listCategoryGroups`/`countCategoryGroups` and `listIngredientFormGroups`/`countIngredientFormGroups` use `findPage(table,[table.name],page)` + `findPageCount`; `listDeityTraditions`/`countDeityTraditions` use `findGroupPage`/`findGroupCount(table, filter, page)`. Cached `x-page`/`x-count` `cachedCompendiumRead` pairs are also declared separately in astrology.ts, categories.ts, deities.ts, ingredient-form-values.ts.
- **Shared piece:** extend `cachedFilteredList` in curated-lists.ts to return the page and count pair and use it for all.
- **Guard:** none practical.
- **Fix:** route the three group lists through one helper; confirm the filter semantics of `findGroupPage` first.
- **Tests covering the callers:** tests/modules/vocabulary list tests.

- **Estimate:** 2.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-136: Page and count twin finders repeat their filter in every repository file

- **Severity:** medium
- **Why it matters:** Each finder writes its filter twice. If a developer changes the list filter but not its count twin, a page shows a total that disagrees with the rows, or paging stops early, so a user cannot reach every item.
- **Where:**
  - `findX` / `findXCount` pairs in src/db/repository/{vocabularies,help,documents,memberships,users,cupboard-entries,stock,references,workings,spells,grimoire,ingredients,support,invitations}.ts. Each writes the filter twice; a change to one can miss its twin.
- **Shared piece:** a per-finder `const filterFor = (args) => and(...)` used by both, which several files already do through `readPage`/`readCount`; the rest should follow.
- **Guard:** none practical.
- **Fix:** convert the remaining pairs one file at a time. Not every file was read in full (see Coverage), so the list of pairs needing work is not exact.
- **Tests covering the callers:** the matching tests/db and tests/modules suites.

- **Estimate:** 4 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-137: Support-request status marks written as seven separate `IconTip` plus button blocks

- **Severity:** medium
- **Why it matters:** Eight near-identical blocks are changed by hand. A new status or changed filter link can be missed in one, so a keeper reviewing support requests sees a status mark with the wrong tip, name or link, or no mark at all.
- **Where:**
  - `SupportRequests/index.tsx:125-199` (seven blocks) and `:217-225` (Beta Tester block).
- **Shared piece:** a local `StatusMark({ tip, name, icon, href })` in `SupportRequests/status-badge.tsx` (already holds status marks) taking the tip, accessible name, icon and filter link. The blocks differ only in those four values.
- **Guard:** none practical.
- **Fix:** read lines 125-225 together, extract the component, replace the eight blocks with a table-driven map. Nothing else depends on the markup.
- **Tests covering the callers:** `tests/components/SupportRequests/*`, support e2e specs.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-138: AccountMenu trigger and panel each derive the same counts and labels

- **Severity:** medium
- **Why it matters:** The menu trigger and panel each work out the same counts and label. If the badge rule changes in only one, a user sees a count badge on the account button that disagrees with the number shown inside the menu.
- **Where:**
  - src/components/AccountMenu/index.tsx:25-29; src/components/AccountMenu/panel.tsx:59-62 (both compute `pending = verified && pendingInvitations > 0`, `staffCount`, `senderCount` and the `invitations` label string).
- **Shared piece:** one function in `AccountMenu/counts.ts` (which already holds the support-count wording) returning `{ pending, staffCount, senderCount, invitations }` from the viewer props.
- **Guard:** none practical.
- **Fix:** add `accountCounts(props)` to counts.ts, call it in both files. A change to the badge rule now cannot reach one side only.
- **Tests covering the callers:** tests/components/AccountMenu.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-139: Combobox repeats option-row, group-heading and indicator markup

- **Severity:** medium
- **Why it matters:** A fix to the combobox option row, group heading or clear button must be made in several files. A missed one leaves keyboard or screen-reader users with different behaviour in the single select, multi select and base combobox, such as a click that wrongly closes the list.
- **Where:**
  - option row (icon, label, count, note): Combobox/index.tsx:362-387, multi-select.tsx:235-250, select.tsx:344-352. Group heading (`li.combobox__group` > `div role=group` > heading + `ul.combobox__rows`): index.tsx:554-567, select.tsx:438-450. Indicators (clear button, separator, chevron): index.tsx:490-524, multi-select.tsx:184-207. `preventDownshiftDefault` cast: index.tsx:296-298, select.tsx:380-383.
- **Shared piece:** `OptionRow`, `OptionGroup` and `Indicators` components and a `preventDownshiftDefault` helper, in `Combobox/popup.tsx` or new files beside it.
- **Guard:** none practical.
- **Fix:** extract the three components, pass the downshift props in; keep class names unchanged so SCSS is untouched.
- **Tests covering the callers:** tests/components/Combobox/*

- **Estimate:** 4 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-140: floating-ui `autoUpdate` wired by hand in four effects

- **Severity:** medium
- **Why it matters:** A fix to how a floating popup follows its anchor, such as cleanup on unmount, must be made in four places. A missed copy leaves a tip, menu or feedback bubble stuck in the wrong position or leaking listeners as a user scrolls.
- **Where:**
  - Combobox/position.ts:144-148; InfoTip/use-tip.ts:105; CategoryChips/category-more.tsx:58; ClickFeedback/position.ts:90-100
- **Shared piece:** `useAutoPosition(reference, floating, place)` in `src/lib`.
- **Guard:** grep test for `autoUpdate(` outside the hook.
- **Fix:** extract the effect and cleanup; keep each site's middleware list as its argument.
- **Tests covering the callers:** tests/components/Combobox, InfoTip, CategoryChips, ClickFeedback.

- **Estimate:** 3 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-141: Unverified-email sentence exists in five places

- **Severity:** medium
- **Why it matters:** If the unverified-email sentence changes, five places must be edited. A missed one shows a user a different message in sign-in, invitation acceptance or the email form, and the service refusal can disagree with what the screen told them.
- **Where:**
  - src/components/SignInDialog/index.tsx (`INBOX_LEDE`), src/components/InvitationAcceptance/index.tsx (`UNVERIFIED_GRANT`), src/components/EmailForm/index.tsx:44, src/lib/sign-in.ts:119, src/modules/identity/services/invitation-acceptance.ts:50
- **Shared piece:** one exported constant in `src/lib/sign-in.ts` (client-safe) that the two components and the service import.
- **Guard:** none; a test that greps for the sentence would be brittle, so a single export is the guard.
- **Fix:** export once, import in the other four.
- **Tests covering the callers:** SignInDialog and InvitationAcceptance component tests; invitation-acceptance service test (content is not tested, so only the wiring).

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-142: Invitation-path regex written three times

- **Severity:** medium
- **Why it matters:** A change to the invitation link format must be made in three regexes. A missed copy rejects a valid link or accepts a malformed one, so an invited person lands on the wrong sign-in path and may fail to accept the invitation.
- **Where:**
  - src/app/sign-in/page.tsx (`INVITE_LINK = /^\/invite\/([^/?#]+)$/`), src/lib/account-email.ts (`INVITATION_PATH = /^\/invite\/[^/?#]+$/`), src/lib/invitation-link.ts (new helper owning the invitation link marker)
- **Shared piece:** an `invitationTokenFromPath(path)` in `src/lib/invitation-link.ts` returning the token or null.
- **Guard:** none.
- **Fix:** add the helper; use it in the other two.
- **Tests covering the callers:** tests/lib for account-email and invitation-link; sign-in page e2e.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-143: `Passkeys` keeps its own `GENERIC` failure text and a re-export used only by a test

- **Severity:** low (includes a behaviour bug, see Possible Behaviour Bugs)
- **Why it matters:** The passkey screen shows a generic failure message worded differently from the rest of the site, so a user sees two different texts for the same problem. The test-only re-export also misleads readers into thinking the component's export is used elsewhere.
- **Where:**
  - `src/components/Passkeys/refusal.ts:3` (`GENERIC = 'That did not work. Try again.'`) against `src/lib/graphql-failure.ts:9` (`GENERIC_FAILURE = "That didn't work. Please try again."`). Two generic messages with different wording for the same meaning. Also `src/components/Passkeys/index.tsx:20` (`export { LAST_WAY_IN }`) exists only so `tests/components/Passkeys/index.test.tsx:5` can import it from the component; the test could import `./refusal`.
- **Shared piece:** use `GENERIC_FAILURE` (or add an auth-generic message beside the auth client constants).
- **Guard:** none practical.
- **Fix:** decide the wording once; delete the re-export and import from `refusal.ts` in the test.
- **Tests covering the callers:** `tests/components/Passkeys/`.

- **Owner's call:** `Passkeys/refusal.ts` uses the shared `GENERIC_FAILURE`.
- **Estimate:** 0.5 hours
- **Status:** Fixed. Passkeys shows the shared `GENERIC_FAILURE`.

### D-144: `downloadCodes` re-implements `AdminCards/save-file.ts`

- **Severity:** low (includes a behaviour bug, see Possible Behaviour Bugs)
- **Why it matters:** The copy revokes the download link immediately, which some browsers can cancel before reading, so a user saving two-factor recovery codes may get an empty or failed file. The keeper card download uses the safer delay.
- **Where:**
  - `src/components/PasswordSection/two-factor.tsx:82-89` and `src/components/AdminCards/save-file.ts:5-12`. The copy revokes the object URL synchronously after `click()`, which some browsers can cancel before reading; the shared one waits 60 s. This is a small drift.
- **Shared piece:** move `saveFile` to `src/lib/save-file.ts` (browser-only helper) and use it from both.
- **Guard:** none practical.
- **Fix:** move the file, import it in `AdminCards` and `PasswordSection/two-factor.tsx`, delete `downloadCodes`.
- **Tests covering the callers:** `tests/components/PasswordSection/`, `tests/components/AdminCards/`.

- **Estimate:** 0.5 hours
- **Status:** Fixed. `saveFile` in `src/lib/save-file.ts` revokes the download URL only after the browser has taken it, and two-factor recovery codes use it; regression test "keeps the download link alive after the click" in `tests/components/PasswordSection/two-factor.test.tsx`. `AdminCards/save-file.ts` remains as a re-export until its importers move.

### D-145: Exports used by nothing outside their own file, and exports under two spellings

- **Severity:** low

**Part 1: `SLOTS_ONLY` is exported but only used in its own file**

- **Why it matters:** An export used only in its own file suggests other code depends on it, misleading a developer about what is safe to change. It keeps a name in the public surface and makes real unused code harder to spot.
- **Where:**
  - `tests/e2e/servers.ts:103` (`export const SLOTS_ONLY`), used at `:114`. `scripts/e2e-servers.ts:12` mentions the name only in a comment and reads the variable by literal string.
  - `src/components/StockDialog/form.tsx:175` (`export const StockDialogForm`) and `:368` (`export default StockDialogForm`).
  - `src/db/repository/index.ts:309` `WorkspaceSlugRow` (still used by `workspace-slugs.ts`, `types.ts`)
  - `src/modules/help/index.ts:27` `HelpArticleInput`, `:28` `HelpArticlePatch`, `:29` `HelpArticleWithChildren`, `:31` `HelpArticleKind`, `:33` `HelpListing`, `:34` `HelpRenameEffects`
  - `src/modules/support/index.ts:22` `SupportRequestView`
  - `src/components/SignInPanel/index.tsx:30-31`: `EMAIL_VIEW_PARAM`, `EMAIL_VIEW` are exported and imported by nothing else (grep of `src/`; tests did not name them).
  - `src/components/SignInPanel/password-form.tsx:19-26` and `two-factor-step.tsx:17-23`, `ResetPasswordForm/index.tsx:17`: message constants exported only for their own tests (acceptable per the tests; listed so the matching audit area can confirm).
  - `src/components/Skeleton/panel.tsx`: `PanelSkeleton` is used; fine.
  - values exported but used only inside their own file (no use in `src/` or `tests/`):
  - `src/components/SpellBuilder/steps/picker.tsx` `ROW_CATEGORY_CAP`
  - `src/components/SpellBuilder/inventory.tsx` `holdWords`
  - `src/components/SpellBuilder/comparison-panel.tsx` `EXTRA_CHIP_LIMIT`
  - `src/components/Modal/page-hold.ts` `SCROLLBAR_WIDTH`
  - `src/components/SignInPanel/icons.tsx` `GoogleIcon`, `FacebookMark` (and probably `DiscordIcon`, `FacebookIcon`, `MicrosoftIcon`; check each)
  - `src/components/SignInPanel/index.tsx` `EMAIL_VIEW_PARAM`, `EMAIL_VIEW`
  - `src/components/SignInPanel/two-factor-step.tsx` `GENERIC_CODE_ERROR`
  - `src/components/SignInPanel/password-form.tsx` `GENERIC_PASSWORD_SIGN_IN_ERROR`
  - `src/components/RichTextEditor/markdown.ts` `markdownPlugins`
  - `src/components/MemberDetail/coven-access-panel.tsx` `PauseMemberDocument`, `LiftMemberDocument`
  - `src/components/SaveStatus/index.tsx` `BURST_GAP_MS`
  - `src/components/JarShelf/index.tsx` `BANDS_FULL`
  - `src/components/MenuButton/sections.ts` `Viewing`
  - `src/components/ThemeToggle/index.tsx` `applyTheme`
  - `src/components/UserDetail/access-pause-parts.tsx` `SPANS`, `endReady`
  - `src/components/StepRow/one-off-badge.tsx` `ONE_OFF_TIP`
  - `src/components/PasswordSection/two-factor.tsx` `GENERIC_TWO_FACTOR_ERROR`
  - `src/components/PasswordField/meter.tsx` `STRENGTH_WORDS`
  - `src/components/SpellPreview/use-wake-lock.ts` `WakeLock`
  - Exported types with no outside use: `SafetyHeadingLevel`, `SupportSenderReply`, `SpellSaveTarget`, `StepPickerProps`, `BuilderStepRowProps`, `StepSafety`, `SpellDialogOpened`, `ComparisonPanelProps`, `SkeletonShape`, `ProviderRowState`, `CreationAction`, `RouteModalContent`, `RichTextEditorInstance`, `ListBodySkeletonProps`, `LedgerChange`, `SentenceParts`, `SupportThreadEntry`, `SupportFactsProps`, `SupportReplyEntry`, `ProviderArtProps`, `MoonPhase`, `AccessPausePerson`, `InstructionRecipeStep`, `IngredientLook`, `RecipeHeadingLevel`, `SpellLookOpened`, `SwitcherWorkspace`.
  - Line numbers are not given because the list came from an export-usage script; re-run it (or knip) to get them. Some types may be required by a rule that wants every props type in `types.ts`; keep those, remove only the `export` on values.
  - `src/components/HelpOutline/index.tsx:35` (`AudienceBadge` is used only on line 71 of the same file); `src/components/HelpWidget/autosave-status.tsx:11` (`STATUS_LABELS`, used only in that file; `SupportRequests/filter.tsx:23` has a different map of the same name).
  - `minuteInUtc` and `longMinuteInUtc` are used only by `tests/lib/utc.test.ts`, with no caller in `src/`. `isoDayInUtc` is used only inside `utc.ts` (by `printedDayOf`).
  - `ingredients.ts:997` `listingArm` is `export`ed but has no caller outside its file (its single use is `ingredients.ts:632`). Drop `export`.
  - `support.ts:625` `SUPPORT_SEND_LOCK_NAMESPACE` is `export`ed with no caller outside `support.ts` (uses at `653` and `835`). Drop `export`. (`COVEN_STOCK_LOCK_NAMESPACE` at `stock.ts:72` is exported through `index.ts` on purpose, and `tests/modules/ingredients/services/stock.test.ts` imports it; keep.)
  - Exports used only by one sibling repository file and not part of the public surface (acceptable, listed so the fixer can decide): `references.ts` `citesNothing`, `spells.ts` `visibilityText`, and in `ingredients.ts`: `listColumns`, `citesNowhere`, `hasNoForm`, `pairIsLive`, `listOrVariantHolds`, `elementArm`, `pointsLive`, `toxicArm`, `reviewArm`, all used only by `ingredient-facets.ts`. `readableWorkings` and `visibilityIn` are used by one sibling each.
- **Verdict:** confirmed unused as an export.
- **Guard:** knip.
- **Fix:** drop `export`. Leave the comment in `scripts/e2e-servers.ts`; it is about the literal env var name.
- **Tests covering the callers:** any Playwright config load (`playwright.config.ts` imports `servers.ts`).

**Part 2: `StockDialogForm` exported both named and default**

- **Why it matters:** The unused named export beside the default makes a developer think two entry points are in use, so they may import the wrong one. It also adds noise that hides real unused exports in the knip report.
- **Verdict:** confirmed. Only `src/components/StockDialog/lazy-form.tsx:11,15` uses it, through `import('./form')` and `module.default`. The named export has no importer anywhere (src, tests, stories).
- **Guard:** knip "Duplicate exports".
- **Fix:** remove `export` from line 175 and keep the default (the lazy loader needs the default).
- **Tests covering the callers:** `tests/components/StockDialog/*`, `tests/lib/watch-loads.test.ts`.

**Part 3: Type re-exports in barrels nobody imports (knip default run)**

- **Why it matters:** These barrel re-exports advertise types nobody imports, so a developer thinks they are part of the module's public surface and avoids changing them. They also inflate the knip report, hiding genuinely unused code.
- **Verdict:** Grep matches for the same names elsewhere are different things: the Zod values in `src/modules/help/validation/help.ts`, GraphQL SDL names, `src/gql/` output, and `repository/help.ts`'s own local `HelpArticleKind` alias.
- **Guard:** knip (already flags them).
- **Fix:** delete those specifiers from the barrels. Nothing else changes.
- **Tests covering the callers:** `npm run typecheck` is the proof; no test imports them.

**Part 4: Exports used by nothing outside their own file**

- **Why it matters:** Exporting values nothing else imports misleads a developer into treating them as shared, so they hesitate to rename or remove them. The noise also hides real unused exports in the knip report.
- **Shared piece:** none; remove `export` from the first pair.
- **Guard:** knip (the knip setup).
- **Fix:** drop `export` on `EMAIL_VIEW_PARAM` and `EMAIL_VIEW`. This overlaps D-145 (unneeded exports); treat it as extra copies of D-145.
- **Tests covering the callers:** `tests/components/SignInPanel/*`.

**Part 5: Unneeded `export` keywords and exported types**

- **Why it matters:** A long list of exports used only in their own files and types with no outside user makes the modules look more connected than they are. A developer changing one fears hidden callers, and real dead exports get lost in the list.
- **Shared piece:** none. Remove the `export` keyword (or the declaration, if unused entirely).
- **Guard:** knip with `ignoreExportsUsedInFile: false` and exports checking on for `src/components/**` (the knip setup). None practical beyond that.
- **Fix:** drop `export` on each value above; leave types that sit in `types.ts` by the repo rule. Could break: a story or test that imports the constant (checked: none do).
- **Tests covering the callers:** the component tests under `tests/components/<Name>/` for each folder.

**Part 6: `AudienceBadge` and `STATUS_LABELS` exported without a second user**

- **Why it matters:** Exporting two names used only in their own files suggests other code depends on them, and one shares a name with a different map elsewhere, so a developer may import the wrong STATUS_LABELS and show the wrong status text.
- **Shared piece:** none; drop `export`.
- **Guard:** knip `exports` rule.
- **Fix:** remove `export` from both.
- **Tests covering the callers:** none needed.

**Part 7: Unused exports in `src/lib/utc.ts`**

- **Why it matters:** These UTC helpers are only exercised by their own tests, so the tests keep dead code looking alive and misleading readers into thinking the app formats times this way. A developer may fix a bug in code no user ever runs.
- **Shared piece:** none; remove them, or keep them if the owner wants the UTC pair beside the zone pair.
- **Guard:** the knip setup already covers unused exports.
- **Fix:** delete both and their tests. Could break: nothing in `src/`.
- **Tests covering the callers:** `tests/lib/utc.test.ts`.

**Part 8: Dead exports here**

- **Why it matters:** Exports with no outside caller suggest other code depends on the support lock name and the listing arm, so a developer is wary of changing them. The extra repository exports also blur which functions are the module's public surface.
- **Shared piece:** n/a.
- **Guard:** knip already runs repo-wide in the knip setup; the `export` on `listingArm` and `SUPPORT_SEND_LOCK_NAMESPACE` should show up there.
- **Fix:** remove the two `export` keywords.
- **Tests covering the callers:** none needed beyond the type check.

- **Estimate:** 2.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-146: Dead code, orphaned comments and pass-through wrappers

- **Severity:** low

**Part 1: Pass-through wrappers and re-exports**

- **Why it matters:** Pass-through wrappers add a layer a developer must read through to find the real component, and the duplicated prop type can drift from the target. The hand-rolled dialog lifecycle may differ from Modal, so focus return or page lock can behave differently.
- **Where:**
  - ConfirmedAction/index.tsx:187-214 (`Answers` wrapper renames props to `ConfirmAnswersRow`) with ConfirmedAction/types.ts:66-79 (`ConfirmAnswersProps` duplicates the target's prop type); AppShell/add-href.ts (re-exports `lib/coven-path` constants); ConfirmDialog/index.tsx:56-79 (hand-rolled showModal, `holdPage`, `giveFocusBack` effect; compare with Modal/modal.ts)
  - `CovenNav/sections.ts`: `covenSections` is a pass-through to `sectionsOf`; call `sectionsOf` directly.
  - `CovenCards/actions.tsx`: `covenCardName` wraps `cardName` (see D-93 extras).
  - `CovenCards/card-more.tsx`: `const close = () => setAsking(undefined)` repeats `settle` in the same file.
  - `GroupList/href.ts`: `groupsPath(kind)` wraps `KINDS[kind].path`; callers can read the registry.
  - `DocumentPage/markdown.tsx`: repeated `tree.children = fn(tree.children as ElementContent[]) as RootContent[]` casts; one local `mapChildren(tree, fn)` removes them.
  - `Field/character-count.tsx`: a local `plural` helper beside `src/lib/text.ts` `plural` (different signature; check before swapping).
  - `ErrorScreens/index.tsx`: the "Back to Sorrel & Salt" `PendingLink` written in both screens.
  - `src/modules/grimoire/types.ts` `SpellStepUpdate = SpellStepInput`; `validation/types.ts` `Lists` and `Parsed` repeat the four list fields; `validation/cupboard-merge.ts` `OVERRIDES` list repeats the field list in `applyCupboardEntry`; `loaders/spell-children.ts` `clearSpell`/`clearWorkingCount` trivial.
  - `src/components/HelpWidget/role-permission-table.tsx:54-57` (`HIDDEN_STATEMENTS = []` and its `hidden()` filter). The only reader is the file itself.
  - src/components/SignInPanel/types.ts:40
- **Shared piece:** import `ConfirmAnswersRow` and its props type directly; import `lib/coven-path` directly; share one dialog-lifecycle hook between ConfirmDialog and Modal if they are the same (not verified).
- **Guard:** knip catches unused re-exports once callers move.
- **Fix:** delete wrappers; check callers.
- **Tests covering the callers:** tests/components/ConfirmedAction, ConfirmDialog, AppShell.

**Part 2: Small dead and redundant code**

- **Why it matters:** Pass-through helpers and repeated casts make a developer read extra code to find what runs. The duplicate close and settle functions can drift, so one menu may handle focus or state differently, and two plural helpers can disagree on wording.
- **Shared piece:** none; local clean-ups.
- **Guard:** knip catches an unused export; none for the rest.
- **Fix:** each is a one-line or small change.
- **Tests covering the callers:** the folder's own tests under `tests/components/`.

**Part 3: Dead and trivial aliases**

- **Why it matters:** Unused aliases and repeated field lists mislead a developer into thinking separate types exist, and adding a spell list field means editing the same names in several places. A missed one makes a field type-check yet be skipped during validation.
- **Shared piece:** use `SpellStepInput` directly; derive `Parsed` from `Lists`.
- **Guard:** knip covers the unused alias.
- **Fix:** remove alias; derive types.
- **Tests covering the callers:** type-check.

**Part 4: Dead code and misplacement seen in the area**

- **Why it matters:** The unused notifier parameter makes a developer think a pause notice is sent when it is not. Two import paths and two sentence builders for time-out refusals mean the sender's message can differ in wording between reply and request refusals.
  Severity: low
- `src/modules/support/services/view-link.ts`: `NO_SUCH_REQUEST` is declared after its first use.
- `src/modules/support/services/timeouts.ts` `timeOutSignedOutSender` takes an unused `_notifier` parameter; the GraphQL resolver passes `context.pauses` only to fill it.
- `src/modules/support/services/send.ts` re-exports `SEND_WINDOW_SECONDS`, `refuseTimedOut`, `refuseTimedOutReply` from `time-out-refusals.ts`; `lifecycle.ts` and `view-link.ts` import them by different paths.
- `refuseTimedOut` and `refuseTimedOutReply` in `time-out-refusals.ts` each build an "until X / no end date" sentence; merge the sentence builder.
  Fix: delete the parameter, one import path, one sentence builder.
  Tests: `tests/modules/support/`.
  Estimate: 1 h

**Part 5: HelpWidget role-permission-table keeps an always-empty hidden list**

- **Why it matters:** Dead code, orphaned comments and pass-through wrappers remain in the source. Readers follow them as if they were live, and a maintainer can spend time fixing code nothing calls or trust a comment that describes code no longer there.
- **Shared piece:** none; delete.
- **Guard:** knip flags the export.
- **Fix:** remove the constant and the filter; drop the `export`.
- **Tests covering the callers:** `tests/components/HelpWidget/`.

**Part 6: `SignInPanelProps.onModeChange` is unused and its comment is stale**

- **Why it matters:** A stale prop and a comment describing behaviour that no longer exists mislead a developer into wiring up a callback that is never called. Knip does not flag unused optional props, so nothing else would catch it.
- **Shared piece:** none; delete.
- **Guard:** knip does not flag unused optional props.
- **Fix:** delete the prop and fix the comment.
- **Tests covering the callers:** SignInPanel tests.

- **Estimate:** 4.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-147: Coven role labels live in a keeper-only folder; site and coven role helpers are split across two folders

- **Severity:** low
- **Why it matters:** Coven role names live in a keeper-only folder, so a developer looking for how Steward, Practitioner and Observer are shown searches the wrong place and may add a second label list. The two copies could then show a practitioner different role names.
- **Where:**
  - `src/components/UserDetail/roles.ts` (coven role labels, `WORKSPACE_ROLE_LABELS`, `workspaceRoleLabel`) is imported by `MemberList/index.tsx:5`, `MemberList/role-control.tsx:9`, `MemberDetail/index.tsx:4`, `LeaveWorkspaceButton/owner-exit.tsx:16`, `ReceivedInvitations/index.tsx:6`, `PendingInvitations/index.tsx:6`, `InviteDialog/index.tsx:14`, `HelpWidget/role-permission-table.tsx:3`.
  - `src/components/UserList/roles.ts` (site role labels, `ROLES`, `ROLE_LABELS`, `SITE_ROLE_ACCESS`, `roleLabel`) is imported by `AdminInvitations/invite-form.tsx:11`, `UserDetail/index.tsx:8`, `RoleTip/index.stories.tsx:3`, `app/(shell)/keepers/(people)/users/page.tsx:6`.
  - `src/components/MemberList/role-access.ts` (`WORKSPACE_ROLE_ACCESS`) is imported by `InviteDialog`, `LeaveWorkspaceButton`, `CovenHome`, `RoleTip` stories.
  - The coven labels and the coven access text sit in two different folders (`UserDetail`, `MemberList`) though they describe the same three roles. The Practitioner/Steward/Observer display names are written only in `UserDetail/roles.ts:5`, which is correct (one source), but the folder is wrong for its users.
- **Shared piece:** move the coven role labels and `WORKSPACE_ROLE_ACCESS` next to each other in one coven-owned file (for example `src/components/MemberList/roles.ts`, or `src/lib/` if a server page needs it), and keep `UserList/roles.ts` for site roles only. Not a duplicate; a placement problem.
- **Guard:** none practical.
- **Fix:** move `UserDetail/roles.ts` to `MemberList/roles.ts` (merge with `role-access.ts`), update the eight imports, keep names. Could break: relative import paths only.
- **Tests covering the callers:** `tests/components/MemberList/`, `tests/components/InviteDialog/`, `tests/components/LeaveWorkspaceButton/`, `tests/components/HelpWidget/`, `tests/components/UserDetail/`.

- **Estimate:** 0.75 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-148: exported helpers and constants in `tests/support/` with no importer

- **Severity:** low
- **Why it matters:** dead exports; each is either unused or used only inside its own file, so the fix is to drop the `export`, or delete if also unreferenced in the file
- **Where:**
  - `tests/support/two-factor.ts` `totpSecret`; `story-checklist.ts` `summarizeChecklist`, `groupBySection`; `import-graph.ts` `resolveLocal`; `card-sheet-pdf.ts` `multiply` (only `scripts/backdrop-masks.mjs` matches by name, check it is not importing this one); `stories.ts` `parseStories`; `msw/ingredient-lookups.ts` `offerList`; `db/agreement-in-force.ts` `inForceNumberSql`; `seeded-database.ts` `BASE_TEMPLATE`; `password.ts` `PWNED_RANGE`; `db/bounded-postgres.ts` `TEST_POOL_MAX`; `db-project.mts` `DB_WORKER_CAP`, `dbMaxWorkers`, `dbHarness`, `BOUNDED_POSTGRES_PLUGIN`, `boundedPostgres`; `client-references.mts` `clientReferences` (used by `vitest.config.mts`, so keep).
- **Shared piece:** none; remove or unexport.
- **Guard:** knip with `tests/support/**` in scope (the knip setup).
- **Fix:** confirm each with knip before editing; the `.mts` files are imported by config outside `tests/`, so `grep` over `tests/` alone misses them.
- **Tests covering the callers:** `tests/support` self-tests if any (`tests/guards/story-*`), otherwise none needed.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-149: Case-folded equality and the trim-lowercase fold typed inline

- **Severity:** low
- **Why it matters:** Case-insensitive matching is typed in SQL and in JavaScript in eight places, and the two must agree. If one fold changes, an email or name may match in the database but not in code, so a user is told an address is new, or a duplicate is allowed.
- **Where:**
  - SQL `lower(col) = lower(x)` in `src/db/repository/cupboard-entries.ts:125,126,145,164`, `invitations.ts:102,690`, `memberships.ts:137`; the JS fold `trim().toLowerCase()` in `src/modules/vocabulary/services/curated-values.ts:14` (`foldVocabularyValue`), `ingredients/services/ingredient-rows.ts:770`, `help/services/help-rename.ts:28`, `src/db/repository/grimoire.ts:131`.
- **Shared piece:** a `caseFoldedEq(col, value)` predicate in `predicates.ts` (the raw `sql` is allowed for functions) and a single `foldText` in `src/lib/`.
- **Guard:** none practical.
- **Fix:** add both, switch the eight call sites. The JS and SQL folds must stay equal, so one comment names the pair.
- **Tests covering the callers:** `tests/db/` cupboard, invitation and membership specs; vocabulary and help rename specs.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-150: The `zodResolver` type cast is written six ways

- **Severity:** low
- **Why it matters:** The same resolver cast is written six ways, some using as never, which hides real type errors in forms. A developer changing a form schema can get a form that compiles but submits the wrong shape, so a user sees a failed save.
- **Where:**
  - `SpellBuilder/index.tsx:142` (`as unknown as Resolver<...>`), `GroupedValueForm/index.tsx:190` and `GroupForm/index.tsx:146` (`as unknown as Resolver<X>`), `BusinessCards/index.tsx:31` (`as Resolver<X>`), `HelpArticleForm/form.tsx:144` (`as never`), `{ raw: true }` in `IngredientForm/reference-panel.tsx:339` and `IngredientForm/values.ts:635`.
- **Shared piece:** `typedResolver(schema)` in `src/lib/`. Folds into D-29 if that hook lands.
- **Guard:** a grep guard that `zodResolver(` is imported only in that helper.
- **Fix:** add the helper, replace the six.
- **Tests covering the callers:** the forms' component tests.

- **Extra copies and changes found when merging:**

- `GroupForm/index.tsx:143` and `GroupedValueForm/index.tsx:188`, both `zodResolver(schema) as unknown as Resolver<…Values>`; plus `GroupFormKind.resolver` / `GroupedValueFormKind.resolver` types.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-151: Support sender tier and dialog kind lists typed inline in GraphQL

- **Severity:** low

**Part 1: Support sender tier and dialog kind lists typed inline in GraphQL**

- **Why it matters:** If a support sender tier or dialog kind is added, several lists must change. A missed one makes the GraphQL enum, the repository switch and the keepers' page disagree, so a keeper sees a sender in the wrong tier or an unknown value.
- **Where:**
  - `src/modules/support/graphql/support.ts:67-70` (`['beta_tester','standard']`), `src/modules/support/graphql/support.ts:240-243` (dialog kinds). The tier is also compared as a string in `src/db/repository/support.ts:160` and `src/app/(shell)/keepers/support/reads.ts:126,165`.
- **Shared piece:** a `SUPPORT_SENDER_TIERS` constant and its type in the support module's type-only file, used by the repository switch, the GraphQL enum and the page reads.
- **Guard:** none practical.
- **Fix:** declare once, import in the three places.
- **Tests covering the callers:** `tests/modules/support/`, `tests/db/` support repository specs.

**Part 2: Hand-typed enum and topic lists beside their source types**

- **Why it matters:** Hand-typed lists beside their source types can fall out of step when a value is added. The GraphQL enum then rejects or omits a valid tier, card state or topic, and a signed-out sender sees a topic list that differs from what the server accepts.
  Severity: low
  Copies:
- `src/modules/support/graphql/support.ts:69` (`['beta_tester','standard']`) against `SupportSenderTier` at `support/services/lifecycle.ts:153`
- `SupportDialogKindEnum` against `SupportDialogAnswer['kind']` in `support/types.ts`
- Signed-out topics: `SIGNED_OUT_ABOUTS` (`support/validation/support.ts:~60`), the Forbidden message in `support/services/signed-out.ts`, the GraphQL description at `support/graphql/support.ts:219`, `src/components/SignedOutSupportForm/index.tsx:30`
- `src/modules/identity/graphql/invitation-cards.ts:106-151` (`CARD_STATES`, `ATTEMPT_REASONS`) and `src/modules/identity/graphql/invitations.ts:398-402` (`INVITABLE_SITE_ROLES`)
  Shared piece: export each value tuple from the service or schema file and derive the type and the GraphQL enum from it; build the messages from the tuple.
  Guard: a type-level `satisfies` check on the GraphQL values.
  Fix: single-source each list.
  Tests: `tests/graphql/` schema snapshot (SDL) must stay unchanged.
  Estimate: 1.5 h

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-152: Published document literal built twice; draft-not-found sequence repeated

- **Severity:** low
- **Why it matters:** The published-document shape and the draft-not-found check are written several times. A change to one copy gives a visitor a document missing a field or a keeper a different error message for the same missing draft, depending on which action they used.
- **Where:**
  - `src/modules/documents/services/documents.ts` (~897-927) `currentDocument` and `numberedDocument`; `services/editing.ts` `saveDocumentDraft`, `publishDocumentDraft`, `discardDocumentDraft` (find draft, `NotFound('Draft not found')`, write, `if (!x) throw NotFound('Draft not found')`); `'Draft not found'` 5 times and `'Document not found'` 4 times in the module; `const expire = expireDocuments;` alias in `editing.ts`.
- **Shared piece:** `toPublishedDocument(document, version)`; `NO_DRAFT` / `NO_DOCUMENT` constants; delete the alias.
- **Guard:** none practical.
- **Fix:** extract and replace.
- **Tests covering the callers:** `tests/modules/documents/`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-153: Help module small repeats

- **Severity:** low
- **Why it matters:** The help article spread, the shared limit and the permission check are small repeats. If the limit changes in only one of the two files, search or path results cut off at different points, so a user finds some articles that another view hides.
- **Where:**
  - `withChildren` and `readKeeperHelpArticle` in help-reads.ts both do `const [article, ...answered] = await toHelpArticles([row, ...children], reach); return { ...article, children: answered }`; `PATHS_LIMIT = 2001` in help-reads.ts equals `TERMS_LIMIT = 2001` in marks.ts; `reachOf` in reach.ts uses try/catch around `assertSiteAdmin` and `assertCurator`; help-rename.ts has a local regex `escape`; the `@throws` block of `createHelpArticle` sits above `parseSaying` in help-writes.ts (misplaced).
- **Shared piece:** a `withAnsweredChildren` helper; one shared limit constant; check `src/lib` for an `escapeRegExp` before keeping the local one.
- **Guard:** none practical.
- **Fix:** merge the two spreads; move the JSDoc.
- **Tests covering the callers:** tests/modules/help.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-154: "Until X" / "with no end date" wording built in five places

- **Severity:** low
- **Why it matters:** A change to the pause-end wording must be made in five components. A missed one tells a keeper or sender 'until' a date in one screen and 'with no end date' in another for the same pause, confusing who can write when.
- **Where:**
  - `UserList/until-mark.tsx:15-21`
  - `UserDetail/access-pause-parts.tsx:50-60` (`Until`)
  - `SupportRequests/reply-form.tsx:44-52` (`cannotAnswer`)
  - `SupportSenderRequest/reply-box.tsx:49-58`
  - `SupportPanel/index.tsx:39`
- **Shared piece:** `untilPhrase(until: Date | null, zone)` in `src/lib/utc.ts` returning "until <date>" or "with no end date"; the server-side refusals (`modules/support/services/time-out-refusals.ts`, `lib/pause-note.ts`, `emails/parts/pause-end.ts`) are the same wording again but cannot import a component, so they take the lib function.
- **Guard:** none practical.
- **Fix:** add the function with both phrasings under test, use it in the five components. Server copies are optional.
- **Tests covering the callers:** `tests/components/UserList`, `UserDetail`, `SupportRequests`, `SupportSenderRequest`, `SupportPanel`.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-155: "Back to" link markup: `HelpBackLink` repeats `IngredientEntry/back-link.tsx`'s render and the skeleton rebuilds it

- **Severity:** low
- **Why it matters:** Importing the back chevron across four folders from the ingredient screen means moving or restyling it there breaks help and sign-in screens. A fix to the back link markup reaches only one copy, so help and ingredient pages look or behave differently.
- **Where:**
  - `src/components/HelpArticleView/back-link.tsx:8-26`, `src/components/IngredientEntry/back-link.tsx:84-96`; `BackChevron` is imported across folders from `IngredientEntry/back-chevron.tsx` by `HelpArticleView`, `HelpIndex`, `HelpArticleForm/skeleton.tsx` and `SignInPanel/password-form.tsx`.
- **Shared piece:** move `back-chevron.tsx` and `back-link.scss` to a neutral folder (`src/components/BackLink/`) and have `HelpBackLink` be a thin server wrapper over it. The client `BackLink` with history reading stays.
- **Guard:** none practical.
- **Fix:** move files, update 5 imports. Risk: the scss path.
- **Tests covering the callers:** `tests/components/IngredientEntry/`, `tests/components/HelpArticleView/`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-156: Stand-in user id list and direct `applyAudit(...) as never` inserts

- **Severity:** low

**Part 1: Stand-in user id list and direct `applyAudit(...) as never` inserts**

- **Why it matters:** If the stand-in user list changes in one repository file but not others, system users show up in some lists or counts but not others. Direct audit inserts skip the writer, so a row can be saved without correct audit ids.
- **Where:**
  - stand-in user id list repeated in the repository files that exclude system users; `tx.insert(applyAudit(...) as never)` written directly instead of through the writer in several repository files (see D-182).
  - `invitations.ts:595-611` (card batch insert, `as never` twice), `invitations.ts:624-644` (`recordCardAttempt`, `as never` twice), `workings.ts:196-206` (participant rows, `as never` once in a loop). All of them bypass `insert`/`insertInWorkspace` from the writer.
- **Shared piece:** one exported constant for the stand-in ids; the writer helpers for inserts.
- **Guard:** a grep-based test for `applyAudit(` outside write.ts.
- **Fix:** replace both; check each insert against the writer helper options first.
- **Tests covering the callers:** tests/db repository tests.

**Part 2: `applyAudit(...) as never` written directly in four insert paths**

- **Why it matters:** Each raw insert applies the audit stamp and a type cast by hand, so a developer who changes how audit columns are set will miss these paths and leave card batches, card attempts and working participants without correct created-by or updated-by values.
- Extra copies of D-156.
- **Shared piece:** the writer already has `insert(table, values)`. The raw form exists because card batch and attempt need `returning()` with a multi-row `.values(...)` or an `onConflictDoUpdate`. Two small helpers in `write.ts`: `insertMany(table, rows)` and `upsert(table, row, conflict)`, each doing the `applyAudit` and the cast once. `workings.ts` can use `insertMany`.
- **Guard:** a grep test for `applyAudit(` outside `write.ts` and a short allowlist, as D-156 proposes.
- **Fix:** add the two helpers to `write.ts`; replace the three sites. Risk: `insertMany` must keep the single-statement semantics the card batch relies on.
- **Tests covering the callers:** `tests/db/repository/invitations*.test.ts`, `tests/modules/grimoire/**` working tests.

- **Estimate:** 2.75 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-157: lock-probe.drizzle.config.ts is a false positive; fix the knip config

- **Severity:** low
- **Why it matters:** Knip reports this config file as unused, so a developer who trusts the report may delete it and break the migration lock-timeout test, and the real unused-file list stays noisy enough that genuine dead files go unnoticed.
- **Where:**
  - `tests/support/db/lock-probe.drizzle.config.ts` (knip "Unused files").
- **Verdict:** false positive. `tests/db/migration-lock-timeout.test.ts:13` names it by path (`join(process.cwd(), 'tests/support/db/lock-probe.drizzle.config.ts')`), for drizzle-kit to load. Same pattern as `tests/support/db-runner.ts`, already an `entry`.
- **Shared piece:** none.
- **Guard:** knip itself, once green.
- **Fix:** add `"tests/support/db/lock-probe.drizzle.config.ts"` to `entry` in `knip.jsonc` with a one-line comment ("Loaded by path by drizzle-kit in migration-lock-timeout.test.ts"). Do not delete the file.
- **Tests covering the callers:** `tests/db/migration-lock-timeout.test.ts`.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-158: Unique-index names and their race handling repeated as string literals

- **Severity:** low
- **Why it matters:** If someone mistypes or renames a unique-index name in one literal, a double-submit race falls through as a raw database error shown to the user instead of the friendly refusal, and no test fails to warn the developer.
- **Where:**
  - `'ingredient_variants_form_unique'` in `src/modules/ingredients/services/ingredient-rows.ts:805` and `src/modules/vocabulary/services/ingredient-form-values.ts:164` (the schema declares it at `ingredients/schema/ingredient-variants.ts:42`); `'inventory_items_workspace_id_variant_id_unique'` in `ingredients/services/stock.ts:78,216` with the same `HELD` refusal, differing only in the error path; `'workspaces_slug_unique'` and `'workspace_slugs_slug_unique'` (D-33).
- **Shared piece:** export the index names from the schema files and compare against the constants; a `refuseHeldVariant(path)` helper in `stock.ts` for the two copies.
- **Guard:** a typo in a literal means a race falls through as a raw database error, with no failing test.
- **Fix:** export constants beside the table definitions (`cupboard-entries.ts` already does this with `ENTRY_INDEX` and `LABEL_INDEX`), use them in the five places.
- **Tests covering the callers:** `tests/modules/ingredients/` stock and ingredient-row race specs.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-159: User search: name-or-email test, and the three-way system-user exclusion

- **Severity:** low
- **Why it matters:** If a fourth stand-in user is added to the system-actor file but only one of the two lists is updated, that fake account shows up in the keeper user search or in document mailing, where a keeper could see or email it as a real person.
- **Where:**
  - Stand-in user ids: `users.ts:43-49` (`listedUsers`, three `ne`s) and `documents.ts:224` (`STAND_INS`, the same three ids as an array). This is an extra copy of D-156's "stand-in user id list".
  - `support.ts:129`, `311`, `510`, `810` and `users.ts:47` each test one of the three ids (only `SYSTEM_ACTOR_ID`) in their own way.
- **Shared piece:** export one `STAND_IN_USER_IDS` array from `src/lib/system-actor.ts` (where the three ids live), and have `users.ts` use `notInArray(users.id, STAND_IN_USER_IDS)` and `documents.ts` use the same array.
- **Guard:** a unit test that every id exported from `system-actor.ts` appears in `STAND_IN_USER_IDS`. Adds a safeguard for a fourth stand-in being added to the file but not the list.
- **Fix:** add the array; swap two uses. Nothing else.
- **Tests covering the callers:** `tests/db/repository/users*.test.ts`, `tests/modules/documents/**`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-160: Admin shared files live in `curator/` and the keepers area imports them across the sibling boundary

- **Severity:** low
- **Why it matters:** Keepers pages depend on files inside the curator area, so a developer changing a curator-only layout or helper can silently break the keepers screens, and the split between the two admin areas is unclear to anyone reading the folders.
- **Where:**
  - `keepers/layout.tsx:12` imports `AdminLayoutProps` from `../curator/types`; `keepers/(invitations)/layout.tsx` and `keepers/(people)/layout.tsx` import `../../curator/tabbed-layout`; keepers pages import `readListPlace`, `readOrMissing`, `MissingNotice`, `AddAction`, `NoAction` from curator files (for example `keepers/help/page.tsx:30` imports `../../curator/add-action`).
- **Shared piece:** move `tabbed-layout`, `list-page` helpers, `add-action`, `missing-notice` and `AdminLayoutProps` to `src/app/(shell)/_admin/` (or `src/components/AdminNav/`).
- **Guard:** an import-boundary test: nothing under `keepers/` imports `curator/` and the reverse.
- **Fix:** move files, update imports. Could break: nothing at runtime; many import lines.
- **Tests covering the callers:** `npm run typecheck`; any test importing these files.

- **Estimate:** 2 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-161: `TABLET_BAND` and its `useSyncExternalStore` subscription written in both PageNav and SectionNav

- **Severity:** low
- **Why it matters:** If the phone width changes, a developer must find and edit the same media-query code in several components; a missed one makes the page nav and section nav switch layout at different widths, so a tablet user sees mismatched menus.
- **Where:**
  - `src/components/PageNav/index.tsx:28-39` and `src/components/SectionNav/section-links.tsx:29-40`: identical `TABLET_BAND`, `subscribeToBand`, `inTabletBand`, `inTabletBandNever`. `src/components/DateRangeField/index.tsx:41` and `src/components/FacetPanel/shell.tsx:157` do the same `matchMedia` read for other widths.
- **Shared piece:** `useMediaQuery(query)` (via `useSyncExternalStore`, server snapshot false) in `src/lib/use-media-query.ts`; the `40.01rem` width stays tied to `$shell-phone-width` in a single constant.
- **Guard:** none practical.
- **Fix:** write the hook, use it in PageNav and SectionNav (and optionally FacetPanel, DateRangeField).
- **Tests covering the callers:** `tests/components/PageNav/`, `tests/components/SectionNav/`.

- **Extra copies and changes found when merging:**

- `src/components/SectionNav/section-links.tsx` holds `TABLET_BAND` (already named in D-161 as a candidate; confirmed as a copy).

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-162: "Deleted account" and "Signed-out sender" literals repeated across the support screens

- **Severity:** low
- **Why it matters:** If the wording of Deleted account or Signed-out sender is changed in one place, keepers see different labels for the same sender on the list, the detail view and the privilege ledger.
- **Where:**
  - `src/components/SupportRequests/index.tsx:77`, `SupportRequests/sender-name.tsx:28-29`, `SupportRequests/detail.tsx:84,121-122,132`, `src/components/PrivilegeLedger/index.tsx:42`.
- **Shared piece:** two constants (`DELETED_ACCOUNT`, `SIGNED_OUT_SENDER`) and a `senderLabel(request)` in `src/components/SupportRequests/` (a type-free `labels.ts`); `PrivilegeLedger` can import `DELETED_ACCOUNT`.
- **Guard:** none practical.
- **Fix:** add `labels.ts`; replace the six literals.
- **Tests covering the callers:** `tests/components/SupportRequests/`, `tests/components/PrivilegeLedger/`.

- **Extra copies and changes found when merging:**

The "Deleted account" and "Signed-out sender" literals: `SupportRequests/index.tsx:77`, `SupportRequests/detail.tsx:84,121-122,132`, `SupportRequests/sender-name.tsx:28-29`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-163: `pageshow` "restored from the back-forward cache" effect written three times

- **Severity:** low
- **Why it matters:** A fix to the back-forward cache handling, such as a sign-in form left stuck after the browser Back button, must be repeated in three components; a missed one leaves a user with a frozen or stale panel when they press Back.
- **Where:**
  - `src/components/SignInPanel/index.tsx:87-93`, `src/components/SignInMethods/index.tsx:53-59`, `src/components/ListFrame/index.tsx:67-73`. The same listener also lives in `src/lib/navigation/store.ts:25-35`.
- **Shared piece:** `useRestoredFromCache(onRestore: () => void)` in `src/lib/` (next to `src/lib/navigation/`), wrapping the `event.persisted` check, add and remove.
- **Guard:** none practical beyond a grep test for `'pageshow'` outside the hook.
- **Fix:** add the hook, replace the three effects. ListFrame's effect is conditional on `leaving`; the hook takes an `enabled` flag.
- **Tests covering the callers:** `tests/components/SignInPanel/*`, `tests/components/SignInMethods/*`, `tests/components/ListFrame/*`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-164: Calendar-day regex `/^\d{4}-\d{2}-\d{2}$/` written three times

- **Severity:** low
- **Why it matters:** If the date format check is tightened or loosened in one place, the record-working form, card filters and invitation-card validation accept different dates, so a keeper could enter a day one screen allows and another rejects.
- **Where:**
  - `src/components/RecordWorking/form.tsx:91`, `src/components/AdminCards/filter-params.ts:8`, `src/modules/identity/services/invitation-cards.ts:42`. `src/components/DateField/calendar.tsx:12` is the same pattern with capture groups.
- **Shared piece:** one `DAY_PATTERN` / `isCalendarDay()` in `src/lib/` (a date helper if one exists; the DateField calendar's parser could export it). `src/modules/**` may import from `src/lib/`.
- **Guard:** none practical.
- **Fix:** export once, import in the four places. The regex only checks shape, not that the date exists; each caller keeps its own range check.
- **Tests covering the callers:** `tests/components/RecordWorking/*`, `tests/components/AdminCards/*`, `tests/modules/identity/*invitation-cards*`, `tests/components/DateField/*`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-165: Dead CSS

- **Severity:** low
- **Why it matters:** Unused CSS rules stay in the shipped stylesheet, mislead developers into thinking a heading or divider still exists, and hide a custom property that is set but never read, so nobody can tell what is safe to delete.
- **Where:**
  - `src/components/HelpWidget/index.scss:62-64`: `.help-widget__heading` (no TSX use).
  - `src/components/SignInPanel/index.scss:126-~140`: `.sign-in-panel__divider` with its `&::before` and `&::after` (no TSX use).
  - `src/components/IngredientCard/_compact.scss:33`: custom property `--forms-gap`, set but never read.
- **Shared piece:** none; delete.
- **Guard:** none practical; modifier classes are built in TSX templates, so a static unused-class check gives false positives (see rejected).
- **Fix:** delete the three; re-run the dead scan after (`css-deadraw.txt` is the raw, unfiltered list).
- **Tests covering the callers:** component tests of HelpWidget, SignInPanel, IngredientCard.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-166: three guards each carry their own recursive file walker beside the shared `inject('repoFiles')` listing

- **Severity:** low
- **Why it matters:** These three guards walk the file tree themselves, so if the shared repo listing changes which folders it covers, they keep checking a different set of files and a real violation in a skipped folder passes unnoticed.
- **Where:**
  - `tests/guards/workflow-run-interpolation.test.ts:15-21` (`yamlFiles`, recursive `readdirSync`), `tests/guards/skeletons.test.ts:37-42` (`pages()`, recursive `readdirSync`), `tests/guards/soft-delete-finder-guard.test.ts:36` (`readdirSync` of the repository directory). 20 of the guards that read files already use `inject('repoFiles')`.
- **Shared piece:** `inject('repoFiles')` (check that its listing includes `.github/` and `src/app`; if `.github/` is excluded, add it in the global setup rather than walking).
- **Guard:** the existing guards stay.
- **Fix:** replace the three walkers with a filter over `inject('repoFiles')`, keeping each guard's precondition that the listing holds a known file.
- **Tests covering the callers:** the three guards.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-167: Distinct linked ingredient ids derived twice

- **Severity:** low
- **Why it matters:** If the rule for which ingredients a spell links to changes in one file, the spell read and the step view disagree, so a user could see an ingredient in the recipe that is missing from the step list, or the reverse.
- **Where:**
  - `src/modules/grimoire/services/spell-reads.ts` (~819-821); `step-views.ts` (~1217-1219); similar variant-id derivation in `workings.ts` `planFor`.
- **Shared piece:** `linkedIngredientIds(steps)` in `services/` of grimoire.
- **Guard:** none practical.
- **Fix:** extract; use in both.
- **Tests covering the callers:** spell-reads and step-views tests.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-168: Cosmetic and stale comments

- **Severity:** low
- **Why it matters:** Stale and misplaced comments describe the wrong function or claim modules are internal when they are exported, so a developer trusts wrong information, and two key types with one meaning can drift apart.
- **Where:**
  - `types.ts` orphan JSDoc before `FolkNameRow` (about 154-155); `CupboardEntryKey` and `StockKey` have the same shape (two types, one meaning); `services/ingredient-children.ts` stale comment "The proof for one coven..." above `byName` (about 2393); the `ingredients/index.ts` header says `graphql/*`, `loaders/*` and `services/*` are internal but the barrel exports them.
- **Shared piece:** one `CoveningRef` type for the two keys (name it `WorkspaceIngredientKey`).
- **Guard:** none practical.
- **Fix:** delete the stale comments; unify the key type.
- **Tests covering the callers:** type-check.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-169: Mixed deep-relative and `@/` imports across `src/app`

- **Severity:** low
- **Why it matters:** Files mix long relative paths and the @ alias, so moving a file silently breaks its relative imports and developers cannot tell at a glance which module an import comes from.
- **Where:**
  - for example `src/app/access-paused/page.tsx` and `src/app/i/[token]/page.tsx` import `'../../components/...'` and `'../../../lib/...'` beside `@/components/PageFrame` in the same file; `forgot-password/page.tsx` does the same.
- **Shared piece:** the `@/` alias, which the rest of the codebase uses.
- **Guard:** an oxlint rule restricting `../../` imports in `src/app/**`.
- **Fix:** mechanical rewrite with the lint rule's autofix. Cosmetic.
- **Tests covering the callers:** none needed beyond the typecheck.

- **Extra copies and changes found when merging:**

- Almost every file here mixes `../../../../../components/...` and `@/modules/...` (for example `keepers/help/page.tsx:3-29`, `keepers/help/form-choices.ts:4-12`, `keepers/help/[id]/page.tsx:4-13`, `curator/value-page.tsx`).

- `(public)`: `support/page.tsx`, `support/request/page.tsx`, `layout.tsx`, `not-found.tsx`, the four document pages, `compendium/page.tsx`, `compendium/opengraph-image.tsx`, `compendium/ingredients/[slug]/{page,cupboard,opengraph-image}.tsx`.
- `(shell)`: `layout.tsx`, `error.tsx`, `forbidden.tsx`, `not-found.tsx`, `coven/page.tsx`, `coven/new/page.tsx`, `coven-paused/[slug]/page.tsx`, all `account/` pages, `coven/[slug]/{layout,page}.tsx`, `(people)/*`, `ingredients/{page,reads,types,viewed-details}.tsx`, `ingredients/[id]/page.tsx`.
- `api`: `api/auth/[...all]/route.ts` (`../../../../lib/auth`), `api/graphql/route.ts` (six `../../../graphql/*`).
- `invite/[token]/invitation-panel.tsx` (six `../../../components|lib/*`).

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-170: The mail glue repeats `${origin}/<path>` three times in one file

- **Severity:** low
- **Why it matters:** If a public page path changes, such as the support or sign-in route, a developer must edit each mail builder; a missed one sends users an email with a link that leads to a missing page.
- **Where:**
  - `src/lib/pause-job-mail.ts:15,24,33` each build `` `${origin}/support` ``; `src/lib/account-notice-mail.ts` and `invitation-link-mail.ts` build `${origin}/sign-in`, `${origin}/forgot-password` and `${origin}/invite/<token>` the same way.
- **Shared piece:** a local `const SUPPORT_URL = (origin) => ...` in `pause-job-mail.ts`, or reuse `SUPPORT_LIST_PATH`/`support-path.ts`.
- **Guard:** none.
- **Fix:** optional; the paths are one-liners.
- **Tests covering the callers:** `tests/lib/*-mail.test.ts`.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-171: Help back-bar markup is written in both help form pages, and the edit page repeats the not-found catch

- **Severity:** low
- **Why it matters:** If the Help back bar or the not-found handling changes in one form page, the new and edit pages differ, so a keeper could get a working back link on one and a raw error instead of a not-found page on the other.
- **Where:**
  - `keepers/help/new/page.tsx:26-29` and `keepers/help/[id]/page.tsx:47-50` (`<main className="help-article-page"><div className="back-bar help-article-form__bar"><BackLink href label="Help" /></div>`); `keepers/help/[id]/page.tsx:15-22` hand-writes `catch (error) { if (error instanceof NotFound) notFound(); throw error; }`.
- **Shared piece:** a `HelpArticlePage` wrapper in `src/components/HelpArticleForm/` taking `returnHref` and children; for the catch, `readOrMissing` from `curator/list-page.tsx` (extra copy of D-16; the same catch is also at `keepers/documents/[key]/page.tsx:16-19` and `keepers/support/reads.ts:144-150`).
- **Guard:** none practical.
- **Fix:** extract the wrapper; replace the three catches with the D-16 helper once it exists.
- **Tests covering the callers:** keepers help e2e spec.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-172: `readLedgerPage` and `cursorOf` are one-caller wrappers

- **Severity:** low
- **Why it matters:** The one-caller wrappers and a filter object written out three times make the users page harder to read, and a developer adding a filter must update every copy, or one view of the list ignores it.
- **Where:**
  - `keepers/(people)/privilege-changes/page.tsx:30-41` (`readLedgerPage`, one caller); `keepers/(people)/users/page.tsx:87-90` (`cursorOf`, see D-78); the filter object `{ query, awaitingApproval, role, timedOut, paused }` is written out at `users/page.tsx:57,129,139`.
- **Shared piece:** inline `readLedgerPage`; build `filter` once in `users/page.tsx` and pass it.
- **Guard:** none.
- **Fix:** inline and hoist. Could break: nothing.
- **Tests covering the callers:** keepers users and privilege-changes e2e specs.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-173: Identical `revokeInvitation` mutation document written twice, and three `RemoveControl` names

- **Severity:** low
- **Why it matters:** The same revoke mutation and near-identical controls exist twice, so a fix to confirmation wording or error handling reaches only one, and three components share a name, making stack traces and searches ambiguous for a developer.
- **Where:**
  - `PendingInvitations/remove-control.tsx:9-15` (`RemoveDeclinedInvitation`) and `PendingInvitations/revoke-control.tsx:9-15` (`RevokeInvitation`): same `revokeInvitation(workspaceId, id) { id }`. Both components are the same `ConfirmedAction` call with 7 changed strings. Also `MemberList/remove-control.tsx` (default export named `RemoveControl`, as is the PendingInvitations one).
- **Shared piece:** one `RevokeInvitationDocument` in `PendingInvitations/` (or `src/lib` document file) and one `InvitationRowAction` taking `{ declined }` that picks the copy. Rename the default exports so grep and stack traces tell them apart.
- **Guard:** none practical.
- **Fix:** merge into one control with a copy table keyed by `declined`; update importers in `PendingInvitations/index.tsx`.
- **Tests covering the callers:** tests/components/PendingInvitations.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-174: Icon-only button boilerplate and SVG wrappers

- **Severity:** low
- **Why it matters:** Each icon and icon-button repeats the same accessibility attributes, so if one is wrong or changed, a screen-reader user hears a different or missing label on some icons, and a developer must edit each one.
- **Where:**
  - `icon-tip__edit--plain` button markup in `SpellPreview/index.tsx` and `SpellRecipe/print-button.tsx`
  - `<svg viewBox aria-hidden focusable="false">` with a stroked path in `UserList/icons.tsx:7-35`, `SpellWorkings/supply-icon`, `SourcingScore` `Glyph`, `StockBadge` `StockIcon`
- **Shared piece:** `IconTip/icon-button.tsx` and `IconTip/icons.tsx` already exist; use `IconButton` for the two buttons and add a small `Icon({ path })` wrapper in `IconTip/icons.tsx` for the four stroked icons.
- **Guard:** none practical.
- **Fix:** add the wrapper with the stroke defaults, convert the icons, delete the repeated attributes.
- **Tests covering the callers:** `tests/components/IconTip`, `UserList`, `StockBadge`, `SourcingScore`.

- **Extra copies and changes found when merging:**

src/components/IconTip/icons.tsx, five new icons (see D-222).

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-175: document-order assertions via compareDocumentPosition repeated in new tests

- **Severity:** low
- **Why it matters:** The same document-order check is written inline in many tests, so if its bit logic is wrong in one, that test can pass when elements are in the wrong order, and a developer has to fix every copy.
- **Where:**
  - `compareDocumentPosition(...) & Node.DOCUMENT_POSITION_FOLLOWING` in the new SignInPanel tests; also in `tests/app/(shell)/coven-paused/page.test.tsx`, `tests/components/SafetyNote/index.test.tsx`, `tests/components/SupportSenderRequest/index.test.tsx` and other older tests.
- **Shared piece:** `expectBefore(a, b)` in `tests/support/interact.tsx`.
- **Guard:** none practical.
- **Fix:** add the helper, replace the inline expressions.
- **Tests covering the callers:** the files listed.

- **Estimate:** 0.75 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-176: AddIngredientButton has an orphaned doc comment

- **Severity:** low

**Part 1: AddIngredientButton has an orphaned doc comment**

- **Why it matters:** A doc comment sits above the wrong function, so a developer reading the code is told the wrong function does what the comment says and has two comments stacked on one function.
- **Where:**
  - src/components/AppShell/add-ingredient-button.tsx:31-35. The JSDoc "A sentence for what a save left behind" sits above `onCuratedPage` instead of `savedMessage` (line 42), so two comments stack on the wrong function.
  - CompendiumList/live-facets.ts:167-171 (comment about `held` while `enabled` sits above `withListing`, not `useLiveFacets`). Same shape as D-176.
- **Shared piece:** none.
- **Guard:** none.
- **Fix:** move lines 31-34 to above `savedMessage`.
- **Tests covering the callers:** none needed (comment only).

**Part 2: Orphaned JSDoc above the wrong function in live-facets.ts**

- **Why it matters:** A comment about held facets sits above the wrong function, so a developer reading live-facets is misled about what the hook does and where its enabled flag comes from.
- **Shared piece:** none; move the comment.
- **Guard:** none practical.
- **Fix:** move or delete the comment.
- **Tests covering the callers:** none needed.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-177: Button reset re-implemented

- **Severity:** low
- **Why it matters:** The sign-in panel writes its own button reset, so if the shared button reset changes, such as its focus style or colour inheritance, this one button looks or behaves differently from every other reset button.
- **Where:**
  - `src/components/SignInPanel/index.scss:144` writes `padding: 0; border: 0; background: none; font-family: inherit; cursor: pointer` instead of `@include button-reset` (`src/scss/_mixins.scss:180`).
- **Shared piece:** existing `button-reset`.
- **Guard:** none practical.
- **Fix:** include the mixin, keep `align-self` and `font-size`. Risk: the mixin also sets `margin: 0`, `color: inherit` and `line-height: inherit`.
- **Tests covering the callers:** SignInPanel component test.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-178: Declaration written twice in one block

- **Severity:** low
- **Why it matters:** Each block holds a declaration twice, and nobody knows whether the first is a deliberate fallback; a developer may remove the wrong line or leave a redundant one that old browsers no longer need.
- **Where:**
  - `src/components/FacetPanel/index.scss:77,81` (`overflow: hidden`, then `overflow: clip`); `src/scss/_primitives.scss:1089-1090` (`content: attr(data-label)`, then `content: attr(data-label) / ''`).
- **Shared piece:** none.
- **Guard:** stylelint `declaration-block-no-duplicate-properties` with `ignore: ['consecutive-duplicates-with-different-syntax']` would pass these as fallbacks; if they are deliberate fallbacks, add a comment instead. Baseline Widely Available may already make the first line redundant.
- **Fix:** check `package.json` `browserslist`; delete the fallback line if `overflow: clip` and the `content` alt-text form are inside the floor.
- **Tests covering the callers:** none for CSS.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-179: Inline result type repeated as a GraphQL ref type

- **Severity:** low
- **Why it matters:** The document update result and the GraphQL document type describe the same shape separately, so if a field is added to one, the API returns data the service did not produce, or the service gains a field the API drops.
- **Where:**
  - `src/modules/documents/services/editing.ts` `updateDocument` inline `{id, title, lede}`; `graphql/documents.ts` `DocumentRef` (~69-78).
- **Shared piece:** a named type in `documents/types.ts`.
- **Guard:** none practical.
- **Fix:** name it once; import in both.
- **Tests covering the callers:** documents tests.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-180: Blank-query handling differs between the lookups

- **Severity:** low
- **Why it matters:** A blank search returns nothing from two lookups but may return every common name from the third, so a user typing then clearing a search sees an unexpected full list in one place and an empty one in another.
- **Where:**
  - `services/duplicates.ts` and `findCompendiumMatches` return `[]` on a blank trimmed query; `services/common-names.ts` passes `query.trim()` straight to the repository.
- **Shared piece:** none needed; decide one rule and put the guard in the repository finder or in each service.
- **Guard:** none practical.
- **Fix:** read the repository finder for a blank string; if it returns everything, add the guard.
- **Tests covering the callers:** common-names service tests.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-181: GraphQL `tierScope` written twice

- **Severity:** low
- **Why it matters:** The tier scope function is written in two GraphQL files, so a change to which tiers a reference or promoted folk name may use, made in one, leaves the other applying the old rule and sets different scope checks for the same input.
- **Where:**
  - `graphql/promote-folk-name.ts:10-11` and `graphql/references.ts:134-135` (identical).
- **Shared piece:** `tierScope` exported from `graphql/references.ts` or a `graphql/tier-scope.ts`.
- **Guard:** none practical.
- **Fix:** move and import.
- **Tests covering the callers:** `tests/db/graphql-query-scopes.test.ts`, reference and promote tests.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-182: Repeated live-row lookups in repository workspace-slugs and provisional users

- **Severity:** low
- **Why it matters:** The same lookup and lapse test are written several times in the repository, so if the soft-delete filter or the lapse rule changes, a missed copy lets a deleted workspace be found or a provisional account lapse at the wrong time.
- **Where:**
  - src/db/repository/workspace-slugs.ts:1294-1297, :1341-1344, :1362-1365 each `selectOne(workspaces, and(notSoftDeleted(workspaces), eq(workspaces.id, X)))`; src/db/repository/provisional-users.ts:985-989 and :1035-1038 repeat the `or(lt(updatedAt, now()-lifetime), lt(createdAt, now()-cap))` lapse test; admin-roles.ts and user-access-pauses.ts/workspace-member-pauses.ts repeat `.insert(table).values(applyAudit('insert', ..) as never).onConflictDoNothing().returning()`.
- **Shared piece:** `findWorkspaceById` local helper; `lapsed(lifetime, cap)` in provisional-users.ts; an `insertIgnoringConflict` in the writer context.
- **Guard:** none practical.
- **Fix:** local helpers.
- **Tests covering the callers:** tests/db and tests/modules/identity, coven.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-183: Grimoire categories are mapped to `CardCategory[]` twice

- **Severity:** low
- **Why it matters:** The same category mapping is written in two files, so if the shape of a card category changes, the grimoire list and the recipe page show different or missing category chips for the same spell.
- **Where:**
  - `src/app/(shell)/coven/[slug]/grimoire/(list)/reads.ts:~60-66`
  - `src/app/(shell)/coven/[slug]/grimoire/recipe-read.ts:~38-44`
  - Both do `byId.get(id)` then `[{ category: { id, name }, group }]` inside a `flatMap`. The two files also import `CardCategory` from different modules (`IngredientCard/types` vs `CategoryChips/types`; the first re-exports the second).
- **Shared piece:** `cardCategoriesOf(assigned, known)` in `src/app/compendium-reads.ts` (it already exports `readCardCategoriesOf`; check whether that covers it).
- **Guard:** none practical.
- **Fix:** one function; import the type from `CategoryChips/types` everywhere.
- **Tests covering the callers:** `tests/app/(shell)/coven/[slug]/*`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-184: The demo notice's text choice is written twice

- **Severity:** low
- **Why it matters:** The demo notice text is picked by a nested condition in two places, so if the notice for an Observer or Practitioner is reworded in one, users see different messages on the coven page and the spell page.
- **Where:**
  - `src/app/(shell)/coven/[slug]/layout.tsx:64-67`
  - `src/app/(shell)/coven/[slug]/grimoire/[id]/page.tsx:~180-186` (nested ternary on `workspace.demo` and role)
- **Shared piece:** `demoNoticeFor(role)` in `src/lib/demo-notice.ts`.
- **Guard:** none practical.
- **Fix:** one function that returns the text for a role.
- **Tests covering the callers:** `tests/app/(shell)/coven/[slug]/layout.test.tsx`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-185: Narrow-panel page scaffold repeated in Create Coven and Access Paused

- **Severity:** low
- **Why it matters:** The page scaffold is repeated across screens, so a change to the narrow panel layout, such as spacing or the context row, is applied to some pages and missed on others, and users see mismatched page frames.
- **Where:**
  - `src/app/(shell)/coven/new/page.tsx:~35-50`
  - `src/app/(shell)/coven-paused/[slug]/page.tsx`
  - Both write `<ContextRow lead={<WorkspaceSwitcher workspaces canCreate />} /><PageFrame narrow><div className="page-frame__section panel"><PageHeader .../>`; `account/email` and `account/terms` use `PageFrame narrow` plus a panel without the context row. The skeletons repeat it through `SkeletonContextRow`.
- **Shared piece:** `NarrowPanelPage` component (`ContextRow` optional).
- **Guard:** none practical.
- **Fix:** extract after D-49 so the head constants exist.
- **Tests covering the callers:** `tests/app/(shell)/coven/new/*`, `tests/app/(shell)/coven-paused/*`, `tests/app/(shell)/account/*`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-186: Password-section message constants are exported and compared in tests, but the client `STALE_SESSION` wording differs from the server's

- **Severity:** low
- **Why it matters:** Two constants share the name STALE_SESSION but hold different sentences, so a developer who searches for it may edit the wrong message, and a user could see the wrong prompt when a recent sign-in is needed.
- **Where:**
  - `src/components/PasswordSection/two-factor.tsx:32-33` (`STALE_SESSION = 'Turning two-factor off needs a recent sign-in...'`) and `src/modules/identity/services/password.ts:11` (`STALE_SESSION`, a different sentence for setting a password). Same name, different meaning, two places.
- **Shared piece:** none; rename the client one to `STALE_SESSION_TURN_OFF` (or keep it private) so a grep for `STALE_SESSION` is not misleading. `tests/components/PasswordSection/two-factor.test.tsx` imports it.
- **Guard:** none practical.
- **Fix:** rename.
- **Tests covering the callers:** `tests/components/PasswordSection/two-factor.test.tsx`.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-187: `.invalid` placeholder-address check is a literal in `PasswordSection/index.tsx` twice and in `lib/email-address.ts`

- **Severity:** low
- **Why it matters:** The check for placeholder addresses is a string literal in three places, so if the placeholder domain changes, some screens treat a fake address as real and show a user an email they never entered.
- **Where:**
  - `src/components/PasswordSection/index.tsx:166` and `:209` (`email && !email.endsWith('.invalid')`), `src/lib/email-address.ts:22` (`email.endsWith('.invalid')`).
- **Shared piece:** `isPlaceholderAddress(email)` exported from `src/lib/email-address.ts`; the component computes it once (`const real = email && !isPlaceholderAddress(email)`).
- **Guard:** a grep for `endsWith('.invalid')` outside `email-address.ts`.
- **Fix:** add helper; use it in the three places. `email-address.ts` is imported by server code, so check it is safe for a client import (no `server-only`).
- **Tests covering the callers:** `tests/components/PasswordSection/`, `tests/lib/email-address.test.ts`.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-188: Two copies of the 99-cap count text

- **Severity:** low
- **Why it matters:** The 99+ cap is defined twice, so if the cap or wording changes in one place, the tab counts and the account menu counts show different numbers or text for the same count to a user.
- **Where:**
  - `TabbedPage/tab-links.tsx:13,93,96` and `AccountMenu/counts.ts:3-15`.
- **Shared piece:** `AccountMenu/counts.ts` already exports `COUNT_CAP`; TabbedPage declares its own `COUNT_CAP = 99` and repeats the "99+" and "more than 99" logic. Move both to `FacetCount` (it already shows the number) as a `capped` helper.
- **Guard:** none practical.
- **Fix:** export `cappedCount(count)` and `cappedWords(count)` from one file, delete the local constant.
- **Tests covering the callers:** `tests/components/TabbedPage`, `AccountMenu`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-189: Spell card face and burn markup repeated in SpellCard and SpellPreview

- **Severity:** low
- **Why it matters:** The spell card face and burn layers are rebuilt in the preview, so a design change to the card applies to the real card but not the preview, and a user sees a preview that does not match the saved card.
- **Where:**
  - `SpellCard/frame.tsx:25-42` and `SpellPreview/index.tsx:66-91`.
- **Shared piece:** `SpellCard/frame.tsx` exports the frame; SpellPreview should render through it rather than rebuild the face and burn layers.
- **Guard:** none practical.
- **Fix:** compare the two blocks; if only wrapper classes differ, pass them as props.
- **Tests covering the callers:** `tests/components/SpellCard`, `SpellPreview`.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-190: DemoNotice and CovenFacts both derive the destination coven from `useNavigationState`

- **Severity:** low
- **Why it matters:** Both components work out the destination coven from the link in their own copy, so if the path rules change, the demo notice and coven facts point at different covens while a user is navigating.
- **Where:**
  - `DemoNotice/index.tsx:12` and `CovenFacts/index.tsx:27`, both `covenSlugOf(href.split(/[?#]/)[0] ?? href)`.
- **Shared piece:** `destinationCovenSlug(href)` in `src/lib/coven-path.ts`, which strips the query and hash itself.
- **Guard:** none practical.
- **Fix:** add the function, call it from both. No behaviour change.
- **Tests covering the callers:** `tests/components/DemoNotice/`, `tests/components/CovenFacts/`, `tests/lib/coven-path*`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-191: "Pick a coven, then Continue" modal written twice in IngredientEntry

- **Severity:** low
- **Why it matters:** The "pick a coven, then Continue" modal is written twice in IngredientEntry, about 25 lines each. A fix to its wording, focus handling or the continue step lands in one copy, and users meet different behaviour depending on the button they used.
- **Where:**
  - `src/components/IngredientEntry/annotate-picker.tsx:25-52` (Modal, `.form`, `CovenChoice`, Continue/Cancel, default-coven lookup)
  - `src/components/IngredientEntry/edit-stock.tsx:48-68` (same JSX; same `places.find(default) ?? places[0]` lookups at `:35-37`)
- **Shared piece:** `CovenPickModal({ title, places, defaultWorkspaceId, onContinue(place), onClose, returnTo })` in `IngredientEntry/`. Both callers keep their own next step (open the annotate route, or show the stock dialog).
- **Guard:** none practical.
- **Fix:** extract; `chosen` state and the actions row move into it.
- **Tests covering the callers:** IngredientEntry component tests, e2e specs for Annotate and Edit Stock from a compendium entry.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-192: SignInDialog restates the sign-in card padding and the phone-column pattern

- **Severity:** low
- **Why it matters:** The padding and the phone stacking are restated in two components, so a design change to one sign-in card leaves the other with different spacing, and a user sees mismatched cards on a phone.
- **Where:**
  - src/components/SignInDialog/index.scss (`padding: space(5) space(6) space(6)`), src/components/SignInPanel/index.scss (same padding), src/components/SignInDialog/index.scss `.sign-in-dialog__inbox` and src/components/InvitationAcceptance/index.scss `.invitation-acceptance__row` (column on a phone)
- **Shared piece:** a token or mixin for the card padding; a mixin for "row that stacks on a phone" if one does not exist in `_mixins.scss`.
- **Guard:** none.
- **Fix:** introduce `$sign-in-card-padding` and reuse; check `_mixins.scss` for an existing stack mixin first.
- **Tests covering the callers:** SignInDialog and InvitationAcceptance stories.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-193: the sign-in-provider assertion block is repeated

- **Severity:** low
- **Why it matters:** The same provider assertions are written in two tests, so a change to the sign-in dialog providers must be edited in both, and a missed one fails or silently stops checking what it claims to.
- **Where:**
  - the Google-enabled and Discord `aria-disabled` assertion block in `tests/components/PublicFrame/index.test.tsx` and `tests/app/(public)/layout.test.tsx`.
- **Shared piece:** `expectSignInDialogProviders()` in `tests/support/links.ts` or `interact.tsx`.
- **Guard:** none practical.
- **Fix:** extract the block.
- **Tests covering the callers:** both files.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-194: Literal spacing where a token exists

- **Severity:** low
- **Why it matters:** A hard-coded gap sits where a spacing token exists, so if the spacing scale changes, this row keeps the old gap and the step list looks uneven to a user.
- **Where:**
  - `src/components/StepRow/index.scss:4` (`gap: 0.5rem`, equals `space(2)`).
- **Shared piece:** `space(2)`.
- **Guard:** stylelint `declaration-property-value-allowed-list` for `gap` and `padding` needing `space(`; not practical to enable repo-wide without a sweep.
- **Fix:** replace. No other hard-coded hex, radius or colour was found outside `_variables.scss`.
- **Tests covering the callers:** StepRow component test.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-195: Config entries to correct, and a blind spot

- **Severity:** low
- **Why it matters:** A stale knip setting stays in the config, and the dead-code scan has a blind spot where unused exports in entry-like files such as auth.ts are never reported, so real dead code goes unnoticed.
- **Items:**
  1. `knip.jsonc` `ignoreBinaries: ["flock"]` is stale: knip's own hint says remove it, and a run without it reports no unlisted `flock` (knip does not read `scripts/with-lock.sh`, which is the only caller). Remove it.
  2. Entries and ignores I tested by removing them and they ARE needed: `tests/support/db-runner.ts`, `tests/e2e/workshop/every-story.check.ts`, `tests/**/*.type-check.ts`, `tests/support/*-reporter.ts`, `ignoreUnresolved` (deploy.yml `--require` list), `ignoreDependencies: ["server-only"]` (162 unlisted-dependency hits without it; it is a Next-provided import, not an npm dependency), `ignore: [".storybook/public/mockServiceWorker.js"]` (generated). The run with all entries removed also flagged `.design-sync/dist-index.mjs` in `ignore` as removable, but that run had `.design-sync/**` removed from `entry` too, so it is inconclusive; check in the fix lane by removing only that line.
  3. `ignoreIssues` for `.design-sync/remote-chromium.mjs: ["unlisted"]` could not be shown stale or live (same reason). Check when fixing.
  4. Blind spot: knip's default run does not report `linkedProviderIds` in `src/lib/auth.ts` even though nothing references it. Some knip plugin treats `src/lib/auth.ts` as an entry file, and entry-file exports are not reported. Any other dead export in an entry-like file is hidden the same way. Fix lane: run `npx knip --debug | grep -n "auth.ts"` to see which plugin lists it, and decide whether `entry` should be narrowed.
- **Guard:** knip config hints (already printed).
- **Fix:** step 1 is one line; steps 3 and 4 are investigation.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-196: Three identical notifier interfaces

- **Severity:** low
- **Why it matters:** Three identical notifier types mean a change to what the notifier returns must be made in each, and a missed one lets the modules disagree so a mail link is built from the wrong origin.
  Severity: low
  Copies: `src/modules/identity/types.ts:30` (`AccessPauseNotifier`), `src/modules/support/types.ts:18` (`TimeoutNotifier`), `src/modules/support/types.ts:29` (`SupportNotifier`); also `src/modules/coven/types.ts:40` (`MemberPauseNotifier`) and `src/modules/documents/types.ts:78` (`DocumentMailingNotifier`) should be checked for the same `origin(): Promise<string>` body.
  Shared piece: one `OriginNotifier` in a type-only file in `src/lib/` (types live in type-only files), the others as aliases.
  Guard: none.
  Fix: define once, alias elsewhere.
  Tests: type-check only.
  Estimate: 0.5 h

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-197: "a/an role" noun written three times

- **Severity:** low
- **Why it matters:** The a-or-an role wording is written three times, so if a role is added or renamed, an invitation or notice email can say a admin or the wrong role to the person receiving it.
  Severity: low
  Copies: `src/modules/identity/services/user-role.ts:20-24` (`ROLE_NOUNS`), `admin-invitations.ts:74` (`withArticle`), `workspace-creation.ts:66` (`user.role === 'admin' ? 'an admin' : 'a curator'`).
  Shared piece: export `ROLE_NOUNS` from `user-role.ts` (or a small `role-nouns.ts`).
  Guard: none.
  Fix: import it in the other two.
  Tests: the three services' tests.
  Estimate: 0.5 h

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-198: Batch refusal try/catch around an assert, returning one error per id

- **Severity:** low
- **Why it matters:** The same try-catch-per-id pattern is written three times, so a fix to how a refused check is reported is applied to some lookups only and a keeper may see an error for one list and a blank for another.
  Severity: low
  Copies: `src/modules/support/services/reads.ts` `timeoutsForSenders` (~412-417), `timeoutsForAddresses` (~431-436), `tiersForSenders` (~486-490); and the newest-first `createdAt` sort twice in the same file.
  Shared piece: `refuseEach(ids, () => assert(...))` local helper in `reads.ts`.
  Guard: none.
  Fix: local helper; the `instanceof Forbidden` catches in `src/app/**` are a different pattern (page-level) and are rejected below.
  Tests: `tests/modules/support/reads*.test.ts`.
  Estimate: 0.5 h

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-199: Constants: `SYSTEM`, day length, retention cutoff

- **Severity:** low
- **Why it matters:** System actor, day length and cutoff values are retyped across many files, so a misnamed window that merely equals a day could be changed and shift a retention or timeout rule by mistake, affecting when requests close.
  Severity: low
  Copies:
- `const SYSTEM = { userId: SYSTEM_ACTOR_ID }` at `support/services/reply-notice.ts:14`, `support/services/retention.ts:31`, `documents/jobs/document-mailing-steps.ts:23`; inline at `db/repository/write.ts:317` and `identity/services/email.ts:81,101`.
- `24 * 60 * 60` (seconds or ms) at `support/services/retention.ts:30` (`DAY_MS`), `support/services/time-out-refusals.ts:6`, `support/services/signed-out-limits.ts:6`, `identity/services/email.ts:38`, `db/repository/support.ts:47`, `components/UserDetail/access-pause-parts.tsx:26`, `components/AdminCards/mint-form.tsx:50,53`, `lib/autosave/mirror.ts:6`, `lib/entry-recency.ts:3`.
- `support/services/view-link.ts:30` names `SIGNED_OUT_WINDOW_SECONDS * 1000` as `DAY_MS` (misnamed: it is the signed-out window, which happens to be a day).
- `retention.ts` writes `new Date(now - RESOLVED_CLOSES_AFTER_DAYS * DAY_MS)` three times.
  Shared piece: `SYSTEM_SESSION` exported from `src/lib/system-actor.ts`; `SECONDS_PER_DAY` and `MS_PER_DAY` in `src/lib/`; a local `closesBefore(now)` in `retention.ts`.
  Guard: none.
  Fix: extract constants. Do not merge the windows that merely equal a day by chance (rename instead).
  Tests: retention and view-link tests.
  Estimate: 1 h

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-200: Confirm-email Forbidden and "no row" NotFound copies

- **Severity:** low
- **Why it matters:** The confirm-your-email refusal is written in two services, so rewording it in one leaves a user seeing different messages when they try to change a name and a password.
  Severity: low
  Copies: `'Confirm your email address first'` at `identity/services/name.ts:21` and `identity/services/password.ts:26`. `new NotFound()` after an `updateById` returning no row in `name.ts`, `terms.ts`, `profile.ts` and `support/services/staff.ts` `change`.
  Shared piece: `assertEmailConfirmed(user)` in `identity/services/`.
  Guard: none.
  Fix: extract the confirm-email check only; leave the NotFound lines.
  Tests: name and password tests.
  Estimate: 0.5 h

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-201: Site-admin list services repeat assert, parse filter, page, count

- **Severity:** low
- **Why it matters:** Site-admin list services each repeat assert, filter parsing, paging and counting in four short copies. A change to the authorisation check or paging rule that misses one list leaves that keeper screen with different access or page behaviour.
  Severity: low (four copies, each short)
  Copies: `identity/services/admin-invitations.ts` (list/count with `siteFilter`), `invitation-cards.ts` (`parsedBatchFilter`, `parsedArrivalFilter`), `privilege-changes.ts` (`parsedFilter`), `user-list.ts` (`trimmedFilter`).
  Shared piece: none worth making; the filters differ in shape. Listed so the owner can reject it.
  Guard: none.
  Fix: take no action unless D-63's trim helper lands, then reuse it in these four.
  Tests: not applicable.
  Estimate: 0 h

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-202: Working report mapping duplicated

- **Severity:** low
- **Why it matters:** The working report is mapped twice, so a field added to one list function, such as warnings or participants, is missing from the other and a user sees different working details in the list and the paged list.
- **Where:**
  - `src/modules/grimoire/services/workings.ts` `listWorkings` and `listWorkingsPage` (deductions filter by `workingId`, `participants.get(id) ?? []`, `warnings: []`).
- **Shared piece:** local `toWorkingReport(row, deductions, participants)`.
- **Guard:** none practical.
- **Fix:** extract and call from both.
- **Tests covering the callers:** `tests/modules/grimoire/workings*.test.ts`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-203: Compendium entry page assembled twice

- **Severity:** low
- **Why it matters:** The compendium entry page is assembled in two functions, so a new field or fix added to the cached public entry is missed in the curator view, and curators see an entry that differs from what visitors see.
- **Where:**
  - `compendium.ts` `cachedEntry` body (about 1226-1235) and `readCompendiumEntryAsCurator` (about 1254-1267).
- **Shared piece:** private `entryPageOf(address)`.
- **Guard:** none practical.
- **Fix:** extract; the cached copy stays keyed without a viewer.
- **Tests covering the callers:** compendium entry read tests.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-204: Vocabulary suggestion wrappers repeat the reader lookup

- **Severity:** low
- **Why it matters:** Two suggestion functions skip the shared helper, so a change to how readers are resolved or the query is trimmed applies to only two of the four, and a user gets different suggestion lists for forms and deities than for signs.
- **Where:**
  - src/modules/vocabulary/services/suggestions.ts: `suggestForms` and `suggestDeities` inline `findVocabularySuggestions(await readersOf(session, workspaceId, READ), table, query.trim(), page)`; `suggestCelestialBodies` and `suggestZodiacSigns` use the local `suggest` helper.
- **Shared piece:** route all four through `suggest`.
- **Guard:** none practical.
- **Fix:** two call sites change.
- **Tests covering the callers:** tests/modules/vocabulary suggestions tests.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-205: LIKE-escape inlined twice in predicates

- **Severity:** low
- **Why it matters:** The LIKE escape is written twice, so a fix to escaping percent, underscore or backslash in one search predicate is missed in the other and a user searching for a literal percent gets wrong matches.
- **Where:**
  - src/db/repository/predicates.ts:79 (`containsText`) and :83 (`startsWithText`), each `query.replace(/[\\%_]/g, '\\$&')`.
- **Shared piece:** private `escapeLike` in predicates.ts.
- **Guard:** none practical.
- **Fix:** one function; no behaviour change.
- **Tests covering the callers:** tests/db repository predicates tests.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-206: Help repository repeats its sort and filter clauses

- **Severity:** low
- **Why it matters:** The help list and its count repeat the same where and order clauses, so a change to one leaves the page and the total disagreeing, and a user sees a count that does not match the articles shown.
- **Where:**
  - src/db/repository/help.ts, the page finders and their count twins each repeat the same `where` and `order` arrays for the staff and public reads.
- **Shared piece:** one local `helpFilter(...)` and `HELP_ORDER` in help.ts, used by `findX` and `findXCount`.
- **Guard:** none practical.
- **Fix:** extract inside the file; no behaviour change.
- **Tests covering the callers:** tests/db help repository tests, tests/modules/help.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-207: Tier-2 uncurated suggestion select repeated

- **Severity:** low
- **Why it matters:** The same uncurated-suggestion select is built in two repository files, so a fix to what counts as uncurated reaches one, and keepers see suggestions in one vocabulary that the other would hide.
- **Where:**
  - src/db/repository/vocabularies.ts and src/db/repository/common-names.ts both build the same uncurated-suggestion select.
- **Shared piece:** a helper beside `suggestion-page.ts`.
- **Guard:** none practical.
- **Fix:** move the shared select into suggestion-page.ts.
- **Tests covering the callers:** tests/db suggestion tests.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-208: `requireAdminSession` and `requireCuratorSession` are the same function with a different assertion

- **Severity:** low
- **Why it matters:** The admin and curator session checks are the same function with one different assertion, so a fix to how a refused user is handled is applied to one, and a curator or keeper hits different behaviour from the other.
- **Where:**
  - `src/lib/request-session.ts:165-190`.
- **Shared piece:** private `requireRole(assert: (s: Session) => void)` in the same file; both exports call it.
- **Guard:** none practical.
- **Fix:** extract, keep both exported names and the doc comments. Could break: nothing visible (`forbidden()` stays called from the same module).
- **Tests covering the callers:** `tests/lib/request-session.test.ts`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-209: `PublicLayout` writes `<main><PageColumn as="div">` once per branch

- **Severity:** low
- **Why it matters:** The layout repeats the main and column markup in both branches, so a change to the page column, such as its element or class, reaches only the signed-in or signed-out view and visitors see a different frame.
- **Where:**
  - `src/app/(public)/layout.tsx` (both branches of the signed-in check).
- **Shared piece:** a local `Column` wrapper in the same file.
- **Guard:** none practical.
- **Fix:** compute the shell (`PublicShell` or none), render the column once.
- **Tests covering the callers:** `tests/app/(public)/layout.test.tsx`.

---

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-210: The `'Prev' | 'Next'` label union is written three times in `Pager/types.ts`

- **Severity:** low
- **Why it matters:** The Prev or Next label union is typed three times, so adding a label means editing each, and a missed type lets a pager accept a label its siblings reject, causing a type error or wrong text.
- **Where:**
  - `src/components/Pager/types.ts:18`, `:23`, `:28` (`PagerEndProps`, `PagerLinkProps`, `PagerEndContentProps`).
- **Shared piece:** `export type PagerLabel = 'Prev' | 'Next'` in the same file. The same file also has `PagerLinkProps` as `PagerEndProps` with `href` required and `soft` required; `Pick`/`Required` could derive it.
- **Guard:** none practical.
- **Fix:** name the type, reference it three times.
- **Tests covering the callers:** `tests/components/Pager/`.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-211: SkeletonFrame writes the context-row lead twice in one file

- **Severity:** low
- **Why it matters:** The context-row placeholder is written twice, so a change to the loading lead, such as its shape, shows in one skeleton and not the other, and a user sees a loading frame that jumps when the real page loads.
- **Where:**
  - `src/components/SkeletonFrame/index.tsx:20-26` (inside `framed`) and `:38-46` (`SkeletonContextRow`): identical `<ContextRow lead={<span className="skeleton-frame__lead"><Skeleton shape="block" quiet /></span>} />`.
- **Shared piece:** the already-exported `SkeletonContextRow`; `framed` renders `<SkeletonContextRow />`.
- **Guard:** none practical.
- **Fix:** replace the inline block, move `SkeletonContextRow` above `framed` if lint wants it. No behaviour change.
- **Tests covering the callers:** `tests/components/SkeletonFrame/*` if present, otherwise the `skeleton-for` navigation tests.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-212: Steps selection written four times with no guard

- **Severity:** low
- **Why it matters:** Step counts are pluralised by hand in several components, so a missed fix shows a user 1 steps or 2 step in the builder, recipe or card while the shared plural helper gets it right elsewhere.
- **Where:**
  - the steps selection in `SpellBuilder` (steps and index) and `SpellRecipe`/`SpellCard`; plural strings ("1 step", "2 steps") written inline in the same places while `lib/text` has `plural()`.
- **Shared piece:** `plural()` from `src/lib/text.ts`.
- **Guard:** an oxlint `no-restricted-syntax` rule is not practical; review only.
- **Fix:** replace inline ternaries with `plural(count, 'step', 'steps')`.
- **Tests covering the callers:** `tests/components/SpellBuilder`, `SpellCard`, `SupportList`.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-213: AppShell `onCuratedPage` re-implements `isAtPath`

- **Severity:** low
- **Why it matters:** The path-matching test is rewritten instead of using the shared one, so a fix to path matching, such as a trailing slash, applies to the nav but not the add-ingredient button, which shows or hides wrongly on curator pages.
- **Where:**
  - src/components/AppShell/add-ingredient-button.tsx:36-40 (`pathname === base || pathname.startsWith(`${base}/`)`); `isAtPath` in src/lib/at-path.ts is the same test and is already used by site-nav.tsx:20 and AccountMenu/panel.tsx:111.
- **Shared piece:** `isAtPath(pathname, base)`.
- **Guard:** none practical.
- **Fix:** `['/curator','/keepers'].some((base) => isAtPath(pathname, base))`.
- **Tests covering the callers:** tests/components/AppShell.

- **Estimate:** 0.25 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-214: Repeat-announcement NBSP trick written three times

- **Severity:** low
- **Why it matters:** The non-breaking-space trick for repeating a screen-reader announcement is written in four places, so if it stops working, a blind user stops hearing repeated messages in some places and a developer must find each copy.
- **Where:**
  - ClickFeedback/status-region.tsx:28-30; Modal/discard.tsx:126; SupportRequests/detail.tsx:256; also Field/use-form-history.ts:402
- **Shared piece:** `useRepeatableAnnouncement()` or `repeatable(text, count)` in `src/lib`, so a live region re-announces identical text.
- **Guard:** grep for ` ` in `src/components`.
- **Fix:** extract one helper; four callers.
- **Tests covering the callers:** tests/components/ClickFeedback, Modal, SupportRequests, Field.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-215: `Field/radio-group-field.tsx` writes the radio `<input>` three times

- **Severity:** low
- **Why it matters:** The radio input is written three times, so a fix to its attributes, such as required state or press feedback, is applied to one layout and a keyboard or screen-reader user gets a different radio in the others.
- **Where:**
  - the strip, segmented and list layouts in `Field/radio-group-field.tsx`, each carrying `name`, `aria-required`, `value`, `checked`, `disabled`, `onChange` and `pressFeedback`.
- **Shared piece:** a local `RadioInput` in the same file.
- **Guard:** none practical.
- **Fix:** extract the input, pass `option` and the layout's class. No behaviour change.
- **Tests covering the callers:** `tests/components/Field/`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-216: `Field/use-form-history.ts` `undo` and `redo` are near-identical

- **Severity:** low
- **Why it matters:** Undo and redo are near-identical, so a bug fix to the history stack, such as losing the current value, is made in one and the other still misbehaves, and a user loses typed text when they redo.
- **Where:**
  - the `undo` and `redo` callbacks in `Field/use-form-history.ts`, which differ only in which stack they pop from and push to.
- **Shared piece:** a local `step(from, to)` function in the same file.
- **Guard:** none practical.
- **Fix:** extract and call twice. No behaviour change.
- **Tests covering the callers:** `tests/components/Field/` (form-history tests).

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-217: `CovenHome` repeats `id={pending ? undefined : '…'}` with `aria-labelledby` across four sections

- **Severity:** low
- **Why it matters:** The heading id and aria-labelledby logic is repeated across four sections, so a mistake in one leaves a section without a heading label, and a screen-reader user hears an unnamed region on the coven home.
- **Where:**
  - four section blocks in `CovenHome/index.tsx` (each sets the heading id and the section's `aria-labelledby` from the same `pending` test).
- **Shared piece:** a local `Section` component taking `headingId` and `pending`.
- **Guard:** none practical.
- **Fix:** local extraction. No behaviour change.
- **Tests covering the callers:** `tests/components/CovenHome/`.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-218: `buildSearchSentence` repeats one "picked values to clause" block fourteen times

- **Severity:** low
- **Why it matters:** `buildSearchSentence` repeats one picked-values-to-clause block fourteen times in one file. Adding a facet or fixing the joining rule means editing fourteen places, and a missed one makes the search summary read differently for that facet.
- **Where:**
  - `src/components/IngredientSearch/sentence.ts:~105-215` (covens, categories, moonPhases, daysOfWeek, visibilities, makers, forms, deities, zodiac, celestialBodies, elements) and `:~230-268` (five admin boolean clauses with the same `{kind:'value', text, facet, value:'true'}` shape).
- **Shared piece:** a table `[facet, prefix, suffix, format]` driving one loop, and a `flagClause(facet, text)` helper for the boolean clauses. Order stays the table's order.
- **Guard:** the existing sentence unit test (see below) is the guard.
- **Fix:** table-drive; keep `categories` and `covens` as special cases.
- **Tests covering the callers:** `tests/components/IngredientSearch/sentence.test.ts*`.

- **Estimate:** 1.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-219: `configuredProviders()` call with its lint-disable and comment repeated in three layouts

- **Severity:** low
- **Why it matters:** The same provider call with its lint-disable and comment is repeated in three layouts, so a change to how providers are read has to be made three times, and a missed one shows the wrong sign-in buttons.
- **Where:**
  - src/app/(public)/layout.tsx, src/app/(unmatched)/layout.tsx, src/app/invite/[token]/invitation-panel.tsx
- **Shared piece:** one server helper (for example `getConfiguredProviders()` in `src/lib/`) that carries the comment and the single `oxlint-disable-next-line no-restricted-imports`.
- **Guard:** the lint rule already restricts the import; the helper removes the three exemptions.
- **Fix:** wrap and call.
- **Tests covering the callers:** layout render in e2e.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-220: SignInDialog inbox view repeats the "Confirm Your Email" link and `emailPagePath`

- **Severity:** low
- **Why it matters:** The Confirm Your Email link is built in two components, so if the email page path changes, one view leads users to a missing page while the other still works.
- **Where:**
  - src/components/SignInDialog/index.tsx (inbox view), src/components/InvitationAcceptance/index.tsx (unverified state)
- **Shared piece:** a small `ConfirmEmailLink` component or a shared `confirmEmailHref` helper.
- **Guard:** none.
- **Fix:** extract with D-141 in the same change.
- **Tests covering the callers:** as D-141.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-221: DocumentPage blockquote CSS hard-codes values

- **Severity:** low
- **Why it matters:** Hard-coded sizes in the blockquote style ignore the design tokens, so a change to the type scale or hairline leaves the quote looking different from the rest of the About page and other documents.
- **Where:**
  - src/components/DocumentPage/index.scss (`3.25em`, `1.5`, `0.02em`, `calc(space(8) * 0.666)`, `1px solid $hairline`); the new `'quote'` type size in src/scss/_variables.scss covers part of it
- **Shared piece:** tokens for the quote mark size and line height; `type-size('quote')` for the size; `$hairline-border` if a token for `1px solid $hairline` exists (check `_variables.scss`).
- **Guard:** `npm run lint:css` does not flag literals; a stylelint rule would.
- **Fix:** replace literals with tokens.
- **Tests covering the callers:** DocumentPage stories; /about e2e.

- **Estimate:** 1 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-222: Four new stroked-SVG icons repeat the 8-attribute wrapper

- **Severity:** low
- **Why it matters:** Each new icon repeats the same eight attributes, so a change to the stroke or accessibility defaults must be edited on every icon, and a missed one looks or reads differently to a user.
- **Where:**
  - src/components/IconTip/icons.tsx (`BookIcon`, `CovenIcon`, `SigilIcon`, `KeyIcon`; `PullQuoteIcon` is the fifth new one)
- **Shared piece:** the stroked-icon wrapper of D-174 with `strokeWidth` as a prop.
- **Guard:** see D-174.
- **Fix:** fold into D-174.
- **Tests covering the callers:** IconTip stories.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-223: Modal `wasTitled` effect repeats the `wasLoading` effect shape

- **Severity:** low
- **Why it matters:** The two effects follow the same shape, so a fix to one, such as cleanup on close, is easy to miss in the other; the finding only suggests acting if a third use appears.
- **Where:**
  - src/components/Modal/modal.tsx:156-170
- **Shared piece:** a `useOnTurnedOn(flag, fn)` hook inside the Modal folder.
- **Guard:** none.
- **Fix:** extract only if a third use appears; recorded as a candidate, not a must.
- **Tests covering the callers:** Modal tests.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-224: QR ink colour duplicates SCSS `$chalk`

- **Severity:** low
- **Why it matters:** The QR ink colour is a hex copy of the Chalk token, so if the brand colour changes, printed invitation cards keep the old tone and no longer match the site, with no test to warn the owner.
- **Where:**
  - src/lib/invitation-cards/qr.ts (`QR_TONE = CHALK`, `'#ebe4d4'`), src/scss/_variables.scss `$chalk`
- **Shared piece:** one source for the hex (a generated tokens file already exists for TS; check before adding).
- **Guard:** tokens.test.ts row.
- **Fix:** add a test that the two agree if no shared source exists.
- **Tests covering the callers:** invitation-cards tests.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-225: `.page-frame--in-column` margin restates `.page-column` padding

- **Severity:** low
- **Why it matters:** The margin repeats the column padding, so if the page padding is changed, content framed inside a column stops lining up with the column edge and users see a misaligned page.
- **Where:**
  - src/scss/_primitives.scss (new rule), `.page-column` in the same file
- **Shared piece:** a `$page-column-padding` token used by both.
- **Guard:** none.
- **Fix:** introduce the token.
- **Tests covering the callers:** affected page e2e.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

### D-226: PageNav skeleton width cycle written as six `nth-child` rules

- **Severity:** low
- **Why it matters:** The width cycle is written as six separate rules, so adding or removing a nav item leaves the loading skeleton looking uneven, and a developer must edit each rule by hand.
- **Where:**
  - src/components/PageNav/index.scss (`li:nth-child(6n+k) ... width: N%`)
- **Shared piece:** an existing cycling-width helper was not located; check skeleton mixins in `_mixins.scss` before building one.
- **Guard:** none.
- **Fix:** a `skeleton-widths($list)` mixin if two other places cycle widths.
- **Tests covering the callers:** skeleton stories.

- **Estimate:** 0.5 hours
- **Status:** Not fixed: owner moved it to a Z. Cleanup task

## Possible Behaviour Bugs

Each item below came up because two copies of the same logic behave differently. The code was read for each one. A verdict is one of: real bug, intended difference, or unclear. Nothing here has been fixed. The finding that holds the item is named in brackets.

| Item                                                           | Verdict                    | Finding |
| -------------------------------------------------------------- | -------------------------- | ------- |
| Signed-out support reference length                            | Real bug                   | D-5     |
| Help article update and delete without a uuid check            | Real bug (low)             | D-6     |
| "Used Up" and "Used up" status label                           | Real bug                   | D-7     |
| `toLowerCase` against `toLocaleLowerCase`                      | Real bug (latent)          | D-3     |
| Curator lists error on a stale page cursor                     | Real bug                   | D-1     |
| Recovery-code download revokes its file link too early         | Real bug (latent)          | D-144   |
| Working order: SQL key against JavaScript re-sort              | Real bug (latent)          | D-37    |
| Keeper invite form lacks the email checks of the invite dialog | Real bug (behaviour drift) | D-4     |
| "Elements" against "Element" label                             | Real bug (copy drift)      | D-38    |
| Passkeys failure text differs from the shared text             | Real bug (copy drift)      | D-143   |
| Quantity formatting in three components                        | Unclear                    | D-2     |
| Live covens list in the compendium "held in" lookup            | Intended difference        | D-30    |
| Two `covenSlugOf` functions                                    | Intended difference        | D-32    |
| Test origin 3000 against 8000                                  | Intended difference        | D-9     |
| `readGraphqlFailure` result in the owner-exit dialog           | Intended difference        | D-14    |
| Compendium `reviewOf` in two pages                             | Intended difference        | D-28    |
| Category filter without the variant term                       | Intended difference        | D-27    |
| Time-out panel lift button without a refresh callback          | Intended difference        | D-22    |
| "Add" wording in `PlusChoice`                                  | Intended difference        | D-105   |
| Two constants named `STALE_SESSION`                            | Intended difference        | D-186   |
| Delete handling in `GroupForm` and `GroupedValueForm`          | Intended difference        | D-29    |

### Real bugs

- **D-5: signed-out support reference is capped at 64 characters, the signed-in one at 100.** `src/modules/support/validation/support.ts:44` allows 100 characters and `:80` allows 64. `src/lib/support-path.ts:63-65` (`errorReferenceOf`) accepts up to 100, so a 65 to 100 character reference taken from the page address is refused when the sender is signed out. Fix: one shared limit. Regression test first: a signed-out request with an 80 character reference is accepted.
- **D-6: two help article writes skip the uuid check.** `src/modules/documents/services/help-writes.ts:296-302` (`updateHelpArticle`) and `:360-363` (`deleteHelpArticle`) pass the id straight to `findOneById`. The reads and the other writes check it first (`help-reads.ts:178`, `help-rename.ts:50`, `help-writes.ts:387`). A non-uuid id gives a database cast error instead of NotFound. Keeper-only, so the reach is small. Regression test first: `updateHelpArticle` with `'not-a-uuid'` throws NotFound.
- **D-7: the status label is "Used Up" in one place and "Used up" in another.** `src/components/AdminCards/filter.tsx:25` says "Used Up"; `src/components/AdminCards/batches.ts:25` says "Used up" and is used at `index.tsx:54,88`. Labels are Title Case, so "Used Up" is right. Regression test first: the batch list shows "Used Up".
- **D-3: text is folded two ways for matching.** `toLocaleLowerCase` is used in `src/components/Combobox/typeahead.tsx:11,50` and `src/components/SpellBuilder/steps/picker.tsx:38,206`. `toLowerCase` is used in `src/components/Combobox/index.tsx:102-104`, `match.ts:2-3`, `CategoryPicker`, `RecordWorking/form.tsx:93` and `IngredientForm/values.ts:406` (whose comment says it is deliberate). The two differ in Turkish, Azeri and Lithuanian locales. Regression test first: matching "I" against "ı" under a Turkish locale gives the same answer in both pickers.
- **D-1: the curator group and value pages call `resolveNumberedPage` directly.** `src/app/(shell)/curator/.../group-page.tsx:68` and `value-page.tsx:35` do not use `readNumberedPage` (`src/lib/numbered-page.ts:24`), which falls back to page 1 on `InvalidCursor`. A stale cursor in the address shows an error on those pages. Regression test first: a page with an invalid cursor shows page 1.
- **D-144: the recovery-code download revokes its object URL straight after the click.** `src/components/PasswordSection/two-factor.tsx:82-89`; `src/components/AdminCards/save-file.ts` waits 60 seconds. Some browsers have not started the download by then. Regression test first: the URL is not revoked in the same tick as the click.
- **D-37: the working order is sorted twice and the two sorts can disagree.** `src/db/repository/workings.ts:57-67` re-sorts in JavaScript by `workedOn`, then `createdAt` in milliseconds, with no id tie-break. `WORKING_ORDER` (`:69-77`) uses the database epoch in microseconds, then the id. Two rows within one millisecond can swap places across pages. Regression test first: two workings created within one millisecond list in the cursor order.
- **D-4: only the invite dialog checks the email in the browser.** `InviteDialog` validates the address and clears the error on change; the keeper invite form does neither (the server still validates). Regression test first: the keeper form shows the email error and clears it on edit.
- **D-38: "Elements" in `CupboardEntryForm`, "Element" in `IngredientForm/index.tsx` and `variants.tsx`.** The owner picks the wording; the shared field block should use it.
- **D-143: `src/components/Passkeys/refusal.ts:3` says "That did not work. Try again."** The shared `GENERIC_FAILURE` says "That didn't work. Please try again." (`src/lib/graphql-failure.ts`). The owner picks the wording.

### Unclear

- **D-2: three quantity formatters.** `src/components/StepRow/index.tsx:14-15` strips trailing zeros from the string, `src/components/SpellRecipe/summary.tsx:8-11` uses `String(Number(x))`, and `src/components/StockBadge/stock-words.ts:6-7` takes a number. For the canonical decimal strings the database returns, all three give the same text. They differ for input such as `"1.50"` typed by hand or `"1e3"`. No live bug is known. The owner decides whether non-canonical input can reach them.

### Intended differences

- **D-30:** `src/modules/vocabulary/.../compendium-held-in.ts:49-57` drops a coven when the membership check throws `AccessPaused` (a kind of `Forbidden`, `membership.ts:82`, `errors.ts:14`), through `proofsOf` (`:31-40`). The result equals the filter in `entry-covens.ts:17-19`. It works because of the catch, which is fragile but correct.
- **D-32:** the two `covenSlugOf` functions (`coven-path.ts:42-45`, `access-paused.ts:35-38`) differ in return value (`null` against `undefined`), decoding and the reserved-slug check. The one in `access-paused.ts` has no importer in `src/`; only `pausedCovenSlugOf` is used (`WorkspaceSwitcher:7`). Slugs are plain ASCII, so decoding changes nothing. This is a name clash and a dead export.
- **D-9:** 13 test files use port 3000 and 13 use 8000; the origin is passed only as input data (`pause-mail.test.ts:11,124`). Inconsistent, not wrong.
- **D-14:** `owner-exit.tsx:126,134-136` calls `readGraphqlFailure(error)` with no field list, which always returns `{ alert: string }` (`graphql-failure.ts:13,23`). Only the optional type makes it look unsafe.
- **D-28:** `compendium/page.tsx:171-185` returns an ISO string because it goes to a client component; `ingredients/[slug]/page.tsx:67-82` returns a `Date`. Both swallow `Forbidden` and `NotFound`. The entry page has no `canEdit` pre-check, but the service refuses non-curators.
- **D-27:** the Ingredients category filter (`ingredients.ts:842-860`) adds `pairIsLive` for the ingredient-categories link because a variant can be soft-deleted. The grimoire one (`grimoire.ts:106-121`) has no variant, so the term is absent on purpose.
- **D-22:** the time-out panel's lift button (`timeout-panel.tsx:61-84`) has no `onSent`, and `ConfirmedAction` (`index.tsx:83-84`) refreshes when `onSent` is absent. Only the pause panel calls `onChanged`.
- **D-105:** `duplicates.tsx:581` holds the same text as `AddIcon/wording.ts:5` today.
- **D-186:** the two `STALE_SESSION` constants hold different text for different dialogs (`PasswordSection/two-factor.tsx:32` and `identity/services/password.ts:11`). Only the name clashes.
- **D-29:** `GroupForm` (`confirmDelete`, `:306-322`) needs the move-to path; `GroupedValueForm` (`:372-377`) lets `ConfirmQuestion` place the refusal (`onRefused`, `:475-478`). The mechanisms differ and both show refusals.

## Considered and Rejected

These ideas were looked at and not recorded as findings, because the code shows they are different things, already shared, or not worth the change.

- `curator/value-page.tsx:1` importing `@/modules/ingredients/validation/form-label`: the same deep import is in `src/app/compendium-reads.ts:13` and `src/app/coven-stock.ts:5`; it is a module-rule question outside this area, not a duplicate. Left for the architecture reviewer.
- `keepers/business-cards/page.tsx` passing raw `tabs` while `keepers/documents/layout.tsx` uses `withSkeletons(tabs)`: not confirmed as drift (a skeleton may not apply to a page that renders its own header); not reported.
- `form-choices.ts` `helpFormReturn` and `readHelpFormChoices`: single use per page, shared already between new and edit pages.
- The `requireAdminSession()` / `requireCuratorSession()` call at the top of each page: required per page because layouts do not re-run; collapsing is D-208.
- Per-page `searchParams` type annotations (`Promise<Record<string, string | string[] | undefined>>`): framework boilerplate, one line.
- Parallel `@action` slots with `default.tsx` returning null: framework convention.

- `(people)/@action/{default,members/page,invitations/page}.tsx` and `no-action.tsx` one-line re-exports: Next's parallel-route convention needs a file per slot; a shared piece would only hide it.
- `invitation-panel.tsx` `route()` cast helper and the `SITE_LANDINGS` table: one use each, and the cast helper exists to keep `Route<T>` checking.
- `api/auth/[...all]/route.ts` and `api/graphql/route.ts`: one copy each; no repeated auth or response code beyond the three cron routes (D-116).
- `(public)/privacy/access-data.ts`: a long data table; the repeated `{ mark: 'no', text: 'No' }` cells are content, and a helper would make the table harder to read.
- `members/page.tsx` `names[ids.indexOf(id)]` lookups: a quadratic lookup over at most 25 rows, not a duplicate.
- `grimoire/[id]/recipe-aside.ts` `ingredientRefs`/`variantRefs` maps and `answered()`: used only there.
- `FORMER_MEMBER` exported from `workings-read.ts` and imported by `(list)/reads.ts`: reaches across folders but is one constant.
- `skeleton.tsx` files per page: `tests/guards/skeletons.test.ts` requires them.
- `PageHeader`/`ContextRow` markup in page files: those are the shared pieces already; only the literals around them repeat (D-49).

- A `[document]` dynamic route replacing the four document folders: each document has its own metadata, placeholders (privacy) and a `force-dynamic` decision; four static routes keep sitemap, skeleton matching and canonical URLs explicit. Only the skeleton factory and the path list are worth sharing (D-55, D-55).
- Merging the error and not-found files (a dropped finding): Next needs one file per segment; they are wrappers.
- `lib/mail` and notifier files (`pause-mail.ts`, `support-mail.ts`, `invitation-mail.ts`, etc.): each wraps `requestOrigin` and one template; the shared work is already in `mail.ts` and `mail-job.ts`.
- `publicPageMetadata` not used by the document pages: the document pages build metadata from a stored title and version, which `publicPageMetadata` does not take; a different shape, not a copy.
- `email-address.ts`, `api-path.ts`, `at-path.ts`, `list-href.ts`, `numbered-page.ts`, `join-list.ts`, `search-params.ts`, `viewer.ts`, `navigation/*`: read for overlap, none found.
- The `encodeURIComponent` path builders in `support-path.ts`, `secret-link-mail.ts`, `account-terms.ts`, `sign-in.ts`: each builds a different path; one-liners.
- Not audited in depth because context ran out: unused exports across `src/lib/` (left to the knip setup), `emails/parts/layout.ts`, `emails/stories`, and pairs such as `citation.ts`/`short-citation.ts` and `pagination.ts`/`cursor.ts`.

# Second pass (complete pass of src/app, src/lib, src/emails)

- ActionFace mirrors the real buttons on purpose.
- ChipColorField's hand-built `.notice` is commented as intentional.
- CompendiumEntryForm/lazy.tsx single `let arrived` cache: one use, small.
- Combobox/flow.ts, sortable.tsx, escape.ts: single-use and well factored. Combobox/room.ts: tiny helper.
- ConfirmDialog/answers.tsx is already the shared piece (Modal overlay reuses `ConfirmAnswersRow`).
- `HELD_TIP`, `HELD_IN_COVENS_TITLE`: used outside AddIcon, not dead.
- Public compendium path constants in CompendiumList/href.ts have several users; not verified against `public-routes` (left to the fix phase).

- `FacetCombobox/typeahead.tsx` against `Combobox` typeahead: it adds a count column and group headers; sharing would force Combobox to know about counts.
- `EntryMarks/tip-mark.tsx` against StockBadge's Low badge: the file's comment says it is the same pattern on `useTip`, and both already share the hook.
- `ClickFeedback` position code against `Combobox`: different anchors (pointer vs element).
- `summary` vs `summaries` leads: separate concepts (one value vs a list) with no shared logic.
- `ROLE_NAME` in `CovenHome/index.tsx:17`: an article-prefixed phrase ("a steward"), not the same as the role label maps in `UserList/roles.ts` or `UserDetail/roles`.
- `Field/*` per-field components (`text-field`, `select-field`, `search-field`): thin wrappers over `use-field`; sharing more would hide the differences.
- `CovenSwitchTargets` context, `CovenNav`, `CovenFacts`, `DataTable` columns: no copies elsewhere.
- Graphql mutation documents per kind: codegen needs literal documents, so they stay.
- `ChoiceChip` and shell fade timers in the same file as D-13: covered there.

- `pageTitleOf` against `cardName`: different inputs and outputs.
- `IconTip/edit-link.tsx`: already shares `IconLink`.
- `ToggleField`, `ListField` (IngredientForm/fields.tsx): thin react-hook-form bindings; `ListField` needs its own ids for the fieldset shape.
- `HeldMark` name clash with `CompendiumCards/held-mark`: different jobs, only the name is shared.
- `IconTip/icon-button.tsx` seven button wrappers: each differs in label, icon and handler; a factory would hide the props. Revisit only if an eighth appears.
- `MakeItOursDialog` / `RemoveDialog` / `DeleteDialog`: near-identical `ConfirmDialog` wrappers, but the copy and mutation differ; covered by the hook fix in D-71.
- `IngredientForm/remove-question.tsx`: already a thin `ConfirmQuestion` wrapper.
- Possible extra copies of D-29 (mutation, busy, announce, refresh) in `IngredientEntry/review-mark.tsx`, `InvitationAcceptance/index.tsx` and `InviteDialog/index.tsx`: noted for the D-29 fix; not re-reported here.
- Not investigated for lack of budget: `DateField` against `DateRangeField`, `FacetCombobox` against `Combobox`, the `summary` and `summaries` lead, hand-built "no results" markup against `EmptyState`, duplicate SVGs between `IngredientForm/icons.tsx` and `IconTip/icons.tsx`.

- `PendingInvitations`, `PrivilegeLedger`, `MemberList` skeleton and filter files repeating the table headings: covered by D-29 (list skeletons), not re-reported.
- `data-table--nowrap` / `data-table--roomy` class pair repeated in table and skeleton (about 20 places): the skeleton must mirror the real table's classes by design (`ListFrame/skeleton.tsx:30`); a shared constant would hide the pairing and is already covered by D-29's list-folder factory.
- `PrivilegeLedger/index.tsx:33-37` `nothingToShow` filter-array pattern (also in `UserList`, `AdminCards`, `SupportRequests`, `GroupedValueList`): five 4-line copies that each build different text; a helper would take the same arguments as `noMatchText`. Possible low finding but the lines differ in meaning. Rejected.
- `PrivilegeLedger` `Person` component against `MemberList/member-link.tsx` and `UserList/user-link.tsx`: different (a plain link, not an open-in-modal link); no overlap with D-80.
- `PasswordSection/two-factor.tsx` leave/turn-on warning dialog hand-rolled with `Modal`: D-84 already says to leave it, since it has a stay/go pair and a leave guard.
- `PasswordSection/two-factor.tsx` `printCodes`, `downloadCodes`, `PRINT_STYLE`: one use each; no other print or download code in J to P. `AdminCards/download-csv.tsx` builds a download from a blob too, but with a server response; not a copy.
- `StrengthMeter` and `PasswordField` `STRENGTH_WORDS`/`SHORT_WARNINGS`: single use; `SHORT_WARNINGS` is exported but only read in its own file (D-145 style, one line; fold into D-145's export clean-up).
- `Pager/pager-link.tsx` `<Link>` against `<a>` branches: the duplication is the point (soft vs full load), commented.
- `JarShelf/shapes.ts` `lid()` helper and shape data: data, not logic.
- `PublicFrame` `SignInLink` vs `AppShell` sign-in link: only one sign-in link exists; no copy found.
- `Modal/*` files: no copies found among themselves apart from D-13/D-72 and the ones D-13 names.
- `LinkHint`, `LocalTime`, `LastEdit`, `ListFrame`, `MoonPhaseIcon`, `NotAuthorized`, `NameForm` (D-106), `MenuButton`: no further copies beyond CZ findings.

- `SignInPanel/provider-button.tsx` against `passkey-button.tsx`: both are a BusyButton with a Last Used badge and click feedback, but the rest differs (availability note, brand class, per-provider id); a shared button would take more props than it saves.
- `PasswordForm` and `TwoFactorStep` `form__actions` blocks: one BusyButton in a div; `FormActions` needs a `noun` and dirty state these forms do not have.
- `SafetyNote` `said` defined twice: two lines, different closures.
- `SearchSentence/parts.ts` and `typing.ts`: single-use, no sibling copy.
- `Skeleton/text.tsx`, `loading-status.tsx`, `swap-panel.tsx`, `panel.tsx`: small, each used; `LoadingStatus` in `AdminCards/attempts.tsx` is a use of the shared piece.
- `SkeletonFade` host class helpers (`skeletonFadeHost`, `skeletonCoverHost`): similar one-liners with different class names.
- `sameText` in `RecordWorking/form.tsx:93` against `Combobox/index.tsx:104` and `CategoryPicker/index.tsx:104`: three different two-line case-insensitive compares (trim differs); too small to share.
- Plural ternary in `SignInMethods/index.tsx:186`: one use in my folders.
- `GoogleIcon`/`DiscordIcon`/`MicrosoftIcon` SVG marks: distinct brand paths, not duplicates.

- `SupportLink` Opening against its fallback: different jobs.
- `SupportSenderResolveButton` against `ConfirmedAction` Resolve: different jobs (one needs no note, one hosts a modal).
- `ThemeToggle` internals, `Welcome`, `Spinner`, `SourcingScore` structure: unique, small.
- `TabbedPage` against PageNav/SectionNav: already rejected.
- `UserList/creation-control.tsx` approve and revoke branches: the two `ConfirmedAction` calls differ in every prop that matters; a table would be harder to read.
- `UserList/role-control.tsx` against `creation-control.tsx` locked-versus-confirmed split: two uses, different reasons.
- `UserList/locked-control.tsx` `role` re-keying: needed behaviour, kept in D-68.
- Two GraphQL documents in `creation-control.tsx`: required by codegen, one operation each.
- `UserDetail/index.tsx` `Answer` against `UserList/marks.tsx` `Mark`: `Answer` writes the same `user-list__mark--yes/no` classes without a tip; small enough to leave, but switching it to `Mark` is a free two-line change if D-68 is done.
- Dead-export candidates `JAR_ID`, `RecipeHeadingLevel`, `DeleteSpellActionProps`: all have importers.
- `SupportDialog` double state mapping: cosmetic.
- `StockDialog` openers, `status-field`/`visibility-field`: already in the earlier rejected list.

- `ShownSwitch/index.tsx`, `IngredientEntry/shown-toggle.tsx`, `HelpOutline/shown-switch.tsx`: already share `ShownSwitch`; the wrappers add only labels.
- `IngredientForm/substitute-summary.tsx` and `IngredientForm/quick-look.tsx`: both define a GraphQL ingredient query, but they select different fields for different consumers. Merging the documents would over-fetch on the lightweight summary.
- `KINDS` records in `GroupList/kinds.ts` and `GroupedValueList/kinds.ts`: different kinds, kept apart; they fold into D-46 only if the lists merge.
- `Field/` text, select and filter-select fields: already built on `FieldShell` / `useField`.
- `ConfirmDialog`, `ConfirmedAction`, `ConfirmQuestion`: layered, documented primitives; their users call `ConfirmedAction`.
- `CovenNav`, `AdminNav`: thin wrappers over `SectionNav`.
- `IngredientForm/suggestions.tsx` Celestial and Zodiac queries: same shape but typed per field; `useLookup` is already shared.
- `CompendiumCards/held-mark.tsx` and `AddIcon/holding.tsx`: already share `HoldingCount` and `holdingText`.
- `Combobox/lazy-sortable.tsx` and the `dynamic()` calls in DocumentEditor and HelpArticleForm: fine.
- `useTip` destructuring repeated in UserList, EntryMarks, LastEdit, HelpTerm, InfoTip and IconTip: the hook is shared; only the markup repeats and it differs per tip.

- `SpellRecipe/delete-spell.tsx` and `duplicate-spell.tsx`: share only the hook shape; the mutations, messages and follow-up differ.
- `UserDetail/impersonate-action.tsx` and `UserList/impersonate-button.tsx`: already share `UserList/impersonation.tsx`; the leftover two-line `reportLeaving(); window.location.assign(...)` pair is too small.
- `StepRow` and `SpellBuilder/steps/step-row.tsx`: the builder row wraps `StepRow`.
- `PageNav`, `SectionNav`, `TabbedPage`: different jobs, apart from the media subscription in D-161.
- `SpellBuilder/suggest-field.tsx`, `visibility-field.tsx`, `status-field.tsx`, `save-on-close.ts`: each has one use and distinct behaviour.
- `SignInPanel/provider-button.tsx` and `SignInMethods/provider-row.tsx`: different jobs (sign in versus link/unlink), apart from the Remove confirmation in D-84.
- `Passkeys` rows: already use `ConfirmedAction`.
- `Pager`, `ListFrame`, `ListFrame` skeleton files, `FilterForm` filters, `listHref` hrefs, `ConfirmedAction` wrapper controls: thin and already shared.
- `LocalTime/use-local-time.ts`, `LastEdit/relative.ts`: no copy found in `src/lib`.
- Success panels with a Done button (`InviteDialog`, `SupportForm`): too small to share.

- Dynamic modifier classes (`block--${x}`) that a static scan lists as unused (`css-deadstrict.txt`: access-cards marks, backdrop variants, chip-color-field veil/edge/ground, day-picker chevrons, empty-state, icon-tip, jar-shelf bands, modal-dialog, sourcing-score facts, spell-preview embers, theme-toggle, user-list marks, provider-mark): built in TSX templates, so live.
- `SpellCard/index.scss:52-60` focus-ring `::after` against `card-link` (`_mixins.scss:462-487`): different geometry, merging would add arguments for one caller.
- `!important`: only `_print.scss:51,71`, `globals.scss:29` and `Combobox/index.scss:597` (theme swap and reduced motion overrides, print); all legitimate resets.
- Hard-coded hex colours: none outside `_variables.scss`.
- Keyframes: none unused, none duplicated.
- Uppercase and letter-spacing label styling (14 `text-transform: uppercase` declarations): not compared line by line, so no claim made; the typography findings owner may check against `_typography.scss`.
- `:focus-visible` rings: already go through the `focus-ring` mixin.

- `users.ts` `listedUsers` and `privilegeChangeArms`: already shared; the page and count twins use one filter function.
- `users.ts` `nameOrEmailHolds`: used from two places through one function; fine.
- `ingredients.ts` `findCompendiumPage` / `findCompendiumCount` and workspace pair: both read through `compendiumList`, so the filter is written once.
- `grimoire.ts` `findGrimoirePage` / `findGrimoireCount`: share `orderOf` and `whereOf`.
- `ingredient-facets.ts`: the grouped-count functions (`formFacet`, `deityFacet`, `categoryFacet`, `listFacet`) are different joins and groupings; the common part (`listed`, `entries`, `countWhere`, `unmatched`) is already extracted. The `categoryFacet` / grimoire category count similarity is reported under D-27.
- `ingredient-facets.ts` `alphabetical` / `byCodeUnit` / `mostUsed`: used only here; nothing else compares by code unit here.
- `stock.ts`, `references.ts`: small, no repeated logic beyond what D-47 and D-47 cover.
- `holdsJarInStock` / `holdsJarLowOrOut` (`ingredients.ts:376-408`): the shared frame (inventory item of the ingredient, scoped, live variant) is three lines; the middle term differs. A helper would hide the one line that matters. The doc comment names the paired UI rule.
- `index.ts`: a list of re-exports, pinned by a test; nothing to deduplicate. Exports without a caller are listed in D-145.
- `types.ts`: `AuditWriter` has 130 members, each a distinct writer; `TTable extends PgTable & ...` constraint lists repeat but each differs, and a combined alias would obscure which proofs apply. The `Row` aliases are one line each. No unused types were found by grep in the types I checked (every `Row` and `Filter` type has a user in `src/` or `tests/`), but I did not grep all 137 exports individually; the knip setup runs knip on those.
- `support.ts` `latestEnd`, `retentionPage`, `closingNoticeDue`: single use, correctly factored.
- `invitations.ts` `receivedBy` comment ("the two pagers spell the same two terms"): already a shared function.
- `SYSTEM_ACTOR_ID` in `support.ts:129` (`case when createdBy = ...`): an ordering key, not the exclusion test; left out of D-26's list on purpose.
- Two-line `if (ids.length === 0)` guards: covered by D-75.

- `identity/loaders/*` and `support/loaders/*`: one-line `defineSignedInLoader` wrappers; `card-position-by-id` and `card-totals-by-batch` share a `Map` plus `ids.map(... ?? default)` shape that is too small to name.
- `[...new Set(ids)]` + `findManyByIds` + `inIdOrder` in `display-names.ts`, `editor-names.ts`, `privilege-changes.ts` `usersForAdmin`: three lines each, different row types.
- Schema `idColumn` and `auditColumns` boilerplate: required by the schema rules.
- One-line `*-steps` wrappers beyond D-45: the workflow runtime needs a separate `'use step'` file.
- `csvCell` in `invitation-cards.ts:273`: the only CSV escaper in `src`.
- `instanceof Forbidden` in `src/app/**` pages: page-level handling, each with its own fallback.
- `support-send-counts` kind check with 'address'/'client' literals: one use.
- `claim.ts`, `redact-path.ts`: live, no copies found.
- Dead exports in general: covered by the unused-code findings.

- `ingredient-children.ts` paired functions (`categoriesOf` / `categoriesOfVariants`, and so on): the ingredient and variant keys differ in the SQL and loader; a shared body would need a generic that hides both. Accepted structure.
- `replaceDeities`, `replaceCategories`, `replaceFolkNames`, `replaceSubstitutes`, `replaceReferenceLinks` in `ingredient-rows.ts`: each is a diff-and-write with different keys and different tier rules; the shared shape is only "compute listed, held, delete, insert", too small to abstract without obscuring them.
- `suggestIngredients`, `listWorkspaceIngredients`, `countWorkspaceIngredients`: each is three lines (assert, parse, find); a wrapper would be longer than the copies.
- `ingredientInputFields` against `IngredientVariantInput`: the variant input is deliberately all non-null and has fewer fields; the shared `ingredientInputFields` already covers the two tiers.
- `graphql/ingredient-facets.ts` count types (`NameFacetCountRef`, `IdFacetCountRef` and so on): each has a different value type, which the schema comment explains.
- `sourcing-score.ts` fact objects: each fact has its own label and cap; the `capped` helper is already shared.
- `promote-folk-name.ts` service: a thin tier dispatcher, not a copy.
- `foldForm` in `ingredient-rows.ts` against other `trim().toLowerCase()` uses: single-expression idioms.

- `src/graphql/{context-helpers,context,errors,pagination,paused-operations,types,armor,csrf,altair,builder}.ts` and `schema/*`: no duplication; each file has one job. The `return true` mutation resolvers in module graphql files (coven/workspace.ts) are three-line resolvers a helper would obscure.
- `findPage*` / `*InScope*` family: all share `readPage`/`readCount` already.
- `existsIn` / `existsInIncludingSoftDeleted`: differ by one filter on purpose.
- `CelestialBodyInput`/`ZodiacSignInput` and their tables: mirrored on purpose.
- Relative `../../../` imports in vocabulary: style, not duplication.
- `readableIngredientParent`/`inUseIngredientParent`/`inUseVariantParent`: layered, each calls the one below.
- `sign-in-failures.ts`, `passkeys.ts`, `tokens.ts`, `unit-of-work.ts`, `unread-columns.ts`, `weighted-search.ts`, `suggestion-page.ts`, `sourcing-score.ts`, `common-names.ts`, `slugs.ts`: no duplication found; `sourcing-score.ts` repeats the "live forms" subquery shape but with different aliases.

- `identity/graphql/access-pause.ts` against `coven/graphql/member-pause.ts`: different fields and authorisation scopes; the shared parts are covered by D-25 and D-60.
- Per-module workflow and step files: the `'use workflow'` and `'use step'` directives force one file each; only the wrappers around them are in D-45.
- Compendium versus workspace-ingredient update paths: parallel by design (different proofs and tables); only the slug-move block is a finding (D-122).
- GraphQL enums that already use `pgEnum(...).enumValues` or exported constants (`workingStatus`, `userRole`, `workspaceRole`, `UNITS`, `COMPENDIUM_*`): already single-sourced.
- Repository finders (`finders.ts`, `select.ts`, `predicates.ts`, `write.ts`): already the shared layer; findings point at call sites that bypass it, not at the layer.
- `InvitableRole` (`viewer`, `member`) as a subset of `workspaceRole`: a deliberate, CHECK-backed subset.
- Unused exports: not exhaustively checked in `src/db/repository/types.ts`; the knip setup runs knip repo-wide.

# Second pass

- `identity/services/workspace-creation.ts` against `coven/services/workspace-creation.ts`: the identity file grants and revokes the `canCreateWorkspace` flag; the name only matches.
- Vocabulary GraphQL files: single-sourced already by `curatedVocabularyWrites`.
- `groupsOf` in `vocabulary/services/groups.ts`: already generic.
- Readers in `src/db/repository/memberships.ts`: distinct queries.
- Unused exports: not checked; the knip setup runs knip repo-wide.

- `centred-block` mixin (used by ErrorPage and NotAuthorized): it is the shared piece, not a copy.
- `HelpSearchResults` using `HelpBackLink`: reuse, not duplication.
- `invitation-link.ts` helpers: new, used once each; only the regex copies in D-142 matter.
- `SignInLinkWithQuery` rendering SignInDialog: no second implementation.
- `sameTabbedPage` in skeleton-for.ts, `toggleQuote` and `keepSelection` in RichTextEditor/toolbar.tsx, `h3` in PageHeader/types.ts, DocumentMailingPanel files: read, no duplication found.
- Other `fit-content` stacks (IngredientEntry, DateField, SearchSentence, HelpIndex, LastEdit, HelpScreenshot): one-line declarations, not a pattern worth a mixin.

- `documents.test.ts` `describe.each` viewer table versus `document-pages.spec.ts` `VIEWERS`: different layers (route handler versus browser).
- Bespoke `usePathname` and `useSearchParams` mocks in sign-in and invitation tests: each asserts different params.
- `MODAL_OPENERS['sign-in']` and `/about` rows in `axe-scans.ts`, `axe-sweep.ts`: data rows.
- Added `/about` rows in `proxy.test.ts`, `sign-out-destination.test.ts`: list entries.
- Token pillar-hue test in `tests/scss/tokens.test.ts`: reuses `surfaces`, `toHex`, `mixed`, `contrastRatio` already in the file.
- `documents-files.test.ts` about-placeholder `it.each`: one table, no copy.
- `document-editing.test.ts` About keeper-only test: shares setup with the CALLS table below it but asserts a different precondition; the inserters are the shared ones.
- `watch-loads.test.ts` new ordered pair: deliberately order-dependent.

- `tests/support/msw/graphql.ts` (`mockGraphQLQuery`, `mockGraphQLMutation`, `graphqlLink`) is used consistently; no inline handler copies found.
- The `walk*` helpers in the pagination db tests walk different cursors and prove different things; a shared walker would hide what each asserts.
- Bespoke `vi.mock('next/navigation')` shapes that carry per-test assertions on `usePathname`, `useSearchParams` or `redirect` stay local.
- `scanBothThemes` in `tests/e2e/axe.ts` and `tests/e2e/axe-sweep.ts`: same name, different signature and job.
- `settled`, `visit` and `openStory` appear in two e2e files each but do different jobs.
- Repeated `vi.mock` of `@/lib/mail`, `@/lib/jobs`, `@/lib/request-session`, `@/lib/auth-client` and `@/db/repository`: each file stubs a different set of exports and asserts on them; a shared factory would add options as long as the mocks it replaces. Not surveyed in depth.
- Unused-export survey of `tests/support/` and `tests/e2e/` was not done; the knip setup (knip) covers it repo-wide.

- Deleting `tests/support/db/lock-probe.drizzle.config.ts`: used by path (D-157).
- Treating the missing `server-only` dependency as a finding: it is by design (D-195).
- Reporting the 51 "unused dependencies" from `knip --production`: a false signal from the config, not dead dependencies.
- Un-exporting the `*Document` codegen consts, email functions and Pothos Refs in bulk: needs per-class checks (D-86).

- The `card-landing--single` rules in `src/scss/_primitives.scss` and the two `PageHeader` blocks in the sign-in password and two-factor steps were already merged into shared code, so they are not copies.

- Error and not-found boundaries copied across route groups: Next.js needs one file per route segment, so the files cannot be shared; each is a few lines.
- Email templates repeating support-title and pause-end copy-building: each template is the text of one email, and the shared parts are already one line each.

## Draft rules

To be written once the fixes land.
