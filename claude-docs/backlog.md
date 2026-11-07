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

- [ ] Subscription billing, scoped by M17.1 (`claude-docs/design-decisions/m17.1-subscription-billing-scope.md`)
      and built by Wave 21, M21.1 → M21.20. The requirements and the Stripe
      plugin's fit are in DESIGN.md §13 (MB.79); the plugin-or-SDK choice is
      the proof of concept, M21.1.
- [ ] Closed practice warning, scoped by M17.2; built by M19.4 to M19.8 and M19.10 on Wave 19.
      When it is built, update the Code of Ethics (`documents/code-of-ethics.md`,
      a document a keeper edits and publishes) in the same PR: the Short
      Version's closed-practices line and the list in "Closed Practices and
      Where Lore Comes From" say no entry is marked yet and the warning is
      planned. Say what the warning shows instead, and add the promise that an
      entry from a closed practice says so, names the people it belongs to and
      does not describe the ceremony. The data is gathered in
      `compendium/ethics/` (M14.29).
- [ ] Ethical warnings around ingredients, scoped by M17.3 and built by Wave 20
      (M20.1 → M20.15). M20.13, the entry-page notice with the card marks and
      filter, updates the Code of Ethics in its PR: the "planned" item in "Closed Practices and
      Where Lore Comes From" and the paragraph in "Ethical and Sustainable
      Sourcing" that says IUCN and CITES status are planned.
- [ ] Draft and approval ingredients process.
- [ ] Versioning and history tracking for items.
- [ ] Allow curators to view some of other curators/admins info so they can collaborate.
- [ ] Swap the email page's address validation for my personal email
      validation library. v1's rule is `validateEmailAddress` in
      `src/modules/identity/services/email.ts` (MB.54), one deliberately
      loose function that nothing else reads, so the swap is one import
      and its tests in `tests/modules/identity/services/email.test.ts`.
      The same task covers the signed-out support form, where the library
      also stops the form being used to mail strangers:

      1. **Count sends by the normalised address.**
         `sendSignedOutSupportRequest`
         (`src/modules/support/services/signed-out.ts`) allows 10 sends per
         address in 24 hours, but counts the address as typed, only trimmed
         and lowercased (`src/modules/support/validation/support.ts`). So
         `name+1@gmail.com`, `name+2@gmail.com` and `n.ame@gmail.com` each
         get their own 10. Count by the library's normalised address
         instead. For Gmail and Googlemail that drops dots and `+tag`; other
         providers follow the library's own rules, since RFC 5321 leaves the
         part before the @ to the receiving provider.
      2. **Cap the "received" email across the whole site.** Nothing limits
         the total today, so many IP addresses can mail many victims. Past a
         daily ceiling, skip only the email and still store the request: the
         request is stored before the email is sent, so a cap on the email
         cannot be used to block someone reporting an accessibility barrier.
      3. **Update the privacy page.** `src/app/(public)/privacy/page.tsx`
         says a signed-out request "is counted by network address and by
         email for twenty-four hours"; it gains the daily ceiling on the
         "received" email.

      Whether the form also needs a captcha is undecided. Research on
      2026-11-02 found self-hosted ALTCHA (a puzzle the browser solves with
      no cookie and no third party) the only option that leaves the privacy
      page true; Turnstile, hCaptcha, reCAPTCHA and Vercel BotID each add a
      third party, a cookie, or both.

### V2

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
