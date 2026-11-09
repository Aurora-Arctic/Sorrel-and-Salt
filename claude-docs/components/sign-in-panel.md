# SignInPanel

`src/components/SignInPanel/` is the `/sign-in` page's card, and the body of the sign-in dialog that opens over a page ([`sign-in-dialog.md`](sign-in-dialog.md)). On the page, the server component `src/app/sign-in/page.tsx` reads `?next=`, `?error=` and the environment and hands the results down as props (`types.ts`); this component does the rendering and the click.

A visitor who is already signed in never sees the panel. The page redirects on the server: to `?next=` when it passes `safeReturnPath()`, otherwise to `signedInLanding(session)`. An account whose address is unverified goes to `emailPagePath(target)` instead, as `requireSession()` sends it (`tests/app/sign-in-page.test.tsx`).

## Contracts

**The `?next=` contract**

- `safeReturnPath()` and `signInErrorMessage()` (`src/lib/sign-in.ts`) turn the raw `searchParams` into a same-site path and a readable sentence in place of an `?error=` code. The route-protection redirect writes the same `?next=` this page reads, so the validation lives in one place and the two cannot disagree about what is safe. The header's Sign In link on the public pages ([`public-frame.md`](public-frame.md)) and an invitation's two choices write it too, through `SignInDialog`, which hands the same `next` to the panel in the dialog. A safe path starts with a single `/`, holds no backslash or line break, and is not `/sign-in`, `/forgot-password` or `/reset-password` (or anything beneath them), which would only show a form again.
- The three state failures (`state_mismatch`, `state_not_found`, `state_invalid`) share one sentence telling the visitor to start again from this page. The state is single-use and expires after ten minutes, so the obvious retry, going back through the provider's tab, replays a dead state.
- `next` is absent when the page was given none or an unsafe one. The callback then lands the account by its role: `/keepers` for a keeper, `/curator` for a curator, `/coven` for anyone else ([`auth/route-protection.md`](../auth/route-protection.md), "Route protection").
- With no `next`, `socialSignInTarget(next)` puts the `NO_RETURN_PATH` flag in `additionalData`, which is how the callback tells it from an explicit `/coven`. `callbackURL` is `/coven` only because Better Auth requires one, and a bare `/sign-in` is the `errorCallbackURL`, so a retry still asks for none. With a `next`, `errorCallbackURL` carries it, so a failed attempt keeps the destination. Better Auth appends its own `?error=<code>` to whatever URL it is given.

**Provider branding**

- Colour is never `.btn`'s here. Each provider brings its own published colour and mark, because a "Continue with X" button is recognised by its brand's look and re-skinning it makes it harder to recognise.
- The colours come from one map, `$brand-palettes` in `src/scss/_variables.scss`, read through `brand-color($brand, $part)` ([`styling.md`](../styling.md), "Brand colours", which has every measured contrast). The two white buttons carry an `edge` that keeps them visible on the light page at 3:1 or more (WCAG 1.4.11). Microsoft's button is white in both themes, with the `#808080` edge that clears 3:1 on the light page, not Microsoft's dark button. An SVG's own fills inside a mark are artwork and stay in `icons.tsx`.
- Each brand rule is compounded with `.btn` (`.sign-in-panel__button--<id>.btn`), as are the shape overrides. `.btn` and this stylesheet are two compiled files and nothing guarantees which a bundler emits first, so a same-specificity rule could lose a property `.btn` also sets (its `border` shorthand touches `border-color`). For the same reason each hover rule restates the brand's `ink`, since `.btn` changes its text colour on hover and focus.
- The edge is 1px, not `.btn`'s 1.6px, because Google's and Microsoft's guidelines draw their buttons with a 1px stroke, and all four take it so the roster stays one height.
- The marks are `PROVIDER_MARKS` (`icons.tsx`), read by this panel and by the shared `ProviderMark` circle ([`provider-mark.md`](provider-mark.md)). The panel passes `chip`, so Facebook's mark is the white "f" on a blue chip that `icons.scss` colours from the map; `icons.tsx` imports that stylesheet itself, so the mark brings its chip wherever it is shown. The icons are close hand recreations of each provider's published mark (Google's identity branding guidelines; Discord's and Facebook's brand-resource downloads; Microsoft's identity platform guidelines), not exported assets; swap in the provider's own SVG kit before a pixel-perfect brand review.
- The roster (id and label) is `src/lib/social-providers.ts`, imported by this component and `src/lib/auth.ts`. Which env vars back a credential is a separate server-only module, `src/lib/social-providers-config.ts`. `.oxlintrc.json`'s `no-restricted-imports` refuses it to any importer but `auth.ts` and a server component, because a client bundle must not carry the names of the environment variables behind a secret, even without their values.

