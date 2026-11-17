# Design And UX Audit

## Purpose

This is the design and UX audit of every screen, dialog and mail the app draws, for task M17.7. It lists what looks wrong, inconsistent or confusing, ranks it, and proposes the tasks and rules that would fix it and keep it fixed. It changes no code.

Accessibility was not the job here; that is M17.9. Every accessibility observation is in "Seen For M17.9", with its WCAG criterion and whether it was measured.

### What The Owner Needs To Do

The owner has recorded a choice on every finding except the eleven still open. Each finding's Owner's Choice line shows it.

I need you to answer these open findings: F-2, F-5, F-28, F-41, F-46, F-52, F-58, F-64, F-66, F-71 and F-75. Nothing else needs your action.

Your decision of 2026-11-17, that the shell bar's solid Add Ingredient may sit beside a page's solid button, is applied: that finding is withdrawn, and the wording correction is on the proposed-rules list. F-39, F-67 and F-69 are withdrawn after your notes and are listed under Left As It Is. Proposed Tasks are not yet regrouped for your choices.

## Scope

Counts come from `manifest.json`, counted by script. The manifest lists 197 rows: 101 pages, 16 error pages, 29 mails, 48 dialogs and 3 phone states. By persona: steward 47, curator 21, observer 6, practitioner 8, signed out 32, user 24, recipient 29, keeper 25, and one each for invitee, paused account, paused member, unagreed and unverified. 780 pictures exist on disk; the dialog for the entry summary failed to capture.

Each screen was shot at 375 and desktop width, in light and dark. The route list in `tests/e2e/axe-scans.ts` (`ROUTE_SCANS`, line 39) has 68 entries and the dialog list (`MODAL_SCANS`, line 121) has 43, counted by script.

### Skipped Because A Rule Proves It

These were not audited by eye, because a lint rule or guard already fails the build: page heads (`tests/guards/page-heads.test.ts`), paging (`pagination.test.ts`), shared names in `src/lib/` (`lib-names.test.ts`), axe coverage (`axe-scans.test.ts`), shared field messages (`field-message.test.ts`), limit messages (`limit-message.test.ts`), failure messages (`failure-message.test.ts`), not-found pages (`not-found.test.ts`), the admin area (`admin-area.test.ts`), page titles (`page-titles.test.ts`), page pieces (`page-pieces.test.ts`), the placeholder lint (`sorrel/placeholder-is-short`), and the sweeps for unnamed icons and `outline: none`. The pagination guard does not look at a page that passes a fixed `limit:`; that is F-14.

### Limits

- Pictures show layout, not behaviour. Where a finding needs a browser, it says "not settled; needs a look in a browser".
- Contrast, tap targets and accessible names were not measured.
- Some long pages were read in tiles; a few lower tiles were not opened: signed-out help, glossary and search at 375 dark, Code of Ethics at 375 light, the compendium entry at 375 dark, and the lower tiles of privacy and terms at 375 light.
- The flow step counts come from the story specs. No spec was read for the keeper's edit of a help article beyond `admin-help.spec.ts`, and some flows have no spec.
- The capture server has no sign-in provider credentials, and some fixture names are long; both can create faults that are not the app's.

## Method

A reader opened the pictures for each persona and wrote findings with the screen, width and theme. A second pass read the code for the findings that code can settle, and cited `file:line`. What code cannot settle is marked not settled. Each finding was then checked against the rules in `.claude/rules/components.md`, `claude-docs/styling.md` and `CLAUDE.md`; findings that the rules allow went to "Left As It Is". Findings that duplicate `claude-docs/audits/dry.md` cite its D-id.

Severity scale:

- **High:** a person cannot finish a task or is misled.
- **Medium:** the screen breaks a written rule, or differs from its siblings in a way people notice.
- **Low:** a small inconsistency.

Within a severity, the finding on more screens ranks first. No finding is High. I name each rating I am unsure of inside its finding.

## Summary

| Id   | Lane ids                     | Title                                           | Severity | Area          | Proposed task                                                           | Owner's Choice                                             |
| ---- | ---------------------------- | ----------------------------------------------- | -------- | ------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| F-1  | CP-2, S-2, A-3, P-11         | Dates And Times In Mixed Formats                | Medium   | Cross-cutting | Route Every Date Through utc.ts                                         | Fix, Long In Detail, Short In Tables                       |
| F-2  | P-1                          | 404 Page Offers Help Four Ways                  | Medium   | Public        | Give Error And Gate Pages One Layout                                    | Open: awaiting the owner's answer                          |
| F-3  | S-1, C-4, CD-8               | Non-Literal Placeholders Escape The Length Lint | Medium   | Cross-cutting | Make The Placeholder Lint Refuse Non-Literal Values                     | Skip                                                       |
| F-4  | S-29                         | Staff Help Drops The Keepers Frame              | Medium   | Keepers       | Draw Staff Help Inside The Keepers Frame                                | Fix, Staff Help Inside The Keepers Frame                   |
| F-5  | A-7, P-9                     | Support Hint Drawn In Error Red                 | Medium   | Public        | Fix The Support Form Hint, Radio Cards And Messages                     | Open: awaiting the owner's answer                          |
| F-6  | A-9                          | Site Role Written As Lower-Case Keeper          | Medium   | Account       | Write Keeper With A Capital                                             | Fix                                                        |
| F-7  | CD-4                         | Delete Control Differs Between Edit Dialogs     | Medium   | Dialogs       | Give Every Edit Dialog One Footer                                       | Fix, Icon Delete With Tooltip                              |
| F-8  | A-14                         | Group Error Ends In A Full Stop                 | Medium   | Public        | Fix The Support Form Hint, Radio Cards And Messages                     | Fix                                                        |
| F-9  | CP-8, S-17                   | Page Delete Buttons Drawn Red                   | Medium   | Cross-cutting | Bring Red Controls Into The Rule                                        | Fix, Split                                                 |
| F-10 | C-2                          | Decline Invitation Drawn Red                    | Medium   | Account       | Bring Red Controls Into The Rule                                        | Answer, Add Decline To The Named Red Controls              |
| F-11 | CD-1                         | Leave Dialog Disables Its Primary Button        | Medium   | Dialogs       | Flag New Steward On Submit In The Leave Dialog                          | Fix                                                        |
| F-12 | P-6, T-1                     | Compendium Entry Leaves A Blank Gap             | Medium   | Compendium    | Fix The Compendium Entry Layout                                         | Skip                                                       |
| F-13 | S-16                         | Keepers Hub Says Admin Invitations              | Medium   | Keepers       | Write Keeper With A Capital                                             | Fix                                                        |
| F-14 | MB.301                       | Help Search Shows No Pager                      | Medium   | Public        | MB.301, Help Search Shows Every Match a Page at a Time (already minted) | Skip                                                       |
| F-15 | A-16, P-15, S-11, S-14, S-30 | Decorative Art Overlaps Text                    | Low      | Cross-cutting | Stop Decorative Art Covering Text                                       | Skip                                                       |
| F-16 | CP-3, CP-4, S-10, S-27       | Empty Table Cells And Card Labels               | Low      | Cross-cutting | Show One Mark In Empty Cells                                            | Fix, Dash In The Cell                                      |
| F-17 | P-16, S-11, S-31             | Straight And Curly Quotes Mixed                 | Low      | Public        | Tidy Copy On Account, Public And Keeper Screens                         | Fix, Bold Field Names Instead Of Quotes                    |
| F-18 | CD-8, S-3                    | Two Close Buttons In The Filters Sheet          | Low      | Dialogs       | Fix 375 Layout Faults In Sheets And Dialogs                             | Fix, An X Button In The Sheet Header                       |
| F-19 | P-5, CP-7                    | Safety Note Repeated On One Entry               | Low      | Compendium    | Fix The Compendium Entry Layout                                         | Fix, Once Per Page                                         |
| F-20 | CP-7, T-2                    | Empty Value Lines Repeat                        | Low      | Compendium    | Fix The Compendium Entry Layout                                         | Fix, Hide Empty Groups                                     |
| F-21 | A-17                         | Small Buttons Under 24px At 375                 | Low      | Account       | Fix 375 Layout Faults In Sheets And Dialogs                             | Fix, Padding Grows The Hit Area                            |
| F-22 | CP-1                         | Coven Switcher Chevron Wraps                    | Low      | Coven         | Fix 375 Layout Faults In Sheets And Dialogs                             | Fix, Truncate The Name                                     |
| F-23 | A-11, P-10                   | Support Radio Cards Laid Out Differently        | Low      | Public        | Fix The Support Form Hint, Radio Cards And Messages                     | Fix, Always Stacked                                        |
| F-24 | A-14                         | Every Radio Card Turns Red For One Error        | Low      | Public        | Fix The Support Form Hint, Radio Cards And Messages                     | Skip                                                       |
| F-25 | A-18                         | Radio Card Looks Selected When Empty            | Low      | Public        | None                                                                    | Fix                                                        |
| F-26 | S-13, S-22                   | Keeper Form Pages Differ In Width               | Low      | Keepers       | Align The Keeper Pages                                                  | Fix, One Narrow Width For Form Pages                       |
| F-27 | S-15                         | Tab Strips Start Clipped                        | Low      | Keepers       | Align The Keeper Pages                                                  | Fix, Start At The First Tab And Add A Fade Cue At The Clip |
| F-28 | S-12, S-33                   | Support Status Filters Hidden At 375            | Low      | Keepers       | Fix 375 Layout Faults In Sheets And Dialogs                             | Open: awaiting the owner's answer                          |
| F-29 | S-21, S-32                   | Download CSV Solid On Empty List                | Low      | Keepers       | Align The Keeper Pages                                                  | Fix, Disabled While The List Is Empty                      |
| F-30 | S-7                          | Uneven Gaps In Dialogs                          | Low      | Dialogs       | Even Out Dialog Gaps And Eyebrows                                       | Fix                                                        |
| F-31 | A-13, CD-13                  | Confirm Buttons Wrap At 375                     | Low      | Dialogs       | Fix 375 Layout Faults In Sheets And Dialogs                             | Fix                                                        |
| F-32 | CD-10                        | Dialog Eyebrow Halo In Dark                     | Low      | Dialogs       | Even Out Dialog Gaps And Eyebrows                                       | Fix                                                        |
| F-33 | CD-11                        | Builder Eyebrow Wraps At 375                    | Low      | Dialogs       | Even Out Dialog Gaps And Eyebrows                                       | Fix, Align The Wrapped Lines                               |
| F-34 | CD-6                         | Complete Action Has Two Names                   | Low      | Dialogs       | Give Every Edit Dialog One Footer                                       | Fix, Name It Complete                                      |
| F-35 | CD-7                         | Confirm Title Misnames The Action               | Low      | Dialogs       | Give Every Edit Dialog One Footer                                       | Fix                                                        |
| F-36 | CD-9                         | Share Toggle Sits Under Its Label               | Low      | Dialogs       | Even Out Dialog Gaps And Eyebrows                                       | Fix, Keep Under The Label And Close The Gap                |
| F-37 | CD-12                        | Member Dialog Date Wraps Mid-Date               | Low      | Dialogs       | Even Out Dialog Gaps And Eyebrows                                       | Fix                                                        |
| F-38 | CD-12                        | Stray Dot Before None                           | Low      | Cross-cutting | Tidy Copy On Account, Public And Keeper Screens                         | Fix                                                        |
| F-39 | CD-13                        | Delete Coven Radio Carries No Warning           | Low      | Dialogs       | Bring Red Controls Into The Rule                                        | Withdrawn                                                  |
| F-40 | CD-14                        | Spell Preview Repeats Ingredients               | Low      | Dialogs       | Tidy Copy On Account, Public And Keeper Screens                         | Skip                                                       |
| F-41 | CD-14                        | Entry Details Has An Empty Header Band          | Low      | Dialogs       | Even Out Dialog Gaps And Eyebrows                                       | Open: awaiting the owner's answer                          |
| F-42 | CD-14                        | Invite Dialog Copy Is Wordy                     | Low      | Dialogs       | Tidy Copy On Account, Public And Keeper Screens                         | Fix                                                        |
| F-43 | CD-2                         | Footers Out Of View At 375                      | Low      | Dialogs       | None                                                                    | Skip                                                       |
| F-44 | A-1                          | Document Mail Has Two Solid Buttons             | Low      | Mail          | Tidy The Mail Calls To Action And Headings                              | Skip                                                       |
| F-45 | A-2                          | Sign-In Instruction Has No Link                 | Low      | Mail          | Tidy The Mail Calls To Action And Headings                              | Fix, Link "account page" To The Account Page               |
| F-46 | A-4                          | Reset Button Has Two Labels                     | Low      | Mail          | Tidy The Mail Calls To Action And Headings                              | Open: awaiting the owner's answer                          |
| F-47 | A-5                          | Support Mail Headings In Sentence Case          | Low      | Mail          | Tidy The Mail Calls To Action And Headings                              | Fix, Title Case The Lead-In                                |
| F-48 | P-2                          | Error Pages Share No Layout                     | Low      | Public        | Give Error And Gate Pages One Layout                                    | Fix, One Shared Body                                       |
| F-49 | P-4                          | Gate Cards Align Differently                    | Low      | Public        | Give Error And Gate Pages One Layout                                    | Fix                                                        |
| F-50 | P-18                         | Reset Password Spacing Uneven                   | Low      | Public        | Give Error And Gate Pages One Layout                                    | Fix, Make The Spacing Consistent                           |
| F-51 | P-3                          | Disabled Provider Message Repeats               | Low      | Public        | None                                                                    | Skip                                                       |
| F-52 | A-10, A-12, P-19             | Blocked States Give No Next Step                | Low      | Account       | Tidy Copy On Account, Public And Keeper Screens                         | Open: awaiting the owner's answer                          |
| F-53 | CP-6                         | Refused Invitations Page Drops The Shell        | Low      | Coven         | None                                                                    | Answer, Show Not Authorized Inside The Shell               |
| F-54 | A-8                          | Request Thread Shows You Twice                  | Low      | Public        | Fix The Support Form Hint, Radio Cards And Messages                     | Fix                                                        |
| F-55 | P-12                         | Compendium No-Match Says It Twice               | Low      | Compendium    | Tidy Copy On Account, Public And Keeper Screens                         | Fix                                                        |
| F-56 | P-17                         | Terms Offered Three Ways                        | Low      | Account       | Tidy Copy On Account, Public And Keeper Screens                         | Skip                                                       |
| F-57 | A-15                         | Sign-In Methods Repeats Sections                | Low      | Account       | None                                                                    | Skip                                                       |
| F-58 | CP-5                         | Overview Contents Repeats Navigation            | Low      | Coven         | None                                                                    | Open: awaiting the owner's answer                          |
| F-59 | S-13                         | Keepers Hub Repeats Its Own Navigation          | Low      | Keepers       | Align The Keeper Pages                                                  | Skip                                                       |
| F-60 | P-7                          | Heading Level Skips After Details               | Low      | Compendium    | Fix The Compendium Entry Layout                                         | Fix, Correct The Level Without Making The Headings Larger  |
| F-61 | P-14                         | FAQ Link Doubles Heading Name                   | Low      | Public        | None                                                                    | Fix                                                        |
| F-62 | S-20                         | Add Ingredient Twice On Curator Compendium      | Low      | Keepers       | Align The Keeper Pages                                                  | Fix, Correct The Doc To Add Ingredient                     |
| F-63 | S-4                          | Date Popover Covers Top Bar                     | Low      | Dialogs       | Even Out Dialog Gaps And Eyebrows                                       | Fix                                                        |
| F-64 | S-5                          | Colour Hint Says Under The Veil                 | Low      | Keepers       | Tidy Copy On Account, Public And Keeper Screens                         | Open: awaiting the owner's answer                          |
| F-65 | S-6                          | Refused Opens Intro Hard To Read                | Low      | Keepers       | Tidy Copy On Account, Public And Keeper Screens                         | Fix                                                        |
| F-66 | S-9                          | Sourcing Score Heading Clipped                  | Low      | Keepers       | Align The Keeper Pages                                                  | Open: awaiting the owner's answer                          |
| F-67 | S-19                         | People Page Has A Users Toggle                  | Low      | Keepers       | None                                                                    | Withdrawn                                                  |
| F-68 | none                         | People Cards Very Tall At 375                   | Low      | Keepers       | Align The Keeper Pages                                                  | Fix                                                        |
| F-69 | none                         | Support Status Is An Icon Only                  | Low      | Keepers       | Align The Keeper Pages                                                  | Withdrawn                                                  |
| F-70 | none                         | Staff Help Card Eyebrows Repeat Guide           | Low      | Keepers       | Draw Staff Help Inside The Keepers Frame                                | Skip                                                       |
| F-71 | S-24                         | Group Shown Two Ways                            | Low      | Keepers       | Align The Keeper Pages                                                  | Open: awaiting the owner's answer                          |
| F-72 | S-25                         | Toggle Label Repeats As Shown                   | Low      | Keepers       | Align The Keeper Pages                                                  | Fix, Label Above Only                                      |
| F-73 | S-26                         | Help Guide Counts Blank                         | Low      | Keepers       | Align The Keeper Pages                                                  | Skip                                                       |
| F-74 | S-28                         | Sort Icon May Lack A Name                       | Low      | Keepers       | None                                                                    | Fix                                                        |
| F-75 | T-3                          | Footnote Marker Is Small Plain Text             | Low      | Public        | None                                                                    | Open: awaiting the owner's answer                          |
| F-76 | T-4                          | Signed-In Help Hides Compendium Link            | Low      | Public        | None                                                                    | Fix                                                        |
| F-77 | T-5                          | Gap Between Intro And First Heading             | Low      | Public        | Even Out Dialog Gaps And Eyebrows                                       | Fix                                                        |
| F-78 | C-7                          | Auth Error Messages End In Full Stop            | Low      | Account       | Tidy Copy On Account, Public And Keeper Screens                         | Fix                                                        |
| F-79 | C-6                          | Aria-Labels Mix Title And Sentence Case         | Low      | Cross-cutting | None                                                                    | Answer, Title Case                                         |
| F-80 | C-5                          | Placeholder Casing Differs From Siblings        | Low      | Cross-cutting | Make The Placeholder Lint Refuse Non-Literal Values                     | Answer, Title Case                                         |
| F-81 | C-12                         | Raw Spacing Literals                            | Low      | Code          | D-194's task (MC.9)                                                     | Fix                                                        |
| F-82 | C-13                         | fieldsRefused Written Twice                     | Low      | Code          | Share fieldsRefused And Move The Users Page Assembly                    | Fix                                                        |
| F-83 | C-10                         | Hand-Built Tables Skip DataTable                | Low      | Code          | Share fieldsRefused And Move The Users Page Assembly                    | Fix                                                        |
| F-84 | C-9                          | Users Page Assembles Its Own Data               | Low      | Code          | Share fieldsRefused And Move The Users Page Assembly                    | Fix, Module Service                                        |
| F-85 | C-14                         | Mixed-Job Components Over 300 Lines             | Low      | Code          | None                                                                    | Answer, Split By Job                                       |
| F-86 | none                         | Colour Sliders Show Single Letters At 375       | Low      | Keepers       | None                                                                    | Fix                                                        |
| F-87 | none                         | Save Address Sits Under GitHub Issue            | Low      | Keepers       | None                                                                    | Fix, The Button Reads "Save Issue"                         |

