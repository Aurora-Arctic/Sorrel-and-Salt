---
paths:
  - 'src/modules/**'
  - 'src/db/seed/**'
  - 'compendium/**'
---

# Domain rules

The long form of the domain invariants in `CLAUDE.md`. `CLAUDE.md` carries each rule's one-to-two-sentence statement and wins over this file; `claude-docs/DESIGN.md` carries the argument.

## Who curates what

- **Keepers and curators curate the compendium and little else.** That covers global categories, the ingredient form vocabulary, the two group vocabularies that organise it, the celestial body and zodiac vocabularies, and the deity vocabulary with the traditions that group it. Keepers alone (admin only) edit and publish the site documents and write the help articles and the glossary. Both roles review support requests, which hold only what a sender chose to write.
- **Neither role has access to any workspace's ingredients or grimoire**, except the demo coven, where every keeper holds a steward seat. A test asserts this.
- **A curator may use every curation screen and reaches nothing on the People page.** The workshop and the privilege ledger stay admin-only. `assertCurator` passes either role; `assertSiteAdmin` passes a keeper only. A keeper may read which covens a user belongs to, by name and role only.
- **`category_groups` and `ingredient_form_groups` are tables, not enums**, so a keeper can add a group without a migration (DESIGN.md §5). A category group's `colorDark` and `colorLight` are hexes on its row, never Sass tokens, each contrast-checked on write against its theme's harder surface.

## Public surface and access

- **The site is invite-gated.** Signing in by any method (a registered provider, a password or a passkey) earns an account and an observer seat in the demo coven, and nothing else.
- **The compendium is the one public surface of data.** `/compendium` and `/compendium/ingredients/[slug]` are readable without an account and are indexable. The public compendium read takes no session. A curator or keeper reaches a hidden entry's page through a separate uncached read that does take one (claude-docs/design-decisions/ingredients.md, "A curator or keeper still sees the page of a hidden entry"). A workspace entry's slug at the public route is a 404.
- **Other open pages carry no workspace data.** `/help` and its sub pages are open and indexable. `/support` is open but shows a signed-out visitor only Sign In. The public document pages under `/privacy` and its siblings are open and indexable. `/` is crawlable on production too, showing the site name and the footer.
- **A signed-out support sender gets no session and no account.** `/support/request` shows only the one request that the token in its link fragment (`/support/request#<token>`) names. An open, rate-limited GraphQL query reads it, served `no-store` with no referrer. The token lapses after 30 days.
- **`canCreateWorkspace` defaults to `false`.** It turns true only by accepting an invitation, by a keeper grant, or by being made keeper or curator. A CHECK makes every keeper and curator hold it, so the gate reads the flag alone. Once true it stays true until a keeper revokes it, which leaves the workspaces already created. Nothing in the OAuth flow sets it.
- **There are no personal workspaces.** No `kind` column; every workspace can take members and be deleted by a steward. One demo coven, flagged `workspaces.demo`, is seeded on every environment and cannot be deleted.
- **Invitations grant `viewer` (Observer) or `member` (Practitioner) only.** A database CHECK rejects `owner`. An existing steward grants the Steward role afterwards on the members page.
- **Observers write nothing to a workspace**, though an observer may still send a support request.
- **`/curator` and `/keepers` return a styled "not authorized" page** to a signed-in user who is neither a curator nor a keeper. A curator reaches `/curator` and, under `/keepers`, only Support; the People and Invitations pages refuse a curator the same way. `/coven/[slug]` returns 404 to a non-member, because a workspace's existence is private to its members.

## What the compendium says, it sources

- **Every compendium entry and every curated row drawn from somewhere records where**, as `references` rows linked from every row it supports (DESIGN.md §5). An unsourced entry still saves and sits on the keeper's to-do list. A seed list compiled by hand records its sources in its seed doc the same way; without them it is not done.
- **A formal name is a unique identifier and a common name never is.** A source is cited on an entry only when it prints that formal name, or when its common name maps to exactly one formal name by a cited authority, recorded as `nameBasis: resolved`. Doubt goes to `needs-review` for the owner, never into an `approved` file.
- **Seed entries are markdown files under `compendium/`.** The seed updates a landed entry only when its file is marked for update (`seedUpdate`) and no curator or editor has touched the row.

## An ingredient's identity

- **An ingredient's identity is its formal name alone; each form it comes in is a variant beneath it.** `name` is only what the ingredient is called in this coven and is freely relabellable.
- **A variant adds to its ingredient and never removes from it.** An ingredient with no variant is information only: a stock row or a spell layer names a variant.
- **Deities and folk names stay on the ingredient.** A variant carries its own references, substitutes and categories. A form's link always names a form; the ingredient's own list may link an ingredient whole (DESIGN.md §5).
- **The compendium declares a `nomenclature` for every entry.** `none` and `unknown` are answers, not absences, the same way `unitConvert` refuses rather than guesses.
- **A variant's `form` is text, not a foreign key.** The curated vocabulary is an autofill, so an uncurated value stays writable.
- **A coven's cupboard is its own entries plus the compendium entries it names in `workspace_compendium_entries`.** Nothing is hidden on a name match. Common-name and form lookups suggest from the compendium and the current workspace only, never another workspace's, strings included.

## Spells

- **A complete spell's visibility widens only.** A draft moves either way, as often as wanted. Once a spell is complete, `private → workspace` is allowed and `workspace → private` is rejected with an explaining error, not a bare `Forbidden`. The lock is read from the row's status before the write, so the save that completes a shared draft is what starts it. The service enforces it and a test asserts it; the UI is not the guard. The rule governs visibility, not existence: a shared spell can still be deleted.
- **A complete spell never goes back to a draft.** `updateSpell` refuses it with an explaining error, and a change to it goes through a draft copy (`duplicateSpell`).
- **There are two kinds of spell category.** Assigned categories are what the spell intends; derived categories are the union of its ingredients'. Conflating them is a bug.

## Accounts, tokens and units

- **An address changes only at verification.** `setEmail` writes nothing to `users.email`: it mails the new address Better Auth's change link, and `/verify-email` swaps the address and verifies it in one write. An unverified account reaches `/account/email` and the public pages (`/` and the compendium) and nothing else: `requireSession()` sends it to the email page from every protected page (claude-docs/auth/admin-bootstrap.md, "The email page").
- **Invitation tokens come from `crypto.randomBytes()`, never `Math.random()`.** Only the hash is stored. The secret-link job mails the link to the invited address, and its step mints a fresh token on every attempt, so only the newest mailed link works. Only a signed-in account whose verified email matches the address accepts it. The token appears in no response and is never copied.
- **One exception: a printed card** (`kind = 'card'`) is bound to no address. Its token is returned once, at minting, to the keeper who mints it (claude-docs/design-decisions/auth.md, "An invitation card is a third shape of `invitations`").
- **How a coven invitation is accepted.** It is also accepted by id from the account page, under the same address match in SQL. A keeper invitation is accepted by its link alone.
- **A support view token follows the same rules.** It is 32 random bytes with only its SHA-256 hash stored. A fresh one is minted on every mail about a signed-out request, so only the newest works, and it is never returned in a response.
- **Email verification's signed token is the one that is neither hashed nor single-use** (claude-docs/design-decisions/auth.md, "First-party email verification and email delivery").
- **Unit conversion is within one dimension only.** weight↔weight and volume↔volume. Anything crossing dimensions, and anything involving `count`, is refused as an explicit result the caller must handle, never null, NaN or a guess. No density table exists anywhere in the codebase.
