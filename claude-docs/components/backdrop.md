# Backdrop

`src/components/Backdrop/` is two ornaments fixed in the corners of every page: sorrel leaves on a plate top-left, and a salt bowl and spoon bottom-right, each a grey photograph blended into the page surface. The root layout renders the component once, after the page.

## Contracts

- **It is decoration.** `aria-hidden="true"`, no role, no pointer events, no text. It is held to no contrast ratio, because nothing depends on reading it.
- **`prefers-contrast: more` hides both**, because a shape behind text is what someone asking for more contrast wants gone. Reduced motion drops the theme cross-fade.
- **The image is tone and shape, not a picture.** Each image (`sorrel-plate.webp`, `salt-spoon.webp`, beside the component) is grey with an alpha channel: the RGB is the photograph's levelled luminance, the alpha is the subject's presence, and the dark ground it was shot on is transparent.
- **The page blends the image, with two opacities.** A `screen` layer at 0.3 on the dark theme lifts the bright parts out of the soot. A `multiply` layer at 0.4 on the light theme sinks the dark parts into the parchment. The tokens `$ornament-screen` and `$ornament-multiply` ([`styling.md`](../styling.md)) are those two opacities, one of them zero on each theme. On both themes the salt and the plate are the bright things and the wood and leaves the dark things, which a single tint cannot do: one lighter than the page lightens the wood too, and one stepped toward the text colour inverts the salt on parchment.
- **Each corner is two sibling layers, one per blend mode, on direct children of `<body>`.** A blend mode cannot animate, so a theme change shows them cross-fading with the rest of the page, in one View Transition with no transition of their own. A fixed element is a stacking context, so a layer nested in one would blend with its transparent parent and come out plain grey. As siblings in the root stacking context, each blends with the page.
- **Stacking is `position: fixed` with `z-index: -1`.** The body's background propagates to the canvas, so a negative z-index paints above the page colour and beneath every in-flow element, with no page needing a stacking context of its own. They are the last children, so a tool that ignores `aria-hidden` meets them after the content.
- **The images are served under a content hash.** They sit in the component's directory and the stylesheet references them relatively, so Next serves them from `/_next/static/media`. A rebuilt image is a new URL, so no browser, CDN or dev-server cache keeps the old one, which a fixed path in `public/` allowed. It also keeps them off the proxy's deny-by-default rule, which exempts `/_next/*` and nothing in `public/` ([`auth/route-protection.md`](../auth/route-protection.md), "Route protection").

## How the images are made

`scripts/backdrop-masks.mjs` builds them from the source photographs, which are not committed (see "Licence"). It also writes previews that apply each theme's blend over its page colour, so a retune can be judged without a browser. Replacement photographs go through the same script.

- **Detail is kept, not posterised.** The tone curve clips no highlights and lifts the mid-tones with a gamma below one, so salt grains, wood grain and leaf veins keep their gradation.
- **Chroma is screened under the luminance.** A subject only a little brighter than the ground (the wooden bowl, the green leaves) would vanish under levelling, so chroma, which a plain dark ground lacks, gives a floor the subject cannot fade below while the luminance still varies above it. The floor is capped below each subject's own shadow, measured from the photograph (a leaf levels to 0.37 and its shadow on the plate to 0.64), so a lifted leaf is never lighter than its shadow. For the salt it is spread over a wide chroma range, so the lift follows the wood's grain and does not saturate the bowl into one flat tone. A plain sum, or a flat cap, saturates into a blob.
- **Presence is spatial, not tonal.** Levelling makes the ground transparent, but would also make every shadow inside the subject transparent (the pocket under the salt, the gaps between leaves), and on parchment transparent is the lightest thing on the page, so those shadows would invert. The ground is therefore the region of empty pixels connected to the image border, found by a flood fill, and everything else is wholly present. Only the one-pixel band against the ground keeps partial presence, so the outline stays anti-aliased. A component filter drops what the fill cannot exclude: a present blob that is both small and dark is never subject, while a loose salt grain, small but bright, stays.
- **Only the edge that faces into the page is feathered**, and it stops short of the subject: the salt's left, and nothing on the sorrel. The bowl reaches the top of its frame and the loose leaf the bottom of its own, so each keeps its hard edge.
- **Parameters.** The black point is the ground's 99.5th-percentile luminance, not its maximum, since one bright speck in the sample would otherwise blank the image. Presence saturates at two and a half times the tone, so a mid-toned subject is fully there. The output is 1000px wide.

## Size and placement