## Findings

### F-1 Dates And Times In Mixed Formats

- **Severity:** Medium
- **Lens:** Consistency
- **Lane ids:** CP-2, S-2, A-3, P-11
- **Where:** `/coven/[slug]/members` (steward and practitioner, desktop, "2026-11-17" beside "by Fixture A on 2026-11-17"); `/coven/[slug]/invitations` ("Expires 24 November 2026, 9:09 pm"); spell workings ("4 March 2026"); `/keepers/users` (ISO dates); `/keepers/privilege-changes` and `/keepers/support` ("2026-11-17 9:07 pm"); `/keepers/card-sign-ups` and invitation cards (ISO beside "2026-11-17 9:07 pm"); public pages ("3 November 2026"); `/support/request` thread (long form in "Sent", "17 Nov" in the thread); the coven-access-paused and support-timed-out mails ("14 March 2099, 12:00 pm UTC") against the email-change notice mails ("30 October 2026, 14:05 UTC").
- **Found:** Sure, from pictures and the screen text. A shared set of formatters already exists in `src/lib/utc.ts` (`dayInUtc` :28, `isoDayInUtc` :38, `minuteInZone` :43, `longMinuteInZone` :58, `shortDayInZone` :89, `shortMinuteInZone` :100), and five components still format by hand: `LastEdit/index.tsx:10`, `LastEdit/relative.ts:37`, `SupportRequests/day-range.tsx:9`, `IngredientEntry/review-date.ts:5`, `DateField/day.ts:9,19`. Which formatter each mail uses for its time was not traced, so the mail part is sure from the pictures only. D-50 already records that `utc.ts` repeats its own block and that one email formats its own dates; D-154 covers the "Until X" wording.
- **Why It Matters:** People compare dates from one screen to the next, and a 12-hour clock beside a 24-hour clock is easy to misread. No external source; this repo's rule is "Share, never copy" (CLAUDE.md, Conventions).
- **Recommended Fix:** Choose one long and one short form, route every call through `src/lib/utc.ts`, and add a guard that refuses a hand-written date format outside it. Shared piece: `src/lib/utc.ts`.
- **Options:**
  - Long Form Everywhere (17 November 2026, 9:07 pm)
  - ISO Everywhere (2026-11-17 21:07)
  - Long In Prose, ISO In Tables
- **Owner's Choice:** Fix, Long In Detail, Short In Tables
- **Follow-up Task:** Route Every Date Through utc.ts

### F-2 404 Page Offers Help Four Ways

- **Severity:** Medium
- **Lens:** Layout at 375, Bloat
- **Lane ids:** P-1
- **Where:** `/missing` and the 404 pages for a missing compendium entry, a missing help article and a nested missing page (signed out, 375 and desktop, light and dark); the signed-in 404 pages for a coven the viewer is not in, a missing coven, a missing page and a bad ingredient id (user role). The signed-in pages were read from screen text only.
- **Found:** Seen in the picture and the screen text, sure. The body offers "Back to Sorrel & Salt", "Help" and "Report This". The shell adds a Help button and a "?" icon button, and the footer adds a Help link and a "?" icon. At 375 the "?" icon button wraps alone onto its own row.
- **Why It Matters:** A page with one way forward is easier to use, and an orphaned control on its own row is a 375 layout fault. No external source; this repo's rule is "One solid button per view" (`claude-docs/styling.md:357`) and the 375 layout check. I rate it Medium because it appears on every error page; I am not sure it breaks a written rule, so the rating is the owner's to confirm.
- **Recommended Fix:** Keep the body links and one Help entry in the shell, and drop the duplicate "?" icon controls where a text link sits beside them. Shared piece: `ErrorPage`.
- **Options:**
  - Drop The Body Help Link
  - Drop The Question Mark Icons
  - Keep Both And Make The Wrap Deliberate
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** Give Error And Gate Pages One Layout

### F-3 Non-Literal Placeholders Escape The Length Lint

- **Severity:** Medium
- **Lens:** Labels
- **Lane ids:** S-1, C-4, CD-8
- **Where:** the Filters sheet on every list at 375 and the Filters panel on desktop ("No Moon Phases" and "No Days of the Week", built from `` `No ${label}` `` at `FacetCombobox/index.tsx:27`); the Mint Cards dialog on `/keepers/invitations` ("1 to 50", built from `` `1 to ${MAX_SHEETS_PER_BATCH}` `` at `AdminCards/mint-form.tsx:187`).
- **Found:** Sure for the strings and for the lint. R8 (`.claude/rules/components.md:78`) allows an empty placeholder or one of one or two words, and puts a stated limit in the hint. "No Moon Phases" is three words, "No Days of the Week" is five, and "1 to 50" is a limit stated as a placeholder. The lint `sorrel/placeholder-is-short` (`lint/source-sweeps.js:773-789`) returns at :785 when the placeholder is not a literal string, so every template or variable placeholder escapes it.
- **Why It Matters:** A placeholder disappears when typing starts and looks like filled-in data [S8]. This is also the repo's rule R8.
- **Recommended Fix:** Make the Mint Cards placeholder empty and put the limit in the Field's hint; give the Filters combobox an empty or short placeholder; and make the lint refuse a placeholder it cannot read as a literal. Shared piece: Field set (`src/components/Field`), `FacetCombobox`.
- **Options:**
  - Empty Placeholder With The Limit In The Hint
  - Keep "1 to 50" As A Hint Only
- **Owner's Choice:** Skip. Acceptable: these placeholders are built from the field's name.
- **Follow-up Task:** Make The Placeholder Lint Refuse Non-Literal Values

### F-4 Staff Help Drops The Keepers Frame

- **Severity:** Medium
- **Lens:** Consistency with siblings
- **Lane ids:** S-29
- **Where:** `/help/staff`, `/help/staff/[slug]` and `/help/staff/[slug]/[child]` (curator, desktop and 375, light and dark). `/keepers` and `/keepers/support` carry the frame.
- **Found:** Seen in the picture, sure; the code agrees. `/keepers` and `/keepers/support` show a "Keepers" context bar with sub-nav links "Support" and "Staff Help", and the top-nav Keepers tab is active. Staff Help lands on a page with no context bar and no active top-nav tab, framed as public Help: a "Staff Help" heading, a Search Help box and, on the index, "Back to Help". `src/app/(shell)/help/staff/layout.tsx` is a bare `main.page-frame`, while `src/app/(shell)/keepers/layout.tsx:25-33` draws the frame, and `AdminNav/sections.ts:122-132` links Staff Help from it.
- **Why It Matters:** The sub-nav entry promises a Keepers page, and a staff member cannot see where they are or get back to the hub in one step. No external source; this repo's rule is that sibling pages in a section share a frame (`claude-docs/components/app-shell.md`).
- **Recommended Fix:** Draw Staff Help inside the Keepers frame and point the index's back link at `/keepers`. Shared piece: the Keepers layout and `AdminNav`.
- **Options:**
  - Put The Keepers Frame Around Staff Help
  - Keep It A Help Page And Remove The Staff Help Link From The Keepers Sub-Nav And Hub
- **Owner's Choice:** Fix, Staff Help Inside The Keepers Frame
- **Follow-up Task:** Draw Staff Help Inside The Keepers Frame

### F-5 Support Hint Drawn In Error Red

- **Severity:** Medium
- **Lens:** Readability, Design system
- **Lane ids:** A-7, P-9
- **Where:** the Message field on `/support` and `/support/request` (signed out and signed in, 375 and desktop, light and dark), the Feedback dialog, and both empty-submit states of each.
- **Found:** Seen in the pictures, sure. The hint "Don't include passwords, payment details or other private information." above the Message box is drawn in the error style.
- **Why It Matters:** R7 (`.claude/rules/components.md:77`) reserves error red for errors, and colour alone should not carry "problem" [S1].
- **Recommended Fix:** Use the Field set's hint style, not `.field__error`. Shared piece: Field set hint.
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** Fix The Support Form Hint, Radio Cards And Messages

