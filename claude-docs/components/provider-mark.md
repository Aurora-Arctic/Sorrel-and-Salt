# ProviderMark

`src/components/ProviderMark/` — a sign-in provider's mark on a small circle
of its brand's own ground, on the `.provider-mark` primitive
([`styling.md`](../styling.md), "Provider marks"), for a list of
sign-in methods: the account page's rows and the admin user list's provider
column. Added by MB.116; the circle was UserList's own until then.

## Props

`ProviderMarkProps` (`types.ts`):

| Prop   | What it is                                                                                  |
| ------ | ------------------------------------------------------------------------------------------- |
| `id`   | The `ProviderId` whose mark, and whose ground                                               |
| `chip` | Facebook only: its white "f" on the blue chip, as a button draws it, in place of its circle |

## Contracts

- **The marks are SignInPanel's** (`src/components/SignInPanel/icons.tsx`),
  read through `PROVIDER_MARKS`, a `Record<ProviderId, ProviderArt>`: one
  table for the brand buttons and this circle, so a provider added to
  `ProviderId` fails to compile until it has a mark. Each entry takes
  `{ chip?: boolean }`; Facebook's is the only one that reads it, drawing
  `FacebookIcon` (white on its chip) when true and `FacebookMark` (its own blue
  circle) by default. The SVGs' fills are artwork and stay hex in
  `icons.tsx`; where each came from is in
  [`sign-in-panel.md`](sign-in-panel.md), "Provider branding".
- **Decorative**: the span is `aria-hidden`, since the caller always prints
  the provider's name beside it.
- **The ground is the brand's**, from `brand-color()` (`_variables.scss`,
  `$brand-palettes`): Google's and Microsoft's white circles take their
  brand's edge, which holds 3:1 against both pages, and Discord's and
  Facebook's fills need none. The circle is `border-box`, so an edged circle
  is the same 1.5rem as the rest.

## The unavailable note

`ProviderUnavailableNote({ id, className? })` (`unavailable-note.tsx`) is the
line beneath a provider's greyed button saying why: `UNAVAILABLE_NOTE` from
`src/lib/social-providers.ts`, in a `.meta` paragraph with the given `id`. The
button stays in the tab order with `aria-disabled` and names the note in its
`aria-describedby`, so the reason is read with it, and the state is told
apart by the button's dashed edge and these words, never by hue alone.
SignInPanel and the account page's sign-in methods both render it.

## Stories

[`index.stories.tsx`](../../src/components/ProviderMark/index.stories.tsx), `Surfaces /
Provider Mark`: `States`, a grid of Marks (the four providers' marks with their names;
the toolbar's theme control shows each theme); Facebook Chip (Facebook's mark as a brand button draws it, on
its blue chip); and Unavailable Note (the note a button for an unavailable
provider carries).

## Testing

None of its own: it is presentation, which the story (`Sign In / Provider Mark`) and axe on the pages that show it own. The note's wiring is asserted
where a button names it.
