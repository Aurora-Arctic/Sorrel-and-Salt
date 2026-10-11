# SignInPanel

`src/components/SignInPanel/` — the `/sign-in` page's OAuth buttons, error
state and unavailable-provider treatment. Server component `src/app/sign-in/page.tsx`
reads `?next=`/`?error=` and the environment, and hands the results down as
props; this component does the rendering and the click.

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
one primitive every button in the app now shares. **Colour is never `.btn`'s
here.** Each provider brings its own published colour and mark instead — a
white/black-adaptive ground with the multicolour "G" for Google, Discord's
`#5865F2` blurple, Facebook's `#1877F2` blue, Microsoft's four-colour square
mark (`icons.tsx`) — because a "Continue with X" button is recognized by its
brand's own convention, and re-skinning it in the app's palette would make it
harder to recognize, not more on-brand. That and the admin user list's logos,
which borrow these marks on the same grounds ([`user-list.md`](user-list.md)),
are the places in the app that intentionally set colours as hex literals
instead of `$accent`/`$secondary` tokens. Facebook's backing chip is styled in
`icons.scss`, which `icons.tsx` imports itself, so the mark brings its circle
wherever it is shown. Every colour rule is written `.sign-in-panel__button--<id>.btn`
rather than the single class alone: `.btn` and this component's own
stylesheet are two separate compiled CSS files, and nothing guarantees which
one a bundler emits first, so a same-specificity single-class rule could lose
a property `.btn` also sets (its `border` shorthand touches `border-color`,
which every provider overrides) depending on load order neither file
controls. The extra class is what makes the color win regardless. The same
compound rule puts the edge back to 1px from `.btn`'s 1.6px: Google's and
Microsoft's guidelines draw their buttons with a 1px stroke, and the other
two take it too so the roster stays one height.

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
button — but greyed and described by a note through `aria-describedby`.

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
nothing. The click handler checks `configured.includes(providerId)` itself
rather than relying on the DOM attribute to stop it.

## Last used

The button for the provider this browser last signed in with carries a "Last
used" badge hanging off its top-left corner. Its accessible name is an
`aria-label`, "Continue with Discord, last used": the name built from the
button's text would run the label into the badge ("Discord Last used"), and the
comma gives a screen reader a pause without displaying anything. Only the marked
button carries one. The provider comes from the
`better-auth.last_used_login_method` cookie, which Better Auth's `lastLoginMethod` plugin sets on a callback that
signs the browser in (`auth/plugins.md`, "The last-used provider"). It exists so that
MB.71's `account_not_linked` sentence, "sign in that way", has an answer the
server could not give without revealing that the address has an account. No
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

## Error state

One `message` field covers both sources: the server-rendered callback error
(seeded from `props.error`) and a pre-redirect failure from `signIn.social`'s
own `{ error }` result (a bad request, a network error, before any redirect
happens) — the two never show at once, so there is no reason for two fields.
A pre-redirect failure always shows `GENERIC_SIGN_IN_ERROR`
(`src/lib/sign-in.ts`), never `result.error.message` — that string is
provider- or Better-Auth-internal and unreviewed, the same reasoning
`signInErrorMessage()` applies to `error_description`.

The alert is a `role="alert"` element that does not exist in the DOM absent a
message, rather than an empty live region — matching how a screen reader
announces role="alert" content only on it actually appearing.

## Styling

The last-used badge is `.badge--last-used`, the solid accent palette
(`styling.md`, "Badge palettes"), so it looks like the ingredient card's Toxic
and Low stock badges. `.sign-in-panel__last-used` only places it: taken out of
the flow, its top 1.125rem above the button's top edge and 1.25rem out past
its left edge, so the marked button stays the size of the rest. The button is
`position: relative` to hold it. It casts `$shadow-floating`, the shadow
`.btn` itself casts, which lifts it off the brand fill it overlaps. The badge
sets its own colours, so the brand fills and their hover states never reach its
label. The provider column's gap is 2rem, with 1rem above it, leaving room for a
badge that sits mostly above its button, the first one's included. Tokens and mixins beyond the per-brand button fills:
`theme-transition()`, `focus-ring()`, `reduced-motion`, `$shadow-floating`
(the badge), `$text-muted` (the unavailable state), `$secondary` and
`$surface-card` (the error banner).

## Stories

[`index.stories.tsx`](../../src/components/SignInPanel/index.stories.tsx) —
`Default` (every provider configured), `LastUsed` (Discord marked),
`WithError`, and `SomeUnavailable` (the shape most local dev actually sees:
one pair in `.env.local`, the rest greyed out). The mark is read from the
workshop's own cookie, which outlives the story that wrote it, so every story
sets or clears it before rendering. Render-only, no test ids, no snapshots.

## Testing

`tests/components/SignInPanel/index.test.tsx` mocks `signIn` from
`src/lib/auth-client.ts` — Better Auth's client performs the OAuth hop by
assigning `window.location.href`, which jsdom cannot follow
(`tests/lib/auth-client.test.ts` stubs `fetch` instead and calls the real
client). The rest of the module is the real one, so the last-used read is the
client plugin's own, against jsdom's `document.cookie`. Covers: every roster
provider offered by accessible name; a click calls
`signIn.social` with the right `provider`/`callbackURL`/`errorCallbackURL`,
with the `NO_RETURN_PATH` flag when there is no `next` and without it for an
explicit `/coven`;
no alert exists without an error and one appears with a passed-in error or a
failing `signIn.social` result; an unavailable provider is `aria-disabled`,
described by its note, still lacks `disabled`, and its click never reaches
`signIn.social`; the cookie's provider, and only that one, is marked in its
accessible name, and no cookie or an unknown provider marks none; and
`renderToString` carries no mark while `hydrateRoot` adds it without a
recoverable error. That last test fails with the client read as the server
snapshot, since jsdom has a `document` even under `renderToString`. Role and
label queries only.

Runs in the `dom` (jsdom) Vitest project — `npm run test:coverage`. Real
keyboard reachability and the axe scans are asserted in Playwright, per
CLAUDE.md's "Accessibility is asserted in Playwright", once per provider
state — each state has a surface the other lacks, so neither scan stands in
for the other:

| Spec                                             | Server state                                | Covers                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/sign-in.spec.ts`                      | No provider configured (8001 and up)        | Every button `aria-disabled` and still reached by Tab; axe over the greyed page (the `.sign-in-panel__note` text, Facebook's transparent chip) and the error state. The last-used badge is the configured spec's and `tests/components/SignInPanel/index.test.tsx`'s |
| `tests/e2e/sign-in-configured-providers.spec.ts` | All four configured, placeholder ids (8100) | Every button available with no note; axe over the brand colours at rest, then once per button while hovered — after asserting its background actually changed; and the last-used badge on a live button, once per theme                                              |

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
