# Wave 16 — More login options

**This wave exists on the owner's call of 2026-10-16**: email-and-password sign-in, passkeys and an optional second factor come into v1, with a researched password policy as their requirement. Until then `DESIGN.md` §2 held v1 to OAuth only and §13 deferred all three to v2; M16.1 records the change in `claude-docs/design-decisions/m16.1-first-party-sign-in.md` and corrects those sections. The policy, its sources, and the tasks are in [`tasks/m16.md`](../tasks/m16.md).

**It runs before Wave 15 (Launch)**, because Launch's sweeps (the axe scan M11.8, the last design review MB.124) assume every page already exists, and this wave adds a sign-up form, two password pages and three sections of the account page. It depends on nothing after Wave 10: the account page, the mail transport (MB.65) and the verification link (MB.61) are all in place by then.

**The order is M16.1 to M16.10, in id order.**

1. **M16.1 first**, so the rules the code is reviewed against already allow it. It is documentation only.
2. **M16.2 and M16.3**, email and password: sign-in and sign-up, then reset and change. Reset needs the sign-up form's password field and the account to have a password to reset.
3. **M16.4 then M16.5**, the lockout: a table task, then the behaviour that writes to it (`CLAUDE.md`, "A table task, then a behaviour task"). It follows M16.2 because it hooks the sign-in endpoint M16.2 turns on.
4. **M16.6, M16.7, M16.8**, passkeys: M16.6 installs the passkey plugin and adds its table, so the dependency change lands alone and its effect on the existing auth tests is seen apart from any new code. The installed core already meets the plugin's peer range, so no core bump rides with it. Sign-in comes before the account page's management section, though each needs the other to be useful, because sign-in is the riskier half.
5. **M16.9 then M16.10**, two-factor: its table, then the behaviour. Last, because it covers password sign-ins only and builds on the account page's Password section from M16.3.

**Hashing stays as Better Auth ships it**, the owner's call: scrypt below OWASP's recommended cost, recorded in §8 by M16.1, with the upgrade path named for a later task and not scheduled.