### F-6 Site Role Written As Lower-Case Keeper

- **Severity:** Medium
- **Lens:** Consistent nouns
- **Lane ids:** A-9
- **Where:** `/coven` ("a keeper must approve that"), `/coven/new` ("a keeper's approval") and `/account/support` ("sent to the keepers"), 375 and desktop, light and dark. The help FAQ writes "Keeper".
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** CLAUDE.md, Vocabulary: the site role `admin` shows as Keeper. A role name is a proper name on screen.
- **Recommended Fix:** Write "Keeper" and "Keepers" with a capital in these three screens. Copy only.
- **Owner's Choice:** Fix
- **Follow-up Task:** Write Keeper With A Capital

### F-7 Delete Control Differs Between Edit Dialogs

- **Severity:** Medium
- **Lens:** Dialog consistency
- **Lane ids:** CD-4
- **Where:** the edit-ingredient dialog and the record-a-working dialog ("Delete Working 4 March 2026"), 375 and desktop, light and dark; compare the edit-stock dialogs.
- **Found:** Seen in the pictures, sure. Delete is an icon-only trash with a screen-reader name and no visible text. It sits at the footer's right on desktop and below Cancel at 375. The edit-ingredient dialog has no Cancel (only Close), while the stock dialogs have Save Stock and a Cancel.
- **Why It Matters:** `.claude/rules/components.md:55-58` puts Delete in the edit dialog and the red on the confirm, and the sibling edit dialogs carry a quiet Cancel (`Field/form-actions.tsx:63-70`). An icon with no visible label is also harder to find.
- **Recommended Fix:** One footer layout for every edit dialog: a quiet Cancel, and Delete in the same place, with a visible label or a tooltip. Shared piece: `FormActions`, `ConfirmedAction`.
- **Options:**
  - Visible Label
  - Tooltip Only
  - Label And Tooltip
- **Owner's Choice:** Fix, Icon Delete With Tooltip. The icon sits at the footer end, not the start.
- **Follow-up Task:** Give Every Edit Dialog One Footer

### F-8 Group Error Ends In A Full Stop

- **Severity:** Medium
- **Lens:** Labels
- **Lane ids:** A-14
- **Where:** the empty-submit state of the support dialog and of `/support/request` (375 and desktop, light and dark): "Choose what this is about."
- **Found:** Seen in the pictures and the screen text, sure. "Write a subject" and "Write a message" carry no full stop.
- **Why It Matters:** R7 (`.claude/rules/components.md:77`): a one-sentence message has no full stop. [S7] does not address full stops, so this rests on the repo rule alone.
- **Recommended Fix:** Drop the full stop. Shared piece: Field set messages (`tests/guards/field-message.test.ts` already guards the shared ones; this string escapes it).
- **Owner's Choice:** Fix
- **Follow-up Task:** Fix The Support Form Hint, Radio Cards And Messages

### F-9 Page Delete Buttons Drawn Red

- **Severity:** Medium
- **Lens:** Design system
- **Lane ids:** CP-8, S-17
- **Where:** Delete Coven on the coven settings page (steward, 375 and desktop, light); Delete Guide on the guide edit page `/keepers/help/[id]` (keeper, beside Save Guide and Cancel).
- **Found:** Seen in the pictures, sure of the red; unsure of the reading. `.claude/rules/components.md:55-58` names four red controls (Impersonate, Pause Admin Changes, Revoke Batch, Email Every Account), puts the red on a confirm, and says a thing's Delete lives in its edit dialog. These two are page-level buttons, not dialog controls. Nothing in the rule says whether a page may carry a red Delete.
- **Why It Matters:** The rule list is the repo's own and these two are outside it. This needs a rule decision from the owner, not a guess. CD-13 is the reverse case (F-39).
- **Recommended Fix:** Either draw both as `btn btn--quiet` and keep the red for the confirm, or add "a page's own Delete" to the rule. Shared piece: `ConfirmedAction`.
- **Options:**
  - Draw Them Quiet
  - Name The Page Delete In The Rule
- **Owner's Choice:** Fix, Split. Delete Coven stays red. Delete Guide becomes a delete icon like the edit dialogs (F-7).
- **Follow-up Task:** Bring Red Controls Into The Rule

### F-10 Decline Invitation Drawn Red

- **Severity:** Medium
- **Lens:** Design system
- **Lane ids:** C-2
- **Where:** the received-invitations list on `/account` (any signed-in user with an invitation); `ReceivedInvitations/decline-control.tsx:26` sets `openClass="btn btn--destructive btn--small"`.
- **Found:** Sure of the class, from code. Not sure that Decline counts as a row "Remove or Revoke"; that is a reading of the rule. `.claude/rules/components.md:58` lists four red controls and says a row's Remove or Revoke is `btn btn--quiet btn--small`; Decline is not among the four.
- **Why It Matters:** This repo's rule, `.claude/rules/components.md:55-58`. I am unsure of the Medium rating, because the answer depends on the owner's reading of the rule.
- **Recommended Fix:** Set `openClass` to `btn btn--quiet btn--small` and keep the red for the confirm, if the owner agrees Decline is a Remove. Shared piece: `ConfirmedAction`.
- **Options:**
  - Draw It Quiet
  - Add Decline To The Named Red Controls
- **Owner's Choice:** Answer, Add Decline To The Named Red Controls
- **Follow-up Task:** Bring Red Controls Into The Rule

### F-11 Leave Dialog Disables Its Primary Button

- **Severity:** Medium
- **Lens:** Forms
- **Lane ids:** CD-1
- **Where:** the Leave Coven dialog for a steward who is the only steward (desktop and 375, light and dark): "Promote and Leave" is disabled while New Steward is empty.
- **Found:** Sure, from code. `LeaveWorkspaceButton/owner-exit.tsx:188` has `disabled={sending || !picked}`, so the primary is disabled on an empty required pick. The invite dialog does not share the defect: `InviteDialog/index.tsx:110-118` passes `dirty={email.trim() !== ''}`, so its button is disabled only while nothing is typed, which is "nothing to save".
- **Why It Matters:** The owner's Save rule: never disable Save for empty required fields; disabled only when there is nothing to save. R6 (`.claude/rules/components.md:76`) flags an empty required field on Save. A disabled button also has poor contrast and gives no reason [S6].
- **Recommended Fix:** Keep the button enabled and flag New Steward on submit with `FormErrorSummary`. Shared piece: `FormActions`, `FormErrorSummary`.
- **Owner's Choice:** Fix
- **Follow-up Task:** Flag New Steward On Submit In The Leave Dialog

### F-12 Compendium Entry Leaves A Blank Gap

- **Severity:** Medium
- **Lens:** Layout
- **Lane ids:** P-6, T-1
- **Where:** `/compendium/ingredients/[slug]` (signed out, desktop, light and dark). The left column is empty from about y=495 to the Forms heading at about y=1005, beside the Correspondences column.
- **Found:** Seen in the picture, sure of the gap; the cause is not settled. The `entry-body` grid in `src/scss/_mixins.scss:644-672` is two columns above tablet width with rows `auto 1fr`, and every child spans `grid-column: 1 / -1` unless placed (`IngredientEntry/index.scss:208,242-246`). A full-width section such as Forms starts on the next free row, below the tall side column. I did not read the rest of the mixin, so the mechanism is likely, not confirmed. Not settled; needs a look in a browser.
- **Why It Matters:** People see it and nothing is blocked, so Medium on the "differs from its siblings in a way people notice" test; I am unsure of the rating.
- **Recommended Fix:** Let Forms flow up under Details, or move the side column below on short pages. Shared piece: the `entry-body` mixin.
- **Options:**
  - Forms Flows Up Under Details
  - Side Column Moves Below On Short Pages
- **Owner's Choice:** Skip. The owner's reason: a form can have its own side-column items.
- **Follow-up Task:** Fix The Compendium Entry Layout

### F-13 Keepers Hub Says Admin Invitations

- **Severity:** Medium
- **Lens:** Readability, vocabulary
- **Lane ids:** S-16
- **Where:** `/keepers` (keeper, desktop, dark), the Invitations entry: "The admin invitations waiting, the printed invitation cards, and who arrived by them."
- **Found:** Seen in the picture, sure.
- **Why It Matters:** CLAUDE.md, Vocabulary: the site role `admin` shows as Keeper; `admin` stays in code, schema and GraphQL only.
- **Recommended Fix:** "Keeper invitations". Copy only.
- **Owner's Choice:** Fix
- **Follow-up Task:** Write Keeper With A Capital

### F-14 Help Search Shows No Pager

- **Severity:** Medium
- **Lens:** Flow
- **Lane ids:** MB.301
- **Where:** `/help/search` (every reader, all widths and themes). `src/app/(public)/help/search/page.tsx:26` reads one batch of `HELP_PAGE_LIMIT` (200, `src/lib/help-pages.ts:5`) and draws it all, with no pager and no page in the address.
- **Found:** Sure, from code. A search with more than 200 matches drops the rest and nothing on screen says so. The audit's seed gives 43 matches for one word, so the picture shows no fault.
- **Why It Matters:** CLAUDE.md rule 8: every list paginates through the cursor helper. A reader cannot reach a match past 200.
- **Recommended Fix:** Read through the numbered-page helpers and draw `Pager`. Already minted at the owner's request; no owner choice is needed.
- **Owner's Choice:** Skip. Already minted as MB.301; nothing to choose.
- **Follow-up Task:** MB.301, Help Search Shows Every Match a Page at a Time (already minted)

### F-15 Decorative Art Overlaps Text

- **Severity:** Low
- **Lens:** Layout at 375, Themes
- **Lane ids:** A-16, P-15, S-11, S-14, S-30
- **Where:** the spinach picture behind the first letters of the page heading on `/account`, `/account/sign-in`, `/account/support` and the invitation page (user, 375, light and dark); the spoon picture over body text on `/help/[slug]` and `/help/[slug]/[child]` (signed out, 375, light and dark); over the version line on `/terms` and `/privacy` (375, light); over the Previous and Next links on `/help/staff/[slug]/[child]` (curator, 375, dark); behind the Help heading on `/keepers/help` (desktop); and, not settled, over the edit icon and Shown switch of rows 2 to 4 of `/keepers/help` (desktop, light).
- **Found:** Seen in the pictures, sure of the overlap. The text stays readable; contrast under the picture looks lower and was not measured. The `/keepers/help` control overlap may be a capture effect; not settled; needs a look in a browser.
- **Why It Matters:** Text over a picture can fall below the contrast minimum [S5]. This is also a 375 layout fault.
- **Recommended Fix:** Move the picture out of the text column at 375, or fade it, in the shared page frame. Shared piece: `PageFrame`.
- **Options:**
  - Move It Out Of The Text Column
  - Fade It Behind Text
  - Hide It At 375
- **Owner's Choice:** Skip
- **Follow-up Task:** Stop Decorative Art Covering Text

### F-16 Empty Table Cells And Card Labels

- **Severity:** Low
- **Lens:** Bloat, Empty states
- **Lane ids:** CP-3, CP-4, S-10, S-27
- **Where:** the Invited By cell on `/coven/[slug]/members` (steward and practitioner, desktop); the Updated column on the curator tables for categories, category groups, forms, form groups, celestial bodies, zodiac signs, deities and traditions (desktop, and an "Updated" label with no value on the 375 cards); the Note column on `/keepers/privilege-changes` (every row); the Logins value on the People cards (375); the Error # column on `/keepers/support` (all four rows on desktop, a label with no value at 375).
- **Found:** Seen in the screen text and pictures, sure. The Invited By cell is a real null, not seed data: `MemberList/index.tsx:71` renders nothing when `invitedBy` is null, and the stories include `invitedBy: null`. For the other columns it was not checked whether the cells are empty in real data.
- **Why It Matters:** A label with no value reads as a fault. No external source; this repo's rule is that the ingredient page prints "No ... recorded." for every empty value, so the same state should read the same.
- **Recommended Fix:** Show one shared mark (a dash) in an empty cell, or hide a column that is empty in every row. Shared piece: `DataTable`.
- **Options:**
  - Dash In The Cell
  - Words Such As Not Invited
  - Hide Empty Columns
- **Owner's Choice:** Fix, Dash In The Cell
- **Follow-up Task:** Show One Mark In Empty Cells

### F-17 Straight And Curly Quotes Mixed

- **Severity:** Low
- **Lens:** Labels
- **Lane ids:** P-16, S-11, S-31
- **Where:** `/help/[slug]/[child]` (signed out, 375 and desktop, light), where button names sit in straight double quotes while the no-match state of `/help/search` uses curly quotes; `/help/staff/[slug]/[child]` ("Locator", "Name Basis", "Supports", "New Reference", all widths and themes); the public Code of Ethics and Terms body text (375, dark).
- **Found:** Seen in the pictures; "looks so, not exact from a picture" for the staff page. How help articles are authored was not checked.
- **Why It Matters:** Two quote styles on one site read as unedited. No external source; this repo's rule is "The copy has one voice" (`claude-docs/styling.md:363`).
- **Recommended Fix:** Use curly quotes in the content, or drop the quotes and set field names in bold. A guard on straight quotes in visible copy is on the proposed-rules list.
- **Options:**
  - Curly Quotes In The Content
  - Bold Field Names Instead Of Quotes
