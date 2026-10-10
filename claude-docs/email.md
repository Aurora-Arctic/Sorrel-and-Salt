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
from `@react-email/components` (which re-exports `@react-email/render` at the
version it pins, so there is one copy): once to HTML and once with
`{ plainText: true }` to the text part, by `renderParts` in
`src/emails/parts/layout.tsx`. Each template module exports the
component and a function returning a finished `Message`, so a caller never
renders anything itself:

```ts
await send(await verifyEmailMessage({ to, url, providers }));
```

- **Why React Email.** The site already writes JSX, and the package's
  components emit the table-and-inline markup mail clients need, so a
  template reads like a component rather than a string of HTML. The cost is the dependency tree: the barrel
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
  that names the button branches on `part` itself. Headings keep their
  case in the text part, which the converter would otherwise capitalise.
- **Where things go.** A template is a top-level `src/emails/<name>.tsx` with
  a sibling `<name>.stories.tsx`, which `tests/guards/workshop-guards.test.ts`
  requires. The frame every mail shares is `src/emails/parts/layout.tsx`
  (`EmailLayout`, `Paragraph`, `Action`). Their types are in `parts/types.ts`, and the
  templates' in `src/emails/types.ts`. Not in `src/components/`: a mail is
  not a page component. Tests mirror the path: `theme.test.ts` in the `unit`
  project, `verify-email.test.tsx` in `dom`, since it is a `.tsx` (MB.97).
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
  Yahoo, AOL, Zoho, o2.pl, Seznam and Outlook.com each kept the text rules
  and dropped the page rule, leaving dark text on the dark page. `Body`
  carries `ss-body` and its own light rule for the surround, which is
  readable whichever way it goes. `tests/emails/verify-email.test.tsx` pins
  the shape.
- **The palette is copied, and checked.** A client reads neither Sass nor
  custom properties, so `src/emails/theme.ts` carries each theme's hexes by
  hand. `tests/emails/theme.test.ts` compiles the site's `theme-dark` and
  `theme-light` mixins and fails when a value there disagrees, so a palette
  change either reaches the mail or fails CI.
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
  `src/emails/ornaments.ts`. Re-run `node scripts/email-ornaments.ts` after changing a
  photograph or the palette; `tests/guards/email-ornaments.test.ts` compares
  the committed pixels with what the script produces and fails until you do.
  It allows each channel a step or two of rounding, because libvips takes a
  different SIMD path on x64 than on arm64 and the two round a few pixels
  apart, so an image built on either architecture passes on the other.
  Node runs that script with its own type stripping, so whatever `theme.ts` or
  `ornaments.ts` takes from `./types` must come in by `import type`, which it
  erases.
- **The text sits on the page, and the photographs run under it.** No card:
  the text is on the page colour, as on the site. The photographs are the
  backgrounds of two nested sections, top left and bottom right, and the
  text's padding lets each run `OVERLAP` pixels under it. Backgrounds, not
  images, because an overlap otherwise takes negative margins, which Gmail
  strips. Dark is the inline `background-image`; the light pair is the media
  query's. Desktop Outlook draws no CSS backgrounds, so there the mail has no
  photographs, and nothing else changes.
- **The wordmark** is "Sorrel & Salt" at the top right, small, in the
  heading face, linking to the site's origin: the one place the site is named,
  in the band beside the sorrel.
- **Assets are absolute and public.** A mail has no page to be relative to, so
  images and fonts are addressed from the origin of the link the mail
  carries: production's, staging's, or `localhost:8000` in compose, which is
  what Mailpit's viewer can reach. `/email/*` is on the proxy's public list,
  since a mail client fetches them with no cookie.
- **No design beyond this.** The site's design will change; the mail follows
  its tokens and photographs and adds no styling of its own beyond the frame.

## Previewing

Each template's stories render it in Ladle under `Emails / …`, through
`.ladle/EmailPreview.tsx`: the HTML part in an iframe and the text part
beneath, following the toolbar's theme control
([`workshop.md`](workshop.md), "Mail templates"). A real send lands in
Mailpit at `http://localhost:8025` under compose.

Neither is a rendering check. The Ladle iframe has a real `<body>`, and
Mailpit's HTML Check scores CSS feature support from caniemail data, so
neither can show what a client does to the document's structure; the
npm email linters are wrappers over that same data and cannot either. Before
merging a template change, paste the HTML into a rendered client preview
(unspam.email, or the Mailtrap Sandbox already used for staging previews)
from a mail whose asset origin is public, since a compose mail points at
`localhost` and no client can fetch its fonts or photographs. Render the mail
from the branch under test and check the pasted source carries its markup
(`<td class="ss-page"`) before reading the screenshots: a preview of a stale
render shows the previous fix's failure, not this one's result.

## What is sent

| Template                                           | Sent by                                                                               | Carries                                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/emails/verify-email.tsx`                      | Better Auth's `sendVerificationEmail`, at sign-up and on request                      | The one-hour `/verify-email` link, the providers linked to the account, and that it must be opened from a browser signed in to it                                                         |
| `src/emails/verify-email.tsx`, `purpose: 'change'` | `src/lib/email-verification.ts`'s `requestChange`, from the email page's `setEmail`   | The same link with a change token, to the _new_ address: its first sentence says an existing account asked for this address, since the reader did not sign up                             |
| `src/emails/admin-invitation.tsx`                  | `src/lib/invitation-mail.ts`'s `siteInvitation`, from `createAdminInvitation` (MB.70) | The `/invite/[token]` link, the only place its token exists, to the invited address: who invited it, that the link lasts seven days, and to sign in with an account that uses the address |

The verification flow itself is
[`auth/admin-bootstrap.md`](auth/admin-bootstrap.md), "First-party verification"
and "The email page". M7.3's invitation adds its template here; MB.70's admin invitation is
[`auth/admin-users.md`](auth/admin-users.md), "Inviting an admin".
