- [ ] Make sure to use Lexend and choose font.
- [ ] Design, design, design.
- [ ] Choose colors.
- [ ] V2
  - [ ] Subscription billing — the requirements and the Stripe plugin's fit
        are in DESIGN.md §13 (MB.79); spike against Stripe's test mode before
        scheduling it.
- [ ] V3
  - [ ] Add label printing.
  - [ ] Add wikipedia.
- [ ] V Public
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
