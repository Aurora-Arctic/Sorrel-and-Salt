## Share cards (M12.34)

A share card is the picture a chat app or a social site shows under a pasted link. Each public page names one in its `og:image` and `twitter:image` tags, and Next draws it to a PNG on the server with `next/og`'s `ImageResponse` (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md`). `/` and `/compendium` show the site card; each compendium entry shows its own. Nothing else has a card: the rest of the site is behind sign-in, and a link preview fetches with no cookie.

The code is `src/lib/share-card/`: `cards.tsx` lays the two cards out, `shelf.tsx` draws the jar shelf, `fonts.ts` loads the faces, `palette.ts` holds the colours and `index.tsx` turns a card into an `ImageResponse`. What an entry's card shows is read by `readCompendiumShareCard` in `src/modules/ingredients/services/share-card.ts`.

### The design

The owner approved the design on 2026-10-31. Both cards are 1200 by 630 pixels on the dark theme: the background is `$soot`, the text `$chalk`, and the colours come from `src/scss/_variables.scss` by way of `palette.ts`, since the renderer reads no stylesheet.

- **The site card**, for `/` and `/compendium`: the site name in Cormorant Unicase Bold at 148 px, then the tagline's first sentence ("A grimoire for covens.") in Lexend Light at 44 px in `$chalk-muted`, above a shelf of seven jars 80 px tall and 48 px apart (bottle, hex, flask, honey, vial, apothecary, Erlenmeyer, filled to 0.7, 0.45, 0.8, 0.6, 0.35, 0.7 and 0.55), with 90 px below the shelf. The jars are the ingredient page's shapes (`src/components/JarShelf/shapes.ts`), redrawn as plain SVG.
- **An entry's card**: the site name at 64 px, 48 px from the top with 90 px at each side; 12 px below it a "Compendium" eyebrow in Lexend Regular at 26 px, upper case, spaced 6 px, in `$sorrel-bright`. Centred in the space left, 20 px apart:
  - the entry's name at 112 px, or 84 px when it is over 20 characters, line height 1.05;
  - its formal name in Lexend Light at 44 px in `$chalk-muted`, left out when the entry has none or when it only repeats the name;
  - up to four of the entry's categories as chips, alphabetical, in Lexend Regular at 24 px, each outlined and lettered in its group's dark-theme colour (`colorDark`), with a `+N` chip in `$chalk-muted` counting the rest.
  - 40 px below that, a 4 px band along the foot of the card in equal segments, one per category group, in the order the groups first appear among the chips' categories. An entry with no categories keeps the band's 4 px, empty.
- **The ingredient's own categories, else its forms'** (M14.39). The chips and the band draw the ingredient's own categories. When it has none, they draw those of its live forms, each once and alphabetical, with nothing marking them apart: the result cards' outlined form chips are not drawn here. With neither there are no chips and an empty band (`claude-docs/design-decisions/m14.38-form-categories-in-search.md`, decision 4).

The alt text is the entry's name on an entry's card and the site name on the site card.

### Fonts

The renderer reads only TrueType, OpenType and WOFF, not WOFF2, so the site's web fonts cannot be reused. The three faces are committed as static TrueType in `src/lib/share-card/fonts/`, each typeface's SIL Open Font License text (with its copyright line) beside them, outside `public/` since they are never served:

| File                        | Face                   | Source                                                                                                              | Bytes   |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| `cormorant-unicase-700.ttf` | Cormorant Unicase Bold | `google/fonts`, `ofl/cormorantunicase/CormorantUnicase-Bold.ttf`, commit `6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec` | 763,380 |
| `lexend-300.ttf`            | Lexend Light           | `googlefonts/lexend`, `fonts/lexend/ttf/Lexend-Light.ttf`, commit `7894f02b2e7eabc48595f1d4eff3b17b48c6e651`        | 100,656 |
| `lexend-400.ttf`            | Lexend Regular         | `googlefonts/lexend`, `fonts/lexend/ttf/Lexend-Regular.ttf`, the same commit                                        | 100,264 |
| `OFL-cormorant-unicase.txt` | Cormorant's licence    | `google/fonts`, `ofl/cormorantunicase/OFL.txt`                                                                      |         |
| `OFL-lexend.txt`            | Lexend's licence       | `googlefonts/lexend`, `OFL.txt`                                                                                     |         |

Lexend comes from its upstream repository's static instances because `google/fonts` ships it only as a variable font, and the renderer, satori, throws reading a variable font's axes (`parseFvarAxis`). No font is fetched from Google or anywhere else when a card is drawn.

