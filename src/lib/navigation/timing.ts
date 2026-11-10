// These mirror the Sass tokens `$loading-delay` and `$arrive-duration`: change a value here, change its
// token. Timed in JavaScript because a CSS delay cannot be cancelled by a navigation that settles first.

export const LOADING_DELAY_MS = 100;

export const BAR_FADE_MS = 150;

/** How long a skeleton stays and fades out over the page that arrives (`$arrive-duration`, the same 200ms `arrived` fades content in). */
export const ARRIVE_MS = 200;
