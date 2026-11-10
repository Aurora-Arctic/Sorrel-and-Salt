/** The one reduced-motion query; the stylesheets zero their transitions under the same one. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * How long a fade out may take before its owner closes anyway, for a browser that never reports the
 * end. It must stay past the longest fade in the stylesheets (`$motion-short`, `$modal-fade`).
 */
export const FADE_LIMIT_MS = 400;

/**
 * Motion turned down, or no way to ask, so nothing waits for a fade or slide that is not drawn.
 * Read at the time of use, so an OS change mid-session takes effect.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia !== 'function' || window.matchMedia(REDUCED_MOTION_QUERY).matches;
