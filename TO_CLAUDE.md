- [ ] Make sure to use Lexend and choose font.
- [ ] Design, design, design.
- [ ] Choose colors.
- [ ] V3
  - [ ] Add label printing.
  - [ ] Add wikipedia.
- [ ] V Public
  - [ ] Add WAF
  - [ ] Add RLS — deferred here by MB.29. The specification is
        `claude-docs/design-decisions/mb.24-rls-role-split.md`; `withAudit`
        already publishes the `app.current_user_id` GUC the policies read, so
        this is one migration plus its tests, not a re-audit of the write path.