**Unavailable providers**

- A provider whose credentials are unset here (`configured` from `configuredProviders()`) still renders, since every roster provider always has a button, but greyed and described by the shared `ProviderUnavailableNote` ([`provider-mark.md`](provider-mark.md), "The unavailable note"), which the account page's sign-in methods also show.
- The greying is `.btn[aria-disabled='true']`, a universal primitive (`_primitives.scss`). The button drops its brand colour class entirely while unavailable, because a disabled modifier under it would tie in specificity and the winner would depend on which stylesheet is emitted second.
- Facebook's mark is a white shape with the "f" as a hole, so the hole shows whatever sits behind the chip. The disabled rule drops the chip's blue so the hole shows the greyed button. It is scoped off `aria-disabled`, not a brand class, since a disabled button carries no `--facebook` class but `FacebookIcon` still renders its chip.
- It is `aria-disabled`, not `disabled`: `disabled` removes an element from the tab order, and every roster provider must be reachable by keyboard. The press handler checks availability itself and does not rely on the attribute.

**Last used**

- The marked button's accessible name is its text plus the badge, "Continue with Discord Last Used": a space before the badge and no `aria-label`, because a name that rewords the visible words fails axe's `label-content-name-mismatch` (WCAG 2.5.3).
- The provider comes from the `better-auth.last_used_login_method` cookie, which Better Auth's `lastLoginMethod` plugin sets on a callback that signs the browser in ([`auth/plugins.md`](../auth/plugins.md), "The last-used provider"). It gives MB.71's `account_not_linked` sentence, "use the sign-in method you used before", an answer the server could not give without revealing that the address has an account. No cookie, or a value naming no roster provider, marks nothing. An unavailable provider is still marked, because that is still what the browser used last. The password form's heading carries the badge when the cookie says `email`, and the passkey button when it says `passkey`.
- The read is `authClient.getLastUsedLoginMethod()` (`src/lib/auth-client.ts`) wrapped in `useSyncExternalStore` with a `null` server snapshot. This client component is also rendered on the server, which has no `document`; called inline, the read returns `null` there and the id in the browser, and a returning visitor's hydration would disagree with the server's HTML. With the server snapshot both the server and the first hydrating render show no mark, and React re-renders with the cookie straight after. The subscription is a no-op: only a callback writes the cookie, and a callback is a navigation away.
- The snapshot is a roster id or `null`, not the raw read. React reads a snapshot twice in a render and warns if they differ; the raw read gives `''` for a present-but-empty cookie and `null` for none, and an expiring cookie can look like either.

**Busy**

- The pressed provider button goes busy and `aria-disabled`, not `disabled`, so focus stays on it for a failure's callout. Every other control on the panel is `disabled` meanwhile, since a page being left has no use for their tab stops. The panel holds the one attempt under way, a provider's or the passkey's (`SignInAttempt`), so the same holds while the passkey prompt is open.
- Once `signIn.social` answers without an error the redirect has started, and the panel calls `reportLeaving()` so the page bar stays up until the browser leaves; a back-forward cache return (`pageshow` with `persisted`) clears the busy button. A failure before the redirect frees every button and says so under the one pressed. The password form's submit is on the email view, which shows none of these, so it holds only itself.

**Error state**

