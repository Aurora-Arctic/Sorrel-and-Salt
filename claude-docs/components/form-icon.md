# FormIcon

`src/components/FormIcon/` — the small mark beside a form saying what kind of
thing it is, so a list of forms scans before it is read (M12.7). It draws the
icon of the form's group, or the generic salt spoon where there is none. The
reasoning, and why the icon sits on the group rather than the form, is in
[`../design-decisions/m12.6-form-icons.md`](../design-decisions/m12.6-form-icons.md).

## Props

`FormIconProps` (`types.ts`):

| Prop        | What it is                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `name`      | The group's icon name (`FormGroupIcon`, one of the six in `FORM_GROUP_ICONS`), or `null` for a form with none |
| `className` | A layout class from the caller, added after the icon's own                                                    |

## Contracts

- **The resolution lives here and nowhere else.** A caller hands over the
  group's icon or `null`: the icon of a curated form's group, `null` for an
  uncurated form (a `form` value with no row behind it) or a group that has no
  icon. `null` draws the spoon, and so does a name the component does not know
  (a value the enum gained after this build, or an older client's), so a form
  is never left without a mark. The lookup is an own-property check, not an
  index, for that reason.
- **Decorative.** The SVG is `aria-hidden` and `focusable="false"`, since the
  form's name always stands beside it. A caller that wants the kind spoken
  says it in words.
- **The spoon is exported** (`SPOON`, the SVG fragment) for the admin nav's
  Forms tab, which draws it inside its own `SectionIcon` so that one mark means
  "a form" everywhere. Nothing else imports a fragment: every other surface
  renders `<FormIcon />`.
- **The list of names is `FORM_GROUP_ICONS`**
  (`src/modules/vocabulary/schema/form-group-icons.ts`), the one source that
  also feeds the Postgres enum, the Zod input and the GraphQL enum. A name
  added there fails to compile here until it has an icon.

## The icons

`icons.tsx`, on the section nav's conventions: a 24-unit square, a 1.6 stroke
with round caps and joins, no fill, `currentColor`. One thing from each group:

| Name        | Icon                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `botanical` | A sprig: a stem with two leaves                                                                       |
| `animal`    | A paw print                                                                                           |
| `mineral`   | A cut gem                                                                                             |
| `substance` | A mortar, a solid stone pestle tapering as it leans in it                                             |
| `fluid`     | A drop                                                                                                |
| `curio`     | A skeleton key set diagonally: a three-leaf clover bow, a plate bit with a notch cut up from its foot |
| the generic | A salt spoon, seen top-down                                                                           |

The pestle is the set's one filled shape, so it reads as stone rather than a
stick; its foot runs along the rim so the bowl cuts it off. The spoon is drawn
on the Backdrop's `salt-spoon.webp` and keeps its own stroke widths: 1.3 for its lines (the owner's call, thinner than the set) and
2 for the grains, each a zero-length stroke the round caps swell into a dot.
The six group icons were signed off by the owner in the Storybook story on 2026-10-16, after six rounds of drawing.

**The seven read the same size.** Drawn freehand, the sprig, the paw, the
drop and the spoon came out smaller than the gem and the mortar, and the owner
asked for them to match (2026-10-16). The browser's `getBBox` measured each:
the gem and the mortar span about 17 by 15.5. A `sized(scale, cx, cy, shape)`
helper in `icons.tsx` scales a drawing about its own centre onto (12, 12) and
divides the stroke by the same scale, so every line still renders at 1.6:

| Icon      | Drawn       | Scale |
| --------- | ----------- | ----- |
| the sprig | 13 by 15    | 1.16  |
| the drop  | 12 by 17    | 1.13  |
| the paw   | 16.6 by 16  | 1.05  |
| the spoon | 18.8 square | 1.05  |

The paw and the spoon were set by eye after the measure, a shade under the gem.
The spoon sets its stroke per element, so its lines thicken by the same
twentieth, 1.3 to 1.37. The key spans the square's diagonal and is left as
drawn.

## Styling

`index.scss`: `.form-icon` is 1.25em square, `flex: none`, and sunk
`-0.25em` below the baseline so its centre sits level with lowercase text. A
caller sizes it by the font size of the line it sits in, never by a class per
surface. A quarter over the text because the icons are a thin line drawing,
which at one em read too small beside a name (the owner's call, 2026-10-16);
at body size it comes to `$glyph-size-large`. The radio strip sets its
segment's line at 1.2rem to bring the icon to 1.5rem. No tokens: it takes the
text's colour.

## Stories

[`index.stories.tsx`](../../src/components/FormIcon/index.stories.tsx),
`Surfaces / Form Icon`: `Default`, all seven marks at 1rem,
1.25rem and 1.5rem with their names, and a line of text with marks in it. It
follows the toolbar's theme control, so the marks are checked in each theme there.

## Testing

`tests/components/FormIcon/index.test.tsx`: each of the six names draws a
different SVG, hidden from assistive technology; `null` and an unknown name
draw the same SVG, the spoon, and no named icon draws it. The nav's test
asserts that its Forms tab draws that same SVG.

## Source notes

Comments in the source that point here; each is the detail behind a one-line comment.

- `icons.tsx`: The generic: a salt spoon, drawn on the Backdrop's `salt-spoon.webp` (claude-docs/design-decisions/m12.6-form-icons.md). Seen top-down: an oval bowl upper left holding five grains, a handle pinched to one line before widening to a soft square end, three grains spilled below the bowl. Its own stroke widths: 1.3, and each grain a zero-length stroke the round caps swell into a 2-unit dot. Also the admin nav's Forms mark. Drawn 18.8 square, centred on (12.23, 12.23), scaled up a twentieth to match the six, so its strokes thicken to 1.37 and the dots to 2.1.
- `icons.tsx`: The form icons, drawn on the section nav's conventions: a 24-unit square, a 1.6 stroke with round ends and no fill, so they take the text's colour (`currentColor`). One per form-group icon name: a sprig, a paw, a cut gem, a mortar and stone pestle, a drop, a skeleton key (claude-docs/components/form-icon.md, "The icons"). Scales a drawing about its own centre to sit at (12, 12), the stroke scaled back so every line still renders at 1.6: the sprig and the drop were drawn smaller than the gem and the mortar, which span about 17 by 15.5 by `getBBox`; each scale below brings a drawing's area to theirs.
- `icons.tsx`: The form icons, drawn on the section nav's conventions: a 24-unit square, a 1.6 stroke with round ends and no fill, in `currentColor` (claude-docs/components/form-icon.md, "The icons"). Scales a drawing about its centre to (12, 12), the stroke scaled back to 1.6; the sprig and the drop were drawn smaller than the gem and mortar (about 17 by 15.5), so each scale matches their area.