**The 500 KB limit.** `ImageResponse`'s doc gives a 500 KB maximum for the bundle, fonts included, and suggests fetching large assets at runtime. The three faces total 964,300 bytes, so they are not bundled: `fonts.ts` reads them from disk with `readFile` once, at module scope, as the doc's own font example does. The build's file tracing follows each literal path and copies the files beside every card route; `route.js.nft.json` for each of the three routes in a build lists all three faces. The routes run on the Node.js runtime, and the build gave no size warning.

### Where each card is named

Next's `opengraph-image.tsx` file convention (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`) names the card in a page's tags from the file beside it:

- `src/app/opengraph-image.tsx`: the site card for `/`, served at `/opengraph-image`. `src/proxy.ts` lists that path as public, as it lists the compendium's paths.
- `src/app/(public)/compendium/opengraph-image.tsx`: the site card again, for `/compendium`. The compendium page sets its own `openGraph` tags, and a page's own `openGraph` replaces its parent segment's, image included, so the root file's card does not reach it. Inside a route group, Next adds a hash to the route's folder name, so it is served at `/compendium/opengraph-image-<hash>`.
- `src/app/(public)/compendium/ingredients/[slug]/opengraph-image.tsx`: an entry's card, at `/compendium/ingredients/<slug>/opengraph-image-<hash>/card`. Its `generateImageMetadata` gives the card the id `card` and the entry's name as its alt text, so the path ends in that id.

`src/lib/page-metadata.ts` sets `twitter:card` to `summary_large_image` and leaves the images to these files; Twitter's tags take the Open Graph image. Next writes each address absolute against the layout's `metadataBase`, with the image's width, height, type and alt.

**Which addresses answer.** An entry's card is a 404 wherever the public entry read finds no entry: an unknown slug, a coven's own entry's slug, a hidden entry (the `shown` column), and an old address the page would redirect from. The read filters coven rows and hidden rows in SQL. At build time Next asks `generateImageMetadata` with no slug, and it answers with no cards, so no entry is drawn ahead of its first request.

### Caching

An entry's card is drawn on its first request and served from Next's cache after that, until an admin's write to the compendium expires the `compendium` tag and the next request draws it afresh. The two site cards read no data, so the build draws them once.

**What the docs say.** The `opengraph-image` page says a generated image is a special Route Handler, cached by default unless it uses a request-time API or uncached data. `how-revalidation-works.md` says `revalidateTag` invalidates every cache entry carrying the tag. No doc says that a route's cached response carries the tags of the `unstable_cache` reads made while drawing it, which is what lets an admin edit reach the card.

**What trying showed.** It does. The card reads `readCompendiumEntry`, which is cached under `compendium` ([`db/compendium-cache.md`](db/compendium-cache.md)), and the test "an entry's share card is drawn once, until an admin edit draws it again" in `tests/e2e/compendium-cache.spec.ts` shows it on the one e2e server whose cache holds:

1. It reads the card's address from the entry page's `og:image` and draws the card.
2. It renames the entry in Postgres directly, keeping its slug, and asks again: the bytes are the same, so the card was not drawn again.
3. It adds an entry as an admin, which expires the tag, and asks again: the bytes differ, the new name drawn.
4. It asks once more and gets the same bytes as step 3.

Step 2 fails if the route draws per request, and step 3 fails if the tag does not reach it. A scratch server over the same build answered the first request for a card `x-nextjs-cache: MISS` and the second `HIT`.

**The headers.** Every card answers `Cache-Control: public, max-age=0, must-revalidate`, the header Next gave these routes, and no `ETag`. A browser may store the card but asks again before each use, and gets the whole PNG back. Whether Vercel's CDN keeps the card between requests was not tested: no test here runs on Vercel.

### In tests

- `tests/modules/ingredients/services/share-card.test.ts`: what the card draws (name, formal name, own categories and their colours, the band's groups, the fallback to the live forms' categories when the entry has none) and the 404s, each with the precondition that the entry is there to be found.
- `tests/e2e/share-card.spec.ts`: a shown entry's card is a PNG; a hidden entry's, a coven entry's and an unknown slug's are 404 at the same route that draws a shown entry.
- `tests/e2e/seo.spec.ts`: `/`, `/compendium` and an entry name their card at an absolute address with width, height and alt, and the card answers.
- `tests/e2e/compendium-cache.spec.ts`: the caching above.