- The callback error, rendered by the server from `?error=` and passed in as `error`, belongs to the page: the shared `Notice` as an error ([`notice.md`](notice.md)) above the buttons. It is absent from the DOM without a message, since a screen reader announces an alert only when it appears. A press starts a new attempt and clears it.
- A failure before the redirect (`signIn.social`'s `{ error }`, or a throw for a dropped connection) belongs to the button pressed, through its own click feedback ([`click-feedback.md`](click-feedback.md)): a callout under that button with focus kept on it, and a badge that brings it back. The badge is named "Show the error for Continue with <Provider>", without the last-used mark. The next press clears it.
- That failure always says `GENERIC_SIGN_IN_ERROR` (`src/lib/sign-in.ts`), never `result.error.message`, which is provider- or Better-Auth-internal and unreviewed, as `signInErrorMessage()` treats `error_description`.

**Signing in or creating an account**

- The panel holds one mode, `sign-in` or `sign-up`, from the `mode` prop and reported through `onModeChange`. The switch under the buttons and under the email form is `ModeSwitch` (`mode-switch.tsx`): "New here? Create an Account" or "Already have an account? Sign In Instead", a quiet small button on its own line under the sentence (`.sign-in-panel__switch--mode`), on the page and in the dialog alike. The mode survives Back from the email form.
- On the page the head reads Sign In or Create an Account. Creating an account offers no passkey, since a passkey signs in to an account that already exists.

**In a dialog** (`inDialog`)

- The panel draws no head of its own: the dialog's title is the head, so the email form's heading is an `h3` (`PageHeader` `level`, [`page-header.md`](page-header.md)), as is the two-factor step's.
- The page beneath keeps its address, so Continue with Email opens the form in place, held in the panel's state, with no history entry and no `?method=email`. Back returns the focus to Continue with Email.
- `signUpLandsOnNext`: a new email account with a session loads `next` itself rather than `/sign-in?next=`, which would send an unverified account to the email page. The invitation sets it, so its own page says to check the inbox. A sign-in, a passkey and the two-factor step still go through `/sign-in?next=`.
- `onSignedUp`: given, a new email account with a session navigates nowhere and this is called instead. The dialog passes it when `signUpLandsOnNext` is unset, to show its inbox view ([`sign-in-dialog.md`](sign-in-dialog.md)).
- The class is a bare `.sign-in-panel`, with no `.panel`: the modal's box is the ground and its body the padding, so the panel keeps only its column.

**Two views**

- The first view holds the provider buttons and "Continue with Email", and no text field. The second holds the email and password form, with a "Back" button above it in the ingredient page's back-link look (`IngredientEntry/back-link`).
- On the page, "Continue with Email" adds a history entry with `window.history.pushState`, marked in `history.state`, and Next ties the address to `useSearchParams`: the email view is `/sign-in?method=email`, the buttons are `/sign-in`, and `next` and `error` are carried along. "Back" calls `history.back()` when the form's entry carries the mark, so the browser's Back does not land on the form again. A form opened directly (a link to `?method=email`, or a reload) has no mark, and "Back" uses `history.replaceState` to the address without `method`. The panel holds the typed email address across the trip; the name and password are not kept.
- On a view change focus moves to its heading (`tabIndex={-1}`, `data-view-heading`); the first render leaves focus alone. `.auth-title` (`_typography.scss`) is the h1 at the `h2` size so a long title fits the narrow card; the forgot-password and reset-password pages use the same class. The two-factor step shows alone, so its "Enter Your Code" is the page's `h1`, drawn by `PageHeader` with the same classes and no focus move.

**Email and password** (`password-form.tsx`; wiring in [`auth/passwords.md`](../auth/passwords.md))

- The switch turns the same form to sign-up and back. Sign-up adds a Name field; the [`PasswordField`](password-field.md) is `current` for sign-in and `new`, with the strength meter, for sign-up.
- The submit is disabled until every field has something in it. The form is `noValidate`, so every refusal is the server's.
- Each refusal is said where it belongs. A length or address code goes under its field; the breached-list refusal goes under the password with the server's own sentence. A 401 at sign-in is one sentence, `WRONG_CREDENTIALS`, the same for a wrong password and an unknown address. A 429 is `TOO_MANY_ATTEMPTS`; a 500 at sign-up, the breached-password check unable to answer, is `SIGN_UP_UNAVAILABLE`. Anything else is a generic sentence, never Better Auth's message.
- A sign-up asks `getSession`: with a session it does the same full load as a sign-in (or of `next`, under `signUpLandsOnNext`), and Better Auth's verification mail carries `next` as its `callbackURL`; with none the address was held, and one sentence says a mail was sent and the form is not reset. The result of every submit takes focus (`useResultFocus`).
- A sign-in does a full load of `/sign-in?next=…` after `reportLeaving()`, and the page's server redirect sends the account on, an unverified one to the email page first. A submit clears the panel's callback error through `onStart`, as a provider press does.

**Two-factor** ([`auth/two-factor.md`](../auth/two-factor.md))

- When the account has two-factor on, a right password does not sign in: the answer carries `twoFactorRedirect`, and the form clears the password and shows `two-factor-step.tsx` in its place. The step shows alone in the card and the Back button is hidden with the form.
- "Use a Backup Code" swaps the code field and its verify call (`twoFactor.verifyTotp`, `twoFactor.verifyBackupCode`). "Start Again" returns to the password.
- A wrong code is `WRONG_CODE` under the field. The plugin's lock is `CODE_LOCKED` in the alert region. An expired challenge, or one with too many codes, returns to the password with `CHALLENGE_EXPIRED` as the alert, since only a new password step starts a new challenge. Anything else is `GENERIC_CODE_ERROR`.
- Success leaves as a password sign-in does: `reportLeaving()`, then a full load of `/sign-in?next=…`.

**Passkey** (`passkey-button.tsx`; [`auth/plugins.md`](../auth/plugins.md), "Passkeys")

- "Sign In with a Passkey" is always offered, configured providers or not, because a passkey needs no provider. A cancelled prompt, a refused passkey or a dropped connection says `PASSKEY_SIGN_IN_ERROR` in a callout under the button and leaves the page where it was. A success leaves for `/sign-in` carrying `next` with a full navigation, so the server reads the new session cookie. `passkey-sign-in.ts` holds the error text and that navigation.
- The request starts only when someone presses the button. The panel makes no request as the page loads and offers no saved passkeys in the email field's autofill (WebAuthn conditional mediation), because an automatic request is obnoxious. The email field's `autocomplete` is `username` with no `webauthn` token.

## Styling

- The panel is `.sign-in-panel.panel`, compounded because in the app the primitives compile as `body .panel`, which outranks a lone component class. A bare `.sign-in-panel` would keep the default padding in the app while the workshop, whose primitives are scoped with `:where()`, showed the override. The page's `main` is `.page-frame.page-frame--narrow` ([`styling.md`](../styling.md), "The page frame").
- The buttons are one `max-content` grid column, so every button shrinks to fit then stretches to the widest, without measuring text in JS. The email and password form fills the card's content width, so it is wider than the buttons. On the code step alone nothing sets the column's width, so it takes the buttons' usual one, or the card's when that is narrower.
- The last-used badge is `.badge--last-used`, the solid accent palette ([`styling.md`](../styling.md), "Badge palettes"). `.sign-in-panel__last-used` only places it, out of the flow, so the marked button stays the size of the rest. The offsets are the badge's geometry against the button's edge, so they are off the spacing scale. The badge casts `$shadow-floating`, which lifts it off the brand fill it overlaps. The button column's gap and the space above it are `space(4)`, room for a badge that sits mostly above its button, the first one's included.

## Testing

Stories are in `src/components/SignInPanel/index.stories.tsx`, each inside the page's own `main`: `States` (Create an Account among them) and `Pending` and `Failed`, each pressing Continue with Google, the first with the request held open by the workshop's server (`.storybook/vite.config.ts`), the second answered by its 404. The mark is read from the workshop's own cookie, which outlives the story that wrote it, so every story sets or clears it before rendering.

Component tests are in `tests/components/SignInPanel/` (the `dom` project). `index.test.tsx` mocks `signIn` from `src/lib/auth-client.ts`, since Better Auth's client performs the OAuth hop by assigning `window.location.href`, which happy-dom cannot follow (`tests/lib/auth-client.test.ts` stubs `fetch` and calls the real client). The rest of the module is real, so the last-used read is the plugin's own against happy-dom's `document.cookie`. Its hydration test (`renderToString` carries no mark, `hydrateRoot` adds it without a recoverable error) fails with the client read as the server snapshot, since happy-dom has a `document` even under `renderToString`. `password-form.test.tsx` stands in for the address bar with `search-params.ts`; `in-dialog.test.tsx` covers the dialog variant. Stories 70 (password) and 75 (two-factor) walk the flows in the browser.

Keyboard reachability and the axe scans are asserted in Playwright, once per provider state, because each state has a surface the other lacks:

| Spec                                             | Server state                                | Covers                                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/sign-in.spec.ts`                      | No provider configured (8001 and up)        | Every button `aria-disabled` and still reached by Tab; axe over the greyed page and the error state; no sideways scroll at 375px                                                                                                                                                   |
| `tests/e2e/sign-in-configured-providers.spec.ts` | All four configured, placeholder ids (8100) | Every button available with no note; axe over the brand colours at rest, then once per button while hovered, after asserting its background changed; the last-used badge on a live button once per theme, with no sideways scroll at 375px, where the badge hangs nearest the edge |

The configured scan exists because the greyed one cannot see the brand colours: an unavailable button drops its brand class, so a CI with no credentials scanned a page on which `#1877f2` did not exist and passed a 4.23:1 contrast failure three times. Each spec asserts its own state before scanning, so a server with the wrong credentials fails rather than scanning the other page. The unconfigured state is every worker slot's own server, 8001 and up; the configured one is a server of its own on 8100, reading `sorrel_e2e_providers`, which no spec reseeds ([`testing/e2e.md`](../testing/e2e.md), "E2E — Playwright").

## Used by

`src/app/sign-in/page.tsx` and `SignInDialog` ([`sign-in-dialog.md`](sign-in-dialog.md)).

## Not here

Password and two-factor wiring are in [`auth/passwords.md`](../auth/passwords.md) and [`auth/two-factor.md`](../auth/two-factor.md). Route protection is in [`auth/route-protection.md`](../auth/route-protection.md).
