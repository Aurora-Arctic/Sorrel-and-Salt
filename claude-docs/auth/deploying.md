## Deploying to staging/production

Every variable this subsystem needs, and the manual steps to set each one, is
`claude-docs/secrets.md` (M0.27) — not duplicated here. Short version:
`src/lib/auth.ts` is wired and the OAuth credentials are set (see ["Social
providers"](social-providers.md)). `ADMIN_BOOTSTRAP_EMAIL` is set in Preview and
Production. Since MB.60 a deploy **fails its build** without it (`deploy.yml`'s
pulled-environment assertion names it first).
