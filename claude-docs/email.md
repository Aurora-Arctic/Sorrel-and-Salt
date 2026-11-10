# Email — summary

What the site mails, how a message is built and styled, and how it is sent.
The decision record behind delivery and verification is
[`auth.md`, "First-party email verification and email delivery"](design-decisions/auth.md#first-party-email-verification-and-email-delivery).

## Sending

`src/lib/mail-transport.ts`'s `deliver({ to, subject, text, html })` is the one
way a mail reaches a transport, called by a mail job's step or, for one
try in the request, by `send` in `src/lib/mail.ts`. `MAIL_TRANSPORT` picks Resend in production, the Mailtrap Sandbox
in previews and Mailpit in compose and CI; unset, the message is logged and not
sent. `send` never throws. A recipient under
`.invalid` is refused before any transport is chosen: RFC 2606 reserves the
domain, and it is where the placeholder for a provider that shared no address
lives (MB.54; [`auth/admin-bootstrap.md`](auth/admin-bootstrap.md), "The email
page"). The variables and the per-environment guard are in
[`secrets.md`](secrets.md); the Mailpit container is in [`docker.md`](docker.md).

**Retries.** Every mail that can be rebuilt from the rows goes through a durable
job, and the job's run argument holds ids and never the mail: no address,
subject, body, token or link. `startJob` (`src/lib/jobs/index.ts`) refuses any
other run argument before the run starts (`assertRunArguments` in
`src/lib/jobs/run-arguments.ts`): a string must be an id, a `kind` or `how` word,
a site origin or a return path, and nothing holding `@` passes. The job's step
reads the rows and renders the mail when it sends, then hands it to the
transport through `deliver` (`src/lib/mail-transport.ts`), which throws when the
transport answers with an error or cannot be reached, so the Workflow SDK
retries the step: the first try and three retries
([`support.md`, "The site has a durable job mechanism"](design-decisions/support.md#the-site-has-a-durable-job-mechanism)).
A mail that fails every attempt is logged ("every attempt failed") by ids alone.
A refusal (`.invalid`, a transport the environment may not use, a missing
variable) is logged once and not retried, since no retry would change it.
`startMailJob` (`src/lib/mail-job.ts`) starts each mail's job; while
`MAIL_TRANSPORT` is unset, or when the run cannot be started, it builds the mail
in the request with the step's own code and tries it once through `send`.

The mail jobs:

- `secretLinkMail` (`src/modules/identity/jobs/secret-link-mail.ts`): the
  sign-up and resend verification link, the password reset link, the lockout
  mail, the change-of-address link, and the admin and coven invitations. A
  verification or change link is signed afresh in the step with the secret
  Better Auth verifies with (`verificationSigningSecret`); a reset link carries
  the newest unexpired reset token Better Auth stored for the account; an
  invitation is given a fresh token by `rotateInvitationToken` on every
  attempt, so only the newest mailed link works
  ([`auth.md`, "The invitation mail mints its token in the job step"](design-decisions/auth.md#the-invitation-mail-mints-its-token-in-the-job-step)).
  A printed card is never mailed.
- `accountNoticeMail` (`src/modules/identity/jobs/account-notice-mail.ts`): the
  change-requested and change-completed notices, the account-exists mail and
  the password-changed notice, each by the account's id. The change-completed
  notice goes to `users.former_email`, which the swap filled, and its step
  clears that column once the transport took the mail or every attempt failed
  ([`auth/admin-bootstrap.md`](auth/admin-bootstrap.md), "The email page").
- `supportStatusMail` (`src/modules/support/jobs/support-status-mail.ts`): the
  support received and resolved mails, by the request's id. The step reads the
  sender's address from the request, or from the account that sent it, and
  sends no resolved mail for a request reopened since.
- The support closing-soon notice, sent by a batch run of the daily
  support-retention job (`src/modules/support/jobs/support-retention-batch.ts`),
  which Vercel Cron starts once a day; a refused notice fails the batch's step
  once the page's others are sent, so the retry sends only that one.
- A staff reply's mail, sent by the reply's own job.

**Every mail has a job.** `send` (`src/lib/mail.ts`), which delivers once and
never throws, is only what a job falls back to when `MAIL_TRANSPORT` is unset or
its run cannot be started. The record is
[`support.md`, "Mail is sent through a retried job"](design-decisions/support.md#mail-is-sent-through-a-retried-job).

**A "sent" marker.** A caller that records a mail as sent does it in its own job
step, after `deliver` returned true: the support closing-soon notice and its
`closing_notice_sent_at` (`src/modules/support/services/retention.ts`), and a
staff reply's mail and its `support_replies.notice_sent_at`
(`src/modules/support/services/reply-notice.ts`). No other mail has a marker.

**Tests.** A test that reads the mail its service built either mocks
`@/lib/mail`'s `send` with `MAIL_TRANSPORT` stubbed empty, so the mail is built
and tried once in the request, or mocks `@/lib/jobs`'s `startJob` and asserts
the run argument, then runs the step itself. Real retries are tested in the
`workflow` project (`tests/workflows/secret-link-mail.test.ts`,
`tests/workflows/invitation-mail.test.ts`,
`tests/workflows/support-status-mail.test.ts`,
`tests/workflows/support-retention.test.ts`).

## Templates: React Email

A message is a React component in `src/emails/`, rendered twice by `render`
from `react-email` (which depends on `@react-email/render`, so there is still
one copy): once to HTML and once with
`{ plainText: true }` to the text part, by `renderParts` in
`src/emails/parts/layout.ts`. Each template module exports the
component and a function returning a finished `Message`, built by
`defineMessage(subject, Template)` from the same file, so a caller never
renders anything itself:

```ts
await send(await verifyEmailMessage({ to, url, providers }));
```

- **Plain TypeScript, not JSX.** Every template and every part of the frame
  is a `.ts` file that builds its elements with React's `createElement`
  (imported as `h`). A durable job's step renders a mail when it runs, and the
  Workflow SDK's step bundler compiles TypeScript but leaves JSX as written, so
  a `.tsx` file reachable from a step stops every step in the bundle from
  loading. Only the stories, which no step reaches, are `.tsx`.
  `tests/emails/parts/layout.test.tsx` fails on a `.tsx` file anywhere else
  under `src/emails/`.

- **Why React Email.** The package's
  components emit the table-and-inline markup mail clients need, so a
  template reads like a component rather than a string of HTML. The cost is the
  dependency tree: the barrel
  pulls every component, Tailwind and a Markdown renderer.
- **Each part is written for its medium.** The two renders share one tree, so
  everything but the medium-specific wording stays in step, and a `part`
  prop tells a component which part it is in. A prop and never React
  context or state: `src/lib/auth.ts` imports the templates, so Next compiles
  them as server components, where `createContext` does not exist, and
  `next build` fails on it. The HTML has a button and the link
  written out beneath it, for a client that hides buttons; the text part has
  the link once and says "open the link below", with no button to click and
  nothing to copy twice. `Action` does this for every template; a sentence
  that names the button takes its words from `actionVerb(part)`, "click the
  button below" or "open the link below". Every mail closes on `IgnoreNote`,
  "…, you can ignore this email.", in the template's own words for who did
  not ask for it. Headings keep their case in the text part, which the converter
  would otherwise capitalise. The wordmark's link is dropped from the text part
  (`ignoreHref` on `a.ss-wordmark` in `renderParts`), so the first address a
  text client shows is the action's, not the homepage.
- **Where things go.** A template is a top-level `src/emails/<name>.ts` with
  a sibling `<name>.stories.tsx`. The frame every mail shares is
  `src/emails/parts/layout.ts`
  (`EmailLayout`, `Paragraph`, `Action`, `IgnoreNote`). Their types are in
  `parts/types.ts`, and the
  templates' in `src/emails/types.ts`, each extending `BaseEmailProps`: the
  link, the origin and the part. Not in `src/components/`: a mail is
  not a page component. Tests mirror the path, in `dom` since each is a
  `.tsx`, and assert what a mail carries — its recipient, its link,
  the providers it names — never its wording or its look, which the stories
  show.
- **Plain words.** A mail is read by anyone who signed in, often on a phone:
  short sentences, everyday vocabulary, and one thing to do.

## Design

A mail looks like the site: its palette, its type and its two corner
photographs, in both themes. Mail clients support little of how the site
does it, so each piece has an email-safe stand-in.

- **Dark by default, light on request.** Dark is written inline, since the
  clients that ignore `prefers-color-scheme` (Gmail above all) also ignore
  most of `<style>`. Light is the override in the one
  `@media (prefers-color-scheme: light)` block (`LIGHT_MEDIA`), with
  `!important` to beat the inline dark, for the clients that honour it —
  Apple Mail, iOS Mail, Outlook for Mac, Thunderbird. The `color-scheme` meta
  tells Apple Mail the mail brings its own dark, so it does not invert it.
  Classes are `ss-`-prefixed. **Every light rule hangs off one cell.** The
  page colour sits on a `<td>` the layout renders itself, the one element
  with the class `ss-page`, and every other light rule is scoped beneath it
  (`.ss-page .ss-text`, `.ss-page .ss-button`, …), so a client applies all
  of them or none. Written as a bare class per element, iOS Mail, iCloud,
  Yahoo, AOL, o2.pl, Seznam and Outlook.com each kept the text rules and
  dropped the page rule, leaving dark text on the dark page. (A preview tool
  put Zoho Mail on that list too; measured, it reads no stylesheet at all —
  the next point.) `Body` carries `ss-body` and its own light rule for the
  surround, which is readable whichever way it goes.
  `tests/emails/verify-email.test.tsx` pins the shape.
- **Zoho Mail inverts every colour it can see, so the dark is written in the
  two forms it leaves alone**. Measured on 2026-10-16 in Zoho Mail's
  web client, by reading the DOM it builds from four probe mails; the Android
  app shows the same result. In its Night mode Zoho drops `<style>` whole, and
  in its Day mode it keeps plain rules but drops every `@media` block, so the
  light override reaches it in neither. Night then rewrites every inline
  `color` and `background-color` to an inverted `!important` value, keeping
  the original in a `data-ogsc` or `data-ogsb` attribute; writes a default
  dark text colour onto every element that has none; strips
  `-webkit-text-fill-color`; reads neither `hsl()` nor `rgba()`; and darkens a
  hex colour continuously, so no lightness is safe. It expands a `background`
  shorthand into longhands and inverts the colour, but **keeps a gradient or
  `background-image`**, and it leaves an `<a>` whose background is an image of
  any kind — a page-coloured gradient, a transparent one or a `url()`, with or
  without an `href` — entirely alone, text and all, while still rewriting any
  element nested inside it. So the frame writes its dark the way Zoho reads
  it, and the regression test in `tests/emails/parts/layout.test.tsx` holds
  every mail to the shape:
  - The body and the page cell are painted by
    `background: <colour> linear-gradient(<colour>,<colour>)`: the gradient is
    what Zoho keeps, the colour before it is for Word, which draws no gradient.
  - Every heading and paragraph's text sits directly inside an anchor (`Ink`
    in the layout), with the text colour on the anchor and a transparent
    gradient as its background, and nothing nested inside it. An anchor cannot
    hold an anchor, so a paragraph with a link in it is `Action`'s.
  - The button is an anchor of our own painted by a gradient alone, not React
    Email's `Button`, whose label sits in a nested span Zoho would recolour.
    Its cell carries `bgcolor` for Word; everywhere else the anchor covers it.
  - The light block overrides with the `background` shorthand, which also
    clears the gradient, so a client that honours the media query still goes
    light. Gmail Android renders the gradient-only shorthand as before; an
    inline `background-image` on its own it mangles ([email-bugs
    #135](https://github.com/hteumeuleu/email-bugs/issues/135)), which is why
    the gradient is always written through the shorthand.
    The one-colour gradient is an established dark-mode technique (Rémi
    Parmentier's email-bugs and talks); the anchor is Zoho's own exception.

  The result is that Zoho shows the dark theme in both of its modes, as Gmail
  does: with the stylesheet gone there is no light theme for it to show. The
  probe mails and DOM dumps are not committed; the measurements above are the
  record.

- **The palette is copied.** A client reads neither Sass nor custom
  properties, so `src/emails/theme.ts` carries each theme's hexes by hand,
  and a palette change edits it in the same PR. No test compares the two: a
  mail's colours are presentation, which the stories show
  ([`testing/layer-ownership.md`](testing/layer-ownership.md), "What a test
  may assert").
- **Type.** Headings are Cormorant Unicase 700 and body Lexend, as on the site,
  from `@font-face` rules that list **our own copy first and Google's second**:
  a client asks Google only when our file fails to load. The files are the
  latin subsets Google serves, committed under `public/email/fonts/` with
  their OFL licences beside them. Gmail loads no web fonts, whether from
  `@font-face` or Google Fonts, so it shows the first installed font after the
  brand font. Body falls back to Verdana, Tahoma and Segoe UI, Verdana being the
  closest installed font to Lexend in width and openness. Headings fall back to
  Garamond, Palatino Linotype, Palatino, Book Antiqua and Georgia, Garamond and
  Palatino being the closest installed fonts to Cormorant, a Garamond design. The
  site uses the same lists (`$font-body` and `$font-heading` in
  `_variables.scss`), and `tests/scss/font-stacks.test.ts` holds them together.
- **The corner photographs are pre-blended.** The site blends Backdrop's grey
  photographs into the page with `mix-blend-mode`, which no mail client
  supports, from WebP, which not all of them show. `scripts/email-ornaments.ts`
  does the blend ahead of time with `sharp`, using each theme's page colour,
  blend and opacity from `theme.ts`, and writes an opaque PNG per corner per
  theme into `public/email/images/` at twice the display size in
  `src/emails/ornaments.ts`. Re-run `node scripts/email-ornaments.ts` after
  changing a
  photograph or the palette, and commit what it writes. Two architectures'
  output differs by a step or two of rounding per channel, because libvips
  takes a different SIMD path on x64 than on arm64.
  Node runs that script with its own type stripping, so whatever `theme.ts` or
  `ornaments.ts` takes from `./types` must come in by `import type`, which it
  erases.
- **The text sits on the page; the sorrel runs under the heading and the salt
  meets the text's edge.** No card: the text is on the page colour, as on the
  site. The photographs are the backgrounds of two nested sections, top left and
  bottom right. Backgrounds, not images, because an overlap otherwise takes
  negative margins, which Gmail strips. The sorrel runs `OVERLAP` pixels under
  the heading, which is the only text that meets it: 32px bold holds 4.78:1 over
  the light sorrel's darkest pixel. The salt sits beneath the text block,
  overlapping only the last paragraph's margin, because MB.118 measured the
  light salt's darkest pixel at 2.14:1 under the muted ink and 1.66:1 under the
  link, and no opacity fixes the link (the page itself is 4.65:1 against it).
  The dark pair passes everywhere. Dark is the inline `background-image`; the
  light pair is the media query's. Desktop Outlook draws no CSS backgrounds, so
  there the mail has no photographs, and nothing else changes.
- **The wordmark** is "Sorrel & Salt" at the top right, small, in the
  heading face, linking to the site's origin: the one place the site is named,
  in the band beside the sorrel.
- **Desktop Outlook reads Word's CSS, so three rules hold for it**.
  The `@font-face` rules sit under `@media screen`: Word skips the block, so it
  never meets an uninstalled first face, which would send it to Times New Roman
  rather than the next font in the stack. Every text element carries its
  `font-family` inline, because Word does not inherit it into nested tables.
  Padding goes on a `<td>`, never a table or a section, because Word honours it
  only on cells; and a conditional-comment ghost table of 600px wraps the
  container, because Word ignores `max-width`. React cannot write a comment, so
  the layout renders two sentinel spans that `renderParts` swaps for the
  comments in the HTML part. Line heights are pixels with `mso-line-height-rule:
exactly`, which Word applies as written.
- **Checked at 375px, in both themes.** A mail is read on a phone more often
  than not, so every review signs off each template at phone width as well as
  desktop, dark and light: in the workshop story and in the review's
  screenshots, with the 375px render scrolling nowhere sideways, every text
  pairing at 4.5:1 (including over a photograph) and the button at least 44px
  tall. The viewport meta is there because a browser without one lays a phone
  out at 980px, and the button's padding is 14px for the tap target.
- **The copy follows published guidance** for transactional mail, read during
  MB.118: a subject of fifty characters or fewer with the important words first
  (Postmark, Litmus); a preview line of 40 to 90 characters that adds to the
  subject rather than repeating it; the first sentence says why the reader got
  the mail, the next what to do and by when; the address spelled out in full
  under the button (GOV.UK service manual); the button a verb; no negative
  contractions, which some readers misread as their opposite (GOV.UK style
  guide); and "email address" for the address, "email" for the message. The
  sources are listed in
  [`ui.md`, "Mail design review sign-off"](design-decisions/ui.md#mail-design-review-sign-off).
- **Assets are absolute and public.** A mail has no page to be relative to, so
  images and fonts are addressed from the origin of the link the mail
  carries: production's, staging's, or `localhost:8000` in compose, which is
  what Mailpit's viewer can reach. `/email/*` is on the proxy's public list,
  since a mail client fetches them with no cookie.
- **No design beyond this.** The site's design will change; the mail follows
  its tokens and photographs and adds no styling of its own beyond the frame.

## Previewing

Each template's stories render it in Storybook under `Emails / …`, through
`.storybook/EmailPreview.tsx`: the HTML part in an iframe and the text part
beneath, following the toolbar's theme control
([`workshop.md`](workshop.md), "Mail templates"). With the control on dark, a
story shows what Gmail, and any client that ignores the reader's setting,
shows. A real send lands in
Mailpit at `http://localhost:8025` under compose.

Neither is a rendering check. The Storybook iframe has a real `<body>`, and
Mailpit's HTML Check scores CSS feature support from caniemail data, so neither
can show what a client does to the document's structure; the npm email linters
are wrappers over that same data and cannot either. Mailpit's check is the first
look all the same: `POST /api/v1/send` the rendered parts and read
`/api/v1/message/<id>/html-check` for the features Gmail, Outlook and Apple Mail
drop. Before merging a template change, paste the HTML into a rendered client
preview (unspam.email, or the Mailtrap Sandbox already used for staging
previews) from a mail whose asset origin is public, since a compose mail points
at `localhost` and no client can fetch its fonts or photographs. Render the mail
from the branch under test and check the pasted source carries its markup (`<td
class="ss-page"`) before reading the screenshots: a preview of a stale render
shows the previous fix's failure, not this one's result. In a design review that
preview is the owner's part of the sign-off: the devcontainer has no browser of
its own and no client account, so the review hands over paste-ready renders and
the owner reads them in the clients.

Every Storybook email story is render-only with an invented link; images and fonts come from the workshop, which serves public/. Stories hand the preview a module-level message function so it is the same every render, and the preview follows the toolbar's theme control as a mail follows a reader's setting

## What is sent

| Template                                          | Sent by                                                                                                                                                                                                                                                                                                                             | Carries                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/emails/verify-email.ts`                      | Better Auth's `sendVerificationEmail`, at sign-up and on request                                                                                                                                                                                                                                                                    | The one-hour `/verify-email` link, the providers linked to the account, and that it must be opened from a browser signed in to it; never the account's name, since a mistyped address would hand it to a stranger                                                                                    |
| `src/emails/email-change-notice.ts`               | `src/lib/email-change-notice.ts`, through the account-notice job, from `setEmail` (`stage: 'requested'`) and `afterEmailVerification` (`'completed'`, to `users.former_email`)                                                                                                                                                      | The time (UTC) and the new address's domain, never the address; no link but the site's wordmark, and no name                                                                                                                                                                                         |
| `src/emails/verify-email.ts`, `purpose: 'change'` | `src/lib/email-verification.ts`'s `requestChange`, from the email page's `setEmail`                                                                                                                                                                                                                                                 | The same link with a change token, to the _new_ address, again with no name: its first sentence says an existing account asked for this address, since the reader did not sign up                                                                                                                    |
| `src/emails/account-exists.ts`                    | `src/lib/auth.ts`'s `mailExistingHolder`, the `before` hook's `answerHeldSignUp`, at a password sign-up to an address that already has an account, through `scheduleAccountNotice` (`kind: 'account-exists'`) and the `accountNoticeMail` job, whose step renders it with `accountExistsNotice` in `src/lib/account-notice-mail.ts` | That someone tried to make an account with the address and none was made, a link to `/sign-in`, and how the account signs in (its password, its linked providers, or both); never a name, since whoever made the sign-up need not be the holder                                                      |
| `src/emails/reset-password.ts`                    | `src/lib/auth.ts`'s `mailResetLink`, Better Auth's `sendResetPassword`, from `/forgot-password`, to a verified address only                                                                                                                                                                                                         | The single-use `/reset-password` link that lasts 15 minutes, that a new password signs the account out everywhere, and that a reader who did not ask can ignore it; never a name, since anyone can ask for it for any address                                                                        |
| `src/emails/password-changed.ts`                  | `scheduleAccountNotice` (`kind: 'password-changed'`), after a reset (`onPasswordReset`), a change (the `/change-password` after hook) or a first password set (`passwordSetter`), sent by the `accountNoticeMail` job, whose step renders it with `passwordChangedNotice` in `src/lib/account-notice-mail.ts`                       | That the password was reset, changed or added, which sessions were signed out, and a link to `/forgot-password` for a holder who made no change                                                                                                                                                      |
| `src/emails/admin-invitation.ts`                  | `createAdminInvitation`, through `invitationSender` in `src/lib/invitation-mail.ts` and the `secretLinkMail` job (`kind: 'invitation'`), whose step mints the token with `rotateInvitationToken` and renders it with `invitationLinkMessage` in `src/lib/invitation-link-mail.ts`                                                   | The `/invite/[token]?for=site` link, the only place its token exists, to the invited address: the inviting admin's name, the site role it grants (M11.20), that the link lasts seven days, and to sign in with an account that uses the address                                                      |
| `src/emails/coven-invitation.ts`                  | `createInvitation` (M7.3), the same way as the admin invitation                                                                                                                                                                                                                                                                     | The `/invite/[token]` link, the only place its token exists, to the invited address: the inviting owner's name, which coven and what role, that the link lasts seven days, and to sign in with an account that uses the address                                                                      |
| `src/emails/support-reply-notice.ts`              | `replyToSupportRequest`, through the reply's own job (`src/modules/support/jobs/support-reply-notice.ts`), whose step renders it from the rows with `supportReplyMessage` in `src/lib/support-job-mail.ts` and sets `support_replies.notice_sent_at`; the signed-out sender's `support-email-reply.ts` goes the same way            | A short notice that names the request (subject and heading read "Reply to your support request: <subject>", the subject cut at 80 characters) and a link that opens that request (`/account/support?request=<id>`); never the reply text (M15.1)                                                     |
| `src/emails/support-received.ts`                  | `sendSupportRequest` and `sendSignedOutSupportRequest`, once the request is saved, through the `supportStatusMail` job (`kind: 'received'`), whose step renders it from the request with `supportStatusMessage` in `src/lib/support-job-mail.ts`                                                                                    | That the request arrived and will be answered within 5 working days, naming it (subject cut at 80 characters). A signed-in sender’s link opens the request (`/account/support?request=<id>`); a signed-out sender’s goes to `/support`, which needs no account. Never what the sender wrote (M15.45) |
| `src/emails/support-resolved.ts`                  | `resolveSupportRequest`, once the move is saved, through the `supportStatusMail` job (`kind: 'resolved'`), which sends nothing if the request is no longer resolved when the step runs                                                                                                                                              | That the request is resolved, naming it. A signed-in sender is told a reply from them reopens it and that it closes by itself after seven days; a signed-out sender, who cannot reply to the request, is told to write again at `/support`. Never the thread or an internal note (M15.45)            |
| `src/emails/support-closing-soon.ts`              | The daily support-retention job's batch (`src/modules/support/jobs/support-retention-batch.ts`), on day five or six of a resolved request, rendered by `supportClosingNoticeMessage` in `src/lib/support-job-mail.ts` and sent by the batch's step, from the row as it stands then, which sets `closing_notice_sent_at`             | How long is left until the resolved request closes, worked out when it sends, naming it, with the same links as the resolved mail. A signed-in sender is told a reply keeps it open (M15.45)                                                                                                         |
| `src/emails/support-email-reply.ts`               | The signed-out sender's reply notice: `supportEmailReplyMessage` in `src/lib/support-job-mail.ts`, through the `support-reply-notice` job, when staff reply to a request a signed-out visitor sent                                                                                                                                  | A short notice that names the request and a "Read the Reply" link to its page carrying a view token; only the newest mailed link works, and it carries none of the reply text                                                                                                                        |
| `src/emails/access-paused.ts`                     | The `accessPauseMail` job (`src/modules/identity/jobs/access-pause-mail.ts`), started after commit by `pauseUserAccess` when a keeper pauses site access; lifting a pause sends nothing                                                                                                                                             | When the pause ends and the message the keeper wrote, never the keeper's note, and a link to the support page                                                                                                                                                                                        |
| `src/emails/coven-access-paused.ts`               | `sendMemberPauseMail` in `src/modules/coven/services/member-pause-mail.ts` and the job `src/modules/coven/jobs/member-pause-mail.ts`, built by `memberPauseNotice` in `src/lib/pause-job-mail.ts`, when a steward pauses a member                                                                                                   | That the member's access to the named coven is paused, with the end and message, never the steward's note                                                                                                                                                                                            |
| `src/emails/support-timed-out.ts`                 | `sendSupportTimeoutMail` in `src/modules/support/services/timeout-mail.ts` and the `support-timeout-mail` job, built by `supportTimeoutNotice`, when a keeper sets a support time-out; an address-only time-out sends nothing                                                                                                       | That the account was timed out of support, and until when                                                                                                                                                                                                                                            |
| `src/emails/document-updated.ts`                  | The `documentMailing` job, built by `documentUpdateNotice` in `src/lib/document-mail.ts`, when a keeper mails changed documents; recipients come from `findDocumentMailingAccountPage` (verified, not `.invalid`, not a stand-in account, with no pause filter)                                                                     | The documents that changed (never About Us), a summary of each change and a link to each, and that the account will be asked to agree                                                                                                                                                                |
| `src/emails/password-locked.ts`                   | `lockNoticeMessage` in `src/lib/secret-link-mail.ts`, when failed passwords start a lock (see [`auth/passwords.md`](auth/passwords.md))                                                                                                                                                                                             | The lock length, a 15-minute reset link and the account's other ways to sign in                                                                                                                                                                                                                      |

The verification flow itself is
[`auth/admin-bootstrap.md`](auth/admin-bootstrap.md), "First-party verification"
and "The email page". MB.70's admin invitation is
[`auth/admin-users.md`](auth/admin-users.md), "Inviting a keeper"; M7.3's coven
invitation is [`db/invitations.md`](db/invitations.md), "Inviting into a coven".

**No promotional mail is sent.** Every mail above is transactional, so none needs consent. The scoping for the first promotional mail is in [`email/promotional-consent.md`](email/promotional-consent.md).

### Design and Pictures

email-ornaments and invitation-card-images: each ornament is a Backdrop grey photograph blended onto a theme's page colour at the site's blend and opacity, flattened to opaque PNG; re-run after changing a photograph or the palette. Card pictures fade edges through alpha: 0 to 1 over the top 20% and the outer 14% of each side, the ramps multiplied like the canvas's intersected linear gradients.