- **Owner's Choice:** Fix, Bold Field Names Instead Of Quotes
- **Follow-up Task:** Tidy Copy On Account, Public And Keeper Screens

### F-18 Two Close Buttons In The Filters Sheet

- **Severity:** Low
- **Lens:** Bloat, Dialog consistency
- **Lane ids:** CD-8, S-3
- **Where:** the Filters sheet on every list at 375 (steward and keeper, light and dark), for example `/keepers/invitations`; the compendium-entry dialog also shows "Close All" beside Close and an X.
- **Found:** Seen in the pictures and the screen text, sure. One "Close" sits at the top right and another beside Apply Filters at the foot; the screen text lists two buttons of the same name.
- **Why It Matters:** Two controls with one name are noise. No external source; this repo's rule is "Share, never copy", since sibling sheets show one close control.
- **Recommended Fix:** Keep one Close. Shared piece: `Modal`, `FacetPanel`.
- **Options:**
  - Keep The Header Close
  - Keep The Footer Close
- **Owner's Choice:** Fix, An X Button In The Sheet Header. Keep Close at the bottom.
- **Follow-up Task:** Fix 375 Layout Faults In Sheets And Dialogs

### F-19 Safety Note Repeated On One Entry

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** P-5, CP-7
- **Where:** `/compendium/ingredients/[slug]` (signed out, all widths and themes), where "Safety notes do not list every risk" appears three times; the coven ingredient page `/coven/[slug]/ingredients/[id]` (all roles), where it appears twice.
- **Found:** Seen in the picture and the screen text, sure of the repeat. It may be a deliberate notice under each block.
- **Why It Matters:** Say a thing once. No external source; this repo's rule is the plain-writing rule (`.claude/rules/writing.md`).
- **Recommended Fix:** Show it once, under the safety section. Shared piece: `IngredientEntry`.
- **Options:**
  - Once Per Page
  - Keep It Per Block And Shorten It
- **Owner's Choice:** Fix, Once Per Page. Also show it whenever there is a caution block.
- **Follow-up Task:** Fix The Compendium Entry Layout

### F-20 Empty Value Lines Repeat

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** CP-7, T-2
- **Where:** Correspondences on `/compendium/ingredients/[slug]` (signed out, desktop, light and dark), five "No ... recorded." lines; the coven ingredient page (all roles), ten such lines.
- **Found:** Seen in the pictures and the screen text, sure. `IngredientEntry/blocks.tsx:109` draws `No ${label} recorded.` for every empty row. Part of the volume on the coven page is seed data.
- **Why It Matters:** Ten lines saying "nothing here" bury the lines that say something. No external source; this repo's rule is the plain-writing rule.
- **Recommended Fix:** Hide empty groups on the public view, or join them into one line. Shared piece: `IngredientEntry`.
- **Options:**
  - Hide Empty Groups
  - One Joined Line
- **Owner's Choice:** Fix, Hide Empty Groups
- **Follow-up Task:** Fix The Compendium Entry Layout

### F-21 Small Buttons Under 24px At 375

- **Severity:** Low
- **Lens:** Layout at 375
- **Lane ids:** A-17
- **Where:** `/account/sign-in` at 375 (Remove, Rename, Add, Set Password, Manage Passkeys, and the show-password eye); `/account/support` at 375 (New Request).
- **Found:** Estimated from the pictures at about 24 CSS px tall, not measured. The passkey row wraps so Remove drops under the name, uneven against Rename. Not settled; needs a look in a browser.
- **Why It Matters:** A pointer target should be at least 24 by 24 CSS pixels, or spaced from its neighbours [S2].
- **Recommended Fix:** Give small buttons a 24px minimum hit area and a clearer wrap for the passkey row. Shared piece: the `btn--small` mixin in `src/scss/_mixins.scss`.
- **Options:**
  - Padding Grows The Hit Area
  - Raise The Small Button Height
- **Owner's Choice:** Fix, Padding Grows The Hit Area. Fix the wrapping too.
- **Follow-up Task:** Fix 375 Layout Faults In Sheets And Dialogs

### F-22 Coven Switcher Chevron Wraps

- **Severity:** Low
- **Lens:** Layout at 375
- **Lane ids:** CP-1
- **Where:** the coven switcher in the shell on every 375 coven page of the long-named fixture coven (steward, light and dark), for example `/coven/[slug]/ingredients` with a filter that matches nothing.
- **Found:** Seen in the pictures, sure. The name fills the box and the chevron drops to a second line, so the box is about twice as tall as needed; at desktop it stays on one line. Fixture names are long, but a real long name would do the same.
- **Why It Matters:** An orphaned control on its own row is a 375 layout fault. No external source; this repo's 375 layout check.
- **Recommended Fix:** Truncate the name with an ellipsis and keep the chevron on the same line. Shared piece: `WorkspaceSwitcher`.
- **Options:**
  - Truncate The Name
  - Wrap And Align The Chevron To The First Line
- **Owner's Choice:** Fix, Truncate The Name
- **Follow-up Task:** Fix 375 Layout Faults In Sheets And Dialogs

### F-23 Support Radio Cards Laid Out Differently

- **Severity:** Low
- **Lens:** Design system
- **Lane ids:** A-11, P-10
- **Where:** the Question radio group on `/support`, `/support/request` and the Feedback dialog (375 light and dark; desktop light).
- **Found:** Seen in the pictures, sure. At 375 "Bug" puts its title and description on one line while the other cards stack; at desktop the short descriptions sit inline and the long ones stack. The layout depends on description length.
- **Why It Matters:** Sibling cards in one group should look alike. No external source; this repo's rule is "Share, never copy".
- **Recommended Fix:** One layout for every card in `RadioGroupField`.
- **Options:**
  - Always Stacked
  - Inline At Desktop When It Fits
- **Owner's Choice:** Fix, Always Stacked
- **Follow-up Task:** Fix The Support Form Hint, Radio Cards And Messages

### F-24 Every Radio Card Turns Red For One Error

- **Severity:** Low
- **Lens:** Design system
- **Lane ids:** A-14
- **Where:** the empty-submit state of the Feedback dialog and of `/support/request` (375 and desktop, light and dark).
- **Found:** Seen in the pictures, sure. All seven cards get a red border for one group-level error.
- **Why It Matters:** Seven red outlines say seven things are wrong, and colour alone carries the state [S1].
- **Recommended Fix:** Mark the group once, with one outline or the error text only. Shared piece: `RadioGroupField`.
- **Options:**
  - One Outline Around The Group
  - Error Text Only
- **Owner's Choice:** Skip
- **Follow-up Task:** Fix The Support Form Hint, Radio Cards And Messages

### F-25 Radio Card Looks Selected When Empty

- **Severity:** Low
- **Lens:** Readability
- **Lane ids:** A-18
- **Where:** the empty-submit state of the Feedback dialog (375, light and dark; Feedback card) and of `/support/request` (375 and desktop, light and dark; Account & Sign-In card).
- **Found:** Seen in the pictures: one card has a green border and a lighter fill among red ones with no radio filled. Probably a hover or focus left by the submit click. Not settled; needs a look in a browser.
- **Why It Matters:** A card that looks chosen when nothing is chosen misleads. No external source; this repo's rule is that focus and selected must differ (`.claude/rules/components.md`).
- **Recommended Fix:** Check in a browser. If it is focus, make focus and selected look different.
- **Owner's Choice:** Fix
- **Follow-up Task:** None

### F-26 Keeper Form Pages Differ In Width

- **Severity:** Low
- **Lens:** Consistency with siblings
- **Lane ids:** S-13, S-22
- **Where:** `/keepers` (the hub sits in a narrow centred column, x 416 to 870), `/keepers/business-cards` (form about 450px wide) and `/keepers/documents` (x 310 to 970), against full-width siblings; `/keepers/help/new` starts at x=110 while `/keepers/help` starts at x=16 (keeper, desktop, dark).
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** Sibling pages in a section should share a frame. No external source; this repo's rule is "Share, never copy".
- **Recommended Fix:** One shared form-page width. Shared piece: `NarrowPanelPage`, `PageFrame`.
- **Options:**
  - One Narrow Width For Form Pages
  - Full Width For All
- **Owner's Choice:** Fix, One Narrow Width For Form Pages
- **Follow-up Task:** Align The Keeper Pages

### F-27 Tab Strips Start Clipped

- **Severity:** Low
- **Lens:** Layout
- **Lane ids:** S-15
- **Where:** `/keepers/documents` (desktop, strip starts at a tab cut to "ns of Use" although there is room); `/keepers/card-sign-ups` and `/keepers/invitation-cards` at 375 (first tab reads "itations", "Card Sign-U" clipped, no scroll cue).
- **Found:** Seen in the pictures, sure. `TabbedPage/index.scss:173-188` holds the strip's scroll behaviour; why the strip lands scrolled to the end was not traced.
- **Why It Matters:** A clipped first tab hides what the strip is. No external source; this repo's rule is "Share, never copy", since `TabbedPage` is the one tab strip.
- **Recommended Fix:** Do not scroll the strip to the end on load, size it to fit, and give a scroll cue where it does clip. Shared piece: `TabbedPage`.
- **Options:**
  - Start At The First Tab
  - Add A Fade Cue At The Clip
- **Owner's Choice:** Fix, Start At The First Tab And Add A Fade Cue At The Clip. The owner believes the strip already starts at Terms of Use, so the task first checks that in a browser.
- **Follow-up Task:** Align The Keeper Pages

### F-28 Support Status Filters Hidden At 375

- **Severity:** Low
- **Lens:** Layout at 375
- **Lane ids:** S-12, S-33
- **Where:** `/keepers/support` (curator and keeper, 375, light and dark). Needs Staff, Mine and Unassigned show; Waiting on Sender, Resolved and Closed do not. The Invitations strip at 375 visibly clips, a cue this strip lacks.
- **Found:** Seen in the pictures. Whether the strip scrolls sideways is not settled; needs a look in a browser.
- **Why It Matters:** Three of six filters with no cue hides what exists. No external source; this repo's 375 layout check.
- **Recommended Fix:** Add a clip or fade cue, or wrap the chips. Shared piece: `FilterForm`.
- **Options:**
  - Fade Cue At The Clip
  - Wrap The Chips
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** Fix 375 Layout Faults In Sheets And Dialogs

### F-29 Download CSV Solid On Empty List

- **Severity:** Low
- **Lens:** Buttons
- **Lane ids:** S-21, S-32
- **Where:** `/keepers/card-sign-ups` (keeper, desktop and 375, dark): "No one has accepted a card yet." beside a solid, enabled Download CSV. The page button's position also changes by tab: New Invitation sits beside the heading on desktop and above the tab strip at 375.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** A solid button says "this is the main action" where there is nothing to download. A disabled button has poor contrast [S6], so quiet or hidden fits better than disabled.
- **Recommended Fix:** Draw Download CSV quiet, or hide it, while there are no rows. Shared piece: `PageHeader`.
- **Options:**
  - Quiet While Empty
  - Hidden While Empty
- **Owner's Choice:** Fix, Disabled While The List Is Empty
- **Follow-up Task:** Align The Keeper Pages

### F-30 Uneven Gaps In Dialogs

- **Severity:** Low
- **Lens:** Layout
- **Lane ids:** S-7
- **Where:** the Mint Cards dialog (desktop: a blank band between Number of Sheets and Note; 375: each switch about 40px below its label); the keeper-invite dialog (both widths: an empty band above Reason); `/coven/new` (a blank gap above the disabled Create Coven button).
- **Found:** Seen in the pictures, sure. The probable cause is an empty error-message row; not confirmed from the pictures.
- **Why It Matters:** A layout gap is the sum of every stacked margin and gap. No external source; this repo's rule is the spacing scale (`claude-docs/styling.md:205-212`).
- **Recommended Fix:** Remove the empty row from the Field when there is no message. Shared piece: Field set.
- **Owner's Choice:** Fix
- **Follow-up Task:** Even Out Dialog Gaps And Eyebrows

### F-31 Confirm Buttons Wrap At 375

- **Severity:** Low
- **Lens:** Layout at 375
- **Lane ids:** A-13, CD-13
- **Where:** the Discard Changes dialog (375, light and dark), where "Discard Changes" and "Keep Editing" each wrap to two lines side by side; the Leave Coven dialog, where "Promote and Leave" wraps to two lines.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** Wrapped button text looks cramped and breaks the one-line button rule. No external source; this repo's 375 layout check.
- **Recommended Fix:** Stack the buttons at 375, as the rename-passkey dialog does. Shared piece: `FormActions`, `ConfirmedAction`.
- **Owner's Choice:** Fix
- **Follow-up Task:** Fix 375 Layout Faults In Sheets And Dialogs

### F-32 Dialog Eyebrow Halo In Dark

- **Severity:** Low
- **Lens:** Themes
- **Lane ids:** CD-10
- **Where:** the dark shots of the add-ingredient, member, stock, edit-ingredient, edit-stock, spell-builder and entry-summary dialogs (steward, desktop and 375): the coven eyebrow has a lighter rounded patch behind it.
- **Found:** Seen in the pictures, sure. The cause (a text shadow or a background) is not known.
- **Why It Matters:** Both themes should look the same in structure. No external source; this repo's rule is two themes, one structure (`claude-docs/styling.md`).
- **Recommended Fix:** Remove the patch in dark. Shared piece: `Modal`.
- **Owner's Choice:** Fix
- **Follow-up Task:** Even Out Dialog Gaps And Eyebrows

