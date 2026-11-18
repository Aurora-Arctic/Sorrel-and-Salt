# Accessibility Audit

## Purpose

This is the accessibility audit of every screen the app draws, against WCAG 2.2 levels A and AA, for task M17.9. It measured the screens in a browser, read the code for what a browser cannot show, and ran the audit versions of the two Playwright suites in WebKit, Firefox and a phone profile. It lists each failure and candidate, ranks them, and lists the tasks that would fix them. The owner has approved those tasks and adopted the rules in "Proposed Rules". It changes no code and mints no task.

No finding is High. That means no finding stops a person finishing a task. Five findings are Medium and seventeen are Low.

### What The Owner Needs To Do

Nothing to approve. You approved all five new tasks (MC.28 to MC.32), the additions to MC.20 and MC.21 and all seven rules (R1 to R7), with R4 adopted as a rule. The tasks are approved and minted as MC.28 to MC.32, with additions to MC.20 and MC.21, in `claude-docs/tasks/v1/mc.md`.

The candidate findings that have no task (AX-13 to AX-20 and AX-22) still carry "I need you to choose" lines in their own sections. Those choices are not recorded here.

Nothing else is waiting on you. The two items under "Audit Suite Results" that name the audit server image and the server-start check are tooling faults, and MC.32 covers them.

## Scope

Every number below comes from the lane findings files for this task.

- **Inventory:** 168 rows: 101 pages, 16 error pages, 48 dialogs and 3 phone states. They gave 331 views: desktop at 1280 px and phone at 375 px, with axe run in light and dark.
- **Personas:** 12.
- **Keyboard pass:** 268 views and 7,370 Tab stops, including 42 desktop dialog views and 5 dialogs at 375 px.
- **Static audit** (reflow, zoom, text spacing, document title, `lang`, headings): 164 desktop views.
- **Targets:** 12,015 measured.
- **Mail:** 29 templates, each in light and dark (58 entries).
- **Input borders:** 84 inputs on 9 pages, both themes.
- **Code reading:** `src/components`, `src/app/layout.tsx`, `src/emails`, `.oxlintrc.json`, `.stylelintrc.json`, `lint/source-sweeps.js` and the names of `tests/guards/*`.
- **Audit suites:** the e2e suite ran 1,555 passed, 93 failed, 1 skipped and 4 did not run. The story suite ran 357 passed, 30 failed and 6 skipped; its checklist shows 59 of 76 stories passing, 15 failing and 2 skipped.

## Method

Four passes, each with its limits.

1. **Axe scan.** axe-core ran on every view with the WCAG 2.0, 2.1 and 2.2 A and AA rule tags, the best-practice and experimental rules, and two rules added by hand: `target-size` and `label-content-name-mismatch`. It ran against a production build on port 8200 with a seeded database.
2. **Keyboard-only pass.** An in-page library walked Tab and Shift+Tab through every view, recording each stop's name, position and focus indicator, and checked Escape and focus return in dialogs. It also measured target size, reflow at 320 px, root font at 200%, page zoom at 200% and text spacing.
3. **Screen-reader pass.** There is no screen reader in the devcontainer. The pass was done by reading the accessibility tree, the roles, names and live regions, and by logging changes to `role=status`, `role=alert`, `aria-live` and `output` elements with a MutationObserver. It shows what the markup exposes. It does not show what NVDA, JAWS, VoiceOver or TalkBack say.
4. **Code reading.** A reader checked each success criterion that a browser cannot settle against the source, and cited `file:line`.

The hand passes (axe, keyboard, screen-reader, code probes) ran in Chromium only. WebKit, Firefox and the phone profile were exercised only through the two audit suites, which are functional tests with some axe checks and not an accessibility pass.

Each finding says how sure it is:

- **Measured:** a browser measurement shows it.
- **Proven from code:** a line of the source shows it.
- **Candidate, not proven:** it may fail, and what would settle it is named.

Severity scale, the same as `claude-docs/audits/design-ux.md`:

- **High:** a person cannot finish a task or is misled.
- **Medium:** the screen breaks a written rule, or differs from its siblings in a way people notice.
- **Low:** a small inconsistency.

Within a severity, a proven or measured finding ranks before a candidate, and the finding on more screens ranks first. Each finding keeps its source id: `A-` from the browser lane, `C-` from the code lane, `Suite A` from the suite lane.

## Summary

