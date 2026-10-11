# PageHeader

`src/components/PageHeader/` — a page's heading with its one primary action
on the same line, the action at the end: `/admin/categories`' Add Category
beside its `h1` (the owner's call, M5.6). Nine admin pages wrote the
`.page-header` row and its heading by hand until MB.115.

## Props

`PageHeaderProps` (`types.ts`):

| Prop     | What it is                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| `title`  | The `h1`, title case                                                                                          |
| `action` | Optional: the one primary action, an Add link as `<Link className="btn btn--solid">`, or a control of its own |

## Contracts

- **One `h1` per page, and this is it** on every page that renders it.
- **The action is the caller's element.** Most pages pass an Add link to
  their `?new` address; `/admin/users` passes `PauseControl`, a client
  component. A page with no action, such as `/admin/privilege-changes`,
  leaves it out and keeps the same heading.
- **Server-safe.** It has no client directive and no hook, so a server page
  renders it directly.

## Styling

None of its own: `.page-header` is the primitive ([`styling.md`](../styling.md),
"Buttons"), the row centred, the action brought down to sit level with the
heading's letters, and wrapping beneath the heading on a narrow screen.

## Stories

[`index.stories.tsx`](../../src/components/PageHeader/index.stories.tsx),
`Layout / Page Header`: `WithAnAction`, `HeadingAlone`, and `PhoneDark` and
`PhoneLight` with a longer heading at 375px.

## Testing

No file of its own (claude-docs/testing/layer-ownership.md, "What a test may
assert", rules 2 and 6): a heading is copy, and each admin page's e2e flow
reaches the action by its role and name.
