// These mirror the Sass tokens `$loading-delay` and `$arrive-duration`
// (the page bar's stylesheet): the bar's delay and fade are timed here in
// JavaScript, since a CSS `animation-delay` cannot be cancelled by a
// navigation that settles first. Change a value here, change its token.

/** How long a navigation lasts before the page bar shows, so a quick one never flashes it. */
export const LOADING_DELAY_MS = 100;

/** How long the bar fades out after the navigation settles. */
export const BAR_FADE_MS = 150;
