### Bugs

- [ ]

### Things to Think About

- [x] Adam and Eve Root contains a form in it's name. - Should it?
      Yes, because a root can still have multiple forms and some things have different names for different parts.
- [x] Ivy tried to click on the ingredient name itself instead of edit. Should go to the page where it can be edited? Or modal?
      It should open a modal.
- [x] Define password policies and create enforcement. The policy is DESIGN.md §8, "Passwords"; Wave 16 (M16.2–M16.5) builds the enforcement.
- [x] Icons for forms?
      Yes, one per form group, with a generic salt spoon for a form no group
      covers. The spoon also replaces the flask as the Forms tab mark. Minted
      as M12.6 (the column) and M12.7 (the icons and where they show).

### Feature Additions

- [ ]

### Launch - PUBLIC

- [ ] Configure Vercel's WAF — nothing to build: DDoS mitigation is already
      on for every plan, and what is missing is a `rate_limit` custom rule
      on `/api/graphql` and, once MB.83 opens them, on `/compendium/*`,
      rolled out log-first and published from the CLI. Real rather than
      notional since MB.80: `/api/graphql` answers the compendium queries
      to anyone, and graphql-armor (M3.3) bounds what one request costs,
      not how many one client sends. Blocked and rate-limited requests are
      not billed.
- [ ] Add RLS — deferred here by MB.29. The specification is
      `claude-docs/design-decisions/mb.24-rls-role-split.md`; `withAudit`
      already publishes the `app.current_user_id` GUC the policies read, so
      this is one migration plus its tests, not a re-audit of the write path.

### V Fast Follow

- [ ] Closed practice warning.
- [ ] Ethical warnings around ingredients.
- [ ] Draft and approval ingredients process.
- [ ] Versioning and history tracking for items.
- [ ] Allow curators to view some of other curators/admins info so they can collaborate.
- [ ] Swap the email page's address validation for my personal email
      validation library. v1's rule is `validateEmailAddress` in
      `src/modules/identity/services/email.ts` (MB.54), one deliberately
      loose function that nothing else reads, so the swap is one import
      and its tests in `tests/modules/identity/services/email.test.ts`.

### V2

- [ ] Subscription billing — the requirements and the Stripe plugin's fit
      are in DESIGN.md §13 (MB.79); spike against Stripe's test mode before
      scheduling it.
- [ ] Suggest compendium additions.
- [ ] Compendium of pre built spells
- [ ] Admin editor comment sections for curated entries.
- [ ] Both private and public comment sections for compendium entries.
- [ ] _**Dark Magic**_
- [ ] In spell steps: allow the user to link to a specific ingredient in the spell in the notes but that drops to plain text if they remove the ingredient and displays a warning to update on the step.
- [ ] Inline editing on the ingredient entry page: an Edit beside each item opens that item for editing where it sits, rather than the whole form in a modal (M8.19's page).
- [ ] Reading font (the owner's name for it: Dyslexic mode): a per-user
      account setting that sets all text in Lexend. Researched 2026-10-23:
      Lexend's only published evidence is its makers' own unreviewed test of
      20 children, and fonts made for dyslexia showed no gain once letter
      spacing was matched (Wery & Diliberto 2017; Marinus et al. 2016), so
      the research recommends the label "Reading font" and offering wider
      spacing as a separate setting. Store it on the account with a cookie
      copy so the server renders the font on first paint, and load Lexend
      only for those who choose it. No CSS media query exists for this
      preference.

### V3

- [ ] Add label printing.
- [ ] Add wikipedia.
