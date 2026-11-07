# FormIcon

`src/components/FormIcon/` draws the small mark beside a form saying what kind of thing it is, so a list of forms scans before it is read. It draws the icon of the form's group, or the generic salt spoon where there is none. The icon sits on the group rather than the form; the reasoning is in [`../design-decisions/m12.6-form-icons.md`](../design-decisions/m12.6-form-icons.md). The props (`name`, `className`) are in `types.ts`.

## Contracts

- **The resolution lives here and nowhere else.** A caller hands over the group's icon or `null`: the icon of a curated form's group, `null` for an uncurated form (a `form` value with no row behind it) or a group with no icon. `null` draws the spoon, and so does a name the component does not know (a value the enum gained after this build, or an older client's), so a form is never left without a mark. The lookup is an own-property check, not an index, for that reason.
- **Decorative.** The SVG is `aria-hidden` and `focusable="false"`, since the form's name always stands beside it. A caller that wants the kind spoken says it in words.
- **The spoon is exported** (`SPOON`, the SVG fragment) for the admin nav's Forms tab, which draws it inside its own `SectionIcon`, so one mark means "a form" everywhere. Nothing else imports a fragment: every other surface renders `<FormIcon />`.
- **The list of names is `FORM_GROUP_ICONS`** (`src/modules/vocabulary/schema/form-group-icons.ts`), the one source that also feeds the Postgres enum, the Zod input and the GraphQL enum. A name added there fails to compile here until it has an icon.

## The icons

`icons.tsx` follows the section nav's conventions: a 24-unit square, a 1.6 stroke with round caps and joins, no fill, `currentColor`. One thing from each group:

| Name        | Icon                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `botanical` | A sprig: a stem with two leaves                                                                       |
| `animal`    | A paw print                                                                                           |
| `mineral`   | A cut gem                                                                                             |
| `substance` | A mortar, a solid stone pestle tapering as it leans in it                                             |
| `fluid`     | A drop                                                                                                |
| `curio`     | A skeleton key set diagonally: a three-leaf clover bow, a plate bit with a notch cut up from its foot |
| the generic | A salt spoon, seen top-down                                                                           |

- **The pestle is the set's one filled shape**, so it reads as stone rather than a stick. Its foot runs along the rim so the bowl cuts it off.
- **The seven read the same size.** Drawn freehand, the sprig, the paw, the drop and the spoon came out smaller than the gem and the mortar, which span about 17 by 15.5 by `getBBox`. A `sized(scale, cx, cy, shape)` helper in `icons.tsx` scales a drawing about its own centre onto (12, 12) and divides the stroke by the same scale, so every line still renders at 1.6. The scales: sprig (13 by 15) 1.16, drop (12 by 17) 1.13, paw (16.6 by 16) 1.05, spoon (18.8 square) 1.05. The paw and the spoon are set by eye, a shade under the gem. The key spans the square's diagonal and is left as drawn.
- **The spoon is the generic icon**, drawn on the Backdrop's `salt-spoon.webp`: an oval bowl upper left holding five grains, a handle pinched to one line before widening to a soft square end, and three grains spilled below the bowl. It keeps its own stroke widths, 1.3 for its lines (thinner than the set) and 2 for the grains, each a zero-length stroke the round caps swell into a dot. It is drawn 18.8 square, centred on (12.23, 12.23), and scaled up a twentieth, so its lines render at 1.37 and the dots at 2.1. It sets its stroke per element, not through `sized`.

## Styling

`index.scss`: `.form-icon` is 1.25em square, `flex: none`, and sunk `-0.25em` below the baseline so its centre sits level with lowercase text. A caller sizes it by the font size of the line it sits in, never by a class per surface. It is a quarter over the text because the icons are thin line drawings, which at one em read too small beside a name; at body size it comes to `$glyph-size-large`. The radio strip sets its segment's line at 1.2rem to bring the icon to 1.5rem. It uses no tokens: it takes the text's colour.

## Not here

Stories: `src/components/FormIcon/index.stories.tsx` (`Surfaces / Form Icon`; follows the toolbar's theme control). Tests: `tests/components/FormIcon/index.test.tsx` (each name draws a different SVG; `null` and an unknown name draw the spoon) and the nav's test, which asserts its Forms tab draws that same SVG.
