# SignInPanel

`src/components/SignInPanel/` — the `/sign-in` page's heading, OAuth buttons, email and password form,
error state and unavailable-provider treatment, on a card ground. Server component `src/app/sign-in/page.tsx`
reads `?next=`/`?error=` and the environment, and hands the results down as
props; this component does the rendering and the click.

A visitor who is already signed in never sees the panel. The page reads the session with `getSession()` and redirects on the server: to `?next=` when it passes `safeReturnPath()`, otherwise to `signedInLanding(session)` (the landing a sign-in uses). An account whose address is unverified goes to `emailPagePath(target)` instead, as `requireSession()` sends it. Tested in `tests/app/sign-in-page.test.tsx`.

## The `?next=` contract

`safeReturnPath()` and `signInErrorMessage()` (`src/lib/sign-in.ts`) turn the
page's raw `searchParams` into what this component actually needs: a
same-site path to send `signIn.social`'s `callbackURL` to, and a readable
sentence rather than a `?error=` code. Both are exported for **M2.7** to
reuse — the route-protection redirect writes the same `?next=` this page
reads, so the validation has to live in one place or the two can disagree
about what counts as safe.

The three state failures (`state_mismatch`, `state_not_found`,
`state_invalid`) share one sentence, and it tells the visitor to start again
from this page. The state is single-use and expires after ten minutes, so the
obvious retry, going back through the provider's tab, replays a state that is
already dead. That is how MB.12's Facebook check first failed.

`next` is absent when the page was given none, or an unsafe one: there is no
return path, and the callback lands the account by its role, `/admin` for an
admin and `/coven` for anyone else
([`auth/route-protection.md`](../auth/route-protection.md), "Route protection").
`socialSignInTarget(next)` (`src/lib/sign-in.ts`) builds what the click hands
`signIn.social`. With a `next`: it as `callbackURL`, and `errorCallbackURL` as
`` `/sign-in?next=${encodeURIComponent(next)}` `` — carrying `next` forward is
what keeps a failed attempt from losing the destination and landing back at a
bare `/sign-in`. With none: the `NO_RETURN_PATH` flag as `additionalData`, which
is how the callback tells it from an explicit `/coven`, a `callbackURL` of
`/coven` only because Better Auth requires one, and a bare `/sign-in` as
`errorCallbackURL`, so a retry still asks for none. Better Auth appends its own
`?error=<code>` or `&error=<code>` to whatever URL is given it.

## Provider branding

Each button carries `.btn` (`src/scss/_primitives.scss`) for its **shape** —
padding, radius, shadow, icon-and-label layout, focus ring, transition — the
one primitive every button in the app shares. **Colour is never `.btn`'s
here.** Each provider brings its own published colour and mark instead: a
white button with the multicolour "G" for Google, Discord's blurple with its
white mark, Facebook's blue with a white "f", and a white button with
Microsoft's four-colour square. A "Continue with X" button is recognised by
its brand's own look, and re-skinning it in the app's palette would make it
harder to recognise, not more on-brand.

