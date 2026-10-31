# Email — summary

What the site mails, how a message is built and styled, and how it is sent.
The decision record behind delivery and verification is
[`design-decisions/mb.61-email-verification-and-delivery.md`](design-decisions/mb.61-email-verification-and-delivery.md).

## Sending

`src/lib/mail.ts`'s `send({ to, subject, text, html })` is the one way the site
mails (MB.65). `MAIL_TRANSPORT` picks Resend in production, the Mailtrap Sandbox
in previews and Mailpit in compose and CI; unset, the message is logged and not
sent, which is what Vitest sees. A refused or failed send is logged and never
thrown. A recipient under `.invalid` is refused before any transport is chosen:
RFC 2606 reserves the domain, and it is where the placeholder for a provider
that shared no address lives (MB.54;
[`auth/admin-bootstrap.md`](auth/admin-bootstrap.md), "The email page"). The
variables and the per-environment guard are in [`secrets.md`](secrets.md); the
Mailpit container is in [`docker.md`](docker.md).

## Templates: React Email (MB.66)

A message is a React component in `src/emails/`, rendered twice by `render`
from `react-email` (which depends on `@react-email/render`, so there is still
one copy): once to HTML and once with
`{ plainText: true }` to the text part, by `renderParts` in
`src/emails/parts/layout.tsx`. Each template module exports the
component and a function returning a finished `Message`, built by
`defineMessage(subject, Template)` from the same file, so a caller never
renders anything itself:

```ts
await send(await verifyEmailMessage({ to, url, providers }));
```

- **Why React Email.** The site already writes JSX, and the package's
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
  text client shows is the action's, not the homepage (MB.118).
- **Where things go.** A template is a top-level `src/emails/<name>.tsx` with
  a sibling `<name>.stories.tsx`. The frame every mail shares is
  `src/emails/parts/layout.tsx`
  (`EmailLayout`, `Paragraph`, `Action`, `IgnoreNote`). Their types are in
  `parts/types.ts`, and the
  templates' in `src/emails/types.ts`, each extending `BaseEmailProps`: the
  link, the origin and the part. Not in `src/components/`: a mail is
  not a page component. Tests mirror the path, in `dom` since each is a
  `.tsx` (MB.97), and assert what a mail carries — its recipient, its link,
  the providers it names — never its wording or its look, which the stories
  show (MB.229).
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
  two forms it leaves alone** (MB.262). Measured on 2026-10-16 in Zoho Mail's
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
  their OFL licences beside them. Gmail loads no web fonts at all and falls
  back to Georgia and Arial.
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
- **Desktop Outlook reads Word's CSS, so three rules hold for it** (MB.118).
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
  [`design-decisions/mb.118-plan.md`](design-decisions/mb.118-plan.md).
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

## What is sent

| Template                                           | Sent by                                                                                                                  | Carries                                                                                                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/emails/verify-email.tsx`                      | Better Auth's `sendVerificationEmail`, at sign-up and on request                                                         | The one-hour `/verify-email` link, the providers linked to the account, and that it must be opened from a browser signed in to it; never the account's name, since a mistyped address would hand it to a stranger                      |
| `src/emails/email-change-notice.tsx`               | `src/lib/email-change-notice.ts`, from `setEmail` (`stage: 'requested'`) and `afterEmailVerification` (`'completed'`)    | The time (UTC) and the new address's domain, never the address; no link but the site's wordmark, and no name                                                                                                                           |
| `src/emails/verify-email.tsx`, `purpose: 'change'` | `src/lib/email-verification.ts`'s `requestChange`, from the email page's `setEmail`                                      | The same link with a change token, to the _new_ address, again with no name: its first sentence says an existing account asked for this address, since the reader did not sign up                                                      |
| `src/emails/admin-invitation.tsx`                  | `src/lib/invitation-mail.ts`'s `siteInvitation`, from `createAdminInvitation` (MB.70)                                    | The `/invite/[token]` link, the only place its token exists, to the invited address: the inviting admin's name, the site role it grants (M11.20), that the link lasts seven days, and to sign in with an account that uses the address |
| `src/emails/coven-invitation.tsx`                  | `src/lib/invitation-mail.ts`'s `workspaceInvitation`, from `createInvitation` (M7.3)                                     | The `/invite/[token]` link, the only place its token exists, to the invited address: the inviting owner's name, which coven and what role, that the link lasts seven days, and to sign in with an account that uses the address        |
| `src/emails/support-reply-notice.tsx`              | `replyToSupportRequest`, through `send()` in `src/lib/mail.ts`, by way of `supportNotifier` in `src/lib/support-mail.ts` | A short notice that a reply is waiting and the `/account/support` link; never the reply text (M15.1)                                                                                                                                   |

The verification flow itself is
[`auth/admin-bootstrap.md`](auth/admin-bootstrap.md), "First-party verification"
and "The email page". MB.70's admin invitation is
[`auth/admin-users.md`](auth/admin-users.md), "Inviting an admin"; M7.3's coven
invitation is [`db/invitations.md`](db/invitations.md), "Inviting into a coven".
