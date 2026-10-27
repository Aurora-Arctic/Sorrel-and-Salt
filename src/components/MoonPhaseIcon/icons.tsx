import type { ReactElement } from 'react';
import type { HalfMoonPhase, MoonLayer, SingleMoonPhase } from './types';

// The lit part of the moon in each phase, on a disc of radius 8 centred on
// (12, 12). Drawn for the northern hemisphere, where a waxing moon is lit on
// its right and a waning one on its left; in the southern hemisphere the
// sides swap. Each crescent and gibbous edge is the half-ellipse from the top
// of the disc (12, 4) to its foot (12, 20), 4.5 wide. New Moon and Dark
// Moon have no lit part: New Moon is the shadowed disc, and Dark Moon the
// outline alone with no shadow inside (index.tsx; the owner, 2026-10-27).
export const LIT_PARTS: Record<SingleMoonPhase, ReactElement | null> = {
  'New Moon': null,
  'Dark Moon': null,
  'Waxing Crescent': <path d="M12 4A8 8 0 0 1 12 20A4.5 8 0 0 0 12 4Z" />,
  'First Quarter': <path d="M12 4A8 8 0 0 1 12 20Z" />,
  'Waxing Gibbous': <path d="M12 4A8 8 0 0 1 12 20A4.5 8 0 0 1 12 4Z" />,
  'Full Moon': <circle cx="12" cy="12" r="8" />,
  'Waning Gibbous': <path d="M12 4A8 8 0 0 0 12 20A4.5 8 0 0 0 12 4Z" />,
  'Last Quarter': <path d="M12 4A8 8 0 0 0 12 20Z" />,
  'Waning Crescent': <path d="M12 4A8 8 0 0 0 12 20A4.5 8 0 0 1 12 4Z" />,
};

// The cycle's two halves, each its three lit phases laid over one another,
// bottom to top: the gibbous faintest and the crescent at full strength, so the light
// reads as spreading from the side it grows from. The crescent is the lit part, drawn as
// a single phase draws it, so it is the same colour as Full Moon's; only the bands beyond
// it, the shadow, step darker (the owner, 2026-10-27). The two bands' opacities are the
// owner's (2026-10-27): the gibbous 0.25 under the quarter 0.4, so the quarter band shows
// about 55% lit and the gibbous band 25%. Each layer's maria take its opacity too.
export const HALVES: Record<HalfMoonPhase, readonly MoonLayer[]> = {
  'Waxing Moon': [
    ['Waxing Gibbous', 0.25],
    ['First Quarter', 0.4],
    ['Waxing Crescent', 1],
  ],
  'Waning Moon': [
    ['Waning Gibbous', 0.25],
    ['Last Quarter', 0.4],
    ['Waning Crescent', 1],
  ],
};

/*
 * The near side's seven largest maria (dark lava plains, not craters), each
 * an ellipse placed from its published centre and diameter, not by eye.
 * Source: Wikipedia, "List of maria on the Moon" (accessed 2026-10-27), whose
 * diameters are the USGS/IAU Gazetteer of Planetary Nomenclature's; its
 * Oceanus Procellarum row was checked against the Gazetteer (feature 4395).
 * Latitude north positive, longitude east positive.
 *
 *   Mare                  Lat      Lon      Diameter
 *   Oceanus Procellarum   20.67   -56.68   2592.24 km
 *   Mare Imbrium          34.72   -14.91   1145.53 km
 *   Mare Serenitatis      27.29    18.36    674.28 km
 *   Mare Tranquillitatis   8.35    30.83    875.75 km
 *   Mare Crisium          16.18    59.10    555.92 km
 *   Mare Fecunditatis     -7.83    53.67    840.35 km
 *   Mare Nubium          -20.59   -17.29    714.50 km
 *
 * Projected orthographically, north up and east (Mare Crisium) on the right,
 * the view from the northern hemisphere, with the Moon's radius 1737.4 km
 * and the disc's 8:
 *   x = cos(lat)·sin(lon), y = sin(lat), cosC = cos(lat)·cos(lon)
 *   cx = 12 + 8x, cy = 12 − 8y, r = 8·(diameter / 2) / 1737.4
 *   ry = r, rx = r·cosC (foreshortened toward the limb),
 *   rotated by atan2(−y, x) in degrees, so rx lies along the radius.
 * A Gazetteer diameter is a feature's greatest extent, so the ellipse is
 * generous for an irregular mare, Oceanus Procellarum most of all; the disc's
 * edge and the lit part clip it. Left out because each is under 1.5px across
 * at a 20px icon: Mare Nectaris (339.39 km), and the craters Tycho (85 km,
 * Wikipedia, "Tycho (lunar crater)") and Copernicus (93 km, Wikipedia,
 * "Copernicus (lunar crater)").
 */
export const MARIA: ReactElement = (
  <>
    <ellipse cx="5.75" cy="9.18" rx="3.07" ry="5.97" transform="rotate(-155.7 5.75 9.18)" />
    <ellipse cx="10.31" cy="7.44" rx="2.09" ry="2.64" transform="rotate(-110.37 10.31 7.44)" />
    <ellipse cx="14.24" cy="8.33" rx="1.31" ry="1.55" transform="rotate(-58.59 14.24 8.33)" />
    <ellipse cx="16.06" cy="10.84" rx="1.71" ry="2.02" transform="rotate(-15.98 16.06 10.84)" />
    <ellipse cx="18.59" cy="9.77" rx="0.63" ry="1.28" transform="rotate(-18.68 18.59 9.77)" />
    <ellipse cx="18.38" cy="13.09" rx="1.14" ry="1.93" transform="rotate(9.69 18.38 13.09)" />
    <ellipse cx="9.77" cy="14.81" rx="1.47" ry="1.64" transform="rotate(128.35 9.77 14.81)" />
  </>
);
