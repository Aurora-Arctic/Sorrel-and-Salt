# RoleTip

`src/components/RoleTip/` — a role's name in a list's Role column with an ⓘ
beside it that opens a tip (a small note) saying what the role may do.

- **The tip is an [`InfoTip`](info-tip.md)**, named "About <label>". The
  component only pairs the word with the tip.
- **The wording is the Change Role control's.** The admin list passes
  `SITE_ROLE_ACCESS[role]` (`UserList/roles.ts`), the member list
  `WORKSPACE_ROLE_ACCESS[role]` (`MemberList/roles.ts`). Neither constant is
  copied, so a role's description cannot say one thing in the tip and another in
  the dialog.
- **The word stays the cue.** `emphasis` sets the word in `<strong>`; the tip's
  button is the same on every row, so weight and the ⓘ never tell roles apart on
  their own.

## Where it is used

- [`user-list.md`](user-list.md): the Role column of `/keepers/users`, every row,
  bold for a keeper or a curator.
- [`member-list.md`](member-list.md): the Role column of `/coven/[slug]/members`,
  every row, bold for a steward, whether or not the row carries Change Role.
