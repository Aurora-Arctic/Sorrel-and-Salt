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

`errorCallbackURL` is built here, not passed in, as `` `/sign-in?next=${encodeURIComponent(next)}` ``
— carrying `next` forward is what keeps a failed attempt from losing the
destination and landing back at a bare `/sign-in`. Better Auth appends its own
`&error=<code>` to whatever URL is given it.

## Provider branding

Each button carries `.btn` (`src/scss/_primitives.scss`) for its **shape** —
padding, radius, shadow, icon-and-label layout, focus ring, transition — the
one primitive every button in the app now shares. **Colour is never `.btn`'s
here.** Each provider brings its own published colour and mark instead — a
white/black-adaptive ground with the multicolour "G" for Google, Discord's
`#5865F2` blurple, Facebook's `#1877F2` blue, Microsoft's four-colour square
mark (`icons.tsx`) — because a "Continue with X" button is recognized by its
brand's own convention, and re-skinning it in the app's palette would make it
harder to recognize, not more on-brand. That is the one place in the app that
intentionally sets colours as hex literals instead of `$accent`/`$secondary`
tokens. Every colour rule is written `.sign-in-panel__button--<id>.btn`
rather than the single class alone: `.btn` and this component's own
stylesheet are two separate compiled CSS files, and nothing guarantees which
one a bundler emits first, so a same-specificity single-class rule could lose
a property `.btn` also sets (its `border` shorthand touches `border-color`,
which every provider overrides) depending on load order neither file
controls. The extra class is what makes the color win regardless.

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

Tokens and mixins beyond the per-brand button fills: `theme-transition()`,
`focus-ring()`, `reduced-motion`, `$text-muted` (the unavailable state),
`$secondary` and `$surface-card` (the error banner).

## Stories

[`index.stories.tsx`](../../src/components/SignInPanel/index.stories.tsx) —
`Default` (every provider configured), `WithError`, and `SomeUnavailable`
(the shape most local dev actually sees: one pair in `.env.local`, the rest
greyed out). Render-only, no test ids, no snapshots.

## Testing

`tests/components/SignInPanel/index.test.tsx` mocks `src/lib/auth-client.ts`
wholesale — Better Auth's client performs the OAuth hop by assigning
`window.location.href`, which jsdom cannot follow, so this is the one place
that module is faked rather than exercised for real (`tests/lib/auth-client.test.ts`
stubs `fetch` instead and calls the real client). Covers: every roster
provider renders as a native `<button>` by accessible name; a click calls
`signIn.social` with the right `provider`/`callbackURL`/`errorCallbackURL`;
no alert exists without an error and one appears with a passed-in error or a
failing `signIn.social` result; an unavailable provider is `aria-disabled`,
described by its note, still lacks `disabled`, and its click never reaches
`signIn.social`. Role and label queries only.

Runs in the `unit` (jsdom) Vitest project — `npm run test:coverage`. Real
keyboard reachability and the axe scan are asserted in `e2e/sign-in.spec.ts`,
per CLAUDE.md's "Accessibility is asserted in Playwright."