| Id    | Source ids           | Title                                                     | Severity | WCAG criterion                                     | Task                    |
| ----- | -------------------- | --------------------------------------------------------- | -------- | -------------------------------------------------- | ----------------------- |
| AX-1  | A-2                  | Header Overflows At 320 Pixels And At Large Text          | Medium   | 1.4.10 Reflow, 1.4.4 Resize Text                   | MC.28                   |
| AX-2  | A-1                  | Help Search Button Is 20 Pixels Wide                      | Medium   | 2.5.8 Target Size (Minimum)                        | MC.21 (addition)        |
| AX-3  | C-1                  | Reordering Needs A Drag Or A Keyboard                     | Medium   | 2.5.7 Dragging Movements                           | MC.29                   |
| AX-4  | A-16                 | Invitation And Name Save Do Not Announce The Outcome      | Medium   | 4.1.3 Status Messages                              | MC.30                   |
| AX-5  | Suite A1             | Scrolling Table Frame Cannot Take Focus                   | Medium   | 2.1.1 Keyboard                                     | MC.31                   |
| AX-6  | A-14                 | Single-Field Email Forms Do Not Move Focus To The Error   | Low      | 3.3.1 Error Identification, 3.3.3 Error Suggestion | MC.30                   |
| AX-7  | A-4                  | Muted Text Sits Over Background Art                       | Low      | 1.4.3 Contrast (Minimum)                           | MC.31                   |
| AX-8  | A-9                  | Scrolling Dialog Body Has No Name Or Role                 | Low      | 4.1.2 Name, Role, Value                            | MC.31                   |
| AX-9  | A-15                 | Sign-In Stays Disabled While A Required Field Is Empty    | Low      | None (breaks the owner's form rule)                | MC.30, MC.20 (addition) |
| AX-10 | A-3                  | Date Range Quick Picks Are Under 24 Pixels At 375         | Low      | 2.5.8 Target Size (Minimum)                        | MC.21 (addition)        |
| AX-11 | A-10                 | Duplicate Ids When The Spell Preview Opens                | Low      | 4.1.2 Name, Role, Value                            | MC.31                   |
| AX-12 | A-11, Suite A2       | Sort Header Is Empty At Phone Width                       | Low      | 1.3.1 Info and Relationships                       | MC.31                   |
| AX-13 | A-8 (Candidate)      | Phone Tab Bar Comes Before The Content In Tab Order       | Low      | 2.4.3 Focus Order                                  | None                    |
| AX-14 | A-13 (Candidate)     | Generic Link Names                                        | Low      | 2.4.4 Link Purpose (In Context)                    | None                    |
| AX-15 | C-7 (Candidate)      | The Required Marker Has No Key                            | Low      | 3.3.2 Labels or Instructions                       | None                    |
| AX-16 | A-6 (Candidate)      | No Skip Link On Seven Single-Card Pages                   | Low      | 2.4.1 Bypass Blocks                                | None                    |
| AX-17 | C-4 (Candidate)      | Latin Formal Names Carry No Language                      | Low      | 3.1.2 Language of Parts                            | None                    |
| AX-18 | A-7 (Candidate)      | Phone Filter Panel Closes On Pointer Down                 | Low      | 2.5.2 Pointer Cancellation                         | None                    |
| AX-19 | A-12 (Candidate)     | A Date Popover Covers Neighbouring Controls               | Low      | 2.4.11 Focus Not Obscured (Minimum)                | None                    |
| AX-20 | C-3 (Candidate)      | Spell Preview Animation Has No In-Page Pause              | Low      | 2.2.2 Pause, Stop, Hide                            | None                    |
| AX-21 | Suite A3 (Candidate) | A Target Is 23.98 Pixels Tall In Firefox                  | Low      | 2.5.8 Target Size (Minimum)                        | MC.21 (addition)        |
| AX-22 | C-5 (Candidate)      | No Guard Fails A Page Without A Title                     | Low      | 2.4.2 Page Titled                                  | None                    |
| SX-1  | Suites               | Audit Server Image Is Pinned Behind The Playwright Client | Tooling  | Not applicable                                     | MC.32                   |
| SX-2  | Suites               | The Server Start Skips Its Build When A Port Answers      | Tooling  | Not applicable                                     | MC.32                   |

AX-1 to AX-22 are accessibility findings: 0 High, 5 Medium, 17 Low. SX-1 and SX-2 are tooling findings and carry no severity.

I did not write a task for the candidate findings AX-13 to AX-20 and AX-22. Each is a decision for you, and the finding says what would settle it.

## Findings

### AX-1 Header Overflows At 320 Pixels And At Large Text

- **Severity:** Medium
- **WCAG Success Criterion:** 1.4.10 Reflow (AA) [S2] and 1.4.4 Resize Text (AA) [S3]
- **Source Ids:** A-2
- **Where:** both header shells, every persona, light and dark. At 320 px, 62 of 163 views overflow: 37 on `div.app-shell__bar-inner > div.app-shell__end` (by up to 29 px) and 25 on `div.public-frame__bar-inner > div.public-frame__end` (by up to 18 px). With the root font at 200% at 1280 px, 103 of 164 views overflow sideways: 83 by `app-shell__end` plus the `ul.section-nav__list` items (up to 839 px), 14 by `app-shell__end` (up to 673 px), 5 by `section-nav__list` and 1 by `workspace-switcher`. Example: `steward/empty-coven-home` is over by 288 px, with `app-shell__end` 692 px wide. Source: `src/components/AppShell/index.tsx:53` (`app-shell__end`), `src/components/PublicFrame/index.tsx:30` (`public-frame__end`) and the section nav inside `AppShell`.
- **Found:** measured, `scrollWidth` against `clientWidth`. Page zoom to 200% overflows on 0 views, so the failure is in text-only scaling and at 320 px, not in page zoom.
- **Why It Matters:** A person who sets a larger text size, or uses a window 320 px wide, has to scroll sideways to reach a header control. Reflow asks that content fit a 320 px wide window without two-dimensional scrolling [S2], and resized text must stay usable without loss of content or function [S3]. I rated it Medium because the controls are reachable only by sideways scrolling.
- **Recommended Fix:** Let `app-shell__end` and `public-frame__end` wrap (flex wrap with `min-inline-size: 0`) at 320 px and at large text sizes, and make the section nav's "More" overflow follow the font size and not only the viewport width.
- **Follow-up Task:** MC.28 Keep The App Header On One Line At 320 Pixels And Large Text

### AX-2 Help Search Button Is 20 Pixels Wide

- **Severity:** Medium
- **WCAG Success Criterion:** 2.5.8 Target Size (Minimum) (AA) [S1]
- **Source Ids:** A-1
- **Where:** 13 screens, 52 views (desktop and 375, light and dark): signed-out help, help-glossary, help-search, help-slug, help-slug-child and the help-search no-match state; `user/help`; and the curator and keeper help-staff, help-staff-slug and help-staff-slug-child pages. Selector `.help-search__submit`. Source: `src/components/HelpSearchForm/index.tsx:45`, `src/components/Field/search-submit.tsx` and `src/components/HelpSearchForm/index.scss`.
- **Found:** measured, axe `target-size`. The button is 20 by 44.5 px on the staff pages and 20 by 48 px elsewhere. It sits inside the search input, so the spacing exception does not apply.
- **Why It Matters:** A target narrower than 24 CSS px is hard to hit with a finger or a tremor, and its neighbours give it no spare room [S1]. I rated it Medium, not High, because pressing Enter in the field submits the same form.
- **Recommended Fix:** Give `SearchSubmit` a minimum inline size of 24 px (the `$control-height` square, or the existing target-size mixin) and reserve the room in the input's inline padding.
- **Follow-up Task:** Addition to MC.21 (see "Proposed Tasks", approved)

### AX-3 Reordering Needs A Drag Or A Keyboard

- **Severity:** Medium
- **WCAG Success Criterion:** 2.5.7 Dragging Movements (AA) [S4]
- **Source Ids:** C-1
- **Where:** three component families, all through the shared `src/components/GripHandle/index.tsx` handle: `Combobox/sortable.tsx`; `HelpOutline/sortable.tsx` with `HelpOutline/guides-bar.tsx:96-168`, `order-table.tsx:140` and `guides-bar.tsx:119` (which use `arrayMove`); and `SpellBuilder/steps/step-row.tsx:82`.
- **Found:** proven from code. `src/lib/sortable/index.ts:51-59` (`useSortableSensors`) returns only a mouse and pen sensor with a distance, a touch sensor with a delay, and a keyboard sensor, so a tap moves nothing. The guides bar's reorder mode only reveals drag handles, and its announcement reads "Reorder mode. Drag a guide by its handle, or focus it and press Space." A search of `src/components` for "Move Up", "Move Down" and `moveUp` found none.
- **Why It Matters:** A keyboard path exists, which satisfies 2.1.1. 2.5.7 asks for a second route that needs only a single pointer, such as tapping an Up or Down button, for a person who cannot hold and drag [S4].
- **Recommended Fix:** Add Move Up and Move Down buttons to `GripHandle`, one shared piece, so one change covers all three families.
- **Follow-up Task:** MC.29 Add Move Up And Move Down To Reorder Handles

### AX-4 Invitation And Name Save Do Not Announce The Outcome

- **Severity:** Medium (the invitation); the account name part is a candidate and rates Low
- **WCAG Success Criterion:** 4.1.3 Status Messages (AA) [S5]; the invitation also lands focus on the page body (2.4.3 Focus Order [S7])
- **Source Ids:** A-16
- **Where:** `steward` Members, Send Invitation dialog; the account name form. Source: `src/components/NameForm/index.tsx:53`, the invitation dialog in `src/components/MemberList`, and the shared close path in `src/components/Modal/modal.tsx`.
- **Found:** measured with a MutationObserver over `role=status`, `role=alert`, `aria-live` and `output`. After Send Invitation, the dialog closes, 0 live-region changes appear in 2.5 s, and focus is on `body`. For the account name, "Your name was saved." arrives inside a `Notice` that is inserted into the page together with its text, and no live region that existed beforehand captured it; whether a screen reader announces it is a candidate, not proven, because no screen reader was used. The delete-ingredient confirm was also measured: the page navigates to the list with focus on its `h1`, which announces the new page, so it is acceptable.
- **Why It Matters:** A person who cannot see the screen is not told the invitation was sent, and a keyboard user lands at the top of the page. A status message must reach assistive technology without taking focus [S5].
- **Recommended Fix:** Render a persistent `role="status"` region and write the text into it. On a successful dialog close, return focus to the opener (the Invite button) and write "Invitation sent" into that region.
- **Follow-up Task:** MC.30 Move Focus To Errors And Announce Outcomes

### AX-5 Scrolling Table Frame Cannot Take Focus

- **Severity:** Medium
- **WCAG Success Criterion:** 2.1.1 Keyboard (A) [S6]
- **Source Ids:** Suite A1
- **Where:** the role-permission table in the help widget, at phone width. Spec `tests/e2e/help-widgets.spec.ts:92` (phone project). Source: `src/components/HelpWidget/role-permission-table.tsx:50`.
- **Found:** proven from the suite log and the source. Axe rule `scrollable-region-focusable`, impact serious, target `.data-table-frame`. The frame scrolls sideways (`src/scss/_primitives.scss:917-920` sets `overflow-x: auto`) and the component renders `<div className="data-table-frame">` with no `tabIndex` and no role. `src/components/DocumentPage/markdown.tsx:355-359` already sets `role: 'region'`, `tabIndex: 0` and an `aria-label` on the same frame.
- **Why It Matters:** A keyboard user at phone width cannot scroll the table to read its hidden columns [S6]. I rated it Medium because the failure is proven and blocks access to table content for keyboard users.
- **Recommended Fix:** Add `role="region"`, `tabIndex={0}` and an `aria-label` in `role-permission-table.tsx`, or share one frame component. Check `src/components/HelpOutline/order-table.tsx:159` and `src/components/DataTable/index.tsx:102`, which render the same frame class; I did not verify them.
- **Follow-up Task:** MC.31 Fix Names, Roles And Contrast Found By The Scans

### AX-6 Single-Field Email Forms Do Not Move Focus To The Error

- **Severity:** Low
- **WCAG Success Criterion:** 3.3.1 Error Identification (A) [S8] and 3.3.3 Error Suggestion (AA) [S9]
- **Source Ids:** A-14
- **Where:** forgot-password, account email, Send Invitation (coven) and keeper invite. Source: `src/components/ForgotPasswordForm/index.tsx`.
- **Found:** measured. With a bad address the submit is enabled, and after submit focus stays on the submit button. No error summary exists. The field has `aria-invalid="true"` and `aria-describedby` pointing at "Error: Enter an email address in the correct format, like name@example.com" in a `p.field__error` with `aria-live="polite"`. The multi-field forms (Save Stock, Save Group, Save Category) show a `.form-error-summary` that takes focus. The pattern exists but the single-field forms skip it.
- **Why It Matters:** The error text is specific and tied to the field, so the error is identified [S8][S9]. A keyboard user is not moved to it, so they may not find it. I rated it Low for that reason.
- **Recommended Fix:** Use `FormErrorSummary`, or focus the invalid field, on the single-field email forms.
- **Follow-up Task:** MC.30 Move Focus To Errors And Announce Outcomes

### AX-7 Muted Text Sits Over Background Art

- **Severity:** Low
- **WCAG Success Criterion:** 1.4.3 Contrast (Minimum) (AA) [S10]
- **Source Ids:** A-4
- **Where:** `.document-page__updated` on `/privacy` and `/terms` at 375 px (14 px, weight 300) and `.eyebrow` "Reference" on `/compendium` (12 px, weight 500). Source: the muted text token on those two styles in `src/components/` (document page) and `src/scss/`.
- **Found:** measured, by sampling screenshot pixels with the text made transparent, because axe could not resolve the background image behind the text (123 screens report an axe contrast "incomplete" for the same reason). Worst contrast under the glyph box:
  - `.document-page__updated` at 375, light: 2.28:1 (1,291 of 32,928 px under 4.5:1); at 375, dark: 3.62:1 (680 px). On desktop it is clean (5.99:1 light, 9.67:1 dark).
  - `.eyebrow` "Reference": desktop light 3.03:1 (748 of 10,560 px), desktop dark 3.62:1 (231 px), 375 light 2.28:1 (1,021 px), 375 dark 3.62:1 (680 px).
  - Clean: the Privacy and Support nav items (5.94 to 9.67:1). The help pager "Next" at 375 dark is 4.44:1 on 1 px, marginal, and I do not report it. One list item on `/privacy` at 375 sampled 1.85:1 but overlaps another element, so I do not report it.
- **Why It Matters:** Normal text needs 4.5:1 [S10]. Whether a reader loses the glyphs depends on where the dark points of the art fall, so I kept the rating Low. The lane's file heading still reads "candidate, not proven"; its second pass measured it, and I record it as measured.
- **Recommended Fix:** Put the art behind a scrim, or keep text clear of it, using the existing surface token under these two text styles.
- **Follow-up Task:** MC.31 Fix Names, Roles And Contrast Found By The Scans. The M17.7 finding F-15 (decorative art behind text) was skipped by the owner as a visual matter; this finding is a contrast measurement, so I propose it separately.

### AX-8 Scrolling Dialog Body Has No Name Or Role

- **Severity:** Low
- **WCAG Success Criterion:** 4.1.2 Name, Role, Value (A) [S11]; axe `focus-order-semantics` (best practice)
- **Source Ids:** A-9
- **Where:** `steward/dlg-quick-look` (5 views) and `user/dlg-help-screenshot`. Selector `.modal-dialog__body` with `tabindex=0`. Source: `src/components/Modal/modal.tsx:347-350`.
- **Found:** measured. The body is an intentional scroll-region Tab stop, and it has no name.
- **Why It Matters:** A screen reader announces a focus stop with no name or role, so the person cannot tell what it is [S11].
- **Recommended Fix:** When `readingBody` is true, give the body `role="region"` and `aria-labelledby` the dialog title id.
- **Follow-up Task:** MC.31 Fix Names, Roles And Contrast Found By The Scans

### AX-9 Sign-In Stays Disabled While A Required Field Is Empty

- **Severity:** Low
- **WCAG Success Criterion:** None. This contradicts the owner's form rule (Save is disabled only when there is nothing to save). It is not recorded as a WCAG failure.
- **Source Ids:** A-15 (A-5, which first raised it, was withdrawn)
- **Where:** sign-in with email, with Email filled and Password empty ("Sign In" is disabled); and Save Working in the Record a Working dialog, with the people field filled ("Save Working" is disabled). Source: `src/components/SignInPanel/password-form.tsx:83` (`ready`) and `:209` (`disabled={!ready}`); `src/components/RecordWorking/form.tsx:154` (`disabled={!valid || submitting || waitFor !== undefined}`).
- **Found:** measured. The `disabled` attribute is present once one field has text. Forgot-password follows the rule: its button is disabled only when the email is empty, which is "nothing to save" (`ForgotPasswordForm/index.tsx:25,113`, and `SignInPanel/two-factor-step.tsx:50,115`). Other forms with required fields empty (Create Coven with a name only, Send Invitation, keeper invite, Save Group, Save Category, Save Stock) stayed enabled and produced errors.
- **Why It Matters:** A person who cannot see why a button is dead gets no message. The lane file lists SC 3.3.1 and 3.3.2 for this; I did not record them, because the owner's rule, not the criteria, is what the form breaks.
- **Recommended Fix:** Enable submit once any field has text, and let the form summary report the empty required fields.
- **Follow-up Task:** The sign-in part goes in MC.30. The Save Working part goes in MC.20 as an addition, because MC.20 already edits the Record a Working dialog.

### AX-10 Date Range Quick Picks Are Under 24 Pixels At 375

- **Severity:** Low
- **WCAG Success Criterion:** 2.5.8 Target Size (Minimum) (AA) [S1]
- **Source Ids:** A-3
- **Where:** `keeper/dlg-date-range-field` at 375 px, light and dark. Selector `.date-range-field__pick` ("Today" and 2 others). Source: `src/components/DateRangeField/index.tsx:181-190`, `src/components/DateRangeField/index.scss:91`.
- **Found:** measured, axe. The picks are partly obscured, the smallest free area is 57 by 17 px, the spacing is insufficient, and 3 nodes fail.
- **Why It Matters:** Three adjacent targets under 24 px are easy to mis-hit [S1]. It is Low because it is one screen and the typed fields do the same job.
- **Recommended Fix:** Raise the block padding to reach 24 px (the `$control-height` token or the target-size mixin) and add a gap between picks.
- **Follow-up Task:** Addition to MC.21 (see "Proposed Tasks", approved)

### AX-11 Duplicate Ids When The Spell Preview Opens

- **Severity:** Low
- **WCAG Success Criterion:** 4.1.2 Name, Role, Value (A) [S11], through `aria-labelledby`; axe `duplicate-id-aria` (best practice)
- **Source Ids:** A-10
- **Where:** `steward/dlg-spell-preview`: `spell-summary-title` and `spell-steps-title` appear in the page and in the dialog. Source: `src/components/SpellRecipe/sections.ts:4-5` (`STEPS_TITLE_ID`, `SUMMARY_TITLE_ID`), used in `SpellRecipe/summary.tsx:19`.
- **Found:** measured, axe.
- **Why It Matters:** With two elements sharing an id, `aria-labelledby` may point at the wrong one, so a section may get the wrong name [S11].
- **Recommended Fix:** Derive the ids with `useId` per instance.
- **Follow-up Task:** MC.31 Fix Names, Roles And Contrast Found By The Scans

### AX-12 Sort Header Is Empty At Phone Width

- **Severity:** Low
- **WCAG Success Criterion:** 1.3.1 Info and Relationships (A) [S13]; axe `empty-table-header` (best practice)
- **Source Ids:** A-11 (browser lane, measured), Suite A2 (suite lane, candidate)
- **Where:** `curator/curator-compendium` at 375 px, light and dark: `th[aria-sort=ascending]` and the sixth `th` (also the first in the suite run) have no text in the accessibility tree. The suite reported it in `axe.spec.ts` "pages as curator" part 1 of 3 and in `admin-compendium.spec.ts` blocks 109, 248 and 531 (phone). Source: `src/components/DataTable/index.tsx:118-126`, `src/scss/_primitives.scss` (about 1069-1087, the stacked layout) and `src/components/CompendiumList/index.tsx`.
- **Found:** measured, axe, in 2 views. The two lanes agree. The stacked layout hides `thead` visually, and a CSS comment says the text stays readable to screen readers; axe does not find it. The desktop heading is named ("Sorted ascending" is spoken), so the sort icon is not at fault: the arrow is `aria-hidden` and the name comes from the heading text. I did not take an accessibility-tree dump of the phone `thead`, so what a screen reader announces is not shown.
- **Why It Matters:** A column header with no text gives a screen-reader user a column with no name [S13].
- **Recommended Fix:** Keep the heading text in the accessibility tree when the table is stacked, as visually hidden text, and do not remove it.
- **Follow-up Task:** MC.31 Fix Names, Roles And Contrast Found By The Scans

### AX-13 Phone Tab Bar Comes Before The Content In Tab Order (Candidate)

- **Severity:** Low
- **WCAG Success Criterion:** 2.4.3 Focus Order (A) [S7]
- **Source Ids:** A-8
- **Where:** 375 px, every coven and keeper screen with the fixed bottom tab bar. 55 backwards jumps measured, for example "Members" to "Spells" on 7 screens. Source: the tab bar in the coven shell, before `main`.
- **Found:** measured as a Tab order, candidate, not proven as a failure. Tab goes header, tab bar (drawn at the bottom, y 749), page content (y 283), then footer. The order is consistent and keeps its meaning. It is a mismatch between visual and DOM order, not a trap.
- **Why It Matters:** A keyboard user reaches the tab bar before the page they came for [S7]. The finding is Low because the order is predictable.
- **Recommended Fix:** None required. To change it, move the bar after `main` in the DOM.
- **Follow-up Task:** None proposed. I need you to choose: fix it or leave it.

### AX-14 Generic Link Names (Candidate)

- **Severity:** Low
- **WCAG Success Criterion:** 2.4.4 Link Purpose (In Context) (A) [S17]
- **Source Ids:** A-13
- **Where:** "Details" on 12 screens, "Link" on 4, "Learn More" on 3, "Open" on 3, "Remove" on 2, and "More", "View" and "Delete" on 1 each. Source example: the "On This Page" entry labelled "Details" at `src/components/IngredientEntry/index.tsx:360` (the section heading is at `:405`) and the card actions.
- **Found:** candidate, not proven. The names sit inside cards whose heading gives the context, but I did not check that each link has that context programmatically (an `aria-describedby`, or the heading in the same list item).
- **Why It Matters:** Under 2.4.4 the purpose must be clear from the link text together with its context [S17]. If the context is not programmatic, a person listing links hears only "Details".
- **Recommended Fix:** Add the card name to each: an `aria-label` that starts with the visible text, or a visually hidden suffix.
- **Follow-up Task:** None proposed. I need you to choose whether to settle it with an accessibility-tree check of one card first.

### AX-15 The Required Marker Has No Key (Candidate)

- **Severity:** Low
- **WCAG Success Criterion:** 3.3.2 Labels or Instructions (A) [S12]
- **Source Ids:** C-7
- **Where:** `src/components/Field/shell.tsx`: `Required` is `<span aria-hidden="true">*</span>`.
- **Found:** candidate, not proven. Assistive technology gets `aria-required` or the native `required`, so the name and state are covered. A sighted person sees an asterisk with no sentence saying what it means. I did not check every form for a "* required" line, and the browser lane did not confirm it either.
- **Why It Matters:** An unexplained marker may not be understood [S12]. The owner's rule is to mark required fields and never write "(Optional)", so a key sentence per form would be the fix. This is a design choice that I cannot prove is a defect.
- **Recommended Fix:** Add one key sentence per form, or accept the asterisk as a convention.
- **Follow-up Task:** None proposed. I need you to choose.

### AX-16 No Skip Link On Seven Single-Card Pages (Candidate)

- **Severity:** Low
- **WCAG Success Criterion:** 2.4.1 Bypass Blocks (A) [S14]
- **Source Ids:** A-6
- **Where:** `signedOut` home, sign-in, forgot-password and reset-password; `invitee/invite-token`; `pausedAccount/access-paused`; `user/i-token`. The first Tab stop is the corner theme toggle. Source: the skip link is in `src/components/AppShell/index.tsx:42` and `src/components/PublicFrame/index.tsx:21`; `src/app/layout.tsx` renders the corner toggle.
- **Found:** measured as a missing link, candidate as a failure. 94 views have the link and these 7 have none, because they render without either frame.
- **Why It Matters:** Bypass Blocks is about skipping a repeated block [S14]. These pages are short and have no repeated block, so they may pass.
- **Recommended Fix:** None if the page has no repeated block; otherwise move the skip link into the root layout.
- **Follow-up Task:** None proposed. I need you to choose.

### AX-17 Latin Formal Names Carry No Language (Candidate)

- **Severity:** Low
- **WCAG Success Criterion:** 3.1.2 Language of Parts (AA) [S18]
- **Source Ids:** C-4
- **Where:** formal names (binomials) on the compendium, ingredient and spell pages. `grep -rn 'lang="la"' src` returns nothing.
- **Found:** candidate, not proven. Scientific binomials are commonly treated as proper names, which the criterion excepts.
- **Why It Matters:** A screen reader may read a Latin name with English rules [S18].
- **Recommended Fix:** One attribute on the formal-name element, if you want it.
- **Follow-up Task:** None proposed. I need you to choose.

### AX-18 Phone Filter Panel Closes On Pointer Down (Candidate)

- **Severity:** Low
- **WCAG Success Criterion:** 2.5.2 Pointer Cancellation (A) [S15]
- **Source Ids:** A-7
- **Where:** `steward/dlg-filters` and the facet panels at 375 px. Source: `src/components/FacetPanel/shell.tsx:143` (`onPointerDown`) and `:218`. `Modal` handles press and click correctly (`modal.tsx:240-248`).
- **Found:** measured, candidate, not proven as a failure. After a pointer down on the backdrop the panel count went from 1 to 0 before release. A closed panel keeps its filters, so it is probably acceptable as reversible.
- **Why It Matters:** An action that fires on the down event cannot be cancelled by moving off before release [S15]. Escape closes the panel too, as an equivalent.
- **Recommended Fix:** Dismiss on `click` after a pressed-outside check, as `Modal` does.
- **Follow-up Task:** None proposed. I need you to choose.

### AX-19 A Date Popover Covers Neighbouring Controls (Candidate)

- **Severity:** Low
- **WCAG Success Criterion:** 2.4.11 Focus Not Obscured (Minimum) (AA) [S16]
- **Source Ids:** A-12
- **Where:** `steward/dlg-date-field` (a popover over a switch and an entry-remove button) and `curator/curator-compendium` at 375 px (`category-more__button`). Source: the date popover in `src/components/DateField/` and the category-more control.
- **Found:** candidate, not proven. The check compares rectangles at Tab focus, not screenshots. It found 3 obscured cases and 110 partly obscured cases; partly obscured is not a failure at AA.
- **Why It Matters:** A focused control hidden under a popover cannot be seen [S16].
- **Recommended Fix:** Scroll the focused element clear of the popover, or close the popover when focus leaves it.
- **Follow-up Task:** None proposed. I need you to choose.

### AX-20 Spell Preview Animation Has No In-Page Pause (Candidate)

- **Severity:** Low
- **WCAG Success Criterion:** 2.2.2 Pause, Stop, Hide (A) [S19]
- **Source Ids:** C-3
- **Where:** `src/components/SpellPreview/index.scss`: embers, hearth, glow, float, and the pressed "Screen Awake" icon's 8 s blink, all `infinite`. A `prefers-reduced-motion` block sets `animation: none`. The scene is `aria-hidden`.
- **Found:** candidate, not proven. The motion runs for more than 5 s beside content, and closing the preview is the only stop without the operating-system setting. In the browser, with `prefers-reduced-motion` set, 0 animations run against 40 without it. The user opens the preview, the motion is slow and decorative, and it is not shown to flash, so it likely passes on essential or user-initiated grounds.
- **Why It Matters:** Moving content that runs over 5 s needs a way to stop it, unless it is essential [S19].
- **Recommended Fix:** None needed if you accept the user-initiated ground.
- **Follow-up Task:** None proposed. I need you to choose.

### AX-21 A Target Is 23.98 Pixels Tall In Firefox (Candidate)

- **Severity:** Low
- **WCAG Success Criterion:** 2.5.8 Target Size (Minimum) (AA) [S1]
- **Source Ids:** Suite A3
- **Where:** the "Edited just now" control, in Firefox only: `tests/e2e/card-click.spec.ts` lines 233 and 321. I did not locate its source.
- **Found:** candidate, not proven, marginal. The test reports a height of 23.98 px against 24 px, about 0.02 px short, probably sub-pixel rounding.
- **Why It Matters:** The target is almost 24 px, so a person would not notice. It fails the test, and the audit suite would stay red.
- **Recommended Fix:** If the element should be 24 px, set `min-block-size` to 24 px; otherwise give the test a 0.1 px tolerance.
- **Follow-up Task:** Addition to MC.21 (see "Proposed Tasks", approved)

### AX-22 No Guard Fails A Page Without A Title (Candidate)

- **Severity:** Low
- **WCAG Success Criterion:** 2.4.2 Page Titled (A) [S20]
- **Source Ids:** C-5
- **Where:** `tests/guards/page-titles.test.ts` fails on a title that repeats the site name or a separator. It does not fail on a page with no title. Four pages export neither `metadata` nor `generateMetadata`: `coven/[slug]/page.tsx`, `curator/page.tsx`, `keepers/page.tsx` and `(unmatched)/[...missing]/page.tsx`. Their layouts or the root template title them (`(shell)/curator/layout.tsx:11`, `(shell)/keepers/layout.tsx:12`, `(shell)/coven/[slug]/layout.tsx:19`).
- **Found:** candidate, not proven. There is no present failure. The `page-metadata` and `page-heads` guards were not read, so they may already cover it. The browser lane measured a document title on all 164 desktop views with 0 problems.
- **Why It Matters:** A future page could ship untitled without a test failing [S20].
- **Recommended Fix:** Read `page-metadata` and `page-heads`, and add the check only if neither has it.
- **Follow-up Task:** None proposed. I need you to choose.

## Audit Suite Results

I ran each audit suite once, with `npm run e2e:audit` and `npm run test:stories:audit`, in the projects `webkit`, `firefox` and `phone` (an iPhone profile). Both exited 1 (`.reports/m17.9/audit-exits.txt`).

- **e2e:** 1,555 passed, 93 failed, 1 skipped, 4 did not run.
- **Stories:** 357 passed, 30 failed, 6 skipped. The checklist shows 59 of 76 stories passing, 15 failing and 2 skipped (stories 73 and 74, skipped by the suite, not failures).

Counts below are distinct tests, with the same test across projects grouped. They are approximate, because failures were grouped by root cause. "Proven" means proven from the log and the source. Some error lines are paraphrased from the log blocks.

| Class                          | e2e                   | Stories (15 failing)                            |
| ------------------------------ | --------------------- | ----------------------------------------------- |
| App: accessibility             | 1 proven, 2 candidate | 0                                               |
| App: other                     | 4 candidate           | 2 candidate (85, 86)                            |
| Test: assumes desktop Chromium | about 24 tests        | 2 (17, 32), plus the phone part of 85           |
| Unknown                        | about 14 tests        | 11 (14, 18, 27, 30, 79, 81, 84, 87, 89, 90, 91) |

The unknown group is large because most WebKit and Firefox failures are `page.goto` interrupted, `NS_BINDING_ABORTED`, or "page closed" timeouts. The log does not say whether they are navigation races or browser-server drops.

### Proven Accessibility Failure

- **AX-5** `tests/e2e/help-widgets.spec.ts:92`, phone: the scrolling table frame, described above.

### Accessibility Candidates

- **AX-12** `axe.spec.ts` "pages as curator" part 1 of 3, and `admin-compendium.spec.ts` blocks 109, 248, 325 and 531, phone: the empty table header. Block 325 is a timeout on a closed page, not an axe result.
- **AX-21** `card-click.spec.ts` 233 and 321, Firefox: the 23.98 px target.
- **Forced colours, not an app finding:** `tests/e2e/forced-colours.spec.ts` lines 152, 280 and 438 fail on webkit and phone, because the computed colours are the author's (`rgb(94, 86, 69)` and `color(srgb 0.67451 ...)`) and not the system colours. `test.use({ forcedColors: 'active' })` is at line 148. WebKit does not apply that emulation, and the phone profile is mobile WebKit, so the page never entered forced-colours mode. Firefox passed. WCAG 1.4.11 Non-text Contrast and 1.4.1 Use of Color are therefore unmeasured on those projects.

### Other App Candidates

- **O1** `tests/e2e/stories/06-spell-preview.spec.ts:441`, Firefox (story 86): the eye tip bubble's `x + width` is 1013.8 against a viewport of 375. Source not located. Settle by viewing at 375 px in Firefox. Fix: clamp the bubble inside the viewport.
- **O2** story 85, webkit and firefox: in WebKit the Close button click is intercepted by `<div class="app-shell__end">` inside `<header class="app-shell__bar">`; in Firefox the Ingredients bottom is 383.85 against the steps top of 327.85. The app bar may sit over the pane in WebKit, and the columns may overlap in Firefox. No screenshot was read.
- **O3** `skeleton-layout.spec.ts:579`, webkit and phone: `pageNav.y` is 454 in the skeleton against 451 on the page in WebKit, and 455 against 451 on the phone. It may be a real shift or a test tolerance.
- **O4** `stack-row-skeleton.spec.ts:118`, four variants (light and dark, groups and values lists), Firefox: a placeholder row is 3 or 4 px off against a tolerance of 2.

### Tests That Assume Desktop Chromium

| Test file (line)                                                                                                                            | Count     | Projects               | Assumption                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spell-print.spec.ts` 18, 189                                                                                                               | 2         | webkit, firefox, phone | `page.pdf()` exists only on headless Chromium.                                                                                                                                                                                                    |
| `forced-colours.spec.ts` 152, 280, 438                                                                                                      | 3         | webkit, phone          | WebKit does not apply `forcedColors: 'active'`.                                                                                                                                                                                                   |
| `back-during-navigation.spec.ts` 72                                                                                                         | 1         | webkit, phone          | `route.fulfill` of a 307 redirect: "Cannot fulfill with redirect status: 307".                                                                                                                                                                    |
| `error-pages.spec.ts` 50 (and 59), `public-frame` 38, `navigation-wait` 160 and 183, `skeleton-footer` 39 (twice), `help-pages` 148 and 198 | about 10  | phone                  | `.app-shell__nav` is `display: none` at `tablet-down`; the links move into the AccountMenu (`src/components/AppShell/index.tsx:60`). The tests click `navigation 'Site'` links. Proven.                                                           |
| Stories 17 (four tests) and 32                                                                                                              | 2 stories | phone                  | The same hidden Site nav. Proven.                                                                                                                                                                                                                 |
| `document-sections.spec.ts:173-181`                                                                                                         | 5 routes  | phone                  | "On This Page" is a collapsible `<details>` (`DocumentPage/index.tsx:50`, `PageNav`), closed at phone width, so `nav.getByRole('link')` resolves to 0 elements. Proven. The routes are /privacy, /about, /disclaimer, /code-of-ethics and /terms. |
| `sign-in-dialog.spec.ts` 62                                                                                                                 | 1         | webkit, phone          | Phone: `page.mouse.wheel` is unsupported in mobile WebKit. WebKit: "Expected 279, Received 400", probably a race with `data-scroll-behavior="smooth"` (candidate).                                                                                |
| `sign-in-dialog.spec.ts` 129 (about line 158)                                                                                               | 1         | phone                  | `expect(a!.y).toBeCloseTo(b!.y, 0)`, with the comment "side by side on this desktop width".                                                                                                                                                       |
| `backdrop-placement.spec.ts` 41                                                                                                             | 1         | phone                  | Expects y 653.3; the phone gives 561.8. The test runs at 1280.                                                                                                                                                                                    |
| `spell-footer-layout.spec.ts` 14                                                                                                            | 1         | phone                  | Desktop footer layout.                                                                                                                                                                                                                            |
| `spell-dialog-size.spec.ts` 17 (twice)                                                                                                      | 2         | phone                  | Frame-count expectation.                                                                                                                                                                                                                          |
| `shell.spec.ts` 345                                                                                                                         | 1         | webkit, firefox, phone | `link count not.toBe(4)`; the tablet fit differs by engine (candidate).                                                                                                                                                                           |
| `admin-compendium.spec.ts` 890, 1147                                                                                                        | 2         | phone                  | 890 samples only 4 frames and expects more than 5. 1147 looks for `columnheader /^Name/` but the thead is hidden when stacked.                                                                                                                    |
| Story 85, phone part                                                                                                                        | 1         | phone                  | `mouse.wheel` is unsupported.                                                                                                                                                                                                                     |

### Unknown

| Test file:line                                                                                                 | Projects        | Error                                                                                                                                                                                                                                                      | What would settle it                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-support-curator.spec.ts:15`                                                                             | webkit, firefox | Reply field or button not found. The field is "Your Note" in default mode and "Your Reply" in reply mode (`src/components/SupportRequests/reply-form.tsx`). `tests/e2e/send-as.ts` clicks the Send As `summary`, then the option `label` at `{x:10,y:10}`. | `src/components/FacetPanel/choice-chip.tsx` keeps the menu `visibility: hidden` until its phase reaches `open` (`choice-chip.scss`), so an early click may miss it. One traced Firefox run. |
| Stories 89, 90, 91                                                                                             | firefox         | The same Send As cause is suspected.                                                                                                                                                                                                                       | The same.                                                                                                                                                                                   |
| `axe.spec.ts` "modals as user" part 1, "as steward" part 2 of 4, "as keeper" part 1                            | webkit          | Every entry "not reached": `page.goto` interrupted by another navigation (discard, help-screenshot, entry-details, user, mint-cards).                                                                                                                      | A traced re-run of one part; look for a pending prior navigation.                                                                                                                           |
| `axe.spec.ts` "modals as user" part 1, "as steward" parts 1 to 3 of 4, "as curator" part 1, "as keeper" part 1 | firefox         | `NS_BINDING_ABORTED` (invite, entry-edit, entry-annotate, spell-look, vocabulary-group, user, keeper-invite, card-attempts, discard, help-screenshot).                                                                                                     | The same.                                                                                                                                                                                   |
| `axe.spec.ts` "modals as user" part 1, "as steward" part 2, "as curator" part 1, "as keeper" part 1            | phone           | discard: `locator.click: Timeout 8000ms`; entry-edit, annotate-picker, vocabulary-group and keeper-invite: goto interrupted.                                                                                                                               | The same.                                                                                                                                                                                   |
| `coven-rename.spec.ts:89`                                                                                      | all three       | goto interrupted.                                                                                                                                                                                                                                          | The same.                                                                                                                                                                                   |
| `admin-documents.spec.ts:242`                                                                                  | firefox, phone  | Firefox `NS_BINDING_ABORTED`; phone goto interrupted by `/account/terms?next=`.                                                                                                                                                                            | The same.                                                                                                                                                                                   |
| `admin-help-order.spec.ts:182`                                                                                 | firefox         | `NS_BINDING_ABORTED` on reload.                                                                                                                                                                                                                            | The same.                                                                                                                                                                                   |
| `back-link.spec.ts` 105, 138                                                                                   | webkit, phone   | `waitForURL` timeout after the search `Enter` at `tests/e2e/stories/coven-ingredients.ts:307`.                                                                                                                                                             | Trace one run; check whether the search form needs hydration first.                                                                                                                         |
| `public-compendium.spec.ts` 128, 134, 188                                                                      | phone           | `Enter` in search does not change the URL.                                                                                                                                                                                                                 | The same.                                                                                                                                                                                   |
| `grimoire-skeleton.spec.ts` 67, 113 (twice)                                                                    | phone           | The same search or navigation timeout.                                                                                                                                                                                                                     | The same.                                                                                                                                                                                   |
| `compendium-my-covens.spec.ts:47`                                                                              | firefox         | `applyFilters` `waitForURL` timeout.                                                                                                                                                                                                                       | Trace the Apply Filters click.                                                                                                                                                              |
| `coven-ingredients.spec.ts:199`                                                                                | phone           | `waitForResponse` timeout.                                                                                                                                                                                                                                 | The same.                                                                                                                                                                                   |
| `admin-documents.spec.ts` 359, 385, 490, 604                                                                   | phone           | Locators for `listitem` and `heading` in `textbox 'Document Text'` not found.                                                                                                                                                                              | Dump the roles the Plate editor renders on mobile WebKit.                                                                                                                                   |
| `admin-cards.spec.ts:160`                                                                                      | phone           | Page or browser closed on the Apply Filters click.                                                                                                                                                                                                         | Browser-server logs; one re-run.                                                                                                                                                            |
| `admin-help-order.spec.ts:111`, `admin-help.spec.ts:142`                                                       | phone           | Help Outline link not found.                                                                                                                                                                                                                               | One run with a screenshot at phone width.                                                                                                                                                   |
| `admin-compendium.spec.ts:325`                                                                                 | phone           | Timeout on a closed page.                                                                                                                                                                                                                                  | Browser-server logs.                                                                                                                                                                        |
| Story 85, phone, block 24                                                                                      | phone           | Console error "due to access control checks" from an `_rsc` fetch.                                                                                                                                                                                         | Check the network panel for that request.                                                                                                                                                   |

### Stories Checklist

| Story  | Status  | Class                                                                      |
| ------ | ------- | -------------------------------------------------------------------------- |
| 14     | failing | Unknown (search Enter does not change the URL on phone; goto interrupted)  |
| 17     | failing | Test (Site nav hidden on phone)                                            |
| 18     | failing | Unknown (Firefox `NS_BINDING_ABORTED`, phone goto interrupted)             |
| 27     | failing | Unknown (Firefox `applyFilters` `waitForURL` timeout)                      |
| 30     | failing | Unknown (WebKit page closed; phone option outside the viewport)            |
| 32     | failing | Test (Site nav hidden on phone)                                            |
| 79     | failing | Unknown (phone goto interrupted)                                           |
| 81     | failing | Unknown (Firefox `page.reload` `NS_BINDING_ABORTED`)                       |
| 84     | failing | Unknown (WebKit page closed; Firefox `applyFilters` timeout)               |
| 85     | failing | App: other, candidate (O2); the phone part is a test fault (`mouse.wheel`) |
| 86     | failing | App: other, candidate (O1); the WebKit part is unknown (page closed)       |
| 87     | failing | Unknown (WebKit page closed on the preview Close click)                    |
| 89     | failing | Unknown (Firefox, reply field not found; Send As)                          |
| 90     | failing | Unknown (Firefox, "Add Note and Reply stay disabled until t..."; Send As)  |
| 91     | failing | Unknown (Firefox, the admin replies step; Send As)                         |
| 73, 74 | skipped | Not a failure; skipped by the suite                                        |

Story titles are in `.reports/m17.9/findings-suites.md`.

### SX-1 Audit Server Image Is Pinned Behind The Playwright Client

- **Severity:** Tooling, not rated
- **WCAG Success Criterion:** Not applicable
- **Where:** the `playwright-audit` service in `Docker/docker-compose.yaml`: its `image:` tag (line 322) and the `npx -y playwright@... run-server` command (line 325). The comment above them says the tag and the package version are the lockfile's and are kept in step by hand, and that a runner and a server on different versions refuse each other. `lighthouse-chrome` (line 342) uses the same image. `package.json` holds the `@playwright/test` range (line 140) and the scripts `e2e:audit` and `test:stories:audit` (lines 30-31).
- **Found:** proven from the files and observed. The image tag and the server package are one release behind the `@playwright/test` range in `package.json`. The first attempt at each suite, with the client the lockfile installs, failed every test at connect with HTTP 428 Precondition Required. The recorded run was made after matching the client to the server image for that run only.
- **Why It Matters:** Anyone who runs `npm run e2e:audit` or `npm run test:stories:audit` from a fresh install gets a refusal before any test runs. A hand-kept match drifts every time the client range moves.
- **Recommended Fix:** Make the tag and server package come from one place, or add a check that fails when they differ from the `@playwright/test` range.
- **Follow-up Task:** MC.32 Make The Audit Suites Run In WebKit, Firefox And Phone

### SX-2 The Server Start Skips Its Build When A Port Answers

- **Severity:** Tooling, not rated
- **WCAG Success Criterion:** Not applicable
- **Where:** `scripts/e2e-servers.ts:44`: the build is skipped when `forPlaywright && !process.env.CI && (await answers(first.url))`, and the script prints "Servers already up, build skipped". The comment at line 41 says the build otherwise always runs.
- **Found:** proven from the file, and the first start of the audit failed because of it: the first port of the harness's block already answered, so the build was skipped and the start failed.
- **Why It Matters:** An answer on the first port says that something is listening, not that it is this checkout's build. A start that trusts it fails, or tests the wrong build.
- **Recommended Fix:** Rebuild when the first port answers, or refuse with a message that names the process on that port.
- **Follow-up Task:** MC.32 Make The Audit Suites Run In WebKit, Firefox And Phone

## Proposed Tasks

The owner approved these tasks. They are approved and minted as MC.28 to MC.32, with additions to MC.20 and MC.21, in `claude-docs/tasks/v1/mc.md`. Each is one PR, in the milestone "Z. Cleanup", numbered from MC.28. Hours are my estimates, set from finished tasks of the same kind; no task document records actual time, so the hours in those tasks' headings were used. I checked the open tasks MC.15 to MC.27 in `claude-docs/tasks/v1/mc.md` for each file a finding would edit, by component name and by dialog name.

Checked and found:

- `HelpSearchForm` appears only in MC.6 (a refactor of hooks, menus and hover tips; it does not touch the submit button's size). The target-size findings go to MC.21, the task the code lane named as their home.
- `NameForm` appears only in MC.4, `GripHandle` only in MC.8, and `DataTable` only in MC.25; all three are refactors, so a behaviour change is a new task, not an addition.
- `AppShell`, `PublicFrame`, `Modal`, `SignInPanel` and `RecordWorking` appear by name in no open task. `RecordWorking` is edited in effect by MC.20, which names the "Record a Working" dialog in its criteria, so AX-9's Save Working part goes there.

### Additions To Existing Tasks

**Addition to MC.21 — Fix Empty Cells And Small Hit Areas** · from 3h to 5h (+2h, estimate)

Heading becomes `**MC.21 — Fix Empty Cells And Small Hit Areas** · 5h`. Add `AX-2`, `AX-10` and `AX-21` to its findings line, with the note "from `claude-docs/audits/accessibility.md`". Add these acceptance criteria before the final test-and-lint line:

- The help search submit button is at least 24 by 24 CSS pixels on the 13 help screens, and the input reserves room for it, at desktop and 375.
- The date range quick picks in the keeper date range field are at least 24 CSS pixels tall at 375, with a gap between them.
- The "Edited just now" control that `card-click.spec.ts` measures at lines 233 and 321 is at least 24 CSS pixels tall in Firefox.
- A Playwright check measures these three controls at 24 by 24 CSS pixels or larger, so the fault cannot return unseen (a regression test, because the three faults are shipped behaviour).
- Axe's `target-size` rule is enabled in the sweep in `tests/e2e/axe.ts`, and a target-size mixin exists in `src/scss/_mixins.scss` and is used by the help search button, the date range quick picks and the "Edited just now" control (R2).
- The R2 rule text is added to `claude-docs/styling.md`, beside the target-size note on chips, with a pointer from `.claude/rules/components.md`, "Styling".

Estimate based on: MB.258 (2h) and M12.56 (1.5h). Both are estimates. The two shared pieces (`SearchSubmit` and `DateRangeField`) are one fix each, and the third is a sub-pixel check that I have not located yet.

**Addition to MC.20 — Fix Dialog, Sheet And Page Spacing** · from 7h to 7.5h (+0.5h, estimate)

Heading becomes `**MC.20 — Fix Dialog, Sheet And Page Spacing** · 7.5h`. Add `AX-9` (the Save Working part) to its findings line, with the note "from `claude-docs/audits/accessibility.md`", and this criterion:

- Save Working stays enabled once the people field has text with a required field empty; pressing it flags the empty field and moves focus to it.

MC.20 already holds the same rule for Promote and Leave (F-11), so this is the same fix in the next dialog. Estimate based on: the Promote and Leave criterion already in MC.20.

### New Tasks

**MC.28 — Keep The App Header On One Line At 320 Pixels And Large Text** · 3h

_Story:_ As a person who reads at a large text size or on a narrow screen, I want the header controls to stay on screen, so that I never scroll sideways to reach them.

Minted from AX-1 (A-2).

_Acceptance criteria:_

- At a window 320 px wide, no signed-in or public page scrolls sideways because of the header.
- With the root font at 200% at 1280 px, the header and the section nav do not scroll the page sideways, and the section nav's More overflow follows the font size.
- Every header control stays reachable by keyboard and by pointer at both settings.
- A Playwright check fails on sideways page scroll at 320 px and at 200% root font, on one signed-in page and one public page (R5).
- The R5 rule text is added to `.claude/rules/testing.md`, "What a test asserts".
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: MB.264 (2h, the admin nav folds two tabs at desktop width) and MB.258 (2h). The figure is an estimate; there are two header files and one new check.

**MC.29 — Add Move Up And Move Down To Reorder Handles** · 5h

_Story:_ As a person who cannot hold and drag, I want to move a list item up or down with a tap, so that I can reorder without dragging.

Minted from AX-3 (C-1).

_Acceptance criteria:_

- `GripHandle` offers Move Up and Move Down as single presses, beside drag and keyboard, which keep working.
- The combobox chips, the help outline guides and rows, and the spell builder steps all use it.
- Move Up is unavailable on the first item and Move Down on the last, without losing focus.
- Moving an item announces its new position.
- A component test, with role and label queries, proves that pressing Move Down changes the order (a regression test, because the missing route is shipped behaviour).
- The `sortable-wiring` guard also fails a sortable list that uses no `GripHandle`, was seen failing once with a drag-only handle put back, and its allowlist is empty (R3).
- The R3 rule text is added to `.claude/rules/components.md`, "Shared pieces", on the existing `GripHandle` line.
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: M12.25 (3h) and M12.47 (3h). The figure is an estimate; it is one shared piece, three call sites and tests.

**MC.30 — Move Focus To Errors And Announce Outcomes** · 5h

_Story:_ As a person using a keyboard or a screen reader, I want a form to tell me what went wrong and what worked, so that I do not have to look for it.

Minted from AX-4 (A-16), AX-6 (A-14) and AX-9 (A-15, sign-in part).

_Acceptance criteria:_

- After Send Invitation succeeds, focus returns to the Invite button and "Invitation sent" is written into a status region that existed before the text.
- "Your name was saved." is written into a status region that existed before the text.
- On forgot-password, the account email form, Send Invitation and the keeper invite, a refused submit moves focus to the error summary or to the invalid field.
- Sign In stays enabled once any field has text; pressing it with the password empty flags the field and moves focus to it.
- Regression tests: one per fixed behaviour, asserting the focus target or the status text, by role and label (R4, a check only).
- The R4 rule text is added to `.claude/rules/components.md`, "Form inputs".
- The test files the change touches pass, and `npm run pre-commit` and `npm run lint` pass.

Estimate based on: M15.35 (4h, the support form validates on send and confirms) and M15.36 (4h, announces its changes). The figure is an estimate, and it is the sum of the parts less repeated branch and PR overhead; The menu-focus criterion that carried about 1h was removed with finding C-2.

**MC.31 — Fix Names, Roles And Contrast Found By The Scans** · 5h

_Story:_ As a person using a screen reader or a keyboard, I want every control and table to have a name and be reachable, so that I can read and use it. As a reader on the privacy, terms and compendium pages, I want the small muted text to be readable.

Minted from AX-5 (Suite A1), AX-7 (A-4), AX-8 (A-9), AX-11 (A-10) and AX-12 (A-11, Suite A2).

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

Estimate based on: M12.56 (1.5h, a contrast pass) and MB.258 (2h). The figure is an estimate; it is five small fixes in separate files, plus one shared table frame that replaces the hand-written ones. That frame raised it from 4h to 5h.

**MC.32 — Make The Audit Suites Run In WebKit, Firefox And Phone** · 8h

_Story:_ As a developer, I want `npm run e2e:audit` and `npm run test:stories:audit` to run and pass, so that I can see a real failure in another engine.

Minted from SX-1, SX-2, and the suite failures in "Audit Suite Results".

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

Estimate based on: M10.25 (3h, the first local audit in WebKit, Firefox and a phone profile), MB.237 (3h, the e2e image) and MB.275 (6h). The figure is an estimate and this is the largest task here; about 24 tests and 2 stories are involved, and the unknown group may need a traced run each. The owner approved it as one task.

## Proposed Rules

The owner adopted all seven rules; R4 is adopted as a rule. This audit changes no rule file. Each rule's text enters its rule file in the task that builds its check, not in this audit. Before proposing a check I searched `lint/`, `.stylelintrc.json`, `tests/guards/` and `tests/e2e/axe.ts` for one that already does the job, and read `.claude/rules/components.md` and `.claude/rules/testing.md`. None of the seven rules was stated in them. Where a check exists and misses something, the row says what it misses.

"Mechanism" means a shared piece makes the fault impossible. "Check" means a test can only find it afterwards.

| Id  | Rule text (as it would appear in the rule file)                                                                                                                                                                                          | Findings prevented                                      | Target file and heading                                                                                                                 | Enforcement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Task  | Owner's Choice |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------- |
| R1  | A frame that scrolls sideways is a focusable region with a name. It comes from one shared table frame, and no component writes `data-table-frame` itself.                                                                                | AX-5                                                    | `.claude/rules/components.md`, "Shared pieces"                                                                                          | Mechanism plus guard. The shared frame sets `role="region"`, `tabIndex` and the name, so a caller cannot forget them. A guard in `tests/guards/`, in the form of `sortable-wiring`, fails a `data-table-frame` class outside the shared piece. Today four files write it (`DataTable/index.tsx:102`, `HelpOutline/order-table.tsx:159`, `HelpWidget/role-permission-table.tsx:50`, `RichTextEditor/elements.tsx:84`), and `DocumentPage/markdown.tsx` sets its own region. Axe's `scrollable-region-focusable` already finds the fault, but only on a page a sweep reaches; a phone-width spec found it, not the sweep list. | MC.31 | Adopted        |
| R2  | A control a pointer presses has a hit area of at least 24 by 24 CSS pixels, or sits inside a sentence, or has 24 px of clear space round it. A control that looks smaller grows its hit area through one target-size mixin.              | AX-2, AX-10, AX-21                                      | `claude-docs/styling.md`, beside the target-size note on chips (line 121), with a pointer from `.claude/rules/components.md`, "Styling" | Mechanism for new controls (a mixin in `src/scss/_mixins.scss`; none exists today, and the chip draws a hand-written `::before`) and a check for the rest: axe's `target-size` rule in the sweep. I did not confirm that `tests/e2e/axe.ts` enables it; the audit lane added it by hand. A mixin cannot reach a control that never calls it, so the sweep is the backstop.                                                                                                                                                                                                                                                   | MC.21 | Adopted        |
| R3  | Every list a person can reorder by dragging has Move Up and Move Down buttons, and they come from the shared grip handle, so no caller draws a drag-only handle.                                                                         | AX-3                                                    | `.claude/rules/components.md`, "Shared pieces" (the existing `GripHandle` line)                                                         | Mechanism: the buttons live inside `GripHandle`. The existing guard `sortable-wiring` checks where the dnd-kit sensors are wired and does not check for a single-press alternative. I propose it also fails a sortable list that uses no `GripHandle`.                                                                                                                                                                                                                                                                                                                                                                       | MC.29 | Adopted        |
| R4  | A dialog that closes on success returns focus to its opener and writes the outcome into a status region that was already on the page. A refused submit moves focus to the error summary or the invalid field, in single-field forms too. | AX-4, AX-6                                              | `.claude/rules/components.md`, "Form inputs"                                                                                            | Check only. The existing lint rules cover `useForm` without `FormErrorSummary`; they do not see a single-field form or a dialog close. Playwright assertions on focus and on the status text, one per fixed form. A shared close helper that does both would be a mechanism; I have not designed one. AX-6 alone is Low and would not earn a rule; AX-4 is Medium and does.                                                                                                                                                                                                                                                  | MC.30 | Adopted        |
| R5  | The header reflows: at a 320 px window, and with the root font at 200%, no page scrolls sideways because of the header.                                                                                                                  | AX-1                                                    | `.claude/rules/testing.md`, "What a test asserts"                                                                                       | Check only. A Playwright assertion that `scrollWidth` does not exceed `clientWidth` on one signed-in page and one public page at both settings. No existing check does this: `viewport-widths.test.ts` only keeps spec widths in step with the breakpoint file.                                                                                                                                                                                                                                                                                                                                                              | MC.28 | Adopted        |
| R6  | The audit browser server's image tag and server package version equal the `@playwright/test` range in `package.json`.                                                                                                                    | SX-1                                                    | `.claude/rules/testing.md`, "Process"                                                                                                   | Guard. A test in `tests/guards/` reads `Docker/docker-compose.yaml` and `package.json` and fails when they differ. `tests/playwright-config.test.ts` checks only the endpoints, and `browser-server-packages.test.ts` is about the import graph, so neither covers it. The compose file says the match is kept by hand.                                                                                                                                                                                                                                                                                                      | MC.32 | Adopted        |
| R7  | A spec that needs desktop Chromium (`page.pdf()`, `forcedColors: 'active'`, `mouse.wheel`, a fulfilled redirect, the Site nav at desktop width) skips itself in the other projects with the reason, instead of failing there.            | The tests that assume desktop Chromium (about 24 tests) | `.claude/rules/testing.md`, "Process"                                                                                                   | Guard for the engine-specific calls (`page.pdf(`, `forcedColors`, `mouse.wheel`): the spec must carry a `test.skip` on the project. A guard cannot see layout assumptions (the hidden Site nav, a collapsed "On This Page"); those stay review only. `tests/e2e/fixtures.ts` has a `CHROMIUM_PROJECTS` set, but only for coverage.                                                                                                                                                                                                                                                                                           | MC.32 | Adopted        |

Considered and dropped:

- **Muted text over art (AX-7), duplicate ids (AX-11) and a scrolling dialog body (AX-8):** each is Low, and axe already finds the last two. A guard would repeat the sweep.
- **Generic link names, the required-marker key and skip links:** candidates only.

Each rule's check, and a criterion that adds its text to the file and heading in its row, are folded into the criteria of the task named in its row: R1 in MC.31, R2 in MC.21 (addition), R3 in MC.29, R4 in MC.30, R5 in MC.28, and R6 and R7 in MC.32. A code guard's criterion says it was seen failing once with the fault put back and that its allowlist is empty.

## Left As It Is

These were reported and then checked; they are not findings.

- **A-5 (withdrawn):** a submit button disabled on an untouched form. The owner's rule is that Save is disabled only when there is nothing to save, so a disabled empty submit is not a failure. A-15 (AX-9) replaced it.
- **C-2, focus lost after a menu choice:** refuted. The code lane rated it a Medium candidate, because `MenuButton/index.tsx:186-191` sets the menu `inert` on a choice. The browser lane's second pass measured it at three sites (the Add Ingredient menu, the ingredient card's "More for Rosemary", and the ingredient page's "More for ..." with Edit Stock and Delete Ingredient). Enter on a choice moved focus into the dialog it opened, and Escape returned focus to the trigger each time. The four `onSelect` sites are in `IngredientEntry/annotate-more.tsx`, `AppShell/add-ingredient-menu.tsx`, `IconTip/icon-button.tsx` and `AddIcon/index.tsx`; a choice that opens no dialog was not found among those tried.
- **C-6, the Pager's disabled end:** `src/components/Pager/index.tsx:13-16` renders `<a role="link" aria-disabled="true">` with no `href`, with a named lint disable. A link without `href` is announced as disabled and is not focusable, which is acceptable under 4.1.2. It is proven and has no failure.
- **F-74, the sort icon without a name:** refuted. The arrow is `aria-hidden` and the name comes from the heading text.
- **F-61, the FAQ link that doubles the heading name:** refuted. On `/help` the link's accessible name is "Frequently Asked Questions", the same as its visible text.
- **F-60, the heading skip after Details:** not reproduced. Of 164 desktop views, 2 start a dialog at h2 (`signedOut/dlg-sign-in`, `steward/dlg-add-ingredient`), which is not a skip within a page.
- **F-7, the icon-only Delete in edit dialogs:** refuted. It is named "Delete Ingredient" (32 by 32 px), with a tooltip on hover and on keyboard focus.
- **F-75, the footnote marker:** 23.5 by 16 px, inline in a sentence, so exempt. Axe reports nothing. The neighbouring `fnref-1` and "Source 2" at 375 px share spacing, which is a Low watch and not a finding.
- **F-21, small buttons at 375:** 3,589 of 12,015 targets are under 24 px, and most are exempt. 160 geometry failures are tab-bar and inert-background artefacts. Axe agrees only on AX-2 and AX-10.
- **The muted mail footer:** refuted from the palette. In `src/emails/theme.ts` the muted colour is 9.67:1 on the dark page and 5.99:1 on the light page. The rendered mail contrast was not measured.
- **`aria-valid-attr-value` on 50 screens, 232 nodes:** comboboxes pointing `aria-controls` at a closed listbox, a tolerated pattern.
- **`label-content-name-mismatch` on 48 screens:** the "×" glyph on a button named "Close".
- **`h2.spell-card__title > a` "no focus indicator" (4):** a false positive; the ring is drawn on the card by `.spell-card:has(.spell-card__title a:focus-visible)::after`.
- **The hidden username field in `PasswordSection`:** `aria-hidden` and `tabindex=-1` for password managers, on purpose.
- **`autocomplete=off` on the invite email fields:** not 1.3.5, which covers the user's own data.
- **The Close button in dialogs:** 32 by 32 px, reached on Shift+Tab because the first Tab starts on the first field. Not a finding.
- **Hover reveals:** no `:hover` reveals content without a focus twin.
- **Dialogs at 375:** focus on open went into the dialog every time, Tab never reached the page behind, and Escape closed the dialogs and returned focus to the opener. On the stock form and Quick Look the first Escape left the dialog open; that is consistent with the tooltip on the focused control taking the first Escape (candidate, not proven; a second Escape was not tried).
- **Clean by measurement:** document title, `lang` and exactly one `h1` on 164 desktop views; landmarks (no duplicates); images and svgs (0 problems); `tabindex` above 0 (0); `autofocus` (0); autoplay (0); meta viewport (all fine); page zoom to 200% (0 views overflow); text spacing (0 views overflow); input borders (at least 5.99:1); wrong-password sign-in (error in `role=alert`, focus moved); keyboard (no trap, every walk ends on `body`); search status messages (present); InfoTip (passes 1.4.13); AccountMenu, MenuButton, Combobox, Disclosure and HelpTerm (behave as the ARIA Authoring Practices describe).
- **Clean by code reading:** `lang="en"` on `src/app/layout.tsx:30` and on the mail layout; no `maximum-scale` or orientation lock; every bare `outline: none` has a replacement ring or is a `tabindex=-1` script-focus target; no action fires on a down event except the dismissals in AX-18; no `onPaste`, `onCopy` or `onDrop` handler (3.3.8); Help and Support sit in the same place on every layout (3.2.6); the form error and summary pattern; the stated lifetimes of reset, verification, view-link and invitation tokens.
- **Nothing with time limits, audio, video or captions exists,** so 1.2.x and 2.2.1 had nothing to measure.

## Seen For M17.9

The answer to each observation in the "Seen For M17.9" table of `claude-docs/audits/design-ux.md`.

| Observation                                                                               | Criterion         | Answer                                                                                                                                                            |
| ----------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small buttons about 24 px tall at 375 (F-21)                                              | 2.5.8 [S1]        | Confirmed small, mostly exempt. Measured: 3,589 of 12,015 targets are under 24 px; axe fails only the help search button (AX-2) and the date range picks (AX-10). |
| Footnote marker "#1" is small plain text (F-75)                                           | 2.5.8 [S1]        | Refuted as a failure. Measured 23.5 by 16 px, inline in a sentence, so exempt.                                                                                    |
| Heading levels skip after Details (F-60)                                                  | 1.3.1 [S13]       | Refuted. Not reproduced on 164 desktop views.                                                                                                                     |
| FAQ link doubles the heading name (F-61)                                                  | 2.5.3 [S22]       | Refuted. The accessible name matches the visible text.                                                                                                            |
| Hint in error red; seven red card outlines; icon-only support status (F-5, F-24, F-69)    | 1.4.1 [S21]       | Not measured. The support form shows nothing without its link token, so the hint colour (F-5) did not run; F-24 and F-69 were not opened.                         |
| Decorative art behind text (F-15)                                                         | 1.4.3 [S10]       | Confirmed. Measured in pixel samples as AX-7.                                                                                                                     |
| Muted mail footer lines and the privacy nav item look low contrast                        | 1.4.3 [S10]       | Refuted for the mail palette (9.67:1 dark, 5.99:1 light) and for the nav items (5.94 to 9.67:1). The rendered mail contrast is not measured.                      |
| Sort icon may lack a name (F-74)                                                          | 4.1.2 [S11]       | Refuted at desktop: the heading text names it. The stacked table at 375 has an empty header (AX-12).                                                              |
| Icon-only Delete in edit dialogs has a screen-reader name but no visible label (F-7)      | 2.5.3 [S22]       | Refuted. It is named "Delete Ingredient" and shows a tooltip on hover and keyboard focus.                                                                         |
| Aria-label casing (F-79)                                                                  | Not a WCAG matter | Not measured.                                                                                                                                                     |
| The sweep for unnamed icons found none, and the sweep for images without `alt` found none | Not applicable    | Confirmed by measurement: images and svgs had 0 problems.                                                                                                         |
| Target-size sweep hits were not proven under 24 px                                        | 2.5.8 [S1]        | Measured. Only AX-2 and AX-10 are proven under 24 px; the other hits are exempt or artefacts.                                                                     |

## Not Covered

- **WebKit and Firefox for the hand measurements.** Axe, keyboard and target measurements ran in Chromium only. WebKit, Firefox and the phone profile ran only the audit suites.
- **Modal axe sweeps** were not reached in WebKit, Firefox and phone: the suites' "modals" parts report `page.goto` interrupted or `NS_BINDING_ABORTED`.
- **Forced colours** is unmeasured in WebKit and on the phone profile, because WebKit does not apply the emulation. Firefox passed. Contrast under forced colours is unchecked by axe by design.
- **The unclassified suite failures:** about 14 e2e tests and 11 stories, listed under "Unknown".
- **The support request form behind its link token.** The hint colour (F-5) and its error pattern were not measured.
- **Error-submit paths** for the document link form, the spell builder and the support request form were not reached.
- **A second Escape** in the stock and Quick Look dialogs.
- **Rendered mail contrast.** The 29 templates were measured by axe only, and all 58 `color-contrast` results were "incomplete". The palette values are in `src/emails/theme.ts`.
- **No real screen reader** (NVDA, JAWS, VoiceOver or TalkBack). What a screen reader announces was inferred from roles, names and live regions.
- **The fixed tab bar over the footer** at the scroll bottom, the skip link on `state-*` pages, and 8 input borders (the custom "Coven" select, whose colour is in `color(srgb)` form, and the "Add to Jar" combobox, whose border is on a wrapper).
- **Code not read:** the contents of `tests/guards/*` other than `page-titles`; each mail template body beyond `reset-password.ts` and the shared layout; the slider semantics Ark UI supplies to `ChipColorField`; each destructive action for 3.3.4; every form for a required-marker key; and session expiry beyond Better Auth's default.
- **The suite lane did not read** screenshots, traces, videos or `error-context.md` files, the tip placement source for story 86, the AppShell bar and full-screen pane CSS for story 85, or the 4 e2e tests that did not run.

## Sources

- [S1] W3C. "Understanding Success Criterion 2.5.8: Target Size (Minimum)." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- [S2] W3C. "Understanding Success Criterion 1.4.10: Reflow." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- [S3] W3C. "Understanding Success Criterion 1.4.4: Resize Text." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
- [S4] W3C. "Understanding Success Criterion 2.5.7: Dragging Movements." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- [S5] W3C. "Understanding Success Criterion 4.1.3: Status Messages." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- [S6] W3C. "Understanding Success Criterion 2.1.1: Keyboard." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html
- [S7] W3C. "Understanding Success Criterion 2.4.3: Focus Order." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html
- [S8] W3C. "Understanding Success Criterion 3.3.1: Error Identification." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- [S9] W3C. "Understanding Success Criterion 3.3.3: Error Suggestion." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html
- [S10] W3C. "Understanding Success Criterion 1.4.3: Contrast (Minimum)." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- [S11] W3C. "Understanding Success Criterion 4.1.2: Name, Role, Value." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- [S12] W3C. "Understanding Success Criterion 3.3.2: Labels or Instructions." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html
- [S13] W3C. "Understanding Success Criterion 1.3.1: Info and Relationships." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html
- [S14] W3C. "Understanding Success Criterion 2.4.1: Bypass Blocks." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html
- [S15] W3C. "Understanding Success Criterion 2.5.2: Pointer Cancellation." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html
- [S16] W3C. "Understanding Success Criterion 2.4.11: Focus Not Obscured (Minimum)." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- [S17] W3C. "Understanding Success Criterion 2.4.4: Link Purpose (In Context)." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html
- [S18] W3C. "Understanding Success Criterion 3.1.2: Language of Parts." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html
- [S19] W3C. "Understanding Success Criterion 2.2.2: Pause, Stop, Hide." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- [S20] W3C. "Understanding Success Criterion 2.4.2: Page Titled." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html
- [S21] W3C. "Understanding Success Criterion 1.4.1: Use of Color." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- [S22] W3C. "Understanding Success Criterion 2.5.3: Label in Name." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html
