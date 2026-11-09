# SignInDialog

`src/components/SignInDialog/` is a link to sign in that opens the sign-in panel in a dialog over the page it is on, so a visitor signs in or creates an account without leaving the page. The public bar's Sign In ([`public-frame.md`](public-frame.md)) and a signed-out invitation's two choices, Create Account and Sign In ([`invitation-acceptance.md`](invitation-acceptance.md)), are its users. Props: `SignInDialogProps` in `types.ts`. `/sign-in` stays a page of its own, for shared links and for a browser without the script.

## Contracts

- **It is a link first.** The trigger is a `PendingLink` to `signInPath(next)`, so a modifier or middle click (`opensElsewhere`) and a browser without the script follow the address to `/sign-in`. A plain press is prevented and opens the dialog instead; nothing navigates and the page's address stays as it was.
- **One return path, made safe once.** `next` passes through `safeReturnPath`, and the link and the panel in the dialog both use what comes out. From an auth page that is nothing, so the link is a bare `/sign-in` and a provider is asked for no return path: the account lands by its role ([`sign-in-panel.md`](sign-in-panel.md), "The `?next=` contract"). The bar never draws on an auth page, so in practice this is a guard.
- **The dialog is `Modal`** ([`modal.md`](modal.md)), its centred box on a phone as at every width. Close, Escape and a click outside close it at once and ask nothing, since nothing typed is lost that matters: the page underneath was never left. `returnTo` gives the focus back to the link.
- **The title is the mode.** "Sign In" or "Create an Account", from the `mode` it opened in (`sign-in` unless asked) and every switch the panel reports after. It opens again in the mode it was asked for, not the one it was closed in.
- **`ledes`** are one sentence per mode, drawn under the title (`Modal`'s `under`). An invitation sent to an address passes two, saying to use that address; a card and the bar pass none.
- **The body is `SignInPanel` with `inDialog`**, which draws no head of its own, holds its email view in its state rather than the address, and puts its form heading at `h3` ([`sign-in-panel.md`](sign-in-panel.md), "In a dialog"). `signUpLandsOnNext` is passed through: an invitation sets it, so a new email account comes back to the invitation and is told to check its inbox there.
- **"Forgot Password?"** in the dialog stays a link that leaves for `/forgot-password`.
- **`configured`** is the providers with credentials here. The caller reads it on the server with `configuredProviders()`, since the module naming the env vars must never reach a client bundle.

## Styling

The trigger's class is the caller's, `.btn.btn--solid.btn--medium` by default. The panel inside is `.sign-in-panel--dialog`, its column without `.panel`'s ground and padding, which the modal's box already gives.

## Stories and tests

`src/components/SignInDialog/index.stories.tsx` (`Closed`, `SignInFromTheBar`, and `CreateAnAccountFromAnInvitation`, each opened on mount). Tests: `tests/components/SignInDialog/index.test.tsx`, `tests/components/SignInPanel/in-dialog.test.tsx`, and `tests/e2e/sign-in-dialog.spec.ts`: the dialog from the bar closed by Close, Escape and a click outside with the address, scroll and focus as they were; axe in both themes on the buttons, the email form and the invitation's Create mode; and an invitation's whole round trip, a new account told to check its inbox, its verification link landing straight on the invitation, then back by Sign In to press Accept Invitation and meet the terms page on its way into the coven. The axe sweep opens it from the bar as the `sign-in` modal scan (`tests/e2e/axe-scans.ts`).