### F-33 Builder Eyebrow Wraps At 375

- **Severity:** Low
- **Lens:** Layout at 375
- **Lane ids:** CD-11
- **Where:** the spell builder and the add-ingredient dialog at 375 (steward): the long coven name in the eyebrow wraps and the second line starts left of the first.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** A misaligned second line looks broken. No external source; this repo's 375 layout check.
- **Recommended Fix:** Truncate the coven name in the eyebrow, or align the lines. Shared piece: `Modal`.
- **Options:**
  - Truncate The Name
  - Align The Wrapped Lines
- **Owner's Choice:** Fix, Align The Wrapped Lines
- **Follow-up Task:** Even Out Dialog Gaps And Eyebrows

### F-34 Complete Action Has Two Names

- **Severity:** Low
- **Lens:** Copy
- **Lane ids:** CD-6
- **Where:** the Record a Working dialog (steward, all widths and themes). Step 1 offers "Complete" (outline); step 2 offers "Mark Complete" (solid).
- **Found:** Sure, from the pictures and code. `RecordWorking/complete-action.tsx:43` titles the standalone dialog "Complete Working". The two solids are never on screen together, so this is not two same-named buttons.
- **Why It Matters:** One action should have one name. No external source; this repo's rule is "The copy has one voice" (`claude-docs/styling.md:363`).
- **Recommended Fix:** Use one name in both steps. Shared piece: `RecordWorking`.
- **Options:**
  - Complete
  - Mark Complete
- **Owner's Choice:** Fix, Name It Complete. Make clear to the user what completing does.
- **Follow-up Task:** Give Every Edit Dialog One Footer

### F-35 Confirm Title Misnames The Action

- **Severity:** Low
- **Lens:** Dialog consistency
- **Lane ids:** CD-7
- **Where:** the confirm step of Record a Working (steward, all widths and themes): the title is "Record a Working" while the body says completing takes items from the coven's jars.
- **Found:** Sure, from the pictures and code. `RecordWorking/dialog.tsx:17` titles the dialog "Edit Working" or "Record a Working"; the standalone confirm is titled "Complete Working".
- **Why It Matters:** The title should name the action. This repo's rule is the dialog titles in `claude-docs/components/modal.md`.
- **Recommended Fix:** Title the confirm step "Complete Working". Shared piece: `RecordWorking`.
- **Owner's Choice:** Fix
- **Follow-up Task:** Give Every Edit Dialog One Footer

### F-36 Share Toggle Sits Under Its Label

- **Severity:** Low
- **Lens:** Design system
- **Lane ids:** CD-9
- **Where:** the Share With the Coven switch in the Record a Working dialog (steward, 375 and desktop): the label, a blank line, then the toggle, then the hint.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** A switch belongs on its label's row. No external source; this repo's rule is `SwitchField` (`src/components/Field/switch-field.tsx`).
- **Recommended Fix:** Put the toggle on the label's row and check the gap as a total of every stacked margin. Shared piece: `SwitchField`.
- **Options:**
  - Toggle On The Label Row
  - Keep Under The Label And Close The Gap
- **Owner's Choice:** Fix, Keep Under The Label And Close The Gap
- **Follow-up Task:** Even Out Dialog Gaps And Eyebrows

### F-37 Member Dialog Date Wraps Mid-Date

- **Severity:** Low
- **Lens:** Layout at 375
- **Lane ids:** CD-12
- **Where:** the member dialog (steward, 375): an ISO date breaks at a hyphen across two lines. The Remove button there is a medium outlined button; whether it is `btn btn--quiet btn--small` was not settled; needs a look in a browser.
- **Found:** Seen in the pictures, sure of the wrap.
- **Why It Matters:** A date split across lines is hard to read. This repo's rule: a row's Remove is `btn btn--quiet btn--small` (`.claude/rules/components.md:58`).
- **Recommended Fix:** Keep the date on one line, and check the Remove class. Shared piece: `LocalTime`.
- **Owner's Choice:** Fix
- **Follow-up Task:** Even Out Dialog Gaps And Eyebrows

### F-38 Stray Dot Before None

- **Severity:** Low
- **Lens:** Copy
- **Lane ids:** CD-12
- **Where:** "Coven Access · none" in the member dialog (steward, 375); the Time-Out and Site Access collapsibles in the keeper user dialog.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** A dot with nothing before it reads as a fault. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Drop the leading dot when the value is empty.
- **Owner's Choice:** Fix
- **Follow-up Task:** Tidy Copy On Account, Public And Keeper Screens

### F-39 Delete Coven Radio Carries No Warning

- **Severity:** Low
- **Lens:** Dialog consistency
- **Lane ids:** CD-13
- **Where:** the Leave Coven dialog (steward, only steward; all widths and themes): "Delete Coven" is a plain radio with no destructive treatment.
- **Found:** Seen in the pictures, sure. This is the reverse of the page-level red Delete question.
- **Why It Matters:** A choice that destroys the coven should say so before the confirm. This repo's rule puts the red on the confirm (`.claude/rules/components.md:55-58`).
- **Recommended Fix:** Say the outcome in the radio's hint. Shared piece: `RadioGroupField`.
- **Options:**
  - Hint Text Names The Outcome
  - Red Radio Label
- **Owner's Choice:** Withdrawn. The dialog already says below the radio what happens. See Left As It Is.
- **Follow-up Task:** Bring Red Controls Into The Rule

### F-40 Spell Preview Repeats Ingredients

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** CD-14
- **Where:** the spell preview dialog (steward): the Ingredients and Steps headings list the same item.
- **Found:** Seen in the screen text. It may be seed data; not settled.
- **Why It Matters:** Say a thing once. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Check the seed; if the app draws it twice, draw it once.
- **Owner's Choice:** Skip. Not a repeat: one is the list of ingredients and the other is the order of the steps, which can carry more detail.
- **Follow-up Task:** Tidy Copy On Account, Public And Keeper Screens

### F-41 Entry Details Has An Empty Header Band

- **Severity:** Low
- **Lens:** Layout
- **Lane ids:** CD-14
- **Where:** the entry-details dialog (steward): an empty band above "Edited just now" holding only the X. The jar and pencil buttons beside it are icon-only.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** An empty band spends space and hides nothing useful. No external source; this repo's rule is "Share, never copy", since `Modal` already draws a title row.
- **Recommended Fix:** Put the X in the title row. Shared piece: `Modal`.
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** Even Out Dialog Gaps And Eyebrows

### F-42 Invite Dialog Copy Is Wordy

- **Severity:** Low
- **Lens:** Copy
- **Lane ids:** CD-14
- **Where:** the invite dialog (steward): "A steward can make them a steward from the members page once they have joined." and "An observer writes nothing."
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** Short sentences are easier to read. This repo's plain-writing rule.
- **Recommended Fix:** Shorten both lines.
- **Owner's Choice:** Fix
- **Follow-up Task:** Tidy Copy On Account, Public And Keeper Screens

### F-43 Footers Out Of View At 375

- **Severity:** Low
- **Lens:** Layout at 375
- **Lane ids:** CD-2
- **Where:** Record a Working (Cancel cut at the viewport foot) and the spell builder (no footer visible, so Save Spell and Mark Complete are off screen) at 375 (steward, light and dark); also the add-ingredient, annotate, stock and date-field dialogs.
- **Found:** Not settled; needs a look in a browser. `Modal/index.scss:28-29` sets `max-height` and `overflow: clip` on the dialog, and `.modal-dialog__body` (:72) is `overflow: auto`, so a footer inside the body is reachable by scrolling. Whether the footer sits in the body was not settled.
- **Why It Matters:** A footer that cannot be reached blocks Save. I rate Low because the body scrolls; the rating moves up if the browser shows the footer unreachable.
- **Recommended Fix:** Use the Filters sheet's pinned-footer pattern. Shared piece: `Modal`.
- **Options:**
  - Pinned Footer
  - Full Sheet With Sticky Footer
- **Owner's Choice:** Skip
- **Follow-up Task:** None

### F-44 Document Mail Has Two Solid Buttons

