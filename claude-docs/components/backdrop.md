# Backdrop

`src/components/Backdrop/` — two ornaments fixed in the corners of every page:
sorrel leaves on a plate top-left, a salt bowl and spoon bottom-right, each
a grey photograph blended into the page surface. The root layout renders the component
once, after the page. It is decoration: `aria-hidden`, no pointer events, no
text, and — deliberately — held to no contrast ratio. It is not content and
nothing depends on reading it.

## The image is tone and shape, not a picture

Each image (`sorrel-plate.webp`, `salt-spoon.webp`, beside the component) is grey with
an alpha channel: the RGB is the photograph's levelled luminance, the alpha is
the subject's presence, and the dark ground it was shot on is transparent.
The page then blends it: a `screen` layer at 0.3 on the dark theme lifts the
bright parts out of the soot, a `multiply` layer at 0.4 on the light theme
sinks the dark parts into the parchment, and the two theme tokens
`$ornament-screen` and `$ornament-multiply` (`claude-docs/styling.md`) are
those two opacities, one of them zero on each theme. On both, the salt and the plate
are the bright things and the wood and the leaves the dark things, which is
what a single tint could not do: a tint lighter than the page made the wood
lighter too, and one stepped toward the text colour inverted the salt on
parchment. Monotone, the page's own colour family, correct in both themes
from one file.

**The detail is kept, not posterised.** The tone curve clips no highlights and
lifts the mid-tones with a gamma below one, so salt grains, wood grain and
leaf veins keep their gradation. A subject only a little brighter than the
ground (the wooden bowl, the green leaves) would still vanish under
levelling, so chroma — the one thing a plain dark ground lacks — is screened
under the luminance: a floor the subject cannot fade below, with the
luminance still varying above it. The floor is capped below each subject's
own shadow, measured from the photograph (a leaf levels to 0.37 and the
shadow it casts on the plate to 0.64), so a lifted leaf is never lighter than
its shadow; and for the salt it is spread over a wide chroma range, so the
lift follows the wood's grain instead of saturating the bowl into one flat
tone. A plain sum saturated the lit side of a leaf into a blob, a flat
cap did the same to the wood, and a higher lift put the leaf over its shadow;
all three are gone.

**Presence is spatial, not tonal.** Levelling makes the ground transparent,
but it would also make every shadow inside the subject transparent — the
pocket under the salt, the gaps between leaves, which measure darker than the
boards — and on parchment transparent is the lightest thing on the page, so
those shadows came out inverted. The ground is therefore the region of empty
pixels connected to the image border, found by a flood fill, and everything
that is not ground is wholly present — an enclosed pocket renders as the dark
shadow it is, and a shadow pixel that happens to sit just over the empty cut
is not left at a tenth of an alpha beside a neighbour filled to one, which
speckled the shadows with the page. Only the one-pixel band against the
ground keeps its partial presence, so the outline stays anti-aliased. What the fill cannot exclude — a knot or a droplet on the
ground bright enough to pass levelling — a component filter does: a present
blob that is both small and dark is never subject, while a loose salt grain,
small but bright, stays.

**Only the edge that faces into the page is feathered, and it stops short of
the subject** — the salt's left, and nothing on the sorrel at all. The bowl
reaches the top of its frame and the loose leaf the bottom of its own, and
each keeps its hard edge; the levelled ground is already transparent, so an
edge with no subject on it needs no fade.

`scripts/backdrop-masks.mjs` builds them from the source photographs, which
are not committed (see "Licence"): the black point is the ground's
99.5th-percentile luminance rather than its maximum (a single bright speck in
the sample otherwise blanks the whole image), presence saturates at two and a
half times the tone so a mid-toned subject is fully there, the ground fill
runs from the border, and the output is 1000px wide. It also writes previews that apply each theme's blend over its
page colour, so a retune can be judged without a browser. The replacement
photographs go through the same script.

## Served under a content hash

The images sit in the component's directory and are referenced relatively
from its stylesheet, so Next serves them from `/_next/static/media` under a
content hash. A rebuilt image is a new URL: no browser, CDN or dev-server
cache can keep showing the old one, which a fixed path in `public/` did
during review. It also keeps them off the proxy's deny-by-default rule,
which exempts `/_next/*` and nothing in `public/` (`claude-docs/auth.md`,
"Route protection").

## Size and placement

One custom property, `--backdrop-width`, sets both. The default is small
enough to sit under a corner of any page; `body:has(.welcome-page) .backdrop`
sets the front-door size, so the layout needs no route awareness and the page
no prop. Each modifier pins its corner and its photograph's own aspect ratio,
which `mask-size: 100% 100%` relies on; the sorrel also sets
`--backdrop-scale: 0.75`, since its subject fills more of its frame than the
salt does.

## Stacking

`position: fixed` with `z-index: -1` on direct children of `<body>`. The
body's background propagates to the canvas, so a negative z-index paints
above the page colour and beneath every in-flow element without any page
having to establish a stacking context of its own. They are the last children
so a tool that ignores `aria-hidden` still meets them after the content.

**Each corner is two sibling layers, one per blend mode, not one element with
two pseudo-elements.** A blend mode cannot animate, so the theme toggle
cross-fades their opacities on the same 400ms as every other colour; and a
fixed element is a stacking context, so a layer nested inside it would blend
with its transparent parent rather than with the page and come out plain
grey. As siblings in the root stacking context, each blends with the page.

## Accessibility

`aria-hidden="true"` and no role: nothing to announce. `prefers-contrast: more`
hides both, because a shape behind text is what someone asking for more
contrast is asking to be rid of — a response to a stated preference, not a
ratio the ornament is trying to meet. Reduced motion drops the cross-fade.

## Licence — two placeholders

Both source photographs are used **without a licence**, as stand-ins for the
treatment: `salt-spoon-slate.jpg` from the Salt Association's website
(`saltassociation.co.uk`, marked "© Salt Association"), and a Feast Magazine
editorial image (`feastmagazine.com`). **M11.16 replaces both** with licensed
or in-house photographs of the same subjects before launch, runs them through
the same script, and removes these files; the task's entry names them, and
`claude-docs/images.md`, which that task creates, is where the replacements
are recorded. Nothing else should reference the files.

## Stories

[`index.stories.tsx`](../../src/components/Backdrop/index.stories.tsx) —
`Default` (the everyday size) and `FrontDoor` (inside a `.welcome-page`
wrapper, the front door's size). Fixed to the viewport, so they appear in the
preview's corners rather than in the story frame.

## Testing

`tests/components/Backdrop/index.test.tsx` asserts only what matters for a
decoration: no `img` role, no text, every element `aria-hidden` and empty.
The scroll fix that came with it — the page frames' `box-sizing` — is
asserted by the smoke spec's check that `/` does not scroll at the default
viewport.
The visual result is checked by eye in the workshop and against the script's
previews. `e2e/smoke.spec.ts` reads each layer's computed `background-image`, asserts
it is a hashed `/_next/static/media` URL, and fetches it: served as
`image/webp`, not redirected.