**The colours come from one map**, `$brand-palettes` in
`src/scss/_variables.scss`, read through `brand-color($brand, $part)`
([`styling.md`](../styling.md), "Brand colours", which also has every
measured contrast). Each brand has a `fill` (the button's ground), an `ink`
(its label), a `hover` (the ground under the pointer or keyboard focus) and,
for the two white buttons, an `edge`: the outline that keeps a white button
visible on the light page, at 3:1 or more against it (WCAG 1.4.11, the
contrast a control's outline needs). An SVG's own fills inside a mark are
artwork, and stay in `icons.tsx`. Before MB.116 the hexes were written into
this stylesheet and copied into the admin user list's, and Google's edge,
`#dadce0`, measured 1.13:1 on the light page.

The stylesheet writes one rule per brand from the map, in a Sass `@each`
loop, through the `brand-button($brand)` mixin. Each rule is
`.sign-in-panel__button--<id>.btn` rather than the single class alone: `.btn`
and this component's own stylesheet are two separate compiled CSS files, and
nothing guarantees which one a bundler emits first, so a same-specificity
single-class rule could lose a property `.btn` also sets (its `border`
shorthand touches `border-color`, which every provider overrides) depending on
load order neither file controls. The extra class is what makes the colour
win regardless. For the same reason each hover rule restates the brand's
`ink`, since `.btn` changes its text colour on hover. The same compound rule
puts the edge back to 1px from `.btn`'s 1.6px: Google's and Microsoft's
guidelines draw their buttons with a 1px stroke, and the other two take it
too so the roster stays one height.

**The marks are `PROVIDER_MARKS`** (`icons.tsx`), one entry per provider id,
which this panel and the shared `ProviderMark` circle both read
([`provider-mark.md`](provider-mark.md)). The panel passes `chip`, so
Facebook's mark is the white "f" on its blue chip, which `icons.scss` colours
from the map; `icons.tsx` imports that stylesheet itself, so the mark brings
its chip wherever it is shown.

The icons are a close hand recreation of each provider's own published mark
(Google's identity branding guidelines; Discord's and Facebook's own
brand-resource downloads; Microsoft's identity platform guidelines), not an
exported pixel-perfect asset kit — swap in the provider's own SVG kit before
a pixel-perfect brand review matters.

The roster itself — id and label — is `src/lib/social-providers.ts`, imported
by both this component and `src/lib/auth.ts`. **Which env vars back a
provider's credentials is a separate, server-only module,**
`src/lib/social-providers-config.ts`: this component and its roster carry
nothing but id and label, and `.oxlintrc.json`'s `no-restricted-imports`
refuses the config module to any importer but `auth.ts` and a server
component. A client bundle should never carry the _names_ of the environment
variables behind a secret, even though it never sees their values — that was
a genuine bug caught in review before this shipped, not a hypothetical.

## Unavailable providers

A provider whose credentials are unset in this environment (`configured` from
`configuredProviders()`) still renders — every roster provider always has a
button — but greyed and described by a note through `aria-describedby`. The
note is the shared `ProviderUnavailableNote`
([`provider-mark.md`](provider-mark.md), "The unavailable note"), which the
account page's sign-in methods also show.

**The greying is `.btn[aria-disabled='true']`, a universal primitive**
(`src/scss/_primitives.scss`), not a sign-in-only style: any disabled button
in the app gets the same treatment. This button also **drops its brand
colour class entirely** while unavailable, rather than layering a disabled
modifier under it — the two would tie in specificity (each is exactly a
provider class, `.btn`, and a pseudo-class deep), and the winner would then
depend on which of the two separately-compiled stylesheets a bundler happens
to emit second, which is exactly the kind of thing "unavailable" cannot be
allowed to depend on. Facebook's icon chip is the one thing the disabled
state still has to reach past a missing brand class for — its own rule is
scoped off `.sign-in-panel__button[aria-disabled='true']` directly, since
`FacebookIcon` renders its chip regardless of the button's availability.

**Deliberately `aria-disabled`, not the `disabled` attribute.** `disabled`
removes an element from the tab order entirely, and "reachable by keyboard"
covers every provider in the roster, not only the configured ones — an
unavailable button still needs to be _found_, even though clicking it does
nothing. The press handler checks that the provider is available itself
rather than relying on the DOM attribute to stop it.

## Last used

The button for the provider this browser last signed in with carries a "Last
Used" badge hanging off its top-left corner. Its accessible name is the button's
own text, "Continue with Discord Last Used": a space sits before the badge, and
there is no `aria-label`, because a name that rewords the visible words (a comma
for a pause) fails axe's `label-content-name-mismatch` (WCAG 2.5.3). Only the marked
button carries one. The provider comes from the
`better-auth.last_used_login_method` cookie, which Better Auth's `lastLoginMethod` plugin sets on a callback that
signs the browser in (`auth/plugins.md`, "The last-used provider"). It exists so that
MB.71's `account_not_linked` sentence, "use the sign-in method you used
before", has an answer the server could not give without revealing that the
address has an account. No
cookie, or a value naming no roster provider, marks nothing. An unavailable
provider is still marked, because that is still what the browser used last.

The read is Better Auth's documented one, `authClient.getLastUsedLoginMethod()`
(`lastLoginMethodClient`, `src/lib/auth-client.ts`), wrapped in
`useSyncExternalStore` with a `null` server snapshot. **The wrapper is not
decoration.** This client component is still rendered on the server, which has
no `document`. Called inline, as the plugin's documentation shows, the read
returns `null` there and the provider id in the browser, so a returning
visitor's hydration would disagree with the server's HTML. With the server
snapshot, the server and the first hydrating render both render no mark, and
React re-renders with the cookie's value straight after. The mark arrives
just after hydration, not in the first HTML. The subscription is a no-op:
only a callback writes the cookie, and a callback is a navigation away.

The snapshot is not Better Auth's raw read but a roster id or `null`. React
reads a snapshot twice in one render and warns if the two reads differ. The raw
read gives `''` for a cookie that is present but empty and `null` for none, and
a cookie being expired can look like either, depending on the instant it is
read. None of those names a provider, so all of them must read the same: the
wrapper returns the roster provider whose id matches, else `null`. Strings
compare by value, so a real provider id is stable too.

## Busy

Each provider button is a `BusyButton` in its own `ProviderButton`
(`provider-button.tsx`). The one pressed goes busy ("Signing In", with the
spinner and `aria-busy`) and `aria-disabled`, not `disabled`, so the focus
stays on it for a failure's callout; its handler refuses a second press. The
others are `disabled` while it is, since a page being left has no use for
their tab stops. Once
`signIn.social` answers without an error the redirect has started, and the panel
calls `reportLeaving()` so the page bar stays up until the browser leaves; a
back-forward cache return (`pageshow` with `persisted`) clears the busy button.
A failure before the redirect frees every button and says so under the one
pressed ("Error state").

## Error state

Two sources, shown in two places:

- **The callback error**, rendered by the server from `?error=` and passed in
  as `error`, belongs to the page: it is the shared `Notice` as an error
  ([`notice.md`](notice.md)) above the buttons, with the `.notice--error`
  look every other page's error wears, its warning triangle, and
  `role="alert"`. It does not exist in the DOM absent a message, rather than
  sitting there as an empty live region, since a screen reader announces an
  alert only when it appears. A press starts a new attempt, so it clears the
  notice.
- **A failure before the redirect** — `signIn.social`'s own `{ error }`
  result, or a throw for a dropped connection — belongs to the button pressed:
  each `ProviderButton` has its own click feedback
  ([`click-feedback.md`](click-feedback.md)), so the sentence opens in a
  callout under that button with the focus kept on it, a badge on the button
  brings it back, and the button's description carries it. The badge is named
  "Show the error for Continue with <Provider>", without the last-used mark the
  button's own name may carry. The next press clears it.

A failure before the redirect always says `GENERIC_SIGN_IN_ERROR`
(`src/lib/sign-in.ts`), never `result.error.message` — that string is
provider- or Better-Auth-internal and unreviewed, the same reasoning
`signInErrorMessage()` applies to `error_description`.

## Two views

The card shows one of two views. The first holds the provider buttons and a "Continue with Email" button, and no text field. The second holds the email and password form, with a "Back" button above it that wears the ingredient page's back-link look (`.back-link` and `BackChevron`, from `IngredientEntry/back-link`) at `caption` size. "Continue with Email" adds a browser-history entry with `window.history.pushState`, marked in `history.state`, and Next ties the address to `useSearchParams`: the email view is `/sign-in?method=email`, the buttons are `/sign-in`, and `next` and `error` are carried along. The card's "Back" button calls `history.back()` when the form's entry carries that mark, so the browser's Back button does not land on the form again. When the form was opened directly (a link to `?method=email`, or a reload) there is no mark, and "Back" uses `history.replaceState` to the address without `method` instead of adding an entry. The panel holds the typed email address, so it is still there after a trip back and forth; the name and password are not kept.

When the view changes, focus moves to its heading: the `h1` of each view carries `tabIndex={-1}` and `data-view-heading`. Each `h1` also carries `.auth-title` (`_typography.scss`), the h1 set at the `h2` heading size so a long title fits the narrow card; the forgot-password and reset-password pages use the same class. The first render leaves focus alone. The two-factor code step is not a view of this kind and is unchanged.

## Email and password

`password-form.tsx` is the second view: "Sign In With Email",
with a quiet "Create an Account" button that switches the same form to
sign-up and back ("Sign In Instead"). Sign-up adds a Name field; both have
Email Address and a [`PasswordField`](password-field.md), `current` for
sign-in and `new`, with the strength meter, for sign-up. The wiring behind it
is [`auth/passwords.md`](../auth/passwords.md).

- **The submit is disabled until every field has something in it**, and is
  a `BusyButton` ("Signing In", "Creating Account") while the request is out.
  The form is `noValidate`, so every refusal is the server's.
- **Each refusal is said where it belongs.** A length or address code goes
  under its field; the breached-list refusal goes under the password with the
  server's own sentence, which says why. A 401 at sign-in is one sentence,
  `WRONG_CREDENTIALS`, the same for a wrong password and an unknown address.
  A 429 is `TOO_MANY_ATTEMPTS`; a 500 at sign-up, the breached-password check
  unable to answer, is `SIGN_UP_UNAVAILABLE`. Anything else is a generic
  sentence, never Better Auth's message. Alerts are the shared `Notice`.
- **A sign-up is signed in.** The form asks `getSession` and, with a session, does the same full load as a sign-in. With none the address was held, and one sentence says a mail was sent to it; the form is not reset. The result of every submit takes focus (`useResultFocus`).
- **A sign-in does a full load of `/sign-in?next=…`**, after
  `reportLeaving()`, and the page's own server redirect sends the account on
  (the top of this page), an unverified one to the email page first.
- **Forgot Password?** In sign-in mode, a link under the form goes
  to `/forgot-password` ([`forgot-password-form.md`](forgot-password-form.md)).
- **Last used.** `lastLoginMethod` writes `email` to the same cookie the
  provider buttons read, so the heading carries the "Last Used" badge when
  this browser last signed in with a password.
- **A submit clears the panel's callback error**, through `onStart`, as a
  provider press does.

`tests/components/SignInPanel/password-form.test.tsx` (which stands in for the address bar with `search-params.ts`) covers the two views, the disabled and busy submit, each refusal, the sign-up notice, the full load carrying `next`, the last-used mark, and that no password hint or security question exists; story 70 walks it in the browser.

## Styling

The page's `main` is the page frame, `.page-frame.page-frame--narrow`
([`styling.md`](../styling.md), "The page frame"), which centres the panel
and holds it clear of the top inset. The panel itself is a `.panel`, the card
ground (`_primitives.scss`), so the one thing on the page sits on a surface
of its own, as the owner chose in MB.116. It fills the frame's narrow column
(`$narrow-column`, 28rem) and pads itself a step more than the `.panel`
default at the sides and below, `space(6)`, keeping the default `space(5)`
above, since the card is the one thing on the page and the owner asked for
it bigger there at the sign-off. The rule is
`.sign-in-panel.panel`, compounded so it outranks the app's `body .panel`
([`styling.md`](../styling.md), "The page frame"). The
buttons sit `space(4)` apart, the room the last-used badge needs and no more. The panel is `border-box`, so the padding
stays inside the column.

Its children stretch to the column. The head is a `.header`, left-aligned like every `.auth-title` heading: the
`h1` and a `.lede` saying what the buttons are for, "Sign in, or create your
account, with one of these.", since the first sign-in is also how an account
is made. The buttons are one `max-content` grid column, centred, so every
button is as wide as the widest label. The panel itself is one column the width of the card's content, so the email and password form below fills it and is wider than the buttons. Gaps are `space(4)` between the head,
the notice and the buttons, and `space(1)` between a button and its
unavailable note.

The last-used badge is `.badge--last-used`, the solid accent palette
(`styling.md`, "Badge palettes"), so it looks like the ingredient card's Toxic
and Low stock badges. `.sign-in-panel__last-used` only places it: taken out of
the flow, its top 1.125rem above the button's top edge and 1.25rem out past
its left edge, so the marked button stays the size of the rest. Those two
offsets are the badge's geometry against the button's edge, so they are off
the spacing scale. The button is `position: relative` to hold it. It casts
`$shadow-floating`, the shadow `.btn` itself casts, which lifts it off the
brand fill it overlaps. The badge sets its own colours, so the brand fills and
their hover states never reach its label. The button column's gap is
`space(4)`, with `space(4)` above it, room for a badge that sits mostly above its
button, the first one's included.

Microsoft's button is white in both themes, with the `#808080` edge that
clears 3:1 on the light page (`styling.md`, "Brand colours"), the owner's call
in MB.116 over Microsoft's own dark button.

Tokens and functions beyond the brand map: `space()`, `$shadow-floating`
(the badge); the card, the error, the unavailable note and the greyed button
are the primitives' (`.panel`, `.notice--error`, `.meta`,
`.btn[aria-disabled='true']`).

## Stories

[`index.stories.tsx`](../../src/components/SignInPanel/index.stories.tsx) —
every story inside the page's own `main.page-frame.page-frame--narrow`, so the
workshop shows what the page shows:

- `States`, with a control that chooses Default (every provider configured), Last Used (Discord marked),
  With Error, and Some Unavailable (the shape most local dev actually sees:
  one pair in `.env.local`, the rest greyed out);
- `Pending` and `Failed`, each pressing Continue with Google as a
  person would: the first with the request held open by the workshop's server
  (`.storybook/vite.config.ts`), the second answered by the workshop's 404, so the
  failure's callout opens under the button.

The mark is read from the workshop's own cookie, which outlives the story that
wrote it, so every story sets or clears it before rendering. No test ids, no
snapshots.

## Testing

`tests/components/SignInPanel/index.test.tsx` mocks `signIn` from
`src/lib/auth-client.ts` — Better Auth's client performs the OAuth hop by
assigning `window.location.href`, which happy-dom cannot follow
(`tests/lib/auth-client.test.ts` stubs `fetch` instead and calls the real
client). The rest of the module is the real one, so the last-used read is the
client plugin's own, against happy-dom's `document.cookie`. Covers: every roster
provider offered by accessible name; a click calls
`signIn.social` with the right `provider`/`callbackURL`/`errorCallbackURL`,
with the `NO_RETURN_PATH` flag when there is no `next` and without it for an
explicit `/coven`;
no alert exists without an error and one appears with a passed-in error;
the pressed button goes busy and `aria-disabled` with the focus kept, the
others `disabled`, and a second press is refused; a failing or throwing
`signIn.social` opens one alert under the pressed button, keeps the focus
there, frees every button, describes the button, and Dismiss and the badge
close and reopen it; the badge is named without the last-used mark; the next
press clears the failure, and a press clears a passed-in error; an unavailable provider is `aria-disabled`,
described by its note, still lacks `disabled`, and its click never reaches
`signIn.social`; the cookie's provider, and only that one, is marked in its
accessible name, and no cookie or an unknown provider marks none; and
`renderToString` carries no mark while `hydrateRoot` adds it without a
recoverable error. That last test fails with the client read as the server
snapshot, since happy-dom has a `document` even under `renderToString`. Role and
label queries only.

Runs in the `dom` (happy-dom) Vitest project — `npm run test:coverage`. Real
keyboard reachability and the axe scans are asserted in Playwright, per
CLAUDE.md's "Accessibility is asserted in Playwright", once per provider
state — each state has a surface the other lacks, so neither scan stands in
for the other:

| Spec                                             | Server state                                | Covers                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/sign-in.spec.ts`                      | No provider configured (8001 and up)        | Every button `aria-disabled` and still reached by Tab; axe over the greyed page (the unavailable note's text, Facebook's transparent chip) and the error state; no sideways scroll at 375px. The last-used badge is the configured spec's and `tests/components/SignInPanel/index.test.tsx`'s     |
| `tests/e2e/sign-in-configured-providers.spec.ts` | All four configured, placeholder ids (8100) | Every button available with no note; axe over the brand colours at rest, then once per button while hovered — after asserting its background actually changed; and the last-used badge on a live button, once per theme, with no sideways scroll at 375px, where the badge hangs nearest the edge |

**The configured scan exists because the greyed one could not see the brand
colours**: an unavailable button drops its brand class, so a CI with no
credentials scanned a page on which `#1877f2` did not exist, and passed a 4.23:1
contrast failure three times. Reverting `#0866ff` to `#1877f2` fails the
configured project's resting scan and every hover scan but Facebook's own. Each
spec also asserts its own state before scanning, so a server that picked up the
wrong credentials fails rather than quietly scanning the other page. The
unconfigured state is every worker slot's own server, on 8001 and up; the
configured one is a server of its own on 8100, reading `sorrel_e2e_providers`,
which no spec reseeds. See [`testing/e2e.md`](../testing/e2e.md), "E2E —
Playwright", for how they are wired.

## Brand buttons against `.btn`

Every button in the roster carries `.btn` (`_primitives.scss`) for its shape: padding, radius, shadow, focus ring and transition. The panel's stylesheet states only where a provider's brand button differs from `.btn`'s defaults. The icon sits at the left edge instead of centred. The button fills its grid column instead of sizing to its content. The edge is the 1px stroke Google's and Microsoft's guidelines draw, rather than `.btn`'s 1.6px, and it is applied to all four buttons so the roster stays one height. A white button takes its brand's `edge`; one with none keeps the transparent edge.

Colour is never set in these shared rules. Each provider's published colours come from `$brand-palettes` (`_variables.scss`), not from the `$accent` and `$secondary` tokens, and `icons.tsx` names each mark's source. `.btn` changes its text colour on hover and focus to `$text-on-color`, which suits a plain outlined button. A brand button's text colour is part of the brand and stays fixed, so the hover and focus block restates its own `color`: an omitted `color` would tie with `.btn`'s in specificity and depend on stylesheet load order.

The overrides are compounded with `.btn` (`.sign-in-panel__button.btn`) for the same reason: they apply whichever stylesheet loads first.

## The panel's frame

The page around the panel is `.page-frame--narrow` (`src/app/sign-in/page.tsx`), which centres it and holds it clear of the top inset. The panel fills that narrow column on its own `.panel` ground with one step more padding than the default, using `border-box` so the padding stays inside the column. Children stretch to the column and the button grid centres its own. The selector is compounded with `.panel` because in the app the primitives compile as `body .panel`, which outranks a lone component class. A bare `.sign-in-panel` would keep the panel's default padding in the app while the workshop, whose primitives are scoped with `:where()`, showed the override.

## Disabled Facebook button

The disabled look is the universal `.btn[aria-disabled='true']` (`_primitives.scss`). Facebook adds one wrinkle: its mark is a white shape with the "f" as a hole in it (`icons.tsx`), so the hole shows whatever sits behind the chip. Dropping the chip's own blue while disabled lets the hole show the button's own greyed background instead of staying blue against a grey button. The rule is scoped off the button's `aria-disabled`, not a brand class: a disabled button carries no `--facebook` class (see the `className` comment in `provider-button.tsx`), but `FacebookIcon` still renders its chip.