- **One custom property, `--backdrop-width`, sets both ornaments.** The default is small enough to sit under a corner of any page. `body:has(.welcome-page) .backdrop` sets the front-door size, so the layout needs no route awareness and the page no prop.
- **Each modifier pins its corner and its photograph's own aspect ratio**, which `mask-size: 100% 100%` relies on. The sorrel also sets `--backdrop-scale: 0.75`, since its subject fills more of its frame than the salt does.
- **The sorrel's top is the window's top, and inside the shell it is below the bar and the context row** ([`styling.md`](../styling.md), "The top inset"). The offsets apply on every device. The context row's offset is its minimum height, so a coven name that wraps to two lines makes the row taller than the offset, and the sorrel's edge then sits under it.
- **The sorrel follows the scroll.** As the page scrolls the context row leaves but the bar stays, so a scroll-driven animation (`animation-timeline: scroll(root)`, over the row's own height of scroll) lifts the sorrel to the bar's foot and holds it there. A browser without scroll-driven animations keeps the fixed offset. The public frame's bar has no sticky bar beneath it, so the sorrel starts under the bar and climbs to the top of the window over the bar's own height of scroll. One mixin, `follows-scroll`, draws both from `--sorrel-rest` and `--sorrel-lift`.
- **On a phone the section nav is a bar fixed along the bottom**, so the salt is lifted above it by `$bottom-bar-height` plus the safe-area inset. It stays lifted while a dialog or the keyboard hides the bar.
- **The page head's eyebrow wears `$text-halo`**, a blur of the page colour behind the letters, because that small muted text shares the sorrel's corner ([`_typography.scss`](../../src/scss/_typography.scss)).

## The copy in the search row

The sticky search row on the ingredient lists is filled with the page colour so the cards do not show through. A sticky box paints as its own stacking context, so no `z-index` can put the real sorrel between that fill and the row's controls. The row draws a copy of the sorrel instead.

- **`.filter-sorrel`** is an `aria-hidden` child of the `<search>`, not of the form, whose `container-type` would become the containing block of fixed children. It is filled with `$surface-page` and cut to its own box by a solid `mask-image`.
- **Its `::before` and `::after` are the `screen` and `multiply` layers**, `position: fixed` like the real ones, so a fixed copy lines up with the real sorrel and the mask shows only the part inside the row. The mask makes the layer a stacking context, which is why it carries the page colour: the blends need something the colour of the page to blend with.
- **The mask sits on the layer, never on the `<search>`**, which would cut off the stuck shadow and the Filters tray.
- **The layer is 16px wider either side, the page's gutter.** A card scrolled under the row, above all one raised by hover, casts its shadow up to 20px past its edge. Without the gutter that shows as a dark strip across the real sorrel, cut straight at the row's edge. No wider, since the layer would then widen the page.
- **The cut is the layer's own box, never a clip past it.** A `clip-path: inset(0 -16px)` reaching past the fill draws the fixed copies over the real sorrel in a strip with no fill beneath, so the screen layer lightens the real one twice.
- **It is a `mask-image`, not a `clip-path: inset(0)`.** A clip's edge is anti-aliased at a half pixel, and an odd-width window centres the page on one (88.5px at 1457 wide). At device pixel ratio 1 the copies then draw a lighter one-pixel line over the real sorrel along the layer's top and left edges. A mask's edge rounds the way the real sorrel's does. Widening the fill by a pixel does not fix it and makes the page scroll sideways. Unprefixed `mask-image` is Baseline widely available, so it needs no `@supports`. This was checked in Chromium only.
- **The shape, the photograph and the offsets** (the shell bar, the context row, the `sorrel-follow` scroll animation, on the public frame too) are written once, in the mixins of `_sorrel.scss`, and used by `.backdrop--sorrel` and by the copy. The keyframes stay in `index.scss`.
- **Under `prefers-contrast: more`** the copy's two layers are hidden with the sorrel and the layer keeps its fill, so the row stays opaque.

## Licence

Both source photographs are used **without a licence**, as stand-ins for the treatment: `salt-spoon-slate.jpg` from the Salt Association's website (`saltassociation.co.uk`, marked "© Salt Association"), and a Feast Magazine editorial image (`feastmagazine.com`). Licensed or in-house photographs of the same subjects replace both before launch, are run through the same script, and the stand-in files are removed. Nothing else should reference the stand-in files.

## Not here

Stories: [`index.stories.tsx`](../../src/components/Backdrop/index.stories.tsx); the ornaments are fixed to the viewport, so they appear in the preview's corners.

Tests: a decoration has no behaviour for a happy-dom test to prove, so it has none. The page frames' `box-sizing` is asserted by the smoke spec's check that `/` does not scroll at the default viewport. `tests/e2e/smoke.spec.ts` also reads each layer's computed `background-image`, asserts it is a hashed `/_next/static/media` URL, and fetches it: served as `image/webp`, not redirected. The look is checked by eye in the workshop and against the script's previews.
