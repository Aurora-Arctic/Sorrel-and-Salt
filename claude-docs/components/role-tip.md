# RoleTip

`src/components/RoleTip/` — a role's name in a list's Role column with an ⓘ
beside it that opens a tip (a small note) saying what the role may do.

| Prop          | Meaning                                                                               |
| ------------- | ------------------------------------------------------------------------------------- |
| `label`       | The role's word as the column shows it: Admin, Curator, User, Owner, Member, Viewer   |
| `description` | What the role may do: the sentence the Change Role control shows beside the same role |
| `emphasis`    | Bold, for the roles a list sets apart: an admin, a curator, an owner                  |

## Behaviour

- **The tip is an [`InfoTip`](info-tip.md)**, named "About <label>", so it opens on
  focus, hover and tap, closes on Escape, and is read to a screen reader as the
  button's description. Nothing here is new behaviour: the component only pairs
  the word with the tip.
- **The wording is the Change Role control's**: the admin list passes
  `SITE_ROLE_ACCESS[role]` (`UserList/roles.ts`), the member list
  `WORKSPACE_ROLE_ACCESS[role]` (`MemberList/role-access.ts`). Neither constant is
  copied, so a role's description cannot say one thing in the tip and another in
  the dialog.
- **The word stays the cue.** `emphasis` sets the word in `<strong>`; the tip's
  button is the same on every row, so weight and the ⓘ never tell roles apart on
  their own.
- **Layout** is one inline-flex row, the ⓘ a `space(1)` from the word, so the
  column's own layout (`.user-list__role-name`, `.member-list__role`) places it as
  it placed the bare word.

## Where it is used

- [`user-list.md`](user-list.md): the Role column of `/keepers/users`, every row,
  bold for an admin or a curator, beside the primary admin's crown when the row
  has one.
- [`member-list.md`](member-list.md): the Role column of `/coven/[slug]/members`,
  every row, bold for an owner, whether or not the row carries Change Role.

## Tests

- `tests/components/RoleTip/index.test.tsx`: the button's name, the tooltip's
  text and `aria-describedby`, open on focus, and the emphasis.
- `tests/components/UserList/index.test.tsx` and
  `tests/components/MemberList/index.test.tsx`: each row's tip holds its role's
  constant.
- `tests/e2e/role-tooltips.spec.ts`: one tip opened by keyboard on each page,
  axe passing with it open.
