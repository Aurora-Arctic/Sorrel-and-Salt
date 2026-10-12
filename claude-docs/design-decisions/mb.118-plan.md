_The scoping plan approved on 2026-10-12 for MB.118 (#575), kept as approved, with the decisions taken at sign-off appended at the end._

# MB.118 — Design review: the site's mail (#575)

## Context

MB.118 is the Wave 10 design review of the three mails the site sends: the verification and change-of-address mail (`src/emails/verify-email.tsx`), the admin invitation (`src/emails/admin-invitation.tsx`) and the coven invitation (`src/emails/coven-invitation.tsx`, M7.3, still uncommitted in `/app`). It reviews them **as mail**, in Mailpit and against the major clients, within MB.114's palette and type. Behaviour does not change; a sub-hour defect is fixed here, a larger one is minted. The owner signs off each mail's design, light and dark and at 375px, as a comment on #575, and the PR waits for that word (MB.116's precedent: a design review stops for sign-off; no PR until the owner asks).

Branch `feature/mb.118-design-review-the-sites-mail` already exists in the worktree `/home/node/worktrees/mb118`, off `origin/staging` at `3b5547c6`, node_modules copied, `.env.local` in place; the board shows In Progress with the start comment posted. Nothing is committed to `/app`.

**Base change (the one ask):** M7.3 is now in review (PR #915, `feature/m7.3-createinvitation-mutation-that-mails-the-link`, head `79056e9b`, its coven template identical to `/app`'s copy). The wave orders MB.118 after it, so the branch is moved onto M7.3's head (`git reset --hard origin/feature/m7.3-…` in the worktree: it has no commits yet). Then the coven mail is in the tree, the every-mail test covers it directly, and the preview line and subject for it can change here. The PR still targets `staging`, opens with `Closes #575`, and names #915 as the PR it follows, so its diff shrinks once M7.3 merges.

**Owner's decisions (2026-10-12, planning):** all sub-hour fixes land in this PR (estimate rises from 2h to about 6h, recorded in the entry and with `estimate MB.118 6`); the owner wants an **artifact of suggested changes**; preview lines are drafted per mail for sign-off and applied only after the owner decides.

### What the review found (measured from source and the rendered HTML; the client findings from an Opus read of the rendered mail against documented client behaviour, confidence stated per item)

Rendered already: every mail from `/app`'s working copy (verify in both purposes, admin, coven) to `scratchpad/render/*.html|txt` with staging's origin. Palette and ornament PNGs measured with `src/lib/contrast.ts`'s formula and `sharp`.

**Holds, to assert:**

- A. **Palette not drifted.** `src/emails/theme.ts`'s eight hexes equal the compiled Sass tokens to the channel.
- B. **Every token pairing clears 4.5:1 on the plain page.** Dark: text 14.77, muted 9.67, link and button 7.97. Light: text 13.41, muted 5.99, link and button label 4.65. No test holds this floor for the mail yet.
- C. **Plain-text part says everything the HTML does.** Only HTML-only sentence: "Or copy this link into your browser:"; "click the button below" becomes "open the link below".
- D. **The link is the obvious action and readable as text**: button, then the href as the anchor's own text with `word-break: break-all` (keep: tokens are long; at 375px it would otherwise widen the page).
- E. **Images blocked**: no `<img>`; the photographs are CSS backgrounds over an inline page colour. Nothing is lost but the ornament.
- F. **375px**: text area 311px; wordmark (~140px, right) and sorrel (165px, left) do not collide; the 32px heading fits.
- G. `email.md` has its "Design" section; it lacks the 375px rule.

**Defects, sub-hour, fixed here:**

1. **Salt photograph under the closing lines fails contrast in light.** `OVERLAP = 56` runs each photograph 56px under the text. Top: only the 32px bold heading meets the sorrel (worst pixel 4.78:1 light, 11.8 dark: fine). Bottom: the salt's top 56px covers the last ~2 lines, the muted "Or copy…" line, the written-out link and the ignore note. Over the light salt's darkest pixel (`#8f8b82`) muted text is **2.14:1**, the link **1.66:1**; at 375px the salt covers the right 60% of those lines. No opacity fixes it (the link ink cannot reach 4.5:1 over any visible darkening of the page; muted would need ≤13% opacity). Dark passes everywhere (muted 7.73, link 6.37). **Fix:** the salt sits beneath the text block, overlapping only the last paragraph's 16px margin, in both themes. The sorrel keeps its overlap.
2. **Outlook desktop (Word engine) draws the text in Times New Roman** (high confidence). The body font is only on React Email's Body cell and Word does not inherit `font-family` into nested tables; and when a stack's first face is an uninstalled `@font-face`, Word falls to Times New Roman. **Fix:** wrap the `@font-face` rules in `@media screen{…}` (Word skips it; WebKit/Blink load the fonts), and put `fontFamily` inline on `Paragraph`, the `Heading`, the `Button` and the written-out `Link`.
3. **Outlook desktop drops the side padding** (high confidence): React Email's `Section` puts `padding` on the `<table>`, which Word ignores on tables, so text runs to the pane's edge; and Word ignores `max-width`, so lines run the pane's width. **Fix:** the two padded sections become the layout's own `<table><tr><td style={{padding}}>`, the pattern the `ss-page` cell already uses; and an MSO ghost table (`<!--[if mso]><table width="600" align="center">…<![endif]-->`) around the Container, inserted in `renderParts` by replacing two sentinel comments, since React cannot write conditional comments. The `ss-page` test's shape (`class="ss-page"` exactly once; every light selector under it) must stay green.
4. **The text part opens with the homepage URL** ("Sorrel & Salt https://…"): the converter writes a link's href unless it equals the text. **Fix:** `{ selector: 'a.ss-wordmark', options: { ignoreHref: true } }` in `renderParts`'s `htmlToTextOptions.selectors`, so the first address in the text part is the action's.
5. **No viewport meta.** Add `<meta name="viewport" content="width=device-width, initial-scale=1">`. Cheap; iOS Mail already has `x-apple-disable-message-reformatting`.
6. **Line-height in Word** (medium confidence, low severity): unitless `1.6` is handled oddly by Word. **Fix:** pixel line heights (`26px` for 16px text, `22px` for 14px, `38px` for the h1) with `msoLineHeightRule: 'exactly'`. Small, rides with 2.

**Wording, subjects and layout against published guidance** (researched 2026-10-12; sources at the end):

- **Subjects.** Postmark: fifty characters or fewer, "simple and direct wins over cute and catchy"; Litmus: at most nine words / ~60 characters, and mobile shows 25–30; GOV.UK: most important information first. Ours are 41–44 characters, so the length holds, but each ends with a full stop (none of the cited examples does: "Reset your Stripe password") and each spends its first words on "You Are Invited" or on the site's name, which is already the sender name (`Sorrel & Salt <noreply@…>`, `src/lib/mail.ts`). Benton on invitations: name both parties, "Sarah Miller added you to Acme's Marketing workspace", never a generic "You're invited". **Drafts for sign-off:** verify "Confirm Your Email Address" (both purposes; GOV.UK: "use this email address", never "this email" for the address); admin "You Are Invited to Be an Admin"; coven "Join {covenName} on Sorrel & Salt" (M7.3's `covenName` is on the props; `defineMessage` takes a subject function, a small layout change). Title case stays: GOV.UK prefers sentence case, but the owner's standing rule is title case for every heading and label, and that wins here.
- **Preview lines.** Every source agrees a preheader of 40–90 characters that adds to the subject, never repeats it. Ours repeat it. **Drafts:** verify sign-up "Confirm the address you signed up with. The link works for one hour."; verify change "Confirm this address for your account. The link works for one hour."; admin "Accept within seven days to become an admin."; coven "Accept within seven days to join {covenName} as a {role}."
- **Body copy.** Holds: one important thing per mail, the first sentence says why the reader got it (GOV.UK, Home Office), the deadline is stated, the address is spelled out in full under the button (GOV.UK: "spell out any web addresses in full"), the button is a verb ("Confirm My Email", "Accept the Invitation": Benton, Litmus), the close "…you can ignore this email" is Benton's own pattern. **Two changes to draft:** GOV.UK's style guide says "Avoid negative contractions like can't and don't. Many users find them harder to read, or misread them as the opposite of what they say" — ours close on "If it wasn't you" and "If you weren't expecting this", so the drafts read "If this was not you" and "If you were not expecting this"; and Postmark's reset guide says to tell the reader how to get a new link once it expires — the verification mail says "within one hour" and nothing after, so a draft sentence for sign-off: "If the link has expired, sign in and ask for a new one from your account page." (copy only; the account page already offers it). Two things the sources want that the data does not yet carry, **minted, not built**: the invitee's name in the body (GOV.UK: "include the user's first name and surname in the body of the email to make phishing more difficult"; the verification hook has `user.name`, the invitation senders take only an address and a token), and the inviter's name in an invitation (Benton: "Start with who sent the invite … the actual person's name"; `siteInvitation(to, token)` and M7.3's sender carry no inviter). Both change what a service hands the mail, which this task's "behaviour does not change" rules out.
- **Layout.** Holds: 600px single column, 16px body and 14px notes (Litmus: 14px desktop minimum, 16px on a phone), line height 1.6 (Litmus: 1.5×), `lang="en"`, real headings, live text, left-aligned. **One defect:** the button is 43px tall (12px padding, 16px text at 120%), under the 44×44px tap target Benton and WCAG 2.5.8 ask for; **fix** (sub-hour, rides with the layout work): 14px vertical padding, 47px.

**Suggestions for the owner (in the artifact; applied only on their word):**

- 7. **Subjects, preview lines and the four body-copy drafts above** are copy and wait for sign-off; then they change here, the coven ones too, since the branch holds M7.3's template.
- 8. **Gmail iOS may fully invert a dark mail** (uncertain, Litmus's classification): the page and text would flip light while the opaque pre-blended PNGs stay dark, leaving dark rectangles in the corners. Needs a device look; the real fix (ornaments with transparency from `scripts/email-ornaments.ts`) is a minted task if confirmed.
- 9. **Outlook.com and new Outlook dark mode may recolour the button** (uncertain): `[data-ogsb] .ss-button` / `[data-ogsc] .ss-button` overrides in a second `<style>` would hold it, but they are `ss-` rules outside the light block, which MB.72's pinned shape forbids. Minted if the owner's client preview shows it.
- 10. **iOS data detectors** might style "within one hour" as a link (uncertain); `format-detection` meta and an `a[x-apple-data-detectors]` rule prevent it. Left as a suggestion.
- No change: `font-weight: 300` (Arial has no 300, so Gmail draws 400; contrast stays high), `background-size`, `target="_blank"`, the `color-scheme` meta (works; a `:root{color-scheme}` rule is an optional pairing).
- **To mint** (behaviour, outside this task): the reader's name in the verification mail; the inviter's name in both invitations; transparent ornaments if finding 8 is confirmed on a device.

**Sources** (each read during planning): Postmark, "Transactional email best practices" (postmarkapp.com/guides/transactional-email-best-practices) and "Password reset email best practices" (postmarkapp.com/guides/password-reset-email-best-practices); GOV.UK Service Manual, "Sending emails and text messages" (gov.uk/service-manual/design/sending-emails-and-text-messages); GOV.UK style guide A to Z, "contractions", "email", "email addresses", capitalisation (guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/); Home Office design system, "Send users an email" (design.homeoffice.gov.uk/design-system/patterns/send-users/email); Bento, "User invitation email best practices" (bentonow.com/posts/user-invitation-email-best-practices); Litmus, "Subject line length" (litmus.com/blog/the-great-debate-subject-line-length) and "Ultimate guide to accessible emails" (litmus.com/blog/ultimate-guide-accessible-emails); MailCharts, "Email preheader text" (mailcharts.com/blog/email-preheader-text) for the 40–90 character preheader range. They go in the artifact beside the suggestion each supports, and in `email.md`'s "Design" as the guidance the mail follows.

## Approach

Three outputs: (A) the artifact, first; (B) the fixes and asserting tests, TDD, committing at each green step after `npm run pre-commit`; (C) docs and board. Then stop for sign-off.

### A. The artifact: "Mail Design Review"

A private artifact for the owner (load `artifact-design` first): the findings above with their numbers, each suggested change with its recommendation, confidence and size, the contrast table per theme, the preview-line drafts, the Mailpit scores, and the screenshots before and after the salt fix. It carries no secret and writes nothing to the public issue (no artifact URL on #575).

Screenshots, from the worktree with a scratchpad script (`scripts/review-screenshots.mjs` shoots app pages by URL; a mail is a static document):

- A `node:http` static server on a free port (61001 is free) serving `public/` and the rendered HTML files; the remote browser (`PLAYWRIGHT_WS_ENDPOINT`, connects, Chromium 153) reaches it as `http://devcontainer:<port>`. Mails rendered with `origin` set to that address so fonts and photographs load.
- One context per theme (`colorScheme`) and width (600 and 375 with `isMobile`/`hasTouch`), full-page shot per mail: 3 mails × 2 themes × 2 widths, plus one images-blocked shot per theme (abort `/email/images/*`), before and after the fixes.
- Saved under `/app/.reports/mb.118-review/` (gitignored, host-mounted, so the owner can open them in the editor), embedded in the artifact as data URIs. The coven mail renders from the branch itself once it sits on M7.3's head.
- The three rendered HTML files with staging's origin are saved beside them as **paste-ready sources** for the client preview `email.md` asks for (unspam.email or the Mailtrap Sandbox): this container has no browser of its own and no Mailtrap token, so the Gmail/Outlook/Apple Mail criterion is the owner's part of the sign-off. The artifact says so and names what to look at (dark page in Gmail and Outlook dark, light page in Apple Mail light, no photographs in desktop Outlook, finding 8 on an iPhone).

Mailpit: send each rendered mail to `http://mailpit:8025/api/v1/send` and read its HTML Check and Link Check (route confirmed on v1.31.2); the scores for Gmail, Outlook and Apple Mail go in the artifact.

### B. Fixes and tests (`src/emails/parts/layout.tsx`)

1. **Contrast token test**, new `tests/emails/theme.test.ts` (unit project): one assertion per theme that text, muted and link clear 4.5:1 on the page, the button label on its fill, and the fill 3:1 against the page, through `contrastRatio` from `src/lib/contrast.ts` over `EMAIL_THEMES` (rule 4 of `layer-ownership.md`; mirrors `tests/scss/tokens.test.ts`). Green today; it pins the floor for the next palette change.
2. **Every-mail assertions**, new `tests/emails/parts/layout.test.tsx` (dom project), one row per message function (`verifyEmailMessage` sign-up and change, `adminInvitationMessage`, `covenInvitationMessage` from M7.3's branch): (a) every `<h1>`/`<p>` text in the HTML, entities decoded, "click the button below" read as "open the link below" and the HTML-only "Or copy this link into your browser:" dropped, appears in the text part; (b) the link's address appears as visible anchor text; (c) the text part's first address is the action's (written red first: it fails on the wordmark href today, finding 4). A readdir guard asserts the rows name every `src/emails/*.tsx` template, so M7.3's coven mail adds its row when the branches meet (one line, flagged to the owner since M7.3 is live in `/app`).
3. **The salt overlap** (finding 1): bottom padding `ORNAMENTS.salt.height - PARAGRAPH_GAP` (the 16px every paragraph ends on). The comment states the measured reason. No test asserts the number (rule 4); the re-measured worst pixel and the screenshot pair are the evidence, in the artifact and the PR body.
4. **Outlook** (findings 2, 3, 6): `@media screen` around the `@font-face` rules; inline `fontFamily` on `Paragraph`, `Heading`, `Button` and the written-out `Link`; the two padded `Section`s become cell-padded tables; pixel line heights with `msoLineHeightRule`; the ghost table inserted in `renderParts` around two sentinel comments the layout emits. `tests/emails/verify-email.test.tsx`'s pinned shape stays green unchanged.
5. **Text part** (finding 4): the `a.ss-wordmark` selector option in `renderParts`.
6. **Viewport meta** (finding 5) in `EmailLayout`'s `Head`; **button padding** 14px vertical (tap target).
7. Subjects, preview lines and the body-copy drafts wait for sign-off; then all three templates change here (`defineMessage` taking a subject function for the coven mail's name).

### C. Docs and board

- `claude-docs/email.md`: "Design" gains the 375px rule (each mail checked at phone width in both themes, in the workshop story and the review's screenshots), the overlap rule with its measured reason, the Outlook rules (fonts under `@media screen`, padding on cells, the ghost table, inline fonts on every text element), and the text-part rule for the wordmark; "Previewing" gains the Mailpit HTML Check as the first look and the client preview as the owner's part of a sign-off.
- `claude-docs/tasks/mb.md`, MB.118 entry: findings, decisions and the estimate (`· 6h`), then `node scripts/task-board.mjs sync MB.118` and `estimate MB.118 6`.
- Copy this plan to `claude-docs/design-decisions/mb.118-plan.md`, decisions appended at sign-off.
- Board comments (names, never values; no artifact URL): a progress comment naming the files touched, then "awaiting sign-off" listing what to look at per mail, light/dark/375, and the client preview. Status stays In Progress.

## Sign-off stop

After A–C: report to the owner with the artifact link and the screenshot directory, and stop. The owner's decisions per mail (light/dark/375, client preview, the preview lines, findings 8–10) are recorded as a comment on #575 by the owner or on their word. Then apply any decision, final verification, and the PR only when asked.

## Verification

- Red first for every new assertion (the text-part first-address check is the one that fails today).
- `npm run pre-commit` before each commit, in the worktree; commit at each green step.
- At task end: `flock /tmp/sorrel-vitest.lock npm run test:coverage` (80% threshold), `npm run test:stories` under the same lock, and a build into a non-dev dist (`NEXT_DIST_DIR=.next-check npm run build`), since `src/lib/auth.ts` imports the templates as server components and Vitest green is not build green.
- Re-measure the ornament worst pixel after the overlap change (scratchpad `contrast.mjs`) and re-shoot; both go in the artifact and the PR body.
- The workshop stories (`Emails / …`) still render both themes; the screenshots are the record. No e2e spec touches mail.

## Files

- `src/emails/parts/layout.tsx` — overlap, Outlook fixes, viewport meta, text-part selector, sentinels for the ghost table
- `tests/emails/theme.test.ts`, `tests/emails/parts/layout.test.tsx` — new
- `claude-docs/email.md`, `claude-docs/tasks/mb.md`, `claude-docs/design-decisions/mb.118-plan.md`
- `/app/.reports/mb.118-review/` — screenshots, Mailpit results, paste-ready HTML (gitignored)
- `src/emails/verify-email.tsx`, `src/emails/admin-invitation.tsx`, `src/emails/coven-invitation.tsx` — subjects, preview lines and body drafts, after sign-off only
- Not touched: `scripts/email-ornaments.ts` (finding 8, if minted)

## Decisions at sign-off (owner, 2026-10-12, from the review page)

- Verification mail, admin invitation, coven invitation: approved, light and dark, 375px and 600px.
- Client preview (Gmail, Outlook, Apple Mail): not done yet. Gmail on iPhone: not checked. Outlook.com button: not checked.
- Subjects: accept the drafts. Preview lines: accept the drafts. Closing sentences: accept without contractions. Expired-link sentence: add it.
- Names in the mail: build both here, not in separate tasks. Applied as the reader's name in the verification mail (a "Dear …," greeting when the account has a name) and the inviter's name opening both invitations, read from the acting user's row in the services.