- **Severity:** Low
- **Lens:** One call to action
- **Lane ids:** A-1
- **Where:** the document-updated mail (recipient, 375 and desktop, light and dark).
- **Found:** Seen in the pictures, sure. Every other mail has one button. The owner's Add Ingredient decision covers the shell bar, not mail.
- **Why It Matters:** One call to action per message (this repo's rule: one solid button per view, `claude-docs/styling.md:357`).
- **Recommended Fix:** Style the document names, and keep one button to a page that lists the changed documents. Shared piece: `src/emails/parts/layout.ts`.
- **Options:**
  - One Button To A List Page
  - Keep Two Buttons And Bold The Names
- **Owner's Choice:** Skip
- **Follow-up Task:** Tidy The Mail Calls To Action And Headings

### F-45 Sign-In Instruction Has No Link

- **Severity:** Low
- **Lens:** Says what to do
- **Lane ids:** A-2
- **Where:** the email-change-notice (completed, requested) and verify-email (change, default, no-provider, two-providers) mails (recipient, all widths and themes): "sign in to Sorrel & Salt, change your email address back" has no button. The verify-email mail also says "in the same browser where you are signed in" to a recipient who may have no account (lower certainty).
- **Found:** Seen in the pictures and the screen text, sure of the missing link.
- **Why It Matters:** The password-changed mails give a button for the same kind of instruction. No external source; this repo's rule is "Share, never copy".
- **Recommended Fix:** Add a Sign In button, or reword the verify-email line. Shared piece: `src/emails/parts/layout.ts`.
- **Owner's Choice:** Fix, Link "account page" To The Account Page. The person can request a new link there.
- **Follow-up Task:** Tidy The Mail Calls To Action And Headings

### F-46 Reset Button Has Two Labels

- **Severity:** Low
- **Lens:** Copy
- **Lane ids:** A-4
- **Where:** the password-changed mails (change, reset, set) read "Reset My Password" (to `/forgot-password`); the password-locked and reset-password mails read "Choose a New Password".
- **Found:** Seen in the pictures, sure. The label site is `src/emails/password-changed.ts`.
- **Why It Matters:** One action, one name. This repo's rule is "The copy has one voice" (`claude-docs/styling.md:363`).
- **Recommended Fix:** Pick one label for every mail. Shared piece: `src/emails/parts/layout.ts`.
- **Options:**
  - Reset My Password
  - Choose a New Password
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** Tidy The Mail Calls To Action And Headings

### F-47 Support Mail Headings In Sentence Case

- **Severity:** Low
- **Lens:** Copy
- **Lane ids:** A-5
- **Where:** the support-closing-soon, support-email-reply, support-received, support-reply-notice and support-resolved mails: "Your support request closes soon: ...", "We have your support request: ...". Other mails use Title Case ("You Were Timed Out of Support").
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** Headings are Title Case (`.claude/rules/components.md:60-65`). The part after the colon is user text, so the lead-in is the only part the rule can reach.
- **Recommended Fix:** Title Case the lead-in, or record the sentence case as deliberate.
- **Options:**
  - Title Case The Lead-In
  - Record Sentence Case As Deliberate
- **Owner's Choice:** Fix, Title Case The Lead-In
- **Follow-up Task:** Tidy The Mail Calls To Action And Headings

### F-48 Error Pages Share No Layout

- **Severity:** Low
- **Lens:** Consistency with siblings
- **Lane ids:** P-2
- **Where:** the 403 page (signed in, 375 and desktop, light and dark), whose body has only "Back to Sorrel & Salt", against the 404 page, whose body has three links; for a curator the 403 on `/keepers` keeps the Keepers tab highlighted and gives no reason.
- **Found:** Seen in the pictures and the screen text. Some difference may be intended; not settled.
- **Why It Matters:** Sibling error pages should look alike. No external source; this repo's rule is "Share, never copy", since `ErrorPage` and `NotAuthorized` exist for this.
- **Recommended Fix:** Give both pages one body layout and say why access is refused. Shared piece: `ErrorPage`, `NotAuthorized`.
- **Options:**
  - One Shared Body
  - Keep Them Different And Record Why
- **Owner's Choice:** Fix, One Shared Body
- **Follow-up Task:** Give Error And Gate Pages One Layout

### F-49 Gate Cards Align Differently

- **Severity:** Low
- **Lens:** Consistency with siblings
- **Lane ids:** P-4
- **Where:** the invite-token page, the access-paused page and the coven-paused page (375 and desktop, light and dark).
- **Found:** Seen in the pictures. The three cards align their text and buttons differently.
- **Why It Matters:** Gate cards read as one family when they match. No external source; this repo's rule is "Share, never copy".
- **Recommended Fix:** Build all three on one card layout. Shared piece: `NarrowPanelPage`.
- **Owner's Choice:** Fix
- **Follow-up Task:** Give Error And Gate Pages One Layout

### F-50 Reset Password Spacing Uneven

- **Severity:** Low
- **Lens:** Layout
- **Lane ids:** P-18
- **Where:** `/reset-password` (signed out, 375 and desktop, light): the subtitle sits tight against the label, which `/forgot-password` does not do, and an empty strength bar leaves a blank gap beneath it.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** A gap is the sum of every stacked margin; two sibling pages should space alike. No external source; this repo's rule is the spacing scale (`claude-docs/styling.md:205-212`).
- **Recommended Fix:** Use the same subtitle gap as `/forgot-password`, and draw the strength bar only once there is input. Shared piece: `NarrowPanelPage`.
- **Owner's Choice:** Fix, Make The Spacing Consistent. Allow for the content that appears under the password field once something is typed.
- **Follow-up Task:** Give Error And Gate Pages One Layout

### F-51 Disabled Provider Message Repeats

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** P-3
- **Where:** `/sign-in` (signed out; also `/coven/[slug]` and `/curator` signed-out screens), where "This sign-in method isn't available right now." sits under Discord, Google and Microsoft, with a large gap above the first button at 375.
- **Found:** Seen in the pictures. The capture server has no provider credentials, so this is the capture environment, not a fault of the app. Not settled for a real deployment.
- **Why It Matters:** Say a thing once. No external source; this repo's plain-writing rule.
- **Recommended Fix:** None needed until a deployment shows it. If it does, say it once above the list.
- **Owner's Choice:** Skip
- **Follow-up Task:** None

### F-52 Blocked States Give No Next Step

- **Severity:** Low
- **Lens:** Says what to do
- **Lane ids:** A-10, A-12, P-19
- **Where:** the waiting page on `/coven` and `/coven/new` (user, no contact or link to `/account` or Support; moderate confidence); the two-factor warning "Your backup codes won't be shown again." (no next step); the paused coven page, which names the steward as plain text with no contact.
- **Found:** Seen in the pictures and the screen text, sure of the text.
- **Why It Matters:** This repo's rule (`.claude/rules/components.md:60-65` and `claude-docs/styling.md:363`): a message says what happened in one sentence and what to do in the next.
- **Recommended Fix:** Add the next step to each: a link to Support, "Save them before you continue", and a way to contact the steward. Shared piece: `Notice`, `EmptyState`.
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** Tidy Copy On Account, Public And Keeper Screens

### F-53 Refused Invitations Page Drops The Shell

- **Severity:** Low
- **Lens:** Flow
- **Lane ids:** CP-6
- **Where:** `/coven/[slug]/invitations` for a practitioner or observer. `src/app/(shell)/coven/[slug]/(people)/invitations/page.tsx:25` calls `notFound()`, and `claude-docs/auth/coven-guard.md` documents it.
- **Found:** Sure, from code. This is the documented behaviour, so it is not a defect by the repo's own rule. Whether a member should see a 404 inside the shell is a design question.
- **Why It Matters:** A member who follows a link to a page that exists is told it does not.
- **Recommended Fix:** I need the owner to choose. I recommend keeping the 404 and recording the reason.
- **Options:**
  - Keep The 404
  - Show Not Authorized Inside The Shell
- **Owner's Choice:** Answer, Show Not Authorized Inside The Shell
- **Follow-up Task:** None

### F-54 Request Thread Shows You Twice

- **Severity:** Low
- **Lens:** Readability
- **Lane ids:** A-8
- **Where:** the My Request dialog and the support-request page (user, 375 and desktop, light and dark): the author reads "You You" (name, then a role badge).
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** A repeated word reads as a fault. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Show the badge only when the name is not already "You". Shared piece: the support thread component.
- **Owner's Choice:** Fix
- **Follow-up Task:** Fix The Support Form Hint, Radio Cards And Messages

### F-55 Compendium No-Match Says It Twice

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** P-12
- **Where:** `/compendium` with a filter that matches nothing (signed out, 375 and desktop): "No ingredients matching [Nothingwort]" and again "No entries match “Nothingwort”. Change or clear the filter to see more." The help search no-match says it once.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** Say a thing once, with one noun. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Keep the second sentence and drop the first. Shared piece: `EmptyState`.
- **Owner's Choice:** Fix. The owner believes a shared empty state with an action button already handles this, so the task uses it.
- **Follow-up Task:** Tidy Copy On Account, Public And Keeper Screens

### F-56 Terms Offered Three Ways

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** P-17
- **Where:** `/account/terms` for a person who has not agreed (375 and desktop): Terms is linked in the list and again as "Read the Terms of Use"; Disclaimer and Code of Ethics are linked in the intro and again in the list.
- **Found:** Seen in the pictures and the screen text, sure.
- **Why It Matters:** Say a thing once. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Link each document once.
- **Options:**
  - Keep The List Links
  - Keep The Intro Links
- **Owner's Choice:** Skip. Each serves a different purpose.
- **Follow-up Task:** Tidy Copy On Account, Public And Keeper Screens

### F-57 Sign-In Methods Repeats Sections

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** A-15
- **Where:** `/account/sign-in` (user, desktop and 375): a Sign-In Methods card repeats the Password and Passkeys rows, and the same controls follow in separate sections.
- **Found:** Seen in the screen text. The card rows may be anchors to the sections; not checked.
- **Why It Matters:** Say a thing once, unless the card is a jump list. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Check whether the card links down the page; if so, label it as a contents list, and if not, remove it. Shared piece: `SectionNav`.
- **Options:**
  - Make It A Contents List
  - Remove The Card
- **Owner's Choice:** Skip
- **Follow-up Task:** None

### F-58 Overview Contents Repeats Navigation

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** CP-5
- **Where:** the coven overview `/coven/[slug]` (steward and practitioner, desktop and 375): a "Contents" section lists Ingredients, Grimoire and Members below the nav that links the same pages.
- **Found:** Seen in the pictures and the screen text, sure. It may be deliberate as a landing summary.
- **Why It Matters:** Two lists with the same links add no route. No external source; this repo's plain-writing rule. The choice is the owner's.
- **Recommended Fix:** Remove the section, or make it show counts and recent items.
- **Options:**
  - Remove It
  - Make It Show Counts
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** None

### F-59 Keepers Hub Repeats Its Own Navigation

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** S-13
- **Where:** `/keepers` (keeper and curator, desktop and 375): the word "Keepers" appears three times (top nav, context bar, heading); the hub links repeat the sub-nav; the intro text is wordy.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** Say a thing once. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Shorten the intro and let the hub list each area once with a one-line description. Shared piece: `AdminNav`.
- **Owner's Choice:** Skip
- **Follow-up Task:** Align The Keeper Pages

### F-60 Heading Level Skips After Details

- **Severity:** Low
- **Lens:** Accessibility
- **Lane ids:** P-7
- **Where:** `/compendium/ingredients/[slug]` (signed out): Correspondences, Folk Names, Categories and Substitutes are h3 with no h2 after Details.
- **Found:** Seen in the screen text (aria only). Not settled; needs a look in a browser.
- **Why It Matters:** Headings should show the page's structure [S3]. This source does not mention skipped levels, so the finding rests on structure, not on a stated rule.
- **Recommended Fix:** Make them h2 or add an h2 above. Shared piece: `IngredientEntry`.
- **Owner's Choice:** Fix, Correct The Level Without Making The Headings Larger
- **Follow-up Task:** Fix The Compendium Entry Layout

### F-61 FAQ Link Doubles Heading Name

- **Severity:** Low
- **Lens:** Accessibility
- **Lane ids:** P-14
- **Where:** the FAQ headings on `/help/[slug]` (signed out): the heading's name reads "<question> Link to <question>".
- **Found:** Seen in the screen text (aria only); a candidate, not confirmed.
- **Why It Matters:** A spoken name that repeats the question is noise, and a visible label should be inside the accessible name [S4].
- **Recommended Fix:** Name the link "Link to this answer" or hide it from the heading's name.
- **Owner's Choice:** Fix
- **Follow-up Task:** None

### F-62 Add Ingredient Twice On Curator Compendium

- **Severity:** Low
- **Lens:** Buttons
- **Lane ids:** S-20
- **Where:** `/curator/compendium` (curator, 375, light and dark): the shell bar and the page each show a solid Add Ingredient.
- **Found:** Seen in the picture. The shell-bar one is covered by the owner's decision of 2026-11-17. The page's own button reads "Add Ingredient" while the doc calls it "New Entry" (`claude-docs/components/modal.md:119-135`). Whether both buttons go to the same place was not checked; not settled; needs a look in a browser.
- **Why It Matters:** Two buttons for one job. No external source; this repo's rule is "Share, never copy". The doc and the screen use different names.
- **Recommended Fix:** Correct the doc or the label so they agree, and check the routes.
- **Options:**
  - Rename The Page Button To New Entry
  - Correct The Doc To Add Ingredient
- **Owner's Choice:** Fix, Correct The Doc To Add Ingredient
- **Follow-up Task:** Align The Keeper Pages

### F-63 Date Popover Covers Top Bar

- **Severity:** Low
- **Lens:** Layout
- **Lane ids:** S-4
- **Where:** the date-range field dialog (keeper, desktop, Minted): the popover opens upward over the shell bar and clips its last row.
- **Found:** Seen in the picture, sure.
- **Why It Matters:** A popover should stay inside the view. No external source; this repo's 375 and desktop layout check.
- **Recommended Fix:** Open the popover downward when there is room, or flip by space. Shared piece: `DateField`.
- **Owner's Choice:** Fix
- **Follow-up Task:** Even Out Dialog Gaps And Eyebrows

### F-64 Colour Hint Says Under The Veil

- **Severity:** Low
- **Lens:** Copy
- **Lane ids:** S-5
- **Where:** the Add Category Group dialog (curator, desktop): "Colours under the veil are too faint on the dark card (under 4.5:1)".
- **Found:** Seen in the picture, sure.
- **Why It Matters:** The hint uses a figure and a phrase the reader may not know. This repo's plain-writing rule. The 4.5:1 figure matches [S5].
- **Recommended Fix:** "This colour is too faint to read on the dark card".
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** Tidy Copy On Account, Public And Keeper Screens

### F-65 Refused Opens Intro Hard To Read

- **Severity:** Low
- **Lens:** Copy
- **Lane ids:** S-6
- **Where:** the Refused Opens dialog on `/keepers/invitation-cards` (keeper, desktop and 375): "Every card listed here already admits nobody. Further tries are refused and counted here." At 375 the table is indented about 118px against 86px for text.
- **Found:** Seen in the picture, sure.
- **Why It Matters:** The sentence is hard to parse. This repo's plain-writing rule.
- **Recommended Fix:** "These cards no longer admit anyone. Further tries are refused and counted below", and align the table with the text.
- **Owner's Choice:** Fix
- **Follow-up Task:** Tidy Copy On Account, Public And Keeper Screens

### F-66 Sourcing Score Heading Clipped

- **Severity:** Low
- **Lens:** Layout
- **Lane ids:** S-9
- **Where:** `/curator/compendium` (curator, desktop): the "Sourcing Score" column heading shows as "Sourcin", cut by the fixed action column.
- **Found:** Seen in the picture, sure.
- **Why It Matters:** A clipped heading hides what the column is. No external source; this repo's layout check.
- **Recommended Fix:** Give the column its width or shorten the heading. Shared piece: `DataTable`.
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** Align The Keeper Pages

### F-67 People Page Has A Users Toggle

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** S-19
- **Where:** `/keepers/users` (keeper, desktop): a "Users" toggle on a page that is the Users list.
- **Found:** Seen in the picture. What the toggle switches was not traced.
- **Why It Matters:** A control with the page's own name suggests a mode with no label. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Check what it filters, and name it for that.
- **Owner's Choice:** Withdrawn. The "Users" control is the People section's tab navigation (Users and Privilege Changes) in `src/app/(shell)/keepers/(people)/layout.tsx`. See Left As It Is.
- **Follow-up Task:** None

### F-68 People Cards Very Tall At 375

- **Severity:** Low
- **Lens:** Layout at 375
- **Lane ids:** none
- **Where:** `/keepers/users` (keeper, 375): each user card is about 1,000 CSS px tall.
- **Found:** Seen in the pictures, estimated roughly.
- **Why It Matters:** A long card hides the next row. No external source; this repo's 375 layout check.
- **Recommended Fix:** Collapse secondary values behind the card.
- **Owner's Choice:** Fix
- **Follow-up Task:** Align The Keeper Pages

### F-69 Support Status Is An Icon Only

- **Severity:** Low
- **Lens:** Accessibility
- **Lane ids:** none
- **Where:** `/keepers/support` (keeper and curator, desktop and 375): the status cell is a red flag icon with no text.
- **Found:** Seen in the pictures. The accessible name was not checked.
- **Why It Matters:** Colour and shape alone carry the state [S1].
- **Recommended Fix:** Add the status as text beside the icon. Shared piece: `DataTable`.
- **Owner's Choice:** Withdrawn. The status mark has a tooltip and an accessible name (`src/components/SupportRequests/status-mark.tsx:14-15`). See Left As It Is.
- **Follow-up Task:** Align The Keeper Pages

### F-70 Staff Help Card Eyebrows Repeat Guide

- **Severity:** Low
- **Lens:** Bloat
- **Lane ids:** none
- **Where:** `/help/staff` (curator): three of four cards carry the eyebrow "GUIDE" under the heading "Guides"; the fourth says "REFERENCE".
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** An eyebrow that repeats the heading adds nothing. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Drop the repeated eyebrow.
- **Owner's Choice:** Skip
- **Follow-up Task:** Draw Staff Help Inside The Keepers Frame

### F-71 Group Shown Two Ways

- **Severity:** Low
- **Lens:** Consistency with siblings
- **Lane ids:** S-24
- **Where:** curator Categories (a chip) and Forms (icon and text), desktop and 375, both themes.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** One value, one look. No external source; this repo's rule is "Share, never copy".
- **Recommended Fix:** One treatment for the Group cell. Shared piece: `DataTable`.
- **Options:**
  - Chip
  - Icon And Text
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** Align The Keeper Pages

### F-72 Toggle Label Repeats As Shown

- **Severity:** Low
- **Lens:** Labels
- **Lane ids:** S-25
- **Where:** `/keepers/help/new` (keeper, desktop dark and 375 light): the label "Shown to Readers" sits over a toggle labelled "Shown"; `/keepers/help` has "Shown" beside every toggle.
- **Found:** Seen in the pictures, sure.
- **Why It Matters:** A switch's own text should not repeat its label. No external source; this repo's rule is `SwitchField`.
- **Recommended Fix:** One label per switch. Shared piece: `SwitchField`.
- **Options:**
  - Label Above Only
  - Switch Text Only
- **Owner's Choice:** Fix, Label Above Only
- **Follow-up Task:** Align The Keeper Pages

### F-73 Help Guide Counts Blank

- **Severity:** Low
- **Lens:** Empty states
- **Lane ids:** S-26
- **Where:** the guide sidebar on `/keepers/help` (keeper, desktop, dark): the counts are blank.
- **Found:** Seen in the picture. Whether they are blank in real data was not checked.
- **Why It Matters:** A count column with no numbers reads as a fault. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Show 0, or hide counts.
- **Options:**
  - Show Zero
  - Hide Counts
- **Owner's Choice:** Skip
- **Follow-up Task:** Align The Keeper Pages

### F-74 Sort Icon May Lack A Name

- **Severity:** Low
- **Lens:** Accessibility
- **Lane ids:** S-28
- **Where:** `/keepers/help` (keeper, 375, light): an icon beside the Guide select.
- **Found:** Seen in the picture; the accessible name was not checked. Not settled; needs a look in a browser. The sweep for unnamed icons found none, so this may already have a name.
- **Why It Matters:** A control with no name cannot be used by a screen reader. No external source is named here; this repo's rule is the unnamed-icon sweep.
- **Recommended Fix:** Check the name.
- **Owner's Choice:** Fix
- **Follow-up Task:** None

### F-75 Footnote Marker Is Small Plain Text

- **Severity:** Low
- **Lens:** Accessibility
- **Lane ids:** T-3
- **Where:** `/code-of-ethics` and `/terms` (signed out, desktop, light): the marker "#1" is small underlined text.
- **Found:** Seen in the picture. The target size at 375 was not measured.
- **Why It Matters:** A pointer target should be at least 24 by 24 CSS pixels, or spaced from its neighbours [S2].
- **Recommended Fix:** A superscript number with a larger hit area.
- **Owner's Choice:** Open: awaiting the owner's answer
- **Follow-up Task:** None

### F-76 Signed-In Help Hides Compendium Link

- **Severity:** Low
- **Lens:** Layout at 375
- **Lane ids:** T-4
- **Where:** `/help` (signed in, 375, light): the Compendium nav link is missing; the signed-out page shows it.
- **Found:** Seen in the pictures. It may be a space decision; other signed-in 375 pages were not checked.
- **Why It Matters:** One nav should carry the same links at one width. No external source; this repo's rule is "Share, never copy".
- **Recommended Fix:** Check the nav at 375 for a signed-in viewer.
- **Owner's Choice:** Fix
- **Follow-up Task:** None

### F-77 Gap Between Intro And First Heading

- **Severity:** Low
- **Lens:** Layout
- **Lane ids:** T-5
- **Where:** `/terms` and `/privacy` (signed out, desktop, both themes): about 100px between the intro and the first heading.
- **Found:** Seen in the pictures, roughly measured.
- **Why It Matters:** A gap is the sum of every stacked margin. No external source; this repo's rule is the spacing scale (`claude-docs/styling.md:205-212`).
- **Recommended Fix:** Use the gap `/help` uses. Shared piece: `DocumentPage`.
- **Owner's Choice:** Fix
- **Follow-up Task:** Even Out Dialog Gaps And Eyebrows

### F-78 Auth Error Messages End In Full Stop

- **Severity:** Low
- **Lens:** Labels
- **Lane ids:** C-7
- **Where:** `src/lib/auth.ts:237`, `:256`, `:279`, `:361`.
- **Found:** Sure of the text: four one-sentence messages end in a full stop. Not settled whether they reach a screen as written; needs a look in a browser. The message at `:279` ("This passkey is the only way to sign in to this account, so it cannot be removed") also gives no next step.
- **Why It Matters:** R7 (`.claude/rules/components.md:77`): a one-sentence message has no full stop.
- **Recommended Fix:** Drop the stop and add a next step to `:279`.
- **Owner's Choice:** Fix
- **Follow-up Task:** Tidy Copy On Account, Public And Keeper Screens

### F-79 Aria-Labels Mix Title And Sentence Case

- **Severity:** Low
- **Lens:** Labels
- **Lane ids:** C-6
- **Where:** aria-labels in `AccessCards:23`, `sub-pages-field:151`, `copy.tsx:257`, `duplicates:835`, `references:515`, `variants:323`, `MemberList:79`, `two-factor:287`, `SupportList:70`, `ThemeToggle:118`, `UserDetail:127` and `UserList:105,116,130`.
- **Found:** Sure of the source strings, from a scan. Not settled how each reads when spoken; needs a look in a browser.
- **Why It Matters:** The copy rule (`.claude/rules/components.md:60-65`) covers buttons, headings and field labels; it does not name aria-labels. The owner decides whether they follow Title Case.
- **Recommended Fix:** Record the rule either way.
- **Options:**
  - Title Case
  - Sentence Case
  - Leave As Is
- **Owner's Choice:** Answer, Title Case
- **Follow-up Task:** None

### F-80 Placeholder Casing Differs From Siblings

- **Severity:** Low
- **Lens:** Labels
- **Lane ids:** C-5
- **Where:** `HelpOutline/guide-select.tsx:31` ("Choose a Guide") against `HelpSearchForm/index.tsx:53` ("Search Help") and others.
- **Found:** Sure of the strings. R8 (`.claude/rules/components.md:78`) does not say which case a placeholder takes.
- **Why It Matters:** No external source; this repo's rule is silent, so the owner sets one.
- **Recommended Fix:** Pick one and record it in R8.
- **Options:**
  - Title Case
  - Sentence Case
- **Owner's Choice:** Answer, Title Case
- **Follow-up Task:** Make The Placeholder Lint Refuse Non-Literal Values

### F-81 Raw Spacing Literals

- **Severity:** Low
- **Lens:** DRY
- **Lane ids:** C-12
- **Where:** `AdminCards/index.scss:9`; `PageHeader/index.scss:40,59`; `DocumentPage/index.scss:196`; `BusinessCards/skeleton.scss:22,36`; `src/scss/_primitives.scss:1232`.
- **Found:** Sure of the lines. Whether each is on the scale was not checked.
- **Why It Matters:** Every margin, padding and gap takes a step from `space()` (`claude-docs/styling.md:205-212`). D-194 (Moved to MC.9) already records literal spacing; these sites join it.
- **Recommended Fix:** Add the sites to the D-194 task.
- **Owner's Choice:** Fix
- **Follow-up Task:** D-194's task (MC.9)

### F-82 fieldsRefused Written Twice

- **Severity:** Low
- **Lens:** DRY
- **Lane ids:** C-13
- **Where:** `IngredientForm/index.tsx:216-223` and `SpellBuilder/index.tsx:201-208`: the same message constant and the same error builder, used at `IngredientForm/index.tsx:694` and `SpellBuilder/index.tsx:413,508`.
- **Found:** Sure; both were read. A search of `dry.md` for the names found nothing.
- **Why It Matters:** "Share, never copy" (CLAUDE.md, Conventions): a block written twice becomes a shared piece.
- **Recommended Fix:** One export in `src/lib/` beside the other client error helpers. Check `tests/guards/lib-names.test.ts` for a name clash first.
- **Owner's Choice:** Fix
- **Follow-up Task:** Share fieldsRefused And Move The Users Page Assembly

### F-83 Hand-Built Tables Skip DataTable

- **Severity:** Low
- **Lens:** Design system
- **Lane ids:** C-10
- **Where:** `HelpWidget/role-permission-table.tsx` and `HelpOutline/order-table.tsx`.
- **Found:** Sure both are raw tables. `order-table.tsx` carries a comment that justifies it for drag and drop; `role-permission-table.tsx` has none.
- **Why It Matters:** `DataTable` is the shared table (`.claude/rules/components.md`).
- **Recommended Fix:** Move `role-permission-table.tsx` to `DataTable` if it can show a static matrix.
- **Owner's Choice:** Fix
- **Follow-up Task:** Share fieldsRefused And Move The Users Page Assembly

### F-84 Users Page Assembles Its Own Data

- **Severity:** Low
- **Lens:** Readability
- **Lane ids:** C-9
- **Where:** `src/app/(shell)/keepers/(people)/users/page.tsx` (139 lines).
- **Found:** The page assembles data itself. Medium confidence; only skimmed.
- **Why It Matters:** Pages call services; assembly beside it is easier to test. No external source; this repo's rule 1 puts authorization in services, and the page stays frame work.
- **Recommended Fix:** Move the assembly to a module service or a reader beside the page.
- **Options:**
  - Module Service
  - Reader Beside The Page
- **Owner's Choice:** Fix, Module Service
- **Follow-up Task:** Share fieldsRefused And Move The Users Page Assembly

### F-85 Mixed-Job Components Over 300 Lines

- **Severity:** Low
- **Lens:** Readability
- **Lane ids:** C-14
- **Where:** `IngredientForm/index.tsx` (1185 lines), `IngredientForm/duplicates.tsx` (897), `SpellBuilder/index.tsx` (795), `IngredientForm/reference-panel.tsx` (670).
- **Found:** Sure of the line counts. Medium confidence that `duplicates.tsx` mixes jobs; the others were read in outline only.
- **Why It Matters:** Size alone is not a defect; the owner decides whether to split.
- **Recommended Fix:** Split by job, starting with the row-sliding hook in `duplicates.tsx` and the GraphQL documents in `IngredientForm/index.tsx`; or leave.
- **Options:**
  - Split By Job
  - Leave As It Is
- **Owner's Choice:** Answer, Split By Job
- **Follow-up Task:** None

### F-86 Colour Sliders Show Single Letters At 375

- **Severity:** Low
- **Lens:** Layout at 375
- **Lane ids:** none
- **Where:** the vocabulary-group dialog (curator, 375): the sliders show "H", "S" and "B" while the accessible text says Hue, Saturation and Brightness.
- **Found:** Seen in the picture. Whether the hex sample matches was not checked; unsure.
- **Why It Matters:** A single letter is easy to misread. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Show the words at 375 if there is room.
- **Owner's Choice:** Fix
- **Follow-up Task:** None

### F-87 Save Address Sits Under GitHub Issue

- **Severity:** Low
- **Lens:** Labels
- **Lane ids:** none
- **Where:** the support request dialog (keeper and curator): a "Save Address" button belongs to a field labelled "GitHub Issue".
- **Found:** Seen in the picture; unsure what the button saves.
- **Why It Matters:** A button name should match its field. No external source; this repo's plain-writing rule.
- **Recommended Fix:** Check the pairing and rename the button.
- **Owner's Choice:** Fix, The Button Reads "Save Issue"
- **Follow-up Task:** None

## Flows With Extra Steps

Steps are counted from the story specs. "Steps to remove" is steps now minus fewest needed.

| Flow                                    | Steps now                                                                         | Fewest needed                                                       | Steps to remove                                            | Story spec                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Sign up, then reach a signed-in account | 9 (6 to a signed-in account, then the mailed link, Continue and Agree & Continue) | 8                                                                   | 1 (the Continue link only links onward; medium confidence) | `tests/e2e/stories/16-password.spec.ts:23-56`                 |
| Reset a password, then sign in          | 11 (6 to reset, then 5 to sign in again)                                          | 6 (sign the person in at once, or carry the address)                | 5                                                          | `tests/e2e/stories/16-password.spec.ts:85-117`                |
| Invite a member                         | 7                                                                                 | 4 (low confidence; the tab hop and the Done dismiss are candidates) | 0 asserted                                                 | `tests/e2e/stories/01-invitations.spec.ts:180-209`            |
| Send a support request                  | 5                                                                                 | 4 (low confidence; the Done dismiss)                                | 0 asserted                                                 | `tests/e2e/stories/89-support-request.spec.ts:25-50`          |
| Record a working                        | 3                                                                                 | 2 (low confidence; needs a look in a browser)                       | 1                                                          | `tests/e2e/stories/06-grimoire.spec.ts:744-753`               |
| Keeper edits a document                 | 4                                                                                 | 3 (Save Draft then Publish are two buttons for one outcome; low)    | 1                                                          | `tests/e2e/admin-documents.spec.ts:98-122` (not a story spec) |
| Keeper mints cards                      | 8 (3 optional)                                                                    | 8                                                                   | 0                                                          | `tests/e2e/stories/88-invitation-cards.spec.ts:32-51`         |

Flows with no extra steps: sign-in methods, passkey, two-factor, accept an invitation (coven 2, card 3, keeper 4), create a coven, rename (3), remove a member (3), leave (2), add an ingredient (3), add a variant and stock (4), complete a spell (2), duplicate a spell (2), change visibility (2), change a role (3), keeper invites (5), email change (3), agree to terms (1), keeper handles a support request, curator adds an entry (4), vocabulary value (5), edit a help article (4).

## Proposed Tasks

Each is one PR. Hours are estimates. MB.301 is already minted and is not repeated here.

**Route Every Date Through utc.ts** · 4h

_Story:_ As a person reading dates across screens, I want one long form and one short form everywhere, so that I never compare two formats.

From F-1.

_Acceptance criteria:_

- Every date and time on a screen and in a mail comes from a formatter in `src/lib/utc.ts`.
- The hand-written formats in the five components are gone.
- A guard refuses a hand-written date format outside `src/lib/utc.ts`.

**Give Error And Gate Pages One Layout** · 3h

_Story:_ As a person who lands on a blocked page, I want the page to look like its siblings and say what to do, so that I am not left guessing.

From F-2, F-48, F-49, F-50.

_Acceptance criteria:_

- The 403 and 404 pages share one body and each says what to do.
- The three gate cards align alike.
- The reset password page spaces its subtitle like the forgot password page and shows no empty strength bar.

**Make The Placeholder Lint Refuse Non-Literal Values** · 3h

_Story:_ As a developer, I want the placeholder lint to read every placeholder, so that a template string cannot carry a limit or a long phrase into a field.

From F-3, F-80.

_Acceptance criteria:_

- A placeholder built from a template or a variable is refused by the lint, or resolved to its text and checked.
- The Filters combobox and the Mint Cards sheet count field show an empty or one-to-two-word placeholder, and the sheet limit sits in the hint.
- The placeholder casing rule is recorded in the placeholder rule once the owner has chosen.

**Draw Staff Help Inside The Keepers Frame** · 3h

_Story:_ As a keeper or curator, I want Staff Help to keep the Keepers frame, so that I can see where I am.

From F-4, F-70.

_Acceptance criteria:_

- Staff Help pages show the Keepers context bar and the active top-nav tab, and the index links back to the hub.
- The staff guide cards carry no repeated eyebrow.

**Fix The Support Form Hint, Radio Cards And Messages** · 3h

_Story:_ As a person asking for support, I want the form to mark only real errors, so that a hint never looks like a fault.

From F-5, F-8, F-23, F-24, F-54.

_Acceptance criteria:_

- The Message hint uses the hint style, not the error style.
- The group error has no full stop.
- Every radio card lays out the same way at 375 and at desktop.
- One group error outlines the group once, not each card.
- The request thread shows the author once.

**Write Keeper With A Capital** · 1h

_Story:_ As a person using the site, I want the site role named the same on every screen, so that I know who a Keeper is.

From F-6, F-13.

_Acceptance criteria:_

- The three account screens and the Keepers hub write Keeper and Keepers with a capital and never "admin".

**Give Every Edit Dialog One Footer** · 3h

_Story:_ As a person editing, I want every edit dialog to put Save, Cancel and Delete in the same places, so that I find them without looking.

From F-7, F-34, F-35.

_Acceptance criteria:_

- Every edit dialog has a quiet Cancel and a Delete in the same place, with a visible label.
- The complete action has one name in both steps of Record a Working.
- The confirm step is titled for the action it confirms.

**Bring Red Controls Into The Rule** · 2h

_Story:_ As a developer, I want every red control to be one the rule names, so that red keeps meaning the same thing.

From F-9, F-10, F-39.

_Acceptance criteria:_

- Each page-level Delete, Decline, and the Delete Coven radio follows the rule the owner has chosen.
- The rule in the components rules names every red control.

**Flag New Steward On Submit In The Leave Dialog** · 1h

_Story:_ As a steward leaving a coven, I want to press Promote and Leave and be told what is missing, so that the button never sits dead.

From F-11.

_Acceptance criteria:_

- Promote and Leave stays enabled with New Steward empty.
- Pressing it with New Steward empty flags that field and moves focus to it.

**Fix The Compendium Entry Layout** · 3h

_Story:_ As a reader of an ingredient, I want the page to flow without gaps or repeats, so that I find facts quickly.

From F-12, F-19, F-20, F-60.

_Acceptance criteria:_

- The Forms section starts under Details with no blank band.
- The safety note shows once per page.
- Empty groups do not each print a "No ... recorded." line on the public view.
- The Correspondences headings follow the heading order.

**Stop Decorative Art Covering Text** · 2h

_Story:_ As a reader on a phone, I want decorative pictures to stay behind or beside text, so that nothing is hard to read.

From F-15.

_Acceptance criteria:_

- No decorative picture overlaps heading or body text at 375 or at desktop in either theme.

**Show One Mark In Empty Cells** · 2h

_Story:_ As a keeper or steward reading a table, I want an empty cell to say it is empty, so that a missing value is not read as a fault.

From F-16.

_Acceptance criteria:_

- An empty cell shows one shared mark, or a column empty in every row is hidden.

**Tidy Copy On Account, Public And Keeper Screens** · 3h

_Story:_ As a reader, I want short and consistent copy, so that I read each fact once.

From F-17, F-38, F-40, F-42, F-52, F-55, F-56, F-64, F-65, F-78.

_Acceptance criteria:_

- Quotes in visible copy are curly or removed.
- Blocked states give a next step.
- Documents are linked once on the terms page.
- The listed wordy lines are shortened.
- The four auth messages carry no full stop.

**Fix 375 Layout Faults In Sheets And Dialogs** · 3h

_Story:_ As a person on a phone, I want sheets and dialogs to fit, so that I can reach every control.

From F-18, F-21, F-22, F-28, F-31.

_Acceptance criteria:_

- The Filters sheet has one Close.
- Small buttons have a hit area of at least 24 by 24 CSS pixels.
- The coven switcher keeps its chevron on the name line.
- The support status strip shows a cue where it clips.
- Confirm buttons stack instead of wrapping.

**Align The Keeper Pages** · 4h

_Story:_ As a keeper or curator, I want the keeper pages to share a frame, so that nothing jumps between them.

From F-26, F-27, F-29, F-59, F-62, F-66, F-68, F-69, F-71, F-72, F-73.

_Acceptance criteria:_

- Form pages share one width.
- Tab strips do not start clipped and show a cue where they clip.
- Empty lists do not offer a solid Download CSV.
- The hub lists each area once.
- The Group cell looks the same on every table.
- Staff list labels and counts follow one pattern.

**Even Out Dialog Gaps And Eyebrows** · 3h

_Story:_ As a person using dialogs, I want even spacing and aligned headers, so that the screen looks finished.

From F-30, F-32, F-33, F-36, F-37, F-41, F-63, F-77.

_Acceptance criteria:_

- No dialog shows an empty message row, a stray band or a misaligned eyebrow.
- The dark eyebrow patch is gone.
- The date popover stays inside the view.
- The member dialog date stays on one line.

**Tidy The Mail Calls To Action And Headings** · 2h

_Story:_ As a mail recipient, I want one clear next step, so that I know what to do.

From F-44, F-45, F-46, F-47.

_Acceptance criteria:_

- Every mail has one button, or the owner has recorded why not.
- The sign-in instruction mails carry a link or say why not.
- The reset button has one label in every mail.
- Support mail lead-ins follow the heading case or the exception is recorded.

**Share fieldsRefused And Move The Users Page Assembly** · 3h

_Story:_ As a developer, I want one copy of each helper, so that a change lands once.

From F-82, F-83, F-84.

_Acceptance criteria:_

- One `fieldsRefused` export serves both forms.
- The Users page file does frame work only.
- The role table uses `DataTable` or carries a comment saying why not.

The raw spacing literals (F-81) join the task that D-194 moved to MC.9; they need no new task.

## Proposed Rules

| Id  | Rule                                                                                                                                                                                                                                                                 | Findings prevented | Target file                                                               | Enforcement | Add or Skip |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------- | ----------- | ----------- |
| R-1 | Name the shell bar's Add Ingredient as the one exception to "one solid button per view".                                                                                                                                                                             | withdrawn finding  | `claude-docs/styling.md:357` and `claude-docs/components/app-shell.md:22` | review-only | Add         |
| R-2 | A placeholder that is not a string literal is refused, or resolved and checked.                                                                                                                                                                                      | F-3                | `.claude/rules/components.md` R8 and `lint/source-sweeps.js`              | lint        | Skip        |
| R-3 | Dates and times format only through `src/lib/utc.ts`.                                                                                                                                                                                                                | F-1                | `.claude/rules/components.md`                                             | guard       | Add         |
| R-4 | A hint is never drawn in the error style.                                                                                                                                                                                                                            | F-5                | `.claude/rules/components.md` R7                                          | review-only | Add         |
| R-5 | Where a page-level red control may sit. Settled: Delete Coven is a named red page control, Decline Invitation is a named red control, and a page's other deletes use the delete icon.                                                                                | F-9, F-10, F-39    | `.claude/rules/components.md`                                             | review-only | Add         |
| R-6 | aria-labels and placeholders are Title Case.                                                                                                                                                                                                                         | F-79, F-80         | `.claude/rules/components.md`                                             | review-only | Add         |
| R-7 | The pagination guard also refuses a page that passes `HELP_PAGE_LIMIT` or a literal `limit:` to a service read. I recommend yes; search goes first under MB.301, and the glossary, help front and staff index need the owner's answer (pager or recorded exemption). | F-14               | `tests/guards/pagination.test.ts`                                         | guard       | Add         |
| R-8 | Visible copy uses curly quotes.                                                                                                                                                                                                                                      | F-17               | `.claude/rules/writing.md`                                                | guard       | Skip        |
| R-9 | Keeper form pages share one width.                                                                                                                                                                                                                                   | F-26               | `.claude/rules/components.md`                                             | review-only | Add         |

## Left As It Is

These were reported and then checked; they are not findings.

- **CD-3:** a capture fault, not the app.
- **CD-5, A-6, P-8, P-13, S-18:** placeholders such as "Add a name". Rule R8 does not count the articles a, an and the (`.claude/rules/components.md:78`; the lint at `lint/source-sweeps.js:780`), so these comply.
- **C-1:** withdrawn by the owner's decision of 2026-11-17.
- **C-3:** allowed; `DocumentMailingPanel/index.tsx:147` is a named red control.
- **S-8:** a whole red column is allowed (`.claude/rules/components.md:58`).
- **S-23:** the help row drag handle is not under 24 by 24 px: the hit area is grown by `::before` to about 24 by 43 px (`HelpOutline/index.scss:171-190`). Not measured in a browser. This contradicts the Medium rating in the brief.
- **CP-9:** refuted; Cancel is `btn btn--quiet` (`Field/form-actions.tsx:63-70`, `RenameWorkspaceForm/index.tsx:81`).
- **The invite dialog (CD-1 part):** its button is disabled only while nothing is typed (`InviteDialog/index.tsx:110-118`), which is "nothing to save".
- **Practitioner Edit and Complete Working** is by design (`workings.ts:69-77,366`; `SpellWorkings/index.tsx:34`).
- **C-8, C-11, C-15:** recorded in `claude-docs/audits/dry.md` as D-90, D-58, D-78 and D-1.
- **F-39:** withdrawn after the owner's note; the Delete Coven dialog already says below the radio what happens.
- **F-67:** withdrawn; the "Users" control is the People section's tab navigation (Users and Privilege Changes) in `src/app/(shell)/keepers/(people)/layout.tsx`.
- **F-69:** withdrawn; the status mark has a tooltip and an accessible name (`src/components/SupportRequests/status-mark.tsx:14-15`).
- **Other lane items** where the reader found nothing.

## Seen For M17.9

Every accessibility observation, with the criterion and whether it was measured.

| Observation                                                                                                                       | Criterion                     | Measured                    |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------- |
| Small buttons about 24 px tall at 375 (F-21)                                                                                      | 2.5.8 [S2]                    | no, estimated from pictures |
| Footnote marker "#1" is small plain text (F-75)                                                                                   | 2.5.8 [S2]                    | no                          |
| Heading levels skip after Details (F-60)                                                                                          | 1.3.1 [S3]                    | no, aria text only          |
| FAQ link doubles the heading name (F-61)                                                                                          | 2.5.3 [S4]                    | no, candidate               |
| Hint in error red; seven red card outlines; icon-only support status (F-5, F-24, F-69; F-69 withdrawn, F-24 skipped by the owner) | 1.4.1 [S1]                    | no                          |
| Decorative art behind text (F-15)                                                                                                 | 1.4.3 [S5]                    | no                          |
| Muted mail footer lines and the privacy nav item look low contrast                                                                | 1.4.3 [S5]                    | no                          |
| Sort icon may lack a name (F-74)                                                                                                  | 4.1.2, not opened as a source | no                          |
| Icon-only Delete in edit dialogs has a screen-reader name but no visible label (F-7)                                              | 2.5.3 [S4] for visible label  | no                          |
| Aria-label casing (F-79)                                                                                                          | not a WCAG matter             | n/a                         |
| The sweep for unnamed icons found none, and the sweep for images without `alt` found none                                         | n/a                           | yes, by the sweeps          |
| Target-size sweep hits were not proven under 24 px                                                                                | 2.5.8 [S2]                    | no                          |

## Sources

- [S1] W3C. "Understanding Success Criterion 1.4.1: Use of Color." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- [S2] W3C. "Understanding Success Criterion 2.5.8: Target Size (Minimum)." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- [S3] W3C. "Understanding Success Criterion 1.3.1: Info and Relationships." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html
- [S4] W3C. "Understanding Success Criterion 2.5.3: Label in Name." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html
- [S5] W3C. "Understanding Success Criterion 1.4.3: Contrast (Minimum)." _WCAG 2.2 Understanding Docs_. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- [S6] GOV.UK Design System. "Button." _GOV.UK Design System_. https://design-system.service.gov.uk/components/button/
- [S7] GOV.UK Design System. "Validation." _GOV.UK Design System_. https://design-system.service.gov.uk/patterns/validation/
- [S8] Sherwin, Katie. "Placeholders in Form Fields Are Harmful." _Nielsen Norman Group_, 11 May 2014. https://www.nngroup.com/articles/form-design-placeholders/
