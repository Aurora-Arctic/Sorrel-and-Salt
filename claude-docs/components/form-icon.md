# FormIcon

`src/components/FormIcon/` draws the small mark beside a form saying what kind of thing it is, so a list of forms scans before it is read. It draws the icon of the form's group, or the generic salt spoon where there is none. The icon sits on the group rather than the form: [`ui.md`, "Form icons: on the group, with a generic"](../design-decisions/ui.md#form-icons-on-the-group-with-a-generic). Props (`name`, `className`) are in `types.ts`.

## Contracts

- **The resolution lives here and nowhere else.** A caller hands over the group's icon or `null`: `null` for an uncurated form (a `form` value with no row behind it) or a group with no icon. `null` draws the spoon, and so does a name the component does not know (a value the enum gained after this build, or an older client's), so a form is never left without a mark. The lookup is an own-property check, not an index, for that reason.
- **Decorative.** The SVG is `aria-hidden` and `focusable="false"`, since the form's name always stands beside it. A caller that wants the kind spoken says it in words.
- **`SPOON` (the SVG fragment) is exported** for the admin nav's Forms tab, which draws it inside its own `SectionIcon`, so one mark means "a form" everywhere. Every other surface renders `<FormIcon />`.
- **The names are `FORM_GROUP_ICONS`** (`src/modules/vocabulary/schema/form-group-icons.ts`), the one source that also feeds the Postgres enum, the Zod input and the GraphQL enum. A name added there fails to compile here until it has an icon.

## The icons

`icons.tsx` follows the section nav's conventions: a 24-unit square, a 1.6 stroke with round caps and joins, no fill, `currentColor`. Botanical is a sprig, animal a paw, mineral a cut gem, substance a mortar, fluid a drop, curio a skeleton key, the generic a salt spoon.

- **The pestle is the set's one filled shape**, so it reads as stone rather than a stick.
- **The seven read the same size.** Drawn freehand, the sprig, paw, drop and spoon came out smaller than the gem and mortar (about 17 by 15.5 by `getBBox`). `sized(scale, cx, cy, shape)` scales a drawing about its own centre onto (12, 12) and divides the stroke by the same scale, so every line still renders at 1.6. Scales: sprig 1.16, drop 1.13, paw 1.05, spoon 1.05, the last two set by eye a shade under the gem. The key spans the diagonal and is left as drawn.
- **The spoon** is drawn on the Backdrop's `salt-spoon.webp`. It keeps its own stroke widths, 1.3 for lines and 2 for the grains (zero-length strokes the round caps swell into dots), scaled up a twentieth so they render at 1.37 and 2.1. It sets its stroke per element, not through `sized`.

## Styling

`.form-icon` is 1.25em square, `flex: none`, sunk `-0.25em` below the baseline so its centre sits level with lowercase text. A caller sizes it by the font size of the line it sits in, never by a class per surface. A quarter over the text because thin line drawings at one em read too small beside a name (at body size, `$glyph-size-large`). The radio strip sets its segment's line at 1.2rem to bring the icon to 1.5rem. No tokens: it takes the text's colour.

## Stories and tests

`src/components/FormIcon/index.stories.tsx` (`Surfaces / Form Icon`). `tests/components/FormIcon/index.test.tsx` (each name draws a different SVG; `null` and an unknown name draw the spoon) and the nav's test, which asserts its Forms tab draws that same SVG.
