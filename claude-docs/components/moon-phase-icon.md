# MoonPhaseIcon

The small moon drawn beside a moon phase's name in the spell builder (`src/components/MoonPhaseIcon/`).

`moonPhaseIcon(phase)` (`for-phase.tsx`) returns the drawing for a phase typed as free text, matched to the builder's list ignoring case and surrounding spaces, and `null` for a phase not on it. The builder's Moon Phase field and the grimoire filter's Moon Phase facet both call it, so the list does not import from the builder.

## Lit parts

Each phase's lit part sits on a disc of radius 8 centred on (12, 12), drawn for the northern hemisphere: a waxing moon is lit on its right and a waning one on its left, and the sides swap in the southern hemisphere. Each crescent and gibbous edge is the half-ellipse from the top of the disc (12, 4) to its foot (12, 20), 4.5 wide. New Moon is the shadowed disc. Dark Moon is the outline alone, with no shadow inside, so it reads apart from New Moon.

The lit part is the paler of the two in either theme. Waxing Moon and Waning Moon stack their half's three lit phases: the gibbous at opacity 0.25 under the quarter at 0.4 under the crescent at full strength. The quarter band then shows about 55% lit and the gibbous band 25%. The crescent is drawn as a single phase draws it, so it is the colour of Full Moon's lit part; only the bands beyond it step darker. Each layer's maria take its opacity too.

## Maria

The near side's seven largest maria (dark lava plains, not craters), each an ellipse placed from its published centre and diameter. Source: Wikipedia, "List of maria on the Moon" (accessed 2026-10-27), whose diameters are the USGS/IAU Gazetteer of Planetary Nomenclature's; its Oceanus Procellarum row was checked against the Gazetteer (feature 4395). Latitude is north positive, longitude east positive.

| Mare                 | Lat    | Lon    | Diameter   |
| -------------------- | ------ | ------ | ---------- |
| Oceanus Procellarum  | 20.67  | -56.68 | 2592.24 km |
| Mare Imbrium         | 34.72  | -14.91 | 1145.53 km |
| Mare Serenitatis     | 27.29  | 18.36  | 674.28 km  |
| Mare Tranquillitatis | 8.35   | 30.83  | 875.75 km  |
| Mare Crisium         | 16.18  | 59.10  | 555.92 km  |
| Mare Fecunditatis    | -7.83  | 53.67  | 840.35 km  |
| Mare Nubium          | -20.59 | -17.29 | 714.50 km  |

Projected orthographically, north up and east (Mare Crisium) on the right, the view from the northern hemisphere, with the Moon's radius 1737.4 km and the disc's 8:

- x = cos(lat)·sin(lon), y = sin(lat), cosC = cos(lat)·cos(lon)
- cx = 12 + 8x, cy = 12 − 8y, r = 8·(diameter / 2) / 1737.4
- ry = r, rx = r·cosC (foreshortened toward the limb), rotated by atan2(−y, x) in degrees, so rx lies along the radius.

A Gazetteer diameter is a feature's greatest extent, so the ellipse is generous for an irregular mare, Oceanus Procellarum most of all; the disc's edge and the lit part clip it. Left out because each is under 1.5px across at a 20px icon: Mare Nectaris (339.39 km), and the craters Tycho (85 km, Wikipedia, "Tycho (lunar crater)") and Copernicus (93 km, Wikipedia, "Copernicus (lunar crater)").

## Styling

`index.scss`: the icon is 1.25em square and sunk 0.25em, as `FormIcon` is, so it takes the size of the line it sits in, and `flex: none` keeps a flex row from squeezing it. Its three fills are the theme's `--moon-shadow`, `--moon-lit` and `--moon-mare` (`src/scss/_mixins.scss`).

## Stories

Surfaces / Moon Phase Icon: All Phases, every phase in a row.
